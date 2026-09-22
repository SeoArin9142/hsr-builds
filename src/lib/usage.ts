import type { KV } from "./kvstore";

/**
 * 등록 사용자 수.
 *
 * "전체 캐릭터가 보이는 UID" = 그 계정 주인 쿠키가 있는 UID = 실제 사용자다.
 * 몇 명인지만 알면 되고 누구인지는 알 필요가 없으므로 HyperLogLog 로 센다 —
 * 넣은 UID 자체는 보관되지 않아 나중에 목록으로 꺼낼 수 없다.
 * (그래서 "누가 등록했는지" 를 우리가 알아낼 방법이 없고, 공개 명단도 만들 수 없다.)
 */

const TOTAL = "stats:linked:total"; // 전체가 보이는 UID
const VIA_LINK = "stats:linked:via"; // 그중 방문자가 [내 계정 연결]로 직접 연결한 것

export async function countLinkedUser(kv: KV, uid: string, viaLink: boolean): Promise<void> {
  try {
    await kv.pfadd(TOTAL, uid);
    if (viaLink) await kv.pfadd(VIA_LINK, uid);
  } catch {
    // 세지 못해도 조회는 계속돼야 한다
  }
}

export async function linkedCounts(kv: KV): Promise<{ total: number; viaLink: number }> {
  try {
    const [total, viaLink] = await Promise.all([kv.pfcount(TOTAL), kv.pfcount(VIA_LINK)]);
    return { total, viaLink };
  } catch {
    return { total: 0, viaLink: 0 };
  }
}
