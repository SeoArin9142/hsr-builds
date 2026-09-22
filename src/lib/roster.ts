import { getHoyolabRoster, type HoyoCookie, type HoyolabStatus } from "./hoyolab";
import { getShowcase } from "./mihomo";
import { getGameIndex, type GameIndex } from "./starrailres";
import type { Character, Player } from "./types";

/**
 * 한 UID 의 캐릭터 전체 = 전시(Mihomo) + HoYoLAB 전적.
 * 같은 캐릭터가 양쪽에 있으면 전시 쪽을 쓴다(스킬 설명·광추 스탯 등이 더 자세함).
 */

export interface Roster {
  player: Player;
  characters: Character[]; // 정렬: 희귀도 → 레벨 → 성혼 → 이름
  showcaseIds: string[];
  hoyolab: {
    status: HoyolabStatus;
    message?: string;
    count: number;
    fetchedAt?: number; // HoYoLAB 데이터 기준 시각
    cached?: boolean;
    viaViewer: boolean; // 방문자가 연결한 쿠키로 조회했는지
  };
  index: GameIndex;
}

export type RosterResult =
  | { ok: true; roster: Roster }
  | { ok: false; status: number; message: string };

export interface RosterOpts {
  viewer?: HoyoCookie | null; // 방문자가 [내 계정 연결]로 준 쿠키
  refresh?: boolean; // 캐시 무시하고 새로 조회
}

export async function getRoster(uid: string, opts: RosterOpts = {}): Promise<RosterResult> {
  const index = await getGameIndex();
  const [showcase, hoyolab] = await Promise.all([
    getShowcase(uid),
    getHoyolabRoster(uid, index, { viewer: opts.viewer, refresh: opts.refresh }),
  ]);
  if (!showcase.ok) return showcase;

  const byId = new Map<string, Character>();
  for (const c of hoyolab.characters) byId.set(c.id, c);
  for (const c of showcase.data.characters) byId.set(c.id, { ...c, source: "showcase" });

  const characters = [...byId.values()].sort(
    (a, b) =>
      b.rarity - a.rarity ||
      b.level - a.level ||
      b.rank - a.rank ||
      a.name.localeCompare(b.name, "ko"),
  );

  return {
    ok: true,
    roster: {
      player: showcase.data.player,
      characters,
      showcaseIds: showcase.data.characters.map((c) => c.id),
      hoyolab: {
        status: hoyolab.status,
        message: hoyolab.message,
        count: hoyolab.characters.length,
        fetchedAt: hoyolab.fetchedAt,
        cached: hoyolab.cached,
        viaViewer: hoyolab.cookieId?.startsWith("user:") ?? false,
      },
      index,
    },
  };
}
