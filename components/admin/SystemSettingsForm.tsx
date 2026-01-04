'use client'

/**
 * 系統設定表單元件（簡化版）
 * Feature: 008-system-admin (T058)
 */

import { useState } from 'react'
import { ParsedSetting } from '@/types'

interface SystemSettingsFormProps {
  settings: ParsedSetting[]
  updateAction: (formData: FormData) => Promise<void>
}

export function SystemSettingsForm({ settings, updateAction }: SystemSettingsFormProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubmit = async (key: string, value: string | number | boolean, valueType: string) => {
    setLoading(key)
    try {
      const formData = new FormData()
      formData.append('key', key)
      formData.append('value', String(value))
      formData.append('valueType', valueType)
      await updateAction(formData)
    } finally {
      setLoading(null)
    }
  }

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
                  defaultChecked={setting.value as boolean}
                  className="h-5 w-5 rounded border-2 border-black"
                  onChange={(e) => handleSubmit(setting.key, e.target.checked, setting.value_type)}
                  disabled={loading === setting.key}
                />
              )}

              {setting.value_type === 'number' && (
                <input
                  type="number"
                  defaultValue={setting.value as number}
                  className="w-full rounded-none border-2 border-black px-3 py-2 font-bold"
                  onBlur={(e) => handleSubmit(setting.key, parseFloat(e.target.value), setting.value_type)}
                  disabled={loading === setting.key}
                />
              )}

              {setting.value_type === 'text' && (
                <input
                  type="text"
                  defaultValue={setting.value as string}
                  className="w-full rounded-none border-2 border-black px-3 py-2 font-bold"
                  onBlur={(e) => handleSubmit(setting.key, e.target.value, setting.value_type)}
                  disabled={loading === setting.key}
                />
              )}

              {setting.value_type === 'json' && (
                <textarea
                  defaultValue={JSON.stringify(setting.value, null, 2)}
                  className="w-full rounded-none border-2 border-black px-3 py-2 font-mono text-sm"
                  rows={4}
                  onBlur={(e) => {
                    try {
                      handleSubmit(setting.key, JSON.parse(e.target.value), setting.value_type)
                    } catch {
                      alert('JSON 格式錯誤')
                    }
                  }}
                  disabled={loading === setting.key}
                />
              )}
            </div>

            {loading === setting.key && (
              <div className="ml-4 text-sm text-gray-500">更新中...</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
