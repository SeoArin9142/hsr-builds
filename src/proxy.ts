import { NextResponse, type NextRequest } from "next/server";

/**
 * 모든 페이지·API 요청이 지나가는 곳. 두 가지를 한다.
 *  1) 속도 제한 — IP 당 분당 120회. 스크립트로 UID 를 대량 조회해 외부 API 한도와 서버 비용을 태우는 것을 막는다.
 *  2) 방문 집계 — 페이지 요청만(API·미리보기 이미지·봇·프리페치 제외) 페이지뷰와 고유 방문자(HyperLogLog)를 센다.
 *     방문자 구분용으로 무작위 ID 쿠키(hsrb_vid)를 둔다. 개인정보는 없다.
 * Redis 가 있으면 인스턴스가 여러 개여도 같이 세고, 없으면(로컬) 속도 제한만 메모리로 한다.
 */

const LIMIT = 120;
const WINDOW_SECONDS = 60;
const VID_COOKIE = "hsrb_vid";
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|preview|fetch|curl|wget|python|node|java|go-http|headless/i;

const mem = new Map<string, { n: number; exp: number }>();

function redis(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function pipeline(cmds: (string | number)[][]): Promise<{ result?: unknown }[] | null> {
  const r = redis();
  if (!r) return null;
  try {
    const res = await fetch(`${r.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${r.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds),
      cache: "no-store",
    });
    return (await res.json()) as { result?: unknown }[];
  } catch {
    return null; // Redis 장애 때는 막지도, 세지도 않는다
  }
}

/** 한국 시간 기준 날짜 (YYYYMMDD) */
function kstDay(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}

async function rateCount(key: string): Promise<number> {
  const out = await pipeline([
    ["INCR", key],
    ["EXPIRE", key, WINDOW_SECONDS * 2],
  ]);
  if (out) {
    const n = out[0]?.result;
    return typeof n === "number" ? n : 0;
  }
  const now = Date.now();
  const e = mem.get(key);
  if (!e || e.exp < now) {
    mem.set(key, { n: 1, exp: now + WINDOW_SECONDS * 1000 });
    if (mem.size > 10000) mem.clear();
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

export async function proxy(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const minute = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  const n = await rateCount(`rl:${ip}:${minute}`);
  if (n > LIMIT) {
    return new NextResponse("Too many requests. Please slow down.", {
      status: 429,
      headers: { "Retry-After": String(WINDOW_SECONDS), "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const res = NextResponse.next();

  if (isPageView(req) && redis()) {
    let vid = req.cookies.get(VID_COOKIE)?.value;
    if (!vid || !/^[0-9a-f]{16,32}$/.test(vid)) {
      vid = crypto.randomUUID().replace(/-/g, "");
      res.cookies.set(VID_COOKIE, vid, { path: "/", maxAge: 365 * 86400, sameSite: "lax", httpOnly: true });
    }
    const day = kstDay();
    // 응답을 기다리게 하지 않는다 (실패해도 무시)
    void pipeline([
      ["INCR", "stats:pv:total"],
      ["INCR", `stats:pv:${day}`],
      ["EXPIRE", `stats:pv:${day}`, 400 * 86400],
      ["PFADD", "stats:uv:total", vid],
      ["PFADD", `stats:uv:${day}`, vid],
      ["EXPIRE", `stats:uv:${day}`, 400 * 86400],
    ]);
  }
  return res;
}

export const config = {
  matcher: ["/", "/start", "/link", "/feedback", "/privacy", "/admin", "/u/:path*", "/api/:path*"],
};
