"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "./LangProvider";

const UID_PATTERN = /^\d{9,10}$/;

export default function UidSearch({
  size = "sm",
  defaultValue = "",
}: {
  size?: "sm" | "lg";
  defaultValue?: string;
}) {
  const { d } = useLang();
  const router = useRouter();
  const [uid, setUid] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = uid.trim();
    if (!UID_PATTERN.test(value)) {
      setError(d.search_error);
      return;
    }
    setError(null);
    router.push(`/u/${value}`);
  }

  const lg = size === "lg";

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-col gap-1">
      <div className="flex gap-2">
        <input
          inputMode="numeric"
          placeholder={d.search_placeholder}
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          className={`min-w-0 rounded-md border border-card-border bg-background/60 px-3 outline-none placeholder:text-muted/70 focus:border-accent ${
            lg ? "h-12 w-full text-base" : "h-9 w-36 text-sm sm:w-52"
          }`}
          aria-label="UID"
        />
        <button
          type="submit"
          className={`shrink-0 whitespace-nowrap rounded-md bg-accent font-medium text-background hover:brightness-110 ${
            lg ? "h-12 px-6 text-base" : "h-9 px-3 text-sm"
          }`}
        >
          {d.search_button}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
