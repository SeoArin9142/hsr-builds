import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * "이 UID 는 내 계정" 확인.
 * 사이트가 준 코드를 인게임 프로필 서명에 넣으면, 전시 API 가 돌려주는 서명에서 그 코드를 찾아 확인한다.
 * 확인되면 30일짜리 편집 토큰을 httpOnly 쿠키로 준다. (로그인·비밀번호 없음)
 * 사이트 주인은 EDIT_ADMIN_KEY 로 바로 토큰을 받을 수도 있다.
 */

const TOKEN_DAYS = 30;

function secret(): string {
  const s = process.env.EDIT_SECRET;
  if (!s) throw new Error("EDIT_SECRET 환경변수가 없습니다 (.env.local 참고)");
  return s;
}

function hmac(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("hex");
}

/** UID 마다 고정된 확인 코드 (예: HSRB-3F9A2C) */
export function claimCode(uid: string): string {
  return `HSRB-${hmac(`claim:${uid}`).slice(0, 6).toUpperCase()}`;
}

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
  const expected = hmac(`edit:${uid}:${tExp}`);
  if (expected.length !== sig.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export function checkAdminKey(key: string | undefined): boolean {
  const admin = process.env.EDIT_ADMIN_KEY;
  if (!admin || !key || admin.length !== key.length) return false;
  return timingSafeEqual(Buffer.from(admin), Buffer.from(key));
}
