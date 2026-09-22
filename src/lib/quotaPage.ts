import { NextResponse, type NextRequest } from "next/server";
import { fmt, getDict, isLang, LANG_COOKIE, LANGS, type Lang } from "./i18n";

/** 월 한도 초과 안내 화면 — proxy.ts 가 쓰고, /api/admin/quota-preview 로 미리 볼 수 있다 */

function kst(): Date {
  return new Date(Date.now() + 9 * 3600 * 1000);
}

/** 다음 달 1일 00:00 KST */
export function nextMonthStart(): Date {
  const d = kst();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - 9 * 3600 * 1000);
}

export function pickLang(req: NextRequest): Lang {
  const c = req.cookies.get(LANG_COOKIE)?.value;
  if (isLang(c)) return c;
  const first = (req.headers.get("accept-language") ?? "").split(",")[0].trim().toLowerCase();
  if (first.startsWith("ko")) return "ko";
  if (first.startsWith("ja")) return "ja";
  if (/^zh-(tw|hk|mo|hant)/.test(first)) return "tw";
  if (first.startsWith("zh")) return "cn";
  if (first && first !== "*") return "en";
  return "ko";
}

/** 월 한도 초과 안내 화면 (503) */
export function quotaPage(req: NextRequest): NextResponse {
  const lang = pickLang(req);
  const d = getDict(lang);
  const until = nextMonthStart();
  const date = until.toLocaleDateString(LANGS[lang].locale, { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" });
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<!doctype html><html lang="${LANGS[lang].locale}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.quota_title)} — HSR Builds</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0f1e;color:#e6e8f0;font-family:system-ui,-apple-system,"Noto Sans KR","Noto Sans JP",sans-serif}
.box{max-width:560px;margin:24px;padding:32px;border:1px solid #263050;border-radius:16px;background:#141a2e}
h1{font-size:22px;margin:0 0 12px;color:#f0c66c}p{margin:8px 0;line-height:1.6}.muted{color:#8b93b0;font-size:14px}</style></head>
<body><div class="box"><h1>${esc(d.quota_title)}</h1><p>${esc(d.quota_body)}</p><p><b>${esc(fmt(d.quota_until, { date }))}</b></p><p class="muted">${esc(d.quota_sorry)}</p></div></body></html>`;
  const retry = Math.max(60, Math.floor((until.getTime() - Date.now()) / 1000));
  return new NextResponse(html, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": String(retry), "Cache-Control": "no-store" },
  });
}

