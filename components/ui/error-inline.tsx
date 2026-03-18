interface ErrorInlineProps {
  message?: string
}

export function ErrorInline({ message }: ErrorInlineProps) {
  if (!message) return null

  return (
    <p className="mt-2 rounded-none border-2 border-error bg-error-bg px-3 py-2 text-sm font-bold text-error">
      {message}
    </p>
  )
}
