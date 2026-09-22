import { LANGS, type Lang } from "./i18n";
import { ASSET_BASE } from "./mihomo";

/**
 * StarRailRes 의 정적 인덱스. 전시에 없는 캐릭터(파티 편성에만 있는 캐릭터)의
 * 이름·아이콘·속성·운명의 길을 그릴 때 쓴다.
 */

export interface IndexCharacter {
  id: string;
  name: string;
  tag: string;
  rarity: number;
  path: string; // Warrior, Rogue, Mage, Shaman, Warlock, Knight, Priest, Memory, Elation
  element: string; // Physical, Fire, Ice, Thunder, Wind, Quantum, Imaginary
  icon: string;
  preview: string;
  portrait: string;
}

export interface IndexElement {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface IndexPath {
  id: string;
  name: string;
  icon: string;
}

export interface IndexRelic {
  id: string;
  set_id: string;
  name: string;
  rarity: number;
  type: string; // HEAD, HAND, BODY, FOOT, NECK, OBJECT
  icon: string;
}

export interface IndexRelicSet {
  id: string;
  name: string;
  desc: string[]; // [2셋 효과, 4셋 효과]
  icon: string;
}

export interface IndexLightCone {
  id: string;
  name: string;
  rarity: number;
  path: string;
  icon: string;
  preview: string;
  portrait: string;
}

export interface GameIndex {
  characters: Record<string, IndexCharacter>;
  elements: Record<string, IndexElement>;
  paths: Record<string, IndexPath>;
  relics: Record<string, IndexRelic>;
  relic_sets: Record<string, IndexRelicSet>;
  light_cones: Record<string, IndexLightCone>;
}

async function fetchIndex<T>(name: string, lang: Lang): Promise<Record<string, T>> {
  try {
    const res = await fetch(`${ASSET_BASE}index_min/${LANGS[lang].index}/${name}.json`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return {};
    return (await res.json()) as Record<string, T>;
  } catch {
    return {};
  }
}

export async function getGameIndex(lang: Lang = "ko"): Promise<GameIndex> {
  const [characters, elements, paths, relics, relic_sets, light_cones] = await Promise.all([
    fetchIndex<IndexCharacter>("characters", lang),
    fetchIndex<IndexElement>("elements", lang),
    fetchIndex<IndexPath>("paths", lang),
    fetchIndex<IndexRelic>("relics", lang),
    fetchIndex<IndexRelicSet>("relic_sets", lang),
    fetchIndex<IndexLightCone>("light_cones", lang),
  ]);
  return { characters, elements, paths, relics, relic_sets, light_cones };
}
