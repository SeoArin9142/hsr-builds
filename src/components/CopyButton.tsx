"use client";

import { useState } from "react";
import { useLang } from "./LangProvider";

/** 서버에서 만든 텍스트를 클립보드로 복사 (AI 채팅에 붙여넣기용) */
export default function CopyButton({ text }: { text: string }) {
  const { d } = useLang();
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("fail");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-card-border bg-background/50 px-3 py-1.5 text-xs font-medium hover:border-accent/70"
    >
      {state === "done" ? d.char_copied : state === "fail" ? d.char_copy_fail : d.char_copy}
    </button>
  );
}
