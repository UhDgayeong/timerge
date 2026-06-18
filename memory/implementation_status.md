---
name: implementation_status
description: "timerge 개발 현황 — 완료된 항목, 다음 작업 우선순위"
metadata: 
  node_type: memory
  type: project
  originSessionId: b427f1e7-6296-40c3-81f0-d4fb5509f56c
---

## 완료

- [x] 프로젝트 초기화 (React + Vite + TypeScript + Vitest, 의존성 설치)
- [x] `src/domain/types.ts` — 전체 도메인 타입 (`DayRecord`, `WeekRecord`, `Segment`, `Settings`, `DEFAULTS`)
- [x] `src/domain/calc.ts` — 계산 엔진 전체 (점심 규칙, 역산, 공휴일 처리, 주간 요약, 퇴근 역산)
- [x] `src/domain/calc.test.ts` — 설계 시나리오 검증 테스트 24개 전부 통과 ✅
- [x] `DESIGN.md` — 합의된 설계 문서 저장 (B방식 공휴일 표시)
- [x] `CLAUDE.md` — 작업 종료 프로토콜 + 세션 시작 시 memory 자동 로딩 지시문 포함
- [x] git 저장소 초기화 + GitHub public 레포 생성 및 push
- [x] `README.md` — 이모지 포함, Claude Code 협업 가이드 + 이슈 생성 가이드 작성
- [x] `memory/` 폴더를 레포에 포함 — 공동 작업자 컨텍스트 공유
- [x] Bucky5683 collaborator 추가 (push 권한)
- [x] `src/db/index.ts` — Dexie 스키마(weeks/days/holidayOverrides/settings/holidayCache), CRUD, 날짜 유틸, JSON 백업/복원
- [x] `src/data/holidays.ts` — 2025~2027 정적 공휴일 fallback (대체공휴일 포함, superkts.com 기준)
- [x] `src/services/holidaySync.ts` — Google Calendar API + DB캐시(30일) + 정적 fallback 3계층
- [x] `src/vite-env.d.ts` — import.meta.env 타입 선언
- [x] `.env.local` — VITE_GOOGLE_CALENDAR_API_KEY 설정 (gitignore됨)
- [x] `src/hooks/useWeekData.ts` — 주 get-or-create + 7일 스텁 + 공휴일 플래그 주입
- [x] `src/components/WeekHeader.tsx` — 누적/목표/남은 + 평균 필요시간 + 초과/달성 배지
- [x] `src/components/DayCard.tsx` — 요일 카드 (완료·공휴일·예정·미정·주말 상태)
- [x] `src/components/WeekView.tsx` — 주간 현황 메인 화면
- [x] `src/index.css` — 전체 스타일 (다크모드 포함)
- [x] `src/components/DayEditModal.tsx` — 일 입력 모달 (구간 추가/삭제, 유형 선택, 시각 입력, 공휴일 토글, 라이브 인정시간 미리보기). DayCard 클릭 → 모달 → 저장 시 useWeekData.reload()로 갱신
- [x] `useWeekData`에 `reload()` 추가 (version 카운터로 재조회)
- [x] **주 이동 네비게이션** — `WeekView`의 `monday`를 state로 전환, `addDays(m, ±7)`로 이전/다음 주 이동. ‹ / › 버튼 + 현재 주 아닐 때 "오늘로" 복귀 버튼(현재 주면 "이번 주" 라벨). 로딩 중에도 nav 바 유지(주 전환 깜빡임 방지). `.week-nav` 스타일 + 다크모드 추가

