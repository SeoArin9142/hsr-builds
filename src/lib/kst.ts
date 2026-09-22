/**
 * 한국 시간 기준 날짜. 방문 집계·월 한도·하루 한 번 알림이 모두 KST 하루를 기준으로 센다.
 * (Vercel 은 UTC 로 도니까 여기서 9시간을 더해 날짜만 뽑는다)
 */

function shifted(offsetDays: number): Date {
  return new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 86400 * 1000);
}

/** YYYYMMDD — offsetDays 가 -1 이면 어제 */
export function kstDay(offsetDays = 0): string {
  return shifted(offsetDays).toISOString().slice(0, 10).replace(/-/g, "");
}

/** YYYYMM */
export function kstMonth(): string {
  return shifted(0).toISOString().slice(0, 7).replace("-", "");
}

/** 사람이 읽는 날짜 (9/22) */
export function kstLabel(offsetDays = 0): string {
  const d = shifted(offsetDays);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}
