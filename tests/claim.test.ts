import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

/**
 * 소유 확인 — 여기서 새는 게 있으면 남이 내 파티를 고칠 수 있으므로
 * "다른 브라우저는 다른 코드", "위조 토큰은 거부" 를 중점적으로 본다.
 */

let claim: typeof import("@/lib/claim");

before(async () => {
  process.env.EDIT_SECRET = "테스트-비밀키-0123456789";
  claim = await import("@/lib/claim");
});

describe("nonce (브라우저마다 다른 씨앗)", () => {
  it("발급한 nonce 는 다시 읽힌다", () => {
    const { value } = claim.issueNonce("800133616");
    assert.match(claim.readNonce("800133616", value) ?? "", /^[0-9a-f]{24}$/);
  });

  it("서명을 건드리면 거부한다", () => {
    const { value } = claim.issueNonce("800133616");
    const [nonce, sig] = value.split(".");
    const flipped = sig[0] === "a" ? "b" : "a";
    assert.equal(claim.readNonce("800133616", `${nonce}.${flipped}${sig.slice(1)}`), null);
  });

  it("다른 UID 의 nonce 로는 통하지 않는다", () => {
    const { value } = claim.issueNonce("800133616");
    assert.equal(claim.readNonce("600000000", value), null);
  });

  it("빈 값·엉뚱한 모양은 그냥 null", () => {
    assert.equal(claim.readNonce("800133616", undefined), null);
    assert.equal(claim.readNonce("800133616", "그냥문자열"), null);
    assert.equal(claim.readNonce("800133616", "zzz.zzz"), null);
  });
});

describe("확인 코드", () => {
  it("같은 UID·nonce 면 늘 같은 코드", () => {
    assert.equal(claim.claimCode("800133616", "abc"), claim.claimCode("800133616", "abc"));
    assert.match(claim.claimCode("800133616", "abc"), /^HSRB-[0-9A-F]{6}$/);
  });

  it("브라우저(nonce)가 다르면 코드도 다르다 — 서명에 코드를 남겨 둬도 남이 못 쓴다", () => {
    assert.notEqual(claim.claimCode("800133616", "abc"), claim.claimCode("800133616", "def"));
  });
});

describe("편집 토큰", () => {
  it("발급한 토큰은 그 UID 에서만 통한다", () => {
    const { value } = claim.issueToken("800133616");
    assert.equal(claim.verifyToken("800133616", value), true);
    assert.equal(claim.verifyToken("600000000", value), false);
  });

  it("UID 만 바꿔치기한 토큰은 거부", () => {
    const { value } = claim.issueToken("800133616");
    const [, exp, sig] = value.split(".");
    assert.equal(claim.verifyToken("600000000", `600000000.${exp}.${sig}`), false);
  });

  it("만료된 토큰은 거부", () => {
    const { value } = claim.issueToken("800133616");
    const [uid, , sig] = value.split(".");
    const past = Math.floor(Date.now() / 1000) - 10;
    assert.equal(claim.verifyToken(uid, `${uid}.${past}.${sig}`), false);
  });

  it("없는 토큰·쓰레기 값도 조용히 거부", () => {
    assert.equal(claim.verifyToken("800133616", undefined), false);
    assert.equal(claim.verifyToken("800133616", "aaa"), false);
  });

  it("관리자 키가 설정돼 있지 않으면 어떤 키도 통하지 않는다", () => {
    delete process.env.EDIT_ADMIN_KEY;
    assert.equal(claim.checkAdminKey("아무거나"), false);
  });
});
