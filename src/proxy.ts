import { NextResponse, type NextRequest } from "next/server";
import { quotaPage } from "@/lib/quotaPage";

/**
 * 모든 페이지·API 요청이 지나가는 곳. 세 가지를 한다.
 *  1) 속도 제한 — IP 당 분당 120회(봇·스크립트 UA 는 20회)는 메모리로, IP 당 10분에 서로 다른 UID 30개는 Redis 로.
 *     같은 UID 반복은 캐시라 싸지만 새 UID 마다 외부 API(Mihomo)를 부르므로, 한 사람이 엉터리 UID 를
 *     쏟아부어 외부 API 가 우리를 차단하게 만드는 것을 막는다.
 *  2) 방문 집계 — 페이지 요청만(API·미리보기 이미지·봇·프리페치 제외) 페이지뷰와 고유 방문자(HyperLogLog)를 센다.
 *     방문자 구분용으로 무작위 ID 쿠키(hsrb_vid)를 둔다. 개인정보는 없다.
 *  3) 월 한도 — 무료 호스팅(Vercel·Upstash)의 한도에 닿기 전에 우리가 먼저 멈춘다. 이번 달 요청 수가
 *     MONTHLY_BUDGET(기본 50,000)을 넘거나 Redis 가 "월 한도 초과" 를 돌려주면, 다음 달 1일 00시(KST)까지
 *     안내 화면(503)을 보여 준다. /admin 과 /api/cron 은 예외.
 * Redis 가 없으면(로컬) 메모리로만 동작한다.
 */

const LIMIT = 120;
const BOT_LIMIT = 20;
const WINDOW_SECONDS = 60;
const UID_LIMIT = 30; // 10분당 서로 다른 UID
const UID_WINDOW_SECONDS = 600;
const VID_COOKIE = "hsrb_vid";
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|preview|fetch|curl|wget|python|node|java|go-http|headless/i;
const MONTHLY_BUDGET = Number(process.env.MONTHLY_BUDGET ?? "50000");

const mem = new Map<string, { n: number; exp: number }>();
const expireSetFor = new Set<string>(); // 이 인스턴스가 이미 EXPIRE 를 걸어 둔 날/월 키

