import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  critRatio,
  gradeOf,
  nextGrade,
  primaryStats,
  scoreCharacter,
  speedInfo,
  usefulStats,
} from "@/lib/score";
import { buildStatRows } from "@/lib/stats";
import { character, prop, relic, sub } from "./fixtures";

// HoYoLAB 추천 부옵션 id: 52 치명타 확률, 53 치명타 피해, 33 공격력%
const CRIT_RECO = [52, 53, 33];

describe("등급", () => {
  it("구간 경계에서 바로 다음 등급이 된다", () => {
    assert.equal(gradeOf(90), "S");
    assert.equal(gradeOf(89.9), "A");
    assert.equal(gradeOf(68), "B");
    assert.equal(gradeOf(0), "D");
  });

  it("다음 등급까지 남은 점수는 올림", () => {
    assert.deepEqual(nextGrade(80.2), { grade: "S", need: 10 });
    assert.equal(nextGrade(95), null); // S 위는 없다
  });
});

describe("핵심 스탯 고르기", () => {
  const c = character();

  it("치확만 추천돼도 치피를 같이 넣는다", () => {
    assert.ok(primaryStats(c, [52]).includes("crit_dmg"));
    assert.ok(primaryStats(c, [53]).includes("crit_rate"));
  });

  it("추천이 없으면 운명의 길 기본값을 쓴다 (화합 = 속도·돌파)", () => {
    assert.deepEqual(primaryStats(c), ["spd", "break_dmg", "effect_res", "hp"]);
  });

  it("추천이 있으면 길 기본값은 절반 가중치로만 남는다", () => {
    const w = usefulStats(c, CRIT_RECO);
    assert.equal(w.get("crit_rate"), 1);
    assert.equal(w.get("atk"), 1);
    assert.equal(w.get("spd"), 0.5); // 화합 기본값이지만 추천은 아님
    assert.equal(w.get("atk:flat"), 0.5); // 공격력% 가 추천이면 평타 공격력도 절반
  });
});

describe("scoreCharacter — 등급은 실제 최종 수치로", () => {
  function withStats(atk: number, cr: number, cd: number) {
    const c = character({
      path: { id: "Warrior", name: "파멸", icon: "" },
      attributes: [prop("atk", atk), prop("crit_rate", cr, true), prop("crit_dmg", cd, true)],
      additions: [],
    });
    return scoreCharacter(c, CRIT_RECO, buildStatRows(c));
  }

  it("목표치(공 3000·치확 70%·치피 160%)를 다 채우면 S", () => {
    const s = withStats(3000, 0.7, 1.6);
    assert.equal(s.build, 100);
    assert.equal(s.grade, "S");
  });

  it("목표를 넘겨도 100 을 넘지 않는다", () => {
    assert.equal(withStats(9000, 1, 3).build, 100);
  });

  it("수치가 모자라면 등급이 내려간다", () => {
    const s = withStats(1500, 0.35, 0.8);
    assert.equal(Math.round(s.build), 50);
    assert.equal(s.grade, "D");
  });

  it("유물이 하나도 없어도 수치가 좋으면 S — 광추·행적도 수치에 들어 있으므로", () => {
    const s = withStats(3000, 0.7, 1.6);
    assert.equal(s.relics.size, 0);
    assert.equal(s.total, 0); // 부옵 효율은 0
    assert.equal(s.grade, "S"); // 그래도 등급은 수치 기준
  });

  it("최종 수치를 모르면(전시 데이터 없음) 부옵 효율로 등급을 매긴다", () => {
    const c = character({ relics: [relic(1, prop("hp", 705), [sub("crit_rate", 0.0324, true)])] });
    const s = scoreCharacter(c, CRIT_RECO); // rows 없음
    assert.equal(s.targets.length, 0);
    assert.equal(s.grade, gradeOf(s.total));
  });
});

describe("scoreCharacter — 유물 부옵 효율", () => {
  it("한 부위가 유효 6롤이면 100점", () => {
    const c = character({
      path: { id: "Warrior", name: "파멸", icon: "" },
      relics: [
        relic(1, prop("hp", 705), [
          sub("crit_rate", 0.0324 * 3, true), // 3롤
          sub("crit_dmg", 0.0648 * 3, true), // 3롤
        ]),
      ],
    });
    const s = scoreCharacter(c, CRIT_RECO);
    assert.equal(Math.round(s.rolls * 100) / 100, 6);
    assert.equal(Math.round(s.total), 100);
  });

  it("쓸모없는 부옵은 롤로 세지 않는다", () => {
    const c = character({
      path: { id: "Warrior", name: "파멸", icon: "" },
      relics: [relic(1, prop("hp", 705), [sub("effect_res", 0.0432 * 5, true)])],
    });
    assert.equal(scoreCharacter(c, CRIT_RECO).rolls, 0);
  });

  it("차원 구체 속성 피해가 캐릭터 속성과 다르면 메인옵을 어긋난 것으로 센다", () => {
    const wrong = character({
      element: { id: "Wind", name: "바람", icon: "", color: "#fff" },
      relics: [relic(5, prop("fire_dmg", 0.388, true), [])],
    });
    assert.equal(scoreCharacter(wrong, CRIT_RECO).mainBad, 1);

    const right = character({
      element: { id: "Wind", name: "바람", icon: "", color: "#fff" },
      relics: [relic(5, prop("wind_dmg", 0.388, true), [])],
    });
    assert.equal(scoreCharacter(right, CRIT_RECO).mainBad, 0);
  });

  it("머리·손은 메인옵이 고정이라 평가하지 않는다", () => {
    const c = character({ relics: [relic(1, prop("hp", 705), []), relic(2, prop("atk", 352), [])] });
    const s = scoreCharacter(c, CRIT_RECO);
    assert.equal(s.mainBad, 0);
    assert.equal(s.relics.get("relic11")?.mainVerdict, "fixed");
  });
});

describe("속도 구간", () => {
  it("넘은 구간과 다음 구간을 알려 준다", () => {
    assert.deepEqual(speedInfo(134.4), { reached: 134.4, next: 143.7, gap: 10 });
    assert.deepEqual(speedInfo(100), { reached: null, next: 110, gap: 10 });
  });

  it("딱 맞는 값이 떠 있는 소수 때문에 미달로 읽히지 않는다", () => {
    assert.equal(speedInfo(134.39999999999998).reached, 134.4);
  });

  it("맨 위 구간을 넘으면 다음이 없다", () => {
    assert.deepEqual(speedInfo(210), { reached: 200.1, next: null, gap: null });
  });
});

describe("치확 : 치피 균형", () => {
  it("1:2 근처면 적정", () => {
    assert.equal(critRatio(0.8, 1.6).hint, "ok");
  });

  it("치피에 비해 치확이 모자라면 low", () => {
    assert.equal(critRatio(0.4, 1.6).hint, "low");
  });

  it("치확만 높으면 high", () => {
    assert.equal(critRatio(0.9, 1.0).hint, "high");
  });

  it("치확이 0 이면 비율을 내지 않는다", () => {
    assert.deepEqual(critRatio(0, 1.6), { ratio: null, hint: "low" });
  });
});
