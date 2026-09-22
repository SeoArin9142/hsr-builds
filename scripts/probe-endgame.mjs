// HoYoLAB 엔드 콘텐츠(혼돈의 기억·허구 서사·종말의 그림자) 응답 모양 점검.
//   node scripts/probe-endgame.mjs [uid]
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const uid = process.argv[2] ?? env.NEXT_PUBLIC_OWNER_UID ?? "800133616";
const server = { 6: "prod_official_usa", 7: "prod_official_eur", 8: "prod_official_asia", 9: "prod_official_cht" }[uid[0]];

function ds() {
  const salt = "6s25p5ox5y14umn1p61aqyyvbvvl3lrt";
  const t = Math.floor(Date.now() / 1000);
  const r = Math.random().toString(36).slice(2, 8);
  return `${t},${r},${createHash("md5").update(`salt=${salt}&t=${t}&r=${r}`).digest("hex")}`;
}

async function call(path) {
  const res = await fetch(`https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/${path}`, {
    headers: {
      Cookie: `ltuid_v2=${env.HOYOLAB_LTUID_V2}; ltoken_v2=${env.HOYOLAB_LTOKEN_V2}`,
      DS: ds(),
      "x-rpc-app_version": "1.5.0",
      "x-rpc-client_type": "5",
      "x-rpc-language": "ko-kr",
      Origin: "https://act.hoyolab.com",
      Referer: "https://act.hoyolab.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
    cache: "no-store",
  });
  return res.json();
}

const endpoints = [
  ["challenge (혼돈의 기억) 현재", `challenge?server=${server}&role_id=${uid}&schedule_type=1&need_all=true`],
  ["challenge 지난 기", `challenge?server=${server}&role_id=${uid}&schedule_type=2&need_all=true`],
  ["challenge_story (허구 서사)", `challenge_story?server=${server}&role_id=${uid}&schedule_type=1&need_all=true`],
  ["challenge_boss (종말의 그림자)", `challenge_boss?server=${server}&role_id=${uid}&schedule_type=1&need_all=true`],
  ["index (요약)", `index?server=${server}&role_id=${uid}`],
];

const dump = {};
for (const [label, path] of endpoints) {
  const body = await call(path);
  dump[label] = body;
  console.log(`\n=== ${label} → retcode ${body.retcode} ${body.message}`);
  if (body.retcode !== 0) continue;
  const d = body.data ?? {};
  console.log("keys:", Object.keys(d).join(", "));
  if ("groups" in d) console.log("groups:", JSON.stringify(d.groups)?.slice(0, 400));
  if ("all_floor_detail" in d) {
    const f = d.all_floor_detail?.[0];
    console.log("floors:", d.all_floor_detail?.length, "star_num:", d.star_num, "max_floor:", d.max_floor, "battle_num:", d.battle_num);
    if (f) {
      console.log("floor keys:", Object.keys(f).join(", "));
      console.log(
        "floor0:",
        JSON.stringify({
          name: f.name,
          star_num: f.star_num,
          round_num: f.round_num,
          is_fast: f.is_fast,
          node1_time: f.node_1?.challenge_time,
          node1_avatars: f.node_1?.avatars?.map((a) => `${a.name}(id ${a.id}, E${a.rank}, lv${a.level})`),
          node2_avatars: f.node_2?.avatars?.map((a) => a.name),
          node1_extra: Object.keys(f.node_1 ?? {}),
        }),
      );
    }
  }
  if ("stats" in d) console.log("stats:", JSON.stringify(d.stats).slice(0, 300));
}
const out = new URL("../.probe-endgame.json", import.meta.url);
writeFileSync(out, JSON.stringify(dump, null, 2));
console.log("\nsaved →", out.pathname);
