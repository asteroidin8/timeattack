# 투두런 출시 후 로드맵 (v1.x) — 실행 스펙

> 이 문서는 작업자가 바뀌어도 동일하게 수행할 수 있도록 각 작업의 **배경(왜)·정확한 요구사항·구현 가이드·수용 기준·함정**을 명시한다.
> 진행 상태 체크는 `task.md`, 커밋/머지 단위는 루트 `handoff.json`(스키마: zndi/docs/agent/workflow.md 참조)로 관리한다.

---

## 0. 모든 작업 공통 규칙 (필독)

### 0-0. 작업 체계: 지휘자 / 구현자 분리

이 프로젝트는 **지휘자(orchestrator)–구현자(implementer)** 2역 체계로 운영한다.

| 역할 | 담당 모델 | 책임 |
|---|---|---|
| **지휘자** | 상위 모델 (예: Fable/Opus) | 스펙 확정·구현 지시(스펙 ID 단위)·결과 diff 리뷰·**최종 검증(웹 시나리오 실행)**·handoff.json 작성·유저 커뮤니케이션·이 문서 유지보수 |
| **구현자** | Sonnet (`.claude/agents/implementer.md`) | 지시받은 스펙 ID **범위만** 구현, 자체 tsc/jest 실행, 변경 파일·검증 결과·스펙에서 벗어난 판단 보고 |

**운영 규칙**
1. 구현자는 대화 맥락 없이 시작하므로, 지시 프롬프트에는 반드시 ①스펙 ID(예: V1-2) ②이 문서 경로 ③"0장 공통 규칙 필독"을 포함한다.
2. 구현자는 스펙에 없는 기능·구조 변경을 하지 않는다. 필요하다고 판단되면 **구현하지 말고 보고만** 한다 (지휘자가 유저 승인 후 스펙에 반영).
3. 검증 책임은 최종적으로 지휘자에게 있다 — 구현자의 "테스트 통과" 보고를 신뢰하되, 웹 프리뷰 시나리오 검증과 버그 리뷰는 지휘자가 직접 수행한 뒤 handoff를 올린다. (이 프로젝트에서 실제 버그의 다수가 이 단계에서 발견됐다.)
4. handoff.json 작성·유저 보고는 지휘자만 한다. 구현자 보고는 handoff의 초안 재료다.

### 0-1. 프로세스
- **요청받지 않은 기능·구조 변경 금지.** 필요하다고 판단되면 먼저 제안하고 승인 후 작업 (2026-07-06 유저 합의).
- 한 배치 작업이 끝나면 루트 `handoff.json`을 READY로 작성.
- **깃 매니저(2026-07-13부터 지휘자 겸임 — Cursor composer 제거됨)**: READY handoff를 받아 branch_hint로 브랜치 생성 → task별 commit(메시지·파일은 handoff 그대로) → push → PR 생성 → **squash merge** → handoff를 DONE으로 갱신(merged pr/commit/title, task별 status:"merged", merge_note). 구현자(implementer)는 여전히 commit/push 금지.
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

**구현 가이드**: `runXp` 옆에 이미 있는 `gradeClear(betSeconds, actualSeconds)` 사용. 행 UI는 플래닝 행 스타일(헤어라인 구분) 재사용.
**확장(같은 배치 권장)**: 런 종료 시 태스크 스냅샷(제목·베팅·실제·상태)을 DailyRecord에 저장하도록 데이터 모델 확장 — V1-7 날짜 상세에서 태스크 리스트까지 보여줄 수 있게 하는 기반. 스키마 변경 시 기존 persist 데이터와의 호환(스냅샷 없는 과거 기록은 집계만 표시) 필수.

**수용 기준**: 4개 상태가 각각 올바른 뱃지로 렌더(웹 시나리오: 조기/정확/초과/포기 태스크 1개씩 만들어 완주) · tsc/jest 통과 · 뱃지 용어가 0-2 규칙 준수.

---

## V1-2. 설정 화면 (우선순위 2, M)

**배경**: 알림 끄기·데이터 초기화 요구는 스토어 리뷰 단골. 개인정보방침 링크는 심사 대응에도 유용.

