import { Link } from 'react-router-dom'

/** 로그인 후 모든 화면(S-002~S-006) 상단에 노출되는 공통 네비게이션. */
export function NavBar() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/upload" className="font-semibold text-gray-800 hover:text-blue-600">
          HRD 전환 어시스턴트
        </Link>
        <Link to="/courses" className="text-sm text-gray-600 hover:text-blue-600">
          과정·멘트 관리
        </Link>
      </div>
    </nav>
  )
}
