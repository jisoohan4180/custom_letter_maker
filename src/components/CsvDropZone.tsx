import { useRef, useState } from 'react'

interface Props {
  label: string
  fileName: string | null
  rowCount: number | null
  error: string | null
  onFile: (file: File) => void
}

/** CSV 드래그앤드롭 + 파일선택 영역. 검증 상태는 부모가 내려준다. */
export function CsvDropZone({ label, fileName, rowCount, error, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label} 업로드`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={e => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={[
          'border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors',
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
          error ? 'border-red-400 bg-red-50' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = '' // 같은 파일 재선택 허용
          }}
        />
        {fileName && !error ? (
          <p className="text-sm text-gray-700">
            {fileName} · {rowCount}행
          </p>
        ) : (
          <p className="text-sm text-gray-400">CSV 파일을 끌어다 놓거나 클릭해 선택</p>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
}
