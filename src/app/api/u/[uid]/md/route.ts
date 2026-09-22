import { normalizeRoster, showcaseToMarkdown } from "@/lib/normalize";
import { getParties } from "@/lib/parties";
import { getRoster } from "@/lib/roster";
import { getViewerCookie } from "@/lib/viewer";

/**
 * GET /api/u/{uid}/md              캐릭터 전체(전시 + HoYoLAB)를 마크다운으로
 * GET /api/u/{uid}/md?c=1303       캐릭터 하나만
 * GET /api/u/{uid}/md?showcase=1   전시 캐릭터만
 * AI 에게 "이 주소 읽고 평가해 줘" 하고 넘기거나, 상세 페이지의 복사 버튼이 쓴다.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { uid } = await params;
  const viewer = await getViewerCookie();
  const [result, parties] = await Promise.all([getRoster(uid, { viewer }), getParties(uid)]);
  if (!result.ok) {
    return new Response(`오류: ${result.message}\n`, {
      status: result.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const q = new URL(request.url).searchParams;
  const md = showcaseToMarkdown(normalizeRoster(result.roster, parties), {
    only: q.get("c") ?? undefined,
    showcaseOnly: q.get("showcase") === "1",
  });
  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}
