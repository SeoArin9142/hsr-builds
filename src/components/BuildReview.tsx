import GameImage from "./GameImage";
import { fmt, getDict, type Lang } from "@/lib/i18n";
import { critRatio, GRADE_BANDS, nextGrade, speedInfo, type CharScore } from "@/lib/score";
import { buildStatRows, formatStat } from "@/lib/stats";
import type { Character } from "@/lib/types";

/** 캐릭터 상세의 "빌드 평가" — 실제 수치가 목표에 닿았는지 + 유물 효율·속도 구간·치확 비율 */
export default function BuildReview({
  c,
  score,
  lang,
}: {
  c: Character;
  score: CharScore;
  lang: Lang;
}) {
  const d = getDict(lang);
  const rows = buildStatRows(c, lang);
  const by = (f: string) => rows.find((r) => r.field === f);
  const spd = by("spd")?.total ?? 0;
  const cr = by("crit_rate")?.total ?? 0;
  const cd = by("crit_dmg")?.total ?? 0;
  const sp = speedInfo(spd);
  const crit = critRatio(cr, cd);
  const main = score.targets.length > 0 ? score.build : score.total;
  const gradeColor =
    score.grade === "S" ? "text-gold" : score.grade === "A" ? "text-emerald-300" : score.grade === "B" ? "text-sky-300" : "text-muted";
  const next = nextGrade(main);

  return (
    <div className="rounded-lg border border-card-border bg-background/40 p-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-sm font-semibold">{d.sc_title}</span>
        <span className={`text-lg font-bold ${gradeColor}`}>{fmt(d.sc_grade, { grade: score.grade })}</span>
        <span className="text-sm text-muted">
          {d.sc_build_score} <b className="text-foreground">{Math.round(main)}</b>
          <span className="text-muted">/100</span>
        </span>
        {next && <span className="text-xs text-muted">{fmt(d.sc_to_next, { grade: next.grade, n: next.need })}</span>}
      </div>

      {/* 등급 기준을 같이 보여 준다 — 지금 등급은 강조 */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
        <span>{d.sc_scale}</span>
        {GRADE_BANDS.filter((b) => b.min > 0).map((b) => (
          <span
            key={b.grade}
            className={`rounded px-1.5 py-0.5 tabular-nums ${
              b.grade === score.grade ? "bg-accent/20 font-semibold text-foreground" : "bg-background/50"
            }`}
          >
            {b.grade} {b.min}+
          </span>
        ))}
      </div>

      {/* 목표 대비 달성률 — 자세한 수치는 위 스탯 표에 */}
      {score.targets.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-muted">{d.sc_targets}</span>
          {score.targets.map((t) => {
            const row = by(t.field);
            const done = t.ratio >= 1;
            return (
              <span key={t.field} className="inline-flex items-center gap-1">
                {row?.icon && <GameImage path={row.icon} alt="" width={13} height={13} className="opacity-80" />}
                <span className="text-muted">{t.name}</span>
                <span className={done ? "text-emerald-300" : "text-amber-300"}>
                  {done ? "✓" : `${Math.round(t.ratio * 100)}%`}
                </span>
              </span>
            );
          })}
        </div>
      )}

      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex flex-wrap items-center gap-x-2">
          <dt className="text-muted">{d.sc_speed}</dt>
          <dd className="tabular-nums">
            <b>{formatStat(spd, false)}</b>
            {sp.reached !== null ? (
              <span className="ml-1 text-emerald-300">{fmt(d.sc_speed_reached, { n: sp.reached })}</span>
            ) : (
              <span className="ml-1 text-muted">{d.sc_speed_none}</span>
            )}
            {sp.next !== null && (
              <span className="ml-2 text-muted">{fmt(d.sc_speed_next, { n: sp.next, gap: sp.gap ?? 0 })}</span>
            )}
          </dd>
        </div>

        {/* 치명타가 이 캐릭터에 의미 있을 때만 */}
        {score.targets.some((t) => t.field === "crit_rate") && (
          <div className="flex flex-wrap items-center gap-x-2">
            <dt className="text-muted">{d.sc_crit}</dt>
            <dd className="tabular-nums">
              <b>
                {formatStat(cr, true)} : {formatStat(cd, true)}
              </b>
              {crit.ratio !== null && <span className="ml-1 text-muted">(1:{crit.ratio.toFixed(1)})</span>}
              <span className={`ml-2 ${crit.hint === "ok" ? "text-emerald-300" : "text-amber-300"}`}>
                {crit.hint === "ok" ? d.sc_crit_ok : crit.hint === "low" ? d.sc_crit_low : d.sc_crit_high}
              </span>
            </dd>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-2">
          <dt className="text-muted">{d.sc_relic_score}</dt>
          <dd className="tabular-nums">
            <b>{Math.round(score.total)}</b>
            <span className="text-muted">/100</span>
            <span className="ml-2 text-muted">{fmt(d.sc_rolls, { n: score.rolls.toFixed(1) })}</span>
          </dd>
        </div>

        <div className={score.mainBad > 0 ? "text-amber-300" : "text-emerald-300"}>
          {score.mainBad > 0 ? fmt(d.sc_main_bad, { n: score.mainBad }) : d.sc_main_good}
        </div>
      </dl>

      <p className="mt-2 text-[11px] text-muted/80">{d.sc_note}</p>
    </div>
  );
}
