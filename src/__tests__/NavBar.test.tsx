import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { NavBar } from '../components/NavBar'

function renderNavBar() {
  return render(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>,
  )
}

describe('NavBar', () => {
  it('로고 링크가 업로드 화면(/upload)을 가리킨다', () => {
    renderNavBar()
    const logo = screen.getByRole('link', { name: 'HRD 전환 어시스턴트' })
    expect(logo.getAttribute('href')).toBe('/upload')
  })

  it('"과정·멘트 관리" 링크가 과정 목록(/courses)을 가리킨다', () => {
    renderNavBar()
    const link = screen.getByRole('link', { name: '과정·멘트 관리' })
    expect(link.getAttribute('href')).toBe('/courses')
  })
})
