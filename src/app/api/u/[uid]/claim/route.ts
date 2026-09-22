import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  checkAdminKey,
  claimCode,
  cookieName,
  issueNonce,
  issueToken,
  nonceCookieName,
  readNonce,
  verifyToken,
} from "@/lib/claim";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { UID_PATTERN } from "@/lib/mihomo";
import { clientIp, rateLimit } from "@/lib/ratelimit";

/**
 * GET  /api/u/{uid}/claim  → { code, verified }
 *      이 브라우저 전용 확인 코드. nonce 쿠키가 없으면 새로 발급한다.
 * POST /api/u/{uid}/claim  → 서명에서 *이 브라우저의* 코드를 찾아 편집 토큰(쿠키) 발급.
 *      body: { adminKey?: string } 이면 관리자 키로 바로 발급.
 */
const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function GET(_req: Request, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const lang = await getLang();
  if (!UID_PATTERN.test(uid)) return NextResponse.json({ error: tr(lang, "api_uid_format") }, { status: 400 });
  const jar = await cookies();
  const verified = verifyToken(uid, jar.get(cookieName(uid))?.value);

  let nonce = readNonce(uid, jar.get(nonceCookieName(uid))?.value);
  let issued: ReturnType<typeof issueNonce> | null = null;
  if (!nonce) {
    issued = issueNonce(uid);
    nonce = issued.value.split(".")[0];
  }
  const res = NextResponse.json({ code: claimCode(uid, nonce), verified });
  if (issued) res.cookies.set(nonceCookieName(uid), issued.value, { ...cookieOpts, maxAge: issued.maxAge });
  return res;
}

export async function POST(req: Request, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const lang = await getLang();
  if (!UID_PATTERN.test(uid)) return NextResponse.json({ error: tr(lang, "api_uid_format") }, { status: 400 });
  // 코드 맞히기 시도 방지
  if (!(await rateLimit(`claim:${clientIp(req)}`, 10, 600))) {
    return NextResponse.json({ verified: false, message: tr(lang, "api_too_many") }, { status: 429 });
  }

  let adminKey: string | undefined;
  try {
    const body = (await req.json()) as { adminKey?: string };
    adminKey = body.adminKey;
  } catch {
    // body 없음
  }

  let ok = false;
  let message = "";
  if (adminKey !== undefined) {
    ok = checkAdminKey(adminKey);
    message = tr(lang, ok ? "claim_admin_ok" : "claim_admin_bad");
  } else {
    const jar = await cookies();
    const nonce = readNonce(uid, jar.get(nonceCookieName(uid))?.value);
    if (!nonce) {
      return NextResponse.json({ verified: false, message: tr(lang, "claim_no_code") }, { status: 403 });
    }
    const code = claimCode(uid, nonce);
    // 전시 API 를 캐시 없이 다시 읽어 서명을 확인한다 (Mihomo 쪽 캐시 때문에 몇 분 걸릴 수 있음)
    try {
      const res = await fetch(`https://api.mihomo.me/sr_info_parsed/${uid}?lang=kr`, {
        headers: { "User-Agent": "hsr-builds/0.1 (claim check)" },
        cache: "no-store",
      });
      if (!res.ok) {
        message = tr(lang, "claim_api_error", { status: res.status });
      } else {
        const data = (await res.json()) as { player?: { signature?: string } };
        const sig = data.player?.signature ?? "";
        ok = sig.toUpperCase().includes(code);
        message = ok
          ? tr(lang, "claim_ok")
          : tr(lang, "claim_missing", { code, sig: sig || tr(lang, "claim_sig_empty") });
      }
    } catch {
      message = tr(lang, "claim_conn");
    }
  }

  if (!ok) return NextResponse.json({ verified: false, message }, { status: 403 });

  const token = issueToken(uid);
  const res = NextResponse.json({ verified: true, message });
  res.cookies.set(cookieName(uid), token.value, { ...cookieOpts, maxAge: token.maxAge });
  res.cookies.set(nonceCookieName(uid), "", { path: "/", maxAge: 0 }); // 쓴 코드는 버린다
  return res;
}
