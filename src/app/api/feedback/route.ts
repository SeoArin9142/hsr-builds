import { NextResponse } from "next/server";
import { addFeedback, allowFeedback, MAX_MESSAGE } from "@/lib/feedback";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/** POST /api/feedback  body: { message, contact?, page? } */
export async function POST(req: Request) {
  const lang = await getLang();
  let body: { message?: string; contact?: string; page?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: tr(lang, "fb_fail") }, { status: 400 });
  }
  const message = String(body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: tr(lang, "fb_empty") }, { status: 400 });
  if (message.length > MAX_MESSAGE) return NextResponse.json({ error: tr(lang, "fb_fail") }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!(await allowFeedback(ip))) {
    return NextResponse.json({ error: tr(lang, "fb_too_many") }, { status: 429 });
  }
  try {
    await addFeedback({ message, contact: body.contact, page: body.page });
  } catch (e) {
    console.error("[feedback] 저장 실패", e);
    return NextResponse.json({ error: tr(lang, "fb_fail") }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
