'use client'

import { useState } from 'react'
import { useAlert, useConfirm, usePrompt } from '@/lib/contexts/dialog-context'
import { toast } from 'sonner'

/**
 * 對話框樣本頁面
 * Phase 0: 設計樣本確認
 *
 * 展示所有對話框變體讓使用者確認設計風格
 */
export default function DialogSamplesPage() {
  const alert = useAlert()
  const confirm = useConfirm()
  const prompt = usePrompt()

  const [lastResult, setLastResult] = useState<string>('')

  // AlertDialog 範例
  const handleAlertSuccess = async () => {
    await alert({
      title: '操作成功',
      message: '您的資料已成功儲存。系統將在 3 秒後自動刷新。',
      variant: 'success',
      confirmText: '確定',
    })
    setLastResult('AlertDialog (Success) - 使用者點擊確定')
  }

  const handleAlertError = async () => {
    await alert({
      title: '發生錯誤',
      message: '無法連接到伺服器。請檢查您的網路連線並重試。\n\n錯誤代碼: ERR_CONNECTION_FAILED',
      variant: 'error',
      confirmText: '知道了',
    })
    setLastResult('AlertDialog (Error) - 使用者點擊知道了')
  }

  const handleAlertWarning = async () => {
    await alert({
      title: '警告',
      message: '您的庫存即將不足。建議盡快補貨。',
      variant: 'warning',
      confirmText: '我知道了',
    })
    setLastResult('AlertDialog (Warning) - 使用者點擊我知道了')
  }

  const handleAlertInfo = async () => {
    await alert({
      title: '系統通知',
      message: '系統將於今晚 23:00-01:00 進行維護，期間將無法使用。請提前完成您的工作。',
      variant: 'info',
      confirmText: '確定',
    })
    setLastResult('AlertDialog (Info) - 使用者點擊確定')
  }

  // ConfirmDialog 範例
  const handleConfirmDanger = async () => {
    const confirmed = await confirm({
      title: '確認刪除',
      description: '您確定要刪除「高級會員」等級嗎？\n\n此操作無法復原，將影響 18 個客戶。',
      variant: 'danger',
      confirmText: '刪除',
      cancelText: '取消',
    })
    setLastResult(`ConfirmDialog (Danger) - 使用者選擇: ${confirmed ? '刪除' : '取消'}`)
  }

  const handleConfirmSuccess = async () => {
    const confirmed = await confirm({
      title: '發佈商品',
      description: '確定要將此商品發佈到前台嗎？\n\n發佈後客戶即可看到並下單購買。',
      variant: 'success',
      confirmText: '發佈',
      cancelText: '取消',
    })
    setLastResult(`ConfirmDialog (Success) - 使用者選擇: ${confirmed ? '發佈' : '取消'}`)
  }

  const handleConfirmWarning = async () => {
    const confirmed = await confirm({
      title: '確認修改價格',
      description: '此商品有 5 個進行中的訂單。\n\n修改價格可能影響未確認的訂單，確定要繼續嗎？',
      variant: 'warning',
      confirmText: '繼續修改',
      cancelText: '取消',
    })
    setLastResult(`ConfirmDialog (Warning) - 使用者選擇: ${confirmed ? '繼續修改' : '取消'}`)
  }

  const handleConfirmInfo = async () => {
    const confirmed = await confirm({
      title: '匯出資料',
      description: '系統將匯出最近 30 天的訂單資料為 Excel 檔案。\n\n此操作可能需要幾分鐘，是否繼續？',
      variant: 'info',
      confirmText: '匯出',
      cancelText: '取消',
    })
    setLastResult(`ConfirmDialog (Info) - 使用者選擇: ${confirmed ? '匯出' : '取消'}`)
  }

  const handleConfirmDefault = async () => {
    const confirmed = await confirm({
      title: '確認操作',
      description: '您確定要執行此操作嗎？',
      variant: 'default',
      confirmText: '確定',
      cancelText: '取消',
    })
    setLastResult(`ConfirmDialog (Default) - 使用者選擇: ${confirmed ? '確定' : '取消'}`)
  }

  const handleConfirmAsync = async () => {
    const confirmed = await confirm({
      title: '刪除客戶資料',
      description: '此操作將刪除客戶的所有資料，包含訂單記錄。\n\n此過程需要幾秒鐘，請稍候...',
      variant: 'danger',
      confirmText: '刪除',
      cancelText: '取消',
      isAsync: true,
    })
    setLastResult(`ConfirmDialog (Async) - 使用者選擇: ${confirmed ? '刪除（已等待異步操作）' : '取消'}`)
  }

  // PromptDialog 範例
  const handlePromptSingle = async () => {
    const result = await prompt({
      title: '輸入新密碼',
      message: '請為客戶設定新密碼（至少 6 個字元）',
      fields: [
        {
          name: 'password',
          label: '新密碼',
          type: 'text',
          placeholder: '請輸入密碼',
          required: true,
          maxLength: 20,
          validation: (value) => {
            if (value.length < 6) return '密碼至少需要 6 個字元'
            return null
          },
        },
      ],
      confirmText: '設定',
      cancelText: '取消',
    })
    setLastResult(
      `PromptDialog (Single) - 結果: ${result ? `密碼: ${result.password}` : '使用者取消'}`
    )
  }

  const handlePromptMultiple = async () => {
    const result = await prompt({
      title: '新增客戶',
      message: '請填寫客戶基本資料',
      fields: [
        {
          name: 'name',
          label: '客戶名稱',
          type: 'text',
          placeholder: '請輸入名稱',
          required: true,
          maxLength: 50,
        },
        {
          name: 'phone',
          label: '聯絡電話',
          type: 'text',
          placeholder: '0912-345-678',
          required: true,
          validation: (value) => {
            const phoneRegex = /^09\d{8}$/
            if (!phoneRegex.test(value.replace(/-/g, ''))) {
              return '請輸入有效的手機號碼（09 開頭，10 碼）'
            }
            return null
          },
        },
        {
          name: 'notes',
          label: '備註',
          type: 'textarea',
          placeholder: '選填：客戶特殊需求或注意事項',
          required: false,
          maxLength: 200,
        },
      ],
      confirmText: '新增',
      cancelText: '取消',
    })
    setLastResult(
      `PromptDialog (Multiple) - 結果: ${
        result
          ? `名稱: ${result.name}, 電話: ${result.phone}, 備註: ${result.notes || '（無）'}`
          : '使用者取消'
      }`
    )
  }

  // Toast 範例
  const handleToastSuccess = () => {
    toast.success('儲存成功')
    setLastResult('Toast (Success) - 儲存成功')
  }

  const handleToastError = () => {
    toast.error('刪除失敗')
    setLastResult('Toast (Error) - 刪除失敗')
  }

  const handleToastWarning = () => {
    toast.warning('請先填寫必填欄位')
    setLastResult('Toast (Warning) - 請先填寫必填欄位')
  }

  const handleToastInfo = () => {
    toast.info('系統維護通知')
    setLastResult('Toast (Info) - 系統維護通知')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* 標題 */}
        <div className="mb-8 border-2 md:border-3 border-black bg-white p-6 shadow-neo">
          <h1 className="text-3xl font-bold mb-2">對話框樣本頁面</h1>
          <p className="text-gray-700">
            Phase 0: 設計樣本確認 - 請測試所有對話框變體，確認 Neo-Brutalism 設計風格無誤
          </p>
        </div>

        {/* 操作結果顯示 */}
        {lastResult && (
          <div className="mb-8 border-2 md:border-3 border-black bg-blue-50 p-4 shadow-neo-sm">
            <p className="text-sm font-bold text-gray-800">上一次操作結果:</p>
            <p className="text-sm text-gray-700 mt-1">{lastResult}</p>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          {/* AlertDialog 區塊 */}
          <div className="border-2 md:border-3 border-black bg-white p-6 shadow-neo">
            <h2 className="text-xl font-bold mb-4 border-b-2 md:border-b-3 border-black pb-2">AlertDialog 四種變體</h2>
            <div className="space-y-3">
              <Button onClick={handleAlertSuccess} variant="success">
                Success Alert
              </Button>
              <Button onClick={handleAlertError} variant="error">
                Error Alert
              </Button>
              <Button onClick={handleAlertWarning} variant="warning">
                Warning Alert
              </Button>
              <Button onClick={handleAlertInfo} variant="info">
                Info Alert
              </Button>
            </div>
          </div>

          {/* ConfirmDialog 區塊 */}
          <div className="border-2 md:border-3 border-black bg-white p-6 shadow-neo">
            <h2 className="text-xl font-bold mb-4 border-b-2 md:border-b-3 border-black pb-2">
              ConfirmDialog 六種變體
            </h2>
            <div className="space-y-3">
              <Button onClick={handleConfirmDanger} variant="error">
                Danger Confirm
              </Button>
              <Button onClick={handleConfirmSuccess} variant="success">
                Success Confirm
              </Button>
              <Button onClick={handleConfirmWarning} variant="warning">
                Warning Confirm
              </Button>
              <Button onClick={handleConfirmInfo} variant="info">
                Info Confirm
              </Button>
              <Button onClick={handleConfirmDefault} variant="default">
                Default Confirm
              </Button>
              <Button onClick={handleConfirmAsync} variant="error">
                Async Confirm（載入狀態）
              </Button>
            </div>
          </div>

          {/* PromptDialog 區塊 */}
          <div className="border-2 md:border-3 border-black bg-white p-6 shadow-neo">
            <h2 className="text-xl font-bold mb-4 border-b-2 md:border-b-3 border-black pb-2">
              PromptDialog 輸入對話框
            </h2>
            <div className="space-y-3">
              <Button onClick={handlePromptSingle} variant="info">
                單欄位輸入（含驗證）
              </Button>
              <Button onClick={handlePromptMultiple} variant="info">
                多欄位輸入（含 Textarea）
              </Button>
            </div>
          </div>

          {/* Toast 區塊 */}
          <div className="border-2 md:border-3 border-black bg-white p-6 shadow-neo">
            <h2 className="text-xl font-bold mb-4 border-b-2 md:border-b-3 border-black pb-2">Toast 通知 (sonner)</h2>
            <div className="space-y-3">
              <Button onClick={handleToastSuccess} variant="success">
                Success Toast
              </Button>
              <Button onClick={handleToastError} variant="error">
                Error Toast
              </Button>
              <Button onClick={handleToastWarning} variant="warning">
                Warning Toast
              </Button>
              <Button onClick={handleToastInfo} variant="info">
                Info Toast
              </Button>
            </div>
          </div>
        </div>

        {/* 測試說明 */}
        <div className="mt-8 border-2 md:border-3 border-black bg-yellow-50 p-6 shadow-neo">
          <h3 className="text-lg font-bold mb-3">測試檢查清單</h3>
          <ul className="space-y-2 text-sm text-gray-800">
            <li>✅ 所有對話框包含 3px 黑邊框</li>
            <li>✅ 對話框陰影為硬陰影（8px_8px_0px_0px_rgba(0,0,0,1)）</li>
            <li>✅ 按鈕點擊有位移效果（translate-x-[2px] translate-y-[2px]）</li>
            <li>✅ 按鈕點擊時陰影消失</li>
            <li>✅ 標題欄顏色正確（success 綠、error 紅、warning 黃、info 藍）</li>
            <li>✅ ESC 鍵可關閉對話框</li>
            <li>✅ 點擊背景可關閉對話框</li>
            <li>✅ 行動裝置上對話框居中顯示、背景滾動鎖定</li>
            <li>✅ PromptDialog 即時驗證正常運作</li>
            <li>✅ Toast 通知位於右上角，3 秒後自動消失</li>
          </ul>
        </div>

        {/* 使用者確認區 */}
        <div className="mt-8 border-2 md:border-3 border-black bg-green-50 p-6 shadow-neo">
          <h3 className="text-lg font-bold mb-3">確認進入下一階段</h3>
          <p className="text-sm text-gray-800 mb-4">
            若您確認所有對話框設計風格無誤，請明確同意進入後續實作階段（遷移 72 個原生對話框）。
          </p>
          <p className="text-xs text-gray-600">
            註：此樣本頁面僅供設計確認，不會儲存任何資料。
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * 按鈕元件（Neo-Brutalism 風格）
 */
function Button({
  onClick,
  variant,
  children,
}: {
  onClick: () => void
  variant: 'success' | 'error' | 'warning' | 'info' | 'default'
  children: React.ReactNode
}) {
  const variantStyles = {
    success: 'bg-green-400 hover:bg-green-500',
    error: 'bg-red-400 hover:bg-red-500',
    warning: 'bg-yellow-400 hover:bg-yellow-500',
    info: 'bg-blue-400 hover:bg-blue-500',
    default: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full px-4 py-2
        border-2 md:border-3 border-black
        ${variantStyles[variant]}
        ${variant === 'default' ? 'text-gray-800' : 'text-white'}
        font-bold text-sm uppercase
        shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
        transition-all duration-150
        hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
        focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2
      `}
    >
      {children}
    </button>
  )
}
