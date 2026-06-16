# docs/agents/deploy-rules.md
#
# 배포 및 Docker 규칙입니다.
# ⚠️ 프로젝트의 배포 환경에 맞게 수정하세요.

## 환경 분리

같은 머신에서 개발(dev)과 운영(prod)이 공존할 수 있다는 전제로 설계합니다.

### 파일 배치

- 운영: `docker-compose.yml` + `.env.production`
- 개발: `docker-compose.dev.yml` + `.env.development`
- `.env.example`만 커밋 (실제 값 없이 변수 목록만)
- 모든 설정값은 환경변수로 관리, 소스 코드에 하드코딩 금지

### 환경 라벨 (AI 혼동 방지)

모든 compose 파일 최상단에 환경 라벨을 필수로 기재:

```yaml
name: <접두사>
x-environment: production   # 또는 development

services:
  ...
```

- `x-environment` 값은 `production`, `development`, `staging` 중 하나
- AI는 docker 관련 작업 시작 전에 compose 파일의 `name:`과 `x-environment:`를 확인

## 포트 관리

- 포트 번호를 소스 코드에 하드코딩하지 않음
- docker-compose에서 `${PORT:-3000}` 패턴으로 환경변수 사용
- 서비스 간 통신은 Docker 내부 DNS 사용

## 데이터베이스 마이그레이션

- 마이그레이션은 `scripts/db-migrate.sh` 래퍼를 통해 실행
- `prisma migrate deploy`, `flyway migrate` 등을 직접 호출하지 않음

## Dockerfile 최적화

- 레이어 순서: 의존성 먼저, 소스 나중에 (캐시 최적화)
- `COPY . .`를 `RUN npm install` 앞에 두지 않음
- Multi-stage build 필수 (deps → build → runtime 분리)
- `.dockerignore` 필수: node_modules, .git, .env*, coverage, dist

## 데이터베이스 보호

- DB 데이터는 반드시 named volume 사용
- `docker-compose down -v` 또는 `--volumes` 플래그 사용 금지
- 프로덕션 DB 볼륨은 `external: true` 설정

## Health Check

- 모든 서비스에 필수 엔드포인트: `GET /healthz`, `GET /readyz`
- docker-compose에 healthcheck 정의 필수

## Graceful Shutdown

- 모든 서비스는 SIGTERM 핸들링 필수
- Docker stop timeout: 최소 30초

## 운영 docker-compose.yml 필수 항목

- `restart: always`
- 리소스 제한 (memory, CPU)
- healthcheck 정의
- 디버그 포트 노출하지 않음
- named volume으로 데이터 영속성 보장
