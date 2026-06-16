# docs/agents/testing-rules.md
#
# 테스트 작성과 실행에 대한 규칙입니다.
# ⚠️ 프로젝트의 테스트 프레임워크에 맞게 수정하세요.

## 테스트 필수 대상

- 새로 추가된 비즈니스 로직
- 변경된 기존 동작
- 버그 수정 (재발 방지 테스트)
- API 엔드포인트
- 사용자 입력 검증 로직

## 테스트 불필요 대상

- 순수 UI 스타일링 변경
- 타입 정의만 변경
- 설정 파일만 변경
- 문서만 변경

## 테스트 작성 원칙

- 테스트 이름은 "무엇을 했을 때 무엇이 되어야 한다" 형식
- 하나의 테스트에 하나의 검증
- 외부 의존성은 mock 처리
- 테스트 데이터는 테스트 파일 내에 명시

## 테스트 격리 규칙 (병렬 충돌 방지)

- DB: 테스트별 트랜잭션 롤백 또는 테스트 전용 DB 사용
- 포트: 테스트에서 서버를 띄울 때 `port: 0` 사용
- 파일 시스템: 임시 파일은 테스트별 고유 `tmp` 디렉토리 사용
- 전역 상태: `beforeEach`에서 초기화, `afterEach`에서 정리
- 환경변수: 테스트에서 `process.env`를 직접 수정하지 않음
- 타이머/시간: fake timers 사용 시 `afterEach`에서 반드시 복원

## 4층 검증 체계 (Inner Loop → Outer Loop)

| 시점 | 도구 | 범위 | 고유 가치 | 예상 시간 |
|---|---|---|---|---|
| Story 완료 (로컬) | `validate-quick.ps1` | 변경 파일 lint + typecheck + 관련 테스트 | 빠른 피드백 (inner loop) | < 60초 |
| Epic 완료 (로컬) | `validate.ps1` | 전체 typecheck/lint/test/build + security/perf 체크 | 로컬 특화 패턴 검증 | 3~5분 |
| develop push (원격) | CI | 깨끗한 npm ci + 전체 검증 + coverage + npm audit | 환경 독립 검증 | 5~8분 |
| main push (원격) | Deploy | Docker 배포 + smoke | 프로덕션 배포 게이트 | 5~10분 |

## 실행 명령

- Story 빠른 검증: `./scripts/validate-quick.ps1` (Windows) / `./scripts/validate-quick.sh` (bash)
- Epic 전체 검증: `./scripts/validate.ps1` (Windows) / `./scripts/validate.sh` (bash)
- 실패 단계부터 재개: `./scripts/validate.ps1 --from=test`
- 전체 출력 모드: `$env:VALIDATE_OUTPUT_MODE='verbose'; ./scripts/validate.ps1`

## 검증 순서

1. 타입 체크 통과
2. lint 통과
3. 단위 테스트 통과 (순차 실행)
4. 회귀 테스트 통과
5. 빌드 성공
6. (해당 시) 통합 테스트 통과
