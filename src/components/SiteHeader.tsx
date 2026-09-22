import Link from "next/link";
import { LangSwitcher } from "./LangProvider";
import UidSearch from "./UidSearch";
import VisitorStats from "./VisitorStats";
import { getDict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { OWNER_UID } from "@/lib/site";

export default async function SiteHeader() {
  const d = getDict(await getLang());
  return (
    <header className="sticky top-0 z-20 border-b border-card-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <nav className="flex shrink-0 items-center gap-4 text-sm">
          <Link href="/" className="text-base font-bold tracking-tight text-gold">
            {d.brand}
          </Link>
          <Link href={`/u/${OWNER_UID}`} className="text-muted hover:text-foreground">
            {d.nav_profile}
          </Link>
          <Link href="/link" className="text-muted hover:text-foreground">
            {d.nav_link}
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <VisitorStats />
          {/* 폰 너비에서는 검색칸이 찌그러져서 숨긴다 — 홈 화면의 큰 검색칸을 쓴다 */}
          <div className="hidden sm:block">
            <UidSearch />
          </div>
          <LangSwitcher />
        </div>
      </div>
    </header>
  );
}
