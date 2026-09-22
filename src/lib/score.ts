import type { Character, Relic } from "./types";

/**
 * 유물 평가 — "유효 롤" 기준.
 *
 * 부옵션 하나의 값을 그 부옵션의 최대 강화치로 나누면 "몇 롤 값어치인가"(RV)가 나온다.
 * 여기에 캐릭터별 가중치를 곱해 더한 것이 유효 롤이고, 5★ +15 유물이 가질 수 있는 최대 9롤로
 * 나눠 100점 만점으로 환산한다. 가중치는 HoYoLAB 이 캐릭터마다 알려 주는 추천 부옵션을 쓴다
 * (없으면 운명의 길로 기본값). 판단 근거를 화면에 같이 보여 주므로 숫자를 그대로 믿을 필요는 없다.
 */

/** 5★ 부옵션 한 롤의 최대치 (퍼센트는 비율) */
const MAX_ROLL: Record<string, { flat?: number; percent?: number }> = {
  hp: { flat: 42.34, percent: 0.0432 },
  atk: { flat: 21.17, percent: 0.0432 },
  def: { flat: 21.17, percent: 0.054 },
  spd: { flat: 2.6 },
  crit_rate: { percent: 0.0324 },
  crit_dmg: { percent: 0.0648 },
  break_dmg: { percent: 0.0648 },
  effect_hit: { percent: 0.0432 },
  effect_res: { percent: 0.0432 },
};

const MAX_ROLLS_PER_RELIC = 9; // 부옵 4개로 시작 + 강화 5회

/** HoYoLAB 추천 부옵션 id → 우리 field (+퍼센트 여부) */
export const RECO_PROPERTY: Record<number, { field: string; percent: boolean }> = {
  27: { field: "hp", percent: false },
  29: { field: "atk", percent: false },
  31: { field: "def", percent: false },
  32: { field: "hp", percent: true },
  33: { field: "atk", percent: true },
  34: { field: "def", percent: true },
  51: { field: "spd", percent: false },
  52: { field: "crit_rate", percent: true },
  53: { field: "crit_dmg", percent: true },
  55: { field: "heal_rate", percent: true },
  56: { field: "effect_hit", percent: true },
  57: { field: "effect_res", percent: true },
  59: { field: "break_dmg", percent: true },
};

/** 추천 정보가 없을 때 쓰는 운명의 길별 기본 가중치 */
const PATH_DEFAULT: Record<string, string[]> = {
  Warrior: ["crit_rate", "crit_dmg", "atk", "spd"], // 파멸
  Rogue: ["crit_rate", "crit_dmg", "atk", "spd"], // 수렵
  Mage: ["crit_rate", "crit_dmg", "atk", "spd"], // 지식
  Elation: ["crit_rate", "crit_dmg", "atk", "spd"], // 환락
  Memory: ["crit_rate", "crit_dmg", "atk", "spd"], // 기억
  Shaman: ["spd", "break_dmg", "effect_res", "hp"], // 화합
  Warlock: ["effect_hit", "spd", "break_dmg", "atk"], // 공허
  Knight: ["def", "effect_res", "spd", "hp"], // 보존
  Priest: ["hp", "spd", "effect_res", "heal_rate"], // 풍요
};

export interface RelicScore {
  rolls: number; // 유효 롤 (가중 합)
  score: number; // 0~100
  subs: { field: string; name: string; display: string; weight: number; rv: number }[];
  mainVerdict: "good" | "maybe" | "bad" | "fixed";
}

export interface CharScore {
  total: number; // 유물 평균 점수 0~100
  grade: string; // S / A / B / C / D
  rolls: number; // 유효 롤 합계
  relics: Map<string, RelicScore>; // relic.id+type → 점수
  useful: string[]; // 유효로 친 스탯 field
  mainBad: number; // 메인옵이 어긋난 부위 수
}

/**
 * 이 캐릭터에서 값어치 있는 부옵션 (field → 0~1 가중치).
 * HoYoLAB 추천 부옵션은 3~4개뿐이라 그것만 세면 너무 박해서, 운명의 길 기본값을 절반 가중치로 더한다.
 */
export function usefulStats(c: Character, reco?: number[]): Map<string, number> {
  const w = new Map<string, number>();
  const list = (reco ?? []).map((id) => RECO_PROPERTY[id]).filter(Boolean);
  const primary = new Set(list.map((x) => x.field));

  for (const f of PATH_DEFAULT[c.path.id] ?? PATH_DEFAULT.Warrior) {
    w.set(f, list.length > 0 ? 0.5 : 1);
  }
  for (const { field, percent } of list) {
    w.set(field, 1);
    // 퍼센트 부옵이 추천이면 같은 계열 평타(고정값)도 절반쯤은 쓸모 있다
    if (percent && ["hp", "atk", "def"].includes(field)) w.set(`${field}:flat`, 0.5);
  }
  // 치확·치피는 한쪽만 추천돼도 다른 쪽이 필요하다
  if (primary.has("crit_rate") && !primary.has("crit_dmg")) w.set("crit_dmg", 1);
  if (primary.has("crit_dmg") && !primary.has("crit_rate")) w.set("crit_rate", 1);
  return w;
}