**요구사항**
- 라우트 `src/app/settings.tsx`, 진입: 플래닝 헤더에 아이콘 없이 텍스트 진입점 추가 금지 — **통계 화면(`stats.tsx`) 우상단 "설정"** 텍스트 버튼으로 진입(화면 밀도 유지).
- 항목: ①세션 알림 on/off(기본 on, `useSettingsStore` 신설·persist·hydrated 게이트 — V1-8 초과 리마인더도 함께 제어) ②모든 기록 초기화(confirmDestructive 2단 확인 → useRunStore/useProgressStore 초기화 + AsyncStorage 해당 키 remove, onboarded도 리셋) ③문의하기(mailto asteroidin8@gmail.com — 유저 승인 2026-07-12) ④개인정보처리방침(외부 링크: https://asteroidin8.github.io/timeattack/privacy.html) ⑤앱 버전(expo-constants).
- **[완료 2026-07-12]** 출시 전 포함으로 유저 결정, 지휘자 직접 구현(구현자 세션 한도 2회 중단). 웹 검증: 진입·토글 persist·초기화→온보딩 재시작·설정값 보존.
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
- `session.tsx`: 무터치 30초 후 절전 뷰로 전환(터치 리스너는 View onTouchStart로 리셋). 절전 뷰 = 잉크(#1C1C1A) 배경 + 타이머 숫자(평시 paper, 위험구간 racing) + 태스크명 소형 + "탭하면 돌아가요". 화면 아무 곳 탭 → 일반 뷰 복귀.
- **설정 토글(유저 추가 요청 2026-07-12)**: useSettingsStore `aodEnabled`(기본 on) — 설정 화면 "절전 화면" 행. off면 전환 안 함(전환 중이었다면 즉시 해제).
- 가로 모드 옵션은 **하지 않는다**(orientation portrait 고정 유지).
- 다크 배경은 이 화면 한정 예외(라이트 온리 원칙의 의도적 예외).

**수용 기준**: 30초 무터치 전환·탭 복귀·타이머 정확도 유지·완료/포기 버튼은 절전 뷰에서 숨김·토글 off 시 미전환.

**[완료 2026-07-12]** 출시 전 포함으로 유저 결정(지휘자 직접 구현). 웹 검증: 무터치 31초 전환(잉크 풀스크린), 탭 복귀, off 시 미전환.

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

## V1-7. 통계 날짜 상세 + 기록 삭제 (승인됨 2026-07-08, S)

**배경**: 히트맵이 "언제"를 보여주니 탭하면 "얼마나"가 나오는 게 자연스러움(zndi 통계 패턴). 삭제는 테스트 기록 정리 등 실수요가 있고, 기록을 **줄이는 것만** 가능해 정합성에 안전.

**비목표(영구)**: 기록 **수정 금지**. 측정값을 손으로 고칠 수 있으면 "부풀려지지 않은 기록"이라는 핵심 서사와 향후 랭킹 신뢰가 무너짐. 수정 요청이 와도 구현하지 말고 이 항목을 근거로 논의할 것.

**요구사항**
1. `StreakCalendar`에 `onSelectDate?: (date: string) => void` prop 추가. **기록이 있는 날짜만** 탭 가능(없는 날 탭은 무반응).
2. `stats.tsx`: 날짜 탭 → 하단 시트(DayDetailSheet)로 그날 집계 표시 — 타이틀 "M월 D일" + 행 5개: 집중 시간(formatClock) / XP / 클리어(cleared/attempted) / 타임 세이브(formatClock) / 최대 콤보(×N). 태스크 단위 리스트는 이 스펙 범위 아님(스냅샷 저장은 V1-1 확장에서).
3. 시트 하단 "이 날 기록 삭제"(racing 텍스트) → `confirmDestructive` 2단 확인 → `useProgressStore.deleteRecord(date)`.
4. `useProgressStore.deleteRecord(date)`: records에서 해당 날짜 제거 + `totalXp = max(0, totalXp - 그날 xp)`. 스트릭·히트맵·주간 집계는 파생값이라 자동 반영.

**구현 가이드**: 시트는 `EditTaskSheet.tsx`의 Modal 패턴 복제 — **백드롭 Pressable을 콘텐츠의 형제(absolute)로**(0-4 지뢰). 다이얼로그는 dialog.ts 경유. 새 파일 `src/components/DayDetailSheet.tsx` 권장.

**수용 기준**
- 기록 있는 날 탭 → 시트에 5개 집계값 정확 표시 / 없는 날 탭 → 무반응
- 삭제 확인 후: 시트 닫힘 · 히트맵 셀 빈색 · 메트릭(주간 집중·누적 타임 세이브·LV·DAY) 즉시 갱신 · totalXp가 정확히 그날 xp만큼 감소
- 웹 검증 시나리오: localStorage로 records 3일치 시딩 → 탭·표시값 대조 → 삭제 → localStorage와 화면 동시 확인
- tsc/jest/export 통과

---

## V1-8. 초과 방치 방어 — 리마인더 + 2배수 자동 정산 (승인됨 2026-07-09, S~M)

**배경**: 완료를 잊고 세션을 방치하면 타이머가 무한 초과되고, 특히 폰을 잠근 경우 "잠금=집중 인정" 정책 때문에 유령 집중 시간이 쌓임(유저 실사용에서 발생. 열품타의 '부정 측정' 동급 문제). 기록 수정은 영구 비목표이므로, 시스템이 정직하게 상한을 끊어줘야 함.

**요구사항**
1. **초과 리마인더 알림 1회**: 예약 시점 = `endAt + floor(betSeconds / 2)` (자동 정산까지 절반). 제목 "아직 달리는 중인가요?", 본문 `"{제목}" 베팅의 절반을 초과했어요. 베팅의 2배가 되면 자동으로 기록돼요.` — `src/services/notifications.ts`에 함수 추가, 세션의 태스크 시작 시 기존 '타임 오버' 알림과 **함께 예약**, 완료/포기/전환/언마운트 시 **함께 취소**(알림 id 2개 관리).
2. **자동 정산**: 상한 시각 = `startedAt + 2 × betSeconds × 1000`. 세션 화면의 타이머 틱·마운트·포그라운드 정산 시점에 `now ≥ 상한`이면 `autoSettleOverdue()` 실행:
   - completeCurrent와 동일한 클리어 처리(콤보 증가 포함)하되 **wallSeconds를 `2 × betSeconds`로 캡** → `actualSeconds = max(1, cap − awaySeconds)`.
   - 처리 직후 `notify`: `"{제목}" — 오래 초과되어 베팅의 2배 시점까지만 기록했어요.`
3. **연쇄 정산 없음(명시)**: 정산은 실제 복귀/틱 시점에 일어나고 다음 태스크의 startedAt은 그 시점의 now — 방치 중 대기열 전체가 가상으로 연쇄 정산되지 않는다.
4. 상수·순수 로직은 `src/domain/xp.ts`에: `OVERTIME_CAP_MULTIPLIER = 2`, `capOvertimeWallSeconds(betSeconds, wallSeconds)` + 테스트(캡 미만은 그대로, 초과는 2×bet).

**수용 기준**
- 웹 시나리오(Date.now 조작): 진행 중 세션에서 now를 상한+로 → 자동 정산 발생, 태스크 clear·actualSeconds ≤ 2×bet(−away), 안내 다이얼로그, 다음 태스크(또는 결과)로 진행
- 초과했지만 상한 미만이면 자동 정산 없음(기존 +표시 유지)
- 리마인더 알림은 네이티브 전용 — 예약/취소 코드 경로만 확인, 실발송은 기기 검증 항목
- tsc / jest(도메인 테스트 추가) / expo export 통과

**함정**: endAt은 건드리지 않는다(타이머 표시·기존 알림 기준). away 차감은 캡 적용 **후**에 뺀다. 알림 id가 1개→2개가 되므로 세션의 notificationId ref 구조 변경 주의.

---

## V1-9. 수익화 — 광고 + '광고 없이 이용하기' IAP (확정: 반응 확인 후 착수, M~L)

**유저 확정(2026-07-12)**: v1.0은 무수집·무광고로 출시하고, 리텐션/유저 반응이 확인되면 이 배치를 착수한다. 목적은 부수입 파이프라인. 착수 트리거(권장 기준): DAU가 수백 단위로 안착하거나 오가닉 다운로드가 꾸준할 때 — 그 전엔 광고 수익이 사실상 0이라 심사·방침 부담만 선불.

**포함 범위(착수 시)**
1. 광고: `react-native-google-mobile-ads`(config plugin, 네이티브 재빌드) + AdMob 계정·앱·광고단위 등록(유저 액션). **배치 원칙: 세션 화면 절대 금지**(집중 앱 정체성). 후보 — 결과 화면 하단 배너, 또는 "새 플래닝 시작" 전환 시 전면 광고(빈도 상한 예: 1일 3회).
2. IAP '광고 없이 이용하기': 비소모성 상품, Play Billing(expo-iap 또는 react-native-iap), 구매 상태 `useProStore`(persist)·구매 복원 버튼. 설정 페이지 상단 노출 + 결과 화면에 가벼운 업셀 1줄.
3. **부수 의무(같은 배치 필수)**: 개인정보처리방침 전면 개정(광고 SDK 수집 항목 — "수집 제로" 문구 폐기), Play 데이터 안전 섹션 갱신, **이용약관 신설**(유료 결제·환불 조건 — 결제가 생기면 사실상 필수), docs에 약관 페이지 추가(GitHub Pages).
4. iOS 확장 시: ATT(앱 추적 투명성) 프롬프트 + Info.plist 문구.

**수용 기준(초안)**: 광고 미노출 조건(구매자·세션 화면), 구매→즉시 광고 제거→앱 재설치 후 복원 동작, 방침·약관 링크 유효.

---

## V1-10. 병행 태스크 플래그 (승인됨 2026-07-12, 출시 전, S)

**배경**: 단어 앱·인강처럼 폰 안의 다른 앱으로 수행하는 태스크는 흔한데, 현재는 그 시간이 이탈 차감돼 크레딧을 못 받음. iOS에선 포그라운드 앱 감지가 불가(열품타 iOS도 동일)하므로, 전 플랫폼 해법은 자기신고 플래그.

**요구사항**
1. `RunTask`에 `parallel?: boolean`(선택 필드 — 기존 persist 데이터와 호환, 기본 false).
2. 편집 시트(EditTaskSheet)에 "다른 앱과 함께" 토글(설명: "이 태스크는 다른 앱을 써도 집중으로 인정돼요"). `updateTask` fields에 parallel 포함. 신규 추가는 기본 false → 시트에서 켠다(입력바에 토글 추가하지 않음 — 폭 부족).
3. 면제 로직은 단일 지점: `useRunStore.markAway()`에서 현재 태스크가 parallel이면 no-op → awaySeconds가 아예 쌓이지 않음(잠금과 동일 취급). 상태기계(domain/away.ts)는 수정하지 않는다.
4. **초과 상한(V1-8)은 병행 태스크에도 그대로 적용** — 병행이어도 최대 크레딧은 2×bet (방치 방어 유지).
5. 표시: 플래닝 행 셰브런 옆에 "병행" 라벨(text-ink-faint, 12~13px), 세션 화면 태스크명 아래 "다른 앱 허용 — 이탈 차감 없음"(text-ink-mute, 13px).
6. **랭킹 제외 예약(3단계 계약)**: 병행 태스크의 집중 시간은 향후 랭킹/리그 집계에서 제외한다 — V2 섹션에도 명시. "검증된 기록" 서사 보존 장치.

**수용 기준**: 병행 태스크로 90초 이탈 후 복귀 → 차감 0·알림 없음·완료 시 actual≈wall / 일반 태스크는 기존대로 차감(회귀 확인) / 시트 토글 저장·행·세션 표시 / tsc·jest·export.

**[완료 2026-07-12]** 지휘자 직접 구현. 웹 검증: 병행 태스크 90초 이탈 → awaySeconds 0·알림 없음·세션 유지, 세션 라벨 표시.

## V1-11. Android 허용 앱 (YPT식, 장기 — 반응 확인 후, L)

UsageStats(사용정보 접근 권한) 네이티브 모듈로 병행 태스크의 자기신고를 실제 검증으로 승격: 백그라운드 체류 중 포그라운드 앱을 샘플링, 허용 목록이면 차감 면제·아니면 차감. 설정에 허용 앱 목록 UI. **Android 전용**(iOS 기술 불가), 특수 권한 온보딩 마찰·Play 민감권한 신고 유의. 착수 전 이 스텁을 상세 스펙으로 확장할 것.

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
