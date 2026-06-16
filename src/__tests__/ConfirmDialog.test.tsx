import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConfirmDialog } from '../components/ConfirmDialog'

function setup(open = true) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmDialog
      open={open}
      message="저장하지 않고 나가시겠습니까?"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  )
  return { onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('open=false 면 아무것도 렌더링하지 않는다', () => {
    setup(false)
    expect(screen.queryByText('저장하지 않고 나가시겠습니까?')).toBeNull()
  })

  it('open=true 면 메시지를 표시한다', () => {
    setup(true)
    expect(screen.getByText('저장하지 않고 나가시겠습니까?')).toBeTruthy()
  })

  it('확인 버튼 클릭 시 onConfirm 이 호출된다', () => {
    const { onConfirm } = setup()
    fireEvent.click(screen.getByRole('button', { name: '확인' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('취소 버튼 클릭 시 onCancel 이 호출된다', () => {
    const { onCancel } = setup()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('ESC 키를 누르면 onCancel 이 호출된다', () => {
    const { onCancel } = setup()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('외부(오버레이) 클릭 시 onCancel 이 호출된다', () => {
    const { onCancel } = setup()
    // 다이얼로그 본문이 아닌 오버레이(presentation) 클릭
    const overlay = screen.getByRole('presentation')
    fireEvent.click(overlay)
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
