import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { getKV, kvBackend, type KV } from "./kvstore";
import type { GameIndex } from "./starrailres";
import type {
  Character,
  LightCone,
  Prop,
  Relic,
  RelicSet,
  Skill,
  SkillTree,
  SubAffix,
} from "./types";

/**
 * HoYoLAB 전적(Battle Chronicle) 의 캐릭터 목록.
 * 서버에 둔 사이트 쿠키 풀(HOYOLAB_COOKIES / HOYOLAB_LTUID_V2+LTOKEN_V2) 또는 방문자가
 * [내 계정 연결]로 준 자기 쿠키로 아무 UID 나 조회한다.
 * 상대가 HoYoLAB 에서 전적을 비공개로 두면 안 나오고, 쿠키(계정) 하나당 하루 30개 UID 까지다.
 * 결과는 24시간 캐시(Redis, 없으면 메모리)하고, Mihomo 와 같은 Character 모양으로 바꿔서
 * 화면 컴포넌트를 그대로 쓴다.
 */

const API = "https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/avatar/info";
const DS_SALT = "6s25p5ox5y14umn1p61aqyyvbvvl3lrt"; // HoYoLAB 웹 game_record 용 (공개된 값)

// UID 첫 자리 → 서버. 1~5 는 중국 서버라 이 API 로는 안 된다.
const SERVER: Record<string, string> = {
  "6": "prod_official_usa",
  "7": "prod_official_eur",
  "8": "prod_official_asia",
  "9": "prod_official_cht",
};

export type HoyolabStatus =
  | "ok"
  | "disabled" // 서버에 쿠키가 없음
  | "unsupported" // 중국 서버 UID
  | "private" // 상대가 전적 비공개
  | "limit" // 하루 30개 UID 초과
  | "expired" // 쿠키 만료
  | "error";

export interface HoyolabResult {
  status: HoyolabStatus;
  message?: string;
  characters: Character[];
  fetchedAt?: number; // HoYoLAB 에서 실제로 가져온 시각 (epoch ms)
  cached?: boolean; // 24시간 캐시에서 꺼낸 결과인지
  cookieId?: string; // 어느 쿠키로 조회했는지 (pool:… / user:…)
}

/* ---------- 응답 타입 (쓰는 부분만) ---------- */

interface HoyoProperty {
  property_type: number;
  base: string;
  add: string;
  final: string;
}
interface HoyoAffix {
  property_type: number;
  value: string;
  times: number; // 강화 횟수 (초기 1회 포함, Mihomo 의 count 와 같음)
}
interface HoyoRelic {
  id: number;
  level: number;
  pos: number; // 1~6
  name: string;
  icon: string;
  rarity: number;
  main_property: HoyoAffix | null; // 미강화 유물은 null 로 올 때가 있다
  properties: HoyoAffix[] | null;
}
interface HoyoSkill {
  point_id: string;
  point_type: number; // 1 스탯 노드, 2 스킬, 3 추가 능력
  item_url: string;
  level: number;
  is_activated: boolean;
  pre_point: string;
  anchor: string; // Point01 ~ Point18
  remake: string; // 일반 공격 / 전투 스킬 / ... / 추가 능력 / 속성 보너스
  skill_stages?: { name?: string }[];
}
interface HoyoRank {
  pos: number;
  name: string;
  icon: string;
  is_unlocked: boolean;
}
interface HoyoEquip {
  id: number;
  level: number;
  rank: number; // 중첩
  name: string;
  icon: string;
  rarity: number;
}
interface HoyoAvatar {
  id: number;
  level: number;
  name: string;
  element: string; // fire, ice, lightning, wind, physical, quantum, imaginary
  icon: string;
  image: string;
  rarity: number;
  rank: number; // 성혼
  base_type: number; // 운명의 길 번호
  equip: HoyoEquip | null;
  relics: HoyoRelic[];
  ornaments: HoyoRelic[];
  ranks: HoyoRank[];
  properties: HoyoProperty[];
  skills: HoyoSkill[];
}
interface HoyoResponse {
  retcode: number;
  message: string;
  data?: { avatar_list: HoyoAvatar[] };
}

/* ---------- 매핑표 ---------- */

