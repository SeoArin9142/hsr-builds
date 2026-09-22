"use client";

import { useState } from "react";

type Status = {
  day: string;
  backend: string;
  cookies: { id: string; ltuidMasked: string; today: number; exhausted: boolean; dead: boolean }[];
  feedback: { id: string; at: number; message: string; contact?: string; page?: string }[];
};

/** 사이트 주인용: 쿠키 풀 상태 보기 (EDIT_ADMIN_KEY 필요) */
export default function AdminPage() {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
