import { ImageResponse } from "next/og";
import { fmt, getDict } from "@/lib/i18n";
import { assetUrl } from "@/lib/mihomo";
import { loadOgFont } from "@/lib/ogfont";
import { getRoster } from "@/lib/roster";
import { buildStatRows, formatStat, levelText } from "@/lib/stats";

/** 캐릭터 상세 링크의 공유 카드 (1200×630): 초상 + 핵심 스탯 + 광추·세트 */
export const alt = "HSR Builds character card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0b0f1e";
const CARD = "#141a2e";
const GOLD = "#f0c66c";
const MUTED = "#8b93b0";
const KEY_FIELDS = ["hp", "atk", "def", "spd", "crit_rate", "crit_dmg", "break_dmg", "sp_rate"];

export default async function Image({ params }: { params: Promise<{ uid: string; id: string }> }) {
  const { uid, id } = await params;
  const d = getDict("ko");
  const result = await getRoster(uid, { lang: "ko" });
  const c = result.ok ? result.roster.characters.find((x) => x.id === id) : undefined;

  if (!result.ok || !c) {
    const font = await loadOgFont("ko", `UID ${uid} HSR Builds`);
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: BG, color: "#e6e8f0", fontFamily: "og" }}>
          <div style={{ fontSize: 56, fontWeight: 700, color: GOLD }}>HSR Builds</div>
          <div style={{ fontSize: 32, marginTop: 16, color: MUTED }}>{`UID ${uid}`}</div>
        </div>
      ),
      { ...size, ...(font ? { fonts: [{ name: "og", data: font, weight: 700, style: "normal" }] } : {}) },
    );
  }

  const player = result.roster.player;
  const rows = buildStatRows(c, "ko").filter((r) => KEY_FIELDS.includes(r.field)).slice(0, 8);
  const setMax = new Map<string, number>();
  for (const s of c.relic_sets) setMax.set(s.name, Math.max(setMax.get(s.name) ?? 0, s.num));
  const sets = [...setMax].map(([name, n]) => fmt(d.md_pieces, { name, n })).join(" · ");
  const eidolon = fmt(d.card_eidolon, { n: c.rank });
  const level = levelText(c.level, c.promotion);
  const lc = c.light_cone ? `${c.light_cone.name} S${c.light_cone.rank}` : d.card_no_lightcone;
  const site = "hsr-builds.vercel.app";
  const text = [
    c.name, player.nickname, `UID ${uid}`, eidolon, level, lc, sets, site, c.element.name, c.path.name,
    ...rows.map((r) => r.name + formatStat(r.total, r.percent)),
  ].join("");
  const font = await loadOgFont("ko", text);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `linear-gradient(135deg, ${c.element.color}33 0%, ${BG} 45%, #1d2758 100%)`,
          color: "#e6e8f0",
          fontFamily: "og",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assetUrl(c.preview)}
          alt=""
          width={463}
          height={630}
          style={{ objectFit: "cover", width: 463, height: 630 }}
        />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "44px 48px 40px 40px" }}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <div style={{ fontSize: 58, fontWeight: 700 }}>{c.name}</div>
            <div style={{ fontSize: 26, color: GOLD, marginLeft: 18 }}>{eidolon}</div>
            <div style={{ fontSize: 26, color: MUTED, marginLeft: 14 }}>{level}</div>
          </div>
          <div style={{ fontSize: 24, color: MUTED, marginTop: 4 }}>
            {`${c.element.name} · ${c.path.name} · ${lc}`}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 26 }}>
            {rows.map((r) => (
              <div
                key={r.field}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 176,
                  marginRight: 10,
                  marginBottom: 10,
                  padding: "10px 14px",
                  background: CARD,
                  borderRadius: 12,
                }}
              >
                <div style={{ fontSize: 18, color: MUTED, whiteSpace: "nowrap" }}>{r.name}</div>
                <div style={{ fontSize: 30, fontWeight: 700 }}>{formatStat(r.total, r.percent)}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 22, color: MUTED, marginTop: 6 }}>{sets}</div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
            <div style={{ fontSize: 24, color: "#e6e8f0" }}>
              {`${player.nickname} · UID ${uid}`}
            </div>
            <div style={{ fontSize: 24, color: GOLD, fontWeight: 700 }}>{site}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      ...(font ? { fonts: [{ name: "og", data: font, weight: 700, style: "normal" }] } : {}),
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
    },
  );
}