function redis(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

type Pipe = { results: { result?: unknown; error?: string }[] | null; quotaExceeded: boolean };

async function pipeline(cmds: (string | number)[][]): Promise<Pipe> {
  const r = redis();
  if (!r) return { results: null, quotaExceeded: false };
  try {
    const res = await fetch(`${r.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${r.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds),
      cache: "no-store",
    });
    const body = (await res.json()) as { error?: string } | { result?: unknown; error?: string }[];
    const text = JSON.stringify(body);
    // Upstash 무료 한도(월 명령 수)를 넘으면 이런 오류가 온다
    if (res.status === 429 || /max (daily )?requests? limit exceeded/i.test(text)) {
      return { results: null, quotaExceeded: true };
    }
    if (!Array.isArray(body)) return { results: null, quotaExceeded: false };
    return { results: body, quotaExceeded: false };
  } catch {
    return { results: null, quotaExceeded: false }; // Redis 장애 때는 막지도, 세지도 않는다
  }
}

/** 한국 시간 기준 날짜 (YYYYMMDD) / 월 (YYYYMM) */
function kst(): Date {
  return new Date(Date.now() + 9 * 3600 * 1000);
}
function kstDay(): string {
  return kst().toISOString().slice(0, 10).replace(/-/g, "");
}
function kstMonth(): string {
  return kst().toISOString().slice(0, 7).replace("-", "");
}
function memCount(key: string, windowSeconds: number): number {
  const now = Date.now();
  const e = mem.get(key);
  if (!e || e.exp < now) {
    mem.set(key, { n: 1, exp: now + windowSeconds * 1000 });
    if (mem.size > 20000) mem.clear();
    return 1;
  }
  e.n += 1;
  return e.n;
}

function isPageView(req: NextRequest): boolean {
  const p = req.nextUrl.pathname;
  if (req.method !== "GET") return false;
  if (p.startsWith("/api/") || p.includes("opengraph-image") || p.startsWith("/admin")) return false;
  if (req.headers.get("next-router-prefetch") || req.headers.get("purpose") === "prefetch") return false;
  if (req.headers.get("rsc")) return false; // 클라이언트 내비게이션의 데이터 요청은 화면 이동이 아니면 중복이라 뺀다
  if (BOT_UA.test(req.headers.get("user-agent") ?? "")) return false;
  return true;
}

function tooMany(retryAfter: number): NextResponse {
  return new NextResponse("Too many requests. Please slow down.", {
    status: 429,
    headers: { "Retry-After": String(retryAfter), "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  const isBot = BOT_UA.test(ua) || !ua;
  // 관리 화면과 하루 한 번 도는 점검은 월 한도 안내 화면을 건너뛴다 (막혔을 때야말로 봐야 하므로)
  const isAdmin =
    path.startsWith("/admin") || path.startsWith("/api/admin") || path.startsWith("/api/cron");

  // 1) 분당 요청 수 (메모리 — Redis 명령을 아낀다)
  const minute = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  if (memCount(`rl:${ip}:${minute}`, WINDOW_SECONDS) > (isBot ? BOT_LIMIT : LIMIT)) return tooMany(WINDOW_SECONDS);

  const month = kstMonth();
  const day = kstDay();
  const cmds: (string | number)[][] = [];

  // 2) 새 UID 조회 수 (Redis) — /u/{uid}, /api/u/{uid}...
  const m = path.match(/^\/(?:api\/)?u\/(\d{9,10})(?:\/|$)/);
  const uidCheck = m && !path.includes("opengraph-image");
  if (uidCheck) {
    const win = Math.floor(Date.now() / 1000 / UID_WINDOW_SECONDS);
    const key = `rlu:${ip}:${win}`;
    cmds.push(["SADD", key, m[1]], ["SCARD", key], ["EXPIRE", key, UID_WINDOW_SECONDS * 2]);
  }
  const scardIndex = uidCheck ? 1 : -1;

  // 3) 월 사용량 (모든 요청) + 페이지뷰·고유 방문자 (페이지만)
  const monthIndex = cmds.length;
  cmds.push(["INCR", `stats:req:${month}`]);
  if (!expireSetFor.has(`m:${month}`)) {
    cmds.push(["EXPIRE", `stats:req:${month}`, 45 * 86400]);
    expireSetFor.add(`m:${month}`);
  }
  const res = NextResponse.next();
  const pageView = isPageView(req) && redis() !== null;
  if (pageView) {
    let vid = req.cookies.get(VID_COOKIE)?.value;
    if (!vid || !/^[0-9a-f]{16,32}$/.test(vid)) {
      vid = crypto.randomUUID().replace(/-/g, "");
      res.cookies.set(VID_COOKIE, vid, { path: "/", maxAge: 365 * 86400, sameSite: "lax", httpOnly: true });
    }
    cmds.push(["INCR", "stats:pv:total"], ["INCR", `stats:pv:${day}`], ["PFADD", "stats:uv:total", vid], ["PFADD", `stats:uv:${day}`, vid]);
    if (!expireSetFor.has(`d:${day}`)) {
      cmds.push(["EXPIRE", `stats:pv:${day}`, 400 * 86400], ["EXPIRE", `stats:uv:${day}`, 400 * 86400]);
      expireSetFor.add(`d:${day}`);
    }
  }

  const out = await pipeline(cmds);
  if (out.quotaExceeded && !isAdmin) return quotaPage(req);
  if (out.results) {
    if (scardIndex >= 0) {
      const distinct = out.results[scardIndex]?.result;
      if (typeof distinct === "number" && distinct > UID_LIMIT) return tooMany(UID_WINDOW_SECONDS);
    }
    const used = out.results[monthIndex]?.result;
    if (typeof used === "number" && used > MONTHLY_BUDGET && !isAdmin) return quotaPage(req);
  } else if (uidCheck) {
    // Redis 없이도 새 UID 난사는 메모리로 막는다
    const win = Math.floor(Date.now() / 1000 / UID_WINDOW_SECONDS);
    const first = memCount(`rlu:${ip}:${win}:${m[1]}`, UID_WINDOW_SECONDS) === 1;
    if (first && memCount(`rlu:${ip}:${win}`, UID_WINDOW_SECONDS) > UID_LIMIT) return tooMany(UID_WINDOW_SECONDS);
  }
  return res;
}

export const config = {
  matcher: ["/", "/start", "/link", "/feedback", "/privacy", "/admin", "/u/:path*", "/api/:path*"],
};
