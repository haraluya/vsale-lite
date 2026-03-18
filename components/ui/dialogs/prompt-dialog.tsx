'use client'

import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PromptDialogOptions, PromptDialogField } from '@/types/dialog'

interface PromptDialogProps {
  options: PromptDialogOptions
  onClose: (data: Record<string, string> | null) => void
}

export function PromptDialog({ options, onClose }: PromptDialogProps) {
  const { title, message, fields, confirmText = '確定', cancelText = '取消' } = options

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    fields.forEach((field) => {
      initial[field.name] = field.defaultValue || ''
    })
    return initial
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(null)
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const validateField = (field: PromptDialogField, value: string): string | null => {
    if (field.required && !value.trim()) {
      return `${field.label}為必填欄位`
    }

    if (field.maxLength && value.length > field.maxLength) {
      return `${field.label}不得超過 ${field.maxLength} 個字元`
    }

    if (field.validation) {
      return field.validation(value)
    }

    return null
  }

  const handleChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))

    const field = fields.find((f) => f.name === fieldName)
    if (field) {
      const error = validateField(field, value)
      setErrors((prev) => {
        const newErrors = { ...prev }
        if (error) {
          newErrors[fieldName] = error
        } else {
          delete newErrors[fieldName]
        }
        return newErrors
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}
    fields.forEach((field) => {
      const error = validateField(field, formData[field.name] || '')
      if (error) {
        newErrors[field.name] = error
      }
    })

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    onClose(formData)
  }

  const handleCancel = () => {
    onClose(null)
  }

  const canSubmit = fields.every((field) => {
    if (field.required) {
      return formData[field.name]?.trim() && !errors[field.name]
    }
    return !errors[field.name]
  })

  const handleKeyDown = (e: React.KeyboardEvent, field: PromptDialogField) => {
    if (e.key === 'Enter' && field.type !== 'textarea' && canSubmit) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 animate-in fade-in-0 duration-200"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-dialog-title"
      aria-describedby={message ? 'prompt-dialog-message' : undefined}
    >
      <div
        className={cn(
          'w-full max-w-md',
          'border-2 md:border-3 bg-surface',
          'shadow-[8px_8px_0px_0px_var(--color-border)]',
          'animate-in zoom-in-95 duration-200',
          'max-h-[90vh] overflow-y-auto'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題欄 */}
        <div className="flex items-center gap-3 border-b-2 md:border-b-3 bg-info p-4 text-text-inverse">
          <Info className="h-6 w-6 flex-shrink-0" />
          <h2 id="prompt-dialog-title" className="text-lg font-bold">
            {title}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 內容 */}
          <div className="p-6 space-y-4">
            {message && (
              <p id="prompt-dialog-message" className="text-sm text-text-secondary mb-4">
                {message}
              </p>
            )}

            {fields.map((field) => (
              <div key={field.name} className="space-y-1">
                <label htmlFor={field.name} className="block text-sm font-bold">
                  {field.label}
                  {field.required && <span className="text-error ml-1">*</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    rows={4}
                    className={cn(
                      'w-full px-3 py-2 bg-surface',
                      'border-2 md:border-3',
                      'focus:outline-none focus:ring-2 focus:ring-info',
                      'resize-none',
                      errors[field.name] && 'border-error'
                    )}
                    aria-invalid={!!errors[field.name]}
                    aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    id={field.name}
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, field)}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    className={cn(
                      'w-full px-3 py-2 bg-surface',
                      'border-2 md:border-3',
                      'focus:outline-none focus:ring-2 focus:ring-info',
                      errors[field.name] && 'border-error'
                    )}
                    aria-invalid={!!errors[field.name]}
                    aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
                    autoFocus={field === fields[0]}
                  />
                )}

                {errors[field.name] && (
                  <p id={`${field.name}-error`} className="text-xs text-error mt-1">
                    {errors[field.name]}
                  </p>
                )}

                {field.maxLength && formData[field.name] && (
                  <p className="text-xs text-muted mt-1">
                    {formData[field.name].length} / {field.maxLength}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* 按鈕 */}
          <div className="border-t-2 md:border-t-3 p-4 flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className={cn(
                'flex-1 px-4 py-2',
                'border-2 md:border-3',
                'bg-surface hover:bg-surface-secondary',
                'font-bold text-sm uppercase',
                'shadow-neo',
                'transition-all duration-150',
                'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
                'focus:outline-none focus:ring-2 focus:ring-offset-2'
              )}
            >
              {cancelText}
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'flex-1 px-4 py-2',
                'border-2 md:border-3',
                'bg-info hover:opacity-80',
                'text-text-inverse font-bold text-sm uppercase',
                'shadow-neo',
                'transition-all duration-150',
                'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo'
              )}
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