- [x] **설정 화면** — 기본 주간 목표 변경, JSON 백업/복원 (이슈 #1 클로즈)
- [x] **고정목표 입력 + 요일별 목표 규칙** — 설정에서 요일별 출퇴근 시각 지정 → 매주 자동 적용. 홈 화면 modal에서 그 주만 override/해제 가능. `effectiveTarget()`, `WeekdayRule` 타입, `fixedTargetManual` 플래그 포함 (이슈 #2 클로즈)
- [x] **홈 카드 "휴게 1시간 제외" 뱃지** — 실적/계획 시간 표시 시 항상 표시
- [x] **헤더 예정 라인** — "금 10:00~15:00 · 4시간 예정" 형식으로 출퇴근 시각 표시
- [x] **반차 유형 분리 + 휴게 체크박스** — `halfday` → `halfday-am` / `halfday-pm` 분리. 세그먼트별 `lunchExcluded` 플래그. 체크박스 디폴트: 근무/외근/오전반차=체크, 오후반차=미체크, 연차=숨김. 오전반차 체크 시 점심 흡수 → 오후 근무에서 미차감(510분 유지). DayCard 배지도 실제 차감 여부 기반으로 수정.

- [x] **마지막 근무일 퇴근 시각 역산** — lastWorkableDay() + calcLastDayDeparture(). 출근 입력 시 헤더 배너 "N시 이후 퇴근 가능". 오전반차 케이스(점심 흡수) 포함. DayEditModal 부분 입력(출근만) 시 segments 보존. (이슈 #3 클로즈)

- [x] **홈 헤더 남은 시간 계산 수정** — 기존: 목표 - (실적 + 고정예정). 변경: 목표 - 실적만. 예정분 미차감으로 실제 감각에 맞게 수정.
- [x] **DayCard 반차 시간 표시** — 반차가 있는 날 오른쪽에 "근무 08:30~14:00 / 오후반차 14:00~18:00" 두 줄 표시. 반차 없는 날은 '근무' 텍스트 없이 시간만 표시.
- [x] **퇴근 역산 버그 수정** — 마지막 근무일에 고정목표(요일 규칙)가 있으면 remainingMinutes에서 이중 차감되어 퇴근 시각이 너무 이르게 나오던 버그. WeekHeader에서 lastDayFixed를 다시 더해서 보정.
- [x] **요일별 목표 시간 입력 UI 너비 수정** — `settings__wd-time` width 6rem → 8.5rem / min-width 7.5rem. 한국어 로케일에서 "오전 10:00" 형식이 잘려 보이던 문제 해결.
- [x] **CSS 변수 전환 (다크모드 통합)** — 하드코딩 색상값을 `:root` CSS 변수 (~25개)로 전환. `@media (prefers-color-scheme: dark)` override를 `:root` 변수 재정의 방식으로 통합. 설정 화면 희멀건 색상 문제 및 누락 selector 문제 근본 해결.

- [x] **OCR 입력 (Phase 1.5)** — Tesseract.js(kor+eng) + FLEX 텍스트 파서 + OcrImportModal. 여러 장 업로드 → 날짜 병합 → 검토 편집 → 저장. ⚠️ 배지 인식 실패 시 수동 보완. (이슈 #4 클로즈)

- [x] **Phase 2 — Supabase 클라우드 동기화** — Supabase Auth(Google OAuth) + weeks/days/settings/holiday_overrides 테이블 + RLS + last-write-wins 동기화 레이어(`src/services/sync.ts`). 설정 화면에 "계정 및 동기화" 섹션 추가. 로그인/로그아웃 + 동기화 연결됨 뱃지. 카카오는 비즈앱 심사 필요로 보류, Google만 활성화. (이슈 #5 클로즈)

- [x] **Capacitor Android 래핑** — @capacitor/core|cli|ios|android 7.6.6 설치. Google OAuth 딥링크(`com.timerge.app://`) 처리. Android 실기기 로그인·동기화·데이터 퍼시스턴스 전부 확인. (이슈 #6 부분 완료 — iOS/스토어 제출은 별도)
- [x] **iOS 빌드 확인** — `xcodebuild -runFirstLaunch` + Apple ID 로그인(Personal Team) 후 실기기 빌드 성공. 앱 동작 확인.
- [x] **상단 상태바 겹침 처리 (이슈 #9)** — `.app`에 `padding-top: calc(1rem + env(safe-area-inset-top))` 적용. iOS/Android 공통.
- [x] **"스크린샷으로 입력" 버튼 하단 고정** — `position: fixed; bottom: 0`으로 화면 최하단 바 형태로 이동. `env(safe-area-inset-bottom)` 포함. `day-list`에 `padding-bottom` 추가해 버튼에 가려지지 않도록 처리.
- [x] **시작·종료 시간 동일 설정 시 -1시간 버그 수정** — `recognizedFromSegments` 레거시 점심 차감 경로에서 실제 근무 시간(workDuration)이 0일 때 점심을 차감하지 않도록 수정.
- [x] **요일별 목표 개별 삭제 버튼(×) 추가** — 설정 화면 요일별 목표 행에 시간이 입력된 경우에만 × 버튼 표시. 클릭 시 해당 요일 입력 초기화 → "요일 목표 저장"으로 반영.
- [x] **앱 이름 Timerge 복귀** — Clokoo → Timerge / com.clokoo.app → com.timerge.app. capacitor.config.ts, Android(build.gradle·AndroidManifest·strings·MainActivity), iOS(Info.plist·project.pbxproj), src(App.tsx·auth.ts) 전체 변경. Supabase Redirect URL도 com.timerge.app:// 로 수동 변경 완료.

- [x] **헤더 스크롤 고정** — 홈/설정 화면 헤더가 스크롤해도 상단에 고정되도록 수정. `position: sticky` 대신 flex 레이아웃(`display: flex; flex-direction: column; height: 100%`) + 스크롤 영역(`app__scroll`, `settings__scroll`)으로 구조 변경. Android WebView에서 sticky 미작동 문제 해결.

- [x] **갤럭시 폴드 하단 시스템 UI 겹침 수정 (이슈 #8)** — 3단 방어: ① `MainActivity.java`에 `WindowCompat.setDecorFitsSystemWindows(false)` 명시 ② `App.tsx`에 JS probe로 `env(safe-area-inset-bottom)` 실측 후 `--sab` CSS 변수 주입 (Android에서 0이면 56px fallback) ③ CSS 전체를 `var(--sab)` 기반으로 교체. 바텀시트 저장 버튼은 완전 해결. 설정 화면은 스크롤 끝까지 내리면 잘리지 않음 (사용자 수용).

- [x] **글래스 리디자인 1차** — 퍼플 팔레트(#6D4BFF), WeekHeader 글래스 카드(backdrop-filter), 프로그레스 바, 오늘 카드 퍼플 그라디언트, 타이틀/네비/버튼 스타일 갱신. 디자인과 완전히 일치하진 않아 추후 재수정 예정.
- [x] **UI 리디자인 2차** — PhoneScreen.dc.html 기반 글래스 모피즘 전면 적용. CSS 변수 시스템 교체(--text/--glass/--accent 등), 그라디언트 배경 + blob 애니메이션, 모든 카드/버튼/모달/설정 글래스 스타일. 커스텀 체크박스, 커스텀 휠 시간 선택기(TimePicker) 구현.
- [x] **설정 화면 OS 뒤로가기** — Android 하드웨어/제스처 뒤로가기(`backButton` Capacitor 이벤트) + iOS 엣지 스와이프(`history.pushState` + `popstate`) 처리. Android 실기기 확인.
- [x] **폰트 변경: Pretendard → IBM Plex Sans KR** — `@fontsource/ibm-plex-sans-kr` 로컬 번들 방식으로 적용 (Capacitor `file://` 환경 대응). `src/main.tsx`에서 400/500/600/700 weight import.
- [x] **수동 테마 전환 (라이트/다크)** — 설정 화면에 "화면 테마" 섹션 추가. `localStorage` + `data-theme` 속성으로 OS 설정 override. 기본값 라이트.
- [x] **Android 터치 하이라이트·텍스트 선택 제거** — `-webkit-tap-highlight-color: transparent` + `user-select: none` 전역 적용. 클릭/롱프레스 시 파란 영역 표시 및 텍스트 선택 컨텍스트메뉴 제거.
- [x] **TimePicker 분 단위 1분으로 변경** — 기존 5분 단위(12개 항목) → 1분 단위(60개 항목). MINS 배열·parse·format·onScroll max 수정.
- [x] **설정 화면 디자인 정합 (PhoneScreen.dc.html 기준)** — 요일별 목표 `<input type="time">` → TimePicker pill 버튼으로 교체. 데이터 카드 이모지→SVG chevron(accent색). 폰트 굵기 전역 교정(hint 500→700, 보조 텍스트 600→700). 블롭 opacity 상향(blob1·2 .5, blob3 .45).
- [x] **설정 화면 UI 소개선** — 요일별 목표 행: "6시간" preview 텍스트 제거 + 입력 없는 요일도 X 버튼 공간 예약(`visibility: hidden`)으로 흰 박스 끝 지점 통일. `auth-section__desc` 폰트 굵기 700·크기·마진을 `settings__hint`와 통일.
- [x] **카드 그림자 클리핑 수정** — `overflow-y: auto` 컨테이너가 `overflow-x`도 non-visible로 강제해 `box-shadow`가 직선으로 잘리던 문제. `.app`의 `padding: 0 1rem`을 `.app__scroll`·`.app-header`로 이동. `.settings`의 `overflow: hidden` 제거, `padding-left/right: 1rem`을 `.settings__scroll`에 개별 속성으로 적용(단축 표기 내 `max()+var()` 파싱 실패 우회).

## 다음 작업 (우선순위 순)

1. **앱 스토어 제출** — Apple/Google 개발자 계정, 스크린샷, 개인정보처리방침 준비 (이슈 #6, iOS 개발자 동료와 협업)
2. **커스텀 도메인** — Supabase Pro 전환 시 Google OAuth 화면의 URL 정리
3. **카카오 로그인** — 비즈앱 심사 통과 후 재활성화
4. **OCR 정확도 개선** — 클라우드 OCR 전환 여부 검토 (DESIGN.md §6.3)
