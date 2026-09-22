import { NextResponse, type NextRequest } from "next/server";

/**
 * 요청 속도 제한 (IP 당 분당 120회, 페이지·API 공통).
 * 스크립트로 UID 를 대량 조회해 외부 API(Mihomo) 한도와 서버 비용을 태우는 것을 막는다.
 * Redis 가 있으면 인스턴스가 여러 개여도 같이 세고, 없으면 프로세스 메모리로 대충 센다.
 */

const LIMIT = 120;
const WINDOW_SECONDS = 60;

const mem = new Map<string, { n: number; exp: number }>();

async function count(key: string): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) {
    try {
      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, WINDOW_SECONDS * 2],
        ]),
        cache: "no-store",
      });
      const body = (await res.json()) as { result?: number }[];
      const n = body?.[0]?.result;
      if (typeof n === "number") return n;
    } catch {
      // Redis 장애 때는 막지 않는다
      return 0;
    }
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

export async function proxy(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const minute = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  const n = await count(`rl:${ip}:${minute}`);
  if (n > LIMIT) {
    return new NextResponse("Too many requests. Please slow down.", {
      status: 429,
      headers: { "Retry-After": String(WINDOW_SECONDS), "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/u/:path*", "/api/:path*"],
};
