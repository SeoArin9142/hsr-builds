import GameImage from "./GameImage";
import { getDict, type Lang } from "@/lib/i18n";
import type { StatTarget } from "@/lib/score";
import { buildStatRows, formatAdd, formatStat } from "@/lib/stats";
import type { Character } from "@/lib/types";

/**
 * 기초 / 가산 / 최종 스탯 표.
 * 이 캐릭터의 추천 스탯에는 S 등급 목표치와 차이를 같이 보여 준다.
 * 에너지 회복 효율·속성 피해 증가처럼 팀·장비에 따라 달라지는 값은 목표를 두지 않는다.
 */
export default function StatTable({
  c,
  lang,
  targets = [],
}: {
  c: Character;
  lang: Lang;
  targets?: StatTarget[];
}) {
  const d = getDict(lang);
  const rows = buildStatRows(c, lang);
  const byField = new Map(targets.map((t) => [t.field, t]));
  const hasTargets = targets.length > 0;

  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-muted">
        <tr className="border-b border-card-border">
          <th className="py-1.5 text-left font-medium">{d.stat_col}</th>
          <th className="py-1.5 text-right font-medium">{d.stat_base}</th>
          <th className="py-1.5 text-right font-medium">{d.stat_add}</th>
          <th className="py-1.5 text-right font-medium text-foreground">{d.stat_final}</th>
          {hasTargets && (
            <>
              <th className="hidden py-1.5 text-right font-medium sm:table-cell">{d.stat_target}</th>
              <th className="py-1.5 text-right font-medium">{d.stat_diff}</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const t = byField.get(r.field);
          const diff = t ? r.total - t.good : 0;
          const met = diff >= 0;
          return (
            <tr key={r.field} className="border-b border-card-border/50 last:border-0">
              <td className="py-1.5">
                <span className="inline-flex items-center gap-2">
                  <GameImage path={r.icon} alt="" width={18} height={18} className="opacity-90" />
                  {r.name}
                </span>
              </td>
              <td className="py-1.5 text-right tabular-nums text-muted">{formatStat(r.base, r.percent)}</td>
              <td className="py-1.5 text-right tabular-nums text-sky-300">{formatAdd(r.add, r.percent)}</td>
              <td className="py-1.5 text-right font-semibold tabular-nums">{formatStat(r.total, r.percent)}</td>
              {hasTargets && (
                <>
                  <td className="hidden py-1.5 text-right tabular-nums text-muted sm:table-cell">
                    {t ? formatStat(t.good, t.percent) : ""}
                  </td>
                  <td
                    className={`py-1.5 text-right tabular-nums ${
                      !t ? "" : met ? "text-emerald-300" : "text-amber-300"
                    }`}
                  >
                    {t ? `${met ? "+" : "-"}${formatStat(Math.abs(diff), t.percent)}` : ""}
                  </td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
