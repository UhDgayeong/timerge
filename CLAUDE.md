# timerge — Claude Code 지침

## 처음 클론한 경우 (초기 설정)

1. 의존성 설치: `npm install`
2. `.env.local` 생성 후 Google Calendar API 키 입력:
   ```
   VITE_GOOGLE_CALENDAR_API_KEY=여기에_키_입력
   ```
   API 키는 팀 내에서 공유받거나 Google Cloud Console에서 직접 발급.
   (Calendar API 활성화 → 사용자 인증 정보 → API 키 생성)

---

## 세션 시작 시 필수

새 세션을 시작하면 반드시 아래 파일들을 먼저 읽고 작업을 시작한다:

1. `memory/implementation_status.md` — **지금 무엇을 해야 하는가** (할 일 + 완료 목록)
2. `memory/timerge-project.md` — **어떻게 계산하는가** (핵심 규칙, 함정 주의사항)
3. `memory/decisions.md` — **왜 이렇게 만들었는가** (기술 선택 근거, 히스토리)
4. `DESIGN.md` — 상세 설계 문서 (규칙 전체 레퍼런스)

---

## memory/ 폴더 구조

레포 안 `memory/` 폴더가 프로젝트 컨텍스트의 단일 진실원천이다.
Claude Code의 로컬 자동 메모리(`~/.claude/...`)는 기기마다 달라 공유 불가 —
레포에 넣어야 공동 작업자 모두가 동일한 컨텍스트를 가진다.

| 파일 | 용도 | 업데이트 시점 |
|---|---|---|
| `MEMORY.md` | 파일 인덱스 (한 줄 요약) | 파일 추가/삭제 시 |
| `implementation_status.md` | 완료 체크리스트 + 다음 작업 우선순위 | 매 세션 종료 시 |
| `timerge-project.md` | 스택, 핵심 계산 규칙, 비자명한 함정 | 설계 결정 변경 시 |
| `decisions.md` | 날짜별 기술 결정 히스토리 | 매 세션 종료 시 (결정 있으면) |

---

## 프로젝트 개요

한국 직장인 대상 근무시간 계산/역산 앱. 설계 전체는 [DESIGN.md](DESIGN.md) 참고.

---

## 작업 종료 프로토콜

사용자가 **'작업'과 '종료' 또는 '마무리' 키워드를 함께** 사용하면 아래를 순서대로 수행한다:

1. `memory/implementation_status.md` 업데이트 — 완료 항목 반영, 다음 작업 우선순위 재정렬
2. 이번 작업 중 비자명한 결정이 있으면 `memory/decisions.md`에 항목 추가
   - **새 파일을 만들지 않는다** — decisions.md에 날짜별로 누적
3. `memory/MEMORY.md` 인덱스 갱신
4. 미커밋 변경사항 있으면 커밋 후 `git push`
