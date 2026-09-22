import type { PartyFile } from "./parties";
import type { Roster } from "./roster";
import { buildStatRows, formatAdd, formatStat, maxLevel } from "./stats";
import type { Character } from "./types";

/**
 * 사람·AI 가 그대로 읽기 쉬운 형태로 정리한 캐릭터 데이터.
 * /api/u/[uid] (JSON) 과 /api/u/[uid]/md (마크다운) 이 이 구조를 쓴다.
 */

const SLOT_NAME: Record<number, string> = {
  1: "머리",
  2: "손",
  3: "몸통",
  4: "발",
  5: "차원 구체",
  6: "연결 밧줄",
};

export interface NormStat {
  field: string;
  name: string;
  base: number;
  add: number;
  total: number;
  percent: boolean;
  display: string; // 최종값 표시 문자열
}

export interface NormRelic {
  slot: string;
  name: string;
  set: string;
  rarity: number;
  level: number;
  main: { name: string; value: number; display: string };
  subs: { name: string; value: number; display: string; rolls: number }[];
}

export interface NormCharacter {
  id: string;
  name: string;
  source: "showcase" | "hoyolab";
  rarity: number;
  level: number;
  max_level: number | null; // 승급 단계를 모르면 null
  eidolon: number;
  path: string;
  element: string;
  light_cone: {
    id: string;
    name: string;
    rarity: number;
    level: number;
    max_level: number | null;
    superimpose: number;
  } | null;
  traces: {
    basic: number;
    skill: number;
    ultimate: number;
    talent: number;
    majors_learned: number;
    stat_nodes_learned: number;
    stat_nodes_total: number;
  };
  stats: NormStat[];
  relic_sets: { name: string; pieces: number; effect: string }[];
  relics: NormRelic[];
}

export interface NormShowcase {
  uid: string;
  nickname: string;
  level: number;
  world_level: number;
  is_display: boolean;
  fetched_at: string;
  sources: {
    showcase: number; // 전시 캐릭터 수
    hoyolab: {
      status: string;
      message?: string;
      count: number;
      fetched_at?: string; // HoYoLAB 데이터 기준 시각 (24시간 캐시)
      via_viewer?: boolean; // 방문자가 연결한 계정으로 조회했는지
    };
  };
  parties: NormParty[]; // 계정 주인이 편집기로 만든 파티 (없으면 빈 배열)
  characters: NormCharacter[];
}

export interface NormParty {
  no: number;
  name: string;
  note?: string;
  members: { id: string; name: string }[];
}

function skillLevel(c: Character, anchor: string): number {
  return c.skill_trees.find((t) => t.anchor === anchor)?.level ?? 0;
}

export function normalizeCharacter(c: Character): NormCharacter {
  const stats = buildStatRows(c).map((r) => ({
    field: r.field,
    name: r.name,
    base: r.base,
    add: r.add,
    total: r.total,
    percent: r.percent,
    display: formatStat(r.total, r.percent),
  }));

  const majors = c.skill_trees.filter((t) =>
    ["Point06", "Point07", "Point08"].includes(t.anchor),
  );
  const statNodes = c.skill_trees.filter(
    (t) => Number(t.anchor.replace("Point", "")) >= 9,
  );

  const relics = [...c.relics]
    .sort((a, b) => a.type - b.type)
    .map<NormRelic>((r) => ({
      slot: SLOT_NAME[r.type] ?? `부위 ${r.type}`,
      name: r.name,
      set: r.set_name,
      rarity: r.rarity,
      level: r.level,
      main: { name: r.main_affix.name, value: r.main_affix.value, display: r.main_affix.display },
      subs: r.sub_affix.map((s) => ({
        name: s.name,
        value: s.value,
        display: s.display,
        rolls: s.count,
      })),
    }));

  // 2셋·4셋 항목을 그대로 둔다 (같은 세트가 두 번 나오면 4셋 활성)
  const relic_sets = c.relic_sets.map((s) => ({ name: s.name, pieces: s.num, effect: s.desc }));

  return {
    id: c.id,
    name: c.name,
    source: c.source ?? "showcase",
    rarity: c.rarity,
    level: c.level,
    max_level: maxLevel(c.promotion),
    eidolon: c.rank,
    path: c.path.name,
    element: c.element.name,
    light_cone: c.light_cone
      ? {
          id: c.light_cone.id,
          name: c.light_cone.name,
          rarity: c.light_cone.rarity,
          level: c.light_cone.level,
          max_level: maxLevel(c.light_cone.promotion),
          superimpose: c.light_cone.rank,
        }
      : null,
    traces: {
      basic: skillLevel(c, "Point01"),
      skill: skillLevel(c, "Point02"),
      ultimate: skillLevel(c, "Point03"),
      talent: skillLevel(c, "Point04"),
      majors_learned: majors.filter((t) => t.level > 0).length,
      stat_nodes_learned: statNodes.filter((t) => t.level > 0).length,
      stat_nodes_total: statNodes.length,
    },
    stats,
    relic_sets,
    relics,
  };
}

