import { promises as fs } from "node:fs";
import path from "node:path";
import type { Party, PartyFile } from "./parties";
import { tr, type Lang } from "./i18n";
import { redisConfigured, redisGet, redisSet } from "./redis";

/**
 * 파티 편성 저장소.
 *  - Redis 가 설정돼 있으면 Upstash Redis (Vercel 등 파일을 못 쓰는 곳) — redis.ts 참고
 *  - 없으면 data/parties/<uid>.json (로컬·VPS)
 */

export const MAX_PARTIES = 12;
export const MAX_MEMBERS = 4;
const MAX_NAME = 20;
const MAX_NOTE = 60;

function fileOf(uid: string): string {
  return path.join(process.cwd(), "data", "parties", `${uid}.json`);
}

export async function readParties(uid: string): Promise<PartyFile | null> {
  if (!/^\d{9,10}$/.test(uid)) return null;
  try {
    const raw = redisConfigured()
      ? await redisGet(`parties:${uid}`)
      : await fs.readFile(fileOf(uid), "utf8");
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
  if (redisConfigured()) {
    await redisSet(`parties:${uid}`, raw);
    return;
  }
  await fs.mkdir(path.dirname(fileOf(uid)), { recursive: true });
  await fs.writeFile(fileOf(uid), raw, "utf8");
}

/** 클라이언트가 보낸 파티 목록을 검사해 저장 가능한 형태로 만든다. 문제가 있으면 문자열(이유)을 돌려준다. */
export function sanitizeParties(input: unknown, lang: Lang = "ko"): Party[] | string {
  if (!Array.isArray(input)) return tr(lang, "parties_bad_list");
  if (input.length > MAX_PARTIES) return tr(lang, "parties_too_many", { max: MAX_PARTIES });
  const out: Party[] = [];
  input.forEach((p, i) => {
    const o = (p ?? {}) as Record<string, unknown>;
    const name =
      String(o.name ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME) ||
      tr(lang, "editor_default_name", { n: i + 1 });
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
