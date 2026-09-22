"use client";

import { useState } from "react";
import { useLang } from "./LangProvider";

/**
 * Gemini 는 주소로 질문을 미리 채워 넣는 방법이 없고, 링크를 줘도 그 주소를 읽어 오지 못한다
 * (2026-09 확인: ?q= · ?text= 둘 다 무시, Google AI 모드는 "링크를 직접 조회할 수 없다"고 답함).
 * 그래서 자료를 통째로 복사해 주고 Gemini 를 열어 붙여넣게 한다.
 *
 * 창은 window.open 이 아니라 진짜 링크로 연다 — 복사를 기다린 뒤에 열면 팝업 차단에 걸린다.
 */
export default function AskGemini({ mdPath, prompt }: { mdPath: string; prompt: string }) {
  const { d } = useLang();
  const [fail, setFail] = useState(false);

  function copy() {
    const text = fetch(mdPath)
      .then((r) => r.text())
      .then((md) => `${prompt}\n\n${md}`);
    // 자료를 받아오는 동안에도 "사용자가 누른 동작" 으로 인정받으려면 약속(Promise)째로 넘겨야 한다
    const done =
      typeof ClipboardItem !== "undefined" && navigator.clipboard?.write
        ? navigator.clipboard.write([
            new ClipboardItem({ "text/plain": text.then((t) => new Blob([t], { type: "text/plain" })) }),
          ])
        : text.then((t) => navigator.clipboard.writeText(t));
    done.then(
      () => setFail(false),
      () => {
        setFail(true);
        setTimeout(() => setFail(false), 4000);
      },
    );
  }

  return (
    <a
      href="https://gemini.google.com/app"
      target="_blank"
      rel="noreferrer"
      onClick={copy}
      title={d.ai_gemini_hint}
      className="rounded-md border border-card-border bg-background/50 px-2 py-1 text-xs font-medium hover:border-accent/70 hover:text-foreground"
    >
      {fail ? d.char_copy_fail : "Gemini ↗"}
    </a>
  );
}
