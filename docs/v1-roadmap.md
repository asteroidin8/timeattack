# 투두런 출시 후 로드맵 (v1.x) — 실행 스펙

> 이 문서는 작업자가 바뀌어도 동일하게 수행할 수 있도록 각 작업의 **배경(왜)·정확한 요구사항·구현 가이드·수용 기준·함정**을 명시한다.
> 진행 상태 체크는 `task.md`, 커밋/머지 단위는 루트 `handoff.json`(스키마: zndi/docs/agent/workflow.md 참조)로 관리한다.

---

## 0. 모든 작업 공통 규칙 (필독)

### 0-1. 프로세스
- **요청받지 않은 기능·구조 변경 금지.** 필요하다고 판단되면 먼저 제안하고 승인 후 작업 (2026-07-06 유저 합의).
- 한 배치 작업이 끝나면 루트 `handoff.json`을 READY로 작성 (커밋은 composer 담당 — 직접 commit/push 금지).
- 검증 루틴: `npx tsc --noEmit` → `npx jest` → `npx expo export --platform web` → 웹 프리뷰로 시나리오 검증. 네이티브 전용 기능은 "기기 검증 필요"를 handoff tests에 명시.

### 0-2. 용어·카피 규칙
- **설명이 필요한 은어 금지**: 버디/이글(골프), DNF(레이싱 은어+던파 충돌) 순으로 폐기된 역사가 있음. 실패 상태 공식 용어는 **"미완주"**(포기에만 사용), 조기 클리어 지표는 **"타임 세이브"**.
- **마케팅 문구는 긍정 프레이밍만**("도망치면~" 같은 위협 표현 금지). 인앱 실패 시점 문구는 사실 전달. 스토어 문구 원본: `docs/store-listing.md`.
- HUD 영문 캡스(STAGE/BET/COMBO/FINISH/DAY/LV/TIME SAVE)는 전 언어 공통 — i18n 대상 아님.

### 0-3. 디자인 시스템 (tailwind.config.js에 정의됨)
- 팔레트 5색: paper `#FEFDFB` / track `#EEEDE8` / hairline `#ECEAE4` / ink `#1C1C1A`·ink-mute `#A6A69E`·ink-faint `#C9C7C0` / racing `#E5202E`.
- **빨강은 "시간·오늘·CTA"에만**. 성과 숫자는 잉크. 실패는 회색.
- 숫자는 전부 `font-digit`(Barlow Condensed Medium Italic) / `font-digitbold`(SemiBold Italic) + 이탤릭. 한글 UI는 시스템 폰트(추후 Pretendard 검토).
- 면(회색 박스) 최소화 — 구분은 0.5px 헤어라인. 버튼은 rounded-2xl, 화면당 빨강 채움 CTA 1개.
- 라이트 온리(app.json userInterfaceStyle: light). 다크 모드는 별도 결정 전 금지.

### 0-4. 기술 지뢰 (이 레포에서 실제로 밟은 것들)
| 지뢰 | 대응 |
|---|---|
| SafeAreaView가 inset을 **인라인 padding으로 덮어씀** | 레이아웃 패딩은 반드시 내부 View/KAV에. SafeAreaView엔 flex-1/bg만 |
| SafeAreaView는 NativeWind 기본 interop 아님 | `_layout.tsx`의 `cssInterop(SafeAreaView, ...)` 유지 |
| SDK 53+ Android **edge-to-edge 강제** → adjustResize/'height' 무효 | KeyboardAvoidingView `behavior="padding"` 양 플랫폼 |
| react-native-web은 **Alert 미구현** | 다이얼로그는 반드시 `src/utils/dialog.ts` (notify/confirmDestructive) 경유 |
| RN-web Modal: 콘텐츠 탭이 오버레이로 전파돼 닫힘 | 백드롭 Pressable을 콘텐츠의 **형제(absolute)**로 (EditTaskSheet 참조) |
| 웹 input의 intrinsic min-width가 flex 축소 차단 | 행 안의 TextInput에 `min-w-0` |
| rAF 스로틀 환경에서 애니메이션 정지 | useCountUp처럼 setTimeout **finisher로 최종값 보장** |
| Expo Go(SDK 53+)는 expo-notifications import 시 throw | `src/services/notifications.ts`의 lazy-import 패턴 유지 |
| persist 스토어는 복원 전 기본값이 진짜처럼 보임 | **hydrated 게이트** 필수(useRunStore/useProgressStore 패턴). 라우팅·표시 판단 전 게이트 |
| 타이머를 setInterval로 세면 백그라운드에서 틀어짐 | 반드시 endAt 타임스탬프 기준 렌더 |
| (개발 환경) Bash cwd가 zndi로 리셋되는 경우 있음 | timeattack 명령은 절대경로 cd 프리픽스 |

