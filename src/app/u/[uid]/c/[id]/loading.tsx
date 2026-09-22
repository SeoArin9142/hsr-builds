/** 캐릭터 상세 로딩 뼈대 */
export default function Loading() {
  const block = "animate-pulse rounded-xl border border-card-border bg-card";
  return (
    <div className="space-y-8">
      <div className="h-4 w-40 rounded bg-card" />
      <div className={`${block} flex flex-col gap-5 p-5 md:flex-row`}>
        <div className="mx-auto aspect-square w-56 rounded-xl bg-background/60 md:mx-0" />
        <div className="flex-1 space-y-3">
          <div className="h-9 w-56 rounded bg-background/60" />
          <div className="h-4 w-72 rounded bg-background/60" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-5 w-full rounded bg-background/50" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-5">
        <div className={`${block} h-64 lg:col-span-2`} />
        <div className={`${block} h-64 lg:col-span-3`} />
      </div>
    </div>
  );
}
