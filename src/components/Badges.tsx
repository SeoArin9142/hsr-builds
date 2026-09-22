import GameImage from "./GameImage";
import { stars } from "@/lib/stats";

/** 속성 아이콘 + 이름 (색은 API 가 주는 속성 색) */
export function ElementBadge({
  icon,
  name,
  color,
  size = 18,
  showName = true,
}: {
  icon: string;
  name: string;
  color: string;
  size?: number;
  showName?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color }}>
      <GameImage path={icon} alt={name} width={size} height={size} />
      {showName && <span className="font-medium">{name}</span>}
    </span>
  );
}

/** 운명의 길 아이콘 + 이름 */
export function PathBadge({
  icon,
  name,
  size = 18,
  showName = true,
}: {
  icon: string;
  name: string;
  size?: number;
  showName?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <GameImage path={icon} alt={name} width={size} height={size} className="opacity-80" />
      {showName && <span>{name}</span>}
    </span>
  );
}

export function RarityStars({ rarity, className = "" }: { rarity: number; className?: string }) {
  return (
    <span
      className={`text-xs tracking-tight ${rarity >= 5 ? "text-gold" : "text-purple"} ${className}`}
      aria-label={`${rarity}성`}
    >
      {stars(rarity)}
    </span>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-lg font-bold tracking-tight">
        <span className="mr-2 inline-block h-4 w-1 rounded bg-accent align-[-2px]" />
        {children}
      </h2>
      {right && <div className="text-xs text-muted">{right}</div>}
    </div>
  );
}
