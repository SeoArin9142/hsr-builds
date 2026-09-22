import type { Metadata } from "next";
import Link from "next/link";
import { ElementBadge, PathBadge, SectionTitle } from "@/components/Badges";
import ComparePicker, { MAX_COMPARE } from "@/components/ComparePicker";
import ErrorBox from "@/components/ErrorBox";
import GameImage from "@/components/GameImage";
import { fmt, getDict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { getReco } from "@/lib/reco";
import { getRoster } from "@/lib/roster";
import { scoreCharacter, speedInfo, type CharScore } from "@/lib/score";
import { setSummary } from "@/lib/cards";
import { buildStatRows, fieldOrder, formatStat, levelText, type StatRow } from "@/lib/stats";
import type { Character } from "@/lib/types";
import { getViewerCookie } from "@/lib/viewer";

/**
 * 캐릭터 비교 — 같은 스탯을 나란히 놓고 어느 쪽이 높은지 본다.
 * 고른 캐릭터는 주소(?c=1310,1225)에 있어 그대로 링크로 넘겨 줄 수 있다.
 */

type Props = {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ c?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uid } = await params;
  const d = getDict(await getLang());
  return { title: `${d.cmp_title} — UID ${uid}`, robots: { index: false } };
}

function pickIds(raw: string | string[] | undefined): string[] {
  const text = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const out: string[] = [];
  for (const part of text.split(",")) {
    const id = part.trim();
    if (/^\d{4}$/.test(id) && !out.includes(id)) out.push(id);
    if (out.length >= MAX_COMPARE) break;
  }
  return out;
}

export default async function ComparePage({ params, searchParams }: Props) {
  const { uid } = await params;
  const [viewer, lang, sp] = await Promise.all([getViewerCookie(), getLang(), searchParams]);
  const d = getDict(lang);
  const result = await getRoster(uid, { viewer, lang });
  if (!result.ok) return <ErrorBox title={d.error_title} message={result.message} uid={uid} />;

  const { player, characters } = result.roster;
  const ids = pickIds(sp.c);
  const chosen = ids
    .map((id) => characters.find((c) => c.id === id))
    .filter((c): c is Character => !!c);

  const reco = await getReco();
  const cols = chosen.map((c) => {
    const rows = buildStatRows(c, lang);
    return { c, rows, score: scoreCharacter(c, reco[c.id], rows) };
  });

  // 비교할 스탯은 고른 캐릭터들이 가진 것의 합집합 (인게임 순서)
  const fields = [...new Set(cols.flatMap((x) => x.rows.map((r) => r.field)))].sort(
    (a, b) => fieldOrder(a) - fieldOrder(b),
  );

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted">
        <Link href={`/u/${uid}`} className="hover:text-foreground">
          {fmt(d.char_back, { name: player.nickname })}
        </Link>
      </nav>

      <SectionTitle>{d.cmp_title}</SectionTitle>

      <ComparePicker
        uid={uid}
        selected={ids}
        characters={characters.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.element.color,
        }))}
      />

      {cols.length === 0 ? (
        <p className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-muted">
          {d.cmp_empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-card-border align-bottom">
                <th className="w-28 p-3 text-left text-xs font-medium text-muted">{d.stat_col}</th>
                {cols.map(({ c, score }) => (
                  <th key={c.id} className="p-3 text-center font-normal">
                    <Link href={`/u/${uid}/c/${c.id}`} className="group block">
                      <span className="relative mx-auto block size-14 overflow-hidden rounded-full border-2 bg-background/40 transition group-hover:brightness-110"
                        style={{ borderColor: c.element.color }}
                      >
                        <GameImage path={c.icon} alt={c.name} width={56} height={56} className="size-full object-cover" />
                      </span>
                      <span className="mt-1.5 block truncate font-semibold">{c.name}</span>
                    </Link>
                    <span className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-muted">
                      <ElementBadge {...c.element} size={14} showName={false} />
                      <PathBadge {...c.path} size={14} showName={false} />
                      <span>{levelText(c.level, c.promotion)}</span>
                      <span className="text-gold">{fmt(d.card_eidolon, { n: c.rank })}</span>
                    </span>
                    <span className="mt-1 block text-[11px]">
                      <span className="font-semibold text-gold">{score.grade}</span>
                      <span className="ml-1 text-muted">
                        {d.sc_build_score} {Math.round(score.build)}
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <StatRowLine key={f} field={f} cols={cols} />
              ))}
              <tr className="border-t border-card-border">
                <td className="p-3 text-xs text-muted">{d.cmp_speed_tier}</td>
                {cols.map(({ c, rows }) => {
                  const spd = rows.find((r) => r.field === "spd")?.total ?? 0;
                  const info = speedInfo(spd);
                  return (
                    <td key={c.id} className="p-3 text-center text-xs">
                      {info.reached ? (
                        <span className="text-emerald-300">{fmt(d.sc_speed_reached, { n: info.reached })}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-t border-card-border/60">
                <td className="p-3 text-xs text-muted">{d.char_lightcone}</td>
                {cols.map(({ c }) => (
                  <td key={c.id} className="p-3 text-center text-xs">
                    {c.light_cone ? (
                      <>
                        <div className="truncate">{c.light_cone.name}</div>
                        <div className="text-muted">{fmt(d.lc_superimpose, { n: c.light_cone.rank })}</div>
                      </>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-card-border/60">
                <td className="p-3 text-xs text-muted">{d.char_sets}</td>
                {cols.map(({ c }) => (
                  <td key={c.id} className="p-3 text-center text-xs text-muted">
                    {setSummary(c).length > 0 ? (
                      setSummary(c).map((s) => <div key={s} className="truncate">{s}</div>)
                    ) : (
                      "-"
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** 스탯 한 줄 — 가장 높은 값을 금색으로 */
function StatRowLine({
  field,
  cols,
}: {
  field: string;
  cols: { c: Character; rows: StatRow[]; score: CharScore }[];
}) {
  const cells = cols.map(({ c, rows }) => ({ id: c.id, row: rows.find((r) => r.field === field) }));
  const values = cells.map((x) => x.row?.total ?? Number.NEGATIVE_INFINITY);
  const best = Math.max(...values);
  const tie = values.filter((v) => v === best).length === values.length;
  const name = cells.find((x) => x.row)?.row;

  return (
    <tr className="border-b border-card-border/40 last:border-0">
      <td className="p-2 pl-3">
        <span className="inline-flex items-center gap-1.5 text-xs">
          {name?.icon && <GameImage path={name.icon} alt="" width={16} height={16} className="opacity-90" />}
          <span className="truncate">{name?.name ?? field}</span>
        </span>
      </td>
      {cells.map(({ id, row }, i) => (
        <td
          key={id}
          className={`p-2 text-center tabular-nums ${
            row && values[i] === best && !tie ? "font-semibold text-gold" : ""
          }`}
        >
          {row ? formatStat(row.total, row.percent) : <span className="text-muted">-</span>}
        </td>
      ))}
    </tr>
  );
}
