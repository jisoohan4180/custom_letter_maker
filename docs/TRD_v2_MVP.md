# Tutorial Manager TRD

> 버전: v2.0 MVP (1단계 4주 기준)
> 작성일: 2026-05-21
> 대상: 비개발자 1인 · Claude Code · 4주 출시

---

## 1. 한 문단 요약

Tutorial Manager는 Next.js 14 단일 프로젝트 안에서 4개 모듈(trainee·admin·content·storage)로 역할을 나눈 모듈러 모놀로식 구조로 개발한다. 1단계에서 Discord 모듈은 포함하지 않는다. 데이터베이스는 Supabase PostgreSQL을 Prisma ORM으로 다루고, 이미지는 Supabase Storage에 저장한다. TypeScript를 전 영역에 통일해 Claude Code가 타입 정보를 기반으로 정확한 코드를 생성할 수 있는 바이브코딩 최적 환경을 갖춘다.

월 운영비 $0. 외부 비용이 없으므로 첫 기수 운영 후 실제 필요성이 확인된 기능만 추가하는 방식으로 진행한다. 가장 큰 기술 리스크는 Prisma-Supabase connection pooling 설정이며, 초기 설정 시 올바른 DATABASE_URL(Transaction Pooler, 포트 6543)을 사용하면 방지할 수 있다.

---

## 2. 아키텍처

### 2.1 모듈러 모놀로식 (선택 이유)

30명 규모 내부 도구에 MSA를 도입하면 서버 관리와 배포 파이프라인 설계에만 수 주가 소요된다. 비개발자 1인이 4주 안에 출시해야 하므로 단일 Next.js 프로젝트 안에서 폴더 구조로 모듈 경계를 표시한다.

### 2.2 모듈 구조 (1단계)

```
src/
  modules/
    trainee/    → 코드 인증·튜토리얼 화면·미션 제출
    admin/      → 기수 관리·명단 업로드·대시보드
    content/    → 미션 콘텐츠 DB 조회·렌더링
    storage/    → 이미지 업로드·Signed URL 발급
  (discord/)    → 2단계에서 추가
```

```mermaid
graph TD
    T[trainee 모듈]
    A[admin 모듈]
    C[content 모듈]
    S[storage 모듈]
    T --> C
    T --> S
    A --> C
    A --> S
    DB[(Supabase DB)]
    ST[(Supabase Storage)]
    T --> DB
    A --> DB
    S --> ST
```

---

## 3. 기술 스택

### 3.1 프론트엔드

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 14 (App Router) | Claude Code 호환 최적, 프론트+API 통합 |
| 언어 | TypeScript | Claude Code 타입 기반 코드 생성 |
| 픽셀 UI | Tailwind CSS 직접 제작 | 완전한 픽셀 컨셉 제어 |
| 매니저 UI | shadcn/ui | 테이블·폼·탭 개발 속도 단축 |
| 픽셀 폰트 | Press Start 2P (영문) + Noto Sans KR (한글) | Google Fonts, 무료 |
| Markdown | react-markdown | 미션 콘텐츠 DB 렌더링, 단순 구조에 충분 |

**픽셀 폰트 적용 규칙**: Press Start 2P는 한글을 지원하지 않으므로 제목·버튼에만 사용하고, 미션 본문과 UI 레이블 한글은 Noto Sans KR을 사용한다.

### 3.2 백엔드

Next.js API Route가 백엔드 역할을 한다. `/app/api/` 폴더에 파일을 만들면 자동으로 서버 API가 된다. 별도 Express·FastAPI 서버 불필요.

1단계에서 Discord REST API 호출은 없다. 코드 전달은 관리자 화면의 각 훈련생마다의 "링크 복사" 버튼으로 수동 처리한다.

| 영역 | 선택 | 이유 |
|---|---|---|
| 백엔드 | Next.js API Route | 단일 프로젝트, 별도 서버 불필요 |
| 매니저 인증 | 환경변수 패스워드 | 빠른 구현, 단순 내부 도구 |
| 이미지 삭제 | 수동 삭제 버튼 (1단계) | Cron 설정은 2단계 |

