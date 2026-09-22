import GameImage from "./GameImage";
import { PathBadge, RarityStars } from "./Badges";
import { fmt, getDict, type Lang } from "@/lib/i18n";
import { levelText } from "@/lib/stats";
import type { LightCone } from "@/lib/types";

export default function LightConeCard({ lc, lang }: { lc: LightCone | null; lang: Lang }) {
  const d = getDict(lang);
  if (!lc) {
    return (
      <div className="rounded-lg border border-dashed border-card-border p-4 text-sm text-muted">
        {d.lc_none}
      </div>
    );
  }
  return (
    <div className="flex gap-4 rounded-lg border border-card-border bg-background/40 p-3">
      <div className="relative h-32 w-[6.8rem] shrink-0 overflow-hidden rounded-md bg-card">
        <GameImage path={lc.preview} alt={lc.name} fill sizes="110px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold">{lc.name}</span>
          <RarityStars rarity={lc.rarity} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted">
          <span>{levelText(lc.level, lc.promotion)}</span>
          <span className="rounded bg-accent/15 px-1.5 py-0.5 font-semibold text-gold">
            {fmt(d.lc_superimpose, { n: lc.rank })}
          </span>
          <PathBadge {...lc.path} size={14} />
        </div>
        <ul className="mt-2 space-y-0.5 text-xs">
          {lc.attributes.map((a) => (
            <li key={a.field} className="flex justify-between">
              <span className="text-muted">{a.name}</span>
              <span className="tabular-nums">{a.display}</span>
            </li>
          ))}
          {lc.properties.map((p) => (
            <li key={p.type ?? p.field} className="flex justify-between">
              <span className="text-sky-300">{p.name}</span>
              <span className="tabular-nums text-sky-300">+{p.display}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
