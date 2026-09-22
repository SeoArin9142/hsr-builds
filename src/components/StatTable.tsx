import GameImage from "./GameImage";
import { buildStatRows, formatAdd, formatStat } from "@/lib/stats";
import type { Character } from "@/lib/types";

/** 기초 / 가산 / 최종 3열 스탯 표 */
export default function StatTable({ c }: { c: Character }) {
  const rows = buildStatRows(c);
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-muted">
        <tr className="border-b border-card-border">
          <th className="py-1.5 text-left font-medium">스탯</th>
          <th className="py-1.5 text-right font-medium">기초</th>
          <th className="py-1.5 text-right font-medium">장비·행적</th>
          <th className="py-1.5 text-right font-medium text-foreground">최종</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.field} className="border-b border-card-border/50 last:border-0">
            <td className="py-1.5">
              <span className="inline-flex items-center gap-2">
                <GameImage path={r.icon} alt="" width={18} height={18} className="opacity-90" />
                {r.name}
              </span>
            </td>
            <td className="py-1.5 text-right tabular-nums text-muted">
              {formatStat(r.base, r.percent)}
            </td>
            <td className="py-1.5 text-right tabular-nums text-sky-300">
              {formatAdd(r.add, r.percent)}
            </td>
            <td className="py-1.5 text-right font-semibold tabular-nums">
              {formatStat(r.total, r.percent)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
