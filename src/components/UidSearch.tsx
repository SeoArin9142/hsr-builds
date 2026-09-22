"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const UID_PATTERN = /^\d{9,10}$/;

export default function UidSearch({
  size = "sm",
  defaultValue = "",
}: {
  size?: "sm" | "lg";
  defaultValue?: string;
}) {
  const router = useRouter();
  const [uid, setUid] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = uid.trim();
    if (!UID_PATTERN.test(value)) {
      setError("UID 는 9~10자리 숫자입니다.");
      return;
    }
    setError(null);
    router.push(`/u/${value}`);
  }

  const lg = size === "lg";

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          inputMode="numeric"
          placeholder="UID 입력 (예: 800133616)"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          className={`rounded-md border border-card-border bg-background/60 px-3 outline-none placeholder:text-muted/70 focus:border-accent ${
            lg ? "h-12 w-full text-base" : "h-9 w-40 text-sm sm:w-52"
          }`}
          aria-label="UID"
        />
        <button
          type="submit"
          className={`rounded-md bg-accent font-medium text-background hover:brightness-110 ${
            lg ? "h-12 px-6 text-base" : "h-9 px-3 text-sm"
          }`}
        >
          조회
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
