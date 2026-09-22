import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieName, verifyToken } from "@/lib/claim";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { UID_PATTERN } from "@/lib/mihomo";
import { readParties, sanitizeParties, writeParties } from "@/lib/partyStore";

/**
 * GET /api/u/{uid}/parties → 저장된 파티 편성 (없으면 빈 목록)
 * PUT /api/u/{uid}/parties → 저장. body: { parties: [{ name, note?, members: [id...] }] }
 *                             편집 토큰 쿠키(/api/u/{uid}/claim 으로 발급) 필요.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  if (!UID_PATTERN.test(uid)) {
    return NextResponse.json({ error: tr(await getLang(), "api_uid_format") }, { status: 400 });
  }
  const file = await readParties(uid);
  return NextResponse.json(file ?? { uid, parties: [] });
}

export async function PUT(req: Request, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const lang = await getLang();
  if (!UID_PATTERN.test(uid)) return NextResponse.json({ error: tr(lang, "api_uid_format") }, { status: 400 });

  const jar = await cookies();
  if (!verifyToken(uid, jar.get(cookieName(uid))?.value)) {
    return NextResponse.json({ error: tr(lang, "parties_forbidden") }, { status: 403 });
  }

  let body: { parties?: unknown };
  try {
    body = (await req.json()) as { parties?: unknown };
  } catch {
    return NextResponse.json({ error: tr(lang, "parties_bad_json") }, { status: 400 });
  }
  const parties = sanitizeParties(body.parties, lang);
  if (typeof parties === "string") return NextResponse.json({ error: parties }, { status: 400 });

  const file = { uid, updated: new Date().toISOString().slice(0, 10), parties };
  try {
    await writeParties(uid, file);
  } catch (e) {
    console.error("[parties] 저장 실패", e);
    return NextResponse.json({ error: tr(lang, "parties_save_failed") }, { status: 500 });
  }
  return NextResponse.json(file);
}
