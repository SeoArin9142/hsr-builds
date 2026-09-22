import GameImage from "./GameImage";
import type { Character, SkillTree } from "@/lib/types";

const SKILL_ANCHORS: Record<string, string> = {
  Point01: "Normal",
  Point02: "BPSkill",
  Point03: "Ultra",
  Point04: "Talent",
  Point05: "Maze",
};

/**
 * 행적 트리 노드 분류
 *  Point01~05 : 일반 공격·전투 스킬·필살기·특성·비술 (레벨 있음)
 *  Point06~08 : 추가 능력 3개
 *  Point09~18 : 스탯 노드 10개
 */
export function splitSkillTree(trees: SkillTree[]) {
  const byAnchor = new Map(trees.map((t) => [t.anchor, t]));
  const majors = trees.filter((t) => ["Point06", "Point07", "Point08"].includes(t.anchor));
  const statNodes = trees.filter((t) => {
    const n = Number(t.anchor.replace("Point", ""));
    return n >= 9;
  });
  return { byAnchor, majors, statNodes };
}

/** 행적(스킬 레벨·추가 능력·스탯 노드)과 성혼 */
export default function SkillList({ c }: { c: Character }) {
  const { byAnchor, majors, statNodes } = splitSkillTree(c.skill_trees);
  const skills = Object.entries(SKILL_ANCHORS)
    .map(([anchor, type]) => {
      const s = c.skills.find((k) => k.type === type);
      const t = byAnchor.get(anchor);
      return s && t ? { s, t } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const statLearned = statNodes.filter((t) => t.level > 0).length;

  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {skills.map(({ s, t }) => {
          const maxed = t.max_level > 0 && t.level >= t.max_level;
          return (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-lg border border-card-border bg-background/40 p-2"
            >
              <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-card">
                <GameImage path={s.icon} alt="" fill sizes="40px" className="object-contain p-1" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-muted">{s.type_text}</div>
                <div className="truncate text-sm font-medium">{s.name}</div>
                <div className="text-xs tabular-nums">
                  <span className={maxed ? "text-gold" : ""}>Lv.{t.level}</span>
                  {t.max_level > 0 && <span className="text-muted">/{t.max_level}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted">추가 능력</span>
          <div className="flex gap-1.5">
            {majors.map((t) => (
              <div
                key={t.id}
                className={`relative size-9 overflow-hidden rounded-full border ${
                  t.level > 0
                    ? "border-gold bg-accent/15"
                    : "border-card-border bg-background/40 opacity-40"
                }`}
                title={t.level > 0 ? "습득" : "미습득"}
              >
                <GameImage path={t.icon} alt="" fill sizes="36px" className="object-contain p-1" />
              </div>
            ))}
          </div>
          <span className="text-xs text-muted">
            스탯 노드 {statLearned}/{statNodes.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted">성혼</span>
          <div className="flex gap-1.5">
            {c.rank_icons.map((icon, i) => {
              const active = i < c.rank;
              return (
                <div
                  key={icon}
                  className={`relative size-9 overflow-hidden rounded-full border ${
                    active ? "border-gold bg-accent/15" : "border-card-border bg-background/40 opacity-40"
                  }`}
                  title={`${i + 1}성혼`}
                >
                  <GameImage path={icon} alt={`${i + 1}성혼`} fill sizes="36px" className="object-contain p-1" />
                </div>
              );
            })}
          </div>
          <span className="font-semibold">{c.rank}성혼</span>
        </div>
      </div>
    </div>
  );
}
