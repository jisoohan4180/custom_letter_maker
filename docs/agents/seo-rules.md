# docs/agents/seo-rules.md
#
# SEO, AEO, GEO 구현 규칙입니다.

## 페이지 메타데이터

- 모든 공개 페이지에 title, description, canonical, Open Graph 정보 필수
- title 형식: `"{페이지명} | {사이트명} — {핵심 가치}"`
- description은 120자 내외, 구체적 가치와 행동 유도 문구 포함

## 구조화 데이터 (JSON-LD)

- 홈페이지: `Organization`, `WebSite`(+`SearchAction`), `WebPage`, `FAQPage`, `Service` 모두 포함
- 서비스/제품 페이지: `Service` 또는 `Product` 스키마 필수
- FAQ 섹션 있는 페이지: `FAQPage` 스키마 필수
- 모든 공개 페이지: `BreadcrumbList` 스키마 필수
- 모든 스키마 값은 화면에 노출된 사실과 일치해야 함

## SEO 인프라

- sitemap: 자동 생성, 모든 공개 페이지 포함
- robots: `/admin/`, `/api/`, 비공개 경로 disallow, sitemap URL 포함
- `SITE_URL` 상수를 단일 소스로 관리

## OG 이미지

- 루트 OG 이미지 크기: `1200x630` 기준
- 블로그/아티클: 포스트 제목과 카테고리를 반영한 동적 OG 이미지 필수

## AEO (답변 엔진 최적화)

- FAQ 콘텐츠는 질문-답변 구조 + `FAQPage` 스키마와 1:1 매핑
- 구체적 수치와 사실 포함, AI가 그대로 인용할 수 있는 완결된 답변 단락 작성
- 배포 전 Google Rich Results Test 통과 필수

## GEO (생성형 AI 최적화)

- 각 주요 페이지에 팩트 기반 단문 배치
  - BAD: `"저렴한 비용으로 빠르게 개발합니다"`
  - GOOD: `"{서비스명}은 기존 외주 대비 40~60% 저렴하게, 평균 4~6주 안에 MVP를 완성합니다"`
- 블로그/아티클 콘텐츠 축적이 GEO 장기 성과의 핵심

## 적용 시점

기획(GEO 전략) → 설계(SEO/AEO 메타데이터 구조) → 개발(metadata+JSON-LD 구현) → 테스트(Rich Results Test, Lighthouse SEO 90점+) → 배포(sitemap/robots/OG 최종 점검) → 배포 후(Search Console 등록)
