import { cookies } from "next/headers";
import type { HoyoCookie } from "./hoyolab";
import { LINK_COOKIE, openLink, toHoyoCookie, type LinkedAccount } from "./link";

/** 요청의 브라우저 쿠키에서 방문자가 연결한 HoYoLAB 계정을 꺼낸다 (없으면 null) */
export async function getLinkedAccount(): Promise<LinkedAccount | null> {
  const jar = await cookies();
  return openLink(jar.get(LINK_COOKIE)?.value);
}

export async function getViewerCookie(): Promise<HoyoCookie | null> {
  const acc = await getLinkedAccount();
  return acc ? toHoyoCookie(acc) : null;
}
