import { readParties } from "./partyStore";

/**
 * 파티 편성은 어떤 API 에서도 내려주지 않으므로(HoYoLAB·Mihomo·Enka 모두 없음)
 * 계정 주인이 사이트의 파티 편집기로 직접 만든다. 저장 위치는 partyStore.ts 참고.
 */

export interface Party {
  no: number; // 1~12
  name: string; // "파티8" 등
  note?: string; // 용도 메모 (혼돈의 기억 12층 상반 등)
  members: string[]; // 캐릭터 ID (예: "1310" = 반디), 최대 4개, 순서 = 인게임 위치
}

export interface PartyFile {
  uid: string;
  updated?: string; // YYYY-MM-DD
  parties: Party[];
}

export async function getParties(uid: string): Promise<PartyFile | null> {
  return readParties(uid);
}
