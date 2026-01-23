'use client'

import { useState } from 'react'
import { ParsedSetting } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAlert } from '@/lib/contexts/dialog-context'

interface ClientNotificationSettingsProps {
  settings: ParsedSetting[]
  updateAction: (formData: FormData) => Promise<void>
}

export function ClientNotificationSettings({
  settings,
  updateAction,
}: ClientNotificationSettingsProps) {
  const alert = useAlert()
  const loginTemplateSetting = settings.find(
    (s) => s.key === 'client_login_info_template'
  )

  const [template, setTemplate] = useState(
    (loginTemplateSetting?.value as string) || ''
  )
  const [loading, setLoading] = useState(false)
  const [isChanged, setIsChanged] = useState(false)

  const handleSave = async () => {
    if (!loginTemplateSetting) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('key', 'client_login_info_template')
      formData.append('value', template)
      formData.append('valueType', 'text')

      await updateAction(formData)
      setIsChanged(false)

      await alert({
        title: '儲存成功',
        message: '客戶登入資訊範本已更新',
        variant: 'success',
      })
    } catch (error) {
      console.error('儲存範本失敗:', error)
      await alert({
        title: '儲存失敗',
        message: error instanceof Error ? error.message : '發生未知錯誤',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (value: string) => {
    setTemplate(value)
    setIsChanged(value !== loginTemplateSetting?.value)
  }

  const handleReset = () => {
    setTemplate((loginTemplateSetting?.value as string) || '')
    setIsChanged(false)
  }

  return (
    <div className="space-y-6">
      {/* 範本編輯器 */}
      <div className="rounded-none border-2 md:border-3 border-black bg-white p-4 md:p-6 shadow-neo-sm md:shadow-neo">
        <Label htmlFor="template" className="text-lg font-black mb-2 block">
          客戶登入資訊範本
        </Label>
        <p className="text-sm text-gray-600 mb-4">
          此範本將在建立新客戶時自動產生登入資訊。支援以下變數：
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <code className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs md:text-sm">
            {'{客戶名稱}'}
          </code>
          <code className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs md:text-sm">
            {'{前台網址}'}
          </code>
          <code className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs md:text-sm">
            {'{登入電話}'}
          </code>
          <code className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs md:text-sm">
            {'{登入密碼}'}
          </code>
        </div>

        <textarea
          id="template"
          value={template}
          onChange={(e) => handleChange(e.target.value)}
          rows={10}
          className="w-full rounded-none border-2 border-black px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
          disabled={loading}
        />

        {isChanged && (
          <p className="mt-2 text-sm text-blue-600 font-bold">
            ⚠️ 範本已修改,請記得儲存
          </p>
        )}
      </div>

      {/* 預覽區塊 */}
      <div className="rounded-none border-2 md:border-3 border-gray-300 bg-gray-50 p-4 md:p-6">
        <h3 className="text-lg font-black mb-3">範本預覽</h3>
        <p className="text-xs text-gray-500 mb-3">
          以下是範本套用變數後的預覽效果
        </p>
        <div className="bg-white border-2 border-gray-400 p-4 font-mono text-sm whitespace-pre-wrap break-words">
          {template
            .replace(/\{客戶名稱\}/g, '王小明')
            .replace(/\{前台網址\}/g, 'https://example.com')
            .replace(/\{登入電話\}/g, '0912345678')
            .replace(/\{登入密碼\}/g, 'ABC123')}
        </div>
      </div>

      {/* 儲存按鈕 */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t-2 md:border-t-3 border-black">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={!isChanged || loading}
          className="w-full sm:w-auto"
        >
          取消變更
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!isChanged || loading}
          className="w-full sm:w-auto"
        >
          {loading ? '儲存中...' : '儲存範本'}
        </Button>
      </div>
    </div>
  )
}
