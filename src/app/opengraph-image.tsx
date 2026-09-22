import { ImageResponse } from "next/og";
import { getDict } from "@/lib/i18n";
import { assetUrl } from "@/lib/mihomo";
import { loadOgFont } from "@/lib/ogfont";
import { getGameIndex } from "@/lib/starrailres";

/** 홈·기타 페이지의 공유 카드 — 특정 계정 정보 없이 최신 5성 캐릭터 아이콘으로 꾸민다 */
export const alt = "HSR Builds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CARD = "#141a2e";
const GOLD = "#f0c66c";
const MUTED = "#8b93b0";

export default async function Image() {
  const d = getDict("ko");
  const index = await getGameIndex("ko");
  // 최신 5성 캐릭터 8명 (id 가 클수록 최근) — 개척자(8xxx)는 뺀다
  const picks = Object.values(index.characters)
    .filter((c) => c.rarity === 5 && !c.id.startsWith("8"))
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 8);
  const lines = [d.home_title1, d.home_title2, d.home_intro1, d.home_intro3, "hsr-builds.vercel.app", ...picks.map((c) => c.name)];
  const font = await loadOgFont("ko", lines.join(""));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "52px 56px 44px",
          background: "linear-gradient(135deg, #1d2758 0%, #0b0f1e 55%, #2a1f4d 100%)",
          color: "#e6e8f0",
          fontFamily: "og",
        }}
      >
        <div style={{ fontSize: 36, color: MUTED }}>{d.home_title1}</div>
        <div style={{ fontSize: 80, fontWeight: 700, color: GOLD, marginTop: 4 }}>{d.home_title2}</div>
        <div style={{ fontSize: 28, marginTop: 22 }}>{d.home_intro1}</div>

        <div style={{ display: "flex", marginTop: 40 }}>
          {picks.map((c) => (
            <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 136 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(c.icon)}
                alt=""
                width={112}
                height={112}
                style={{ borderRadius: 56, border: `3px solid ${index.elements[c.element]?.color ?? GOLD}`, background: CARD }}
              />
              <div style={{ fontSize: 18, marginTop: 8, color: "#e6e8f0", whiteSpace: "nowrap" }}>{c.name}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
          <div style={{ fontSize: 26, color: MUTED }}>{d.home_intro3}</div>
          <div style={{ fontSize: 28, color: GOLD, fontWeight: 700 }}>hsr-builds.vercel.app</div>
        </div>
      </div>
    ),
    {
      ...size,
      ...(font ? { fonts: [{ name: "og", data: font, weight: 700, style: "normal" }] } : {}),
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
    },
  );
}
