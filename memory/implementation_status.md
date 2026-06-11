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

## 다음 작업 (우선순위 순)

1. **Phase 1.5** — OCR 입력 (Tesseract.js 웹, ML Kit 모바일, 이슈 #4)
3. **Phase 2** — 백엔드 + 인증 + 클라우드 동기화 (이슈 #5)
4. **앱 스토어 출시** — Capacitor iOS/Android 래핑 (이슈 #6)
