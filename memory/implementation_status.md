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
- [x] `src/db/index.ts` — Dexie 스키마(weeks/days/holidayOverrides/settings), CRUD, 날짜 유틸, JSON 백업/복원

## 다음 작업 (우선순위 순)

1. **한국 공휴일 데이터** — `src/data/holidays.ts` (2025~2027 정적 JSON + 대체공휴일)
2. **주간 현황 화면** — 헤더(목표/누적/남은) + 요일별 카드 + 역산 표시
3. **일 입력 모달** — 수동 입력 폼 (근무 유형 선택, 시간 입력)
4. **주 이동** — 이전/다음 주 네비게이션
5. **설정 화면** — 기본 주간 목표 변경, JSON 백업/복원
6. **Phase 1.5** — OCR 입력 (Tesseract.js 웹, ML Kit 모바일)
7. **Phase 2** — 백엔드 + 인증 + 클라우드 동기화
8. **앱 스토어 출시** — Capacitor iOS/Android 래핑
