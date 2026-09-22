import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { changesSince, snapshotOf } from "@/lib/history";
import type { CardModel } from "@/lib/cards";

/** "지난주 대비 달라진 점" 비교 */

function card(over: Partial<CardModel> & { id: string }): CardModel {
  return {
    name: `캐릭터${over.id}`,
    rarity: 5,
    level: 80,
    maxLevel: 80,
    eidolon: 0,
    element: { id: "Wind", name: "바람", color: "#fff", icon: "" },
    path: { id: "Warrior", name: "파멸", icon: "" },
    icon: "",
    preview: "",
    lightCone: { id: "23001", name: "광추", rank: 1 },
    sets: [],
    showcased: false,
    key: { crit: "", spd: "" },
    score: 80,
    grade: "A",
    ...over,
  };
}

const before = [card({ id: "1310" }), card({ id: "1225" })];
const base = snapshotOf(before);

describe("changesSince", () => {
  it("달라진 게 없으면 빈 목록", () => {
    assert.deepEqual(changesSince(base, before), []);
  });

  it("새 캐릭터는 '새로 추가'", () => {
    const got = changesSince(base, [...before, card({ id: "1512" })]);
    assert.equal(got.length, 1);
    assert.equal(got[0].id, "1512");
    assert.equal(got[0].isNew, true);
  });

  it("레벨·성혼이 오르면 전후 값을 같이 알려 준다", () => {
    const got = changesSince(base, [card({ id: "1310", level: 80, eidolon: 2 }), before[1]]);
    assert.deepEqual(got[0].eidolon, [0, 2]);
    assert.equal(got[0].level, undefined);
  });

  it("광추를 바꾸면 새 광추 이름", () => {
    const got = changesSince(base, [
      card({ id: "1310", lightCone: { id: "23020", name: "다른 광추", rank: 1 } }),
      before[1],
    ]);
    assert.equal(got[0].lightCone, "다른 광추");
  });

  it("같은 광추의 중첩만 올랐으면 중첩 변화로", () => {
    const got = changesSince(base, [
      card({ id: "1310", lightCone: { id: "23001", name: "광추", rank: 3 } }),
      before[1],
    ]);
    assert.equal(got[0].lightCone, undefined);
    assert.deepEqual(got[0].lcRank, [1, 3]);
  });

  it("빌드 점수는 2점 차이로는 알리지 않는다 (유물 강화로 늘 조금씩 흔들린다)", () => {
    assert.deepEqual(changesSince(base, [card({ id: "1310", score: 82 }), before[1]]), []);
  });

  it("빌드 점수가 3점 이상 움직이면 알린다 — 내려간 것도", () => {
    const up = changesSince(base, [card({ id: "1310", score: 90 }), before[1]]);
    assert.deepEqual(up[0].score, [80, 90]);
    const down = changesSince(base, [card({ id: "1310", score: 70 }), before[1]]);
    assert.deepEqual(down[0].score, [80, 70]);
  });

  it("빠진 캐릭터는 알리지 않는다 (전적이 덜 왔을 뿐일 수 있다)", () => {
    assert.deepEqual(changesSince(base, [before[0]]), []);
  });

  it("새 캐릭터를 맨 앞에 둔다", () => {
    const got = changesSince(base, [
      card({ id: "1310", level: 70 }),
      before[1],
      card({ id: "1512" }),
    ]);
    assert.equal(got[0].id, "1512");
  });

  it("유물이 없어 점수를 못 낸 캐릭터도 넘어간다", () => {
    const noScore = [card({ id: "1310", score: null }), before[1]];
    assert.deepEqual(changesSince(snapshotOf(noScore), noScore), []);
  });
});
