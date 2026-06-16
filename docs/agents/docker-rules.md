# docs/agents/docker-rules.md

## 네이밍 표준

- 프로젝트마다 고유한 접두사(소문자, 하이픈 없음)를 설정
- 컨테이너: `<접두사>-<역할>` 형태 (예: `myapp-db`, `myapp-api`)
- 숫자 붙임, new/old 표기, 언더스코어 변형 금지

## 환경 접미사 (dev/prod 공존 충돌 방지)

| 환경 | compose name | 컨테이너 예시 | 볼륨 |
|---|---|---|---|
| 운영 | `<접두사>` | `<접두사>-db` | `<접두사>_postgres_data` |
| 개발 | `<접두사>-dev` | `<접두사>-dev-db` | `<접두사>-dev_postgres_data` |

## 포트 운영

- Frontend: 외부 공개, Backend/DB/Redis: 내부 통신만 허용
- 모든 포트값은 `.env` 환경변수로 주입, compose 파일에 숫자 하드코딩 금지
- 서비스 간 통신은 Docker 내부 DNS명 사용 (예: `db:5432`)

## 사전/사후 검증

- Docker 작업 전후로 컨테이너·네트워크·볼륨 상태를 확인
- 허용 목록 외 항목이 있으면 중단

## Compose 작성 원칙

- 프로젝트마다 compose 파일 1개 (중복 생성 금지)
- 서비스 간 통신은 전용 네트워크 사용
- 모든 compose 파일 최상단에 `name:` + `x-environment:` 필수

## 환경변수

- `.env.example`만 커밋, `.env`는 Git 제외
- 포트값은 조직 포트 레지스트리를 따름

## 금지 사항

- `docker compose down -v` (데이터 영구 유실) — Claude hook이 자동 차단
- 기존 compose와 동일 접두사의 compose 파일 새로 생성
- compose 파일에 포트 숫자 하드코딩

## 체크리스트

- [ ] 포트 일치도 확인
- [ ] 네이밍 준수 확인
- [ ] 중복 컨테이너 부재 확인
- [ ] `x-environment:` 라벨 존재 확인
- [ ] named volume 사용 확인
