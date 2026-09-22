import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * "이 UID 는 내 계정" 확인.
 *
 * 흐름: [파티 편집] 을 연 브라우저에 무작위 nonce 를 쿠키로 주고, 그 nonce 로 만든 코드(HSRB-XXXXXX)를
 * 보여 준다 → 주인이 인게임 프로필 서명에 코드를 넣는다 → [서명 확인] 을 누르면 서버가 *그 브라우저의*
 * nonce 로 코드를 다시 만들어 전시 API 가 돌려주는 서명에서 찾는다 → 있으면 30일 편집 토큰(httpOnly 쿠키).
 *
 * 코드가 브라우저(nonce)마다 다르므로, 서명에 코드를 지우지 않고 두어도 다른 사람은 그 코드로 통과할 수 없다
 * (다른 브라우저는 다른 nonce → 다른 코드). nonce 는 서버 서명이 붙어 있어 위조할 수 없고, 확인이 끝나면 지운다.
 * 사이트 주인은 EDIT_ADMIN_KEY 로 바로 토큰을 받을 수도 있다.
 */

const TOKEN_DAYS = 30;
const NONCE_DAYS = 2; // 코드를 받고 게임에서 서명을 바꿀 때까지의 여유

function secret(): string {
  const s = process.env.EDIT_SECRET;
  if (!s) throw new Error("EDIT_SECRET 환경변수가 없습니다 (.env.local 참고)");
  return s;
}

function hmac(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/* ---------- nonce (브라우저마다 다른 확인 코드의 씨앗) ---------- */

export function nonceCookieName(uid: string): string {
  return `hsrb_claim_${uid}`;
}

/** 새 nonce 쿠키 값: nonce.서명 */
export function issueNonce(uid: string): { value: string; maxAge: number } {
  const nonce = randomBytes(12).toString("hex");
  return { value: `${nonce}.${hmac(`nonce:${uid}:${nonce}`)}`, maxAge: NONCE_DAYS * 86400 };
}

/** 쿠키 값에서 서버가 발급한 nonce 만 꺼낸다 (위조면 null) */
export function readNonce(uid: string, cookie: string | undefined): string | null {
  if (!cookie) return null;
  const [nonce, sig] = cookie.split(".");
  if (!nonce || !sig || !/^[0-9a-f]{24}$/.test(nonce)) return null;
  return safeEqual(hmac(`nonce:${uid}:${nonce}`), sig) ? nonce : null;
}

/** 확인 코드 (예: HSRB-3F9A2C) — UID 와 그 브라우저의 nonce 로 결정된다 */
export function claimCode(uid: string, nonce: string): string {
  return `HSRB-${hmac(`claim:${uid}:${nonce}`).slice(0, 6).toUpperCase()}`;
}

/* ---------- 편집 토큰 ---------- */

export function cookieName(uid: string): string {
  return `hsrb_edit_${uid}`;
}

export function issueToken(uid: string): { value: string; maxAge: number } {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_DAYS * 86400;
  return { value: `${uid}.${exp}.${hmac(`edit:${uid}:${exp}`)}`, maxAge: TOKEN_DAYS * 86400 };
}

export function verifyToken(uid: string, token: string | undefined): boolean {
  if (!token) return false;
  const [tUid, tExp, sig] = token.split(".");
  if (tUid !== uid || !tExp || !sig) return false;
  if (Number(tExp) < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(hmac(`edit:${uid}:${tExp}`), sig);
}

export function checkAdminKey(key: string | undefined): boolean {
  const admin = process.env.EDIT_ADMIN_KEY;
  if (!admin || !key) return false;
  return safeEqual(admin, key);
}
