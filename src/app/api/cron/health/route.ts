import { NextResponse } from "next/server";
import { alert } from "@/lib/alert";
import { checkAdminKey } from "@/lib/claim";
import { poolCookies, poolStatus } from "@/lib/hoyolab";
import { getKV } from "@/lib/kvstore";
import { validateCookie } from "@/lib/link";
import { redisConfigured, redisGet } from "@/lib/redis";
import { SITE_URL } from "@/lib/site";

/**
 * GET /api/cron/health — 하루 한 번 (vercel.json 의 crons) 사이트 건강 검진.
 *
 *  1) 사이트 쿠키 풀의 쿠키가 아직 살아 있는지 (만료되면 남의 UID 를 볼 수 없게 된다)
 *  2) 이번 달 요청 수가 예산의 80% 를 넘었는지
 * 문제가 있으면 ALERT_WEBHOOK 으로 알린다 (없으면 서버 로그에만).
 *
 * 인증: Vercel Cron 이 보내는 Authorization: Bearer $CRON_SECRET,
 *       또는 손으로 부를 때 x-admin-key: $EDIT_ADMIN_KEY.
 */

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  if (checkAdminKey(req.headers.get("x-admin-key") ?? undefined)) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // CRON_SECRET 이 없으면 아무나 부를 수 없게 막는다
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function monthUsage(): Promise<{ used: number; budget: number; ratio: number }> {
  const key = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7).replace("-", "");
  const used = redisConfigured() ? Number((await redisGet(`stats:req:${key}`).catch(() => null)) ?? 0) : 0;
  const budget = Number(process.env.MONTHLY_BUDGET ?? "50000");
  return { used, budget, ratio: budget > 0 ? used / budget : 0 };
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const kv = getKV();
  const cookies = poolCookies();
  const checked: { id: string; ok: boolean; uids: number; message?: string }[] = [];
  const dead: string[] = [];

  for (const ck of cookies) {
    const r = await validateCookie(ck);
    if (r.ok) {
      checked.push({ id: ck.id, ok: true, uids: r.uids.length });
      await kv.del(`hoyo:dead:${ck.id}`).catch(() => {});
    } else {
      checked.push({ id: ck.id, ok: false, uids: 0, message: r.message });
      dead.push(ck.id);
      // 풀에서 당분간 건너뛰게 표시해 둔다 (살아나면 다음 점검 때 풀린다)
      await kv.set(`hoyo:dead:${ck.id}`, "1", 12 * 3600).catch(() => {});
    }
  }

  const month = await monthUsage();
  const notes: string[] = [];

  if (cookies.length === 0) {
    notes.push("사이트 쿠키가 하나도 설정돼 있지 않습니다 (HOYOLAB_COOKIES).");
  } else if (dead.length === cookies.length) {
    notes.push(`사이트 쿠키 ${cookies.length}개가 모두 만료됐습니다. 남의 UID 전체 조회가 멈춥니다.`);
  } else if (dead.length > 0) {
    notes.push(`사이트 쿠키 ${dead.length}/${cookies.length}개가 만료됐습니다: ${dead.join(", ")}`);
  }

  if (month.ratio >= 0.8) {
    notes.push(
      `이번 달 요청이 예산의 ${Math.round(month.ratio * 100)}% 입니다 (${month.used}/${month.budget}).`,
    );
  }

  let notified = false;
  if (notes.length > 0) {
    notified = await alert("health", `⚠️ HSR Builds 점검\n${notes.join("\n")}\n${SITE_URL}/admin`);
  }

  return NextResponse.json({
    at: new Date().toISOString(),
    cookies: checked,
    dead,
    month,
    notes,
    notified,
    pool: await poolStatus(),
  });
}
