/**
 * Error Inline Component
 * Neo-Brutalism Design
 */

interface ErrorInlineProps {
  message?: string
}

export function ErrorInline({ message }: ErrorInlineProps) {
  if (!message) return null

  return (
    <p className="mt-2 rounded-none border-2 border-red-600 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">
      {message}
    </p>
  )
}