function weightOf(w: Map<string, number>, field: string, percent: boolean): number {
  if (!percent && ["hp", "atk", "def"].includes(field)) {
    return w.get(`${field}:flat`) ?? (w.get(field) ?? 0) * 0.5;
  }
  return w.get(field) ?? 0;
}

function maxRollOf(field: string, percent: boolean): number | null {
  const m = MAX_ROLL[field];
  if (!m) return null;
  const v = percent ? m.percent : m.flat;
  return v ?? null;
}

/** 메인옵이 이 캐릭터에 맞는지 */
function judgeMain(r: Relic, c: Character, w: Map<string, number>): RelicScore["mainVerdict"] {
  if (r.type === 1 || r.type === 2) return "fixed"; // 머리·손은 고정
  const f = r.main_affix.field;
  if (f.endsWith("_dmg") && f !== "break_dmg") {
    // 차원 구체 속성 피해는 캐릭터 속성과 맞으면 좋다
    const elem = c.element.id.toLowerCase().replace("thunder", "thunder");
    return f.startsWith(elem) ? "good" : "bad";
  }
  if (f === "sp_rate") return "maybe"; // 에너지 회복 밧줄은 팀에 따라 다르다
  if (f === "break_dmg") return w.has("break_dmg") ? "good" : "maybe";
  if ((w.get(f) ?? 0) >= 1) return "good";
  if ((w.get(f) ?? 0) > 0) return "maybe";
  return "bad";
}

/**
 * 등급 구간. 실제 계정(유물 낀 캐릭터 65명)의 점수 분포를 기준으로 잡았다.
 * 상위 10% ≈ 53, 25% ≈ 48, 50% ≈ 37, 75% ≈ 24.
 */
export function gradeOf(score: number): string {
  if (score >= 53) return "S";
  if (score >= 46) return "A";
  if (score >= 36) return "B";
  if (score >= 24) return "C";
  return "D";
}

/** 캐릭터 한 명의 유물 점수 */
export function scoreCharacter(c: Character, reco?: number[]): CharScore {
  const w = usefulStats(c, reco);
  const relics = new Map<string, RelicScore>();
  let rollSum = 0;
  let scored = 0;
  let mainBad = 0;

  for (const r of c.relics) {
    let rolls = 0;
    const subs: RelicScore["subs"] = [];
    for (const s of r.sub_affix) {
      const max = maxRollOf(s.field, s.percent);
      const weight = weightOf(w, s.field, s.percent);
      const rv = max ? s.value / max : 0;
      rolls += rv * weight;
      subs.push({ field: s.field, name: s.name, display: s.display, weight, rv });
    }
    const score = Math.min(100, (rolls / MAX_ROLLS_PER_RELIC) * 100);
    const mainVerdict = judgeMain(r, c, w);
    if (mainVerdict === "bad") mainBad += 1;
    relics.set(r.id + r.type, { rolls, score, subs, mainVerdict });
    rollSum += rolls;
    scored += 1;
  }

  const total = scored > 0 ? (rollSum / (scored * MAX_ROLLS_PER_RELIC)) * 100 : 0;
  return {
    total,
    grade: gradeOf(total),
    rolls: rollSum,
    relics,
    useful: [...w.keys()].filter((k) => !k.endsWith(":flat")),
    mainBad,
  };
}

/* ---------- 속도 구간 ---------- */

/** 자주 쓰이는 속도 기준선 (사이클당 행동 수가 늘어나는 지점) */
export const SPEED_BREAKPOINTS = [110, 120, 134.4, 143.7, 160.5, 177.8, 200.1];

export function speedInfo(spd: number): { reached: number | null; next: number | null; gap: number | null } {
  let reached: number | null = null;
  let next: number | null = null;
  for (const b of SPEED_BREAKPOINTS) {
    if (spd + 1e-9 >= b) reached = b;
    else {
      next = b;
      break;
    }
  }
  return { reached, next, gap: next === null ? null : Math.ceil(next - spd) };
}

/* ---------- 치확 : 치피 ---------- */

export function critRatio(rate: number, dmg: number): { ratio: number | null; hint: "low" | "high" | "ok" } {
  if (rate <= 0) return { ratio: null, hint: "low" };
  const ratio = dmg / rate;
  if (ratio > 2.6) return { ratio, hint: "low" }; // 치확이 부족
  if (ratio < 1.5) return { ratio, hint: "high" }; // 치피가 부족
  return { ratio, hint: "ok" };
}
