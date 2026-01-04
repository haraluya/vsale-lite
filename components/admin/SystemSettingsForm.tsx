'use client'

/**
 * 系統設定表單元件（簡化版）
 * Feature: 008-system-admin (T058)
 */

import { useState } from 'react'
import { ParsedSetting } from '@/types'
import { Button } from '@/components/ui/button'

interface SystemSettingsFormProps {
  settings: ParsedSetting[]
  updateAction: (formData: FormData) => Promise<void>
}

export function SystemSettingsForm({ settings, updateAction }: SystemSettingsFormProps) {
  const [loading, setLoading] = useState(false)
  const [changes, setChanges] = useState<Record<string, { value: string | number | boolean; valueType: string }>>({})

  const handleChange = (key: string, value: string | number | boolean, valueType: string) => {
    setChanges((prev) => ({
      ...prev,
      [key]: { value, valueType },
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // 依序更新所有變更的設定
      for (const [key, { value, valueType }] of Object.entries(changes)) {
        const formData = new FormData()
        formData.append('key', key)
        formData.append('value', String(value))
        formData.append('valueType', valueType)
        await updateAction(formData)
      }
      // 清空變更記錄
      setChanges({})
    } catch (error) {
      console.error('儲存設定失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasChanges = Object.keys(changes).length > 0

  return (
    <div className="space-y-4">
      {settings.map((setting) => (
        <div
          key={setting.key}
          className="rounded-none border-3 border-black bg-white p-4 shadow-neo"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-1">
                {setting.description || setting.key}
              </label>
              <p className="text-xs text-gray-500 mb-2">{setting.key}</p>

              {/* 根據型別顯示不同的輸入框 */}
              {setting.value_type === 'boolean' && (
                <input
                  type="checkbox"
                  defaultChecked={
                    changes[setting.key]?.value !== undefined
                      ? (changes[setting.key].value as boolean)
                      : (setting.value as boolean)
                  }
                  className="h-5 w-5 rounded border-2 border-black"
                  onChange={(e) => handleChange(setting.key, e.target.checked, setting.value_type)}
                  disabled={loading}
                />
              )}

              {setting.value_type === 'number' && (
                <input
                  type="number"
                  defaultValue={
                    changes[setting.key]?.value !== undefined
                      ? (changes[setting.key].value as number)
                      : (setting.value as number)
                  }
                  className="w-full rounded-none border-2 border-black px-3 py-2 font-bold"
                  onChange={(e) => handleChange(setting.key, parseFloat(e.target.value), setting.value_type)}
                  disabled={loading}
                />
              )}

              {setting.value_type === 'text' && (
                <input
                  type="text"
                  defaultValue={
                    changes[setting.key]?.value !== undefined
                      ? (changes[setting.key].value as string)
                      : (setting.value as string)
                  }
                  className="w-full rounded-none border-2 border-black px-3 py-2 font-bold"
                  onChange={(e) => handleChange(setting.key, e.target.value, setting.value_type)}
                  disabled={loading}
                />
              )}

              {setting.value_type === 'json' && (
                <textarea
                  defaultValue={
                    changes[setting.key]?.value !== undefined
                      ? JSON.stringify(changes[setting.key].value, null, 2)
                      : JSON.stringify(setting.value, null, 2)
                  }
                  className="w-full rounded-none border-2 border-black px-3 py-2 font-mono text-sm"
                  rows={4}
                  onChange={(e) => {
                    try {
                      handleChange(setting.key, JSON.parse(e.target.value), setting.value_type)
                    } catch {
                      // JSON 格式錯誤時不更新
                    }
                  }}
                  disabled={loading}
                />
              )}
            </div>
          </div>
        </div>
      ))}

      {/* 儲存按鈕 */}
      <div className="flex justify-end gap-4 pt-4 border-t-3 border-black">
        <Button type="button" variant="outline" onClick={() => setChanges({})} disabled={!hasChanges || loading}>
          取消變更
        </Button>
        <Button type="button" onClick={handleSave} disabled={!hasChanges || loading}>
          {loading ? '儲存中...' : `儲存設定 (${Object.keys(changes).length})`}
        </Button>
      </div>
    </div>
  )
}
