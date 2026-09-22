import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 캐릭터/유물/광추 이미지는 StarRailRes(GitHub raw)에서 가져온다.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/Mar-7th/StarRailRes/**",
      },
      // HoYoLAB 전적이 주는 스킬·성혼 아이콘
      { protocol: "https", hostname: "**.hoyoverse.com" },
      { protocol: "https", hostname: "**.hoyolab.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  // 파티 JSON(data/parties/*.json)은 런타임에 fs 로 읽으므로 배포 번들에 포함시킨다.
  outputFileTracingIncludes: {
    "/u/[uid]": ["./data/**/*"],
    "/api/u/[uid]/parties": ["./data/**/*"],
  },
};

export default nextConfig;
