# docs/agents/backup-rules.md
#
# 데이터베이스 백업 시스템 설계 규칙입니다.

## 백업 아키텍처 개요 (4계층)

1. 일간 자동 백업 (cron): `scripts/backup.sh` → `~/backups/{DB}_{DATE}.sql.gz`
2. 오프사이트 동기화: `scripts/offsite-sync.sh` → rsync to 원격 PC
3. 배포 전 자동 백업 (CI/CD): `{DB}_predeploy_{DATE}.sql.gz`
4. 마이그레이션 전 자동 백업 (db-migrate.sh): `state/db-backups/pre-migrate-{TS}.dump.gz`

## 스크립트 설계 규칙

- `set -euo pipefail` 로 시작
- 환경변수 기본값 패턴: `${VAR:-default_value}`
- 타임스탬프 포맷: `YYYYMMDD_HHMMSS`
- 백업 파일명: `{DB_NAME}_{TIMESTAMP}.sql.gz`
- 필수 검증: 덤프 성공 여부, 파일 존재/크기, gzip -t 무결성 검증
- 보존: `find ${BACKUP_DIR} -mtime +${RETENTION_DAYS} -delete`

## 오프사이트 동기화

- SSH 키 인증 (BatchMode=yes, ConnectTimeout=10)
- rsync with 재시도 최대 3회, 10초 간격

## 알림 시스템

- Discord/Slack 웹훅
- 메시지 접두어: `[BACKUP OK]`, `[BACKUP FAILED]`, `[OFFSITE SYNC OK]`, `[OFFSITE SYNC FAILED]`

## 금지 사항

- 백업 파일에 DB 비밀번호를 파일명으로 포함 금지
- 하드코딩 비밀번호 금지
- 백업 파일을 Git에 커밋 금지 (`.gitignore`에 `*.sql.gz`)
- 압축하지 않은 SQL 파일을 디스크에 남기지 않음
- cron 로그를 `/var/log/`에 쓰지 않음 → `~/logs/` 사용
