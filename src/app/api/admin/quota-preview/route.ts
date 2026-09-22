import type { NextRequest } from "next/server";
import { quotaPage } from "@/lib/quotaPage";

/** GET /api/admin/quota-preview — 월 한도 초과 안내 화면 미리보기 (민감한 정보 없음) */
export function GET(req: NextRequest) {
  return quotaPage(req);
}
