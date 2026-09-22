import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { headersFor, type HoyoCookie } from "./hoyolab";
import { tr, type Lang } from "./i18n";

/**
 * "내 계정 연결": 방문자가 자기 HoYoLAB 쿠키를 붙여넣으면
 *  1) 형식을 가리지 않고 ltuid_v2 / ltoken_v2 만 뽑고
 *  2) HoYoLAB 에 물어봐 살아 있는 쿠키인지·어느 UID 계정인지 확인한 뒤
 *  3) 서버 키로 암호화해 그 방문자의 브라우저 쿠키(httpOnly)에만 넣는다. 서버에는 저장하지 않는다.
 * 이후 그 방문자의 조회는 그 쿠키(= 그 사람의 하루 30 UID 한도)로 나간다.
 */

export const LINK_COOKIE = "hsrb_hoyo";
export const LINK_DAYS = 30;

export interface LinkedAccount {
  ltuid: string;
  ltoken: string;
  nickname: string; // HoYoLAB 닉네임
  uids: string[]; // 이 계정의 스타레일 UID 들
  at: number; // 연결 시각 (epoch ms)
}

/* ---------- 붙여넣은 텍스트에서 쿠키 뽑기 ---------- */

const VALUE = "[A-Za-z0-9_\\-\\.=+/%]+";

function pick(text: string, name: string): string | null {
  // JSON (Cookie-Editor export 등): {"name":"ltoken_v2","value":"..."}
  try {
    const parsed = JSON.parse(text) as unknown;
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const it of items) {
      if (it && typeof it === "object") {
        const o = it as Record<string, unknown>;
        if (o.name === name && typeof o.value === "string") return o.value;
        if (typeof o[name] === "string") return o[name] as string;
      }
    }
  } catch {
    // JSON 이 아니면 아래로
  }
  // cookies.txt (탭 구분: ... name \t value), 헤더("name=value; ..."), "name: value", 줄 단위 어떤 것이든
  const re = new RegExp(`${name}(?:\\t|\\s*[=:]\\s*|\\s*"?\\s*[,:]\\s*"?)(${VALUE})`);
  const m = text.match(re);
  if (m) return m[1];
  // "name"  "value" 처럼 따옴표로 둘러싸인 경우
  const m2 = text.match(new RegExp(`${name}["'\\s]+(${VALUE})`));
  return m2 ? m2[1] : null;
}

export function parseCookieText(text: string): { ltuid: string; ltoken: string } | null {
  const t = text.trim();
  if (!t) return null;
  const ltuid = pick(t, "ltuid_v2") ?? pick(t, "ltuid");
  const ltoken = pick(t, "ltoken_v2") ?? pick(t, "ltoken");
  if (!ltuid || !ltoken) return null;
  if (!/^\d{5,12}$/.test(ltuid)) return null;
  return { ltuid, ltoken: decodeURIComponent(ltoken) };
}

/* ---------- HoYoLAB 에 확인 ---------- */

interface RecordCard {
  retcode: number;
  message: string;
  data?: {
    list?: { game_id: number; game_role_id: string; nickname: string; region: string; level: number }[];
  };
}

export type ValidateResult =
  | { ok: true; nickname: string; uids: string[] }
  | { ok: false; message: string };

/** 쿠키가 살아 있는지, 어느 스타레일 UID 의 계정인지 HoYoLAB 게임 기록 카드로 확인한다 */
export async function validateCookie(
  ck: { ltuid: string; ltoken: string },
  lang: Lang = "ko",
): Promise<ValidateResult> {
  let res: Response;
  try {
    res = await fetch(
      `https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard?uid=${ck.ltuid}`,
      { headers: headersFor(ck, lang), cache: "no-store", signal: AbortSignal.timeout(15000) },
    );
  } catch {
    return { ok: false, message: tr(lang, "link_conn") };
  }
  if (!res.ok) return { ok: false, message: tr(lang, "link_http", { status: res.status }) };
  const body = (await res.json()) as RecordCard;
  if (body.retcode !== 0) {
    if (body.retcode === 10001 || body.retcode === -100) {
      return { ok: false, message: tr(lang, "link_invalid") };
    }
    return { ok: false, message: tr(lang, "link_hoyo_error", { code: body.retcode, msg: body.message }) };
  }
  const roles = (body.data?.list ?? []).filter((r) => r.game_id === 6); // 6 = 붕괴: 스타레일
  const uids = roles.map((r) => String(r.game_role_id));
  const nickname = roles[0]?.nickname ?? "";
  return { ok: true, nickname, uids };
}

/* ---------- 암호화한 브라우저 쿠키 ---------- */

function key(): Buffer {
  const secret = process.env.EDIT_SECRET;
  if (!secret) throw new Error("EDIT_SECRET 환경변수가 없습니다");
  return createHash("sha256").update(`hoyo-link:${secret}`).digest();
}

export function sealLink(acc: LinkedAccount): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(acc), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64url");
}

export function openLink(sealed: string | undefined): LinkedAccount | null {
  if (!sealed) return null;
  try {
    const buf = Buffer.from(sealed, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
    const acc = JSON.parse(json) as LinkedAccount;
    if (!acc.ltuid || !acc.ltoken) return null;
    return acc;
  } catch {
    return null; // 키가 바뀌었거나 손상된 쿠키
  }
}

export function toHoyoCookie(acc: LinkedAccount): HoyoCookie {
  return { id: `user:${acc.ltuid}`, ltuid: acc.ltuid, ltoken: acc.ltoken, owned: true, uids: acc.uids };
}
