# Phase A 프롬프트 — Epic 구현 (Claude Code)

> **사용법**: 아래 프롬프트에서 `[N]`을 Epic 번호로 바꾸고 **새 Claude Code 세션**에 붙여넣기

---

```
EPIC [N] 구현을 시작합니다.

다음 순서로 진행해주세요.

## 시작 전 필수 확인
1. AGENTS.md 읽기
2. _bmad-output/planning-artifacts/architecture.md 읽기
3. _bmad-output/implementation-artifacts/sprint-status.yaml 확인 (EPIC [N] 대상 story 목록)
4. docs/agents/feedback-rules.md 반드시 읽기 (과거 반복 실수 패턴)

## 사전 점검
5. ./scripts/doctor.ps1 실행
6. ./scripts/phase-a/preflight.ps1 -Epic [N] 실행

## Story 처리 (EPIC [N]의 모든 story를 순서대로)
각 story마다 아래 흐름을 반복합니다:

a. _bmad-output/planning-artifacts/epics.md 에서 해당 story의 AC(인수 기준) 확인
b. story 브랜치 생성: git checkout -b story/[N].[M]-<story-name>
c. TDD로 구현: 테스트 작성(red) → 구현(green) → 리팩터(refactor)
d. ./scripts/validate-quick.ps1 실행
   - 통과 시: git add + git commit -m "feat(story-[N].[M]): 설명"
   - 실패 시: 수정 후 재검증, 3회 연속 실패 시 skip 처리
e. sprint-status.yaml에서 해당 story status → "dev-done" 업데이트

## Epic 완료
모든 story 처리 후:
7. ./scripts/validate.ps1 실행
8. 실패 단계가 있으면: ./scripts/validate.ps1 --from=실패단계 로 재개
9. sprint-status.yaml에서 Epic [N] status → "dev-done" 업데이트
```

---

> **주의**: validate-quick 통과가 유일한 story 완료 판정 기준입니다.
> AC를 모두 충족하는지 각 story 완료 전 반드시 확인하세요.
