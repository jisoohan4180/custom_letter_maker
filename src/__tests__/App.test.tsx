import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../App'

describe('App', () => {
  it('에러 없이 마운트된다', () => {
    const { container } = render(<App />)
    expect(container.firstChild).toBeTruthy()
  })
})
