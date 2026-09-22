import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fillLightCone,
  lightConeAttributes,
  lightConeRankProps,
  promotionFromLevel,
  type GameDetail,
} from "@/lib/gamedata";
import type { LightCone } from "@/lib/types";

/** StarRailRes 자료로 HoYoLAB 의 빈칸을 메우는 계산 */

// 23001 「은하 철도의 밤」 의 실제 자료에서 6승급 구간만 떼어 왔다
const detail: GameDetail = {
  skillMax: { "1310": { Normal: 10, BPSkill: 15 } },
  lcPromotions: {
    "23001": {
      id: "23001",
      values: [
        { hp: { base: 48, step: 7.2 }, atk: { base: 26.4, step: 3.96 }, def: { base: 21, step: 3.15 } },
        { hp: { base: 105.6, step: 7.2 }, atk: { base: 58.08, step: 3.96 }, def: { base: 46.2, step: 3.15 } },
        { hp: { base: 182.4, step: 7.2 }, atk: { base: 100.32, step: 3.96 }, def: { base: 79.8, step: 3.15 } },
        { hp: { base: 259.2, step: 7.2 }, atk: { base: 142.56, step: 3.96 }, def: { base: 113.4, step: 3.15 } },
        { hp: { base: 336, step: 7.2 }, atk: { base: 184.8, step: 3.96 }, def: { base: 147, step: 3.15 } },
        { hp: { base: 412.8, step: 7.2 }, atk: { base: 227.04, step: 3.96 }, def: { base: 180.6, step: 3.15 } },
        { hp: { base: 489.6, step: 7.2 }, atk: { base: 269.28, step: 3.96 }, def: { base: 214.2, step: 3.15 } },
      ],
    },
  },
  lcRanks: {
    "23001": {
      id: "23001",
      properties: [
        [{ type: "CriticalChanceBase", value: 0.18 }],
        [{ type: "CriticalChanceBase", value: 0.21 }],
        [{ type: "CriticalChanceBase", value: 0.24 }],
        [{ type: "CriticalChanceBase", value: 0.27 }],
        [{ type: "CriticalChanceBase", value: 0.3 }],
      ],
    },
  },
  properties: {
    MaxHP: { type: "MaxHP", name: "HP", field: "hp", percent: false, icon: "hp.png" },
    Attack: { type: "Attack", name: "공격력", field: "atk", percent: false, icon: "atk.png" },
    Defence: { type: "Defence", name: "방어력", field: "def", percent: false, icon: "def.png" },
    CriticalChanceBase: {
      type: "CriticalChanceBase",
      name: "치명타 확률",
      field: "crit_rate",
      percent: true,
      icon: "cr.png",
    },
  },
};

describe("promotionFromLevel — 레벨로 승급 단계 알아내기", () => {
  it("80 레벨은 무조건 6승급", () => {
    assert.equal(promotionFromLevel(80), 6);
  });

  it("상한이 아닌 레벨은 승급 단계가 하나로 정해진다", () => {
    assert.equal(promotionFromLevel(73), 6);
    assert.equal(promotionFromLevel(65), 5);
    assert.equal(promotionFromLevel(15), 0);
  });

  it("상한에 딱 걸린 레벨은 모른다고 한다 — 70 은 5승급일 수도 6승급일 수도 있다", () => {
    assert.equal(promotionFromLevel(70), -1);
    assert.equal(promotionFromLevel(20), -1);
  });

  it("말도 안 되는 레벨은 -1", () => {
    assert.equal(promotionFromLevel(0), -1);
    assert.equal(promotionFromLevel(99), -1);
  });
});

describe("광추 기초 스탯 — 전시 데이터와 같은 값이 나와야 한다", () => {
  it("80레벨 6승급 (인게임 HP 1058 / 공격력 582 / 방어력 463)", () => {
    const [hp, atk, def] = lightConeAttributes(detail, "23001", 80, 6);
    assert.equal(hp.display, "1058");
    assert.equal(atk.display, "582");
    assert.equal(def.display, "463");
    assert.equal(hp.percent, false);
  });

  it("자료에 없는 광추면 빈 목록 (화면에서 알아서 숨긴다)", () => {
    assert.deepEqual(lightConeAttributes(detail, "99999", 80, 6), []);
  });

  it("승급 단계를 모르면 레벨로 추정한다", () => {
    assert.deepEqual(
      lightConeAttributes(detail, "23001", 80, -1),
      lightConeAttributes(detail, "23001", 80, 6),
    );
  });
});

describe("광추 중첩 효과", () => {
  it("중첩 1은 첫 칸, 중첩 5는 마지막 칸", () => {
    assert.equal(lightConeRankProps(detail, "23001", 1)[0].display, "18.0%");
    assert.equal(lightConeRankProps(detail, "23001", 5)[0].display, "30.0%");
  });

  it("모르는 속성은 빼고 넘어간다", () => {
    const only = { ...detail, properties: {} };
    assert.deepEqual(lightConeRankProps(only, "23001", 1), []);
  });
});

describe("fillLightCone", () => {
  const lc: LightCone = {
    id: "23001",
    name: "은하 철도의 밤",
    rarity: 5,
    rank: 1,
    level: 80,
    promotion: -1,
    icon: "",
    preview: "",
    portrait: "",
    path: { id: "Warrior", name: "파멸", icon: "" },
    attributes: [],
    properties: [],
  };

  it("빈칸을 채운다", () => {
    const filled = fillLightCone(detail, lc)!;
    assert.equal(filled.promotion, 6);
    assert.equal(filled.attributes.length, 3);
    assert.equal(filled.properties.length, 1);
  });

  it("이미 값이 있으면(전시 데이터) 건드리지 않는다", () => {
    const kept = fillLightCone(detail, {
      ...lc,
      promotion: 4,
      attributes: [{ field: "hp", name: "HP", icon: "", value: 1, display: "1", percent: false }],
    })!;
    assert.equal(kept.promotion, 4);
    assert.equal(kept.attributes[0].value, 1);
  });

  it("광추가 없으면 null 그대로", () => {
    assert.equal(fillLightCone(detail, null), null);
  });
});
