"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import GameImage from "./GameImage";
import { useLang } from "./LangProvider";
import type { CardModel } from "@/lib/cards";
import { fmt } from "@/lib/i18n";
import type { Party } from "@/lib/parties";

const MAX_PARTIES = 12;
const MAX_MEMBERS = 4;

type Draft = { name: string; note: string; members: string[] };

/**
 * 파티 편집기. 본인 확인(인게임 서명에 코드 넣기) → 파티 추가/편집 → 저장(PUT /api/u/{uid}/parties).
 * 저장 후 router.refresh() 로 서버가 그린 파티 섹션을 새로 받는다.
 */
export default function PartyEditor({
  uid,
  initialParties,
  cards,
  initialVerified,
  code,
}: {
  uid: string;
  initialParties: Party[];
  cards: CardModel[];
  initialVerified: boolean;
  code: string;
}) {
  const { d } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [verified, setVerified] = useState(initialVerified);
  const [parties, setParties] = useState<Draft[]>(() => toDrafts(initialParties));
  const [target, setTarget] = useState<{ party: number; slot: number } | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const picks = useMemo(() => {
    const q = search.trim();
    return cards.filter((c) => !q || c.name.includes(q));
  }, [cards, search]);

  function openEditor() {
    setParties(toDrafts(initialParties));
    setTarget(null);
    setMessage(null);
    setOpen(true);
  }

  async function claim(withAdmin: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/u/${uid}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withAdmin ? { adminKey } : {}),
      });
      const body = (await res.json()) as { verified: boolean; message: string };
      setMessage(body.message);
      if (body.verified) setVerified(true);
    } catch {
      setMessage(d.editor_fail_verify);
    } finally {
      setBusy(false);
    }
  }

  function update(i: number, patch: Partial<Draft>) {
    setParties((ps) => ps.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  }

  function addParty() {
    if (parties.length >= MAX_PARTIES) return;
    setParties((ps) => [...ps, { name: fmt(d.editor_default_name, { n: ps.length + 1 }), note: "", members: [] }]);
    setTarget({ party: parties.length, slot: 0 });
  }

  function removeParty(i: number) {
    setParties((ps) => ps.filter((_, k) => k !== i));
    setTarget(null);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= parties.length) return;
    setParties((ps) => {
      const next = [...ps];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setTarget(null);
  }

  function pick(id: string) {
    if (!target) return;
    const p = parties[target.party];
    if (!p) return;
    const members = p.members.filter((m) => m !== id); // 같은 캐릭터 중복 방지
    members.splice(Math.min(target.slot, members.length), 0, id);
    update(target.party, { members: members.slice(0, MAX_MEMBERS) });
    const nextSlot = Math.min(target.slot + 1, MAX_MEMBERS - 1);
    setTarget({ party: target.party, slot: nextSlot });
  }

  function removeMember(i: number, slot: number) {
    update(i, { members: parties[i].members.filter((_, k) => k !== slot) });
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/u/${uid}/parties`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parties }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(body.error ?? fmt(d.editor_save_failed, { status: res.status }));
        if (res.status === 403) setVerified(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setMessage(d.editor_fail_save);
    } finally {
      setBusy(false);
    }
  }

  const btn = "rounded-md border border-card-border bg-background/50 px-3 py-1.5 text-xs font-medium hover:border-accent/70 disabled:opacity-40";
  const primary = "rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-background hover:brightness-110 disabled:opacity-40";

  if (!open) {
    return (
      <button type="button" onClick={openEditor} className={btn}>
        {d.editor_open}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-4 rounded-xl border border-accent/40 bg-card p-4">
      {!verified ? (
        <div className="space-y-3 text-sm">
          <p className="font-semibold">{d.editor_verify_title}</p>
          <ol className="list-decimal space-y-1 pl-5 text-foreground/85">
            <li>
              {d.editor_step1a}{" "}
              <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-gold">{code}</code>{" "}
              {d.editor_step1b}
              <br />
              {d.editor_step1c}
            </li>
            <li>
              {d.editor_step2a}
              <br />
              {d.editor_step2b}
            </li>
            <li>
              {d.editor_step3a}
              <br />
              {d.editor_step3b}
            </li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => claim(false)} disabled={busy} className={primary}>
              {busy ? d.editor_checking : d.editor_verify}
            </button>
            <button type="button" onClick={() => setShowAdmin(!showAdmin)} className={btn}>
              {d.editor_admin}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={btn}>
              {d.editor_close}
            </button>
          </div>
          {showAdmin && (
            <div className="flex gap-2">
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="EDIT_ADMIN_KEY"
                className="h-8 w-64 rounded-md border border-card-border bg-background/60 px-2 text-xs outline-none focus:border-accent"
              />
              <button type="button" onClick={() => claim(true)} disabled={busy || !adminKey} className={btn}>
                {d.editor_confirm}
              </button>
            </div>
          )}
          {message && <p className="text-xs text-amber-300">{message}</p>}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold">
              {d.editor_title} <span className="text-xs font-normal text-muted">({parties.length}/{MAX_PARTIES})</span>
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={addParty} disabled={parties.length >= MAX_PARTIES} className={btn}>
                {d.editor_add}
              </button>
              <button type="button" onClick={save} disabled={busy} className={primary}>
                {busy ? d.editor_saving : d.editor_save}
              </button>
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className={btn}>
                {d.editor_cancel}
              </button>
            </div>
          </div>
          {message && <p className="text-xs text-amber-300">{message}</p>}

          {parties.length === 0 && (
            <p className="text-sm text-muted">{d.editor_no_parties}</p>
          )}

          <ul className="space-y-2">
            {parties.map((p, i) => (
              <li
                key={i}
                className={`rounded-lg border p-3 ${
                  target?.party === i ? "border-accent/70 bg-background/50" : "border-card-border bg-background/30"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-6 text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <input
                    value={p.name}
                    maxLength={20}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className="h-8 w-32 rounded-md border border-card-border bg-background/60 px-2 text-sm outline-none focus:border-accent"
                    aria-label={d.editor_name}
                  />
                  <input
                    value={p.note}
                    maxLength={60}
                    placeholder={d.editor_note_placeholder}
                    onChange={(e) => update(i, { note: e.target.value })}
                    className="h-8 min-w-40 flex-1 rounded-md border border-card-border bg-background/60 px-2 text-xs outline-none placeholder:text-muted/60 focus:border-accent"
                    aria-label={d.editor_note}
                  />
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={btn} title={d.editor_up}>
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === parties.length - 1}
                      className={btn}
                      title={d.editor_down}
                    >
                      ↓
                    </button>
                    <button type="button" onClick={() => removeParty(i)} className={`${btn} text-red-300`}>
                      {d.editor_delete}
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  {Array.from({ length: MAX_MEMBERS }, (_, slot) => {
                    const id = p.members[slot];
                    const c = id ? byId.get(id) : undefined;
                    const active = target?.party === i && target.slot === slot;
                    return (
                      <div key={slot} className="relative">
                        <button
                          type="button"
                          onClick={() => setTarget({ party: i, slot })}
                          className={`flex size-16 items-center justify-center overflow-hidden rounded-full border-2 bg-background/40 ${
                            active ? "border-accent" : "border-card-border hover:border-accent/60"
                          }`}
                          title={c ? c.name : id ? `#${id}` : d.editor_pick}
                          style={c ? { borderColor: active ? undefined : c.element.color } : undefined}
                        >
                          {c ? (
                            <GameImage path={c.icon} alt={c.name} width={64} height={64} className="size-full object-cover" />
                          ) : id ? (
                            <span className="text-[10px] text-muted">#{id}</span>
                          ) : (
                            <span className="text-xl text-muted">+</span>
                          )}
                        </button>
                        {id && (
                          <button
                            type="button"
                            onClick={() => removeMember(i, slot)}
                            className="absolute -right-1 -top-1 size-5 rounded-full bg-red-500/90 text-[11px] font-bold leading-5 text-white"
                            title={d.editor_remove}
                          >
                            ×
                          </button>
                        )}
                        {c && (
                          <div className="mt-1 w-16 truncate text-center text-[10px] text-muted">{c.name}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>

          {target && parties[target.party] && (
            <div className="rounded-lg border border-card-border bg-background/40 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted">
                  {fmt(d.editor_slot_hint, { party: parties[target.party].name, n: target.slot + 1 })}
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={d.editor_search}
                  className="ml-auto h-7 w-36 rounded-md border border-card-border bg-background/60 px-2 text-xs outline-none focus:border-accent"
                />
              </div>
              <div className="grid max-h-64 grid-cols-6 gap-2 overflow-y-auto sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
                {picks.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pick(c.id)}
                    className="flex flex-col items-center gap-0.5"
                    title={`${c.name} · ${c.element.name} ${c.path.name}`}
                  >
                    <span
                      className="block size-12 overflow-hidden rounded-full border-2 bg-background/40"
                      style={{ borderColor: c.element.color }}
                    >
                      <GameImage path={c.icon} alt={c.name} width={48} height={48} className="size-full object-cover" />
                    </span>
                    <span className="w-14 truncate text-center text-[10px] text-muted">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function toDrafts(parties: Party[]): Draft[] {
  return parties.map((p) => ({ name: p.name, note: p.note ?? "", members: [...p.members] }));
}
