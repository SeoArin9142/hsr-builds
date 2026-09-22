import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/claim";
import { poolStatus } from "@/lib/hoyolab";

/**
 * GET /api/admin/status  (헤더 x-admin-key: EDIT_ADMIN_KEY)
 * 사이트 쿠키 풀 상태 — 오늘 조회한 UID 수, 한도 소진, 만료 여부.
 */
export async function GET(req: Request) {
  if (!checkAdminKey(req.headers.get("x-admin-key") ?? undefined)) {
    return NextResponse.json({ error: "관리자 키가 틀립니다." }, { status: 403 });
  }
  return NextResponse.json(await poolStatus());
}
