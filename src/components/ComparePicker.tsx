"use client";

import { useRouter } from "next/navigation";
import GameImage from "./GameImage";
import { useLang } from "./LangProvider";
import { fmt } from "@/lib/i18n";

/** 비교할 캐릭터 고르기 — 고르면 주소(?c=…)가 바뀌고 서버가 다시 그린다 */

export const MAX_COMPARE = 4;

export default function ComparePicker({
  uid,
  characters,
  selected,
}: {
  uid: string;
  characters: { id: string; name: string; icon: string; color: string }[];
  selected: string[];
}) {
  const { d } = useLang();
  const router = useRouter();

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id].slice(-MAX_COMPARE);
    router.replace(next.length > 0 ? `/u/${uid}/compare?c=${next.join(",")}` : `/u/${uid}/compare`);
  }

  return (
    <div className="rounded-xl border border-card-border bg-card p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{fmt(d.cmp_pick, { max: MAX_COMPARE })}</span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => router.replace(`/u/${uid}/compare`)}
            className="rounded border border-card-border px-2 py-0.5 hover:border-accent/70 hover:text-foreground"
          >
            {d.cmp_clear}
          </button>
        )}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {characters.map((c) => {
          const on = selected.includes(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => toggle(c.id)}
                aria-pressed={on}
                title={c.name}
                className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2 text-xs transition ${
                  on
                    ? "border-accent bg-accent/15 text-foreground"
                    : "border-card-border text-muted hover:border-accent/50 hover:text-foreground"
                }`}
              >
                <span
                  className="block size-6 overflow-hidden rounded-full border bg-background/40"
                  style={{ borderColor: on ? c.color : "transparent" }}
                >
                  <GameImage path={c.icon} alt="" width={24} height={24} className="size-full object-cover" />
                </span>
                <span className="max-w-24 truncate">{c.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
