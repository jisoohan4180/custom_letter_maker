# HRD 전환 어시스턴트 — Architecture

> 원본 TRD: `HRD전환어시스턴트-전체문서-20260616/trd-HRD전환어시스턴트-20260616.md` v1.0

---

## 1. 아키텍처 결정: 모듈러 모놀로식

서버 1대, 프로세스 1개. auth / analysis / course 3개 모듈로 코드만 구분.

```
클라이언트 (React SPA)
    ↕ REST + SSE
FastAPI 서버 (서버 1개)
  ├── auth 모듈     비밀번호 검증 · 세션
  ├── analysis 모듈 CSV · Claude API · 엑셀
  └── course 모듈   과정 설정 CRUD
    ↕
SQLite (hrd.db)    과정 설정만 저장
Claude API         AI 분석 · 멘트 생성
```

## 2. 기술 스택

### 프론트엔드
| 항목 | 선택 |
|---|---|
| 프레임워크 | React 18 + Vite + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| 폼 | React Hook Form + Zod |
| 상태 | 로컬스토리지 (분석 결과 임시 보관) |

### 백엔드
| 항목 | 선택 |
|---|---|
| 언어 | Python 3.11+ |
| 프레임워크 | FastAPI |
| CSV | pandas |
| 엑셀 | openpyxl |
| AI | anthropic SDK (claude-haiku-4-5) |
| 실시간 | SSE (async generator 필수) |
| API 방식 | REST, prefix: /api/v1/ |

### 데이터베이스
| 항목 | 선택 |
|---|---|
| DB | SQLite (파일 1개) |
| ORM | SQLAlchemy |
| 마이그레이션 | Alembic |
| 경로 | DB_PATH 환경변수 (기본: ~/hrd-data/hrd.db) |

### 인프라
- 사내 PC/서버에서 실행 (클라우드 불필요)
- start.bat (개발 서버), deploy.bat (빌드 + 재시작)
- 프론트엔드 빌드 파일을 FastAPI가 정적 파일로 직접 서빙

## 3. 데이터 모델

### COURSES 테이블 (유일한 DB 테이블)
```sql
CREATE TABLE courses (
    id        TEXT PRIMARY KEY,
    name      TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    front_msg TEXT DEFAULT '',
    back_msg  TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 분석 결과
- **DB에 저장하지 않음**
- 브라우저 로컬스토리지에만 임시 보관 (최근 1회분)

## 4. API 엔드포인트

### Auth
- `POST /api/v1/auth/login` — 비밀번호 검증 + 세션 발급
- `POST /api/v1/auth/logout` — 세션 삭제

### Courses
- `GET /api/v1/courses` — 과정 목록 조회
- `GET /api/v1/courses/{id}` — 과정 상세 조회
- `POST /api/v1/courses` — 과정 추가
- `PUT /api/v1/courses/{id}` — 과정 수정

### Analysis
- `POST /api/v1/analysis/start` — 분석 시작 (SSE 스트림 반환)
- `POST /api/v1/analysis/excel` — 분석 결과 엑셀(xlsx) 다운로드

### Health
- `GET /healthz` — liveness
- `GET /readyz` — readiness

## 5. SSE 구현 주의사항

```python
# ✅ CORRECT — async generator 필수
async def analysis_stream():
    async for result in process_applicants():
        yield f"data: {json.dumps(result)}\n\n"

@router.post("/analysis/start")
async def start_analysis(...):
    return StreamingResponse(analysis_stream(), media_type="text/event-stream")

# ❌ WRONG — 동기 함수 사용 시 스트림 차단됨
def analysis_stream():  # sync = 전체 완료 후 한 번에 반환
    ...
```

## 6. 보안

- `CLAUDE_API_KEY`, `APP_PASSWORD`, `SESSION_SECRET_KEY` → `.env` 전용
- 세션: itsdangerous 서명된 쿠키, 8시간 유지
- 개인정보(CSV): 분석 완료 즉시 서버 메모리에서 삭제, DB 저장 금지
- `.env` → `.gitignore` 포함 필수

## 7. 레이어 경계 규칙

```
UI (React)
  ↓ (REST 호출만)
FastAPI 라우터
  ↓ (함수 호출)
서비스 레이어 (비즈니스 로직)
  ↓ (ORM 호출)
SQLAlchemy 모델 / Repository
```

- UI는 DB를 직접 호출하지 않음
- 분석 로직은 analysis 모듈 안에서만
- course 모듈의 데이터를 analysis 모듈이 내부 함수 직접 호출로 가져옴 (네트워크 불필요)

## 8. 비용 / 운영

- Claude API (Haiku) 월 비용: 200원 미만 (하루 5명 기준)
- 인프라 비용: 사내 PC 사용 시 0원
- 로그: RotatingFileHandler, 10MB 상한, 백업 3개