### 3.3 데이터베이스

Supabase PostgreSQL을 Prisma ORM으로 다룬다. Prisma가 TypeScript 타입을 자동 생성하므로 Claude Code가 정확한 DB 쿼리를 생성할 수 있다.

**⚠️ 가장 중요한 설정**: Vercel 서버리스에서 Prisma를 사용할 때 `DATABASE_URL`에 Transaction Pooler URL(포트 6543)을 사용해야 한다. 일반 URL(포트 5432)을 쓰면 동시 접속 시 연결 초과 오류가 발생한다.

```
# 올바른 설정 (Vercel 환경변수)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.supabase.com:5432/postgres"
```

Prisma schema.prisma에는 두 URL을 모두 설정한다:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 3.4 인증

| 사용자 | 방식 | 유지 기간 |
|---|---|---|
| 훈련생 | 코드 입력 → JWT 쿠키 | 14일 (코드 만료와 동일) |
| 매니저 | 환경변수 패스워드 → 서버사이드 검증 | 브라우저 세션 동안 |

**JWT_SECRET 변경 금지**: 실수로 재생성하면 기수 진행 중 30명 세션 전체 만료. 환경변수에 `# 절대 변경 금지` 주석 추가 필수.

### 3.5 인프라

| 영역 | 선택 | 비용 |
|---|---|---|
| 호스팅 | Vercel 무료 플랜 | $0/월 |
| DB + Storage | Supabase 무료 플랜 | $0/월 |
| 도메인 | Vercel 기본 도메인 | $0 |
| Cron | 2단계에서 추가 | — |

GitHub main 브랜치에 push하면 Vercel이 2~3분 안에 자동 배포한다.

---

## 4. 데이터 모델

### 4.1 전체 Prisma Schema

```prisma
model Cohort {
  id          String    @id @default(cuid())
  name        String
  starts_at   DateTime
  expires_at  DateTime
  created_at  DateTime  @default(now())
  trainees    Trainee[]
  missions    Mission[]
}

model Trainee {
  id          String       @id @default(cuid())
  cohort_id   String
  cohort      Cohort       @relation(fields: [cohort_id], references: [id])
  access_code String       @unique
  is_active   Boolean      @default(true)
  created_at  DateTime     @default(now())
  submissions Submission[]
}

model Mission {
  id             String       @id @default(cuid())
  cohort_id      String
  cohort         Cohort       @relation(fields: [cohort_id], references: [id])
  order_index    Int
  title          String
  content        String       @db.Text
  requires_image Boolean      @default(false)
  thumbnail_url  String?
  submissions    Submission[]
}

model Submission {
  id           String            @id @default(cuid())
  trainee_id   String
  trainee      Trainee           @relation(fields: [trainee_id], references: [id])
  mission_id   String
  mission      Mission           @relation(fields: [mission_id], references: [id])
  content      String?           @db.Text
  submitted_at DateTime          @default(now())
  updated_at   DateTime          @updatedAt
  images       SubmissionImage[]

  @@unique([trainee_id, mission_id])
}

// 미션 1개당 최대 5장
model SubmissionImage {
  id            String     @id @default(cuid())
  submission_id String
  submission    Submission @relation(fields: [submission_id], references: [id])
  storage_path  String     // Supabase Storage 경로 (Signed URL 발급용)
  order_index   Int        // 이미지 표시 순서
  created_at    DateTime   @default(now())
}
```

> `image_url String?` 단일 컬럼 방식 대신 `SubmissionImage` 별도 테이블을 사용한다. 이미지 개별 삭제·순서 관리·최대 5장 제한을 깔끔하게 처리할 수 있다.

### 4.2 인덱스 설계

