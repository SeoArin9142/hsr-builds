# HSR Builds

붕괴: 스타레일 UID 하나로 캐릭터 상세 스탯·광추·유물·행적을 보여 주는 공개 웹.
고수 유저나 AI 에게 UID(또는 페이지 주소)만 넘기면 같은 화면을 보고 세팅을 평가할 수 있게 만드는 것이 목표.

## 데이터 출처

| 무엇 | 어디서 | 비고 |
|---|---|---|
| 전시 캐릭터(최대 8명) 스탯·광추·유물·행적·성혼 | [Mihomo API](https://api.mihomo.me/sr_info_parsed/{uid}?lang=kr) | 인게임 **캐릭터 전시** + **상세 정보 표시** ON. 로그인 없음, 5분 캐시 |
| **보유 캐릭터 전부** 스탯·광추·유물·행적·성혼 | HoYoLAB 전적 API (`game_record/hkrpg/api/avatar/info`) | 서버에 둔 사이트 주인의 HoYoLAB 쿠키로 조회. 상대가 전적 비공개면 실패 → 전시로 대체. **쿠키당 하루 30개 UID** 제한, 10분 메모리 캐시 |
| 이름·아이콘·이미지·유물 세트 효과 | [StarRailRes](https://github.com/Mar-7th/StarRailRes) | `index_min/kr/*.json`, `icon/`, `image/` (1일 캐시) |
| 파티 편성 | 사이트의 파티 편집기 → `data/parties/<uid>.json` 또는 Upstash Redis | 게임 API 가 파티 편성을 제공하지 않음 |

방문자는 로그인하지 않는다. HoYoLAB 쿠키는 서버 환경변수에만 있고, 같은 캐릭터가 전시와 HoYoLAB 양쪽에 있으면
전시 쪽(스킬 설명·광추 스탯이 더 자세함)을 쓴다.

## 화면 / 주소

| 주소 | 내용 |
|---|---|
| `/` | UID 입력 |
| `/u/{uid}` | 프로필 + 파티 편성(+편집기) + 캐릭터 전체(속성·운명·희귀도·전시 필터) |
| `/u/{uid}/c/{characterId}` | 캐릭터 상세: 기초/가산/최종 스탯 표, 광추, 유물 6부위(부옵 강화 횟수), 세트 효과, 행적, 성혼. "AI 평가용 텍스트 복사" 버튼 |
| `/api/u/{uid}` | 정리된 JSON (전시 + HoYoLAB 합본, `sources` 에 출처 상태). `?raw=1` 이면 Mihomo 원본 |
| `/api/u/{uid}/md` | 캐릭터 전체 마크다운. `?c={characterId}` 한 명, `?showcase=1` 전시만. AI 에게 이 주소를 주면 된다 |
| `/api/u/{uid}/parties` | GET 파티 목록 / PUT 저장(편집 토큰 필요) |
| `/api/u/{uid}/claim` | GET 확인 코드 / POST 본인 확인(서명 또는 관리자 키) → 편집 토큰 쿠키 |

## 파티 편집 (본인 확인)

파티는 최대 12개, 파티당 4명. 아무나 남의 파티를 고치지 못하도록 **인게임 서명으로 본인 확인**한다:

1. 프로필 페이지 → [파티 편집] → 화면에 뜨는 코드(`HSRB-XXXXXX`)를 게임 프로필 **서명**에 넣고 저장
2. [서명 확인] → 전시 API 가 돌려주는 서명에 코드가 있으면 30일짜리 편집 토큰을 httpOnly 쿠키로 발급
3. 이후 서명은 원래대로 돌려도 된다

사이트 주인은 `EDIT_ADMIN_KEY` 를 편집기의 "관리자 키로 확인" 에 넣으면 서명 없이 바로 편집할 수 있다.
코드는 `EDIT_SECRET` 으로 만든 HMAC 이라 UID 마다 고정이다.

## 환경변수 (`.env.local`, git 에 안 올라감)

| 이름 | 용도 |
|---|---|
| `NEXT_PUBLIC_OWNER_UID` | 홈 화면 바로가기 UID |
| `HOYOLAB_LTUID_V2`, `HOYOLAB_LTOKEN_V2` | HoYoLAB 쿠키 (브라우저 F12 → Application → Cookies → hoyolab.com). 없으면 전시만 |
| `EDIT_SECRET` | 편집 토큰·확인 코드 서명용 (아무 긴 문자열) |
| `EDIT_ADMIN_KEY` | 사이트 주인용 편집 키 |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | 선택. 있으면 파티를 Redis 에 저장 (Vercel 처럼 파일을 못 쓰는 곳) |

## 개발

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 타입 검사 포함
node scripts/probe-hoyolab.mjs [uid]   # HoYoLAB 쿠키·응답 점검 (쿠키 값은 출력 안 함)
node scripts/test-parties.mjs [uid]    # 파티 API 흐름 점검 (관리자 키 사용, 끝나면 파티8 하나로 되돌림)
```

- Next.js 16 (App Router, TypeScript) + Tailwind 4. Next 16 은 이전 버전과 다른 점이 많으니
  `node_modules/next/dist/docs/` 를 먼저 본다 (AGENTS.md 참고).
- `src/lib/mihomo.ts` 전시 API · `src/lib/hoyolab.ts` HoYoLAB API + Mihomo 모양으로 변환 ·
  `src/lib/roster.ts` 두 출처 합치기 · `src/lib/stats.ts` 기초+가산 → 최종 · `src/lib/normalize.ts` JSON/마크다운 ·
  `src/lib/claim.ts` 본인 확인 · `src/lib/partyStore.ts` 파티 저장.
- HoYoLAB 데이터는 승급 단계·스킬 최대 레벨·광추 스탯을 주지 않아서 그 부분은 비워 둔다(전시 캐릭터는 다 나옴).

## 배포

Vercel: 저장소 연결 후 위 환경변수를 넣는다. 파티 저장은 Vercel 파일시스템이 읽기 전용이라
Upstash Redis(무료 티어) 두 변수를 함께 넣어야 한다. 자체 서버(VPS)면 파일 저장 그대로 쓰면 된다.
