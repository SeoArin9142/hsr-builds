import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/claim";
import { listFeedback } from "@/lib/feedback";
import { poolStatus } from "@/lib/hoyolab";
import { redisConfigured, redisGet } from "@/lib/redis";

/** 이번 달(KST) 요청 수와 자체 예산 */
async function monthUsage(): Promise<{ key: string; used: number; budget: number }> {
  const key = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7).replace("-", "");
  const used = redisConfigured() ? Number((await redisGet(`stats:req:${key}`).catch(() => null)) ?? 0) : 0;
  return { key, used, budget: Number(process.env.MONTHLY_BUDGET ?? "50000") };
}

/**
 * GET /api/admin/status  (헤더 x-admin-key: EDIT_ADMIN_KEY)
 * 사이트 쿠키 풀 상태(오늘 조회한 UID 수, 한도 소진, 만료 여부) + 최근 문의.
 */
export async function GET(req: Request) {
  if (!checkAdminKey(req.headers.get("x-admin-key") ?? undefined)) {
    return NextResponse.json({ error: "관리자 키가 틀립니다." }, { status: 403 });
  }
  const [pool, feedback, month] = await Promise.all([poolStatus(), listFeedback(50), monthUsage()]);
  return NextResponse.json({ ...pool, feedback, month });
}
