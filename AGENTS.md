# AGENTS.md
#
# 이 파일은 Codex와 Claude Code 모두가 세션 시작 시 읽는 저장소 공식 운영 규칙입니다.
# Codex Desktop은 이 파일을 자동 로드합니다.
# Claude Code는 CLAUDE.md에서 이 파일을 @import합니다.
# 60줄 안팎으로 유지하고, 상세 규칙은 docs/agents/로 분리합니다.

## 역할 분담

| Phase | 도구 | 역할 | BMAD 스킬 |
|---|---|---|---|
| Phase A | Codex Desktop | story 생성 + 구현 (Epic 단위) | bmad-create-story, bmad-dev-story |
| Phase B | Claude Code | 코드 리뷰 + 수정 + 테스트 보강 (Epic 단위) | bmad-code-review |

## Phase A: Codex Desktop 시작 루틴

1. 이 파일(AGENTS.md)의 규칙 확인
2. `_bmad-output/planning-artifacts/architecture.md` 읽기
3. `_bmad-output/implementation-artifacts/sprint-status.yaml` 확인
4. `docs/agents/` 아래 관련 규칙 참고
   - **필수**: `docs/agents/feedback-rules.md` (과거 반복 실수 패턴) 반드시 읽기
5. 대상 Epic의 story를 순서대로 처리:
   - Windows/Codex에서는 먼저 `./scripts/doctor.ps1`와 `./scripts/phase-a/preflight.ps1 -Epic <N>` 실행
   - Windows/Codex에서 raw `node`, `npm`, `npx`, `bun` 실행 실패만으로 중단 금지. 중단 기준은 현재 OS/셸에 맞는 `validate-quick` 실패임
   - `bmad-create-story` 스킬로 story 파일 생성
   - `bmad-dev-story` 스킬로 구현 (TDD: red-green-refactor)
   - 현재 OS/셸에 맞는 검증 진입점 실행
     - bash/WSL/macOS/Linux: `./scripts/validate-quick.sh`
     - Windows PowerShell: `./scripts/validate-quick.ps1`
   - 통과 시 **commit + push 필수**
   - Windows PowerShell/Codex: `./scripts/phase-a/finalize-story.ps1 -StoryName <story-name>`
   - bash/WSL/macOS/Linux: `git add -A && git commit -m "feat(story-name): 설명" && git push`
   - validate-quick 실패 시 수정 후 재검증, 3회 실패 시 skip
6. Epic의 모든 story 완료 후 현재 OS/셸에 맞는 전체 검증 실행
   - bash/WSL/macOS/Linux: `./scripts/validate.sh`
   - Windows PowerShell: `./scripts/validate.ps1`
   - 실패 시 `./scripts/validate.sh --from=실패단계`로 재개
7. Codex Desktop 모델 권장: chatgpt-5.4, reasoning: xhigh

## Phase B: Claude Code 시작 루틴

1. `CLAUDE.md`의 지침 확인 (이 파일은 @import됨)
2. `_bmad-output/implementation-artifacts/sprint-status.yaml` 확인
3. 완료된 story 브랜치를 `bmad-code-review` 스킬로 리뷰
4. REJECTED 항목 직접 수정 + 테스트 보강
5. `./scripts/validate.sh` + `./scripts/smoke.sh` 최종 검증

## Repo map

| 경로 | 역할 |
|---|---|
| `_bmad-output/planning-artifacts/` | PRD, architecture, epics, stories (공식 제품 문서) |
| `_bmad-output/implementation-artifacts/` | sprint-status, story 파일, 구현 산출물 |
| `.agents/skills/` | Codex용 BMAD 스킬 (create-story, dev-story 등) |
| `.claude/skills/` | Claude Code용 BMAD 스킬 (code-review 등) |
| `docs/agents/` | 에이전트 운영 규칙 (architecture, coding, testing, security, performance, deploy, workflow, backup, seo, feedback) |
| `docs/checklists/` | 수동 체크리스트 (페이지 수정 후, 배포 전) |
| `docs/decisions/` | 아키텍처 결정 기록 (ADR) |
| `scripts/` | 검증 (validate, validate-quick, smoke), 빌드, 스모크 테스트 스크립트 |
| `scripts/lib/` | 검증 공용 헬퍼 (validate-utils.ps1, git-utils.ps1 등) |
| `feedback/` | 실수 기록(incidents) + 템플릿 |
| `state/` | 작업 진행 상태 파일 + validate 로그 |
| `reviews/` | 코드 리뷰 결과 저장 |
| `src/` or `apps/` | 소스 코드 |
| `tests/` | 테스트 코드 |

## 참조 파일

- `docs/agents/architecture-rules.md`
- `docs/agents/coding-rules.md`
- `docs/agents/testing-rules.md`
- `docs/agents/security-rules.md`
- `docs/agents/performance-rules.md`
- `docs/agents/deploy-rules.md`
- `docs/agents/docker-rules.md`
- `docs/agents/migration-rules.md`
- `docs/agents/workflow-rules.md`
- `docs/agents/feedback-rules.md`
- `docs/agents/backup-rules.md`
- `docs/agents/seo-rules.md`

## Docker & DB 작업 의무 규칙

Docker 컨테이너 또는 DB 마이그레이션 작업 시작 전 **반드시**:

1. **환경(개발/운영) 의도를 한국어로 명시적으로 선언** 후 작업
   - `"<프로젝트명> 개발 환경으로 docker 구성해"` → `--env development`
   - `"<프로젝트명> 운영 환경으로 docker 구성해"` → `--env production`
2. 마이그레이션은 `./scripts/db-migrate.sh --cmd "<원본 명령>"` 래퍼로만 실행
3. `docker compose down -v` / `--volumes` 절대 금지 (DB 데이터 영구 유실)
4. 같은 접두사의 컨테이너가 이미 있으면 새로 만들지 말고 기존 compose 수정
5. compose 파일 최상단에 `name:` + `x-environment:` 라벨 필수

## Tooling rules

- CLI로 수행 가능한 작업은 기본적으로 CLI를 우선 사용
- 소스 제어와 PR은 `git`, `gh`, 검증과 반복 작업은 저장소 `scripts/*`
- 프로젝트에 공식 래퍼 스크립트나 표준 명령이 있으면 ad-hoc 명령보다 그것을 우선 사용
- Windows/Codex에서 GitHub 원격 상태를 확인할 때는 `./scripts/phase-a/preflight.ps1`를 우선 사용

## Validation (완료 기준)

- Story 완료 시: 현재 OS/셸에 맞는 quick validate 실행
- Epic 완료 시: 현재 OS/셸에 맞는 전체 validate 실행
- 실패 시 로그 확인: `state/validate/latest/*.log`
- 기본 출력은 summary 모드; 전체 출력: `VALIDATE_OUTPUT_MODE=verbose ./scripts/validate.sh`
- 검증이 실패하면 완료로 간주하지 않음

## Coding rules (핵심만, 상세는 docs/agents/coding-rules.md)

- 아키텍처 경계를 준수 (docs/agents/architecture-rules.md 참고)
- 변경된 동작에 대해 테스트 추가 또는 업데이트
- 의존성 추가 시 정당한 이유 필요

## Change rules

- 변경 범위를 현재 story로 제한
- 커밋 메시지 형식: `type(scope): description`
- type: feat, fix, refactor, test, docs, chore
- Phase A에서는 validate-quick 통과 후 **commit + push 필수**
