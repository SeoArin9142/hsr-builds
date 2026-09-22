import Link from "next/link";
import Collapsible from "./Collapsible";
import GameImage from "./GameImage";
import { SectionTitle } from "./Badges";
import type { Change, History } from "@/lib/history";
import { fmt, getDict, LANGS, type Lang } from "@/lib/i18n";

/** 기준점 이후 달라진 점 — 레벨·성혼·광추·빌드 점수 */

function phrases(c: Change, d: ReturnType<typeof getDict>): string[] {
  const out: string[] = [];
  if (c.isNew) out.push(d.hist_new);
  if (c.level) out.push(fmt(d.hist_level, { a: c.level[0], b: c.level[1] }));
  if (c.eidolon) out.push(fmt(d.hist_eidolon, { a: c.eidolon[0], b: c.eidolon[1] }));
  if (c.lightCone) out.push(fmt(d.hist_lc, { name: c.lightCone }));
  if (c.lcRank) out.push(fmt(d.hist_lc_rank, { a: c.lcRank[0], b: c.lcRank[1] }));
  if (c.score) out.push(fmt(d.hist_score, { a: c.score[0], b: c.score[1] }));
  return out;
}

export default function HistorySection({
  uid,
  history,
  lang,
}: {
  uid: string;
  history: History;
  lang: Lang;
}) {
  const d = getDict(lang);
  if (history.changes.length === 0) return null;
  const since = history.baseAt
    ? new Date(history.baseAt).toLocaleDateString(LANGS[lang].locale, {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
      })
    : "";

  return (
    <section>
      <SectionTitle right={since ? fmt(d.hist_since, { date: since }) : undefined}>
        {d.hist_title}
      </SectionTitle>
      <Collapsible storageKey="history" collapsedHeight={220}>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {history.changes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/u/${uid}/c/${c.id}`}
                className="flex items-center gap-2.5 rounded-lg border border-card-border bg-card p-2 transition hover:border-accent/70"
              >
                <span className="block size-9 shrink-0 overflow-hidden rounded-full bg-background/40">
                  <GameImage path={c.icon} alt="" width={36} height={36} className="size-full object-cover" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-muted">{phrases(c, d).join(" · ")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Collapsible>
    </section>
  );
}
