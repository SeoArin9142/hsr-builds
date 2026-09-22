import { getKV } from "./kvstore";

/**
 * 문의·제보. KV 에 90일 보관. 키: feedback:<시각>:<난수>, 목록은 feedback:index 집합.
 * 관리자 화면(/admin)에서 최근 것부터 본다.
 */

export interface Feedback {
  id: string;
  at: number;
  message: string;
  contact?: string;
  page?: string;
}

const KEEP_SECONDS = 90 * 86400;
export const MAX_MESSAGE = 2000;
export const MAX_CONTACT = 120;

export async function addFeedback(input: {
  message: string;
  contact?: string;
  page?: string;
}): Promise<Feedback> {
  const kv = getKV();
  const at = Date.now();
  const id = `${at}:${Math.random().toString(36).slice(2, 8)}`;
  const fb: Feedback = {
    id,
    at,
    message: input.message.trim().slice(0, MAX_MESSAGE),
    ...(input.contact?.trim() ? { contact: input.contact.trim().slice(0, MAX_CONTACT) } : {}),
    ...(input.page?.trim() ? { page: input.page.trim().slice(0, 200) } : {}),
  };
  await kv.set(`feedback:${id}`, JSON.stringify(fb), KEEP_SECONDS);
  await kv.sadd("feedback:index", id, KEEP_SECONDS);
  return fb;
}

/** 최근 순으로 최대 limit 개 */
export async function listFeedback(limit = 50): Promise<Feedback[]> {
  const kv = getKV();
  const ids = (await kv.smembers("feedback:index")).sort().reverse().slice(0, limit);
  const out: Feedback[] = [];
  for (const id of ids) {
    const raw = await kv.get(`feedback:${id}`);
    if (raw) out.push(JSON.parse(raw) as Feedback);
  }
  return out;
}

/** 같은 IP 는 10분에 5건까지 */
export async function allowFeedback(ip: string): Promise<boolean> {
  const kv = getKV();
  const key = `feedback:rate:${ip}`;
  const n = Number((await kv.get(key)) ?? "0");
  if (n >= 5) return false;
  await kv.set(key, String(n + 1), 600);
  return true;
}
