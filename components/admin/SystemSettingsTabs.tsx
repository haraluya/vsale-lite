'use client'

import { Tabs } from '@/components/ui/tabs'
import { Settings, Bell, Database } from 'lucide-react'
import { ParsedSetting } from '@/types'
import { SystemSettingsForm } from '@/components/admin/SystemSettingsForm'
import { ClientNotificationSettings } from '@/components/admin/ClientNotificationSettings'
import { LogoUploader } from '@/components/admin/LogoUploader'
import { BackupManager } from '@/components/admin/BackupManager'
import { BackupStatus } from '@/components/admin/BackupStatus'
import { StorageFolderGuide } from '@/components/admin/StorageFolderGuide'
import { StockResetButton } from '@/components/admin/StockResetButton'

interface SystemSettingsTabsProps {
  generalSettings: ParsedSetting[]
  brandingSettings: ParsedSetting[]
  clientNotificationSettings: ParsedSetting[]
  logoUrl: string | null
  updateAction: (formData: FormData) => Promise<void>
  uploadAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
}

export function SystemSettingsTabs({
  generalSettings,
  brandingSettings,
  clientNotificationSettings,
  logoUrl,
  updateAction,
  uploadAction,
  deleteAction,
}: SystemSettingsTabsProps) {
  const tabs = [
    { id: 'general', label: '一般設定', icon: Settings },
    { id: 'notifications', label: '客戶通知', icon: Bell },
    { id: 'system', label: '備份管理', icon: Database },
  ]

  return (
    <Tabs tabs={tabs} defaultTab="general">
      {(activeTab) => {
        // 一般設定（整合品牌設定）
        if (activeTab === 'general') {
          // 取得品牌設定中的圖片設定
          const logoUrlSetting = brandingSettings.find((s) => s.key === 'logo_url')
          const logoIconUrlSetting = brandingSettings.find((s) => s.key === 'logo_icon_url')
          const faviconUrlSetting = brandingSettings.find((s) => s.key === 'favicon_url')

          // 其他非圖片的品牌設定（如 company_name, site_title）
          const textBrandingSettings = brandingSettings.filter(
            (s) => !['logo_url', 'logo_icon_url', 'favicon_url'].includes(s.key)
          )

          // 合併一般設定與文字品牌設定
          const allTextSettings = [...generalSettings, ...textBrandingSettings]

          return (
            <div className="space-y-6">
              {/* 基本設定 */}
              <div>
                <h2 className="text-xl font-black mb-4">基本設定</h2>
                {allTextSettings.length > 0 ? (
                  <SystemSettingsForm
                    settings={allTextSettings}
                    updateAction={updateAction}
                  />
                ) : (
                  <p className="text-sm text-gray-500">目前無設定項目</p>
                )}
              </div>

              {/* Logo 管理 */}
              {logoUrlSetting && (
                <div>
                  <h2 className="text-xl font-black mb-4">Logo 管理</h2>
                  <p className="mb-4 text-sm text-gray-600">
                    上傳的 Logo 會顯示在左上角（建議尺寸：200 × 60 像素）
                  </p>
                  <div className="max-w-md">
                    <LogoUploader
                      logoType="logo"
                      currentUrl={logoUrlSetting.value as string}
                      uploadAction={uploadAction}
                      deleteAction={deleteAction}
                    />
                  </div>
                </div>
              )}

              {/* 其他品牌圖片設定 */}
              {(logoIconUrlSetting || faviconUrlSetting) && (
                <div>
                  <h2 className="text-xl font-black mb-4">其他品牌圖片</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {faviconUrlSetting && (
                      <LogoUploader
                        logoType="favicon"
                        currentUrl={faviconUrlSetting.value as string}
                        uploadAction={uploadAction}
                        deleteAction={deleteAction}
                      />
                    )}
                    {logoIconUrlSetting && (
                      <LogoUploader
                        logoType="logo-icon"
                        currentUrl={logoIconUrlSetting.value as string}
                        uploadAction={uploadAction}
                        deleteAction={deleteAction}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* 庫存歸零功能 */}
              <div>
                <h2 className="text-xl font-black mb-4">系統操作</h2>
                <StockResetButton />
              </div>
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
                updateAction={updateAction}
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
  )
}
