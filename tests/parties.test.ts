import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_MEMBERS, MAX_PARTIES, sanitizeParties } from "@/lib/partyStore";
import { floorName } from "@/lib/endgame";

/** 파티 저장은 남이 보낸 JSON 을 그대로 받으므로, 들어오는 값을 어디까지 깎는지 확인한다. */

function ok(input: unknown) {
  const r = sanitizeParties(input);
  assert.ok(Array.isArray(r), typeof r === "string" ? r : "");
  return r;
}

describe("sanitizeParties", () => {
  it("보낸 순서대로 1번부터 번호를 다시 매긴다", () => {
    const r = ok([{ name: "가", members: [] }, { name: "나", members: [] }]);
    assert.deepEqual(r.map((p) => p.no), [1, 2]);
  });

  it("이름이 비면 기본 이름을 넣는다", () => {
    assert.equal(ok([{ members: [] }])[0].name, "파티1");
  });

  it("이름·메모는 길이를 자르고 공백을 정리한다", () => {
    const r = ok([{ name: "가".repeat(50), note: "  메모   여러  칸  ", members: [] }]);
    assert.equal(r[0].name.length, 20);
    assert.equal(r[0].note, "메모 여러 칸");
  });

  it("메모가 비면 아예 넣지 않는다", () => {
    assert.equal("note" in ok([{ name: "가", note: "  ", members: [] }])[0], false);
  });

  it("캐릭터는 4자리 숫자만, 최대 4명", () => {
    const r = ok([{ name: "가", members: ["1310", "1225", "1005", "1217", "1001"] }]);
    assert.equal(r[0].members.length, MAX_MEMBERS);
  });

  it("같은 캐릭터를 두 번 넣으면 하나만 남는다", () => {
    assert.deepEqual(ok([{ name: "가", members: ["1310", "1310", "1225"] }])[0].members, ["1310", "1225"]);
  });

  it("캐릭터 id 가 아닌 값은 버린다", () => {
    assert.deepEqual(ok([{ name: "가", members: ["abc", "12", "../../etc", 1310, null] }])[0].members, ["1310"]);
  });

  it("배열이 아니거나 12개를 넘으면 이유를 돌려준다", () => {
    assert.equal(typeof sanitizeParties({ nope: 1 }), "string");
    assert.equal(typeof sanitizeParties(Array.from({ length: MAX_PARTIES + 1 }, () => ({}))), "string");
  });

  it("빈 목록은 그대로 통과 (파티를 모두 지우는 경우)", () => {
    assert.deepEqual(ok([]), []);
  });
});

describe("floorName — HoYoLAB 이 층 이름 뒤에 모드 이름을 붙여 보낸다", () => {
  it("층 번호 뒤를 잘라낸다", () => {
    assert.equal(floorName("폭풍 소탕•12스타라이즈 모드"), "폭풍 소탕•12");
    assert.equal(floorName("Storm Sweep•12Starrise Mode"), "Storm Sweep•12");
  });

  it("괄호로 끝나는 이름도 살린다", () => {
    assert.equal(floorName("제4구역 (하)어쩌고"), "제4구역 (하)");
  });

  it("숫자가 없으면 그대로", () => {
    assert.equal(floorName("종말의 그림자"), "종말의 그림자");
  });

  it("빈 값·줄바꿈을 견딘다", () => {
    assert.equal(floorName(""), "");
    assert.equal(floorName("1층\n둘째 줄"), "1");
  });
});
