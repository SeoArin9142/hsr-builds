"use client";

import { useMemo, useState } from "react";
import CharacterCard from "./CharacterCard";
import GameImage from "./GameImage";
import { useLang } from "./LangProvider";
import type { CardModel } from "@/lib/cards";
import { fmt } from "@/lib/i18n";

/** 캐릭터 목록 + 속성·운명의 길·희귀도·전시 필터 */
export default function RosterGrid({ uid, cards }: { uid: string; cards: CardModel[] }) {
  const { d } = useLang();
  const [element, setElement] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [rarity, setRarity] = useState<number | null>(null);
  const [showcasedOnly, setShowcasedOnly] = useState(false);

  // 필터 칩은 실제로 있는 값만 (순서는 등장 순)
  const elements = useMemo(() => uniqueBy(cards.map((c) => c.element)), [cards]);
  const paths = useMemo(() => uniqueBy(cards.map((c) => c.path)), [cards]);

  const shown = cards.filter(
    (c) =>
      (element === null || c.element.id === element) &&
      (path === null || c.path.id === path) &&
      (rarity === null || c.rarity === rarity) &&
      (!showcasedOnly || c.showcased),
  );

  const chip = (active: boolean) =>
    `flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition ${
      active
        ? "border-accent bg-accent/15 text-foreground"
        : "border-card-border text-muted hover:border-accent/50 hover:text-foreground"
    }`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-1">
          {elements.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setElement(element === e.id ? null : e.id)}
              className={chip(element === e.id)}
              title={e.name}
            >
              <GameImage path={e.icon} alt={e.name} width={16} height={16} />
              <span style={element === e.id ? { color: e.color } : undefined}>{e.name}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {paths.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPath(path === p.id ? null : p.id)}
              className={chip(path === p.id)}
              title={p.name}
            >
              <GameImage path={p.icon} alt={p.name} width={16} height={16} className="opacity-80" />
              {p.name}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[5, 4].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRarity(rarity === r ? null : r)}
              className={chip(rarity === r)}
            >
              {r}★
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowcasedOnly(!showcasedOnly)}
            className={chip(showcasedOnly)}
          >
            {d.filter_showcase_only}
          </button>
        </div>
        <span className="ml-auto text-xs text-muted">
          {fmt(d.filter_count, { shown: shown.length, total: cards.length })}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-card-border bg-card p-6 text-center text-sm text-muted">
          {d.filter_none}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((c) => (
            <CharacterCard key={c.id} uid={uid} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function uniqueBy<T extends { id: string }>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const it of items) if (it.id && !seen.has(it.id)) seen.set(it.id, it);
  return [...seen.values()];
}
