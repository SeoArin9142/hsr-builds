/**
 * Upstash Redis REST 클라이언트 (SDK 없이 fetch 만).
 * 환경변수: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 *          또는 Vercel Upstash 연동이 넣는 KV_REST_API_URL / KV_REST_API_TOKEN
 * 없으면 redisConfigured() 가 false 이고, 호출하는 쪽이 메모리/파일로 대신한다.
 */

function config(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export function redisConfigured(): boolean {
  return config() !== null;
}

export async function redisCmd<T = unknown>(cmd: (string | number)[]): Promise<T> {
  const c = config();
  if (!c) throw new Error("redis not configured");
  const res = await fetch(c.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis http ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: string };
  if (body.error) throw new Error(body.error);
  return body.result as T;
}

export async function redisGet(key: string): Promise<string | null> {
  return redisCmd<string | null>(["GET", key]);
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (ttlSeconds) await redisCmd(["SET", key, value, "EX", ttlSeconds]);
  else await redisCmd(["SET", key, value]);
}

export async function redisDel(key: string): Promise<void> {
  await redisCmd(["DEL", key]);
}

/** 집합에 넣고 TTL 을 갱신한다 (하루치 사용량 기록용) */
export async function redisSAdd(key: string, member: string, ttlSeconds: number): Promise<void> {
  await redisCmd(["SADD", key, member]);
  await redisCmd(["EXPIRE", key, ttlSeconds]);
}

export async function redisSCard(key: string): Promise<number> {
  return (await redisCmd<number>(["SCARD", key])) ?? 0;
}

export async function redisSMembers(key: string): Promise<string[]> {
  return (await redisCmd<string[]>(["SMEMBERS", key])) ?? [];
}

/**
 * HyperLogLog — "서로 다른 것이 몇 개인지"만 센다. 넣은 값 자체는 보관되지 않아 나중에 꺼낼 수 없다.
 * 사용자 수처럼 숫자만 필요하고 목록은 갖고 싶지 않을 때 쓴다.
 */
export async function redisPFAdd(key: string, member: string): Promise<void> {
  await redisCmd(["PFADD", key, member]);
}

export async function redisPFCount(key: string): Promise<number> {
  return (await redisCmd<number>(["PFCOUNT", key])) ?? 0;
}
