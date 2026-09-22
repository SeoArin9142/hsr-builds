import { getDict, type Lang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

/**
 * "AI 에게 평가 맡기기" — 마크다운 주소를 담은 질문을 ChatGPT·Claude 새 대화에 미리 채워 준다.
 * 데이터를 주소로만 넘기므로(붙여넣기 없음) 글자 수 제한에 걸리지 않고, AI 가 그 주소를 읽어 평가한다.
 */

const TARGETS = [
  { id: "chatgpt", label: "ChatGPT", url: (q: string) => `https://chatgpt.com/?q=${q}` },
  { id: "claude", label: "Claude", url: (q: string) => `https://claude.ai/new?q=${q}` },
] as const;

export default function AskAi({
  uid,
  lang,
  characterId,
  className = "",
}: {
  uid: string;
  lang: Lang;
  characterId?: string; // 없으면 계정 전체
  className?: string;
}) {
  const d = getDict(lang);
  // 이름은 넣지 않는다 — 주소 안의 자료에 이미 있고, 못 읽었을 때 AI 가 지어내는 빌미가 된다
  const mdUrl =
    `${SITE_URL}/api/u/${uid}/md?lang=${lang}` + (characterId ? `&c=${characterId}` : "");
  const q = encodeURIComponent(
    `${characterId ? d.ai_prompt_char : d.ai_prompt_roster}\n${mdUrl}`,
  );

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-xs text-muted">{d.ai_ask}</span>
      {TARGETS.map((t) => (
        <a
          key={t.id}
          href={t.url(q)}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-card-border bg-background/50 px-2 py-1 text-xs font-medium hover:border-accent/70 hover:text-foreground"
        >
          {t.label} ↗
        </a>
      ))}
    </span>
  );
}
