---
name: decisions
description: "timerge 기술 결정 히스토리 — 날짜별 결정 근거 누적"
metadata:
  type: project
---

## 2026-06-09 — 공휴일 표시 방식 (B방식 확정)

**결정**: 공휴일은 "목표 −8h + 누적 0" 한 방식으로만 처리  
**이유**: "목표 −8h 하면서 동시에 공휴일 8h를 누적에도 더하면" double-subtract가 되어
공휴일 있는 주에 평일 부담이 잘못 줄어드는 버그 발생 (공휴일 1주에 6h/일이 나옴).  
**검증**: 공휴일 1주 → 목표 32h, 평일 32h 채우면 남은 0 = 8h/일 ✓  
**관련 파일**: `src/domain/calc.ts`, `DESIGN.md §1.4`

---

## 2026-06-09 — DB 라이브러리 선택

**결정**: Dexie.js  
**이유**: IndexedDB를 직접 쓰면 비동기 처리가 복잡. Dexie는 Promise 기반 API + React hooks(`dexie-react-hooks`) 제공. 2단계 동기화 붙일 때도 마이그레이션 구조(`version()`) 가 명확함.  
**관련 파일**: `src/db/index.ts`

---

## 2026-06-10 — 공휴일 데이터 조달 전략

**결정**: Google Calendar API + DB캐시(30일) + 정적 fallback 3계층  
**이유**:
- 수동 하드코딩 → 대체공휴일이 매년 달라 실수 위험
- 공공데이터포털 API → 브라우저에서 직접 호출 시 **CORS 차단** 위험. Capacitor(모바일)는 괜찮지만 웹에서 막힘
- Google Calendar API → CORS 허용, 무료, API 키만으로 공개 캘린더 읽기 가능

**동작 방식**: 앱 시작 시 `syncHolidaysInBackground` 백그라운드 호출 → 성공 시 DB 캐시 갱신. 캐시 TTL 30일. 오프라인이면 캐시 사용, 캐시도 없으면 정적 fallback.  
**API 키**: `.env.local`의 `VITE_GOOGLE_CALENDAR_API_KEY` (gitignore됨, 팀 내 공유 필요)  
**캘린더 ID**: `ko.south_korea#holiday@group.v.calendar.google.com`  
**관련 파일**: `src/services/holidaySync.ts`, `src/data/holidays.ts`

---

## 2026-06-10 — 주간 현황 화면 데이터 로딩 패턴

**결정**: `useWeekData` 훅이 진입 시 그 주의 7일치 `DayRecord` 스텁을 **DB에 즉시 생성(upsert)** 하고, 공휴일 여부는 그때 `resolveHoliday`로 판정해 레코드에 **baked-in** 한다. 리로드는 `version` 카운터 증가로 트리거.  
**이유**:
- 빈 DB 첫 로드 시 주/일 레코드가 없으면 화면이 비거나 깨짐 → get-or-create가 필수
- 공휴일 플래그를 매 렌더마다 재조회하지 않고 레코드에 박아두면, 저장(`upsertDay`) 후 리로드해도 기존 레코드를 다시 읽을 뿐 공휴일 재판정을 안 함 → **모달에서 공휴일 토글 시 day 레코드의 `isHoliday`를 직접 갱신**해야 함 (override만 쓰면 반영 안 됨). DayEditModal이 둘 다 기록하는 이유.
- 날짜 계산은 calc.ts와 동일하게 UTC 기준 유틸 재사용 (로컬 Date 산술 금지 — 경계일 off-by-one 방지)

**관련 파일**: `src/hooks/useWeekData.ts`, `src/components/WeekView.tsx`, `src/components/DayEditModal.tsx`

---

## 2026-06-10 — 일 입력 모달 범위 (실적만, 고정목표 보류)

**결정**: DayEditModal은 **실적(`recognizedMinutes`)** + 공휴일 토글만 입력. **미래 계획값(`fixedTargetMinutes`)은 의도적으로 다음 작업으로 미룸.**  
**이유**: 우선순위 항목이 "유형 선택 + 시각 입력"(실적)이고, 역산 핵심값인 `avgNeededPerPendingDay`는 고정목표 없이도 동작. 모달 1차 범위를 일상적 입력(매일 출퇴근 기록)에 집중. 고정목표 입력 UI는 역산 정확도 향상이 필요할 때 추가.  
**관련 파일**: `src/components/DayEditModal.tsx`, `memory/implementation_status.md`(다음 작업 3번)

---

## 2026-06-10 — 요일별 목표 규칙: 출퇴근 시각 기반 설계

**결정**: `weekdayTargets`에 `{ startMin, endMin }` (WeekdayRule) 저장. 인정시간은 `recognizedFromSegments`로 렌더 타임에 계산. 홈 화면 override는 `fixedTargetMinutes`(분)으로 저장(시각 없이).  
**이유**:
- "N시간" 숫자 대신 출퇴근 시각을 저장하면 UI가 직관적 (실제 일정처럼 보임)
- 인정시간 = 클락 − 점심. 저장 시 계산하면 lunchMinutes 설정 변경 시 불일치. 렌더 타임 계산으로 항상 최신값 사용.
- 홈 화면 override는 "이번 주 이 날만" 이므로 시각 불필요 — 분만 저장해 단순화.
- `effectiveTarget()` 한 함수가 { minutes, startMin?, endMin? } 리턴 → DayCard·WeekHeader가 출퇴근 시각 조건부 표시.

**관련 파일**: `src/domain/types.ts`(WeekdayRule), `src/domain/calc.ts`(effectiveTarget), `src/components/SettingsView.tsx`, `src/components/DayCard.tsx`, `src/components/WeekHeader.tsx`

