import type { Metadata } from "next";
import FeedbackForm from "@/components/FeedbackForm";
import { fmt, getDict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDict(await getLang()).fb_title };
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ about?: string }>;
}) {
  const [{ about }, lang] = await Promise.all([searchParams, getLang()]);
  const d = getDict(lang);
  // 캐릭터 페이지에서 넘어오면 무엇에 대한 이야기인지 첫 줄을 채워 둔다
  const initialMessage = about ? fmt(d.fb_about, { name: about.slice(0, 80) }) : "";
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{d.fb_title}</h1>
        <div className="mt-2 space-y-1 text-sm text-muted">
          <p>{d.fb_intro_1}</p>
          <p>{d.fb_intro_2}</p>
        </div>
      </div>
      <FeedbackForm initialMessage={initialMessage} />
    </div>
  );
}
