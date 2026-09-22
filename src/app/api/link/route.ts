import { NextResponse } from "next/server";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { LINK_COOKIE, LINK_DAYS, parseCookieText, sealLink, validateCookie } from "@/lib/link";
import { getLinkedAccount } from "@/lib/viewer";

/**
 * GET    /api/link  → { linked, nickname?, uids?, at? }   현재 브라우저의 연결 상태
 * POST   /api/link  → body { text }  붙여넣은 쿠키 텍스트를 해석·확인하고 암호화 쿠키 발급
 * DELETE /api/link  → 연결 해제
 * 쿠키 값은 서버에 저장하지 않는다 — 암호화해서 방문자 브라우저에만 둔다.
 */
export async function GET() {
  const acc = await getLinkedAccount();
  if (!acc) return NextResponse.json({ linked: false });
  return NextResponse.json({ linked: true, nickname: acc.nickname, uids: acc.uids, at: acc.at });
}

export async function POST(req: Request) {
  const lang = await getLang();
  let text = "";
  try {
    const body = (await req.json()) as { text?: string };
    text = String(body.text ?? "");
  } catch {
    return NextResponse.json({ error: tr(lang, "link_bad_json") }, { status: 400 });
  }
  if (text.length > 20000) {
    return NextResponse.json({ error: tr(lang, "link_too_long") }, { status: 400 });
  }
  const parsed = parseCookieText(text);
  if (!parsed) {
    return NextResponse.json({ error: tr(lang, "link_not_found") }, { status: 400 });
  }
  const check = await validateCookie(parsed, lang);
  if (!check.ok) return NextResponse.json({ error: check.message }, { status: 400 });

  const acc = { ...parsed, nickname: check.nickname, uids: check.uids, at: Date.now() };
  const res = NextResponse.json({ linked: true, nickname: acc.nickname, uids: acc.uids, at: acc.at });
  res.cookies.set(LINK_COOKIE, sealLink(acc), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LINK_DAYS * 86400,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ linked: false });
  res.cookies.set(LINK_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
