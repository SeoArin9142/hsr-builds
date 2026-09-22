// 파티 편집 API 흐름 점검 (관리자 키 사용). 비밀값은 출력하지 않는다.
//   node scripts/test-parties.mjs [uid] [baseUrl]
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const uid = process.argv[2] ?? env.NEXT_PUBLIC_OWNER_UID ?? "800133616";
const base = process.argv[3] ?? "http://localhost:3000";

const j = async (res) => ({ status: res.status, body: await res.json(), cookie: res.headers.get("set-cookie") });

const before = await j(await fetch(`${base}/api/u/${uid}/parties`));
console.log("GET parties:", before.status, "parties", before.body.parties?.length);

const claim = await j(await fetch(`${base}/api/u/${uid}/claim`));
console.log("GET claim:", claim.status, "code", claim.body.code, "verified", claim.body.verified, "nonce cookie:", Boolean(claim.cookie));
// 다른 브라우저(쿠키 없음)가 같은 UID 로 코드를 받으면 다른 코드여야 한다
const claim2 = await j(await fetch(`${base}/api/u/${uid}/claim`));
console.log("GET claim (other browser):", claim2.body.code, claim2.body.code !== claim.body.code ? "≠ (good)" : "SAME (bad)");
// nonce 쿠키 없이 서명 확인을 누르면 거부
const noNonce = await j(await fetch(`${base}/api/u/${uid}/claim`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }));
console.log("POST claim without nonce:", noNonce.status, noNonce.body.message);

const denied = await fetch(`${base}/api/u/${uid}/parties`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ parties: [] }),
});
console.log("PUT without token:", denied.status);

const wrong = await j(
  await fetch(`${base}/api/u/${uid}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminKey: "nope" }),
  }),
);
console.log("POST claim wrong key:", wrong.status, wrong.body.message);

const ok = await j(
  await fetch(`${base}/api/u/${uid}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminKey: env.EDIT_ADMIN_KEY }),
  }),
);
console.log("POST claim admin key:", ok.status, ok.body.message, "cookie set:", Boolean(ok.cookie));
const cookie = ok.cookie?.split(";")[0];

const payload = {
  parties: [
    { name: "파티8", note: "인게임 파티8", members: ["1310", "1321", "1303", "1403"] },
    { name: "  테스트 파티  이름이 아주 아주 길어서 잘려야 함", note: "", members: ["1303", "1303", "abc", "1415", "1409", "1407", "1413"] },
  ],
};
const saved = await j(
  await fetch(`${base}/api/u/${uid}/parties`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(payload),
  }),
);
console.log("PUT with token:", saved.status, JSON.stringify(saved.body.parties?.[1]));

const tooMany = await j(
  await fetch(`${base}/api/u/${uid}/parties`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ parties: Array.from({ length: 13 }, (_, i) => ({ name: `p${i}`, members: [] })) }),
  }),
);
console.log("PUT 13 parties:", tooMany.status, tooMany.body.error);

// 원래 상태(파티8 하나)로 되돌린다
const restore = await j(
  await fetch(`${base}/api/u/${uid}/parties`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ parties: [payload.parties[0]] }),
  }),
);
console.log("restore:", restore.status, "parties", restore.body.parties?.length);
