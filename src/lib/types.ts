// Mihomo API (sr_info_parsed) 응답 중 이 앱이 쓰는 부분만 정의한다.
// 전체 스키마: https://github.com/Mar-7th/March7th-Docs (mihomo-api)

export interface Prop {
  type?: string; // "HPDelta" 같은 원시 타입 (properties 에만 있음)
  field: string; // hp, atk, def, spd, crit_rate, crit_dmg, break_dmg, ...
  name: string; // 한국어 표시 이름
  icon: string;
  value: number; // 퍼센트 스탯은 0~1 비율
  display: string; // API 가 미리 만들어 둔 표시 문자열
  percent: boolean;
}

export interface SubAffix extends Prop {
  count: number; // 부옵션 강화 횟수 (초기 1 포함)
  step: number;
}

export interface Named {
  id: string;
  name: string;
  icon: string;
}

export interface ElementInfo extends Named {
  color: string;
}

export interface Skill {
  id: string;
  name: string;
  level: number;
  max_level: number; // 0 이면 알 수 없음
  element: ElementInfo | null;
  type: string; // Normal, BPSkill, Ultra, Talent, MazeNormal, Maze
  type_text: string; // 일반 공격, 전투 스킬, 필살기, 특성, 비술 ("" 이면 표시 안 함)
  effect: string;
  effect_text: string;
  simple_desc: string;
  desc: string;
  icon: string;
}

export interface SkillTree {
  id: string;
  level: number;
  anchor: string;
  max_level: number;
  icon: string;
  parent: string | null;
}

export interface LightCone {
  id: string;
  name: string;
  rarity: number;
  rank: number; // 중첩 (1~5)
  level: number;
  promotion: number;
  icon: string;
  preview: string;
  portrait: string;
  path: Named;
  attributes: Prop[]; // 광추 기초 스탯
  properties: Prop[]; // 광추 스킬이 주는 스탯
}

export interface Relic {
  id: string;
  name: string;
  type: number; // 1 머리, 2 손, 3 몸통, 4 발, 5 차원 구체, 6 연결 밧줄
  set_id: string;
  set_name: string;
  rarity: number;
  level: number;
  icon: string;
  main_affix: Prop;
  sub_affix: SubAffix[];
}

export interface RelicSet {
  id: string;
  name: string;
  icon: string;
  num: number; // 2 또는 4
  desc: string;
  properties: Prop[];
}

/** 기억 정령 (기억의 운명 캐릭터가 소환하는 분신) — HoYoLAB 전적에만 있다 */
export interface MemospriteSkill {
  id: string;
  name: string;
  type_text: string; // 기억 정령 스킬 / 기억 정령 특성
  level: number;
  max_level: number; // 0 이면 모름
  icon: string;
  desc: string;
}

export interface Memosprite {
  id: string;
  name: string;
  icon: string;
  stats: Prop[]; // 최종 수치만 (기초/가산으로 나눠 오지 않는다)
  skills: MemospriteSkill[];
}

export type DataSource = "showcase" | "hoyolab";

export interface Character {
  source?: DataSource; // 어디서 온 데이터인지 (기본 showcase)
  id: string;
  name: string;
  rarity: number;
  rank: number; // 성혼
  level: number;
  promotion: number; // -1 이면 알 수 없음 (HoYoLAB 데이터)
  icon: string;
  preview: string;
  portrait: string;
  rank_icons: string[];
  path: Named;
  element: ElementInfo;
  skills: Skill[];
  skill_trees: SkillTree[];
  light_cone: LightCone | null;
  memosprite?: Memosprite | null; // 기억의 운명 캐릭터만
  relics: Relic[];
  relic_sets: RelicSet[];
  attributes: Prop[]; // 캐릭터+광추 기초 스탯
  additions: Prop[]; // 유물·행적·광추 스킬로 붙는 가산치 (합산)
  properties: Prop[]; // 가산치의 출처별 원시 목록
}

export interface SpaceInfo {
  universe_level: number;
  avatar_count: number;
  light_cone_count: number;
  relic_count: number;
  achievement_count: number;
  book_count: number;
  music_count: number;
}

export interface Player {
  uid: string;
  nickname: string;
  level: number;
  world_level: number;
  friend_count: number;
  avatar: Named;
  signature: string;
  is_display: boolean; // 인게임 "상세 정보 표시" 여부
  space_info: SpaceInfo;
}

export interface Showcase {
  player: Player;
  characters: Character[];
}
