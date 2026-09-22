import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

/**
 * 방문자가 붙여넣는 쿠키는 형식이 제각각이라(헤더 한 줄, Cookie-Editor JSON, cookies.txt …)
 * 어느 쪽이든 읽히는지, 그리고 이상한 값이 헤더로 흘러가지 않는지 본다.
 */

let link: typeof import("@/lib/link");
const TOKEN = "v2_CAISDGFiY2RlZmdoaWprbA" + "=".repeat(2);

before(async () => {
  process.env.EDIT_SECRET = "테스트-비밀키-0123456789";
  link = await import("@/lib/link");
});

describe("parseCookieText — 붙여넣기 형식", () => {
  it("브라우저가 복사해 주는 쿠키 헤더 한 줄", () => {
    const text = `mi18nLang=ko-kr; ltuid_v2=123456789; ltoken_v2=${TOKEN}; ltmid_v2=abc`;
    assert.deepEqual(link.parseCookieText(text), { ltuid: "123456789", ltoken: TOKEN });
  });

  it("Cookie-Editor 가 내보내는 JSON 배열", () => {
    const text = JSON.stringify([
      { name: "ltmid_v2", value: "zzz" },
      { name: "ltoken_v2", value: TOKEN },
      { name: "ltuid_v2", value: "123456789" },
    ]);
    assert.deepEqual(link.parseCookieText(text), { ltuid: "123456789", ltoken: TOKEN });
  });

  it("개발자 도구에서 줄 단위로 긁어온 경우", () => {
    const text = `ltuid_v2\t123456789\nltoken_v2\t${TOKEN}\n`;
    assert.deepEqual(link.parseCookieText(text), { ltuid: "123456789", ltoken: TOKEN });
  });

  it("v2 가 없으면 옛 이름(ltuid·ltoken)도 받는다", () => {
    const text = `ltuid=123456789; ltoken=${TOKEN}`;
    assert.deepEqual(link.parseCookieText(text), { ltuid: "123456789", ltoken: TOKEN });
  });

  it("URL 인코딩된 토큰은 풀어서 돌려준다", () => {
    const raw = "v2_CAISDGFiY2RlZmdoaWprbA%3D%3D";
    const got = link.parseCookieText(`ltuid_v2=123456789; ltoken_v2=${raw}`);
    assert.equal(got?.ltoken, "v2_CAISDGFiY2RlZmdoaWprbA==");
  });
});

describe("parseCookieText — 걸러내야 하는 것", () => {
  it("빈 값·한쪽만 있는 값은 null", () => {
    assert.equal(link.parseCookieText(""), null);
    assert.equal(link.parseCookieText("   "), null);
    assert.equal(link.parseCookieText("ltuid_v2=123456789"), null);
    assert.equal(link.parseCookieText(`ltoken_v2=${TOKEN}`), null);
  });

  it("ltuid 가 숫자가 아니면 거부", () => {
    assert.equal(link.parseCookieText(`ltuid_v2=abcdefgh; ltoken_v2=${TOKEN}`), null);
  });

  it("토큰이 너무 짧으면 거부", () => {
    assert.equal(link.parseCookieText("ltuid_v2=123456789; ltoken_v2=short"), null);
  });

  it("줄바꿈이 섞인 토큰은 거부 — 헤더 주입 방지", () => {
    const evil = encodeURIComponent(`${TOKEN}\r\nX-Injected: 1`);
    assert.equal(link.parseCookieText(`ltuid_v2=123456789; ltoken_v2=${evil}`), null);
  });
});

describe("sealLink / openLink — 브라우저에 담는 암호문", () => {
  const acc = {
    ltuid: "123456789",
    ltoken: TOKEN,
    nickname: "서아린",
    uids: ["800133616"],
    at: 1_700_000_000_000,
  };

  it("봉인했다 풀면 그대로 나온다", () => {
    assert.deepEqual(link.openLink(link.sealLink(acc)), acc);
  });

  it("같은 내용이라도 매번 다른 암호문 (iv 가 새로 생긴다)", () => {
    assert.notEqual(link.sealLink(acc), link.sealLink(acc));
  });

  it("한 글자라도 건드리면 열리지 않는다", () => {
    const sealed = link.sealLink(acc);
    // 마지막 글자는 base64 에서 남는 비트가 있어 바꿔도 같은 바이트가 될 수 있다 — 중간을 건드린다
    const i = Math.floor(sealed.length / 2);
    const broken = sealed.slice(0, i) + (sealed[i] === "A" ? "B" : "A") + sealed.slice(i + 1);
    assert.equal(link.openLink(broken), null);
  });

  it("빈 값·쓰레기 값은 조용히 null", () => {
    assert.equal(link.openLink(undefined), null);
    assert.equal(link.openLink("!!!!"), null);
  });
});
