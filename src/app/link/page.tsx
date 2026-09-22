import type { Metadata } from "next";
import LinkAccount from "@/components/LinkAccount";
import { getLinkedAccount } from "@/lib/viewer";

export const metadata: Metadata = { title: "내 계정 연결" };

export default async function LinkPage() {
  const acc = await getLinkedAccount();
  const initial = acc
    ? { linked: true, nickname: acc.nickname, uids: acc.uids, at: acc.at }
    : { linked: false };

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">내 계정 연결</h1>
        <p className="mt-2 text-sm text-muted">
          선택 사항입니다. 연결하지 않아도 사이트는 그대로 쓸 수 있어요. 연결하면 이 브라우저의 조회가
          사이트 공용 한도가 아니라 <b className="text-foreground">내 HoYoLAB 계정의 한도(하루 30개 UID)</b>로
          나가고, 내 계정이 전적 비공개여도 내 캐릭터 전체를 볼 수 있습니다.
        </p>
      </div>

      <LinkAccount initial={initial} />

      <section className="space-y-4 rounded-xl border border-card-border bg-card p-5 text-sm">
        <div>
          <h2 className="font-bold">쿠키 복사하는 법 ① — 확장 프로그램 (제일 쉬움, PC)</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-foreground/85">
            <li>
              Chrome/Edge 에{" "}
              <a
                href="https://chromewebstore.google.com/search/Cookie-Editor"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                Cookie-Editor
              </a>{" "}
              확장 프로그램을 설치합니다.
            </li>
            <li>
              <a href="https://www.hoyolab.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                hoyolab.com
              </a>{" "}
              에 로그인한 뒤, 그 탭에서 확장 아이콘 → <b>Export</b> (클립보드로 복사)
            </li>
            <li>위 칸에 붙여넣고 [연결]</li>
          </ol>
        </div>
        <div>
          <h2 className="font-bold">쿠키 복사하는 법 ② — 개발자 도구</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-foreground/85">
            <li>hoyolab.com 에 로그인한 탭에서 <b>F12</b> → <b>Application</b>(응용 프로그램) → Cookies → hoyolab.com</li>
            <li>
              <code>ltuid_v2</code> 와 <code>ltoken_v2</code> 의 값을 각각 복사해{" "}
              <code>ltuid_v2=값; ltoken_v2=값</code> 처럼 위 칸에 넣고 [연결]
            </li>
          </ol>
        </div>
        <div>
          <h2 className="font-bold">보관 방식</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/85">
            <li>쿠키는 서버에 저장하지 않습니다. 서버 키로 암호화해 이 브라우저의 쿠키에만 둡니다.</li>
            <li>조회할 때만 잠깐 풀어서 HoYoLAB 에 보내고, 조회 결과는 24시간 캐시됩니다.</li>
            <li>30일 뒤 자동 해제되며, 언제든 [연결 해제] 로 지울 수 있습니다. HoYoLAB 에서 로그아웃하면 쿠키가 무효가 됩니다.</li>
            <li>폰만 쓰는 경우엔 쿠키를 꺼낼 방법이 없어 연결이 어렵습니다 — 연결 없이 쓰셔도 됩니다.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
