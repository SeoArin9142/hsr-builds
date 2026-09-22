"use client";

import { useState } from "react";

/** 서버에서 만든 텍스트를 클립보드로 복사 (AI 채팅에 붙여넣기용) */
export default function CopyButton({
  text,
  label = "AI 평가용 텍스트 복사",
}: {
  text: string;
  label?: string;
}) {
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
      {state === "done" ? "복사됨 ✓" : state === "fail" ? "복사 실패" : label}
    </button>
  );
}
