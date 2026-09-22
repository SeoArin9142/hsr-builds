import Link from "next/link";
import UidSearch from "@/components/UidSearch";
import { OWNER_UID } from "@/lib/site";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        UID 하나로 보는 <span className="text-gold">스타레일 빌드</span>
      </h1>
      <p className="mt-3 text-muted">
        보유 캐릭터의 최종 스탯·광추·유물·행적을 한 화면에서 확인합니다. 고수 유저나 AI 에게
        UID 만 주면 같은 화면을 보고 세팅을 평가할 수 있습니다. 로그인은 필요 없습니다.
      </p>

      <div className="mt-8">
        <UidSearch size="lg" />
      </div>

      <div className="mt-6 text-sm text-muted">
        예시:{" "}
        <Link href={`/u/${OWNER_UID}`} className="text-accent underline-offset-2 hover:underline">
          {OWNER_UID}
        </Link>
      </div>

      <section className="mt-12 rounded-xl border border-card-border bg-card p-5 text-sm">
        <h2 className="font-bold">어디까지 보이나</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/85">
          <li>
            <b>보유 캐릭터 전부</b> — HoYoLAB 에서 <b>전적 공개</b>가 켜져 있는 계정 (기본값이 공개)
          </li>
          <li>
            전적이 비공개면 인게임 <b>캐릭터 전시</b>에 올린 최대 8명만 — 프로필 → 캐릭터 전시에서{" "}
            <b>상세 정보 표시</b>도 켜야 스탯·유물이 나온다
          </li>
          <li>반영까지 몇 분 걸릴 수 있다 (게임 서버·API 캐시)</li>
          <li>파티 편성은 게임이 외부에 주지 않아서, 계정 주인이 [파티 편집] 으로 직접 만든다 (최대 12개)</li>
        </ul>
        <h2 className="mt-5 font-bold">AI 에게 넘길 때</h2>
        <p className="mt-2 text-foreground/85">
          <code className="rounded bg-background/60 px-1">/api/u/UID/md</code> 주소를 주면 캐릭터
          전체가 마크다운 표로 나옵니다. 캐릭터 상세 페이지의 &quot;AI 평가용 텍스트 복사&quot;
          버튼으로 한 명만 복사할 수도 있습니다.
        </p>
      </section>
    </div>
  );
}
