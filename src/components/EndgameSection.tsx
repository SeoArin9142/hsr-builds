import Link from "next/link";
import Collapsible from "./Collapsible";
import GameImage from "./GameImage";
import { SectionTitle } from "./Badges";
import type { EndgameMode, EndgameRecord } from "@/lib/endgame";
import { fmt, getDict, LANGS, type Lang } from "@/lib/i18n";

/** 엔드 콘텐츠 기록 — 실제로 클리어한 편성·사이클·점수 */

function modeLabel(d: ReturnType<typeof getDict>, mode: EndgameMode): string {
  return mode === "moc" ? d.eg_moc : mode === "pf" ? d.eg_pf : d.eg_as;
}

function Team({ uid, node, lang }: { uid: string; node: EndgameRecord["floors"][number]["nodes"][number]; lang: Lang }) {
  const d = getDict(lang);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {node.avatars.map((a) => (
        <Link
          key={a.id}
          href={`/u/${uid}/c/${a.id}`}
          className="group relative"
          title={`${a.name} · ${fmt(d.card_eidolon, { n: a.eidolon })} · Lv.${a.level}`}
        >
          <span
            className="block size-11 overflow-hidden rounded-full border-2 bg-background/40 transition group-hover:brightness-110"
            style={{ borderColor: a.element.color }}
          >
            <GameImage path={a.icon} alt={a.name} width={44} height={44} className="size-full object-cover" />
          </span>
          {a.eidolon > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background/90 px-1 text-[10px] font-semibold text-gold">
              {a.eidolon}
            </span>
          )}
        </Link>
      ))}
      {node.score && <span className="ml-1 text-xs font-semibold text-gold">{fmt(d.eg_score, { n: node.score })}</span>}
      {node.bossDefeated && <span className="text-xs text-emerald-300">✓</span>}
    </div>
  );
}

function Record({ uid, rec, lang }: { uid: string; rec: EndgameRecord; lang: Lang }) {
  const d = getDict(lang);
  return (
    <section className="rounded-xl border border-card-border bg-card p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">
          {modeLabel(d, rec.mode)}
          {rec.season && <span className="ml-2 text-xs font-normal text-muted">{rec.season}</span>}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="font-semibold text-gold">{fmt(d.eg_stars, { n: rec.stars })}</span>
          <span>{fmt(d.eg_battles, { n: rec.battles })}</span>
          {rec.maxFloor && <span>{fmt(d.eg_max_floor, { name: rec.maxFloor })}</span>}
        </div>
      </header>

      <ul className="space-y-2">
        {rec.floors.map((f, i) => (
          <li key={`${f.name}-${i}`} className="rounded-lg border border-card-border/70 bg-background/30 p-2.5">
            <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-medium text-foreground">{f.name}</span>
              <span className="text-gold">{"★".repeat(Math.min(3, f.stars))}</span>
              {typeof f.cycles === "number" && rec.mode !== "as" && (
                <span className="text-muted">{fmt(d.eg_cycles, { n: f.cycles })}</span>
              )}
              {f.time && (
                <span className="ml-auto text-muted/70">
                  {new Date(f.time).toLocaleDateString(LANGS[lang].locale, { month: "numeric", day: "numeric" })}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
              {f.nodes.map((n, k) => (
                <Team key={k} uid={uid} node={n} lang={lang} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function EndgameSection({
  uid,
  records,
  fetchedAt,
  lang,
}: {
  uid: string;
  records: EndgameRecord[];
  fetchedAt?: number;
  lang: Lang;
}) {
  const d = getDict(lang);
  if (records.length === 0) return null;
  const time = fetchedAt
    ? new Date(fetchedAt).toLocaleString(LANGS[lang].locale, {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : null;
  return (
    <section>
      <SectionTitle right={time ? fmt(d.eg_asof, { time }) : undefined}>{d.eg_title}</SectionTitle>
      <Collapsible storageKey="endgame" collapsedHeight={420}>
        <div className="grid gap-4 lg:grid-cols-3">
          {records.map((rec) => (
            <Record key={rec.mode} uid={uid} rec={rec} lang={lang} />
          ))}
        </div>
      </Collapsible>
    </section>
  );
}