```sql
-- 코드 입력 조회 (훈련생 인증 핵심 경로)
CREATE INDEX idx_trainees_access_code ON trainees(access_code);

-- 대시보드 조회 (기수별 훈련생 목록)
CREATE INDEX idx_trainees_cohort_id ON trainees(cohort_id);

-- 진행도 조회 (훈련생별 제출 목록)
CREATE INDEX idx_submissions_trainee_id ON submissions(trainee_id);

-- 이미지 목록 조회 (제출별 이미지)
CREATE INDEX idx_submission_images_submission_id ON submission_images(submission_id);
```

---

## 5. API 설계

### 5.1 훈련생 API

| Method | Path | 설명 |
|---|---|---|
| POST | /api/auth | 코드 인증 → JWT 쿠키 발급 |
| GET | /api/missions | 기수 미션 목록 조회 (JWT 필요) |
| GET | /api/submissions/me | 내 제출 목록 + 이미지 목록 조회 (JWT 필요) |
| POST | /api/submissions | 미션 첫 제출 — 텍스트 + 이미지 최대 5장 (JWT 필요) |
| PUT | /api/submissions/:id | 제출 수정 — 텍스트 교체 + 이미지 추가/삭제 (JWT 필요) |
| DELETE | /api/submissions/:id/images/:imageId | 이미지 개별 삭제 (JWT 필요) |

### 5.2 매니저 API

| Method | Path | 설명 |
|---|---|---|
| POST | /api/admin/cohorts | 기수 생성 |
| GET | /api/admin/cohorts | 기수 목록 조회 |
| POST | /api/admin/cohorts/:id/trainees/upload | CSV 업로드 → 코드 발급 |
| POST | /api/admin/cohorts/:id/trainees | 훈련생 개별 추가 |
| PATCH | /api/admin/trainees/:id | 활성화 토글 |
| GET | /api/admin/cohorts/:id/dashboard | 대시보드 데이터 |
| PUT | /api/admin/missions/:id | 미션 내용 저장 |
| POST | /api/admin/missions | 미션 추가 |
| POST | /api/admin/storage/delete | 이미지 수동 삭제 |

---

## 6. 보안

