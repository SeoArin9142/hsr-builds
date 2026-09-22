"use client";

import { useState } from "react";
import { useLang } from "./LangProvider";

export default function FeedbackForm() {
  const { d } = useLang();
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError(d.fb_empty);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, contact, page: document.referrer || undefined }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(body.error ?? d.fb_fail);
        return;
      }
      setDone(true);
      setMessage("");
      setContact("");
    } catch {
      setError(d.fb_fail);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-sm">{d.fb_done}</div>
    );
  }

  const field =
    "w-full rounded-md border border-card-border bg-background/60 px-3 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-accent";

  return (
    <form onSubmit={send} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{d.fb_message}</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder={d.fb_message_placeholder}
          className={field}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{d.fb_contact}</span>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={120}
          placeholder={d.fb_contact_placeholder}
          className={field}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-background hover:brightness-110 disabled:opacity-40"
        >
          {busy ? d.fb_sending : d.fb_send}
        </button>
        <a
          href="https://github.com/SeoArin9142/hsr-builds/issues"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted hover:text-foreground"
        >
          {d.fb_github}
        </a>
      </div>
      {error && <p className="text-sm text-amber-300">{error}</p>}
    </form>
  );
}
