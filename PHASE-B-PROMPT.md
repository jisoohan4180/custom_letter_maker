# Phase B 프롬프트 — 코드 리뷰 + 수정 (Claude Code)

> **사용법**: 아래 프롬프트에서 `[N]`을 Epic 번호로 바꾸고 Claude Code에 붙여넣기

---

```
EPIC [N] Phase B를 시작합니다. 코드 리뷰 및 수정을 진행해주세요.

## 시작 전 확인
1. CLAUDE.md 읽기
2. _bmad-output/implementation-artifacts/sprint-status.yaml 확인
   (EPIC [N]에서 완료된 story 브랜치 목록 확인)
3. docs/agents/feedback-rules.md 읽기 (과거 반복 실수 패턴)

## 리뷰
4. /bmad-code-review 스킬 실행 (3층 병렬 리뷰)
   - REVIEW.md 기준 적용
   - docs/agents/architecture-rules.md 경계 규칙 확인
   - 변경 파일을 Read/Grep으로 직접 확인 (텍스트 diff만 보지 않음)

## 수정
REJECTED 항목이 있으면:
5. Edit/Write로 직접 수정
6. Hooks가 자동으로 lint + typecheck 실행됨
7. 수정 후 ./scripts/validate.sh 재검증

## 최종 검증 및 완료
8. ./scripts/validate.sh 실행 (전체 통과 확인)
9. ./scripts/smoke.sh 실행
10. develop 브랜치에 merge
11. sprint-status.yaml 업데이트 (EPIC [N] → review: done)
```

---

> **기준**: REVIEW.md의 APPROVED 조건 전부 충족 시에만 완료.
> validate.sh 실패 또는 보안 이슈 발견 시 REJECTED 처리.