### 6.1 인증·인가
훈련생 API는 JWT 쿠키로 보호한다. API Route에서 JWT를 검증하고 본인 데이터만 접근 가능하도록 WHERE 절에 trainee_id를 강제한다. 매니저 API(/api/admin/*)는 환경변수 패스워드를 서버사이드에서만 검증한다.

### 6.2 환경변수 5개

| 변수명 | 내용 | 주의 |
|---|---|---|
| DATABASE_URL | Transaction Pooler URL (포트 6543) | 절대 포트 5432 사용 금지 |
| DIRECT_URL | Direct URL (포트 5432) | Prisma migrate 전용 |
| SUPABASE_SERVICE_KEY | Supabase Service Role Key | 절대 클라이언트 노출 금지 |
| JWT_SECRET | JWT 서명 키 | 절대 변경 금지 |
| ADMIN_PASSWORD | 매니저 비밀번호 | 배포 후 변경 가능 |

### 6.3 이미지 보안
Supabase Storage 비공개 버킷. 이미지 접근은 서버에서 발급한 Signed URL(60분 만료)로만 가능하다.

---

## 7. 비용 및 운영

| 단계 | 규모 | 월 비용 |
|---|---|---|
| 1단계 운영 | 2기수 × 30명, 이미지 미션 기준 최대 5장/미션 | $0 (여유 있음 — 실제 제출 비율 감안 시 수백MB 이내) |
| 확장 | 10기수 이상 동시 + 이미지 미션 다수 | $25~ (Storage 초과 시) |

> 이미지 용량 최악 케이스 추산: 10MB × 5장 × 7미션 × 30명 = 10.5GB. 실제로는 모든 미션이 이미지 미션이 아니고 평균 파일 크기가 훨씬 작으므로, 2기수 운영 범위에서는 1GB 무료 티어 내 충분히 처리 가능하다. 이미지 미션 수가 늘어날 경우 수동 삭제 버튼으로 관리하고, 자동 삭제 Cron은 2단계에서 추가한다.

**운영 부담**:
- 기수 시작: CSV 업로드 + 코드 복사·수동 전달 (10~15분)
- 기수 진행 중: 대시보드 확인 (하루 1~2분)
- 이미지 삭제: 수동 삭제 버튼 (2단계 Cron 추가 전)

---

## 8. 4주 개발 순서

| 주차 | 작업 | Claude Code 프롬프트 방향 |
|---|---|---|
| 1주 | DB 스키마 설정 + Supabase 연결 + 기수 생성 + CSV 업로드 + 코드 발급 | "Prisma schema 작성 → migration → 기수 생성 API → CSV 파싱 → 코드 생성 로직" |
| 2주 | S-001 코드 입력 + JWT 인증 + S-002 픽셀 튜토리얼 홈 | "코드 입력 폼 → JWT 발급 → 튜토리얼 홈 픽셀 UI → 미션 카드 컴포넌트" |
| 3주 | S-003 미션 상세 모달 + 이미지 업로드 + 제출 처리 | "모달 컴포넌트 → Supabase Storage 업로드 → 제출 API → CLEAR! 연출" |
| 4주 | 탭1 미션 편집 에디터 + 탭2 대시보드 + 색상 계산 + 행 펼침 | "Markdown 에디터 → DB 저장 → 대시보드 테이블 → D+3 색상 계산 → 행 펼침" |

---

## 9. 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| Prisma-Supabase connection pooling 미설정 | 동시 접속 시 연결 초과 오류 | 1주차 초기에 Transaction Pooler URL 확인 필수 |
| JWT_SECRET 실수 변경 | 기수 진행 중 전체 세션 만료 | 환경변수에 주석, 변경 금지 문서화 |
| 이미지 용량 누적 | Supabase 1GB 초과 시 $25/월 | 10MB/건 제한 + 수동 삭제 버튼. 자동 삭제는 2단계 |
| 동명이인 코드 충돌 | 잘못된 페이지 진입 | 업로드 시 자동 감지 + 매니저 수동 조정 |

---

## 10. 2단계 추가 예정 (기술 준비 사항)

2단계(Discord 연동) 진행 시 사전 확인 항목:
- Discord 개발자 포털에서 Bot 생성
- Server Members Intent 활성화 (필수)
- 기수 서버에 Bot 초대
- cohorts 테이블에 discord_server_id 컬럼 추가 (1단계 스키마에 미리 nullable로 포함 권장)
- 환경변수에 DISCORD_BOT_TOKEN 추가

---

## 수정 이유 요약

**줄인 것**: Discord 모듈 전체, Vercel Cron 이미지 자동 삭제, Notion API, git push 콘텐츠 배포 방식

**충돌 해소**:
- 이전 PRD/TRD는 Markdown 파일 기반, FRD v1.4는 DB+에디터 방식이었다. v2에서는 DB+에디터 방식으로 통일한다. Markdown 파일 방식은 git 사용법을 모르는 비개발자에게 실질적 장벽이 되며, DB 에디터가 더 직관적이다.
- Discord 모듈은 1단계 모듈 구조에서 완전히 제거하고 2단계에서 추가하도록 명시해 초기 복잡도를 낮춘다.

**뒤로 미룬 이유**: Discord Bot 설정(개발자 포털 생성 → Intent 활성화 → 서버 초대)은 모두 외부 플랫폼 작업이라 비개발자 혼자 처음 진행하기 어렵고 디버깅도 복잡하다. Cron 자동 삭제는 이미지가 실제로 누적되는 시점(2~3기수 운영 후)에 추가해도 충분하다.

**1단계에서 먼저 만들 것**: 1주차에 Prisma+Supabase 연결과 Transaction Pooler URL 설정을 먼저 검증한다. 이것이 가장 큰 기술 리스크이므로 초기에 해결해두면 이후 4주 일정이 안정적으로 진행된다.
