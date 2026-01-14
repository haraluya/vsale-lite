'use client'

import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PromptDialogOptions, PromptDialogField } from '@/types/dialog'

interface PromptDialogProps {
  options: PromptDialogOptions
  onClose: (data: Record<string, string> | null) => void
}

/**
 * PromptDialog 元件
 * 替代原生 prompt()，支援多欄位輸入與即時驗證
 */
export function PromptDialog({ options, onClose }: PromptDialogProps) {
  const { title, message, fields, confirmText = '確定', cancelText = '取消' } = options

  // 表單資料與錯誤訊息
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    fields.forEach((field) => {
      initial[field.name] = field.defaultValue || ''
    })
    return initial
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // ESC 鍵關閉
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(null)
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // 背景滾動鎖定
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // 驗證單一欄位
  const validateField = (field: PromptDialogField, value: string): string | null => {
    // 必填驗證
    if (field.required && !value.trim()) {
      return `${field.label}為必填欄位`
    }

    // 最大長度驗證
    if (field.maxLength && value.length > field.maxLength) {
      return `${field.label}不得超過 ${field.maxLength} 個字元`
    }

    // 自訂驗證
    if (field.validation) {
      return field.validation(value)
    }

    return null
  }

  // 處理欄位變更
  const handleChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))

    // 即時驗證
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

  // 處理提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 驗證所有欄位
    const newErrors: Record<string, string> = {}
    fields.forEach((field) => {
      const error = validateField(field, formData[field.name] || '')
      if (error) {
        newErrors[field.name] = error
      }
    })

    setErrors(newErrors)

    // 若有錯誤則不提交
    if (Object.keys(newErrors).length > 0) {
      return
    }

    onClose(formData)
  }

  // 處理取消
  const handleCancel = () => {
    onClose(null)
  }

  // 檢查是否可提交（所有必填欄位都已填寫且無錯誤）
  const canSubmit = fields.every((field) => {
    if (field.required) {
      return formData[field.name]?.trim() && !errors[field.name]
    }
    return !errors[field.name]
  })

  // Enter 鍵提交（僅單行輸入）
  const handleKeyDown = (e: React.KeyboardEvent, field: PromptDialogField) => {
    if (e.key === 'Enter' && field.type !== 'textarea' && canSubmit) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0 duration-200"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-dialog-title"
      aria-describedby={message ? 'prompt-dialog-message' : undefined}
    >
      <div
        className={cn(
          'w-full max-w-md',
          'border-2 md:border-3 border-black bg-white',
          'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
          'animate-in zoom-in-95 duration-200',
          'max-h-[90vh] overflow-y-auto'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題欄 */}
        <div className="flex items-center gap-3 border-b-2 md:border-b-3 border-black bg-blue-400 p-4 text-white">
          <Info className="h-6 w-6 flex-shrink-0" />
          <h2 id="prompt-dialog-title" className="text-lg font-bold">
            {title}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 內容 */}
          <div className="p-6 space-y-4">
            {message && (
              <p id="prompt-dialog-message" className="text-sm text-gray-700 mb-4">
                {message}
              </p>
            )}

            {/* 輸入欄位 */}
            {fields.map((field) => (
              <div key={field.name} className="space-y-1">
                <label htmlFor={field.name} className="block text-sm font-bold text-gray-800">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
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
                      'w-full px-3 py-2',
                      'border-2 md:border-3 border-black',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500',
                      'resize-none',
                      errors[field.name] && 'border-red-500'
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
                      'w-full px-3 py-2',
                      'border-2 md:border-3 border-black',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors[field.name] && 'border-red-500'
                    )}
                    aria-invalid={!!errors[field.name]}
                    aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
                    autoFocus={field === fields[0]}
                  />
                )}

                {/* 錯誤訊息 */}
                {errors[field.name] && (
                  <p id={`${field.name}-error`} className="text-xs text-red-600 mt-1">
                    {errors[field.name]}
                  </p>
                )}

                {/* 字數提示 */}
                {field.maxLength && formData[field.name] && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formData[field.name].length} / {field.maxLength}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* 按鈕 */}
          <div className="border-t-2 md:border-t-3 border-black p-4 flex gap-3">
            {/* 取消按鈕 */}
            <button
              type="button"
              onClick={handleCancel}
              className={cn(
                'flex-1 px-4 py-2',
                'border-2 md:border-3 border-black',
                'bg-white hover:bg-gray-100',
                'text-gray-800 font-bold text-sm uppercase',
                'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                'transition-all duration-150',
                'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
                'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2'
              )}
            >
              {cancelText}
            </button>

            {/* 確認按鈕 */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'flex-1 px-4 py-2',
                'border-2 md:border-3 border-black',
                'bg-blue-500 hover:bg-blue-600',
                'text-white font-bold text-sm uppercase',
                'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                'transition-all duration-150',
                'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
                'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
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
