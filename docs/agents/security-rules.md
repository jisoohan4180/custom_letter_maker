# docs/agents/security-rules.md

보안 규칙입니다. 위반 시 코드 리뷰에서 REJECTED 처리됩니다.
⚠️ 프로젝트에 맞게 수정하세요.

## 시크릿 관리

- 소스 코드에 API 키, 비밀번호, 토큰을 절대 하드코딩하지 않음
- 모든 시크릿은 환경변수(`process.env.VAR_NAME`)로 접근
- `.env` 파일은 절대 커밋하지 않음 (`.gitignore`에 포함)
- `.env.example`에 필요한 변수 목록만 기록 (값은 빈칸 또는 placeholder)
- 시크릿을 에러 메시지나 로그에 포함하지 않음
- 앱 시작 시 필수 환경변수를 검증 (zod 스키마 권장)

## 인증/인가

- auth 미들웨어를 주석 처리하거나 제거하지 않음
- CORS를 `origin: '*'`로 설정하지 않음 (환경변수에서 허용 도메인 읽기)
- CSRF, rate limiting을 비활성화하지 않음
- 모든 API 엔드포인트에 명시적 인증 체크 필요
- 세션 토큰: httpOnly, Secure, SameSite=Strict

## 입력 검증/주입 방지

- 사용자 입력을 SQL에 문자열 연결하지 않음 (파라미터화 쿼리 또는 ORM 사용)
- `eval()`, `Function()`, `new Function()` 사용 금지
- `dangerouslySetInnerHTML`은 반드시 DOMPurify 등으로 sanitize 후 사용
- 모든 API 경계에서 입력 검증 (zod 권장)

## 에러 노출

- 내부 에러 상세(스택 트레이스, DB 에러)를 클라이언트에 노출하지 않음
- 클라이언트에는 일반적 에러 메시지 + 에러 코드만 반환
- 상세 에러는 서버 로그에만 기록
- 패턴: `catch(err) { logger.error(err); res.status(500).json({ error: 'Internal server error' }) }`

## 자동 보안 검증 체계

| 단계 | 트리거 | 도구 | 검사 대상 |
|---|---|---|---|
| 1. 커밋 직전 | `git commit` | `.githooks/pre-commit` | staged 파일의 `.env` 차단 + eslint |
| 2. push/PR | main/develop 대상 | CI security workflow | Gitleaks(시크릿), CodeQL(SAST), Trivy(CVE) |
| 3. Docker 명령 실행 시 | Claude Bash | `.claude/hooks/docker-guard-hook.sh` | `docker compose down -v`, 마이그레이션 직접 호출 차단 |
| 4. 마이그레이션 실행 시 | `db-migrate.sh` | 내장 래퍼 | 환경 검증 + 자동 pg_dump |
