import { getKV } from "./kvstore";

/**
 * 캐릭터별 추천 부옵션 (HoYoLAB `recommend_property`).
 * 계정과 무관한 게임 공통 정보라, 누군가의 조회 응답에서 한 번 받아 두면 모두가 같이 쓴다.
 * Redis 에 30일 보관하고, 프로세스 안에도 10분 캐시.
 */

const KEY = "hoyo:reco:v1";
const TTL = 30 * 86400;

export type RecoMap = Record<string, number[]>; // 캐릭터 id → property_type[]

let mem: { at: number; value: RecoMap } | null = null;

export async function getReco(): Promise<RecoMap> {
  if (mem && Date.now() - mem.at < 10 * 60 * 1000) return mem.value;
  try {
    const raw = await getKV().get(KEY);
    const value = raw ? (JSON.parse(raw) as RecoMap) : {};
    mem = { at: Date.now(), value };
    return value;
  } catch {
    return mem?.value ?? {};
  }
}

/** HoYoLAB 응답에서 받은 추천표를 저장 (새 캐릭터가 늘었을 때만 쓴다) */
export async function saveReco(map: RecoMap): Promise<void> {
  if (Object.keys(map).length === 0) return;
  try {
    const cur = await getReco();
    const merged = { ...cur, ...map };
    if (Object.keys(merged).length === Object.keys(cur).length) return; // 바뀐 게 없으면 쓰지 않는다
    mem = { at: Date.now(), value: merged };
    await getKV().set(KEY, JSON.stringify(merged), TTL);
  } catch (e) {
    console.error("[reco] 저장 실패", e);
  }
}
