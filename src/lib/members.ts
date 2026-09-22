import type { Character } from "./types";
import type { GameIndex } from "./starrailres";

/** 파티 슬롯 하나를 그리는 데 필요한 정보. 상세 데이터(전시 또는 HoYoLAB)가 있으면 showcase 에 붙는다. */
export interface MemberView {
  id: string;
  name: string;
  icon: string;
  rarity: number;
  element: { name: string; color: string; icon: string };
  path: { name: string; icon: string };
  showcase: Character | null;
}

export function resolveMember(
  id: string,
  byId: Map<string, Character>,
  index: GameIndex,
): MemberView {
  const c = byId.get(id);
  if (c) {
    return {
      id,
      name: c.name,
      icon: c.icon,
      rarity: c.rarity,
      element: { name: c.element.name, color: c.element.color, icon: c.element.icon },
      path: { name: c.path.name, icon: c.path.icon },
      showcase: c,
    };
  }

  const ic = index.characters[id];
  const el = ic ? index.elements[ic.element] : undefined;
  const pa = ic ? index.paths[ic.path] : undefined;
  return {
    id,
    name: ic?.name ?? `#${id}`,
    icon: ic?.icon ?? `icon/character/${id}.png`,
    rarity: ic?.rarity ?? 0,
    element: {
      name: el?.name ?? ic?.element ?? "",
      color: el?.color ?? "#ffffff",
      icon: el?.icon ?? "",
    },
    path: { name: pa?.name ?? ic?.path ?? "", icon: pa?.icon ?? "" },
    showcase: null,
  };
}
