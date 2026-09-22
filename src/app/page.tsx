import Link from "next/link";
import UidSearch from "@/components/UidSearch";
import { getDict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { OWNER_UID } from "@/lib/site";

export default async function Home() {
  const d = getDict(await getLang());
  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        {d.home_title1} <span className="text-gold">{d.home_title2}</span>
      </h1>
      <div className="mt-3 space-y-1 text-muted">
        <p>{d.home_intro1}</p>
        <p>{d.home_intro2}</p>
        <p>{d.home_intro3}</p>
      </div>

      <div className="mt-8">
        <UidSearch size="lg" />
      </div>

      <div className="mt-6 text-sm text-muted">
        {d.home_example}{" "}
        <Link href={`/u/${OWNER_UID}`} className="text-accent underline-offset-2 hover:underline">
          {OWNER_UID}
        </Link>
      </div>

      <section className="mt-12 rounded-xl border border-card-border bg-card p-5 text-sm">
        <h2 className="font-bold">{d.home_scope_title}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/85">
          <li>
            {d.home_scope_1a}
            <br />
            {d.home_scope_1b}
          </li>
          <li>
            {d.home_scope_2a}{" "}
            <Link href="/link" className="text-accent hover:underline">
              {d.nav_link}
            </Link>{" "}
            {d.home_scope_2b}
            <br />
            {d.home_scope_2c}
            <br />
            {d.home_scope_2d}
          </li>
          <li>{d.home_scope_3}</li>
          <li>
            {d.home_scope_4a}
            <br />
            {d.home_scope_4b}
          </li>
        </ul>
        <h2 className="mt-5 font-bold">{d.home_ai_title}</h2>
        <div className="mt-2 space-y-1 text-foreground/85">
          <p>
            <code className="rounded bg-background/60 px-1">/api/u/UID/md</code> {d.home_ai_1}
          </p>
          <p>{d.home_ai_2}</p>
        </div>
      </section>
    </div>
  );
}
