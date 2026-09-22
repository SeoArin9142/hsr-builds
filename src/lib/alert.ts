import { getKV } from "./kvstore";

/**
 * 관리자 알림. ALERT_WEBHOOK 에 Discord(또는 Slack) 웹훅 주소를 넣어 두면 그리로 보낸다.
 * 없으면 서버 로그에만 남긴다. 같은 내용을 하루에 한 번만 보내도록 key 로 눌러 둔다.
 */

const DEFAULT_QUIET_SECONDS = 20 * 3600; // 하루에 한 번

export async function alert(key: string, text: string, quietSeconds = DEFAULT_QUIET_SECONDS): Promise<boolean> {
  const kv = getKV();
  const mark = `alert:sent:${key}`;
  if (await kv.get(mark).catch(() => null)) return false; // 최근에 이미 보냈다
  await kv.set(mark, "1", quietSeconds).catch(() => {});

  const url = process.env.ALERT_WEBHOOK;
  console.warn(`[alert] ${key}: ${text}`);
  if (!url) return false;
  try {
    // Discord 는 content, Slack 은 text 를 읽는다 — 둘 다 넣어 두면 어느 쪽이든 된다
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, text }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch (e) {
    console.error("[alert] 웹훅 전송 실패", e);
    return false;
  }
}
