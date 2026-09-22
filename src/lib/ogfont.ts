/**
 * OG 이미지(ImageResponse)용 글꼴. 기본 글꼴엔 한글·일본어가 없어서 Google Fonts 에서
 * 그릴 글자만 담은 부분 글꼴(TTF)을 받아 온다. 글자 집합별로 하루 캐시.
 */
const FAMILY: Record<string, string> = {
  ko: "Noto Sans KR",
  en: "Noto Sans KR",
  ja: "Noto Sans JP",
};

export async function loadOgFont(lang: string, text: string): Promise<ArrayBuffer | null> {
  const family = FAMILY[lang] ?? FAMILY.ko;
  const chars = [...new Set(text)].join("");
  const css = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@700&text=${encodeURIComponent(chars)}`;
  try {
    // woff2 를 모르는 옛 브라우저 UA 로 요청하면 satori 가 읽는 TTF 주소를 준다
    const res = await fetch(css, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+",
      },
      next: { revalidate: 86400 },
    });
    const body = await res.text();
    const m = body.match(/src:\s*url\((https:[^)]+)\)\s*format\('(?:opentype|truetype)'\)/);
    if (!m) return null;
    const font = await fetch(m[1], { next: { revalidate: 86400 } });
    if (!font.ok) return null;
    return await font.arrayBuffer();
  } catch {
    return null;
  }
}
