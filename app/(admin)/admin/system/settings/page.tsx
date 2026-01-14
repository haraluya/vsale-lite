/**
 * 系統設定頁面（Tab 分頁版）
 * Feature: 系統設定重構
 */

import { getSettings } from '@/lib/actions/system'
import { checkAuth } from '@/lib/actions/helpers'
import { SystemSettingsTabs } from '@/components/admin/SystemSettingsTabs'
import { updateSetting, uploadLogo, deleteLogo } from '@/lib/actions/system'
import { revalidatePath } from 'next/cache'

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
      <div className="rounded-none border-2 md:border-3 border-red-500 bg-red-50 p-6 shadow-neo">
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
  const logoUrl = logoSetting ? (logoSetting.value as string) : null

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
      <SystemSettingsTabs
        generalSettings={generalSettings}
        brandingSettings={brandingSettings}
        clientNotificationSettings={clientNotificationSettings}
        logoUrl={logoUrl}
        updateAction={handleUpdateSetting}
        uploadAction={handleUploadLogo}
        deleteAction={handleDeleteLogo}
      />
    </div>
  )
}
