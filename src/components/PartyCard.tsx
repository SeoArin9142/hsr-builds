import Link from "next/link";
import GameImage from "./GameImage";
import { ElementBadge, PathBadge } from "./Badges";
import type { Party } from "@/lib/parties";
import type { MemberView } from "@/lib/members";

function MemberSlot({ uid, member }: { uid: string; member: MemberView | null }) {
  if (!member) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-card-border/70 p-2 text-muted/60">
        <div className="size-16 rounded-full border border-dashed border-card-border/70" />
        <span className="text-xs">비어 있음</span>
      </div>
    );
  }

  const c = member.showcase;
  const body = (
    <div
      className={`flex h-full flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition ${
        c
          ? "border-card-border bg-background/40 hover:border-accent/70 hover:bg-background/70"
          : "border-card-border/60 bg-background/20"
      }`}
    >
      <div
        className="relative size-16 overflow-hidden rounded-full border-2"
        style={{ borderColor: member.element.color }}
      >
        <GameImage path={member.icon} alt={member.name} fill sizes="64px" className="object-cover" />
      </div>
      <div className="text-sm font-semibold leading-tight">{member.name}</div>
      <div className="flex items-center gap-2">
        <ElementBadge {...member.element} size={14} showName={false} />
        <PathBadge {...member.path} size={14} />
      </div>
      {c ? (
        <div className="text-[11px] text-muted">
          Lv.{c.level} · {c.rank}성혼
          {c.light_cone && (
            <div className="mt-0.5 line-clamp-1 max-w-[9rem] text-[11px] text-foreground/70">
              {c.light_cone.name}
            </div>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-muted/70">상세 없음</div>
      )}
    </div>
  );

  return c ? (
    <Link href={`/u/${uid}/c/${member.id}`} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function PartyCard({
  uid,
  party,
  members,
}: {
  uid: string;
  party: Party;
  members: (MemberView | null)[]; // 길이 4
}) {
  const empty = members.every((m) => m === null);
  return (
    <section className="rounded-xl border border-card-border bg-card p-4">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-bold">
          <span className="mr-2 text-xs text-muted">
            {String(party.no).padStart(2, "0")}
          </span>
          {party.name}
        </h3>
        {party.note && <span className="text-xs text-muted">{party.note}</span>}
      </header>
      {empty ? (
        <p className="py-6 text-center text-sm text-muted/70">편성 없음</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {members.map((m, i) => (
            <MemberSlot key={m?.id ?? `empty-${i}`} uid={uid} member={m} />
          ))}
        </div>
      )}
    </section>
  );
}
