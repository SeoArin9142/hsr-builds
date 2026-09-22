import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

const notoKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "HSR Builds — 붕괴: 스타레일 파티·빌드 뷰어",
    template: "%s | HSR Builds",
  },
  description:
    "붕괴: 스타레일 UID 로 파티 편성과 캐릭터 상세 스탯·광추·유물을 확인합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6">
          {children}
        </main>
        <footer className="border-t border-card-border/60 px-4 py-6 text-center text-xs text-muted">
          데이터: 인게임 캐릭터 전시 (Mihomo API) · 이미지: StarRailRes · 비공식
          팬 사이트이며 HoYoverse 와 관련이 없습니다.
        </footer>
      </body>
    </html>
  );
}
