import { promises as fs } from "node:fs";
import path from "node:path";
import type { Party, PartyFile } from "./parties";

/**
 * 파티 편성 저장소.
 *  - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 이 있으면 Upstash Redis (Vercel 등 파일을 못 쓰는 곳)
 *  - 없으면 data/parties/<uid>.json (로컬·VPS)
 */

export const MAX_PARTIES = 12;
export const MAX_MEMBERS = 4;
const MAX_NAME = 20;
const MAX_NOTE = 60;

function fileOf(uid: string): string {
  return path.join(process.cwd(), "data", "parties", `${uid}.json`);
}

function redis(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redisCmd(cmd: unknown[]): Promise<unknown> {
  const r = redis();
  if (!r) throw new Error("redis not configured");
  const res = await fetch(r.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${r.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis http ${res.status}`);
  const body = (await res.json()) as { result?: unknown; error?: string };
  if (body.error) throw new Error(body.error);
  return body.result;
}

export async function readParties(uid: string): Promise<PartyFile | null> {
  if (!/^\d{9,10}$/.test(uid)) return null;
  try {
    let raw: string | null;
    if (redis()) {
      raw = (await redisCmd(["GET", `parties:${uid}`])) as string | null;
    } else {
      raw = await fs.readFile(fileOf(uid), "utf8");
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PartyFile;
    parsed.parties.sort((a, b) => a.no - b.no);
    return parsed;
  } catch {
    return null;
  }
}

export async function writeParties(uid: string, file: PartyFile): Promise<void> {
  const raw = JSON.stringify(file, null, 2);
  if (redis()) {
    await redisCmd(["SET", `parties:${uid}`, raw]);
    return;
  }
  await fs.mkdir(path.dirname(fileOf(uid)), { recursive: true });
  await fs.writeFile(fileOf(uid), raw, "utf8");
}

/** 클라이언트가 보낸 파티 목록을 검사해 저장 가능한 형태로 만든다. 문제가 있으면 문자열(이유)을 돌려준다. */
export function sanitizeParties(input: unknown): Party[] | string {
  if (!Array.isArray(input)) return "파티 목록 형식이 잘못되었습니다.";
  if (input.length > MAX_PARTIES) return `파티는 최대 ${MAX_PARTIES}개까지입니다.`;
  const out: Party[] = [];
  input.forEach((p, i) => {
    const o = (p ?? {}) as Record<string, unknown>;
    const name = String(o.name ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME) || `파티${i + 1}`;
    const note = String(o.note ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NOTE);
    const rawMembers = Array.isArray(o.members) ? o.members : [];
    const members: string[] = [];
    for (const m of rawMembers) {
      const id = String(m ?? "").trim();
      if (!/^\d{4}$/.test(id) || members.includes(id)) continue;
      members.push(id);
      if (members.length >= MAX_MEMBERS) break;
    }
    out.push({ no: i + 1, name, ...(note ? { note } : {}), members });
  });
  return out;
}