export function normalizeRoster(r: Roster, parties?: PartyFile | null): NormShowcase {
  const byId = new Map(r.characters.map((c) => [c.id, c]));
  const nameOf = (id: string) => byId.get(id)?.name ?? r.index.characters[id]?.name ?? `#${id}`;
  return {
    uid: r.player.uid,
    nickname: r.player.nickname,
    level: r.player.level,
    world_level: r.player.world_level,
    is_display: r.player.is_display,
    fetched_at: new Date().toISOString(),
    sources: {
      showcase: r.showcaseIds.length,
      hoyolab: {
        status: r.hoyolab.status,
        message: r.hoyolab.message,
        count: r.hoyolab.count,
        fetched_at: r.hoyolab.fetchedAt ? new Date(r.hoyolab.fetchedAt).toISOString() : undefined,
        via_viewer: r.hoyolab.viaViewer,
      },
    },
    parties: (parties?.parties ?? []).map((p) => ({
      no: p.no,
      name: p.name,
      ...(p.note ? { note: p.note } : {}),
      members: p.members.map((id) => ({ id, name: nameOf(id) })),
    })),
    characters: r.characters.map(normalizeCharacter),
  };
}

/* ---------- 마크다운 (AI 에 붙여넣기용) ---------- */

function lv(level: number, max: number | null): string {
  return max === null ? `Lv.${level}` : `Lv.${level}/${max}`;
}

export function characterToMarkdown(n: NormCharacter): string {
  const lines: string[] = [];
  lines.push(
    `## ${n.name} (${n.rarity}★ ${n.path}/${n.element}) — ${lv(n.level, n.max_level)}, ${n.eidolon}성혼`,
  );
  if (n.light_cone) {
    lines.push(
      `- 광추: ${n.light_cone.name} (${n.light_cone.rarity}★, ${lv(n.light_cone.level, n.light_cone.max_level)}, ${n.light_cone.superimpose}중첩)`,
    );
  } else {
    lines.push("- 광추: 없음");
  }
  lines.push(
    `- 행적: 일반 ${n.traces.basic} / 스킬 ${n.traces.skill} / 필살기 ${n.traces.ultimate} / 특성 ${n.traces.talent}, 추가 능력 ${n.traces.majors_learned}/3, 스탯 노드 ${n.traces.stat_nodes_learned}/${n.traces.stat_nodes_total}`,
  );
  lines.push("");
  lines.push("### 최종 스탯 (기초 + 장비·행적)");
  lines.push("| 스탯 | 기초 | 가산 | 최종 |");
  lines.push("|---|---:|---:|---:|");
  for (const s of n.stats) {
    lines.push(
      `| ${s.name} | ${formatStat(s.base, s.percent)} | ${formatAdd(s.add, s.percent)} | **${s.display}** |`,
    );
  }
  lines.push("");
  // 같은 세트는 가장 큰 셋 수만 (2셋+4셋 → 4셋)
  const setMax = new Map<string, number>();
  for (const s of n.relic_sets) setMax.set(s.name, Math.max(setMax.get(s.name) ?? 0, s.pieces));
  const setLine = [...setMax].map(([name, pieces]) => `${name} ${pieces}셋`).join(", ");
  lines.push(`### 유물 (세트: ${setLine || "없음"})`);
  if (n.relics.length === 0) lines.push("- 장착한 유물 없음");
  for (const r of n.relics) {
    const subs = r.subs.map((s) => `${s.name} ${s.display}(${s.rolls}회)`).join(", ");
    lines.push(
      `- [${r.slot}] ${r.name} +${r.level} (${r.rarity}★, ${r.set}) — 메인 ${r.main.name} ${r.main.display} / 부옵 ${subs}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

export function showcaseToMarkdown(
  n: NormShowcase,
  opts: { only?: string; showcaseOnly?: boolean } = {},
): string {
  let chars = n.characters;
  if (opts.only) chars = chars.filter((c) => c.id === opts.only);
  else if (opts.showcaseOnly) chars = chars.filter((c) => c.source === "showcase");
  const source =
    n.sources.hoyolab.status === "ok"
      ? `HoYoLAB 전적 ${n.sources.hoyolab.count}명 + 인게임 캐릭터 전시 ${n.sources.showcase}명`
      : `인게임 캐릭터 전시 ${n.sources.showcase}명 (Mihomo API)`;
  const head = [
    `# 붕괴: 스타레일 캐릭터 — ${n.nickname} (UID ${n.uid}, 개척 Lv.${n.level}, 균형 Lv.${n.world_level})`,
    `조회 시각: ${n.fetched_at} · 출처: ${source} · 캐릭터 ${chars.length}명 · 부옵 "(n회)" = 초기 1회 포함 강화 횟수`,
    "",
  ];
  // 파티는 한 명만 뽑을 때(only)는 빼고, 그 외엔 캐릭터 앞에 둔다
  if (!opts.only && n.parties.length > 0) {
    head.push("## 파티 편성 (계정 주인이 직접 기록)");
    for (const p of n.parties) {
      const members = p.members.map((m) => m.name).join(", ") || "(비어 있음)";
      head.push(`- ${String(p.no).padStart(2, "0")} ${p.name}: ${members}${p.note ? ` — ${p.note}` : ""}`);
    }
    head.push("");
  }
  return head.concat(chars.map(characterToMarkdown)).join("\n");
}
