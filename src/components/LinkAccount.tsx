"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = { linked: boolean; nickname?: string; uids?: string[]; at?: number };

/** [내 계정 연결] — 쿠키 텍스트 붙여넣기 → 확인 → 암호화 쿠키 발급 */
export default function LinkAccount({ initial }: { initial: Status }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function link() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = (await res.json()) as Status & { error?: string };
      if (!res.ok) {
        setError(body.error ?? `실패 (${res.status})`);
        return;
      }
      setStatus(body);
      setText("");
      router.refresh();
    } catch {
      setError("요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    try {
      await fetch("/api/link", { method: "DELETE" });
      setStatus({ linked: false });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const btn = "rounded-md border border-card-border bg-background/50 px-3 py-1.5 text-sm font-medium hover:border-accent/70 disabled:opacity-40";
  const primary = "rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-background hover:brightness-110 disabled:opacity-40";

  if (status.linked) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
        <p className="font-semibold">연결됨 ✓</p>
        <p className="mt-1 text-sm text-foreground/85">
          HoYoLAB {status.nickname ? <b>{status.nickname}</b> : "계정"} · 스타레일 UID{" "}
          {status.uids && status.uids.length > 0 ? status.uids.join(", ") : "(연동된 캐릭터 없음)"}
        </p>
        <p className="mt-1 text-xs text-muted">
          이 브라우저에서 하는 조회는 이 계정의 하루 30개 UID 한도로 나갑니다. 연결 시각:{" "}
          {status.at ? new Date(status.at).toLocaleString("ko-KR") : "-"} · 30일 뒤 자동 해제
        </p>
        <button type="button" onClick={unlink} disabled={busy} className={`${btn} mt-3`}>
          연결 해제
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'여기에 붙여넣기 — Cookie-Editor 의 Export 결과(JSON), cookies.txt 내용, 개발자 도구에서 복사한 Cookie 헤더, 또는 "ltuid_v2=…; ltoken_v2=…" 어떤 형식이든 됩니다.'}
        rows={6}
        spellCheck={false}
        className="w-full rounded-md border border-card-border bg-background/60 p-3 font-mono text-xs outline-none placeholder:font-sans placeholder:text-muted/70 focus:border-accent"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={link} disabled={busy || !text.trim()} className={primary}>
          {busy ? "확인 중…" : "연결"}
        </button>
        <span className="text-xs text-muted">
          붙여넣은 내용에서 <code>ltuid_v2</code>·<code>ltoken_v2</code> 두 값만 쓰고, 나머지는 버립니다.
        </span>
      </div>
      {error && <p className="text-sm text-amber-300">{error}</p>}
    </div>
  );
}
