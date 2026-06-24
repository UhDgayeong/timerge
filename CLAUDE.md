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

## 할 일 확인 시

사용자가 할 일·태스크·다음 작업을 물어보면 아래 두 곳을 모두 확인하고 종합해서 답한다:

1. `memory/implementation_status.md` — 개발 우선순위 목록
2. `gh issue list --state open` — GitHub 이슈 (버그·개선 요청 등)

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

## GitHub 이슈 제목 컨벤션

이슈를 생성할 때 반드시 아래 형식을 따른다: `[타입] 제목`

| 태그 | 용도 |
|---|---|
| `[feat]` | 새 기능 |
| `[bug]` | 버그 |
| `[fix]` | 버그가 아닌 수정 (UI 오류, 문구 등) |
| `[discuss]` | 논의·결정 필요 |
| `[chore]` | 설정, 인프라, 유지보수 |
| `[docs]` | 문서 |

예시: `[bug] 상단 상태바와 앱 컨텐츠 겹침 현상 (iOS + Android 공통)`

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
5. **웹 배포** — 이번 작업이 `src/` 등 웹 빌드에 반영되는 변경이면 (네이티브 전용 변경, 예: 앱 아이콘·스플래시만 변경한 경우는 제외) `npx vercel --prod` 실행해 https://timerge.vercel.app 에 배포
   - GitHub ↔ Vercel 자동 연동이 끊겨 있어 push만으로는 배포되지 않음 — 반드시 수동 실행 필요
   - Vercel CLI 로그인이 안 되어 있으면 사용자에게 `vercel login` 직접 진행을 요청 (브라우저 인증 필요, 대신 수행 불가)
6. **네이티브 앱 OTA 배포** — 5번을 수행했다면(즉 `src/` 변경이 있었다면) **반드시 같이** 아래도 수행. 둘은 별개 배포 채널이라 5번만 하면 웹은 갱신되지만 앱(OTA)은 갱신되지 않음.
   1. `npm run ota:publish` 실행 → `public/ota/bundle-*.zip` + `latest.json` 갱신
   2. `git add public/ota && git commit` 후 `git push`
   3. `npx vercel --prod` 재배포 (OTA 파일도 `/ota/...`로 서빙되므로 5번에서 이미 배포했어도 OTA 파일 갱신분을 반영하려면 한 번 더 배포 필요)
   4. 네이티브 코드(플러그인 추가 등) 변경이 있었던 경우엔 OTA로 처리 불가 — `npm run apk:publish`로 APK도 갱신
7. `gh issue list --state open` 확인 후, 아래 두 경우 모두 클로즈 처리
   - **이번 작업으로 직접 해결된 이슈**: 커밋 메시지에 `Closes #N` 포함하면 push 시 GitHub이 자동 클로즈 (권장). 이미 push한 경우: `gh issue close N --comment "커밋 SHA에서 해결. <커밋 URL>"` 로 수동 처리
   - **구현하거나 처리할 필요가 없어진 이슈**: 왜 불필요해졌는지 (설계 변경, 다른 방식으로 해결, 방향 전환 등) 관련 히스토리를 댓글로 작성 후 클로즈. `gh issue comment N --body "..."` 후 `gh issue close N`