const ELEMENT_ID: Record<string, string> = {
  physical: "Physical",
  fire: "Fire",
  ice: "Ice",
  lightning: "Thunder",
  wind: "Wind",
  quantum: "Quantum",
  imaginary: "Imaginary",
};

const PATH_ID: Record<number, string> = {
  1: "Warrior",
  2: "Rogue",
  3: "Mage",
  4: "Shaman",
  5: "Warlock",
  6: "Knight",
  7: "Priest",
  8: "Memory",
  9: "Elation",
};

// 캐릭터 스탯 property_type → field (stats.ts 의 ORDER 와 같은 이름)
const STAT_FIELD: Record<number, string> = {
  1: "hp",
  2: "atk",
  3: "def",
  4: "spd",
  5: "crit_rate",
  6: "crit_dmg",
  7: "heal_rate",
  9: "sp_rate",
  10: "effect_hit",
  11: "effect_res",
  12: "physical_dmg",
  14: "fire_dmg",
  16: "ice_dmg",
  18: "thunder_dmg",
  20: "wind_dmg",
  22: "quantum_dmg",
  24: "imaginary_dmg",
  58: "break_dmg",
  71: "elation_dmg",
};

// 유물 메인/부옵션 property_type → field (평타·퍼센트가 다른 번호지만 field 는 같다)
const AFFIX_FIELD: Record<number, string> = {
  27: "hp",
  29: "atk",
  31: "def",
  32: "hp",
  33: "atk",
  34: "def",
  51: "spd",
  52: "crit_rate",
  53: "crit_dmg",
  54: "sp_rate",
  55: "heal_rate",
  56: "effect_hit",
  57: "effect_res",
  59: "break_dmg",
  72: "elation_dmg",
  12: "physical_dmg",
  14: "fire_dmg",
  16: "ice_dmg",
  18: "thunder_dmg",
  20: "wind_dmg",
  22: "quantum_dmg",
  24: "imaginary_dmg",
};

const FIELD_NAME: Record<string, string> = {
  hp: "HP",
  atk: "공격력",
  def: "방어력",
  spd: "속도",
  crit_rate: "치명타 확률",
  crit_dmg: "치명타 피해",
  break_dmg: "격파 특수효과",
  effect_hit: "효과 명중",
  effect_res: "효과 저항",
  sp_rate: "에너지 회복효율",
  heal_rate: "치유량 보너스",
  elation_dmg: "환락도",
  physical_dmg: "물리 속성 피해 증가",
  fire_dmg: "화염 속성 피해 증가",
  ice_dmg: "얼음 속성 피해 증가",
  thunder_dmg: "번개 속성 피해 증가",
  wind_dmg: "바람 속성 피해 증가",
  quantum_dmg: "양자 속성 피해 증가",
  imaginary_dmg: "허수 속성 피해 증가",
};

const FIELD_ICON: Record<string, string> = {
  hp: "icon/property/IconMaxHP.png",
  atk: "icon/property/IconAttack.png",
  def: "icon/property/IconDefence.png",
  spd: "icon/property/IconSpeed.png",
  crit_rate: "icon/property/IconCriticalChance.png",
  crit_dmg: "icon/property/IconCriticalDamage.png",
  break_dmg: "icon/property/IconBreakUp.png",
  effect_hit: "icon/property/IconStatusProbability.png",
  effect_res: "icon/property/IconStatusResistance.png",
  sp_rate: "icon/property/IconEnergyRecovery.png",
  heal_rate: "icon/property/IconHealRatio.png",
  elation_dmg: "icon/property/IconJoy.png",
  physical_dmg: "icon/property/IconPhysicalAddedRatio.png",
  fire_dmg: "icon/property/IconFireAddedRatio.png",
  ice_dmg: "icon/property/IconIceAddedRatio.png",
  thunder_dmg: "icon/property/IconThunderAddedRatio.png",
  wind_dmg: "icon/property/IconWindAddedRatio.png",
  quantum_dmg: "icon/property/IconQuantumAddedRatio.png",
  imaginary_dmg: "icon/property/IconImaginaryAddedRatio.png",
};

// HoYoLAB 은 퍼센트 스탯을 기초/가산으로 나눠 주지 않으므로 캐릭터 고유 기초값으로 되돌린다
const PERCENT_BASE: Record<string, number> = {
  crit_rate: 0.05,
  crit_dmg: 0.5,
  sp_rate: 1,
};