### 0-5. 게임 경제 불변식 (수정 금지, 위반 시 테스트가 깨짐)
- `src/domain/xp.ts`: **정직한 베팅이 뻥튀기 베팅보다 항상 XP가 높다** (accurate ×1.5 > early ×1.2 > overtime ×1.0, 일일 상한 1200). 밸런스 수치를 바꿔도 이 부등호는 유지.
- 랭킹·경쟁 지표(3단계)는 **검증 가능한 것만**(측정 집중 시간·스트릭). 자기신고 지표(클리어 수·타임 세이브)는 개인 뱃지/레벨용.
- 이탈 회계(`src/domain/away.ts`): 잠금=집중 인정, 앱 전환=차감, 실패 없음, 킬 폴백=보수적 차감.

---

## V1-1. 태스크별 상세 결과 + 퍼펙트 뱃지 (우선순위 1, S)

**배경**: XP 배수 체계(±10% 정확=최대)가 UI에 드러나지 않아 "빨리 끝냈는데 왜 XP가 적지?"라는 의문이 생김. 결과 화면에서 태스크별로 보여주면 시스템이 스스로 설명됨.

**요구사항**
- 결과 화면(`src/app/result.tsx`) 스탯 행 아래에 태스크별 리스트 추가: 각 행 = 제목 · 베팅 vs 실제(`50:00 → 48:12` digit 이탤릭) · 뱃지.
- 뱃지 규칙(`gradeClear` 결과 그대로): accurate → **퍼펙트**(빨강), early → **단축**(잉크), overtime → **완주**(뮤트), giveup → **미완주**(뮤트, 취소선 제목).
- 공유 카드에는 넣지 않는다(카드 과밀 방지).

**구현 가이드**: `runXp` 옆에 이미 있는 `gradeClear(betSeconds, actualSeconds)` 사용. 새 도메인 로직 불필요. 행 UI는 플래닝 행 스타일(헤어라인 구분) 재사용.

**수용 기준**: 4개 상태가 각각 올바른 뱃지로 렌더(웹 시나리오: 조기/정확/초과/포기 태스크 1개씩 만들어 완주) · tsc/jest 통과 · 뱃지 용어가 0-2 규칙 준수.

---

## V1-2. 설정 화면 (우선순위 2, M)

**배경**: 알림 끄기·데이터 초기화 요구는 스토어 리뷰 단골. 개인정보방침 링크는 심사 대응에도 유용.

