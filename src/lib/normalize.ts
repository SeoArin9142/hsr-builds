import type { EndgameRecord } from "./endgame";
import { getDict, tr, type Lang } from "./i18n";
import type { RecoMap } from "./reco";
import { scoreCharacter, speedInfo, type CharScore } from "./score";
import type { PartyFile } from "./parties";
import type { Roster } from "./roster";
import { buildStatRows, formatAdd, formatStat, maxLevel } from "./stats";
import type { Character } from "./types";

/**
 * 사람·AI 가 그대로 읽기 쉬운 형태로 정리한 캐릭터 데이터.
 * /api/u/[uid] (JSON) 과 /api/u/[uid]/md (마크다운) 이 이 구조를 쓴다.
 */

/** 유물 부위 이름 (언어별) */
export function slotName(lang: Lang, type: number): string {
  const d = getDict(lang);
  const names = [d.slot_1, d.slot_2, d.slot_3, d.slot_4, d.slot_5, d.slot_6];
  return names[type - 1] ?? tr(lang, "slot_other", { n: type });
}

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
  review?: {
    build_score: number; // 실제 수치가 목표에 닿은 정도 0~100 (등급 기준)
    targets: { name: string; value: string; target: string }[];
    relic_score: number; // 유물 부옵 효율 0~100
    grade: string;
    effective_rolls: number;
    useful_stats: string[]; // 유효로 친 스탯 이름
    main_off: number; // 메인옵이 어긋난 부위 수
    speed_tier?: number; // 도달한 속도 구간
    speed_to_next?: number; // 다음 구간까지 필요한 속도
  };
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
  endgame: NormEndgame[]; // 실제 클리어 기록 (없으면 빈 배열)
  characters: NormCharacter[];
}

