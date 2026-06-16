# docs/agents/feedback-rules.md
#
# 과거 Epic에서 반복된 실수 패턴을 정리한 활성 교훈 파일입니다.
# 이 파일은 Phase C 회고에서 재작성됩니다 (쌓는 파일이 아님).
#
# 운영 규칙:
#   - 최대 10개 active rule만 유지 (초과 시 가장 오래된 것 retire)
#   - 각 규칙은 source incident id를 가짐
#   - 최근 2 Epic 동안 재발 없으면 retired로 이동
#   - 기계적으로 판별 가능한 패턴은 validate.sh로 승격 후 여기서 제거

## Active Rules

### 1. Windows PowerShell entrypoint must be native + robust (codex-windows-native-pwsh)
- source: 2026-04-17-codex-windows-sandbox
- 발견: Codex Desktop Windows에서 `.ps1`가 Git Bash 래퍼로 동작하면서 validate/git/node 단계가 연쇄 실패
- 규칙: Windows용 `validate.ps1`, `validate-quick.ps1`, `smoke.ps1`는 Bash를 숨겨 호출하지 말고 native PowerShell로 구현한다.
- 강화(Epic 2): 원격 없는 로컬에서 `git rev-parse --verify origin/develop` stderr가 `ErrorActionPreference=Stop`에서 종료 오류로 승격돼 validate-quick이 죽었다. 존재 불확실 ref 프로브는 `--quiet` + 프로브 구간 `Continue`로 처리한다. (incident: 2026-06-17-validate-quick-baseref-no-remote)

### 2. Codex Windows git must use harness wrapper first (codex-windows-git-wrapper)
- source: 2026-04-17-codex-windows-sandbox
- 발견: Codex Desktop Windows에서 `git fetch/push`가 schannel, credential helper, 기본 Windows env 누락으로 실패
- 규칙: Phase A 자동화는 raw `git fetch/push`보다 `scripts/lib/git-utils.ps1` 기반 wrapper를 우선 사용한다.

### 3. Hook fallback requires native validation first (codex-windows-hook-fallback)
- source: 2026-04-17-codex-windows-sandbox
- 규칙: Windows/Codex에서 `git commit --no-verify` fallback은 native validate/check가 이미 통과한 경우에만 허용한다.

### 4. Raw JS runtime checks are not validation gates (codex-windows-raw-node-false-negative)
- source: 2026-04-17-codex-windows-sandbox
- 규칙: Windows/Codex에서 raw JS 런타임 sanity check 실패만으로 story 구현을 중단하지 않는다. 반드시 현재 OS/셸에 맞는 하네스 검증 entrypoint 결과로 판정한다.

### 5. GitHub preflight uses gh on Codex Windows (codex-windows-gh-preflight)
- source: 2026-04-17-codex-windows-github
- 규칙: Windows/Codex에서 GitHub 원격 사전 조건은 raw `git fetch`로 판정하지 않는다. `./scripts/phase-a/preflight.ps1 -Epic <N>` 또는 `gh api` 경로를 사용한다.

### 6. React SPA 보호 라우트에 인증 가드 필수 (spa-protected-route-auth-guard)
- source: 2026-06-16-spa-protected-route-missing-auth
- 발견: Epic 1 Phase B — `/upload`, `/results`가 인증 없이 직접 URL 접근 가능 (AC 1.2.4 위반)
- 규칙: FastAPI가 React SPA를 정적 파일로 서빙하는 구조에서는 서버 사이드 리다이렉트가 불가하다. 인증이 필요한 모든 라우트를 `<PrivateRoute>`(또는 동등한 auth 가드 컴포넌트)로 반드시 감싸야 한다. AC에 "인증 필요" 또는 "미들웨어 검증"이 언급된 라우트는 모두 대상이다.

### 7. FastAPI 환경변수 검증은 미들웨어 설정 이전에 실행 (fastapi-validate-env-before-middleware)
- source: 2026-06-16-python-dotenv-not-loaded (연관)
- 발견: Epic 1 Phase B — `SessionMiddleware`가 `os.getenv("SESSION_SECRET_KEY", "fallback")` fallback 키로 초기화된 후 lifespan에서 `validate_env()` 종료, 타이밍 불일치
- 규칙: FastAPI 앱에서 미들웨어(특히 SessionMiddleware)에 환경변수를 주입할 때는 반드시 `validate_env()` 후에 `os.environ["KEY"]`(fallback 없음)를 사용한다. lifespan이 아닌 모듈 임포트 시점에서 검증을 완료해야 한다.

### 8. 비동기 제출 성공 후 버튼 재활성화 금지 (async-submit-resubmit-guard)
- source: 2026-06-17-async-submit-resubmit-window
- 발견: Epic 2 Phase B — CourseEditPage 저장 성공 후 토스트 2초 동안 저장 버튼이 재활성화돼 중복 POST → 성공 직후 "이미 있는 과정명" 오표시
- 규칙: 비동기 제출(폼 저장, 분석 시작 등) 성공 후 토스트/리다이렉트가 지연되면 버튼 비활성화 조건에 in-flight 플래그뿐 아니라 완료 플래그(예: `showToast`)도 포함한다. 또는 성공 즉시 navigate로 재제출 윈도를 제거하고, 성공 후 버튼이 비활성인지 테스트한다.

### 9. 경계값·전체 메서드 검증 테스트 필수 (boundary-and-method-test-coverage)
- source: 2026-06-17-missing-boundary-and-method-tests
- 발견: Epic 2 Phase B — 200자 허용 경계 미검증, PUT 길이 회귀 테스트 부재, 미리보기 분기 테스트 전무 (한 Epic에서 3회 반복)
- 규칙: 새 검증/변환 로직 테스트는 (1) 경계값 양쪽(거부되는 첫 값 N+1 + 허용되는 마지막 값 N), (2) 같은 검증을 공유하는 모든 변경 메서드(POST/PUT/PATCH), (3) 비자명한 분기(filter로 항목이 빠지는 경우 등)를 각각 커버한다.

## Retired Rules

없음

## 하네스로 승격된 패턴 (feedback-rule 대신 validate.ps1 체크)

- 라우터 ORM 직접 호출 금지 → `validate.ps1` [08] blocking [arch] (incident: 2026-06-17-router-direct-orm-no-service-layer, ADR-0001)
- Python `load_dotenv()` 미호출 → [08] blocking [P1] (Epic 1)
- Alembic + `create_all()` 공존 → [08] blocking [P6] (Epic 1)