**요구사항**
- 라우트 `src/app/settings.tsx`, 진입: 플래닝 헤더에 아이콘 없이 텍스트 진입점 추가 금지 — **통계 화면(`stats.tsx`) 우상단 "설정"** 텍스트 버튼으로 진입(화면 밀도 유지).
- 항목: ①세션 종료 알림 on/off(기본 on, `useSettingsStore` 신설·persist·hydrated 게이트) ②모든 기록 초기화(confirmDestructive 2단 확인 → useRunStore/useProgressStore 초기화 + AsyncStorage 해당 키 remove) ③개인정보처리방침(외부 링크: https://asteroidin8.github.io/timeattack/privacy.html) ④앱 버전(expo-constants).
- 알림 off 시 `session.tsx`의 스케줄 effect가 예약을 건너뛰어야 함(설정값 구독).

**함정**: 새 persist 스토어에도 반드시 hydrated 게이트(0-4). 초기화는 진행 중 런이 있으면 차단(currentIndex !== null이면 "레이스 종료 후 가능" 안내).

**수용 기준**: 알림 off 후 세션에서 예약 0건(로그 확인) · 초기화 후 온보딩부터 재시작 · 링크가 기기 브라우저로 열림.

---

## V1-3. i18n (영어) — post-launch-i18n (우선순위 3, M)

**배경**: 한국 반응 확인 후 진행하기로 결정(2026-07-05). **첫 실행 언어 선택 화면은 만들지 않는다** — 기기 언어 자동 감지 + 설정에서 수동 변경(V1-2 의존).

**요구사항**
- `expo-localization` 설치. `src/i18n/ko.ts`·`en.ts`·`index.ts(t 함수)` — 라이브러리는 i18n-js 또는 자체 딕셔너리(문구 ~60개 수준이라 자체로 충분).
- 번역 대상: 화면 본문·다이얼로그·알림 body·온보딩. **비대상**: HUD 영문 캡스(0-2), 스토어 문구(스토어 콘솔에서 로케일별 관리).
- 감지: `getLocales()[0].languageCode === 'ko' ? ko : en`. 설정 화면에 언어 항목 추가(시스템/한국어/English, useSettingsStore).
- 영어 카피 톤: store-listing.md의 긍정 프레이밍 유지. "베팅"은 bet, "타임 세이브" 그대로, "미완주"는 DNF **금지** → "not finished".

**수용 기준**: 기기 언어 en일 때 전 화면 영어 · ko일 때 기존과 100% 동일(스냅샷 비교) · 날짜 포맷 로케일 적용(toLocaleDateString 인자 연동).

---

## V1-4. AOD풍 세션 절전 모드 (우선순위 4, M)

**배경**: 세션 중 keep-awake로 화면이 계속 켜져 있어 OLED/배터리 배려 + "책상 위 스톱워치" 연출. 잠금이 무해해져(away 완성형) 필수는 아니고 감성 기능. 시스템 AOD 통합은 서드파티 불가 — 인앱 구현.

**요구사항**
- `session.tsx`: 무터치 30초 후 절전 뷰로 전환(터치 리스너는 View onTouchStart로 리셋). 절전 뷰 = 잉크(#1C1C1A) 배경 + 타이머 숫자만(racing, 위험구간 규칙 유지) + 태스크명 소형. 화면 아무 곳 탭 → 일반 뷰 복귀.
- 가로 모드 옵션은 **하지 않는다**(orientation portrait 고정 유지 — 회전 지원은 별도 결정 필요). 대신 절전 뷰 타이머를 90° 회전한 시안을 유저에게 먼저 제안할 것.
- 다크 배경은 이 화면 한정 예외(라이트 온리 원칙의 의도적 예외로 task.md에 기록).

**수용 기준**: 30초 무터치 전환·탭 복귀·타이머 정확도 유지(endAt 기준이라 자동 만족)·완료/포기 버튼은 절전 뷰에서 숨김.

---

## V1-5. 브랜딩 잔여 (우선순위 5, S — 대부분 유저 액션)

- todorun.app 도메인 구매(연 2만원 안팎) → GitHub Pages 리다이렉트 + 스토어 URL 교체.
- @todorun 인스타 핸들 선점, 공유 카드 하단에 핸들 노출(ShareCard.tsx 한 줄).
- 상표 출원(9류, 셀프 5~6만원+등록료) — KIPRIS 검색은 2026-07-06 통과(투두런/todorun 결과 없음).

---

## V1-6. iOS 출시 (우선순위 6, M)

- 선행: Apple Developer($99/년) 가입(유저), 안드로이드 반응 긍정 확인.
- `eas build -p ios --profile production` → TestFlight → 심사. bundleIdentifier `com.asteroidin8.todorun` 설정됨.
- **iOS 전용 기기 검증**: ①잠금 감지(modules/screen-state의 protectedData 경로)는 **기기 암호 설정 시에만** 동작 — 암호 없으면 차감 폴백(문서화된 동작) ②keep-awake ③알림 권한 플로우 ④공유 시트.
- 스크린샷: iOS 요구 해상도(1290×2796)로 store-assets 생성 스크립트 재실행(스크래치패드 스크립트 재작성 필요 시 `store-assets/` 내 PNG를 sharp로 리사이즈 금지 — 벡터에서 재렌더).

---

## V2 (3단계 소셜) — 착수 전 반드시 재확인할 설계 합의

> 1단계 재미 검증(유저 본인 1주 실사용 + 초기 유저 반응) 통과 시에만 착수.

1. **스택**: Supabase(인증·Postgres·Edge Functions). zndi의 cloudSync 패턴 참고 가능.
2. **순서**: 익명/소셜 로그인 → 기록 서버 동기화(로컬 우선, 충돌은 last-write) → 친구 랭킹 → 주간 리그.
3. **랭킹 지표는 검증 가능한 것만**: 측정 집중 시간(이탈 차감 후), 스트릭. 클리어 수·타임 세이브는 랭킹 금지(자기신고 치팅 벡터).
4. **주간 리그**: 전체 순위 대신 ~30명 그룹 승급/강등(듀오링고 모델), 매주 월요일 리셋(Edge Function cron).
5. 서버 검증: 클라이언트 XP를 신뢰하지 말고 원시 세션 로그(시작/종료/이탈)를 올려 서버에서 재계산.

---

## 부록: 빌드·배포 절차

1. 배치 머지 확인(handoff DONE) → `cd C:/Users/llkio/OneDrive/Desktop/timeattack`
2. 기기 테스트용: `npx eas-cli build -p android --profile preview --non-interactive` (APK, QR 설치)
3. 스토어용: `npx eas-cli build -p android --profile production --non-interactive` (AAB, versionCode 자동 증가 — eas.json appVersionSource remote)
4. Play Console: 신규 개인 계정은 프로덕션 전 **비공개 테스트(일정 인원·14일) 요건** — 제출 전 최신 정책 확인.
5. 스토어 텍스트는 `docs/store-listing.md`, 이미지는 `store-assets/`(재생성 스크립트는 세션 스크래치패드에 있었으므로 필요 시 store-assets.js를 이 문서 기준으로 재작성: sharp+fontconfig, Barlow Condensed Italic ttf 다운로드 방식).
