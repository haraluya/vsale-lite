/**
 * Dialog System Type Definitions
 * 統一對話框系統型別定義
 *
 * 支援三種對話框：AlertDialog、ConfirmDialog、PromptDialog
 */

export type DialogVariant = 'success' | 'error' | 'warning' | 'info' | 'danger' | 'default'

/**
 * AlertDialog 選項
 * 用於替代原生 alert()
 */
export interface AlertDialogOptions {
  /** 對話框標題 */
  title: string
  /** 對話框內容 */
  message: string
  /** 變體類型（決定顏色和圖示） */
  variant?: 'success' | 'error' | 'warning' | 'info'
  /** 確認按鈕文字 */
  confirmText?: string
  /** 是否允許 ESC/背景點擊關閉 */
  closable?: boolean
}

/**
 * ConfirmDialog 選項
 * 用於替代原生 confirm()
 */
export interface ConfirmDialogOptions {
  /** 對話框標題 */
  title: string
  /** 對話框描述 */
  description: string
  /** 變體類型（決定顏色和圖示） */
  variant?: DialogVariant
  /** 確認按鈕文字 */
  confirmText?: string
  /** 取消按鈕文字 */
  cancelText?: string
  /** 是否為異步操作（啟用載入狀態） */
  isAsync?: boolean
  /** 是否允許 ESC/背景點擊關閉 */
  closable?: boolean
}

/**
 * PromptDialog 輸入欄位定義
 */
export interface PromptDialogField {
  /** 欄位名稱（用於回傳資料的 key） */
  name: string
  /** 欄位標籤 */
  label: string
  /** 欄位類型 */
  type?: 'text' | 'number' | 'textarea'
  /** 提示文字 */
  placeholder?: string
  /** 預設值 */
  defaultValue?: string
  /** 是否必填 */
  required?: boolean
  /** 最大長度限制 */
  maxLength?: number
  /** 自訂驗證函式（回傳錯誤訊息或 null） */
  validation?: (value: string) => string | null
}

/**
 * PromptDialog 選項
 * 用於替代原生 prompt()
 */
export interface PromptDialogOptions {
  /** 對話框標題 */
  title: string
  /** 對話框描述（選填） */
  message?: string
  /** 輸入欄位陣列 */
  fields: PromptDialogField[]
  /** 確認按鈕文字 */
  confirmText?: string
  /** 取消按鈕文字 */
  cancelText?: string
}

/**
 * Dialog Hook 回傳型別
 */
export interface DialogHooks {
  /** Alert Hook - 顯示通知對話框 */
  alert: (options: AlertDialogOptions) => Promise<void>
  /** Confirm Hook - 顯示確認對話框 */
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>
  /** Prompt Hook - 顯示輸入對話框 */
  prompt: (options: PromptDialogOptions) => Promise<Record<string, string> | null>
}
