import { cookies, headers } from "next/headers";
import { cache } from "react";
import { isLang, LANG_COOKIE, type Lang } from "./i18n";

/**
 * 요청의 화면 언어. 쿠키(hsrb_lang) → 브라우저 Accept-Language → ko.
 * React cache 로 한 요청 안에서는 한 번만 읽는다.
 */
export const getLang = cache(async (): Promise<Lang> => {
  const jar = await cookies();
  const c = jar.get(LANG_COOKIE)?.value;
  if (isLang(c)) return c;
  const first = ((await headers()).get("accept-language") ?? "").split(",")[0].trim().toLowerCase();
  if (first.startsWith("ko")) return "ko";
  if (first.startsWith("ja")) return "ja";
  if (first && first !== "*") return "en"; // 도구(curl·AI)가 보내는 "*" 는 선호 없음 → 기본 한국어
  return "ko";
});
