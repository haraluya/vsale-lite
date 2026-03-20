'use client'

import { useState, useEffect } from 'react'
import type { NotificationTemplate } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAlert, useConfirm, usePrompt } from '@/lib/contexts/dialog-context'
import {
  getNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  setDefaultTemplate,
} from '@/lib/actions/notification-templates'
import { getSetting } from '@/lib/actions/system'
import { Pencil, Trash2, Star, Plus } from 'lucide-react'

export function ClientNotificationSettings() {
  const alert = useAlert()
  const confirm = useConfirm()
  const prompt = usePrompt()

  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  )
  const [editingTemplate, setEditingTemplate] = useState<string>('')
  const [isChanged, setIsChanged] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [companyName, setCompanyName] = useState('您的公司名稱')

  // 載入範本列表
  const loadTemplates = async () => {
    setPageLoading(true)
    const result = await getNotificationTemplates()
    if (result.success && result.data) {
      setTemplates(result.data)
      // 預設選擇預設範本
      const defaultTemplate = result.data.find((t) => t.is_default)
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id)
        setEditingTemplate(defaultTemplate.template)
      }
    }
    setPageLoading(false)
  }

  // 載入公司名稱
  useEffect(() => {
    const loadSettings = async () => {
      const companyNameResult = await getSetting('company_name')
      if (companyNameResult.success && companyNameResult.data) {
        setCompanyName(companyNameResult.data)
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [])

  // 選擇範本
  const handleSelectTemplate = (template: NotificationTemplate) => {
    if (isChanged) {
      confirm({
        title: '確認切換',
        description: '目前範本有未儲存的變更，確定要切換嗎？',
        variant: 'warning',
      }).then((confirmed) => {
        if (confirmed) {
          setSelectedTemplateId(template.id)
          setEditingTemplate(template.template)
          setIsChanged(false)
        }
      })
    } else {
      setSelectedTemplateId(template.id)
      setEditingTemplate(template.template)
    }
  }

  // 新增範本
  const handleCreateTemplate = async () => {
    const result = await prompt({
      title: '新增範本',
      fields: [
        {
          name: 'name',
          label: '範本名稱',
          placeholder: '請輸入範本名稱（例如：批發專用）',
          required: true,
        }
      ]
    })

    if (!result) return
    const name = result.name

    setLoading(true)
    const apiResult = await createNotificationTemplate({
      name,
      template: '【{公司名稱} - 登入資訊】\n\n客戶名稱: {客戶名稱}\n前台網址: {前台網址}\n登入電話: {登入電話}\n登入密碼: {登入密碼}',
      is_default: false,
    })
    setLoading(false)

    if (apiResult.success) {
      await alert({
        title: '建立成功',
        message: `範本「${name}」已建立`,
        variant: 'success',
      })
      loadTemplates()
    } else {
      await alert({
        title: '建立失敗',
        message: apiResult.message,
        variant: 'error',
      })
    }
  }

  // 重新命名範本
  const handleRenameTemplate = async (template: NotificationTemplate) => {
    const result = await prompt({
      title: '重新命名範本',
      fields: [
        {
          name: 'name',
          label: '新名稱',
          placeholder: '請輸入新名稱',
          defaultValue: template.name,
          required: true,
        }
      ]
    })

    if (!result) return
    const newName = result.name
    if (newName === template.name) return

    setLoading(true)
    const apiResult = await updateNotificationTemplate({
      id: template.id,
      name: newName,
    })
    setLoading(false)

    if (apiResult.success) {
      await alert({
        title: '重新命名成功',
        message: `範本已重新命名為「${newName}」`,
        variant: 'success',
      })
      loadTemplates()
    } else {
      await alert({
        title: '重新命名失敗',
        message: apiResult.message,
        variant: 'error',
      })
    }
  }

  // 刪除範本
  const handleDeleteTemplate = async (template: NotificationTemplate) => {
    if (template.is_default) {
      await alert({
        title: '無法刪除',
        message: '無法刪除預設範本',
        variant: 'warning',
      })
      return
    }

    const confirmed = await confirm({
      title: '確認刪除',
      description: `確定要刪除範本「${template.name}」嗎？此操作無法復原。`,
      variant: 'danger',
    })

    if (!confirmed) return

    setLoading(true)
    const result = await deleteNotificationTemplate(template.id)
    setLoading(false)

    if (result.success) {
      await alert({
        title: '刪除成功',
        message: `範本「${template.name}」已刪除`,
        variant: 'success',
      })
      loadTemplates()
    } else {
      await alert({
        title: '刪除失敗',
        message: result.message,
        variant: 'error',
      })
    }
  }

  // 設定預設範本
  const handleSetDefault = async (template: NotificationTemplate) => {
    if (template.is_default) return

    setLoading(true)
    const result = await setDefaultTemplate(template.id)
    setLoading(false)

    if (result.success) {
      await alert({
        title: '設定成功',
        message: `已將「${template.name}」設為預設範本`,
        variant: 'success',
      })
      loadTemplates()
    } else {
      await alert({
        title: '設定失敗',
        message: result.message,
        variant: 'error',
      })
    }
  }

  // 儲存範本內容
  const handleSave = async () => {
    if (!selectedTemplateId) return

    setLoading(true)
    const result = await updateNotificationTemplate({
      id: selectedTemplateId,
      template: editingTemplate,
    })
    setLoading(false)

    if (result.success) {
      setIsChanged(false)
      await alert({
        title: '儲存成功',
        message: '範本內容已更新',
        variant: 'success',
      })
      loadTemplates()
    } else {
      await alert({
        title: '儲存失敗',
        message: result.message,
        variant: 'error',
      })
    }
  }

  // 重設變更
  const handleReset = () => {
    const template = templates.find((t) => t.id === selectedTemplateId)
    if (template) {
      setEditingTemplate(template.template)
      setIsChanged(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="rounded-theme-sm border-theme bg-surface p-6 shadow-neo-sm">
        <p className="text-sm text-text-secondary">載入中...</p>
      </div>
    )
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  return (
    <div className="space-y-6">
      {/* 範本列表 */}
      <div className="rounded-theme-sm border-theme bg-surface p-4 md:p-6 shadow-neo-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black">範本管理</h3>
            <p className="text-sm text-text-secondary mt-1">
              建立多個自訂範本，在複製登入資訊時選擇使用
            </p>
          </div>
          <Button
            onClick={handleCreateTemplate}
            disabled={loading}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新增範本
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`
                rounded-theme-sm border p-4 cursor-pointer transition-all
                ${selectedTemplateId === template.id
                  ? 'bg-yellow-50 shadow-neo-sm'
                  : 'border-border bg-surface hover:border-border'
                }
              `}
              onClick={() => handleSelectTemplate(template)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm truncate">
                      {template.name}
                    </h4>
                    {template.is_default && (
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {new Date(template.created_at).toLocaleDateString('zh-TW')}
                  </p>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  {!template.is_default && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSetDefault(template)
                      }}
                      className="p-1 hover:bg-surface-secondary rounded transition-colors"
                      title="設為預設"
                      disabled={loading}
                    >
                      <Star className="w-4 h-4 text-muted" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRenameTemplate(template)
                    }}
                    className="p-1 hover:bg-surface-secondary rounded transition-colors"
                    title="重新命名"
                    disabled={loading}
                  >
                    <Pencil className="w-4 h-4 text-text-secondary" />
                  </button>
                  {!template.is_default && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTemplate(template)
                      }}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                      title="刪除"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 範本編輯器 */}
      {selectedTemplate && (
        <div className="rounded-theme-sm border-theme bg-surface p-4 md:p-6 shadow-neo-sm">
          <Label htmlFor="template" className="text-lg font-black mb-2 block">
            編輯範本：{selectedTemplate.name}
          </Label>
          <p className="text-sm text-text-secondary mb-4">
            支援以下變數（將自動替換為實際值）：
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <code className="px-2 py-1 bg-surface-secondary rounded border border-border text-xs md:text-sm">
              {'{公司名稱}'}
            </code>
            <code className="px-2 py-1 bg-surface-secondary rounded border border-border text-xs md:text-sm">
              {'{客戶名稱}'}
            </code>
            <code className="px-2 py-1 bg-surface-secondary rounded border border-border text-xs md:text-sm">
              {'{前台網址}'}
            </code>
            <code className="px-2 py-1 bg-surface-secondary rounded border border-border text-xs md:text-sm">
              {'{登入電話}'}
            </code>
            <code className="px-2 py-1 bg-surface-secondary rounded border border-border text-xs md:text-sm">
              {'{登入密碼}'}
            </code>
          </div>

          <textarea
            id="template"
            value={editingTemplate}
            onChange={(e) => {
              setEditingTemplate(e.target.value)
              setIsChanged(e.target.value !== selectedTemplate.template)
            }}
            rows={10}
            className="w-full rounded-theme-sm border px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
            disabled={loading}
          />

          {isChanged && (
            <p className="mt-2 text-sm text-blue-600 font-bold">
              ⚠️ 範本已修改，請記得儲存
            </p>
          )}
        </div>
      )}

      {/* 預覽區塊 */}
      {selectedTemplate && (
        <div className="rounded-theme-sm border-theme border-border bg-surface-secondary p-4 md:p-6">
          <h3 className="text-lg font-black mb-3">範本預覽</h3>
          <p className="text-xs text-muted mb-3">
            以下是範本套用變數後的預覽效果
          </p>
          <div className="bg-surface border border-border p-4 font-mono text-sm whitespace-pre-wrap break-words">
            {editingTemplate
              .replace(/\{公司名稱\}/g, companyName)
              .replace(/\{客戶名稱\}/g, '王小明')
              .replace(/\{前台網址\}/g, 'https://example.com/login')
              .replace(/\{登入電話\}/g, '0912345678')
              .replace(/\{登入密碼\}/g, 'ABC123')}
          </div>
        </div>
      )}

      {/* 儲存按鈕 */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t">
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
