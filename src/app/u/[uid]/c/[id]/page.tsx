import type { Metadata } from "next";
import Link from "next/link";
import { ElementBadge, PathBadge, RarityStars, SectionTitle } from "@/components/Badges";
import CopyButton from "@/components/CopyButton";
import ErrorBox from "@/components/ErrorBox";
import GameImage from "@/components/GameImage";
import LightConeCard from "@/components/LightConeCard";
import { RelicCard, RelicSetList, sortRelics } from "@/components/RelicCard";
import SkillList from "@/components/SkillList";
import StatTable from "@/components/StatTable";
import { getShowcase } from "@/lib/mihomo";
import { characterToMarkdown, normalizeCharacter } from "@/lib/normalize";
import { getRoster } from "@/lib/roster";
import { getGameIndex } from "@/lib/starrailres";
import { getViewerCookie } from "@/lib/viewer";
import { levelText } from "@/lib/stats";

type Props = { params: Promise<{ uid: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uid, id } = await params;
  const [showcase, index] = await Promise.all([getShowcase(uid), getGameIndex()]);
  if (!showcase.ok) return { title: `UID ${uid}` };
  const name = index.characters[id]?.name ?? `캐릭터 ${id}`;
  return { title: `${name} — ${showcase.data.player.nickname}` };
}

export default async function CharacterPage({ params }: Props) {
  const { uid, id } = await params;
  const viewer = await getViewerCookie();
  const result = await getRoster(uid, { viewer });
  if (!result.ok) {
    return <ErrorBox title="조회할 수 없습니다" message={result.message} uid={uid} />;
  }

  const { player, characters, hoyolab, index } = result.roster;
  const c = characters.find((x) => x.id === id);

  if (!c) {
    const name = index.characters[id]?.name ?? `#${id}`;
    const why =
      hoyolab.status === "ok"
        ? "이 계정이 보유하지 않았거나 아직 반영되지 않은 캐릭터입니다."
        : hoyolab.status === "disabled"
          ? "스탯·유물은 인게임 캐릭터 전시에 올린 캐릭터만 볼 수 있습니다. 전시에 올리고 몇 분 뒤 다시 조회해 주세요."
          : `${hoyolab.message ?? ""} 전시에 올리면 볼 수 있습니다.`;
    return <ErrorBox title={`${name} 의 상세 정보가 없습니다`} message={why} uid={uid} />;
  }

  const markdown = characterToMarkdown(normalizeCharacter(c));
  const fromHoyolab = c.source === "hoyolab";

  return (
    <div className="space-y-8">
      <nav className="text-sm text-muted">
        <Link href={`/u/${uid}`} className="hover:text-foreground">
          ← {player.nickname} 의 프로필
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
                title={
                  fromHoyolab
                    ? "HoYoLAB 전적에서 가져온 데이터"
                    : "인게임 캐릭터 전시에서 가져온 데이터"
                }
              >
                {fromHoyolab ? "HoYoLAB" : "전시"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              <ElementBadge {...c.element} size={20} />
              <PathBadge {...c.path} size={20} />
              <span>{levelText(c.level, c.promotion)}</span>
              <span className="rounded bg-accent/15 px-2 py-0.5 font-semibold text-gold">
                {c.rank}성혼
              </span>
            </div>

            <div className="mt-5">
              <h2 className="mb-2 text-sm font-semibold text-muted">스탯</h2>
              <StatTable c={c} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton text={markdown} />
              <a
                href={`/api/u/${uid}/md?c=${c.id}`}
                target="_blank"
                className="rounded-md border border-card-border bg-background/50 px-3 py-1.5 text-xs font-medium hover:border-accent/70"
              >
                마크다운 열기 ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="lg:col-span-2">
          <SectionTitle>광추</SectionTitle>
          <LightConeCard lc={c.light_cone} />
          <div className="mt-6">
            <SectionTitle>세트 효과</SectionTitle>
            <RelicSetList sets={c.relic_sets} />
          </div>
        </section>

        <section className="lg:col-span-3">
          <SectionTitle right="● = 부옵션 강화 횟수">유물</SectionTitle>
          {c.relics.length === 0 ? (
            <p className="text-sm text-muted">장착한 유물이 없습니다.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sortRelics(c.relics).map((r) => (
                <RelicCard key={r.id + r.type} r={r} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <SectionTitle>행적 · 성혼</SectionTitle>
        <SkillList c={c} />
      </section>
    </div>
  );
}
