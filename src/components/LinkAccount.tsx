"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "./LangProvider";
import { fmt, LANGS } from "@/lib/i18n";

type Status = { linked: boolean; nickname?: string; uids?: string[]; at?: number };

/** [내 계정 연결] — 쿠키 텍스트 붙여넣기 → 확인 → 암호화 쿠키 발급 */
export default function LinkAccount({ initial }: { initial: Status }) {
  const { lang, d } = useLang();
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
        setError(body.error ?? fmt(d.link_failed_status, { status: res.status }));
        return;
      }
      setStatus(body);
      setText("");
      router.refresh();
    } catch {
      setError(d.link_fail);
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
        <p className="font-semibold">{d.link_linked}</p>
        <p className="mt-1 text-sm text-foreground/85">
          {fmt(d.link_account, {
            nick: status.nickname || d.link_account_generic,
            uids: status.uids && status.uids.length > 0 ? status.uids.join(", ") : d.link_no_uid,
          })}
        </p>
        <div className="mt-1 space-y-0.5 text-xs text-muted">
          <p>{d.link_linked_1}</p>
          <p>
            {fmt(d.link_linked_2, {
              time: status.at ? new Date(status.at).toLocaleString(LANGS[lang].locale) : "-",
            })}
          </p>
          <p>{d.link_linked_3}</p>
        </div>
        <button type="button" onClick={unlink} disabled={busy} className={`${btn} mt-3`}>
          {d.link_unlink}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={d.link_placeholder}
        rows={6}
        spellCheck={false}
        className="w-full rounded-md border border-card-border bg-background/60 p-3 font-mono text-xs outline-none placeholder:font-sans placeholder:text-muted/70 focus:border-accent"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={link} disabled={busy || !text.trim()} className={primary}>
          {busy ? d.link_checking : d.link_button}
        </button>
        <span className="text-xs text-muted">{d.link_only_two}</span>
      </div>
      {error && <p className="text-sm text-amber-300">{error}</p>}
    </div>
  );
}
