import { ImageResponse } from "next/og";

/** 브라우저 탭 아이콘: 남색 바탕에 금색 별 (글꼴 없이 SVG 로 그린다) */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#141a2e",
          borderRadius: 14,
        }}
      >
        <svg width="44" height="44" viewBox="0 0 24 24">
          <polygon
            points="12,2 14.9,8.6 22,9.3 16.6,14.1 18.2,21 12,17.4 5.8,21 7.4,14.1 2,9.3 9.1,8.6"
            fill="#f0c66c"
          />
        </svg>
      </div>
    ),
    size,
  );
}
