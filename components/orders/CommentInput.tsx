'use client'

import { useState, FormEvent } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

/**
 * 訂單留言輸入元件
 * Feature: 007-system-enhancement / User Story 1
 *
 * 可重用的留言輸入框，含字數統計與提交功能
 */

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export function CommentInput({
  onSubmit,
  disabled = false,
  placeholder = '輸入留言...'
}: CommentInputProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const maxLength = 500
  const isValid = content.trim().length > 0 && content.length <= maxLength
  const charCount = content.length

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!isValid || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(content)
      setContent('') // 清空輸入框
    } catch (error) {
      console.error('提交留言失敗:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
          disabled={disabled || isSubmitting}
          className="resize-none rounded-theme-sm border-theme bg-surface p-3
                     focus:outline-none focus:ring-2 focus:ring-border
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div className="flex items-center justify-between">
        {/* 字數統計 */}
        <span className={`text-sm ${charCount > maxLength ? 'text-red-600 font-bold' : 'text-text-secondary'}`}>
          {charCount} / {maxLength}
        </span>

        {/* 提交按鈕 */}
        <Button
          type="submit"
          disabled={!isValid || disabled || isSubmitting}
          className="rounded-theme-sm border-theme bg-yellow-400 px-6 py-2
                     font-bold shadow-neo
                     hover:-translate-y-0.5 hover:shadow-theme-hover
                     active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
                     disabled:opacity-50 disabled:cursor-not-allowed
                     disabled:hover:translate-x-0 disabled:hover:translate-y-0
                     disabled:hover:shadow-neo"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              送出中...
            </>
          ) : (
            '送出留言'
          )}
        </Button>
      </div>
    </form>
  )
}
