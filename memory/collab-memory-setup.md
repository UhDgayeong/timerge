---
name: collab-memory-setup
description: "공동 작업자 memory 공유 구조 — 왜 레포에 memory/ 폴더가 있는지"
metadata:
  type: project
---

`memory/` 폴더가 레포 루트에 있는 이유: Claude Code의 자동 메모리 경로(`~/.claude/projects/.../memory/`)는 로컬 머신 전용이라 공동 작업자가 클론해도 컨텍스트를 공유할 수 없다. 이를 해결하기 위해 레포 내 `memory/`를 단일 진실원천으로 삼고, `CLAUDE.md` 세션 시작 지시문으로 자동 로딩하도록 설정했다.

**Why:** iOS 개발자(Bucky5683)와 공동 작업 시 프로젝트 히스토리·다음 작업 우선순위를 동일하게 공유하기 위함.

**How to apply:** 새 공동 작업자 추가 시 `gh auth login` 안내 + CLAUDE.md의 세션 시작 섹션이 memory/ 를 읽도록 되어 있음을 안내. user 타입 개인 메모리(작업자 개인 취향 등)는 레포에 넣지 않고 로컬 `~/.claude/projects/.../memory/`에만 저장.
