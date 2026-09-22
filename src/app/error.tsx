"use client";

import { useEffect } from "react";
import { useLang } from "@/components/LangProvider";

/** 예상 못 한 오류 화면 (렌더 중 예외) */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { d } = useLang();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-500/40 bg-red-500/10 p-6">
      <h1 className="text-lg font-bold">{d.error_title}</h1>
      <p className="mt-2 text-sm text-foreground/85">{d.error_generic}</p>
      {error.digest && <p className="mt-1 text-xs text-muted">ref {error.digest}</p>}
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md border border-card-border bg-background/50 px-3 py-1.5 text-sm hover:border-accent/70"
      >
        {d.error_retry}
      </button>
    </div>
  );
}
