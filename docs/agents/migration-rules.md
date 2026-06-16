# docs/agents/migration-rules.md

데이터베이스 스키마 마이그레이션 시 **데이터 유실을 구조적으로 방지**하기 위한 규칙입니다.

## 1. 핵심 원칙

1. 모든 마이그레이션은 `scripts/db-migrate.sh` 래퍼를 통해서만 실행
2. 마이그레이션 전 백업 필수 — 어떤 규모든 예외 없음
3. 파괴적 변경은 2단계 마이그레이션 (deprecate → remove)
4. 모든 마이그레이션은 원칙적으로 reversible
5. 운영 DB에 직접 `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` 금지

## 2. 파괴적 변경의 2단계 마이그레이션

DROP COLUMN, RENAME, 타입 축소 등은 한 번에 실행하지 않고:
- 1단계: deprecate (컬럼 유지, 앱 코드 참조 제거, 관찰 기간)
- 2단계: remove (최소 1주 뒤 실제 drop)

## 3. Reversible 마이그레이션

- 마이그레이션 파일에 up/down 모두 정의
- Irreversible인 경우 파일 헤더에 `Reversible: NO`, rollback 방법 주석, `--force-irreversible` 플래그 필요

## 4. 기존 프로젝트 이관 절차

- 사전 보고 → DB 백업 → 볼륨 보존 → `docker compose down` 시 `-v` 절대 금지
- CI/CD 파이프라인 동기화 → 이관 후 재검증

## 5. 실시간 운영 DB 보호 규칙

- 금지: `DROP DATABASE/TABLE/SCHEMA`, `TRUNCATE`, WHERE 없는 DELETE/UPDATE
- 인덱스 생성은 `CREATE INDEX CONCURRENTLY` 사용

## 6. AI 에이전트 체크리스트

- [ ] 환경(개발/운영) 명시 + compose x-environment 일치 확인
- [ ] `scripts/db-migrate.sh` 래퍼 존재 확인
- [ ] reversible 여부 확인
- [ ] DROP/RENAME 포함 시 2단계 계획 수립
- [ ] 운영 환경이면 사용자 명시적 승인 필요
