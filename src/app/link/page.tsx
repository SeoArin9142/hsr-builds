import type { Metadata } from "next";
import LinkAccount from "@/components/LinkAccount";
import { getDict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { getLinkedAccount } from "@/lib/viewer";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDict(await getLang()).link_title };
}

export default async function LinkPage() {
  const [acc, lang] = await Promise.all([getLinkedAccount(), getLang()]);
  const d = getDict(lang);
  const initial = acc
    ? { linked: true, nickname: acc.nickname, uids: acc.uids, at: acc.at }
    : { linked: false };

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{d.link_title}</h1>
        <div className="mt-2 space-y-1 text-sm text-muted">
          <p>
            <b className="text-foreground">{d.link_intro_1}</b>
          </p>
          <p>{d.link_intro_2}</p>
          <p>{d.link_intro_3}</p>
          <p>{d.link_intro_4}</p>
          <p>{d.link_intro_5}</p>
        </div>
      </div>

      <LinkAccount initial={initial} />

      <section className="space-y-4 rounded-xl border border-card-border bg-card p-5 text-sm">
        <div>
          <h2 className="font-bold">{d.link_how1_title}</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-foreground/85">
            <li>
              {d.link_how1_1a}{" "}
              <a
                href="https://chromewebstore.google.com/search/Cookie-Editor"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                Cookie-Editor
              </a>{" "}
              {d.link_how1_1b}
            </li>
            <li>
              <a href="https://www.hoyolab.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                hoyolab.com
              </a>{" "}
              {d.link_how1_2a}
            </li>
            <li>{d.link_how1_3}</li>
          </ol>
        </div>
        <div>
          <h2 className="font-bold">{d.link_how2_title}</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-foreground/85">
            <li>{d.link_how2_1}</li>
            <li>
              {d.link_how2_2a} <code>ltuid_v2=…; ltoken_v2=…</code> {d.link_how2_2b}
            </li>
          </ol>
        </div>
        <div>
          <h2 className="font-bold">{d.link_store_title}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/85">
            <li>{d.link_store_1}</li>
            <li>{d.link_store_2}</li>
            <li>{d.link_store_3}</li>
            <li>{d.link_store_4}</li>
            <li>{d.link_store_5}</li>
            <li>{d.link_store_6}</li>
            <li>{d.link_store_7}</li>
            <li>{d.link_store_8}</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
