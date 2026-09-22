import { firstOwnerCookie, headersFor, serverOf, type HoyoCookie } from "./hoyolab";
import type { Lang } from "./i18n";
import { getKV } from "./kvstore";
import { charName, type GameIndex } from "./starrailres";

/**
 * 엔드 콘텐츠 기록 — 혼돈의 기억(MoC) · 허구 서사(PF) · 종말의 그림자(AS).
 * HoYoLAB 은 이것도 "자기 계정" 에만 주므로, 캐릭터 목록과 같은 규칙으로 UID 주인 쿠키가 있을 때만 부른다.
 * 결과는 7일 캐시(언어별) + 주인 쿠키가 있고 1시간 지나면 새로 받는다.
 * 실제로 클리어한 팀·사이클·점수가 그대로 들어 있어, 스펙(스탯·유물)과 나란히 놓고 평가하기 좋다.
 */

const API = "https://bbs-api-os.hoyolab.com/game_record/hkrpg/api";
const TTL = 7 * 86400;
const STALE_MS = 60 * 60 * 1000;

export type EndgameMode = "moc" | "pf" | "as";

export interface EndgameAvatar {
  id: string;
  name: string;
  icon: string; // StarRailRes 경로 (없으면 HoYoLAB 절대 URL)
  rarity: number;
  eidolon: number;
  level: number;
  element: { name: string; color: string; icon: string };
}

export interface EndgameNode {
  avatars: EndgameAvatar[];
  score?: string; // PF·AS 점수
  bossDefeated?: boolean; // AS
  buff?: { name: string; desc: string };
}

export interface EndgameFloor {
  name: string;
  stars: number;
  cycles?: number; // MoC·PF 의 round_num (MoC 는 남은 사이클, 0 이면 0사이클)
  isFast: boolean;
  nodes: EndgameNode[];
  time?: string; // 클리어 시각 (ISO)
}

export interface EndgameRecord {
  mode: EndgameMode;
  season: string; // 기 이름 (예: 폭풍 소탕)
  begin?: string;
  end?: string;
  stars: number;
  maxFloor: string;
  battles: number;
  floors: EndgameFloor[];
}

export interface EndgameResult {
  records: EndgameRecord[];
  fetchedAt?: number;
  cached?: boolean;
}

/* ---------- HoYoLAB 응답 (쓰는 부분만) ---------- */

interface HoyoTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}
interface HoyoNodeAvatar {
  id: number;
  level: number;
  icon: string;
  rarity: number;
  element: string;
  rank: number;
}
interface HoyoNode {
  challenge_time?: HoyoTime | null;
  avatars?: (HoyoNodeAvatar | null)[] | null;
  score?: string;
  boss_defeated?: boolean;
  buff?: { name_mi18n?: string; desc_mi18n?: string } | null;
}
interface HoyoFloor {
  name: string;
  star_num: number | string;
  round_num?: number;
  is_fast?: boolean;
  node_1?: HoyoNode | null;
  node_2?: HoyoNode | null;
  node_3?: HoyoNode | null;
}
interface HoyoGroup {
  schedule_id: number;
  status?: string;
  name_mi18n?: string;
  begin_time?: HoyoTime;
  end_time?: HoyoTime;
}
interface HoyoChallenge {
  retcode: number;
  message: string;
  data?: {
    groups?: HoyoGroup[];
    star_num?: number;
    max_floor?: string;
    battle_num?: number;
    has_data?: boolean;
    all_floor_detail?: HoyoFloor[] | null;
  };
}

const PATHS: Record<EndgameMode, string> = {
  moc: "challenge",
  pf: "challenge_story",
  as: "challenge_boss",
};

const ELEMENT_ID: Record<string, string> = {
  physical: "Physical",
  fire: "Fire",
  ice: "Ice",
  lightning: "Thunder",
  thunder: "Thunder",
  wind: "Wind",
  quantum: "Quantum",
  imaginary: "Imaginary",
};

