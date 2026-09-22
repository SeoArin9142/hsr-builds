import { ImageResponse } from "next/og";
import { getDict } from "@/lib/i18n";
import { loadOgFont } from "@/lib/ogfont";

/** 홈·기타 페이지의 공유 카드 */
export const alt = "HSR Builds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const d = getDict("ko");
  const lines = [d.home_title1, d.home_title2, d.home_intro1, d.home_intro2, "hsr-builds.vercel.app"];
  const font = await loadOgFont("ko", lines.join(""));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #1d2758 0%, #0b0f1e 55%, #2a1f4d 100%)",
          color: "#e6e8f0",
          fontFamily: "og",
        }}
      >
        <div style={{ fontSize: 40, color: "#8b93b0" }}>{d.home_title1}</div>
        <div style={{ fontSize: 88, fontWeight: 700, color: "#f0c66c", marginTop: 8 }}>{d.home_title2}</div>
        <div style={{ fontSize: 30, marginTop: 36 }}>{d.home_intro1}</div>
        <div style={{ fontSize: 30, marginTop: 8, color: "#8b93b0" }}>{d.home_intro2}</div>
        <div style={{ fontSize: 28, marginTop: 60, color: "#f0c66c" }}>hsr-builds.vercel.app</div>
      </div>
    ),
    {
      ...size,
      ...(font ? { fonts: [{ name: "og", data: font, weight: 700, style: "normal" }] } : {}),
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
    },
  );
}
