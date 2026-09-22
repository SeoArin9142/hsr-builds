import { ImageResponse } from "next/og";
import { fmt, getDict } from "@/lib/i18n";
import { assetUrl } from "@/lib/mihomo";
import { loadOgFont } from "@/lib/ogfont";
import { getRoster } from "@/lib/roster";

/** X·디스코드 등에 링크를 올릴 때 보이는 프로필 카드 (1200×630) */
export const alt = "HSR Builds profile card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0b0f1e";
const CARD = "#141a2e";
const GOLD = "#f0c66c";
const MUTED = "#8b93b0";

export default async function Image({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const d = getDict("ko");
  const result = await getRoster(uid, { lang: "ko" });

  if (!result.ok) {
    const font = await loadOgFont("ko", `UID ${uid} HSR Builds ${result.message}`);
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

  const { player, characters, hoyolab, showcaseIds } = result.roster;
  const shown = characters.slice(0, 6);
  const line1 = `${fmt(d.profile_trailblaze, { n: player.level })} · ${fmt(d.profile_equilibrium, { n: player.world_level })}`;
  const line2 =
    hoyolab.status === "ok"
      ? fmt(d.chars_source_full, { n: hoyolab.count, m: showcaseIds.length })
      : fmt(d.chars_source_showcase, { m: showcaseIds.length });
  const site = "hsr-builds.vercel.app";
  const text = [player.nickname, `UID ${uid}`, line1, line2, site, ...shown.map((c) => c.name), d.home_title1, d.home_title2].join("");
  const font = await loadOgFont("ko", text);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, #1d2758 0%, ${BG} 55%, #2a1f4d 100%)`,
          color: "#e6e8f0",
          fontFamily: "og",
          padding: 48,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl(player.avatar.icon)}
            alt=""
            width={120}
            height={120}
            style={{ borderRadius: 60, border: `4px solid ${GOLD}`, background: CARD }}
          />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 32 }}>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <div style={{ fontSize: 60, fontWeight: 700 }}>{player.nickname}</div>
              <div style={{ fontSize: 28, color: MUTED, marginLeft: 20 }}>{`UID ${uid}`}</div>
            </div>
            <div style={{ fontSize: 28, color: MUTED, marginTop: 8 }}>{line1}</div>
            <div style={{ fontSize: 28, color: MUTED, marginTop: 4 }}>{line2}</div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 44 }}>
          {shown.map((c) => (
            <div
              key={c.id}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 176, marginRight: 8 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(c.icon)}
                alt=""
                width={150}
                height={150}
                style={{ borderRadius: 75, border: `4px solid ${c.element.color}`, background: CARD }}
              />
              <div style={{ fontSize: 24, marginTop: 10, color: "#e6e8f0" }}>{c.name}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
          <div style={{ fontSize: 30, color: GOLD, fontWeight: 700 }}>
            {`${d.home_title1} ${d.home_title2}`}
          </div>
          <div style={{ fontSize: 26, color: MUTED }}>{site}</div>
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
