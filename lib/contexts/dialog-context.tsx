'use client'

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type {
  AlertDialogOptions,
  ConfirmDialogOptions,
  PromptDialogOptions,
} from '@/types/dialog'
import { AlertDialog } from '@/components/ui/dialogs/alert-dialog'
import { ConfirmDialog } from '@/components/ui/dialogs/confirm-dialog'
import { PromptDialog } from '@/components/ui/dialogs/prompt-dialog'

/**
 * Dialog Context 型別定義
 */
interface DialogContextValue {
  alert: (options: AlertDialogOptions) => Promise<void>
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>
  prompt: (options: PromptDialogOptions) => Promise<Record<string, string> | null>
}

/**
 * Dialog State 內部狀態
 */
interface DialogState {
  type: 'alert' | 'confirm' | 'prompt' | null
  options: AlertDialogOptions | ConfirmDialogOptions | PromptDialogOptions | null
  resolve: ((value: any) => void) | null
}

const DialogContext = createContext<DialogContextValue | null>(null)

/**
 * DialogProvider 元件
 * 提供統一的對話框狀態管理
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({
    type: null,
    options: null,
    resolve: null,
  })

  /**
   * Alert Hook 實作
   */
  const alert = useCallback((options: AlertDialogOptions): Promise<void> => {
    return new Promise((resolve) => {
      setState({
        type: 'alert',
        options,
        resolve: () => {
          resolve()
          setState({ type: null, options: null, resolve: null })
        },
      })
    })
  }, [])

  /**
   * Confirm Hook 實作
   */
  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        type: 'confirm',
        options,
        resolve: (confirmed: boolean) => {
          resolve(confirmed)
          setState({ type: null, options: null, resolve: null })
        },
      })
    })
  }, [])

  /**
   * Prompt Hook 實作
   */
  const prompt = useCallback((options: PromptDialogOptions): Promise<Record<string, string> | null> => {
    return new Promise((resolve) => {
      setState({
        type: 'prompt',
        options,
        resolve: (data: Record<string, string> | null) => {
          resolve(data)
          setState({ type: null, options: null, resolve: null })
        },
      })
    })
  }, [])

  const value: DialogContextValue = {
    alert,
    confirm,
    prompt,
  }

  return (
    <DialogContext.Provider value={value}>
      {children}
      {/* 對話框渲染器 */}
      {state.type === 'alert' && state.options && state.resolve && (
        <AlertDialog
          options={state.options as AlertDialogOptions}
          onClose={() => state.resolve!(undefined)}
        />
      )}
      {state.type === 'confirm' && state.options && state.resolve && (
        <ConfirmDialog
          options={state.options as ConfirmDialogOptions}
          onClose={(confirmed: boolean) => state.resolve!(confirmed)}
        />
      )}
      {state.type === 'prompt' && state.options && state.resolve && (
        <PromptDialog
          options={state.options as PromptDialogOptions}
          onClose={(data: Record<string, string> | null) => state.resolve!(data)}
        />
      )}
    </DialogContext.Provider>
  )
}

/**
 * useAlert Hook
 * 使用方式: const alert = useAlert()
 * 呼叫: await alert({ title: '成功', message: '儲存完成', variant: 'success' })
 */
export function useAlert() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useAlert must be used within DialogProvider')
  }
  return context.alert
}

/**
 * useConfirm Hook
 * 使用方式: const confirm = useConfirm()
 * 呼叫: const confirmed = await confirm({ title: '確認刪除', description: '此操作無法復原', variant: 'danger' })
 */
export function useConfirm() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useConfirm must be used within DialogProvider')
  }
  return context.confirm
}

/**
 * usePrompt Hook
 * 使用方式: const prompt = usePrompt()
 * 呼叫: const result = await prompt({ title: '輸入名稱', fields: [{ name: 'name', label: '姓名', required: true }] })
 */
export function usePrompt() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('usePrompt must be used within DialogProvider')
  }
  return context.prompt
}
