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

### 1. Windows PowerShell entrypoint must be native (codex-windows-native-pwsh)
- source: 2026-04-17-codex-windows-sandbox
- 발견: Codex Desktop Windows에서 `.ps1`가 Git Bash 래퍼로 동작하면서 validate/git/node 단계가 연쇄 실패
- 규칙: Windows용 `validate.ps1`, `validate-quick.ps1`, `smoke.ps1`는 Bash를 숨겨 호출하지 말고 native PowerShell로 구현한다.

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

## Retired Rules

없음
