import type { Metadata } from "next";
import Link from "next/link";
import { ElementBadge, PathBadge, RarityStars, SectionTitle } from "@/components/Badges";
import BuildReview from "@/components/BuildReview";
import CopyButton from "@/components/CopyButton";
import ErrorBox from "@/components/ErrorBox";
import GameImage from "@/components/GameImage";
import LightConeCard from "@/components/LightConeCard";
import { RelicCard, RelicSetList, sortRelics } from "@/components/RelicCard";
import SkillList from "@/components/SkillList";
import StatTable from "@/components/StatTable";
import { fmt, getDict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { getShowcase } from "@/lib/mihomo";
import { characterToMarkdown, normalizeCharacter } from "@/lib/normalize";
import { getReco } from "@/lib/reco";
import { getRoster } from "@/lib/roster";
import { scoreCharacter } from "@/lib/score";
import { charName, getGameIndex } from "@/lib/starrailres";
import { buildStatRows, levelText } from "@/lib/stats";
import { getViewerCookie } from "@/lib/viewer";

type Props = { params: Promise<{ uid: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uid, id } = await params;
  const lang = await getLang();
  const [showcase, index] = await Promise.all([getShowcase(uid, lang), getGameIndex(lang)]);
  if (!showcase.ok) return { title: `UID ${uid}` };
  const name = charName(index.characters[id]?.name, id, lang);
  const d = getDict(lang);
  const title = `${name} — ${showcase.data.player.nickname}`;
  const description = `${d.char_stats} · ${d.char_lightcone} · ${d.char_relics} · ${d.char_traces} (UID ${uid})`;
  return { title, description, openGraph: { title, description } };
}

export default async function CharacterPage({ params }: Props) {
  const { uid, id } = await params;
  const [viewer, lang] = await Promise.all([getViewerCookie(), getLang()]);
  const d = getDict(lang);
  const result = await getRoster(uid, { viewer, lang });
  if (!result.ok) {
    return <ErrorBox title={d.error_title} message={result.message} uid={uid} />;
  }

  const { player, characters, hoyolab, index } = result.roster;
  const c = characters.find((x) => x.id === id);

  if (!c) {
    const name = charName(index.characters[id]?.name, id, lang);
    const why =
      hoyolab.status === "ok"
        ? d.char_notfound_owned
        : hoyolab.status === "disabled" || hoyolab.status === "unlinked"
          ? `${d.char_notfound_showcase_1}\n${d.char_notfound_showcase_2}`
          : `${hoyolab.message ?? ""}\n${d.char_notfound_other}`;
    return <ErrorBox title={fmt(d.char_notfound_title, { name })} message={why} uid={uid} />;
  }

  const reco = await getReco();
  const score = scoreCharacter(c, reco[c.id], buildStatRows(c, lang));
  const markdown = characterToMarkdown(normalizeCharacter(c, lang, score), lang);
  const fromHoyolab = c.source === "hoyolab";

  return (
    <div className="space-y-8">
      <nav className="text-sm text-muted">
        <Link href={`/u/${uid}`} className="hover:text-foreground">
          {fmt(d.char_back, { name: player.nickname })}
        </Link>
      </nav>

      {/* 헤더 */}
      <section className="relative overflow-hidden rounded-xl border border-card-border bg-card">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(600px 300px at 80% 0%, ${c.element.color}55, transparent 70%)`,
          }}
        />
        <div className="relative flex flex-col gap-5 p-5 md:flex-row">
          <div className="relative mx-auto aspect-square w-56 shrink-0 overflow-hidden rounded-xl bg-background/40 md:mx-0">
            <GameImage path={c.portrait} alt={c.name} fill sizes="224px" className="object-cover" priority />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{c.name}</h1>
              <RarityStars rarity={c.rarity} className="text-base" />
              <span
                className="rounded border border-card-border px-1.5 py-0.5 text-[11px] text-muted"
                title={fromHoyolab ? d.char_src_hoyolab_title : d.char_src_showcase_title}
              >
                {fromHoyolab ? d.char_src_hoyolab : d.char_src_showcase}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              <ElementBadge {...c.element} size={20} />
              <PathBadge {...c.path} size={20} />
              <span>{levelText(c.level, c.promotion)}</span>
              <span className="rounded bg-accent/15 px-2 py-0.5 font-semibold text-gold">
                {fmt(d.card_eidolon, { n: c.rank })}
              </span>
            </div>

            <div className="mt-5">
              <h2 className="mb-2 text-sm font-semibold text-muted">{d.char_stats}</h2>
              <StatTable c={c} lang={lang} />
            </div>

            {c.relics.length > 0 && (
              <div className="mt-5">
                <BuildReview c={c} score={score} lang={lang} />
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton text={markdown} />
              <a
                href={`/api/u/${uid}/md?c=${c.id}`}
                target="_blank"
                className="rounded-md border border-card-border bg-background/50 px-3 py-1.5 text-xs font-medium hover:border-accent/70"
              >
                {d.char_open_md}
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="lg:col-span-2">
          <SectionTitle>{d.char_lightcone}</SectionTitle>
          <LightConeCard lc={c.light_cone} lang={lang} />
          <div className="mt-6">
            <SectionTitle>{d.char_sets}</SectionTitle>
            <RelicSetList sets={c.relic_sets} lang={lang} />
          </div>
        </section>

        <section className="lg:col-span-3">
          <SectionTitle right={d.char_relics_hint}>{d.char_relics}</SectionTitle>
          {c.relics.length === 0 ? (
            <p className="text-sm text-muted">{d.char_no_relics}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sortRelics(c.relics).map((r) => (
                <RelicCard key={r.id + r.type} r={r} lang={lang} score={score.relics.get(r.id + r.type)} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <SectionTitle>{d.char_traces}</SectionTitle>
        <SkillList c={c} lang={lang} />
      </section>
    </div>
  );
}
