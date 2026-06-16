# ADR-0001: course 모듈 서비스 레이어 도입

- 상태: Accepted
- 날짜: 2026-06-17
- 관련: Epic 2 (과정·멘트 관리), architecture.md 7절, Phase B 코드 리뷰

## 배경

Epic 2에서 course 모듈이 프로젝트 최초로 DB에 접근한다 (Epic 1의 auth 모듈은 세션만 사용).
초기 구현은 라우터(`routers/courses.py`) 핸들러 안에서 중복 검사·생성·수정·직렬화 등
비즈니스 로직을 직접 수행했는데, 이는 architecture.md 7절이 명시한 레이어 경계
(`라우터 → 서비스 → ORM`)와 어긋났다.

## 결정

과정 비즈니스 로직을 `backend/app/services/course_service.py`로 추출한다.

- 라우터는 HTTP 관심사(상태 코드, HTTPException 변환)만 담당한다.
- 서비스는 도메인 예외(`CourseNotFoundError`, `DuplicateCourseNameError`)를 던지고,
  라우터가 이를 404/409로 매핑한다.
- 서비스는 SQLAlchemy ORM을 직접 호출한다. **별도 Repository 클래스는 두지 않는다**
  — 단일 테이블(COURSES) CRUD 규모에서는 과한 추상화이므로, 다중 테이블/복잡한
  쿼리 요구가 생기면 그때 Repository를 분리한다.

## 근거

- architecture.md 7절 레이어 경계를 코드가 실제로 따르게 한다.
- Epic 3의 analysis 모듈이 "course 모듈의 데이터를 내부 함수 직접 호출로 가져온다"
  (architecture.md 7절)는 요구를 충족하려면, 재사용 가능한 조회 함수가 라우터가 아닌
  서비스 레이어에 있어야 한다. `get_course`, `get_course_by_name`이 이 진입점이다.

## 결과

- `routers/courses.py`는 얇아지고, 도메인 로직은 단위 테스트하기 쉬운 서비스로 이동.
- 동작은 변하지 않음 (기존 테스트 전부 통과).
