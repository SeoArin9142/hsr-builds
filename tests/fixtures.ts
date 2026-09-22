import type { Character, Prop, Relic, SubAffix } from "@/lib/types";

/** 테스트용 캐릭터 만들기 — 필요한 칸만 채우고 나머지는 빈 값 */

export function prop(field: string, value: number, percent = false, name = field): Prop {
  return { field, name, icon: "", value, display: String(value), percent };
}

export function sub(field: string, value: number, percent = false, count = 1): SubAffix {
  return { ...prop(field, value, percent), count, step: 0 };
}

export function relic(
  type: number,
  main: Prop,
  subs: SubAffix[],
  id = `relic${type}`,
): Relic {
  return {
    id,
    name: `유물 ${type}`,
    type,
    set_id: "101",
    set_name: "세트",
    rarity: 5,
    level: 15,
    icon: "",
    main_affix: main,
    sub_affix: subs,
  };
}

export function character(over: Partial<Character> = {}): Character {
  return {
    id: "1310",
    name: "테스트",
    rarity: 5,
    rank: 0,
    level: 80,
    promotion: 6,
    icon: "",
    preview: "",
    portrait: "",
    rank_icons: [],
    path: { id: "Shaman", name: "화합", icon: "" },
    element: { id: "Wind", name: "바람", icon: "", color: "#00ff9c" },
    skills: [],
    skill_trees: [],
    light_cone: null,
    relics: [],
    relic_sets: [],
    attributes: [],
    additions: [],
    properties: [],
    ...over,
  };
}
