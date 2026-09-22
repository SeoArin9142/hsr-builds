"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo } from "react";
import { getDict, LANG_COOKIE, LANGS, type Dict, type Lang } from "@/lib/i18n";

const Ctx = createContext<{ lang: Lang; d: Dict }>({ lang: "ko", d: getDict("ko") });

/** 클라이언트 컴포넌트가 useLang() 으로 언어·사전을 얻는다 */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, d: getDict(lang) }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}

/** 머리말의 언어 선택 — 쿠키에 저장하고 서버 컴포넌트를 다시 그린다 */
export function LangSwitcher() {
  const { lang, d } = useLang();
  const router = useRouter();
  function change(next: string) {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${365 * 86400}; samesite=lax`;
    router.refresh();
  }
  return (
    <select
      value={lang}
      onChange={(e) => change(e.target.value)}
      aria-label={d.lang_label}
      className="h-8 rounded-md border border-card-border bg-background/60 px-1.5 text-xs text-muted outline-none hover:text-foreground focus:border-accent"
    >
      {(Object.keys(LANGS) as Lang[]).map((l) => (
        <option key={l} value={l}>
          {LANGS[l].label}
        </option>
      ))}
    </select>
  );
}
