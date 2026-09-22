import { LANGS, tr, type Lang } from "./i18n";
import type { Showcase } from "./types";

const API = "https://api.mihomo.me/sr_info_parsed";

/** 이미지·아이콘 경로 앞에 붙이는 StarRailRes CDN 주소 */
export const ASSET_BASE =
  "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/";

export function assetUrl(path: string): string {
  return ASSET_BASE + path;
}

export const UID_PATTERN = /^\d{9,10}$/;

export type ShowcaseResult =
  | { ok: true; data: Showcase }
  | { ok: false; status: number; message: string };

/**
 * 인게임 "캐릭터 전시" 데이터를 Mihomo API 에서 가져온다 (이름은 요청 언어로).
 * 5분 캐시 — Mihomo 자체도 캐시하므로 인게임 변경이 반영되기까지는 몇 분 걸릴 수 있다.
 */
export async function getShowcase(uid: string, lang: Lang = "ko"): Promise<ShowcaseResult> {
  if (!UID_PATTERN.test(uid)) {
    return { ok: false, status: 400, message: tr(lang, "api_uid_format") };
  }

  let res: Response;
  try {
    res = await fetch(`${API}/${uid}?lang=${LANGS[lang].mihomo}`, {
      headers: { "User-Agent": "hsr-builds/0.1 (personal build viewer)" },
      next: { revalidate: 300 },
    });
  } catch {
    return { ok: false, status: 503, message: tr(lang, "api_mihomo_down") };
  }

  if (!res.ok) {
    const known: Record<number, string> = {
      400: tr(lang, "api_uid_format"),
      404: tr(lang, "api_uid_notfound"),
      429: tr(lang, "api_too_many"),
    };
    let message = known[res.status] ?? tr(lang, "api_mihomo_error", { status: res.status });
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail && !known[res.status]) message = body.detail;
    } catch {
      // 본문이 JSON 이 아니면 기본 메시지 사용
    }
    return { ok: false, status: res.status, message };
  }

  const data = (await res.json()) as Showcase;
  return { ok: true, data };
}
