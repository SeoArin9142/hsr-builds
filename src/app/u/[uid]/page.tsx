import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import ErrorBox from "@/components/ErrorBox";
import GameImage from "@/components/GameImage";
import PartyCard from "@/components/PartyCard";
import PartyEditor from "@/components/PartyEditor";
import RosterGrid from "@/components/RosterGrid";
import { SectionTitle } from "@/components/Badges";
import { toCardModel } from "@/lib/cards";
import { cookieName, verifyToken } from "@/lib/claim";
import { fmt, getDict, LANGS } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { resolveMember } from "@/lib/members";
import { getShowcase } from "@/lib/mihomo";
import { getParties } from "@/lib/parties";
import { MAX_PARTIES } from "@/lib/partyStore";
import { getRoster } from "@/lib/roster";
import { getViewerCookie } from "@/lib/viewer";

type Props = {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ refresh?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uid } = await params;
  const lang = await getLang();
  const result = await getShowcase(uid, lang);
  if (!result.ok) return { title: `UID ${uid}` };
  const p = result.data.player;
  return { title: `${p.nickname} (UID ${uid})` };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const [{ uid }, { refresh }, jar, viewer, lang] = await Promise.all([
    params,
    searchParams,
    cookies(),
    getViewerCookie(),
    getLang(),
  ]);
  const d = getDict(lang);
  const canEdit = verifyToken(uid, jar.get(cookieName(uid))?.value);
  // 새로고침(캐시 무시)은 이 UID 를 연결한 본인이거나 이 UID 의 주인으로 확인된 사람만
  const canRefresh = (viewer?.uids ?? []).includes(uid) || canEdit;
  const [result, partyFile] = await Promise.all([
    getRoster(uid, { viewer, refresh: refresh === "1" && canRefresh, lang }),
    getParties(uid),
  ]);

  if (!result.ok) {
    return <ErrorBox title={d.error_title} message={result.message} uid={uid} />;
  }

  const { player, characters, showcaseIds, hoyolab, index } = result.roster;
  const byId = new Map(characters.map((c) => [c.id, c]));
  const space = player.space_info;
  const parties = partyFile?.parties ?? [];
  const cards = characters.map(toCardModel);

  const dataTime = hoyolab.fetchedAt
    ? new Date(hoyolab.fetchedAt).toLocaleString(LANGS[lang].locale, {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : null;
  const sourceLine =
    hoyolab.status === "ok"
      ? [
          fmt(d.chars_source_full, { n: hoyolab.count, m: showcaseIds.length }),
          dataTime ? fmt(d.chars_asof, { time: dataTime }) : null,
          hoyolab.viaViewer ? d.chars_via_viewer : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : fmt(d.chars_source_showcase, { m: showcaseIds.length });

  return (
    <div className="space-y-10">
      {/* 프로필 */}
      <section className="flex flex-wrap items-center gap-5 rounded-xl border border-card-border bg-card p-5">
        <div className="relative size-20 overflow-hidden rounded-full border-2 border-accent/60 bg-background/40">
          <GameImage path={player.avatar.icon} alt="" fill sizes="80px" className="object-cover" priority />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {player.nickname}
            <span className="ml-3 text-sm font-normal text-muted">UID {player.uid}</span>
          </h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span>{fmt(d.profile_trailblaze, { n: player.level })}</span>
            <span>{fmt(d.profile_equilibrium, { n: player.world_level })}</span>
            <span>{fmt(d.profile_su, { n: space.universe_level })}</span>
            <span>{fmt(d.profile_chars, { n: space.avatar_count })}</span>
            <span>{fmt(d.profile_lightcones, { n: space.light_cone_count })}</span>
            <span>{fmt(d.profile_relics, { n: space.relic_count.toLocaleString(LANGS[lang].locale) })}</span>
            <span>{fmt(d.profile_achievements, { n: space.achievement_count })}</span>
          </div>
          {player.signature && (
            <p className="mt-2 text-sm text-foreground/75">{player.signature}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted">
          <a href={`/api/u/${uid}/md`} className="hover:text-foreground" target="_blank">
            {d.profile_md}
          </a>
          <a href={`/api/u/${uid}`} className="hover:text-foreground" target="_blank">
            {d.profile_json}
          </a>
        </div>
      </section>

      {!player.is_display && (
        <div className="space-y-1 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p>{d.notice_nodisplay_1}</p>
          <p>{d.notice_nodisplay_2}</p>
        </div>
      )}

      {(hoyolab.status === "unlinked" || hoyolab.status === "disabled") && (
        <div className="space-y-1 rounded-lg border border-card-border bg-card/60 p-4 text-sm text-foreground/85">
          <p>{d.notice_unlinked_1}</p>
          <p>
            {d.notice_unlinked_2a}{" "}
            <Link href="/link" className="text-accent hover:underline">
              {d.nav_link}
            </Link>{" "}
            {d.notice_unlinked_2b}
          </p>
          <p>{d.notice_unlinked_3}</p>
          <p className="text-muted">{d.notice_unlinked_4}</p>
        </div>
      )}
      {hoyolab.status !== "ok" && hoyolab.status !== "disabled" && hoyolab.status !== "unlinked" && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          {hoyolab.message}
        </div>
      )}

      {/* 파티 편성 — 게임 API 에 없어서 계정 주인이 편집기로 직접 만든다 */}
      <section>
        <SectionTitle
          right={`${parties.length}/${MAX_PARTIES}${
            partyFile?.updated ? ` · ${fmt(d.parties_asof, { date: partyFile.updated })}` : ""
          }`}
        >
          {d.parties_title}
        </SectionTitle>
        <div className="mb-3">
          <PartyEditor uid={uid} initialParties={parties} cards={cards} initialVerified={canEdit} />
        </div>
        {parties.length === 0 ? (
          <div className="space-y-1 rounded-lg border border-dashed border-card-border bg-card/50 p-5 text-sm text-muted">
            <p>{d.parties_empty_1}</p>
            <p>{fmt(d.parties_empty_2, { max: MAX_PARTIES })}</p>
            <p>{d.parties_empty_3}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {parties.map((party) => {
              const members = Array.from({ length: 4 }, (_, i) =>
                party.members[i] ? resolveMember(party.members[i], byId, index) : null,
              );
              return <PartyCard key={party.no} uid={uid} party={party} members={members} lang={lang} />;
            })}
          </div>
        )}
      </section>

      {/* 캐릭터 */}
      <section>
        <SectionTitle
          right={
            <span className="inline-flex items-center gap-2">
              <span>{sourceLine}</span>
              {canRefresh && hoyolab.status === "ok" && (
                <a
                  href={`/u/${uid}?refresh=1`}
                  className="rounded border border-card-border px-1.5 py-0.5 text-[11px] hover:border-accent/70 hover:text-foreground"
                  title={d.chars_refresh_title}
                >
                  {d.chars_refresh}
                </a>
              )}
            </span>
          }
        >
          {d.chars_title}
        </SectionTitle>
        {cards.length === 0 ? (
          <div className="space-y-1 rounded-lg border border-card-border bg-card p-6 text-center text-sm text-muted">
            <p>{d.chars_none_1}</p>
            <p>{d.chars_none_2}</p>
          </div>
        ) : (
          <RosterGrid uid={uid} cards={cards} />
        )}
      </section>
    </div>
  );
}
