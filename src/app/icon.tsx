import { ImageResponse } from "next/og";

/** 브라우저 탭 아이콘: 남색 바탕에 금색 별 */
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
          color: "#f0c66c",
          fontSize: 44,
          fontWeight: 700,
        }}
      >
        ★
      </div>
    ),
    size,
  );
}
