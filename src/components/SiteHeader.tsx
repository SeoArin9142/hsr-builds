import Link from "next/link";
import UidSearch from "./UidSearch";
import { OWNER_UID } from "@/lib/site";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-card-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-base font-bold tracking-tight text-gold">
            HSR Builds
          </Link>
          <Link href={`/u/${OWNER_UID}`} className="text-muted hover:text-foreground">
            내 프로필
          </Link>
        </nav>
        <UidSearch />
      </div>
    </header>
  );
}