export interface NormEndgame {
  mode: string; // moc | pf | as
  mode_name: string;
  season: string;
  stars: number;
  max_floor: string;
  floors: {
    name: string;
    stars: number;
    cycles?: number;
    teams: { members: string[]; score?: string; boss_defeated?: boolean }[];
  }[];
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

export function normalizeCharacter(c: Character, lang: Lang = "ko", score?: CharScore): NormCharacter {
  const statRows = buildStatRows(c, lang);
  const stats = statRows.map((r) => ({
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
      slot: slotName(lang, r.type),
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
    ...(score && c.relics.length > 0
      ? {
          review: (() => {
            const spd = statRows.find((r) => r.field === "spd")?.total ?? 0;
            const sp = speedInfo(spd);
            const dict = getDict(lang) as unknown as Record<string, string>;
            const nameOf = (f: string) => statRows.find((r) => r.field === f)?.name ?? dict[`f_${f}`] ?? f;
            const fmtVal = (v: number, p: boolean) => formatStat(v, p);
            return {
              build_score: Math.round(score.build),
              targets: score.targets.map((t) => ({
                name: t.name,
                value: fmtVal(t.value, t.percent),
                target: fmtVal(t.good, t.percent),
              })),
              relic_score: Math.round(score.total),
              grade: score.grade,
              effective_rolls: Number(score.rolls.toFixed(1)),
              useful_stats: score.useful.map(nameOf),
              main_off: score.mainBad,
              ...(sp.reached !== null ? { speed_tier: sp.reached } : {}),
              ...(sp.gap !== null ? { speed_to_next: sp.gap } : {}),
            };
          })(),
        }
      : {}),
  };
}

function normalizeEndgame(records: EndgameRecord[], lang: Lang): NormEndgame[] {
  const d = getDict(lang);
  return records.map((rec) => ({
    mode: rec.mode,
    mode_name: rec.mode === "moc" ? d.eg_moc : rec.mode === "pf" ? d.eg_pf : d.eg_as,
    season: rec.season,
    stars: rec.stars,
    max_floor: rec.maxFloor,
    floors: rec.floors.map((f) => ({
      name: f.name,
      stars: f.stars,
      ...(typeof f.cycles === "number" ? { cycles: f.cycles } : {}),
      teams: f.nodes.map((n) => ({
        members: n.avatars.map((a) => `${a.name}(E${a.eidolon})`),
        ...(n.score ? { score: n.score } : {}),
        ...(typeof n.bossDefeated === "boolean" ? { boss_defeated: n.bossDefeated } : {}),
      })),
    })),
  }));
}

export function normalizeRoster(
  r: Roster,
  parties?: PartyFile | null,
  lang: Lang = "ko",
  endgame: EndgameRecord[] = [],
  reco: RecoMap = {},
): NormShowcase {
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
    endgame: normalizeEndgame(endgame, lang),
    characters: r.characters.map((c) =>
      normalizeCharacter(c, lang, scoreCharacter(c, reco[c.id], buildStatRows(c, lang))),
    ),
  };
}

/* ---------- 마크다운 (AI 에 붙여넣기용) ---------- */

function lv(level: number, max: number | null): string {
  return max === null ? `Lv.${level}` : `Lv.${level}/${max}`;
}

export function characterToMarkdown(n: NormCharacter, lang: Lang = "ko"): string {
  const t = (key: Parameters<typeof tr>[1], vars?: Record<string, string | number>) => tr(lang, key, vars);
  const lines: string[] = [];
  lines.push(
    "## " +
      t("md_char_head", {
        name: n.name,
        rarity: n.rarity,
        path: n.path,
        element: n.element,
        lv: lv(n.level, n.max_level),
        e: n.eidolon,
      }),
  );
  if (n.light_cone) {
    lines.push(
      "- " +
        t("md_lightcone", {
          name: n.light_cone.name,
          rarity: n.light_cone.rarity,
          lv: lv(n.light_cone.level, n.light_cone.max_level),
          s: n.light_cone.superimpose,
        }),
    );
  } else {
    lines.push("- " + t("md_lightcone_none"));
  }
  lines.push(
    "- " +
      t("md_traces", {
        b: n.traces.basic,
        s: n.traces.skill,
        u: n.traces.ultimate,
        t: n.traces.talent,
        ma: n.traces.majors_learned,
        sa: n.traces.stat_nodes_learned,
        sb: n.traces.stat_nodes_total,
      }),
  );
  if (n.review) {
    const bits = [
      `${t("sc_build_score")} ${n.review.build_score}/100 (${n.review.grade})`,
      n.review.targets.map((x) => `${x.name} ${x.value}/${x.target}`).join(", "),
      `${t("sc_relic_score")} ${n.review.relic_score}/100`,
      t("sc_rolls", { n: n.review.effective_rolls }),
      n.review.main_off > 0 ? t("sc_main_bad", { n: n.review.main_off }) : t("sc_main_good"),
      `${t("sc_useful")}: ${n.review.useful_stats.join(", ")}`,
    ];
    lines.push(`- ${t("sc_title")}: ${bits.join(" · ")}`);
  }
  lines.push("");
  lines.push("### " + t("md_stats_head"));
  lines.push(t("md_stats_cols"));
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
  const setLine = [...setMax].map(([name, pieces]) => t("md_pieces", { name, n: pieces })).join(", ");
  lines.push("### " + t("md_relics_head", { sets: setLine || t("md_relics_none_set") }));
  if (n.relics.length === 0) lines.push("- " + t("md_relics_none"));
  for (const r of n.relics) {
    const subs = r.subs.map((s) => t("md_sub", { name: s.name, value: s.display, rolls: s.rolls })).join(", ");
    lines.push(
      "- " +
        t("md_relic_line", {
          slot: r.slot,
          name: r.name,
          lv: r.level,
          rarity: r.rarity,
          set: r.set,
          main: `${r.main.name} ${r.main.display}`,
          subs,
        }),
    );
  }
  lines.push("");
  return lines.join("\n");
}

export function showcaseToMarkdown(
  n: NormShowcase,
  opts: { only?: string; showcaseOnly?: boolean } = {},
  lang: Lang = "ko",
): string {
  const t = (key: Parameters<typeof tr>[1], vars?: Record<string, string | number>) => tr(lang, key, vars);
  let chars = n.characters;
  if (opts.only) chars = chars.filter((c) => c.id === opts.only);
  else if (opts.showcaseOnly) chars = chars.filter((c) => c.source === "showcase");
  const source =
    n.sources.hoyolab.status === "ok"
      ? t("md_source_full", { n: n.sources.hoyolab.count, m: n.sources.showcase })
      : t("md_source_showcase", { m: n.sources.showcase });
  const head = [
    "# " + t("md_title", { nick: n.nickname, uid: n.uid, lv: n.level, wl: n.world_level }),
    t("md_meta", { time: n.fetched_at, source, n: chars.length }),
    t("md_user_note"),
    "",
  ];
  // 파티는 한 명만 뽑을 때(only)는 빼고, 그 외엔 캐릭터 앞에 둔다
  if (!opts.only && n.parties.length > 0) {
    head.push("## " + t("md_parties"));
    for (const p of n.parties) {
      const members = p.members.map((m) => m.name).join(", ") || t("md_party_empty");
      head.push(`- ${String(p.no).padStart(2, "0")} "${p.name}": ${members}${p.note ? ` — "${p.note}"` : ""}`);
    }
    head.push("");
  }
  if (!opts.only && n.endgame.length > 0) {
    head.push("## " + t("eg_title"));
    for (const rec of n.endgame) {
      head.push(
        `### ${rec.mode_name}${rec.season ? ` — ${rec.season}` : ""} (${t("eg_stars", { n: rec.stars })}${
          rec.max_floor ? `, ${t("eg_max_floor", { name: rec.max_floor })}` : ""
        })`,
      );
      for (const f of rec.floors) {
        const teams = f.teams
          .map((tm) => {
            const extra = [tm.score ? t("eg_score", { n: tm.score }) : null, tm.boss_defeated === false ? "✗" : null]
              .filter(Boolean)
              .join(" ");
            return `${tm.members.join(", ")}${extra ? ` [${extra}]` : ""}`;
          })
          .join(" / ");
        const meta = [
          t("eg_stars", { n: f.stars }),
          typeof f.cycles === "number" && rec.mode !== "as" ? t("eg_cycles", { n: f.cycles }) : null,
        ]
          .filter(Boolean)
          .join(", ");
        head.push(`- ${f.name} (${meta}): ${teams}`);
      }
      head.push("");
    }
  }
  return head.concat(chars.map((c) => characterToMarkdown(c, lang))).join("\n");
}
