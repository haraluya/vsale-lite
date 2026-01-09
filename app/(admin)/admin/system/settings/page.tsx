/**
 * 系統設定頁面（簡化版）
 * Feature: 008-system-admin (T060)
 */

import { getSettings } from '@/lib/actions/system'
import { checkAuth } from '@/lib/actions/helpers'
import { SystemSettingsForm } from '@/components/admin/SystemSettingsForm'
import { LogoUploader } from '@/components/admin/LogoUploader'
import { BackupManager } from '@/components/admin/BackupManager'
import { BackupStatus } from '@/components/admin/BackupStatus'
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
      <div className="rounded-none border-3 border-red-500 bg-red-50 p-6 shadow-neo">
        <p className="text-sm font-bold text-red-800">
          {result.message || '載入設定失敗'}
        </p>
      </div>
    )
  }

  const settings = result.data

  // Logo 設定 - 只保留 logo_url
  const logoSetting = settings.find((s) => s.key === 'logo_url')

  // 一般設定 - 排除所有 Logo 相關設定
  const generalSettings = settings.filter(
    (s) => !s.key.includes('_url') || s.value_type !== 'image_url'
  )

  // Server Actions - 使用 bind 模式
  async function handleUpdateSetting(formData: FormData) {
    'use server'
    const key = formData.get('key') as string
    const value = formData.get('value') as string
    const valueType = formData.get('valueType') as string

    // 解析值
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
        <p className="mt-2 text-sm text-gray-600">管理網站標題、Logo 與系統參數</p>
      </div>

      {/* Logo 上傳區塊 */}
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

      {/* 一般設定 */}
      <div>
        <h2 className="text-xl font-black mb-4">一般設定</h2>
        <SystemSettingsForm settings={generalSettings} updateAction={handleUpdateSetting} />
      </div>

      {/* 備份管理 */}
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
      </div>
    </div>
  )
}
