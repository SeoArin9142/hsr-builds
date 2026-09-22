import { NextResponse } from "next/server";
import { getShowcase } from "@/lib/mihomo";
import { normalizeRoster } from "@/lib/normalize";
import { getParties } from "@/lib/parties";
import { getRoster } from "@/lib/roster";
import { getViewerCookie } from "@/lib/viewer";

/**
 * GET /api/u/{uid}
 * 정리된 JSON (전시 + HoYoLAB 전적을 합친 캐릭터 전체). 기초/가산/최종 스탯이 합쳐져 있다.
 * ?raw=1 이면 Mihomo 전시 원본만 그대로 돌려준다.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { uid } = await params;
  const raw = new URL(request.url).searchParams.get("raw");
  if (raw) {
    const showcase = await getShowcase(uid);
    if (!showcase.ok) {
      return NextResponse.json({ error: showcase.message }, { status: showcase.status });
    }
    return NextResponse.json(showcase.data);
  }
  const viewer = await getViewerCookie();
  const [result, parties] = await Promise.all([getRoster(uid, { viewer }), getParties(uid)]);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json(normalizeRoster(result.roster, parties), {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
  });
}
