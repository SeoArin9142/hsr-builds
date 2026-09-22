import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * 검색 로봇 안내. 남의 UID 페이지·API·관리 화면은 긁어 가지 않게 막는다
 * (개인 데이터이고, 매번 외부 API 를 부르므로 크롤링 대상이 아니다).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/u/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
