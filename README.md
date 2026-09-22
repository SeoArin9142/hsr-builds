# HSR Builds

붕괴: 스타레일 UID 하나로 캐릭터 상세 스탯·광추·유물·행적·빌드 평가를 보여 주는 공개 웹.
고수 유저나 AI 에게 UID(또는 페이지 주소)만 넘기면 같은 화면을 보고 세팅을 평가할 수 있게 만드는 것이 목표.

## 데이터 출처

| 무엇 | 어디서 | 비고 |
|---|---|---|
| 전시 캐릭터(최대 8명) 스탯·광추·유물·행적·성혼 | [Mihomo API](https://api.mihomo.me/sr_info_parsed/{uid}?lang=kr) | 인게임 **캐릭터 전시** + **상세 정보 표시** ON. 로그인 없음, 5분 캐시 |
| **보유 캐릭터 전부** 스탯·광추·유물·행적·성혼·기억 정령 | HoYoLAB 전적 API (`game_record/hkrpg/api/avatar/info`) | **그 UID 주인의 쿠키로만** 가능 — 서버 쿠키 풀에 연동된 계정(사이트 주인) 또는 방문자가 [내 계정 연결]로 준 자기 쿠키. HoYoLAB 은 남의 계정엔 최신 8명·스탯 없음만 보여 준다(2026-09 확인). 결과는 7일 캐시(Redis) + 주인 쿠키가 있으면 1시간마다 갱신 |
| 엔드 콘텐츠 기록(혼돈의 기억·허구 서사·종말의 그림자) | HoYoLAB `challenge`, `challenge_story`, `challenge_boss` | 캐릭터 목록과 같은 규칙(주인 쿠키). 실제로 클리어한 편성·사이클·점수 |
| 이름·아이콘·이미지·유물 세트 효과 | [StarRailRes](https://github.com/Mar-7th/StarRailRes) | `index_min/kr/*.json`, `icon/`, `image/` (1일 캐시) |
| 광추 기초 스탯·중첩 효과·스킬 최대 레벨 | StarRailRes `light_cone_promotions`, `light_cone_ranks`, `character_skills` | HoYoLAB 이 안 주는 칸을 메운다 (`src/lib/gamedata.ts`) |
| 추천 부옵션(빌드 평가 가중치) | HoYoLAB `recommend_property` + `src/lib/recoData.ts` | 조회할 때 배워서 Redis 에 쌓고, 기본값은 소스에 묶어 둔다 (로컬·배포 점수가 같도록) |
| 파티 편성 | 사이트의 파티 편집기 → `data/parties/<uid>.json` 또는 Upstash Redis | 게임 API 가 파티 편성을 제공하지 않음 |

방문자는 로그인하지 않는다. 같은 캐릭터가 전시와 HoYoLAB 양쪽에 있으면 전시 쪽(스킬 설명·유물 부옵 단계가 더 자세함)을 쓴다.

### HoYoLAB 조회 순서 (`src/lib/hoyolab.ts`)

1. 메모리 캐시(10분) → Redis 캐시(7일) → 캐시가 1시간 넘게 오래됐거나 없으면 HoYoLAB 호출
2. 호출은 **그 UID 의 주인 쿠키**로만: 방문자가 연결한 자기 쿠키(자기 UID 일 때) → 풀에서 그 UID 가 연동된 계정. 주인 쿠키가 없으면 있는 캐시를 그대로 주거나(`unlinked`) 전시만
3. `10001`(만료) 이면 12시간 죽음 표시했다가 게임 기록 카드로 재확인해 자동 복구. `/admin` 에서 쿠키 상태 확인
4. 남의 계정을 남의 쿠키로 조회하는 건 일부러 안 한다 — 8명·스탯 없음만 와서 전시보다 못하고 한도(계정당 하루 30 UID)만 쓴다

### 내 계정 연결 (`/link`, 선택)

자기 UID 의 전체 캐릭터를 사이트에 보이게 하는 유일한 방법. 방문자가 자기 HoYoLAB 쿠키를 붙여넣으면(Cookie-Editor JSON·
cookies.txt·Cookie 헤더·`ltuid_v2=..; ltoken_v2=..` 어떤 형식이든) 게임 기록 카드로 살아 있는지·어느 UID 계정인지 확인한 뒤
AES-GCM(EDIT_SECRET 유도 키)으로 암호화해 그 브라우저의 httpOnly 쿠키에만 둔다(서버 저장 없음, 30일). 그 사람이 자기 UID 를
열면 그 쿠키로 전체 캐릭터를 받아 7일 캐시하고, 다른 방문자·AI 는 캐시를 본다.

## 빌드 평가 (`src/lib/score.ts`)

등급(S/A/B/C/D)은 **실제 최종 수치**가 목표에 얼마나 닿았는지로 매긴다 — 유물 부옵뿐 아니라 메인옵·광추·행적이 모두
들어 있는 값이라 인게임 체감과 가깝다. 어떤 스탯을 볼지는 HoYoLAB 의 캐릭터별 추천 부옵션(없으면 운명의 길 기본값)으로 정하고,
치확·치피는 한쪽만 추천돼도 둘 다 본다. 유물 부옵 효율(유효 롤 ÷ 6롤)은 따로 보여 주는 참고 수치다.
계산 근거(목표치·달성률·속도 구간·치확:치피 비율·메인옵 판정)를 화면에 같이 띄우고,
스탯 표에는 추천 스탯마다 **S 기준 목표치와 차이**를 함께 적는다. 등급 구간은 화면에 그대로 표시한다.

## 화면 / 주소

| 주소 | 내용 |
|---|---|
| `/` | UID 입력 |
| `/u/{uid}` | 프로필(엔드 콘텐츠 별 수 요약) + 파티 편성(+편집기) + 최근 변화 + 엔드 콘텐츠 기록 + 캐릭터 전체(속성·운명·희귀도·전시 필터, 정렬) |
| `/u/{uid}/c/{characterId}` | 캐릭터 상세: 기초/가산/최종 스탯 표(목표치·차이), 빌드 평가, 광추, 유물 6부위(부옵 강화 횟수), 세트 효과, 행적, 성혼, 기억 정령. "AI 평가용 텍스트 복사" 버튼 |
| `/u/{uid}/compare?c=1310,1225` | 캐릭터 비교 (최대 4명, 가장 높은 값 강조) |
| `/api/u/{uid}` | 정리된 JSON (전시 + HoYoLAB 합본, `sources` 에 출처 상태). `?raw=1` 이면 Mihomo 원본 |
| `/api/u/{uid}/md` | 캐릭터 전체 마크다운. `?c={characterId}` 한 명, `?showcase=1` 전시만, `?lang=ko|en|ja|cn|tw` 언어. AI 에게 이 주소를 주면 된다 |
| `/api/u/{uid}/parties` | GET 파티 목록 / PUT 저장(편집 토큰 필요) |
| `/api/u/{uid}/claim` | GET 확인 코드 / POST 본인 확인(서명 또는 관리자 키) → 편집 토큰 쿠키 |
| `/link`, `/api/link` | 내 계정 연결 (GET 상태 / POST 연결 / DELETE 해제) |
| `/feedback`, `/api/feedback` | 문의·제보 (90일 보관, `/admin` 에서 확인) |
| `/privacy` | 저장하는 정보 안내 |
| `/admin`, `/api/admin/status` | 쿠키 풀·이번 달 사용량·문의 (헤더 `x-admin-key: EDIT_ADMIN_KEY`) |
| `/api/cron/health` | 하루 한 번 점검 (아래 참고) |
| `/sitemap.xml`, `/robots.txt` | 공개 화면만 색인 (`/api/`, `/admin`, `/u/` 는 제외) |
| `/u/{uid}?refresh=1` | 캐시 무시하고 다시 조회 — 자기 쿠키를 연결했거나 그 UID 의 주인으로 확인된 사람만 |

공유 카드(Open Graph)는 홈은 `public/og-home.png` 정적 이미지, 프로필·캐릭터는 `next/og` 로 그린다.

## 언어

한국어·English·日本語·简体中文·繁體中文. 머리말에서 고르면 쿠키(`hsrb_lang`)에 저장, 없으면 브라우저 언어.
문구는 `src/lib/i18n.ts` 사전 하나로 관리하고(키가 빠지면 타입 오류), 데이터 이름은 Mihomo(`lang=kr|en|jp|cn|cht`)·
StarRailRes(`index_min/{kr,en,jp,cn,cht}`)·HoYoLAB(`x-rpc-language`)에 같은 언어를 요청해 맞춘다. 캐시도 언어별.
중국 서버 UID(1~5 로 시작)는 전시만 된다 — HoYoLAB 이 아니라 米游社를 써서 계정 연결이 안 된다.

## 파티 편집 (본인 확인)

파티는 최대 12개, 파티당 4명. 아무나 남의 파티를 고치지 못하도록 **인게임 서명으로 본인 확인**한다:

1. 프로필 페이지 → [파티 편집] → 화면에 뜨는 코드(`HSRB-XXXXXX`)를 게임 프로필 **서명**에 넣고 저장
2. [서명 확인] → 전시 API 가 돌려주는 서명에 코드가 있으면 30일짜리 편집 토큰을 httpOnly 쿠키로 발급
3. 이후 서명은 원래대로 돌려도 된다

코드는 **브라우저마다 다르다** — [파티 편집]을 열 때 그 브라우저에 무작위 nonce 쿠키를 주고 `HMAC(EDIT_SECRET, uid+nonce)`
로 코드를 만든다. 그래서 서명에 코드를 지우지 않고 그대로 두어도 다른 사람은 그 코드로 통과할 수 없다(다른 브라우저 = 다른 코드).
사이트 주인은 `EDIT_ADMIN_KEY` 를 편집기의 "관리자 키로 확인" 에 넣으면 서명 없이 바로 편집할 수 있다.

## 부하·비용 막기 (`src/proxy.ts`)

무료 호스팅 한도에 닿기 전에 우리가 먼저 멈춘다.

- IP 당 분당 120회(봇·스크립트 UA 는 20회), IP 당 10분에 서로 다른 UID 30개
- 이번 달 요청 수가 `MONTHLY_BUDGET`(기본 50,000)을 넘거나 Upstash 가 월 한도 초과를 돌려주면,
  다음 달 1일 00시(KST)까지 안내 화면(503)을 보여 준다. `/admin` 과 `/api/cron` 은 예외
- 페이지뷰·고유 방문자(HyperLogLog, 무작위 ID 쿠키 `hsrb_vid`)를 센다. 개인정보는 담지 않는다
- 없는 UID 는 10분, Mihomo 가 429 를 주면 60초 동안 다시 부르지 않는다

### 하루 한 번 점검 (`/api/cron/health`)

`vercel.json` 의 크론이 매일 09시(KST)에 부른다. 사이트 쿠키가 아직 살아 있는지 확인하고, 만료됐거나 이번 달 요청이
예산의 80% 를 넘었으면 `ALERT_WEBHOOK`(Discord·Slack 웹훅)으로 알린다. 웹훅이 없으면 서버 로그에만 남는다.
`CRON_SECRET` 이 있어야 부를 수 있고, 손으로 부를 때는 `x-admin-key` 를 쓴다.

## 최근 변화 (`src/lib/history.ts`)

UID 당 기준점 스냅샷 하나만 저장해 두고 지금 상태와 견줘 레벨·성혼·광추·빌드 점수가 달라진 캐릭터를 보여 준다.
기준점이 7일보다 오래되면 지금 상태로 갈아 끼운다(갈아 끼운 직후에는 잠시 "달라진 점 없음"). 기록이 UID 당 하나뿐이라
저장 공간이 늘어나지 않는다. 전적을 온전히 받았을 때만 기준점을 잡는다.

## 환경변수 (`.env.local`, git 에 안 올라감)

| 이름 | 용도 |
|---|---|
| `NEXT_PUBLIC_OWNER_UID` | 홈 화면 바로가기 UID |
| `NEXT_PUBLIC_SITE_URL` | 공유 카드·sitemap·robots 에 쓰는 사이트 주소 |
| `HOYOLAB_LTUID_V2`, `HOYOLAB_LTOKEN_V2` | 사이트 주인 HoYoLAB 쿠키 (브라우저 F12 → Application → Cookies → hoyolab.com) |
| `HOYOLAB_COOKIES` | 쿠키를 더 둘 때: `ltuid:ltoken` 을 쉼표로. 각 쿠키는 자기 계정에 연동된 UID 만 전체 조회할 수 있다. 전부 없으면 전시만 |
| `EDIT_SECRET` | 편집 토큰·확인 코드 서명 + 연결 쿠키 암호화 (아무 긴 문자열) |
| `EDIT_ADMIN_KEY` | 사이트 주인용 편집·관리 키 |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (또는 Vercel Upstash 연동이 넣는 `KV_REST_API_URL`, `KV_REST_API_TOKEN`) | 선택. 있으면 파티·캐시·방문 집계를 Redis 에 저장 (Vercel 처럼 파일을 못 쓰는 곳) |
| `MONTHLY_BUDGET` | 이번 달 요청 상한 (기본 50000) |
| `ALERT_WEBHOOK` | 선택. 점검 알림을 보낼 Discord/Slack 웹훅 |
| `CRON_SECRET` | `/api/cron/health` 를 부를 때 쓰는 비밀값 |

## 개발

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 순수 함수 자동 테스트 (스탯·빌드 평가·본인 확인·쿠키 파싱·파티 검사·기록 비교)
npm run build    # 타입 검사 포함
npx eslint src tests scripts
node scripts/probe-hoyolab.mjs [uid]   # HoYoLAB 쿠키·응답 점검 (쿠키 값은 출력 안 함)
node scripts/probe-endgame.mjs [uid]   # 엔드 콘텐츠 응답 점검
node scripts/probe-cookies.mjs [--full] # 풀의 쿠키 전부 살아 있는지 (--full: 남의 전적 조회까지, 쿠키당 UID 1개 소모)
node scripts/test-link.mjs             # 내 계정 연결 API 흐름
node scripts/test-parties.mjs [uid]    # 파티 API 흐름 점검 (관리자 키 사용, 끝나면 파티8 하나로 되돌림)
```

- Next.js 16 (App Router, TypeScript) + Tailwind 4. Next 16 은 이전 버전과 다른 점이 많으니
  `node_modules/next/dist/docs/` 를 먼저 본다 (AGENTS.md 참고). 미들웨어 파일 이름은 `src/proxy.ts` 다.
- `src/lib/mihomo.ts` 전시 API · `src/lib/hoyolab.ts` HoYoLAB API + Mihomo 모양으로 변환 ·
  `src/lib/gamedata.ts` 빈칸 메우기 · `src/lib/endgame.ts` 엔드 콘텐츠 · `src/lib/roster.ts` 두 출처 합치기 ·
  `src/lib/stats.ts` 기초+가산 → 최종 · `src/lib/score.ts` 빌드 평가 · `src/lib/normalize.ts` JSON/마크다운 ·
  `src/lib/claim.ts` 본인 확인 · `src/lib/partyStore.ts` 파티 저장 · `src/lib/history.ts` 최근 변화.
- 테스트는 `tests/*.test.ts` (node 내장 러너 + tsx). 바깥을 부르지 않는 순수 함수만 다룬다.
- 쿠키 관리: `ltoken_v2` 는 로그인 세션이라 그 계정으로 **로그아웃하거나 다시 로그인하면 무효**가 된다.
  계정마다 시크릿 창에서 로그인 → 쿠키 복사 → 로그아웃 없이 창 닫기. 만료되면 `/admin` 에 "만료" 로 뜨고 점검 알림이 간다.

## 배포

Vercel: 저장소 연결 후 위 환경변수를 넣는다. 파티 저장·캐시·방문 집계는 Vercel 파일시스템이 읽기 전용이라
Upstash Redis(무료 티어) 두 변수를 함께 넣어야 한다. 자체 서버(VPS)면 파일 저장 그대로 쓰면 된다.
크론(`/api/cron/health`)은 Vercel 에서 `vercel.json` 을 읽어 자동으로 등록된다 — `CRON_SECRET` 을 잊지 말 것.
