import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar } from '../components/NavBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Toast } from '../components/Toast'
import {
  getCourse,
  createCourse,
  updateCourse,
  DuplicateNameError,
  type CourseInput,
} from '../lib/courses'

// 웹에서 긁어온 내용을 붙여넣을 수 있도록 넉넉하게 (백엔드 COURSE_DESCRIPTION_MAX 와 일치)
export const DESCRIPTION_LIMIT = 20000

const EMPTY_FORM: CourseInput = { name: '', description: '', front_msg: '', back_msg: '' }

export function CourseEditPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<CourseInput>(EMPTY_FORM)
  const [dirty, setDirty] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [nameError, setNameError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (!isEdit || !id) return
    let active = true
    getCourse(id)
      .then(course => {
        if (!active) return
        setForm({
          name: course.name,
          description: course.description,
          front_msg: course.front_msg,
          back_msg: course.back_msg,
        })
      })
      .catch(() => {
        if (active) setLoadError('과정을 불러오지 못했습니다. 새로고침해주세요')
      })
    return () => {
      active = false
    }
  }, [id, isEdit])

  function updateField<K extends keyof CourseInput>(key: K, value: CourseInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setDirty(true)
    if (key === 'name') setNameError('')
  }

  const descriptionOver = form.description.length > DESCRIPTION_LIMIT
  // 저장 성공 후 토스트가 떠 있는 2초 동안에도 재제출을 막는다 (중복 POST/PUT 방지)
  const canSave = form.name.trim().length > 0 && !descriptionOver && !saving && !showToast

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setSaveError('')
    setNameError('')
    try {
      if (isEdit && id) {
        await updateCourse(id, form)
      } else {
        await createCourse(form)
      }
      setDirty(false)
      setShowToast(true)
    } catch (err) {
      if (err instanceof DuplicateNameError) {
        setNameError(err.message)
      } else {
        setSaveError(err instanceof Error ? err.message : '저장에 실패했습니다. 다시 시도해주세요')
      }
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (dirty) {
      setShowLeaveConfirm(true)
    } else {
      navigate('/courses')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-2xl mx-auto p-6">
        <button
          onClick={handleBack}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          ← 과정 목록으로 돌아가기
        </button>

        <h1 className="text-lg font-semibold text-gray-800 mb-6">
          {isEdit ? '과정 수정' : '과정 추가'}
        </h1>

        {loadError && <p className="text-red-500 text-sm mb-4">{loadError}</p>}

        <div className="space-y-5 bg-white rounded-lg border border-gray-200 p-6">
          <Field label="과정명">
            <input
              type="text"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="예: AIO1"
              className={[
                'w-full px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500',
                nameError ? 'border-red-500' : 'border-gray-300',
              ].join(' ')}
            />
            {nameError && <p className="text-red-500 text-sm mt-1">{nameError}</p>}
          </Field>

          <Field label="앞 고정 멘트">
            <textarea
              value={form.front_msg}
              onChange={e => updateField('front_msg', e.target.value)}
              rows={2}
              placeholder="멘트 맨 앞에 항상 붙는 문구"
              className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </Field>

          <Field label="과정 설명">
            <textarea
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              rows={8}
              placeholder="AI 가 참조할 과정 내용. 웹사이트에서 긁어온 내용을 그대로 붙여넣어도 됩니다 (최대 20000자, 관련 내용 위주 권장)."
              className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
            <p
              className={[
                'text-xs mt-1 text-right',
                descriptionOver ? 'text-red-500' : 'text-gray-400',
              ].join(' ')}
            >
              {form.description.length}/{DESCRIPTION_LIMIT}
            </p>
          </Field>

          <Field label="뒤 고정 멘트">
            <textarea
              value={form.back_msg}
              onChange={e => updateField('back_msg', e.target.value)}
              rows={2}
              placeholder="멘트 맨 뒤에 항상 붙는 문구"
              className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </Field>

          {saveError && <p className="text-red-500 text-sm">{saveError}</p>}

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              멘트 미리보기
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={[
                'px-5 py-2 rounded-md text-white font-medium',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'bg-blue-600 hover:bg-blue-700 transition-colors',
              ].join(' ')}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={showLeaveConfirm}
        message="저장하지 않고 나가시겠습니까?"
        confirmLabel="나가기"
        cancelLabel="머무르기"
        onConfirm={() => navigate('/courses')}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {showPreview && (
        <MessagePreview form={form} onClose={() => setShowPreview(false)} />
      )}

      {showToast && (
        <Toast message="저장됐습니다" onDismiss={() => navigate('/courses')} />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function MessagePreview({ form, onClose }: { form: CourseInput; onClose: () => void }) {
  const parts = [
    form.front_msg.trim(),
    '[AI 개인화 본문이 여기에 들어갑니다]',
    form.back_msg.trim(),
    'HRD 등록 링크',
  ].filter(Boolean)

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-label="멘트 미리보기"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-semibold text-gray-800 mb-4">멘트 미리보기</h2>
        <p className="text-sm text-gray-700 whitespace-pre-line mb-6">{parts.join('\n\n')}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
