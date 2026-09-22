"use client";

import { useState } from "react";

type Status = {
  day: string;
  backend: string;
  cookies: { id: string; ltuidMasked: string; today: number; exhausted: boolean; dead: boolean }[];
  feedback: { id: string; at: number; message: string; contact?: string; page?: string }[];
  month: { key: string; used: number; budget: number };
  linked: { total: number; viaLink: number };
};

type Health = {
  webhook: boolean;
  test: boolean;
  cookies: { id: string; ok: boolean; message?: string }[];
  dead: string[];
  month: { used: number; budget: number; ratio: number };
  visitors: { yesterday: { uv: number; pv: number }; today: { uv: number; pv: number } };
  linked: { total: number; viaLink: number };
  notes: string[];
  notified: boolean;
};

/** 사이트 주인용: 쿠키 풀 상태 보기 (EDIT_ADMIN_KEY 필요) */
export default function AdminPage() {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthBusy, setHealthBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/status", { headers: { "x-admin-key": key } });
      const body = (await res.json()) as Status & { error?: string };
      if (!res.ok) {
        setError(body.error ?? `오류 ${res.status}`);
        setStatus(null);
        return;
      }
      setStatus(body);
    } catch {
      setError("요청 실패");
    } finally {
      setBusy(false);
    }
  }

  /** 점검 주소를 호출한다. test 면 웹훅도 한 번 울린다 (평소엔 조용히 결과만) */
  async function runHealth(test: boolean) {
    setHealthBusy(true);
    setHealth(null);
    try {
      const res = await fetch(`/api/cron/health${test ? "?test=1" : ""}`, {
        headers: { "x-admin-key": key },
      });
      const body = (await res.json()) as Health & { error?: string };
      if (!res.ok) setError(body.error ?? `오류 ${res.status}`);
      else setHealth(body);
    } catch {
      setError("점검 요청 실패");
    } finally {
      setHealthBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <h1 className="text-2xl font-bold tracking-tight">쿠키 풀 상태</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="flex gap-2"
      >
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="EDIT_ADMIN_KEY"
          className="h-9 flex-1 rounded-md border border-card-border bg-background/60 px-3 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || !key}
          className="rounded-md bg-accent px-4 text-sm font-semibold text-background hover:brightness-110 disabled:opacity-40"
        >
          조회
        </button>
      </form>
      {error && <p className="text-sm text-amber-300">{error}</p>}
      {status && (
        <div className="rounded-xl border border-card-border bg-card p-5 text-sm">
          <p className="text-muted">
            기준일(UTC+8) {status.day} · 저장소 {status.backend}
            {status.backend === "memory" && " (Redis 없음 — 서버가 잠들면 기록이 사라짐)"}
          </p>
          <p className="mt-1 text-muted">
            이번 달({status.month.key}) 요청 {status.month.used.toLocaleString("ko-KR")} /{" "}
            {status.month.budget.toLocaleString("ko-KR")} — 넘으면 다음 달 1일까지 안내 화면. 예산은 환경변수{" "}
            <code>MONTHLY_BUDGET</code>.{" "}
            <a href="/api/admin/quota-preview" target="_blank" className="text-accent hover:underline">
              안내 화면 미리보기 ↗
            </a>
          </p>
          <p className="mt-1 text-muted">
            등록 사용자 <b className="text-foreground">{status.linked?.total ?? 0}명</b> (전체가 보이는 UID) · 그중
            직접 연결 {status.linked?.viaLink ?? 0}명 — 숫자만 세고 UID 목록은 저장하지 않습니다.
          </p>
          <table className="mt-3 w-full">
            <thead className="text-xs text-muted">
              <tr className="border-b border-card-border">
                <th className="py-1.5 text-left font-medium">쿠키</th>
                <th className="py-1.5 text-right font-medium">오늘 조회 UID</th>
                <th className="py-1.5 text-right font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {status.cookies.map((c) => (
                <tr key={c.id} className="border-b border-card-border/50 last:border-0">
                  <td className="py-1.5 font-mono text-xs">{c.ltuidMasked}</td>
                  <td className="py-1.5 text-right tabular-nums">{c.today}</td>
                  <td className="py-1.5 text-right">
                    {c.dead ? (
                      <span className="text-red-300">만료 — 쿠키를 갱신하면 다음 조회 때 자동 복구</span>
                    ) : c.exhausted ? (
                      <span className="text-amber-300">오늘 한도 소진</span>
                    ) : (
                      <span className="text-emerald-300">정상</span>
                    )}
                  </td>
                </tr>
              ))}
              {status.cookies.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-center text-muted">
                    등록된 쿠키가 없습니다 (HOYOLAB_COOKIES 또는 HOYOLAB_LTUID_V2/LTOKEN_V2).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-3 space-y-1 text-xs text-muted">
            <p>
              쿠키는 <b>자기 계정에 연동된 UID 의 전체 조회</b>에만 쓰입니다.
            </p>
            <p>HoYoLAB 은 남의 계정엔 캐릭터 8명·스탯 없음만 보여 주므로, 부계정을 늘려도 남의 UID 는 더 보이지 않습니다.</p>
            <p>
              사이트 주인 계정을 여러 개 쓰려면 <code>HOYOLAB_COOKIES</code> 에 <code>ltuid:ltoken</code> 을 쉼표로
              이어 넣고 재배포합니다.
            </p>
          </div>
        </div>
      )}
      {status && (
        <div className="rounded-xl border border-card-border bg-card p-5 text-sm">
          <h2 className="font-bold">점검</h2>
          <p className="mt-2 text-muted">
            쿠키가 살아 있는지 호요랩에 직접 물어봅니다. 매일 오전 9시쯤 크론이 하는 것과 같은 일이고,
            여기서 누르면 <b>알림은 가지 않습니다</b>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runHealth(false)}
              disabled={healthBusy}
              className="rounded-md border border-card-border bg-background/50 px-3 py-1.5 text-xs font-medium hover:border-accent/70 disabled:opacity-40"
            >
              {healthBusy ? "확인 중…" : "지금 점검"}
            </button>
            <button
              type="button"
              onClick={() => runHealth(true)}
              disabled={healthBusy}
              className="rounded-md border border-card-border bg-background/50 px-3 py-1.5 text-xs font-medium hover:border-accent/70 disabled:opacity-40"
              title="디스코드 웹훅이 제대로 걸려 있는지 확인용으로 한 번 보냅니다"
            >
              알림 시험 보내기
            </button>
          </div>
          {health && (
            <div className="mt-3 space-y-1 rounded-lg border border-card-border bg-background/40 p-3 text-xs">
              <p>
                사이트 쿠키{" "}
                <b className={health.dead.length === 0 ? "text-emerald-300" : "text-red-300"}>
                  {health.cookies.length - health.dead.length}/{health.cookies.length}개 정상
                </b>
                {health.dead.length > 0 && ` — 만료: ${health.dead.join(", ")}`}
              </p>
              <p>
                어제 방문 {health.visitors.yesterday.uv}명 · {health.visitors.yesterday.pv}회, 오늘 지금까지{" "}
                {health.visitors.today.uv}명 · 등록 사용자 {health.linked.total}명 (직접 연결{" "}
                {health.linked.viaLink}명)
              </p>
              <p>
                이번 달 요청 {health.month.used.toLocaleString("ko-KR")}/
                {health.month.budget.toLocaleString("ko-KR")} ({Math.round(health.month.ratio * 100)}%)
              </p>
              {health.notes.length > 0 && (
                <ul className="list-disc pl-4 text-amber-300">
                  {health.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
              <p className="text-muted">
                웹훅 {health.webhook ? "설정됨" : "없음 (ALERT_WEBHOOK 미설정 — 서버 로그에만 남습니다)"}
                {health.test && (health.notified ? " · 시험 알림을 보냈습니다" : " · 시험 알림 전송 실패")}
              </p>
            </div>
          )}
        </div>
      )}
      {status && (
        <div className="rounded-xl border border-card-border bg-card p-5 text-sm">
          <h2 className="font-bold">파티 백업</h2>
          <p className="mt-2 text-muted">
            Upstash 무료 티어는 백업이 없으니 가끔 내려받아 두세요. 복원은 편집기에서 다시 만들거나, 파일 내용을{" "}
            <code>PUT /api/u/UID/parties</code> 로 보내면 됩니다.
          </p>
          <a
            href="/api/u/800133616/parties"
            download="parties-800133616.json"
            className="mt-2 inline-block rounded-md border border-card-border bg-background/50 px-3 py-1.5 text-xs font-medium hover:border-accent/70"
          >
            내 파티 JSON 내려받기
          </a>
        </div>
      )}
      {status && (
        <div className="rounded-xl border border-card-border bg-card p-5 text-sm">
          <h2 className="font-bold">최근 문의 ({status.feedback.length})</h2>
          {status.feedback.length === 0 ? (
            <p className="mt-2 text-muted">아직 없습니다.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {status.feedback.map((f) => (
                <li key={f.id} className="rounded-lg border border-card-border bg-background/40 p-3">
                  <div className="flex flex-wrap gap-x-3 text-xs text-muted">
                    <span>{new Date(f.at).toLocaleString("ko-KR")}</span>
                    {f.contact && <span>연락처: {f.contact}</span>}
                    {f.page && <span className="truncate">from: {f.page}</span>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{f.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
