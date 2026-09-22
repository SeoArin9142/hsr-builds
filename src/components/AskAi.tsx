import AskGemini from "./AskGemini";
import { getDict, type Lang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

/**
 * "AI 에게 평가 맡기기".
 *  - ChatGPT·Claude: 마크다운 주소를 담은 질문을 새 대화에 미리 채운다. 자료를 주소로만 넘기므로
 *    글자 수 제한에 안 걸리지만, 그 AI 가 웹을 읽을 수 있어야 한다.
 *  - Gemini: 질문 미리 채우기도, 링크 읽기도 안 돼서 자료를 복사해 주고 창만 열어 준다 (AskGemini).
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
  const path = `/api/u/${uid}/md?lang=${lang}` + (characterId ? `&c=${characterId}` : "");
  const mdUrl = `${SITE_URL}${path}`; // AI 에게 건네는 주소는 절대 주소라야 한다
  const prompt = characterId ? d.ai_prompt_char : d.ai_prompt_roster;
  const q = encodeURIComponent(`${prompt}\n${mdUrl}`);

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
      {/* 복사는 보고 있는 사이트에서 그대로 받아 온다 (다른 주소로 받으면 브라우저가 막는다) */}
      <AskGemini mdPath={path} prompt={prompt} />
    </span>
  );
}
