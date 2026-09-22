import GameImage from "./GameImage";
import { getDict, type Lang } from "@/lib/i18n";
import { formatStat } from "@/lib/stats";
import type { Memosprite } from "@/lib/types";

/**
 * 기억 정령 — 기억의 운명 캐릭터가 소환하는 분신.
 * 전적(HoYoLAB)에만 있는 정보라 전시 데이터로 본 캐릭터에는 나오지 않는다.
 */
export default function MemospriteCard({ m, lang }: { m: Memosprite; lang: Lang }) {
  const d = getDict(lang);
  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex items-center gap-3 sm:w-48 sm:shrink-0 sm:flex-col sm:items-start">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-card-border bg-background/40">
            <GameImage path={m.icon} alt={m.name} fill sizes="64px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-muted">{d.memo_title}</div>
            <div className="truncate font-semibold">{m.name}</div>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          {m.stats.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold text-muted">{d.memo_stats}</h3>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                {m.stats.map((s) => (
                  <li key={s.field} className="flex items-center justify-between gap-2 border-b border-card-border/50 py-0.5">
                    <span className="flex min-w-0 items-center gap-1.5 text-muted">
                      {s.icon && <GameImage path={s.icon} alt="" width={14} height={14} className="size-3.5 shrink-0" />}
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{formatStat(s.value, s.percent)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {m.skills.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {m.skills.map((k) => {
                const maxed = k.max_level > 0 && k.level >= k.max_level;
                return (
                  <li
                    key={k.id}
                    className="flex gap-2 rounded-lg border border-card-border bg-background/40 p-2"
                    title={k.desc}
                  >
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-card">
                      <GameImage path={k.icon} alt="" fill sizes="40px" className="object-contain p-1" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted">{k.type_text}</div>
                      <div className="truncate text-sm font-medium">{k.name}</div>
                      <div className="text-xs tabular-nums">
                        <span className={maxed ? "text-gold" : ""}>Lv.{k.level}</span>
                        {k.max_level > 0 && <span className="text-muted">/{k.max_level}</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
