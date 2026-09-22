import { NextResponse } from "next/server";
import { alert, markAlerted } from "@/lib/alert";
import { checkAdminKey } from "@/lib/claim";
import { poolCookies, poolStatus } from "@/lib/hoyolab";
import { kstDay, kstLabel, kstMonth } from "@/lib/kst";
import { getKV } from "@/lib/kvstore";
import { validateCookie } from "@/lib/link";
import { redisCmd, redisConfigured, redisGet } from "@/lib/redis";
import { SITE_URL } from "@/lib/site";
import { linkedCounts } from "@/lib/usage";

/**
 * GET /api/cron/health — 하루 한 번 (vercel.json 의 crons) 사이트 건강 검진.
 *
 *  1) 사이트 쿠키 풀의 쿠키가 아직 살아 있는지 (만료되면 남의 UID 를 볼 수 없게 된다)
 *  2) 이번 달 요청 수가 예산의 80% 를 넘었는지
 * 결과는 하루에 한 번 ALERT_WEBHOOK 으로 보낸다 — 문제가 없으면 어제 방문 수까지 담은 요약,
 * 있으면 ⚠️ 경고. 웹훅이 없으면 서버 로그에만 남는다.
 *
 * 인증: Vercel Cron 이 보내는 Authorization: Bearer $CRON_SECRET,
 *       또는 손으로 부를 때 x-admin-key: $EDIT_ADMIN_KEY.
 * 웹훅을 울리는 것은 크론이 부를 때와 ?test=1 뿐이다. 관리자 키로 그냥 부르면 결과만 돌려준다
 * (배포 확인하려고 부른 것이 하루 점검으로 나가 버리지 않게).
 */

export const dynamic = "force-dynamic";

function authorized(req: Request): "admin" | "cron" | null {
  if (checkAdminKey(req.headers.get("x-admin-key") ?? undefined)) return "admin";
  const secret = process.env.CRON_SECRET;
  if (!secret) return null; // CRON_SECRET 이 없으면 아무나 부를 수 없게 막는다
  return req.headers.get("authorization") === `Bearer ${secret}` ? "cron" : null;
}

/** 주소를 <> 로 감싸면 디스코드·슬랙이 링크 미리보기 카드를 펼치지 않는다 (알림이 짧아진다) */
function adminLink(): string {
  return `<${SITE_URL}/admin>`;
}

async function monthUsage(): Promise<{ used: number; budget: number; ratio: number }> {
  const used = redisConfigured()
    ? Number((await redisGet(`stats:req:${kstMonth()}`).catch(() => null)) ?? 0)
    : 0;
  const budget = Number(process.env.MONTHLY_BUDGET ?? "50000");
  return { used, budget, ratio: budget > 0 ? used / budget : 0 };
}

/** 그 날 방문자 수·페이지뷰 (proxy.ts 가 세어 둔 값) */
async function visitors(day: string): Promise<{ uv: number; pv: number }> {
  if (!redisConfigured()) return { uv: 0, pv: 0 };
  try {
    const [uv, pv] = await Promise.all([
      redisCmd<number>(["PFCOUNT", `stats:uv:${day}`]),
      redisCmd<string | null>(["GET", `stats:pv:${day}`]),
    ]);
    return { uv: uv ?? 0, pv: Number(pv ?? 0) };
  } catch {
    return { uv: 0, pv: 0 };
  }
}

export async function GET(req: Request) {
  const who = authorized(req);
  if (!who) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const test = who === "admin" && new URL(req.url).searchParams.get("test") === "1";

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

  // 하루 요약 — 어제(마지막으로 다 지난 날) 방문 수와 이번 달 사용량
  const yesterday = await visitors(kstDay(-1));
  const today = await visitors(kstDay());
  const linked = await linkedCounts(kv);
  const summary = [
    `어제(${kstLabel(-1)}) 방문 ${yesterday.uv}명 · ${yesterday.pv}회, 오늘 지금까지 ${today.uv}명`,
    `등록 사용자 ${linked.total}명 (직접 연결 ${linked.viaLink}명)`,
    `사이트 쿠키 ${checked.length - dead.length}/${checked.length}개 정상`,
    `이번 달 요청 ${month.used.toLocaleString("ko-KR")}/${month.budget.toLocaleString("ko-KR")} (${Math.round(month.ratio * 100)}%)`,
    adminLink(),
  ].join("\n");

  // 알림을 보내는 건 크론과 ?test=1 뿐이다. 관리자 키로 그냥 들여다보는 것은 조용히 결과만 돌려준다
  // (배포 확인하려고 부른 것이 하루 점검으로 나가 버린 적이 있다).
  const dayKey = `daily:${kstDay()}`;
  let notified = false;
  if (test) {
    // 시험은 하루 한 번 제한에 걸리지 않게 매번 다른 key 로 보낸다
    notified = await alert(`test:${Date.now()}`, `✅ HSR Builds 알림 시험\n${summary}`, 60);
  } else if (who === "cron") {
    if (notes.length > 0) {
      notified = await alert("health", `⚠️ HSR Builds 점검\n${notes.join("\n")}\n${summary}`);
      await markAlerted(dayKey, 26 * 3600); // 같은 날 요약을 또 보내지 않는다
    } else {
      notified = await alert(dayKey, `📊 HSR Builds 하루 점검 (${kstLabel()})\n${summary}`, 26 * 3600);
    }
  }

  return NextResponse.json({
    at: new Date().toISOString(),
    webhook: !!process.env.ALERT_WEBHOOK, // 주소 자체는 돌려주지 않는다
    test,
    cookies: checked,
    dead,
    month,
    visitors: { yesterday, today },
    linked,
    notes,
    notified,
    pool: await poolStatus(),
  });
}
