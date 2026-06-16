# Phase C 프롬프트 — 회고 + 하네스 강화 (Claude Code)

> **사용법**: 아래 프롬프트에서 `[N]`을 Epic 번호로 바꾸고 Claude Code에 붙여넣기

> ⚠️ Phase C는 배포 준비가 아닙니다. 반복 실수를 구조적으로 차단하는 단계입니다.

---

```
EPIC [N] Phase C를 시작합니다. 회고 및 하네스 강화를 진행해주세요.

## 시작 전 확인
1. reviews/ 폴더에서 EPIC [N] 관련 리뷰 결과 전부 읽기
2. feedback/incidents/ 폴더 확인 (기존 incident 패턴 파악)
3. docs/agents/feedback-rules.md 현재 상태 읽기

## 패턴 분석
4. EPIC [N] Phase B에서 REJECTED된 항목들 목록 작성
5. 2회 이상 반복된 실수 패턴 식별
6. validate-quick/validate 실패 로그에서 반복 패턴 확인
   (state/validate/latest/*.log)

## 문서화
반복 패턴이 발견된 경우:
7. feedback/incidents/ 에 새 incident 파일 생성
   - 파일명: YYYY-MM-DD-[패턴명].md
   - 내용: 발생 상황 / 원인 / 재발 방지 규칙
8. docs/agents/feedback-rules.md 업데이트
   - Active Rules에 새 규칙 추가 (최대 10개 유지)
   - 2 Epic 이상 재발 없는 규칙은 Retired로 이동

## 하네스 구조 개선
기계적으로 판별 가능한 패턴이 있으면:
9. validate.sh 또는 validate-quick.sh에 체크 항목 추가
   (docs/agents/feedback-rules.md에서 제거 후 스크립트로 승격)

## 완료
10. sprint-status.yaml 업데이트 (EPIC [N] 상태 → retrospective: done)
11. 다음 Epic 진행 여부 확인
```

---

> **목표**: 이번 Epic에서 발생한 실수가 다음 Epic에서 자동으로 차단되는 구조 만들기.
> 단순 문서화가 아니라 validate 스크립트 또는 lint 규칙으로 승격하는 것이 최선.
