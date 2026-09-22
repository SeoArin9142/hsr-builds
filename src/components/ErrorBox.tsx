import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export default async function ErrorBox({
  title,
  message,
  uid,
}: {
  title: string;
  message: string;
  uid?: string;
}) {
  const d = getDict(await getLang());
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-500/40 bg-red-500/10 p-6">
      <h1 className="text-lg font-bold">{title}</h1>
      <div className="mt-2 space-y-1 text-sm text-foreground/85">
        {message.split("\n").map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      {uid && <p className="mt-1 text-xs text-muted">UID {uid}</p>}
      <Link href="/" className="mt-4 inline-block text-sm text-accent hover:underline">
        {d.error_home}
      </Link>
    </div>
  );
}
