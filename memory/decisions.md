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
