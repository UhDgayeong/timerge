# ⏱️ timerge

이번 주 목표 근무 시간을 모두 채우기 위해서 몇 시간씩 일하면 되는지 역산을 하기 위한 웹앱.

---

## 🤖 Claude Code 협업 가이드

이 프로젝트는 Claude Code(AI 코딩 어시스턴트)를 사용해 개발합니다.
프로젝트 루트의 `CLAUDE.md`에 Claude Code 동작 지침이 정의되어 있습니다.

### ✅ 작업 종료 프로토콜

작업을 마칠 때 Claude Code에게 **"이 작업 종료해"** 또는 **"이 작업 마무리해"** 라고 하면
아래가 자동으로 실행됩니다:

1. `memory/implementation_status.md` 업데이트 — 완료 항목 반영
2. 다음 작업 우선순위 재정렬
3. 비자명한 결정·트릭이 있으면 메모리 파일로 저장
4. `memory/MEMORY.md` 인덱스 최신화
5. 미커밋 변경사항 커밋 후 `git push`

> `memory/` 폴더는 Claude Code가 세션 간 컨텍스트를 유지하기 위한 파일들로, 레포에 포함되어 공동 작업자 모두가 공유합니다.
> 직접 편집하지 않아도 되며, 작업 종료 프로토콜 실행 시 Claude Code가 자동으로 관리합니다.

### 🐛 이슈 생성 가이드

GitHub 이슈는 Claude Code를 통해 생성하는 것을 권장합니다.

**이유**: Claude Code가 실제 코드 상태를 직접 확인한 뒤 이슈를 작성하기 때문에,
재현 조건·관련 파일·맥락이 정확하고 깔끔하게 정리됩니다.

**방법**: Claude Code에게 발견한 버그나 개선 사항을 설명하면,
코드를 점검한 후 `gh` CLI를 통해 GitHub 이슈를 직접 생성해 줍니다.

**사전 설정 — GitHub 계정 연결**:
Claude Code가 이슈를 생성하려면 `gh` CLI가 GitHub 계정과 연결되어 있어야 합니다.
최초 1회 아래 명령어를 실행해 인증하세요:

```bash
gh auth login
```

브라우저가 열리면서 GitHub 계정 인증을 완료하면 됩니다.
연결 여부는 `gh auth status` 로 확인할 수 있습니다.

---

## ✨ 주요 기능

- 📅 요일별 근무시간 기록 (일반·외근·연차·반차)
- 📊 주간 목표 대비 누적 현황 (공휴일 자동 반영)
- 🔁 남은 날 균등 배분 역산 — "오늘부터 매일 X시간"
- 🕐 마지막 근무일 최소 퇴근 시각 계산
- 📸 FLEX 앱 스크린샷 OCR 자동 입력 (예정)

## 🛠️ 스택

- React + Vite + TypeScript
- Capacitor (iOS / Android 앱 스토어 출시)
- Dexie.js (IndexedDB 로컬 저장)

## 🚀 개발 시작

```bash
npm install
npm run dev      # 개발 서버
npm test         # 테스트 (24개)
npm run typecheck
```

## 📄 라이선스

MIT
