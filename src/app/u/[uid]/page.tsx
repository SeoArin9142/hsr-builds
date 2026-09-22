import type { Metadata } from "next";
import { cookies } from "next/headers";
import ErrorBox from "@/components/ErrorBox";
import GameImage from "@/components/GameImage";
import PartyCard from "@/components/PartyCard";
import PartyEditor from "@/components/PartyEditor";
import RosterGrid from "@/components/RosterGrid";
import { SectionTitle } from "@/components/Badges";
import { toCardModel } from "@/lib/cards";
import { claimCode, cookieName, verifyToken } from "@/lib/claim";
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
  const result = await getShowcase(uid);
  if (!result.ok) return { title: `UID ${uid}` };
  const p = result.data.player;
  return {
    title: `${p.nickname} (UID ${uid})`,
    description: `${p.nickname} 의 캐릭터 스탯·광추·유물`,
  };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const [{ uid }, { refresh }, jar, viewer] = await Promise.all([
    params,
    searchParams,
    cookies(),
    getViewerCookie(),
  ]);
  const canEdit = verifyToken(uid, jar.get(cookieName(uid))?.value);
  // 새로고침(캐시 무시)은 자기 쿠키를 연결했거나 이 UID 의 주인으로 확인된 사람만
  const canRefresh = viewer !== null || canEdit;
  const [result, partyFile] = await Promise.all([
    getRoster(uid, { viewer, refresh: refresh === "1" && canRefresh }),
    getParties(uid),
  ]);

  if (!result.ok) {
    return <ErrorBox title="조회할 수 없습니다" message={result.message} uid={uid} />;
  }

  const { player, characters, showcaseIds, hoyolab, index } = result.roster;
  const byId = new Map(characters.map((c) => [c.id, c]));
  const space = player.space_info;
  const parties = partyFile?.parties ?? [];
  const cards = characters.map(toCardModel);

  const dataTime = hoyolab.fetchedAt
    ? new Date(hoyolab.fetchedAt).toLocaleString("ko-KR", {
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
      ? `보유 ${hoyolab.count}명 (HoYoLAB) + 전시 ${showcaseIds.length}명${dataTime ? ` · ${dataTime} 기준` : ""}${
          hoyolab.viaViewer ? " · 내 계정으로 갱신" : ""
        }`
      : `전시 ${showcaseIds.length}명`;

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
            <span>개척 Lv.{player.level}</span>
            <span>균형 Lv.{player.world_level}</span>
            <span>시뮬레이션 우주 Lv.{space.universe_level}</span>
            <span>캐릭터 {space.avatar_count}</span>
            <span>광추 {space.light_cone_count}</span>
            <span>유물 {space.relic_count.toLocaleString("ko-KR")}</span>
            <span>업적 {space.achievement_count}</span>
          </div>
          {player.signature && (
            <p className="mt-2 text-sm text-foreground/75">{player.signature}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted">
          <a href={`/api/u/${uid}/md`} className="hover:text-foreground" target="_blank">
            AI 용 마크다운 ↗
          </a>
          <a href={`/api/u/${uid}`} className="hover:text-foreground" target="_blank">
            JSON ↗
          </a>
        </div>
      </section>

      {!player.is_display && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          이 계정은 인게임 <b>상세 정보 표시</b>가 꺼져 있어 전시 캐릭터의 스탯·유물이 비어
          옵니다. 프로필 → 캐릭터 전시에서 켜 주세요.
        </div>
      )}

      {(hoyolab.status === "unlinked" || hoyolab.status === "disabled") && (
        <div className="rounded-lg border border-card-border bg-card/60 p-4 text-sm text-foreground/85">
          지금은 인게임 <b>캐릭터 전시</b>에 올린 캐릭터만 보입니다. 이 UID 의 주인이라면{" "}
          <a href="/link" className="text-accent hover:underline">
            내 계정 연결
          </a>{" "}
          을 한 번 하면 보유 캐릭터 전체(스탯·유물 포함)가 이 페이지에 보이고, 방문자와 AI 도 같은 걸
          봅니다. (HoYoLAB 은 남에게는 전체 캐릭터를 보여 주지 않습니다.)
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
          right={`${parties.length}/${MAX_PARTIES}${partyFile?.updated ? ` · ${partyFile.updated} 기준` : ""}`}
        >
          파티 편성
        </SectionTitle>
        <div className="mb-3">
          <PartyEditor
            uid={uid}
            initialParties={parties}
            cards={cards}
            initialVerified={canEdit}
            code={claimCode(uid)}
          />
        </div>
        {parties.length === 0 ? (
          <p className="rounded-lg border border-dashed border-card-border bg-card/50 p-5 text-sm text-muted">
            아직 기록된 파티가 없습니다. 계정 주인이라면 [파티 편집] 으로 최대 {MAX_PARTIES}개까지 만들 수
            있습니다. (파티 편성은 게임 API 가 제공하지 않아 직접 기록해야 합니다.)
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {parties.map((party) => {
              const members = Array.from({ length: 4 }, (_, i) =>
                party.members[i] ? resolveMember(party.members[i], byId, index) : null,
              );
              return <PartyCard key={party.no} uid={uid} party={party} members={members} />;
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
                  title="HoYoLAB 에서 다시 가져오기 (같은 UID 는 한도에 다시 세지 않음)"
                >
                  새로고침
                </a>
              )}
            </span>
          }
        >
          캐릭터
        </SectionTitle>
        {cards.length === 0 ? (
          <p className="rounded-lg border border-card-border bg-card p-6 text-center text-sm text-muted">
            보여 줄 캐릭터가 없습니다. 인게임 캐릭터 전시에 올려 주세요.
          </p>
        ) : (
          <RosterGrid uid={uid} cards={cards} />
        )}
      </section>
    </div>
  );
}
