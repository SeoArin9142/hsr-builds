import { maxLevel } from "./stats";
import type { Character } from "./types";

/** 캐릭터 목록 카드에 필요한 최소 정보 (클라이언트 필터 컴포넌트로 넘기므로 가볍게) */
export interface CardModel {
  id: string;
  name: string;
  rarity: number;
  level: number;
  maxLevel: number | null;
  eidolon: number;
  element: { id: string; name: string; color: string; icon: string };
  path: { id: string; name: string; icon: string };
  icon: string; // 둥근 아이콘 (파티 편집기용)
  preview: string;
  lightCone: { name: string; rank: number } | null;
  sets: string[]; // "세트명 4" 형식
  showcased: boolean;
}

/** 같은 세트의 2셋·4셋 중 큰 것만 남긴다 */
export function setSummary(c: Character): string[] {
  const max = new Map<string, number>();
  for (const s of c.relic_sets) max.set(s.name, Math.max(max.get(s.name) ?? 0, s.num));
  return [...max].map(([name, num]) => `${name} ${num}`);
}

export function toCardModel(c: Character): CardModel {
  return {
    id: c.id,
    name: c.name,
    rarity: c.rarity,
    level: c.level,
    maxLevel: maxLevel(c.promotion),
    eidolon: c.rank,
    element: { id: c.element.id, name: c.element.name, color: c.element.color, icon: c.element.icon },
    path: { id: c.path.id, name: c.path.name, icon: c.path.icon },
    icon: c.icon,
    preview: c.preview,
    lightCone: c.light_cone ? { name: c.light_cone.name, rank: c.light_cone.rank } : null,
    sets: setSummary(c),
    showcased: c.source !== "hoyolab",
  };
}
