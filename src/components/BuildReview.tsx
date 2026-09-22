import GameImage from "./GameImage";
import { fmt, getDict, type Lang } from "@/lib/i18n";
import { critRatio, speedInfo, type CharScore } from "@/lib/score";
import { buildStatRows, formatStat } from "@/lib/stats";
import type { Character } from "@/lib/types";

/** 캐릭터 상세의 "빌드 평가" — 유물 점수·속도 구간·치확 비율 */
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
  const gradeColor =
    score.grade === "S" ? "text-gold" : score.grade === "A" ? "text-emerald-300" : score.grade === "B" ? "text-sky-300" : "text-muted";
  const dict = d as unknown as Record<string, string>;
  const useful = score.useful.map((f) => ({
    field: f,
    name: by(f)?.name ?? dict[`f_${f}`] ?? f,
    icon: by(f)?.icon ?? "",
  }));

  return (
    <div className="rounded-lg border border-card-border bg-background/40 p-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-sm font-semibold">{d.sc_title}</span>
        <span className={`text-lg font-bold ${gradeColor}`}>{fmt(d.sc_grade, { grade: score.grade })}</span>
        <span className="text-sm text-muted">
          {d.sc_relic_score} <b className="text-foreground">{Math.round(score.total)}</b>
          <span className="text-muted">/100</span>
        </span>
        <span className="text-xs text-muted">{fmt(d.sc_rolls, { n: score.rolls.toFixed(1) })}</span>
      </div>

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

        {/* 치명타가 이 캐릭터에 의미 있을 때만 (추천 부옵에 들어 있을 때) */}
        {score.useful.includes("crit_rate") && (
          <div className="flex flex-wrap items-center gap-x-2">
            <dt className="text-muted">{d.sc_crit}</dt>
            <dd className="tabular-nums">
              <b>
                {formatStat(cr, true)} : {formatStat(cd, true)}
              </b>
              {crit.ratio !== null && <span className="ml-1 text-muted">(1:{crit.ratio.toFixed(1)})</span>}
              <span
                className={`ml-2 ${crit.hint === "ok" ? "text-emerald-300" : "text-amber-300"}`}
              >
                {crit.hint === "ok" ? d.sc_crit_ok : crit.hint === "low" ? d.sc_crit_low : d.sc_crit_high}
              </span>
            </dd>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-2">
          <dt className="text-muted">{d.sc_useful}</dt>
          <dd className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {useful.map((r) => (
              <span key={r.field} className="inline-flex items-center gap-1">
                {r.icon && <GameImage path={r.icon} alt="" width={13} height={13} className="opacity-80" />}
                {r.name}
              </span>
            ))}
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
