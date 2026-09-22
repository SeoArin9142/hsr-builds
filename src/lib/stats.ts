import { getDict, type Lang } from "./i18n";
import type { Character, Prop } from "./types";

/**
 * Mihomo 는 스탯을 attributes(기초) 와 additions(가산) 로 나눠 주고
 * 최종값은 주지 않으므로 여기서 합친다. 인게임 표기와 같이 정수는 버림.
 */

export interface StatRow {
  field: string;
  name: string;
  icon: string;
  percent: boolean;
  base: number;
  add: number;
  total: number;
}

// 인게임 캐릭터 상세 화면 순서
const ORDER = [
  "hp",
  "atk",
  "def",
  "spd",
  "crit_rate",
  "crit_dmg",
  "break_dmg",
  "effect_hit",
  "effect_res",
  "sp_rate",
  "heal_rate",
  "elation_dmg",
  "physical_dmg",
  "fire_dmg",
  "ice_dmg",
  "thunder_dmg",
  "wind_dmg",
  "quantum_dmg",
  "imaginary_dmg",
  "all_dmg",
];

// API 는 "기초 HP" 처럼 이름을 주므로 최종 표에서는 짧은 이름으로 바꾼다 (언어별)
function labelFor(lang: Lang, field: string, apiName: string): string {
  const d = getDict(lang);
  const own: Record<string, string> = {
    hp: d.f_hp,
    atk: d.f_atk,
    def: d.f_def,
    spd: d.f_spd,
    sp_rate: d.f_sp_rate,
  };
  return own[field] ?? apiName.replace(/^(기초|Base|基礎)\s*/, "");
}

// attributes 에 없어도 기본값이 0 이 아닌 스탯
const BASE_DEFAULT: Record<string, number> = {
  sp_rate: 1, // 에너지 회복 효율 100%
};

export function fieldOrder(field: string): number {
  const i = ORDER.indexOf(field);
  return i === -1 ? ORDER.length : i;
}

export function buildStatRows(c: Character, lang: Lang = "ko"): StatRow[] {
  const rows = new Map<string, StatRow>();

  const ensure = (p: Prop): StatRow => {
    let row = rows.get(p.field);
    if (!row) {
      row = {
        field: p.field,
        name: labelFor(lang, p.field, p.name),
        icon: p.icon,
        percent: p.percent,
        base: BASE_DEFAULT[p.field] ?? 0,
        add: 0,
        total: 0,
      };
      rows.set(p.field, row);
    }
    return row;
  };

  for (const p of c.attributes) ensure(p).base = p.value;
  for (const p of c.additions) ensure(p).add += p.value;

  // 에너지 회복 효율은 가산이 없어도 100% 로 보여 준다
  if (!rows.has("sp_rate")) {
    rows.set("sp_rate", {
      field: "sp_rate",
      name: getDict(lang).f_sp_rate,
      icon: "icon/property/IconEnergyRecovery.png",
      percent: true,
      base: 1,
      add: 0,
      total: 0,
    });
  }

  for (const row of rows.values()) row.total = row.base + row.add;

  return [...rows.values()].sort(
    (a, b) => fieldOrder(a.field) - fieldOrder(b.field),
  );
}

/** 인게임 표기: 퍼센트는 소수 1자리까지 버림, 정수 스탯도 버림 (HoYoLAB 과 같은 규칙) */
export function formatStat(value: number, percent: boolean): string {
  if (percent) return `${(Math.floor(value * 1000 + 1e-6) / 10).toFixed(1)}%`;
  return Math.floor(value + 1e-6).toLocaleString("ko-KR");
}

/** 가산치 표기 (0 이면 "-", 음수면 "-8" 처럼) */
export function formatAdd(value: number, percent: boolean): string {
  if (Math.abs(value) < 1e-9) return "-";
  const sign = value < 0 ? "-" : "+";
  return `${sign}${formatStat(Math.abs(value), percent)}`;
}

/** 승급 단계 → 최대 레벨 (0→20, 6→80). 승급 단계를 모르면(-1) null */
export function maxLevel(promotion: number): number | null {
  if (promotion < 0) return null;
  return 20 + promotion * 10;
}

/** "Lv.80/80" 또는 최대 레벨을 모르면 "Lv.80" */
export function levelText(level: number, promotion: number): string {
  const max = maxLevel(promotion);
  return max === null ? `Lv.${level}` : `Lv.${level}/${max}`;
}

export function stars(rarity: number): string {
  return "★".repeat(Math.max(0, Math.min(5, rarity)));
}
