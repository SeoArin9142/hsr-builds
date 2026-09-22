import Link from "next/link";

export default function ErrorBox({
  title,
  message,
  uid,
}: {
  title: string;
  message: string;
  uid?: string;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-500/40 bg-red-500/10 p-6">
      <h1 className="text-lg font-bold">{title}</h1>
      <p className="mt-2 text-sm text-foreground/85">{message}</p>
      {uid && <p className="mt-1 text-xs text-muted">UID {uid}</p>}
      <Link href="/" className="mt-4 inline-block text-sm text-accent hover:underline">
        ← 처음으로
      </Link>
    </div>
  );
}
