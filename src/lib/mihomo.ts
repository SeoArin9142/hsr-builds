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

const ERROR_MESSAGES: Record<number, string> = {
  400: "UID 형식이 올바르지 않습니다.",
  404: "해당 UID 의 플레이어를 찾을 수 없습니다. UID 를 다시 확인해 주세요.",
  429: "조회 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
};

/**
 * 인게임 "캐릭터 전시" 데이터를 Mihomo API 에서 가져온다.
 * 5분 캐시 — Mihomo 자체도 캐시하므로 인게임 변경이 반영되기까지는 몇 분 걸릴 수 있다.
 */
export async function getShowcase(uid: string): Promise<ShowcaseResult> {
  if (!UID_PATTERN.test(uid)) {
    return { ok: false, status: 400, message: ERROR_MESSAGES[400] };
  }

  let res: Response;
  try {
    res = await fetch(`${API}/${uid}?lang=kr`, {
      headers: { "User-Agent": "hsr-builds/0.1 (personal build viewer)" },
      next: { revalidate: 300 },
    });
  } catch {
    return {
      ok: false,
      status: 503,
      message: "Mihomo API 에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  if (!res.ok) {
    let message = ERROR_MESSAGES[res.status] ?? `Mihomo API 오류 (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail && !ERROR_MESSAGES[res.status]) message = body.detail;
    } catch {
      // 본문이 JSON 이 아니면 기본 메시지 사용
    }
    return { ok: false, status: res.status, message };
  }

  const data = (await res.json()) as Showcase;
  return { ok: true, data };
}
