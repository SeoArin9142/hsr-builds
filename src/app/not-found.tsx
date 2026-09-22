import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export default async function NotFound() {
  const d = getDict(await getLang());
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-card-border bg-card p-6">
      <h1 className="text-lg font-bold">{d.notfound_title}</h1>
      <p className="mt-2 text-sm text-foreground/85">{d.notfound_body}</p>
      <Link href="/" className="mt-4 inline-block text-sm text-accent hover:underline">
        {d.error_home}
      </Link>
    </div>
  );
}
