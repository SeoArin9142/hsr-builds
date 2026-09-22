import type { Metadata } from "next";
import { getDict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDict(await getLang()).privacy_title };
}

export default async function PrivacyPage() {
  const d = getDict(await getLang());
  const items = [d.privacy_1, d.privacy_2, d.privacy_3, d.privacy_4, d.privacy_5, d.privacy_6, d.privacy_7];
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <h1 className="text-2xl font-bold tracking-tight">{d.privacy_title}</h1>
      <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/85">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
