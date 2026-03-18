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
  /** 特定欄位的使用說明（選填）*/
  fieldHints?: Record<string, string>
}

export function SystemSettingsForm({ settings, updateAction, fieldHints }: SystemSettingsFormProps) {
  const [loading, setLoading] = useState(false)
  // 儲存當前的值（初始值 + 變更）
  const [values, setValues] = useState<Record<string, string | number | boolean | object>>(() => {
    const initialValues: Record<string, string | number | boolean | object> = {}
    settings.forEach((setting) => {
      initialValues[setting.key] = setting.value
    })
    return initialValues
  })

  // 記錄哪些欄位被修改過
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set())

  const handleChange = (key: string, value: string | number | boolean | object) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setChangedKeys((prev) => new Set(prev).add(key))
  }

  const handleCancel = () => {
    // 重置為原始值
    const resetValues: Record<string, string | number | boolean | object> = {}
    settings.forEach((setting) => {
      resetValues[setting.key] = setting.value
    })
    setValues(resetValues)
    setChangedKeys(new Set())
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // 只更新有變更的設定
      for (const key of changedKeys) {
        const setting = settings.find((s) => s.key === key)
        if (!setting) continue

        const formData = new FormData()
        formData.append('key', key)

        // 根據型別轉換值
        const value = values[key]
        if (typeof value === 'object') {
          formData.append('value', JSON.stringify(value))
        } else {
          formData.append('value', String(value))
        }

        formData.append('valueType', setting.value_type)
        await updateAction(formData)
      }
      // 清空變更記錄
      setChangedKeys(new Set())
    } catch (error) {
      console.error('儲存設定失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasChanges = changedKeys.size > 0

  return (
    <div className="space-y-4">
      {settings.map((setting) => {
        const currentValue = values[setting.key]
        const isChanged = changedKeys.has(setting.key)

        return (
          <div
            key={setting.key}
            className={`rounded-theme-sm border-theme bg-surface p-4 shadow-neo-sm ${
              isChanged ? 'border-blue-500' : 'border-border'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-bold text-text-secondary mb-1">
                  {setting.description || setting.key}
                  {isChanged && <span className="ml-2 text-xs text-blue-600">(已修改)</span>}
                </label>
                <p className="text-xs text-text-secondary mb-2">{setting.key}</p>
                {fieldHints?.[setting.key] && (
                  <p className="text-xs text-blue-600 mb-2 bg-info-bg p-2 rounded border border-blue-200">
                    💡 {fieldHints[setting.key]}
                  </p>
                )}

                {/* 根據型別顯示不同的輸入框 */}
                {setting.value_type === 'boolean' && (
                  <input
                    type="checkbox"
                    checked={currentValue as boolean}
                    className="h-5 w-5 rounded border"
                    onChange={(e) => handleChange(setting.key, e.target.checked)}
                    disabled={loading}
                  />
                )}

                {setting.value_type === 'number' && (
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={currentValue as number}
                    className="w-full rounded-theme-sm border px-3 py-2 font-bold"
                    onChange={(e) => handleChange(setting.key, parseFloat(e.target.value) || 0)}
                    disabled={loading}
                  />
                )}

                {setting.value_type === 'text' && (
                  <input
                    type="text"
                    value={currentValue as string}
                    className="w-full rounded-theme-sm border px-3 py-2 font-bold"
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    disabled={loading}
                  />
                )}

                {setting.value_type === 'json' && (
                  <textarea
                    value={
                      typeof currentValue === 'string'
                        ? currentValue
                        : JSON.stringify(currentValue, null, 2)
                    }
                    className="w-full rounded-theme-sm border px-3 py-2 font-mono text-sm"
                    rows={4}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        handleChange(setting.key, parsed)
                      } catch {
                        // JSON 格式錯誤時允許繼續編輯
                        handleChange(setting.key, e.target.value)
                      }
                    }}
                    disabled={loading}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* 儲存按鈕 */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={!hasChanges || loading}>
          取消變更
        </Button>
        <Button type="button" onClick={handleSave} disabled={!hasChanges || loading}>
          {loading ? '儲存中...' : `儲存設定 (${changedKeys.size})`}
        </Button>
      </div>
    </div>
  )
}
