'use client'

import { useState, useEffect } from 'react'
import type { NotificationTemplate } from '@/types'
import { getNotificationTemplates } from '@/lib/actions/notification-templates'
import { useAlert } from '@/lib/contexts/dialog-context'

/**
 * 產生通知文字（替換變數）
 */
function generateNotificationText(input: {
  template: string
  companyName: string
  clientName: string
  loginUrl: string
  phone: string
  password: string
}): string {
  return input.template
    .replace(/\{公司名稱\}/g, input.companyName)
    .replace(/\{客戶名稱\}/g, input.clientName)
    .replace(/\{前台網址\}/g, input.loginUrl)
    .replace(/\{登入電話\}/g, input.phone)
    .replace(/\{登入密碼\}/g, input.password)
}

/**
 * 客戶通知範本選擇與複製 Hook
 * 用於快速開戶後或查看客戶時複製登入資訊
 */
export function useNotificationTemplate() {
  const alert = useAlert()
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  )
  const [loading, setLoading] = useState(true)

  // 載入範本列表
  useEffect(() => {
    async function loadTemplates() {
      setLoading(true)
      const result = await getNotificationTemplates()
      if (result.success && result.data) {
        setTemplates(result.data)
        // 預設選擇預設範本
        const defaultTemplate = result.data.find((t) => t.is_default)
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id)
        }
      }
      setLoading(false)
    }
    loadTemplates()
  }, [])

  // 複製到剪貼簿
  const copyToClipboard = async (input: {
    companyName: string
    clientName: string
    loginUrl: string
    phone: string
    password: string
  }) => {
    if (!selectedTemplateId) {
      await alert({
        title: '未選擇範本',
        message: '請先選擇一個範本',
        variant: 'warning',
      })
      return false
    }

    const template = templates.find((t) => t.id === selectedTemplateId)
    if (!template) {
      await alert({
        title: '範本不存在',
        message: '所選範本不存在',
        variant: 'error',
      })
      return false
    }

    // 產生通知文字
    const text = generateNotificationText({
      template: template.template,
      ...input,
    })

    // 複製到剪貼簿
    try {
      await navigator.clipboard.writeText(text)
      await alert({
        title: '複製成功',
        message: `已使用「${template.name}」範本複製登入資訊`,
        variant: 'success',
      })
      return true
    } catch (error) {
      console.error('複製失敗:', error)
      await alert({
        title: '複製失敗',
        message: '無法存取剪貼簿，請手動複製',
        variant: 'error',
      })
      return false
    }
  }

  // 預覽範本（替換變數）
  const previewTemplate = (input: {
    companyName: string
    clientName: string
    loginUrl: string
    phone: string
    password: string
  }): string => {
    if (!selectedTemplateId) return ''

    const template = templates.find((t) => t.id === selectedTemplateId)
    if (!template) return ''

    return generateNotificationText({
      template: template.template,
      ...input,
    })
  }

  return {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    loading,
    copyToClipboard,
    previewTemplate,
  }
}
