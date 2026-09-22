// HoYoLAB 전적 API 연결 점검. 쿠키 값은 절대 출력하지 않는다.
//   node scripts/probe-hoyolab.mjs [uid]
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const uid = process.argv[2] ?? env.NEXT_PUBLIC_OWNER_UID ?? "800133616";
const ltuid = env.HOYOLAB_LTUID_V2;
const ltoken = env.HOYOLAB_LTOKEN_V2;
if (!ltuid || !ltoken) {
  console.error("HOYOLAB_LTUID_V2 / HOYOLAB_LTOKEN_V2 가 .env.local 에 없습니다.");
  process.exit(1);
}
console.log(`cookie: ltuid ${ltuid.length}자리, ltoken ${ltoken.length}자 (${ltoken.slice(0, 3)}...)`);

const SERVER = { 6: "prod_official_usa", 7: "prod_official_eur", 8: "prod_official_asia", 9: "prod_official_cht" };
const server = SERVER[uid[0]];
if (!server) {
  console.error(`UID ${uid} 는 글로벌 서버가 아닙니다 (첫 자리 6/7/8/9 만 지원).`);
  process.exit(1);
}

function ds() {
  const salt = "6s25p5ox5y14umn1p61aqyyvbvvl3lrt";
  const t = Math.floor(Date.now() / 1000);
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let r = "";
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  const h = createHash("md5").update(`salt=${salt}&t=${t}&r=${r}`).digest("hex");
  return `${t},${r},${h}`;
}

const url = `https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/avatar/info?server=${server}&role_id=${uid}&need_wiki=false`;
const res = await fetch(url, {
  headers: {
    Cookie: `ltuid_v2=${ltuid}; ltoken_v2=${ltoken}`,
    DS: ds(),
    "x-rpc-app_version": "1.5.0",
    "x-rpc-client_type": "5",
    "x-rpc-language": "ko-kr",
    Origin: "https://act.hoyolab.com",
    Referer: "https://act.hoyolab.com/",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  },
});
console.log("http", res.status);
const body = await res.json();
console.log("retcode", body.retcode, "message", body.message);
if (body.retcode !== 0) process.exit(2);

const d = body.data;
console.log("data keys:", Object.keys(d));
console.log("avatar_list:", d.avatar_list?.length);
const a = d.avatar_list?.[0];
if (a) {
  console.log("avatar keys:", Object.keys(a));
  console.log("first:", a.name, "lv", a.level, "rank", a.rank, "element", a.element, "base_type", a.base_type);
  console.log("equip:", a.equip && { id: a.equip.id, name: a.equip.name, level: a.equip.level, rank: a.equip.rank, rarity: a.equip.rarity, keys: Object.keys(a.equip) });
  console.log("relic0:", a.relics?.[0] && { ...a.relics[0], wiki: undefined, desc: undefined });
  console.log("ornament0 keys:", a.ornaments?.[0] && Object.keys(a.ornaments[0]));
  console.log("properties:", a.properties?.slice(0, 20));
  console.log("skills[0..3]:", a.skills?.slice(0, 3));
  console.log("skills count:", a.skills?.length, "ranks:", a.ranks?.length, "ranks[0] keys:", a.ranks?.[0] && Object.keys(a.ranks[0]));
}
console.log("property_info sample:", d.property_info && Object.entries(d.property_info).slice(0, 5));
console.log("relic_properties sample:", d.relic_properties?.slice(0, 3));
const out = new URL("../.probe-hoyolab.json", import.meta.url);
writeFileSync(out, JSON.stringify(d, null, 2));
console.log("saved full data →", out.pathname);
