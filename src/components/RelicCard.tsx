import GameImage from "./GameImage";
import { RarityStars } from "./Badges";
import { fmt, getDict, type Lang } from "@/lib/i18n";
import { slotName } from "@/lib/normalize";
import type { RelicScore } from "@/lib/score";
import type { Relic, RelicSet } from "@/lib/types";

export function sortRelics(relics: Relic[]): Relic[] {
  return [...relics].sort((a, b) => a.type - b.type);
}

export function RelicCard({ r, lang, score }: { r: Relic; lang: Lang; score?: RelicScore }) {
  const d = getDict(lang);
  const mainTitle =
    score?.mainVerdict === "good"
      ? d.sc_main_verdict_good
      : score?.mainVerdict === "maybe"
        ? d.sc_main_verdict_maybe
        : score?.mainVerdict === "bad"
          ? d.sc_main_verdict_bad
          : undefined;
  const mainMark =
    score?.mainVerdict === "good" ? "✓" : score?.mainVerdict === "maybe" ? "○" : score?.mainVerdict === "bad" ? "✗" : "";
  const mainColor =
    score?.mainVerdict === "good"
      ? "text-emerald-300"
      : score?.mainVerdict === "maybe"
        ? "text-muted"
        : "text-amber-300";
  return (
    <div className="flex gap-3 rounded-lg border border-card-border bg-background/40 p-3">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-card">
        <GameImage path={r.icon} alt={r.name} fill sizes="64px" className="object-contain" />
        <span className="absolute bottom-0 right-0 rounded-tl bg-background/80 px-1 text-[10px] font-semibold">
          +{r.level}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted">{slotName(lang, r.type)}</span>
          <span className="flex items-center gap-2">
            {score && (
              <span className="text-xs tabular-nums text-muted" title={fmt(d.sc_rolls, { n: score.rolls.toFixed(1) })}>
                {Math.round(score.score)}
              </span>
            )}
            <RarityStars rarity={r.rarity} />
          </span>
        </div>
        <div className="truncate text-sm font-semibold">{r.name}</div>
        <div className="mt-1 flex items-center justify-between border-b border-card-border/60 pb-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <GameImage path={r.main_affix.icon} alt="" width={16} height={16} />
            {r.main_affix.name}
            {mainMark && (
              <span className={`text-[11px] ${mainColor}`} title={mainTitle}>
                {mainMark}
              </span>
            )}
          </span>
          <span className="font-semibold tabular-nums text-gold">{r.main_affix.display}</span>
        </div>
        <ul className="mt-1 space-y-0.5 text-xs">
          {r.sub_affix.map((s) => {
            const useful = (score?.subs.find((x) => x.field === s.field)?.weight ?? 0) > 0;
            return (
            <li key={s.type ?? s.field} className={`flex items-center justify-between gap-2 ${useful ? "" : "opacity-45"}`}>
              <span className="inline-flex items-center gap-1.5 text-foreground/85">
                <GameImage path={s.icon} alt="" width={14} height={14} className="opacity-80" />
                {s.name}
                <span className="ml-1 inline-flex gap-0.5" title={fmt(d.relic_rolls, { n: s.count - 1 })}>
                  {Array.from({ length: Math.max(0, s.count - 1) }).map((_, i) => (
                    <i key={i} className="roll-dot" />
                  ))}
                </span>
              </span>
              <span className={`tabular-nums ${useful ? "text-gold" : ""}`}>{s.display}</span>
            </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** 2셋/4셋 효과 목록 — 같은 세트의 2셋·4셋을 묶어서 보여 준다 */
export function RelicSetList({ sets, lang }: { sets: RelicSet[]; lang: Lang }) {
  const d = getDict(lang);
  if (sets.length === 0) return <p className="text-sm text-muted">{d.relic_set_none}</p>;
  const grouped = new Map<string, RelicSet[]>();
  for (const s of sets) {
    const list = grouped.get(s.id) ?? [];
    list.push(s);
    grouped.set(s.id, list);
  }
  return (
    <ul className="space-y-2">
      {[...grouped.values()].map((list) => {
        const first = list[0];
        const max = Math.max(...list.map((s) => s.num));
        return (
          <li key={first.id} className="flex gap-3 rounded-lg border border-card-border bg-background/40 p-3">
            <GameImage path={first.icon} alt="" width={40} height={40} className="size-10 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">
                {first.name} <span className="text-gold">{fmt(d.relic_pieces, { n: max })}</span>
              </div>
              {list
                .sort((a, b) => a.num - b.num)
                .map((s) => (
                  <p key={s.num} className="mt-0.5 text-xs text-foreground/80">
                    <span className="mr-1 text-muted">{fmt(d.relic_pieces, { n: s.num })}</span>
                    {s.desc}
                  </p>
                ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
