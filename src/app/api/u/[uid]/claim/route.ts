import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { checkAdminKey, claimCode, cookieName, issueToken, verifyToken } from "@/lib/claim";
import { UID_PATTERN } from "@/lib/mihomo";

/**
 * GET  /api/u/{uid}/claim  → { code, verified }   확인 코드와 현재 편집 권한
 * POST /api/u/{uid}/claim  → 서명에서 코드를 찾아 편집 토큰(쿠키) 발급. body: { adminKey?: string }
 */
export async function GET(_req: Request, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  if (!UID_PATTERN.test(uid)) return NextResponse.json({ error: "UID 형식 오류" }, { status: 400 });
  const jar = await cookies();
  return NextResponse.json({
    code: claimCode(uid),
    verified: verifyToken(uid, jar.get(cookieName(uid))?.value),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  if (!UID_PATTERN.test(uid)) return NextResponse.json({ error: "UID 형식 오류" }, { status: 400 });

  let adminKey: string | undefined;
  try {
    const body = (await req.json()) as { adminKey?: string };
    adminKey = body.adminKey;
  } catch {
    // body 없음
  }

  let ok = false;
  let message = "";
  if (adminKey !== undefined) {
    ok = checkAdminKey(adminKey);
    message = ok ? "관리자 키로 확인되었습니다." : "관리자 키가 틀립니다.";
  } else {
    // 전시 API 를 캐시 없이 다시 읽어 서명을 확인한다 (Mihomo 쪽 캐시 때문에 몇 분 걸릴 수 있음)
    const code = claimCode(uid);
    try {
      const res = await fetch(`https://api.mihomo.me/sr_info_parsed/${uid}?lang=kr`, {
        headers: { "User-Agent": "hsr-builds/0.1 (claim check)" },
        cache: "no-store",
      });
      if (!res.ok) {
        message = `전시 API 응답 오류 (${res.status}). 잠시 후 다시 시도해 주세요.`;
      } else {
        const data = (await res.json()) as { player?: { signature?: string } };
        const sig = data.player?.signature ?? "";
        ok = sig.toUpperCase().includes(code);
        message = ok
          ? "서명에서 코드를 확인했습니다. 이제 서명은 원래대로 돌려도 됩니다."
          : `서명에서 코드 ${code} 를 찾지 못했습니다. 인게임에서 서명을 저장했다면 반영까지 몇 분 걸릴 수 있습니다. (현재 서명: "${sig || "(비어 있음)"}")`;
      }
    } catch {
      message = "전시 API 에 연결할 수 없습니다.";
    }
  }

  if (!ok) return NextResponse.json({ verified: false, message }, { status: 403 });

  const token = issueToken(uid);
  const res = NextResponse.json({ verified: true, message });
  res.cookies.set(cookieName(uid), token.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: token.maxAge,
  });
  return res;
}
