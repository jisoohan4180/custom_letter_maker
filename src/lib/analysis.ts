// 분석 결과 1행. 백엔드(POST /api/v1/analysis/start)의 SSE 결과 및
// 엑셀 생성(POST /api/v1/analysis/excel)의 입력과 동일한 계약(snake_case JSON).
export interface AnalysisRow {
  cohort: string // 기수
  name: string // 이름
  phone: string // 연락처
  job_understanding: string // AI/직무이해도
  course_confidence: string // 과정확신도
  decision_state: string // 의사결정상태
  real_constraint: string // 현실제약
  churn_reason: string // 이탈예측사유
  message: string // 권장 독려문자멘트 (앞+AI본문+뒤+HRD링크 조합)
  failed: boolean // 분석 실패 행 여부
}

// 브라우저 로컬스토리지에 보관하는 최근 1회 분석 결과.
export interface StoredAnalysis {
  analyzed_at: string // ISO timestamp
  course_name: string
  rows: AnalysisRow[]
}
