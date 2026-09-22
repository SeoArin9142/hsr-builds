import type { Metadata } from "next";
import FeedbackForm from "@/components/FeedbackForm";
import { getDict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDict(await getLang()).fb_title };
}

export default async function FeedbackPage() {
  const d = getDict(await getLang());
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{d.fb_title}</h1>
        <div className="mt-2 space-y-1 text-sm text-muted">
          <p>{d.fb_intro_1}</p>
          <p>{d.fb_intro_2}</p>
        </div>
      </div>
      <FeedbackForm />
    </div>
  );
}
