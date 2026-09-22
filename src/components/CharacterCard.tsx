import Link from "next/link";
import GameImage from "./GameImage";
import { ElementBadge, PathBadge, RarityStars } from "./Badges";
import type { CardModel } from "@/lib/cards";

/** 캐릭터 목록용 카드 */
export default function CharacterCard({ uid, c }: { uid: string; c: CardModel }) {
  return (
    <Link
      href={`/u/${uid}/c/${c.id}`}
      className="group overflow-hidden rounded-xl border border-card-border bg-card transition hover:border-accent/70"
    >
      <div className="relative aspect-[376/512] w-full overflow-hidden bg-background/40">
        <GameImage
          path={c.preview}
          alt={c.name}
          fill
          sizes="(min-width: 1024px) 200px, 45vw"
          className="object-cover transition group-hover:scale-[1.03]"
        />
        <div className="absolute left-2 top-2 flex gap-1">
          <span className="rounded bg-background/70 px-1.5 py-0.5 text-xs font-semibold backdrop-blur">
            {c.eidolon}성혼
          </span>
          {c.showcased && (
            <span className="rounded bg-accent/80 px-1.5 py-0.5 text-[11px] font-semibold text-background backdrop-blur">
              전시
            </span>
          )}
        </div>
        <div className="absolute right-2 top-2 rounded-full bg-background/70 p-1 backdrop-blur">
          <ElementBadge {...c.element} size={16} showName={false} />
        </div>
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold">{c.name}</span>
          <RarityStars rarity={c.rarity} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Lv.{c.level}
            {c.maxLevel !== null && `/${c.maxLevel}`}
          </span>
          <PathBadge {...c.path} size={14} />
        </div>
        <div className="truncate text-xs text-foreground/80">
          {c.lightCone ? (
            <>
              {c.lightCone.name}
              <span className="ml-1 text-muted">S{c.lightCone.rank}</span>
            </>
          ) : (
            <span className="text-muted">광추 없음</span>
          )}
        </div>
        <div className="truncate text-[11px] text-muted">
          {c.sets.length > 0 ? c.sets.join(" · ") : "유물 없음"}
        </div>
      </div>
    </Link>
  );
}