---

## 2026-06-11 — 반차 분리 + 휴게 차감 명시화

**결정**: `halfday` → `halfday-am` / `halfday-pm` 분리. `Segment`에 `lunchExcluded?: boolean` 추가. 기존 `halfday` 레거시 데이터는 타입 유니온에 유지(위치 기반 자동 판단 레거시 경로).

**오전반차+근무 점심 규칙**: 오전반차 `lunchExcluded=true`면 점심을 "흡수" → 같은 날 근무 구간에서 별도 차감 없음. 오전반차(09:00~14:00) + 오후근무(14:00~18:30) = 240+270 = **510분** (FLEX 실데이터와 일치).

**DayCard 배지 수정**: 기존에 `recognizedMinutes != null`이면 무조건 "휴게 1시간 제외" 배지 표시하던 것을 `wasLunchDeducted(segments)` 실제 차감 여부로 변경. 오후반차만 있는 날은 배지 안 뜸.

**관련 파일**: `src/domain/types.ts`, `src/domain/calc.ts`(wasLunchDeducted), `src/components/DayEditModal.tsx`, `src/components/DayCard.tsx`

---

## 2026-06-10 — 주 이동 네비게이션 구조

**결정**: 현재 주 월요일(`currentWeekMonday()`)을 `useMemo`로 고정하던 것을 `monday` **state**로 전환. `thisMonday`(이번 주 기준값)는 별도 memo로 유지해 "오늘로" 복귀와 "이번 주" 라벨 판정에 사용. nav 바(‹/›/오늘로)는 `loading` early-return **바깥**에 두어 주 전환 시에도 항상 보이게 함.  
**이유**:
- 주 전환은 `setMonday(m => addDays(m, ±7))` 한 줄. UTC 기준 `addDays` 재사용(로컬 Date 산술 금지 원칙 유지).
- nav를 loading 분기 안에 두면 주를 넘길 때마다 "불러오는 중"이 통째로 화면을 덮어 nav까지 사라짐 → 깜빡임/연타 불가. 그래서 nav는 항상 렌더하고 헤더+리스트 영역만 로딩 표시로 교체.
- `today` 강조는 실제 오늘 날짜 기준이라 다른 주를 보면 자연히 강조 없음(의도된 동작).

**관련 파일**: `src/components/WeekView.tsx`, `src/index.css`(`.week-nav`)

---

## 2026-06-11 — 퇴근 역산: remainingMinutes 보정 (lastDayFixed 재가산)

**결정**: `WeekHeader`에서 `calcLastDayDeparture`에 넘기는 remaining = `summary.remainingMinutes + effectiveFixedTarget(lastDay)`.

**이유**: `summarizeWeek`의 `remainingMinutes = goal - recognized - totalFixed`에는 마지막 날 자신의 고정목표도 차감된다. 이 값을 그대로 퇴근 역산에 쓰면, "마지막 날에 얼마나 일해야 하나"에서 이미 빠진 몫을 또 빼는 이중 차감이 된다. → 마지막 날 고정목표만큼 출발 시각이 앞당겨지는 버그(12:55가 17:55가 되어야 할 상황에서 일찍 나옴). 보정 후 `summary.remainingMinutes + lastDayFixed`가 곧 "마지막 날에 필요한 실근무 분".

**관련 파일**: `src/components/WeekHeader.tsx`

---

## 2026-06-11 — CSS 변수 전환으로 다크모드 통합 관리

**결정**: 하드코딩된 색상값을 `:root` CSS 변수로 전환. 다크모드는 `@media (prefers-color-scheme: dark) { :root { ... } }` 방식으로 변수 재정의.

**이유**: 기존 방식(개별 selector마다 다크 override 추가)은 새 컴포넌트 추가 시 다크 override를 누락하면 라이트 색상이 그대로 노출됨. 설정 화면에서 `.settings__hint`, `.settings__unit` 등이 누락되어 희멀건 색상으로 표시되는 문제가 발생. 변수 방식으로 전환하면 변수만 정의하면 자동 반영.

**변수 분류**: 중립 색상(bg-base/card/subtle/elevated/input, border, text), 상태 색상(today/done/fixed/holiday), 레이블 색상, 상태 메시지 색상 (~25개).

**week-header 예외**: `.week-header`는 라이트/다크 모두 어두운 배경(#1a1a2e/#0d0d1a)을 사용하는 의도적 설계라 변수 미적용, 별도 dark override 유지.

**관련 파일**: `src/index.css`

---

## 2026-06-11 — 퇴근 역산: 부분 입력(출근만) segments 보존

**결정**: DayEditModal에서 출근만 입력하고 퇴근은 비워도 segments를 DB에 보존(recognizedMinutes=null 유지). 기존에는 완전 입력(출퇴근 둘 다)이 없으면 segments를 `[]`로 초기화했음.

**이유**: 퇴근 역산 배너(`calcLastDayDeparture`)는 마지막 근무가능일의 `segments`에서 `clockInMin`을 읽는다. 부분 입력을 버리면 사용자가 출근을 찍어도 배너가 절대 뜨지 않는다.

**주의**: `liveRecognized` 미리보기는 endMin=null이면 `-60분(-1시간)`으로 나왔는데, 부분 입력 감지 시 "퇴근 입력 후 계산"으로 대체 표시.

**관련 파일**: `src/components/DayEditModal.tsx`(hasPartialInput), `src/components/WeekHeader.tsx`, `src/domain/calc.ts`(lastWorkableDay, calcLastDayDeparture)
