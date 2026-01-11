'use client'

import { Tabs } from '@/components/ui/tabs'
import { Settings, Image as ImageIcon, Bell, Database } from 'lucide-react'
import { ParsedSetting } from '@/types'
import { SystemSettingsForm } from '@/components/admin/SystemSettingsForm'
import { ClientNotificationSettings } from '@/components/admin/ClientNotificationSettings'
import { LogoUploader } from '@/components/admin/LogoUploader'
import { BackupManager } from '@/components/admin/BackupManager'
import { BackupStatus } from '@/components/admin/BackupStatus'
import { StorageFolderGuide } from '@/components/admin/StorageFolderGuide'

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
    { id: 'branding', label: '品牌設定', icon: ImageIcon },
    { id: 'notifications', label: '客戶通知', icon: Bell },
    { id: 'system', label: '備份管理', icon: Database },
  ]

  return (
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
                  updateAction={updateAction}
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
                {logoUrl && (
                  <div className="max-w-md">
                    <LogoUploader
                      logoType="logo"
                      currentUrl={logoUrl}
                      uploadAction={uploadAction}
                      deleteAction={deleteAction}
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
                    updateAction={updateAction}
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