const SKILL_TYPE: Record<string, string> = {
  Point01: "Normal",
  Point02: "BPSkill",
  Point03: "Ultra",
  Point04: "Talent",
  Point05: "Maze",
};

/* ---------- 유틸 ---------- */

/** HoYoLAB 문자열은 공백이 NBSP(U+00A0) 로 온다 */
function clean(s: string | undefined): string {
  return (s ?? "").replace(/\u00a0/g, " ").trim();
}

/** "2,660" / "+2660" / "16.6%" → 숫자 (퍼센트는 0~1 비율) */
function parseNum(s: string): number {
  const n = Number(s.replace(/[%+,\s]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return s.includes("%") ? n / 100 : n;
}

function pct(v: number): string {
  return `${(Math.floor(v * 1000 + 1e-6) / 10).toFixed(1)}%`;
}

export function ds(): string {
  const t = Math.floor(Date.now() / 1000);
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let r = "";
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  const h = createHash("md5").update(`salt=${DS_SALT}&t=${t}&r=${r}`).digest("hex");
  return `${t},${r},${h}`;
}

/* ---------- 변환 ---------- */

function affix(a: HoyoAffix | null): Prop {
  if (!a) return { field: "", name: "-", icon: "", value: 0, display: "-", percent: false };
  const field = AFFIX_FIELD[a.property_type] ?? `p${a.property_type}`;
  return {
    type: String(a.property_type),
    field,
    name: FIELD_NAME[field] ?? `속성 ${a.property_type}`,
    icon: FIELD_ICON[field] ?? "",
    value: parseNum(a.value),
    display: clean(a.value),
    percent: a.value.includes("%"),
  };
}

function toRelic(r: HoyoRelic, idx: GameIndex): Relic {
  const ri = idx.relics[String(r.id)];
  const set = ri ? idx.relic_sets[ri.set_id] : undefined;
  return {
    id: String(r.id),
    name: clean(r.name),
    type: r.pos,
    set_id: ri?.set_id ?? "",
    set_name: set?.name ?? "",
    rarity: r.rarity,
    level: r.level,
    icon: ri?.icon ?? r.icon,
    main_affix: affix(r.main_property),
    sub_affix: (r.properties ?? []).map<SubAffix>((s) => ({
      ...affix(s),
      count: s.times,
      step: 0,
    })),
  };
}

function toRelicSets(relics: Relic[], idx: GameIndex): RelicSet[] {
  const count = new Map<string, number>();
  for (const r of relics) if (r.set_id) count.set(r.set_id, (count.get(r.set_id) ?? 0) + 1);
  const sets: RelicSet[] = [];
  for (const [setId, n] of count) {
    const s = idx.relic_sets[setId];
    if (!s || n < 2) continue;
    sets.push({ id: setId, name: s.name, icon: s.icon, num: 2, desc: s.desc[0] ?? "", properties: [] });
    if (n >= 4) {
      sets.push({ id: setId, name: s.name, icon: s.icon, num: 4, desc: s.desc[1] ?? "", properties: [] });
    }
  }
  return sets;
}

function toLightCone(e: HoyoEquip | null, idx: GameIndex): LightCone | null {
  if (!e) return null;
  const li = idx.light_cones[String(e.id)];
  const path = li ? idx.paths[li.path] : undefined;
  return {
    id: String(e.id),
    name: clean(e.name),
    rarity: e.rarity,
    rank: e.rank,
    level: e.level,
    promotion: -1,
    icon: li?.icon ?? e.icon,
    preview: li?.preview ?? e.icon,
    portrait: li?.portrait ?? e.icon,
    path: { id: li?.path ?? "", name: path?.name ?? "", icon: path?.icon ?? "" },
    attributes: [],
    properties: [],
  };
}

function toStats(props: HoyoProperty[]): { attributes: Prop[]; additions: Prop[] } {
  const attributes: Prop[] = [];
  const additions: Prop[] = [];
  for (const p of props) {
    const field = STAT_FIELD[p.property_type];
    if (!field) continue;
    const percent = p.final.includes("%");
    const meta = { field, name: FIELD_NAME[field], icon: FIELD_ICON[field], percent };
    if (percent) {
      const base = PERCENT_BASE[field] ?? 0;
      const add = parseNum(p.final) - base;
      if (base > 0) attributes.push({ ...meta, value: base, display: pct(base) });
      if (Math.abs(add) > 1e-9) additions.push({ ...meta, value: add, display: pct(add) });
    } else {
      const base = parseNum(p.base);
      const add = parseNum(p.add);
      attributes.push({ ...meta, value: base, display: String(Math.floor(base)) });
      if (Math.abs(add) > 1e-9) additions.push({ ...meta, value: add, display: String(Math.floor(add)) });
    }
  }
  return { attributes, additions };
}

function toSkills(nodes: HoyoSkill[]): { skills: Skill[]; skill_trees: SkillTree[] } {
  const skills = nodes
    .filter((s) => SKILL_TYPE[s.anchor])
    .map<Skill>((s) => ({
      id: s.point_id,
      name: clean(s.skill_stages?.[0]?.name) || clean(s.remake),
      level: s.level,
      max_level: 0,
      element: null,
      type: SKILL_TYPE[s.anchor],
      type_text: clean(s.remake),
      effect: "",
      effect_text: "",
      simple_desc: "",
      desc: "",
      icon: s.item_url,
    }));
  const skill_trees = nodes.map<SkillTree>((s) => ({
    id: s.point_id,
    level: s.is_activated ? s.level : 0,
    anchor: s.anchor,
    max_level: SKILL_TYPE[s.anchor] ? 0 : 1,
    icon: s.item_url,
    parent: s.pre_point && s.pre_point !== "0" ? s.pre_point : null,
  }));
  return { skills, skill_trees };
}

export function toCharacter(a: HoyoAvatar, idx: GameIndex): Character {
  const id = String(a.id);
  const ic = idx.characters[id];
  const elementId = ic?.element ?? ELEMENT_ID[a.element] ?? "Physical";
  const pathId = ic?.path ?? PATH_ID[a.base_type] ?? "Warrior";
  const el = idx.elements[elementId];
  const pa = idx.paths[pathId];
  const relics = [...(a.relics ?? []), ...(a.ornaments ?? [])].map((r) => toRelic(r, idx));
  const { attributes, additions } = toStats(a.properties ?? []);
  const { skills, skill_trees } = toSkills(a.skills ?? []);

  return {
    source: "hoyolab",
    id,
    name: clean(a.name),
    rarity: a.rarity,
    rank: a.rank,
    level: a.level,
    promotion: -1,
    icon: ic?.icon ?? a.icon,
    preview: ic?.preview ?? a.image,
    portrait: ic?.portrait ?? a.image,
    rank_icons: [...(a.ranks ?? [])].sort((x, y) => x.pos - y.pos).map((r) => r.icon),
    path: { id: pathId, name: pa?.name ?? "", icon: pa?.icon ?? "" },
    element: {
      id: elementId,
      name: el?.name ?? "",
      color: el?.color ?? "#ffffff",
      icon: el?.icon ?? "",
    },
    skills,
    skill_trees,
    light_cone: toLightCone(a.equip, idx),
    relics,
    relic_sets: toRelicSets(relics, idx),
    attributes,
    additions,
    properties: [],
  };
}

/* ---------- 쿠키 풀 ---------- */

/** 조회에 쓰는 HoYoLAB 쿠키 하나. owned = 방문자가 [내 계정 연결]로 준 자기 쿠키 */
export interface HoyoCookie {
  id: string;
  ltuid: string;
  ltoken: string;
  owned?: boolean;
}

/**
 * 사이트 쿠키 풀. HOYOLAB_COOKIES 에 여러 개("ltuid:ltoken" 을 쉼표나 줄바꿈으로, 또는
 * "ltuid_v2=..; ltoken_v2=.." 형식) + 예전 방식의 HOYOLAB_LTUID_V2 / HOYOLAB_LTOKEN_V2 한 개.
 */
export function poolCookies(): HoyoCookie[] {
  const list: HoyoCookie[] = [];
  const push = (ltuid?: string, ltoken?: string) => {
    if (!ltuid || !ltoken) return;
    if (list.some((c) => c.ltuid === ltuid)) return;
    list.push({ id: `pool:${ltuid}`, ltuid: ltuid.trim(), ltoken: ltoken.trim() });
  };
  push(process.env.HOYOLAB_LTUID_V2?.trim(), process.env.HOYOLAB_LTOKEN_V2?.trim());
  for (const part of (process.env.HOYOLAB_COOKIES ?? "").split(/[\n,]+/)) {
    const p = part.trim();
    if (!p) continue;
    const m1 = p.match(/ltuid_v2=(\d+)/);
    const m2 = p.match(/ltoken_v2=([^;\s]+)/);
    if (m1 && m2) {
      push(m1[1], m2[1]);
      continue;
    }
    const i = p.indexOf(":");
    if (i > 0) push(p.slice(0, i), p.slice(i + 1));
  }
  return list;
}

export function hoyolabEnabled(): boolean {
  return poolCookies().length > 0;
}

/** HoYoLAB 의 하루 경계는 서버(UTC+8) 기준으로 본다 */
function dayKey(now = Date.now()): string {
  return new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}

function secondsToDayEnd(now = Date.now()): number {
  const shifted = now + 8 * 3600 * 1000;
  const end = Math.ceil(shifted / 86400000) * 86400000;
  return Math.max(60, Math.floor((end - shifted) / 1000) + 60);
}

const ROSTER_TTL = 24 * 3600; // 조회 결과 캐시 (초)
const MEM_TTL_MS = 10 * 60 * 1000; // 프로세스 안 1차 캐시

/* ---------- 호출 ---------- */

function mapError(retcode: number, message: string, owned: boolean): HoyolabResult {
  switch (retcode) {
    case 10101:
      return {
        status: "limit",
        message: owned
          ? "연결한 HoYoLAB 계정의 오늘 조회 한도(30개 UID)가 찼습니다. 내일 다시 시도해 주세요."
          : "오늘 사이트 전체의 HoYoLAB 조회 한도가 찼습니다. 내일 다시 시도하거나 전시 캐릭터를 참고해 주세요.",
        characters: [],
      };
    case 10102:
      return {
        status: "private",
        message: "이 계정은 HoYoLAB 전적이 비공개라 전시 캐릭터만 보여 줍니다.",
        characters: [],
      };
    case 10001:
    case -100:
      return {
        status: "expired",
        message: owned
          ? "연결한 HoYoLAB 쿠키가 만료되었습니다. [내 계정 연결] 에서 다시 연결해 주세요."
          : "사이트의 HoYoLAB 로그인이 만료되었습니다. 관리자가 쿠키를 갱신해야 합니다.",
        characters: [],
      };
    case 1034:
      return {
        status: "error",
        message: "HoYoLAB 이 자동 조회를 잠시 막았습니다(캡차). 잠시 후 다시 시도해 주세요.",
        characters: [],
      };
    default:
      return { status: "error", message: `HoYoLAB 오류 ${retcode}: ${message}`, characters: [] };
  }
}

/** HoYoLAB 전적 API 공통 헤더 */
export function headersFor(ck: { ltuid: string; ltoken: string }): Record<string, string> {
  return {
    Cookie: `ltuid_v2=${ck.ltuid}; ltoken_v2=${ck.ltoken}`,
    DS: ds(),
    "x-rpc-app_version": "1.5.0",
    "x-rpc-client_type": "5",
    "x-rpc-language": "ko-kr",
    Origin: "https://act.hoyolab.com",
    Referer: "https://act.hoyolab.com/",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  };
}

async function fetchRoster(
  uid: string,
  server: string,
  ck: HoyoCookie,
  idx: GameIndex,
): Promise<HoyolabResult> {
  let res: Response;
  try {
    res = await fetch(`${API}?server=${server}&role_id=${uid}&need_wiki=false`, {
      headers: headersFor(ck),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { status: "error", message: "HoYoLAB 에 연결할 수 없습니다.", characters: [] };
  }
  if (!res.ok) {
    return { status: "error", message: `HoYoLAB HTTP ${res.status}`, characters: [] };
  }
  const body = (await res.json()) as HoyoResponse;
  if (body.retcode !== 0 || !body.data) return mapError(body.retcode, body.message, !!ck.owned);
  // 한 캐릭터의 데이터가 이상해도 나머지는 보여 준다
  const characters: Character[] = [];
  for (const a of body.data.avatar_list ?? []) {
    try {
      characters.push(toCharacter(a, idx));
    } catch (e) {
      console.error(`[hoyolab] 캐릭터 ${a?.id} 변환 실패`, e);
    }
  }
  return { status: "ok", characters };
}

/* ---------- 캐시 + 한도 관리 ---------- */

const mem = new Map<string, { at: number; result: HoyolabResult }>();
const inflight = new Map<string, Promise<HoyolabResult>>();

function pack(characters: Character[]): string {
  return gzipSync(Buffer.from(JSON.stringify(characters), "utf8")).toString("base64");
}

function unpack(packed: string): Character[] {
  return JSON.parse(gunzipSync(Buffer.from(packed, "base64")).toString("utf8")) as Character[];
}

export interface RosterOptions {
  viewer?: HoyoCookie | null; // 방문자가 연결한 자기 쿠키 (있으면 이걸 먼저 쓴다)
  refresh?: boolean; // 캐시를 건너뛰고 새로 조회
}

/**
 * 조회 순서: 메모리 캐시 → Redis 캐시(24시간) → HoYoLAB.
 * HoYoLAB 을 부를 때는 방문자 쿠키 → (같은 UID 를 오늘 이미 쓴 풀 쿠키) → 오늘 덜 쓴 풀 쿠키 순.
 * 한도 초과(10101)·만료(10001)는 기록해 두고 다른 쿠키로 넘어간다.
 */
export async function getHoyolabRoster(
  uid: string,
  idx: GameIndex,
  opts: RosterOptions = {},
): Promise<HoyolabResult> {
  const pool = poolCookies();
  const viewer = opts.viewer ?? null;
  if (!viewer && pool.length === 0) return { status: "disabled", characters: [] };
  const server = SERVER[uid[0]];
  if (!server) {
    return {
      status: "unsupported",
      message: "중국 서버 UID 는 HoYoLAB 전적으로 조회할 수 없어 전시 캐릭터만 보여 줍니다.",
      characters: [],
    };
  }

  const kv = getKV();
  if (!opts.refresh) {
    const hit = mem.get(uid);
    if (hit && Date.now() - hit.at < MEM_TTL_MS) return hit.result;
    try {
      const packed = await kv.get(`hoyo:roster:${uid}`);
      if (packed) {
        const { at, data } = JSON.parse(packed) as { at: number; data: string };
        const result: HoyolabResult = { status: "ok", characters: unpack(data), fetchedAt: at, cached: true };
        mem.set(uid, { at: Date.now(), result });
        return result;
      }
      // 비공개 기록은 방문자가 자기 쿠키를 연결하지 않았을 때만 재사용 (본인 쿠키면 볼 수 있으므로)
      if (!viewer) {
        const priv = await kv.get(`hoyo:private:${uid}`);
        if (priv) return { ...mapError(10102, "", false), fetchedAt: Number(priv), cached: true };
      }
    } catch (e) {
      console.error("[hoyolab] 캐시 읽기 실패", e);
    }
  }

  const key = `${uid}:${viewer?.id ?? "pool"}`;
  const pending = inflight.get(key);
  if (pending) return pending;
  const p = fetchWithCookies(uid, server, idx, viewer, pool, kv).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** 쿠키(계정)에 연동된 스타레일 UID 목록. 게임 기록 카드는 한도를 안 쓰므로 하루 캐시. */
async function ownedUids(ck: HoyoCookie, kv: KV): Promise<string[]> {
  const key = `hoyo:owned:${ck.id}`;
  const cached = await kv.get(key).catch(() => null);
  if (cached) return JSON.parse(cached) as string[];
  let uids: string[] = [];
  try {
    const res = await fetch(
      `https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard?uid=${ck.ltuid}`,
      { headers: headersFor(ck), cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    const body = (await res.json()) as {
      retcode: number;
      data?: { list?: { game_id: number; game_role_id: string }[] };
    };
    if (body.retcode === 0) {
      uids = (body.data?.list ?? []).filter((r) => r.game_id === 6).map((r) => String(r.game_role_id));
    }
  } catch {
    // 실패하면 빈 목록으로 두고 다음에 다시 시도
    return [];
  }
  await kv.set(key, JSON.stringify(uids), 86400).catch(() => {});
  return uids;
}

async function fetchWithCookies(
  uid: string,
  server: string,
  idx: GameIndex,
  viewer: HoyoCookie | null,
  pool: HoyoCookie[],
  kv: KV,
): Promise<HoyolabResult> {
  const day = dayKey();
  const candidates: HoyoCookie[] = [];
  if (viewer) candidates.push(viewer);
  // 1) 이 UID 의 주인 계정 쿠키가 풀에 있으면 그게 먼저 (비공개여도 본인은 볼 수 있다)
  // 2) 오늘 이 UID 를 이미 조회한 풀 쿠키 (같은 UID 는 다시 세지 않는다)
  // 3) 오늘 덜 쓴 순
  const sticky = await kv.get(`hoyo:sticky:${uid}`).catch(() => null);
  const rank = new Map<string, number>();
  for (const c of pool) {
    const owned = await ownedUids(c, kv);
    const usage = await kv.scard(`hoyo:day:${c.id}:${day}`).catch(() => 0);
    rank.set(c.id, owned.includes(uid) ? -2000 : c.id === sticky ? -1000 : usage);
  }
  candidates.push(...[...pool].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0)));

  let last: HoyolabResult | null = null;
  for (const ck of candidates) {
    if (await kv.get(`hoyo:dead:${ck.id}`).catch(() => null)) continue;
    if (await kv.get(`hoyo:exhausted:${ck.id}:${day}`).catch(() => null)) continue;

    const r = await fetchRoster(uid, server, ck, idx);
    last = r;
    if (r.status === "ok" || r.status === "private") {
      // 이 쿠키의 오늘 사용 기록 + UID→쿠키 고정
      await kv.sadd(`hoyo:day:${ck.id}:${day}`, uid, 2 * 86400).catch(() => {});
      if (!ck.owned) await kv.set(`hoyo:sticky:${uid}`, ck.id, 86400).catch(() => {});
    }
    if (r.status === "ok") {
      const at = Date.now();
      const result: HoyolabResult = { ...r, fetchedAt: at, cookieId: ck.id };
      mem.set(uid, { at, result });
      kv.set(`hoyo:roster:${uid}`, JSON.stringify({ at, data: pack(r.characters) }), ROSTER_TTL).catch((e) =>
        console.error("[hoyolab] 캐시 쓰기 실패", e),
      );
      return result;
    }
    if (r.status === "private") {
      await kv.set(`hoyo:private:${uid}`, String(Date.now()), ROSTER_TTL).catch(() => {});
      return { ...r, fetchedAt: Date.now() };
    }
    if (r.status === "limit") {
      await kv.set(`hoyo:exhausted:${ck.id}:${day}`, "1", secondsToDayEnd()).catch(() => {});
      continue;
    }
    if (r.status === "expired") {
      await kv.set(`hoyo:dead:${ck.id}`, "1", 12 * 3600).catch(() => {});
      continue;
    }
    return r; // 캡차·네트워크 오류: 다른 쿠키로 바꿔도 소용없다
  }

  if (last) return last;
  return {
    status: "limit",
    message: "오늘 사이트 전체의 HoYoLAB 조회 한도가 찼습니다. 내일 다시 시도하거나 전시 캐릭터를 참고해 주세요.",
    characters: [],
  };
}

/* ---------- 관리 화면용 상태 ---------- */

export interface CookieStatus {
  id: string;
  ltuidMasked: string;
  today: number; // 오늘 조회한 서로 다른 UID 수
  exhausted: boolean;
  dead: boolean;
}

export async function poolStatus(): Promise<{ day: string; backend: string; cookies: CookieStatus[] }> {
  const kv = getKV();
  const day = dayKey();
  const cookies: CookieStatus[] = [];
  for (const c of poolCookies()) {
    cookies.push({
      id: c.id,
      ltuidMasked: c.ltuid.slice(0, 3) + "****",
      today: await kv.scard(`hoyo:day:${c.id}:${day}`).catch(() => 0),
      exhausted: !!(await kv.get(`hoyo:exhausted:${c.id}:${day}`).catch(() => null)),
      dead: !!(await kv.get(`hoyo:dead:${c.id}`).catch(() => null)),
    });
  }
  return { day, backend: kvBackend(), cookies };
}
