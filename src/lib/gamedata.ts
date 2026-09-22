import { LANGS, type Lang } from "./i18n";
import { ASSET_BASE } from "./mihomo";
import type { LightCone, Prop } from "./types";

/**
 * HoYoLAB 데이터의 빈칸을 StarRailRes 정적 자료로 메운다.
 *
 * HoYoLAB 전적은 광추 기초 스탯·중첩 효과·스킬 최대 레벨·승급 단계를 주지 않는다.
 * 이 값들은 계정과 무관한 게임 자료라서 StarRailRes 에서 받아 채워 넣을 수 있고,
 * 그러면 전시(Mihomo) 로 본 캐릭터와 HoYoLAB 으로 본 캐릭터가 같은 화면으로 보인다.
 * 받아오지 못하면 예전처럼 빈칸으로 두고 넘어간다 (화면은 빈칸을 숨기게 돼 있다).
 */

interface RawSkill {
  id: string;
  type: string;
  max_level: number;
}

interface RawLcPromotion {
  id: string;
  values: { hp: Step; atk: Step; def: Step }[];
}

interface Step {
  base: number;
  step: number;
}

interface RawLcRank {
  id: string;
  properties: { type: string; value: number }[][];
}

export interface PropertyMeta {
  type: string;
  name: string;
  field: string;
  percent: boolean;
  icon: string;
}

export interface GameDetail {
  /** 캐릭터 id → 스킬 종류(Normal·BPSkill…) → 최대 레벨 */
  skillMax: Record<string, Record<string, number>>;
  /** 광추 id → 승급 단계별 기초 스탯 */
  lcPromotions: Record<string, RawLcPromotion>;
  /** 광추 id → 중첩 단계별 효과 */
  lcRanks: Record<string, RawLcRank>;
  /** StarRailRes 속성 타입 → 표시 정보 */
  properties: Record<string, PropertyMeta>;
}

const EMPTY: GameDetail = { skillMax: {}, lcPromotions: {}, lcRanks: {}, properties: {} };

async function fetchJson<T>(name: string, lang: Lang): Promise<Record<string, T> | null> {
  try {
    const res = await fetch(`${ASSET_BASE}index_min/${LANGS[lang].index}/${name}.json`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, T>;
  } catch {
    return null;
  }
}

/** 스킬 자료는 7MB 가까이 되므로 필요한 칸(종류별 최대 레벨)만 남긴다 */
function trimSkills(raw: Record<string, RawSkill> | null): GameDetail["skillMax"] {
  const out: GameDetail["skillMax"] = {};
  for (const id of Object.keys(raw ?? {}).sort()) {
    const s = raw![id];
    if (!s?.type || !s.max_level) continue;
    // 캐릭터 스킬은 1310+01, 기억 정령 스킬은 앞에 1 이 더 붙는다 (1+1512+01)
    const charId = id.length >= 7 ? id.slice(1, 5) : id.slice(0, 4);
    const byType = (out[charId] ??= {});
    // 같은 종류가 여러 개인 캐릭터(변신 등)는 첫 번째 = 기본 스킬을 쓴다
    if (byType[s.type] === undefined) byType[s.type] = s.max_level;
  }
  return out;
}

const cache = new Map<Lang, Promise<GameDetail>>();

export function getGameDetail(lang: Lang = "ko"): Promise<GameDetail> {
  let p = cache.get(lang);
  if (!p) {
    // 받아오지 못했으면 기억해 두지 않는다 — 다음 조회 때 다시 시도한다
    p = load(lang).catch(() => {
      cache.delete(lang);
      return EMPTY;
    });
    cache.set(lang, p);
  }
  return p;
}

async function load(lang: Lang): Promise<GameDetail> {
  const [skills, lcPromotions, lcRanks, properties] = await Promise.all([
    fetchJson<RawSkill>("character_skills", lang),
    fetchJson<RawLcPromotion>("light_cone_promotions", lang),
    fetchJson<RawLcRank>("light_cone_ranks", lang),
    fetchJson<PropertyMeta>("properties", lang),
  ]);
  return {
    skillMax: trimSkills(skills),
    lcPromotions: lcPromotions ?? {},
    lcRanks: lcRanks ?? {},
    properties: properties ?? {},
  };
}

/* ---------- 승급 단계 ---------- */

/** 레벨 상한: 승급 0→20, 1→30, … 6→80 */
const LEVEL_CAP = [20, 30, 40, 50, 60, 70, 80];

/**
 * 레벨만으로 승급 단계를 알 수 있을 때만 알려 준다 (모르면 -1).
 * 예) 73 레벨은 6단계여야만 가능하다. 70 레벨은 5단계일 수도 6단계일 수도 있어 모른다고 한다.
 */
export function promotionFromLevel(level: number): number {
  if (level > 80 || level < 1) return -1;
  if (level === 80) return 6;
  const i = LEVEL_CAP.findIndex((cap) => level <= cap);
  if (i < 0) return -1;
  return level === LEVEL_CAP[i] ? -1 : i; // 상한에 딱 걸린 레벨은 더 올렸는지 알 수 없다
}

/* ---------- 광추 ---------- */

function flat(field: string, name: string, icon: string, value: number): Prop {
  return { field, name, icon, value, display: String(Math.floor(value + 1e-6)), percent: false };
}

function toProp(meta: PropertyMeta, value: number): Prop {
  return {
    type: meta.type,
    field: meta.field,
    name: meta.name,
    icon: meta.icon,
    value,
    display: meta.percent ? `${(Math.floor(value * 1000 + 1e-6) / 10).toFixed(1)}%` : String(Math.floor(value + 1e-6)),
    percent: meta.percent,
  };
}

/** 광추 기초 HP·공격력·방어력 (승급 단계 기준값 + 레벨당 증가) */
export function lightConeAttributes(detail: GameDetail, id: string, level: number, promotion: number): Prop[] {
  const table = detail.lcPromotions[id];
  const p = promotion >= 0 ? promotion : promotionFromLevel(level);
  const v = table?.values?.[p];
  if (!v) return [];
  const at = (s: Step) => s.base + s.step * (level - 1);
  const meta = detail.properties;
  return [
    flat("hp", meta.MaxHP?.name ?? "HP", meta.MaxHP?.icon ?? "", at(v.hp)),
    flat("atk", meta.Attack?.name ?? "ATK", meta.Attack?.icon ?? "", at(v.atk)),
    flat("def", meta.Defence?.name ?? "DEF", meta.Defence?.icon ?? "", at(v.def)),
  ];
}

/** 광추 중첩 효과가 주는 스탯 (설명문 안의 수치는 빼고, 스탯만) */
export function lightConeRankProps(detail: GameDetail, id: string, rank: number): Prop[] {
  const list = detail.lcRanks[id]?.properties?.[Math.max(0, rank - 1)];
  if (!list) return [];
  const out: Prop[] = [];
  for (const p of list) {
    const meta = detail.properties[p.type];
    if (meta) out.push(toProp(meta, p.value));
  }
  return out;
}

/** HoYoLAB 이 준 광추에 기초 스탯·중첩 효과·승급 단계를 채워 넣는다 */
export function fillLightCone(detail: GameDetail, lc: LightCone | null): LightCone | null {
  if (!lc) return lc;
  const promotion = lc.promotion >= 0 ? lc.promotion : promotionFromLevel(lc.level);
  return {
    ...lc,
    promotion,
    attributes: lc.attributes.length > 0 ? lc.attributes : lightConeAttributes(detail, lc.id, lc.level, promotion),
    properties: lc.properties.length > 0 ? lc.properties : lightConeRankProps(detail, lc.id, lc.rank),
  };
}
