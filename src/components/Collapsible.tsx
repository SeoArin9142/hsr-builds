"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLang } from "./LangProvider";

/**
 * 길어지는 목록을 접어 두는 상자.
 * 내용이 collapsedHeight 보다 짧으면 버튼을 아예 그리지 않는다.
 * 접었는지 여부는 그 브라우저에만 기억한다(localStorage).
 */

const EVENT = "hsrb-collapsible";

function read(key: string): "1" | "0" | null {
  try {
    const v = localStorage.getItem(`hsrb_open_${key}`);
    return v === "1" || v === "0" ? v : null;
  } catch {
    return null; // 저장소를 못 쓰는 브라우저면 기본값 그대로
  }
}

function write(key: string, open: boolean): void {
  try {
    localStorage.setItem(`hsrb_open_${key}`, open ? "1" : "0");
  } catch {
    // 기억하지 못해도 동작에는 지장 없다
  }
  window.dispatchEvent(new Event(EVENT));
}

/** 저장된 접힘 상태를 읽는다. 서버에서 그릴 때는 기본값을 쓴다. */
function useStoredOpen(key: string, fallback: boolean): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  const stored = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  return stored === null ? fallback : stored === "1";
}

export default function Collapsible({
  children,
  storageKey,
  collapsedHeight = 320,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  storageKey: string;
  collapsedHeight?: number;
  defaultOpen?: boolean;
}) {
  const { d } = useLang();
  const open = useStoredOpen(storageKey, defaultOpen);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > collapsedHeight + 24);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [collapsedHeight]);

  const collapsed = overflows && !open;

  return (
    <div>
      <div
        className="relative overflow-hidden transition-[max-height] duration-200"
        style={{ maxHeight: collapsed ? collapsedHeight : undefined }}
      >
        <div ref={ref}>{children}</div>
        {collapsed && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => write(storageKey, !open)}
          aria-expanded={open}
          className="mt-2 w-full rounded-md border border-card-border bg-background/50 py-1.5 text-xs text-muted hover:border-accent/70 hover:text-foreground"
        >
          {open ? `${d.collapse} ▲` : `${d.expand} ▼`}
        </button>
      )}
    </div>
  );
}
