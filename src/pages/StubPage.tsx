interface Props {
  title: string
}

export function StubPage({ title }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">{title} (준비 중)</p>
    </div>
  )
}
