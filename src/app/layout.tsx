import type { Metadata } from "next";
import Link from "next/link";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { LangProvider } from "@/components/LangProvider";
import SiteHeader from "@/components/SiteHeader";
import { getDict, LANGS } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

const notoKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const d = getDict(lang);
  return {
    metadataBase: new URL("https://hsr-builds.vercel.app"),
    title: {
      default: `HSR Builds — ${d.home_title1} ${d.home_title2}`,
      template: "%s | HSR Builds",
    },
    description: `${d.home_intro1} ${d.home_intro2}`,
    openGraph: {
      siteName: "HSR Builds",
      type: "website",
      images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "HSR Builds" }],
    },
    twitter: { card: "summary_large_image", images: ["/og-home.png"] },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  const d = getDict(lang);
  return (
    <html lang={LANGS[lang].locale} className={`${notoKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <LangProvider lang={lang}>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6">{children}</main>
          <footer className="border-t border-card-border/60 px-4 py-6 text-center text-xs text-muted">
            <p>{d.footer_credits}</p>
            <p className="mt-2">
              <Link href="/feedback" className="text-accent hover:underline">
                {d.footer_feedback}
              </Link>
              <span className="mx-2">·</span>
              <Link href="/privacy" className="hover:text-foreground">
                {d.footer_privacy}
              </Link>
              <span className="mx-2">·</span>
              <a
                href="https://github.com/SeoArin9142/hsr-builds"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                GitHub
              </a>
            </p>
          </footer>
          <Analytics />
        </LangProvider>
      </body>
    </html>
  );
}
