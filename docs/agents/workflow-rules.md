# docs/agents/workflow-rules.md
#
# 이 프로젝트의 작업 흐름 규칙입니다.
# BMAD + Harness Engineering 통합 워크플로우를 정의합니다.

## 도구별 역할 분담

| Phase | 도구 | 역할 | BMAD 스킬 |
|---|---|---|---|
| 기획/설계 | Claude Code | PRD, Architecture, Epics 생성 | bmad-create-prd, bmad-create-architecture, bmad-create-epics-and-stories |
| Phase A: 구현 | Codex Desktop | Story 생성 + 구현 (Epic 단위) | bmad-create-story, bmad-dev-story |
| Phase B: 품질 보장 | Claude Code | 코드 리뷰 + 수정 + 테스트 보강 (Epic 단위) | bmad-code-review |

## Phase A: Codex Desktop 흐름 (Epic 단위)

1. `./scripts/phase-a/preflight.ps1 -Epic <N>` 실행하여 사전 조건 확인
2. `bmad-create-story` 스킬로 story 파일 생성
3. `bmad-dev-story` 스킬로 구현 (TDD: red-green-refactor)
4. 현재 OS/셸에 맞는 quick validate 실행
   - Windows: `./scripts/validate-quick.ps1`
   - bash/WSL: `./scripts/validate-quick.sh`
5. 통과 시 commit + push (필수, push 없이 다음 story 진행 금지)
6. Epic 완료 후 전체 validate 실행
   - Windows: `./scripts/validate.ps1`
   - bash/WSL: `./scripts/validate.sh`

## Phase B: Claude Code 흐름 (Epic 단위)

1. sprint-status.yaml에서 review 대상 브랜치 확인
2. `bmad-code-review` 스킬로 3층 병렬 리뷰
3. REJECTED 항목 직접 수정 (Edit/Write)
4. `./scripts/validate.sh` + `./scripts/smoke.sh` 최종 검증
5. develop 브랜치에 merge
6. sprint-status.yaml 업데이트

## 브랜치 규칙

- `story/* → develop → main → 자동 배포`
- main과 develop은 항상 검증 통과 상태 유지
- merge된 story 브랜치는 Phase C 회고 단계에서 정리

## Hang/Timeout 가드

| 단계 | 기본 timeout | 오버라이드 환경변수 |
|---|---|---|
| install | 1800s (30m) | `VALIDATE_INSTALL_TIMEOUT` |
| typecheck | 600s (10m) | `VALIDATE_TYPECHECK_TIMEOUT` |
| lint | 300s (5m) | `VALIDATE_LINT_TIMEOUT` |
| test / regression-test / related-tests | 1200s (20m) | `VALIDATE_TEST_TIMEOUT` |
| build | 1200s (20m) | `VALIDATE_BUILD_TIMEOUT` |
| 그 외 단계 | 600s (10m) | `VALIDATE_DEFAULT_TIMEOUT` |
| smoke 전체 | 600s (10m) | `HARNESS_SMOKE_TIMEOUT` |
| PostToolUse eslint hook | 60s | `HARNESS_HOOK_TIMEOUT` |

## 실패 처리

- validate-quick 실패 시: 수정 후 재검증, 3회 실패 시 story skip
- validate 실패 시: `--from=실패단계`로 재개
- 3회 이상 반복되는 실수: `feedback/` 폴더에 incident 기록 후 `docs/agents/feedback-rules.md` 업데이트
