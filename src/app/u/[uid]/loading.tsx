/** 프로필 페이지 로딩 뼈대 — HoYoLAB 조회가 1~2초 걸릴 때 빈 화면 대신 보여 준다 */
export default function Loading() {
  const block = "animate-pulse rounded-xl border border-card-border bg-card";
  return (
    <div className="space-y-10">
      <div className={`${block} flex items-center gap-5 p-5`}>
        <div className="size-20 rounded-full bg-background/60" />
        <div className="flex-1 space-y-3">
          <div className="h-7 w-48 rounded bg-background/60" />
          <div className="h-4 w-80 rounded bg-background/60" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-6 w-32 rounded bg-card" />
        <div className={`${block} h-40`} />
      </div>
      <div className="space-y-3">
        <div className="h-6 w-32 rounded bg-card" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className={`${block} aspect-[376/512]`} />
          ))}
        </div>
      </div>
    </div>
  );
}
