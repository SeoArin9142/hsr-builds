// [내 계정 연결] API 흐름 점검. 쿠키 값은 출력하지 않는다.
//   node scripts/test-link.mjs [baseUrl]
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const base = process.argv[2] ?? "http://localhost:3000";
const post = (text) =>
  fetch(`${base}/api/link`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });

let r = await post("hello world");
console.log("garbage:", r.status, (await r.json()).error);

r = await post("ltuid_v2=123456; ltoken_v2=v2_notarealtoken");
console.log("fake cookie:", r.status, (await r.json()).error);

// Cookie-Editor 가 내보내는 JSON 형식으로 실제 쿠키를 넣어 본다
const json = JSON.stringify([
  { domain: ".hoyolab.com", name: "ltuid_v2", value: env.HOYOLAB_LTUID_V2, path: "/" },
  { domain: ".hoyolab.com", name: "ltoken_v2", value: env.HOYOLAB_LTOKEN_V2, path: "/", httpOnly: true },
  { domain: ".hoyolab.com", name: "mi18nLang", value: "ko-kr", path: "/" },
]);
r = await post(json);
const body = await r.json();
console.log("real cookie (json):", r.status, body.error ?? { linked: body.linked, nickname: body.nickname, uids: body.uids });
const cookie = r.headers.get("set-cookie")?.split(";")[0];
console.log("cookie set:", Boolean(cookie), "len", cookie?.length);

// 헤더 형식도 되는지
r = await post(`Cookie: ltuid_v2=${env.HOYOLAB_LTUID_V2}; ltoken_v2=${env.HOYOLAB_LTOKEN_V2}; x=y`);
console.log("real cookie (header):", r.status, (await r.json()).uids);

// 연결된 상태로 조회하면 via_viewer 가 true 여야 한다 (캐시 무시하려고 refresh 는 안 씀 — 같은 UID 라 한도 소모 없음)
r = await fetch(`${base}/api/link`, { headers: { Cookie: cookie } });
console.log("GET status:", await r.json());
r = await fetch(`${base}/api/u/${env.NEXT_PUBLIC_OWNER_UID}`, { headers: { Cookie: cookie } });
const d = await r.json();
console.log("roster via viewer:", d.sources);

r = await fetch(`${base}/api/link`, { method: "DELETE", headers: { Cookie: cookie } });
console.log("unlink:", (await r.json()).linked);
