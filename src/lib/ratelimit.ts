import { getKV } from "./kvstore";

/** 같은 키(보통 IP)로 windowSeconds 안에 max 번까지. 넘으면 false. */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const kv = getKV();
  const k = `rate:${key}`;
  const n = Number((await kv.get(k).catch(() => null)) ?? "0");
  if (n >= max) return false;
  await kv.set(k, String(n + 1), windowSeconds).catch(() => {});
  return true;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
