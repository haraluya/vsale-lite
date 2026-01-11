/**
 * 系統設定頁面（Tab 分頁版）
 * Feature: 系統設定重構
 */

import { getSettings } from '@/lib/actions/system'
import { checkAuth } from '@/lib/actions/helpers'
import { SystemSettingsForm } from '@/components/admin/SystemSettingsForm'
import { ClientNotificationSettings } from '@/components/admin/ClientNotificationSettings'
import { LogoUploader } from '@/components/admin/LogoUploader'
import { BackupManager } from '@/components/admin/BackupManager'
import { BackupStatus } from '@/components/admin/BackupStatus'
import { StorageFolderGuide } from '@/components/admin/StorageFolderGuide'
import { Tabs } from '@/components/ui/tabs'
import { updateSetting, uploadLogo, deleteLogo } from '@/lib/actions/system'
import { revalidatePath } from 'next/cache'
import { Settings, Image as ImageIcon, Bell, Database } from 'lucide-react'

import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('系統設定', '管理系統設定、Logo 與網站參數')
}

export default async function SystemSettingsPage() {
  // 權限檢查
  await checkAuth('admin')

  // 查詢所有設定
  const result = await getSettings()

  if (!result.success || !result.data) {
    return (
      <div className="rounded-none border-3 border-red-500 bg-red-50 p-6 shadow-neo">
        <p className="text-sm font-bold text-red-800">
          {result.message || '載入設定失敗'}
        </p>
      </div>
    )
  }

  const settings = result.data

  // 依分類過濾設定
  const generalSettings = settings.filter((s) => s.category === 'general')
  const brandingSettings = settings.filter((s) => s.category === 'branding')
  const clientNotificationSettings = settings.filter(
    (s) => s.category === 'client_notifications'
  )
  const systemSettings = settings.filter((s) => s.category === 'system')

  // Logo 設定
  const logoSetting = brandingSettings.find((s) => s.key === 'logo_url')

  // Server Actions
  async function handleUpdateSetting(formData: FormData) {
    'use server'
    const key = formData.get('key') as string
    const value = formData.get('value') as string
    const valueType = formData.get('valueType') as string

    let parsedValue: string | number | boolean
    if (valueType === 'number') {
      parsedValue = parseFloat(value)
    } else if (valueType === 'boolean') {
      parsedValue = value === 'true'
    } else {
      parsedValue = value
    }

    const result = await updateSetting({ key, value: parsedValue })
    if (result.success) {
      revalidatePath('/admin/system/settings')
    } else {
      throw new Error(result.message)
    }
  }

  async function handleUploadLogo(formData: FormData) {
    'use server'
    const logoType = formData.get('logoType') as 'logo' | 'logo-icon' | 'favicon'
    const file = formData.get('file') as File

    const result = await uploadLogo({ logoType, file })
    if (result.success) {
      revalidatePath('/admin/system/settings')
    } else {
      throw new Error(result.message)
    }
  }

  async function handleDeleteLogo(formData: FormData) {
    'use server'
    const logoType = formData.get('logoType') as 'logo' | 'logo-icon' | 'favicon'

    const result = await deleteLogo(logoType)
    if (result.success) {
      revalidatePath('/admin/system/settings')
    } else {
      throw new Error(result.message)
    }
  }

  const tabs = [
    { id: 'general', label: '一般設定', icon: Settings },
    { id: 'branding', label: '品牌設定', icon: ImageIcon },
    { id: 'notifications', label: '客戶通知', icon: Bell },
    { id: 'system', label: '備份管理', icon: Database },
  ]

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div>
        <h1 className="text-3xl font-black">系統設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          管理網站標題、Logo、客戶通知範本與系統參數
        </p>
      </div>

      {/* Tab 分頁 */}
      <Tabs tabs={tabs} defaultTab="general">
        {(activeTab) => {
          // 一般設定
          if (activeTab === 'general') {
            return (
              <div>
                <h2 className="text-xl font-black mb-4">一般設定</h2>
                {generalSettings.length > 0 ? (
                  <SystemSettingsForm
                    settings={generalSettings}
                    updateAction={handleUpdateSetting}
                  />
                ) : (
                  <p className="text-sm text-gray-500">目前無一般設定項目</p>
                )}
              </div>
            )
          }

          // 品牌設定
          if (activeTab === 'branding') {
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black mb-4">Logo 管理</h2>
                  <p className="mb-4 text-sm text-gray-600">
                    上傳的 Logo 會顯示在左上角（建議尺寸：200 × 60 像素）
                  </p>
                  {logoSetting && (
                    <div className="max-w-md">
                      <LogoUploader
                        logoType="logo"
                        currentUrl={logoSetting.value as string}
                        uploadAction={handleUploadLogo}
                        deleteAction={handleDeleteLogo}
                      />
                    </div>
                  )}
                </div>

                {/* 其他品牌設定 */}
                {brandingSettings.filter((s) => s.key !== 'logo_url').length >
                  0 && (
                  <div>
                    <h2 className="text-xl font-black mb-4">其他品牌設定</h2>
                    <SystemSettingsForm
                      settings={brandingSettings.filter(
                        (s) => s.key !== 'logo_url'
                      )}
                      updateAction={handleUpdateSetting}
                    />
                  </div>
                )}
              </div>
            )
          }

          // 客戶通知設定
          if (activeTab === 'notifications') {
            return (
              <div>
                <h2 className="text-xl font-black mb-4">客戶通知設定</h2>
                <p className="mb-4 text-sm text-gray-600">
                  管理客戶登入資訊範本與通知訊息格式
                </p>
                <ClientNotificationSettings
                  settings={clientNotificationSettings}
                  updateAction={handleUpdateSetting}
                />
              </div>
            )
          }

          // 備份管理
          if (activeTab === 'system') {
            return (
              <div>
                <h2 className="text-xl font-black mb-4">備份管理</h2>
                <p className="mb-4 text-sm text-gray-600">
                  管理資料庫備份、下載與還原資料
                </p>

                {/* 備份狀態 */}
                <div className="mb-6">
                  <BackupStatus />
                </div>

                {/* 備份列表 */}
                <BackupManager />

                {/* 圖片資料夾指引 */}
                <div className="mt-6">
                  <StorageFolderGuide />
                </div>
              </div>
            )
          }

          return null
        }}
      </Tabs>
    </div>
  )
}
