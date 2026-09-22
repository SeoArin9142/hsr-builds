import { fmt, getDict, LANGS } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { redisCmd, redisConfigured } from "@/lib/redis";

/** 머리말의 방문자 수 — proxy.ts 가 세어 둔 값을 30초 캐시로 읽는다. Redis 없으면(로컬) 안 그린다. */

type Stats = { todayUv: number; totalUv: number; totalPv: number };
let cache: { at: number; value: Stats } | null = null;

function kstDay(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}

async function readStats(): Promise<Stats | null> {
  if (!redisConfigured()) return null;
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  try {
    const day = kstDay();
    const [todayUv, totalUv, totalPv] = await Promise.all([
      redisCmd<number>(["PFCOUNT", `stats:uv:${day}`]),
      redisCmd<number>(["PFCOUNT", "stats:uv:total"]),
      redisCmd<string | null>(["GET", "stats:pv:total"]),
    ]);
    const value = { todayUv: todayUv ?? 0, totalUv: totalUv ?? 0, totalPv: Number(totalPv ?? 0) };
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return cache?.value ?? null;
  }
}

export default async function VisitorStats() {
  const [stats, lang] = await Promise.all([readStats(), getLang()]);
  if (!stats) return null;
  const d = getDict(lang);
  const n = (v: number) => v.toLocaleString(LANGS[lang].locale);
  return (
    <div
      className="hidden items-center gap-3 whitespace-nowrap text-xs text-muted md:flex"
      title={fmt(d.stats_pv, { n: n(stats.totalPv) })}
    >
      <span>{fmt(d.stats_today, { n: n(stats.todayUv) })}</span>
      <span className="text-card-border">|</span>
      <span>{fmt(d.stats_total, { n: n(stats.totalUv) })}</span>
    </div>
  );
}
