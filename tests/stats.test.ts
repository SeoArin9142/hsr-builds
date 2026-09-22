import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStatRows, formatAdd, formatStat, levelText, maxLevel, stars } from "@/lib/stats";
import { character, prop } from "./fixtures";

describe("formatStat — 인게임과 같은 '버림' 규칙", () => {
  it("퍼센트는 소수 1자리까지 버린다", () => {
    assert.equal(formatStat(0.6789, true), "67.8%");
    assert.equal(formatStat(0.5, true), "50.0%");
    assert.equal(formatStat(1.6, true), "160.0%");
  });

  it("떠 있는 소수 오차 때문에 한 칸 깎이지 않는다", () => {
    // 0.1 + 0.2 = 0.30000000000000004 같은 값도 30.0% 로
    assert.equal(formatStat(0.1 + 0.2, true), "30.0%");
    assert.equal(formatStat(0.648 * 2 + 0.304, true), "160.0%");
  });

  it("정수 스탯도 버림하고 천 단위로 끊는다", () => {
    assert.equal(formatStat(3218.9, false), "3,218");
    assert.equal(formatStat(140, false), "140");
  });
});

describe("formatAdd — 가산치 표기", () => {
  it("0 이면 '-'", () => {
    assert.equal(formatAdd(0, false), "-");
    assert.equal(formatAdd(1e-12, true), "-");
  });

  it("양수는 +, 음수는 - 하나만 붙는다", () => {
    assert.equal(formatAdd(120, false), "+120");
    assert.equal(formatAdd(-8, false), "-8");
    assert.equal(formatAdd(-0.05, true), "-5.0%");
  });
});

describe("레벨 표기", () => {
  it("승급 단계로 최대 레벨을 구한다", () => {
    assert.equal(maxLevel(0), 20);
    assert.equal(maxLevel(6), 80);
    assert.equal(maxLevel(-1), null);
  });

  it("승급 단계를 모르면 최대치를 숨긴다 (HoYoLAB 데이터)", () => {
    assert.equal(levelText(80, 6), "Lv.80/80");
    assert.equal(levelText(80, -1), "Lv.80");
  });

  it("별은 0~5 로 자른다", () => {
    assert.equal(stars(5), "★★★★★");
    assert.equal(stars(0), "");
    assert.equal(stars(9), "★★★★★");
  });
});

describe("buildStatRows", () => {
  const rows = buildStatRows(
    character({
      attributes: [prop("atk", 1000), prop("hp", 3000), prop("crit_rate", 0.05, true)],
      additions: [prop("atk", 500), prop("atk", 200), prop("crit_rate", 0.3, true)],
    }),
  );
  const by = (f: string) => rows.find((r) => r.field === f);

  it("기초 + 가산을 합쳐 최종값을 만든다", () => {
    assert.equal(by("atk")?.base, 1000);
    assert.equal(by("atk")?.add, 700); // 같은 스탯의 가산은 더한다
    assert.equal(by("atk")?.total, 1700);
  });

  it("가산만 있는 스탯도 행으로 나온다", () => {
    assert.equal(by("crit_rate")?.total, 0.35);
  });

  it("에너지 회복 효율은 값이 없어도 100% 로 넣는다", () => {
    assert.equal(by("sp_rate")?.total, 1);
  });

  it("인게임 순서(HP·공격력·방어력·속도…)를 지킨다", () => {
    const order = rows.map((r) => r.field);
    assert.ok(order.indexOf("hp") < order.indexOf("atk"));
    assert.ok(order.indexOf("atk") < order.indexOf("crit_rate"));
  });
});
