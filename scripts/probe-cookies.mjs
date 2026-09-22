// .env.local 의 HoYoLAB 쿠키 전부(본계정 + HOYOLAB_COOKIES)를 하나씩 검사한다. 값은 출력하지 않는다.
//   node scripts/probe-cookies.mjs            → 살아 있는지만 (한도 소모 없음)
//   node scripts/probe-cookies.mjs --full     → 주인 UID 의 전적 조회까지 (쿠키마다 UID 1개 소모)
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const full = process.argv.includes("--full");
const uid = env.NEXT_PUBLIC_OWNER_UID ?? "800133616";

const cookies = [];
if (env.HOYOLAB_LTUID_V2 && env.HOYOLAB_LTOKEN_V2) {
  cookies.push({ label: "본계정", ltuid: env.HOYOLAB_LTUID_V2, ltoken: env.HOYOLAB_LTOKEN_V2 });
}
(env.HOYOLAB_COOKIES ?? "")
  .split(/[\n,]+/)
  .map((s) => s.trim())
  .filter(Boolean)
  .forEach((p, i) => {
    const m1 = p.match(/ltuid_v2=(\d+)/);
    const m2 = p.match(/ltoken_v2=([^;\s]+)/);
    if (m1 && m2) return cookies.push({ label: `부계정${i + 1}`, ltuid: m1[1], ltoken: m2[1] });
    const k = p.indexOf(":");
    if (k > 0) cookies.push({ label: `부계정${i + 1}`, ltuid: p.slice(0, k).trim(), ltoken: p.slice(k + 1).trim() });
    else cookies.push({ label: `부계정${i + 1}`, ltuid: "", ltoken: "", bad: p.slice(0, 12) + "…" });
  });

function ds() {
  const t = Math.floor(Date.now() / 1000);
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let r = "";
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  const h = createHash("md5").update(`salt=6s25p5ox5y14umn1p61aqyyvbvvl3lrt&t=${t}&r=${r}`).digest("hex");
  return `${t},${r},${h}`;
}

async function call(url, ck) {
  const res = await fetch(url, {
    headers: {
      Cookie: `ltuid_v2=${ck.ltuid}; ltoken_v2=${ck.ltoken}`,
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
  return res.json();
}

console.log(`쿠키 ${cookies.length}개 검사`);
for (const ck of cookies) {
  if (ck.bad) {
    console.log(`- ${ck.label}: 형식 오류 (${ck.bad}) — "ltuid:ltoken" 이어야 함`);
    continue;
  }
  const shape = `ltuid ${ck.ltuid.length}자리${/^\d+$/.test(ck.ltuid) ? "" : "(숫자 아님!)"}, ltoken ${ck.ltoken.length}자${ck.ltoken.startsWith("v2_") ? "" : "(v2_ 로 안 시작!)"}`;
  const card = await call(`https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard?uid=${ck.ltuid}`, ck);
  const alive = card.retcode === 0;
  const roles = alive ? (card.data?.list ?? []).filter((r) => r.game_id === 6).map((r) => r.game_role_id) : [];
  let extra = "";
  if (alive && full) {
    const info = await call(
      `https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/avatar/info?server=prod_official_asia&role_id=${uid}&need_wiki=false`,
      ck,
    );
    extra = info.retcode === 0 ? ` · 남의 전적 조회 OK (${info.data?.avatar_list?.length}명)` : ` · 남의 전적 조회 실패: ${info.retcode} ${info.message}`;
  }
  console.log(
    `- ${ck.label} (ltuid ${ck.ltuid.slice(0, 3)}****): ${alive ? "살아 있음" : `실패 ${card.retcode} ${card.message}`} · ${shape}${
      roles.length ? ` · 연동 스타레일 UID ${roles.join(",")}` : alive ? " · 연동 게임 없음(괜찮음)" : ""
    }${extra}`,
  );
}