function iso(t?: HoyoTime | null): string | undefined {
  if (!t) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.year}-${p(t.month)}-${p(t.day)}T${p(t.hour)}:${p(t.minute)}:00`;
}

function clean(s: string | undefined): string {
  return (s ?? "").replace(/\u00a0/g, " ").trim();
}

function toAvatar(a: HoyoNodeAvatar, idx: GameIndex, lang: Lang): EndgameAvatar {
  const id = String(a.id);
  const ic = idx.characters[id];
  const el = idx.elements[ic?.element ?? ELEMENT_ID[a.element] ?? "Physical"];
  return {
    id,
    name: charName(ic?.name, id, lang),
    icon: ic?.icon ?? a.icon,
    rarity: a.rarity,
    eidolon: a.rank,
    level: a.level,
    element: { name: el?.name ?? "", color: el?.color ?? "#ffffff", icon: el?.icon ?? "" },
  };
}

function toNode(n: HoyoNode | null | undefined, idx: GameIndex, lang: Lang): EndgameNode | null {
  const list = (n?.avatars ?? []).filter((a): a is HoyoNodeAvatar => !!a);
  if (list.length === 0) return null;
  return {
    avatars: list.map((a) => toAvatar(a, idx, lang)),
    ...(n?.score ? { score: clean(n.score) } : {}),
    ...(typeof n?.boss_defeated === "boolean" ? { bossDefeated: n.boss_defeated } : {}),
    ...(n?.buff?.name_mi18n
      ? { buff: { name: clean(n.buff.name_mi18n), desc: clean(n.buff.desc_mi18n) } }
      : {}),
  };
}

/** "폭풍 소탕•12스타라이즈 모드" → "폭풍 소탕•12" (층 번호 뒤에 모드 이름이 구분자 없이 붙어 온다) */
export function floorName(raw: string): string {
  const s = clean(raw).split(/\r?\n/)[0];
  const marks = s.match(/[\d)]/g);
  if (!marks) return s;
  const cut = s.lastIndexOf(marks[marks.length - 1]);
  return cut >= 0 ? s.slice(0, cut + 1) : s;
}

async function fetchMode(
  mode: EndgameMode,
  uid: string,
  server: string,
  ck: HoyoCookie,
  idx: GameIndex,
  lang: Lang,
): Promise<EndgameRecord | null> {
  let body: HoyoChallenge;
  try {
    const res = await fetch(
      `${API}/${PATHS[mode]}?server=${server}&role_id=${uid}&schedule_type=1&need_all=true`,
      { headers: headersFor(ck, lang), cache: "no-store", signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) return null;
    body = (await res.json()) as HoyoChallenge;
  } catch {
    return null;
  }
  if (body.retcode !== 0 || !body.data?.has_data) return null;
  const d = body.data;
  const group = d.groups?.find((g) => g.status === "Running") ?? d.groups?.[0];
  const floors: EndgameFloor[] = [];
  for (const f of d.all_floor_detail ?? []) {
    const nodes = [toNode(f.node_1, idx, lang), toNode(f.node_2, idx, lang), toNode(f.node_3, idx, lang)].filter(
      (n): n is EndgameNode => n !== null,
    );
    if (nodes.length === 0) continue;
    floors.push({
      name: floorName(f.name),
      stars: Number(f.star_num) || 0,
      ...(typeof f.round_num === "number" ? { cycles: f.round_num } : {}),
      isFast: !!f.is_fast,
      nodes,
      ...(iso(f.node_1?.challenge_time) ? { time: iso(f.node_1?.challenge_time) } : {}),
    });
  }
  if (floors.length === 0) return null;
  return {
    mode,
    season: clean(group?.name_mi18n) || "",
    begin: iso(group?.begin_time),
    end: iso(group?.end_time),
    stars: d.star_num ?? 0,
    maxFloor: floorName(d.max_floor ?? ""),
    battles: d.battle_num ?? 0,
    floors,
  };
}

const mem = new Map<string, { at: number; value: EndgameResult }>();
const inflight = new Map<string, Promise<EndgameResult>>();

/** 엔드 콘텐츠 기록. 주인 쿠키가 없으면 캐시가 있으면 캐시를, 없으면 빈 목록. */
export async function getEndgame(
  uid: string,
  idx: GameIndex,
  opts: { viewer?: HoyoCookie | null; refresh?: boolean; lang?: Lang } = {},
): Promise<EndgameResult> {
  const lang = opts.lang ?? "ko";
  const server = serverOf(uid);
  if (!server) return { records: [] };
  const kv = getKV();
  const key = `${uid}:${lang}`;

  let cached: EndgameResult | null = null;
  if (!opts.refresh) {
    const hit = mem.get(key);
    if (hit && Date.now() - hit.at < 10 * 60 * 1000) cached = hit.value;
    if (!cached) {
      try {
        const raw = await kv.get(`hoyo:endgame:${key}`);
        if (raw) {
          const { at, data } = JSON.parse(raw) as { at: number; data: EndgameRecord[] };
          cached = { records: data, fetchedAt: at, cached: true };
          mem.set(key, { at: Date.now(), value: cached });
        }
      } catch {
        // 캐시 실패는 무시
      }
    }
    if (cached && Date.now() - (cached.fetchedAt ?? 0) < STALE_MS) return cached;
  }

  const ck = await firstOwnerCookie(uid, opts.viewer ?? null);
  if (!ck) return cached ?? { records: [] };

  const pending = inflight.get(key);
  if (pending) return pending;
  const p = (async () => {
    const modes: EndgameMode[] = ["moc", "pf", "as"];
    const got = await Promise.all(modes.map((m) => fetchMode(m, uid, server, ck, idx, lang)));
    const records = got.filter((r): r is EndgameRecord => r !== null);
    if (records.length === 0) return cached ?? { records: [] };
    const at = Date.now();
    const value: EndgameResult = { records, fetchedAt: at };
    mem.set(key, { at, value });
    kv.set(`hoyo:endgame:${key}`, JSON.stringify({ at, data: records }), TTL).catch((e) =>
      console.error("[endgame] 캐시 쓰기 실패", e),
    );
    return value;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
