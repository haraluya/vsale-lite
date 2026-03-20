/**
 * Announcements Management Page (廣告管理列表頁)
 * Feature: 007-system-enhancement (US4 - 廣告輪播系統) + 016-home-page-blocks (US8 - Tab 整合)
 *
 * 後台廣告管理頁面
 * - Tab 切換：商品頁廣告 vs 首頁廣告
 * - 商品頁廣告：列表顯示所有廣告，CRUD 操作
 * - 首頁廣告：首頁廣告區塊管理
 */

import { getAllAnnouncements } from '@/lib/actions/announcements'
import { AnnouncementListClient } from '@/components/admin/announcements/AnnouncementListClient'
import { TabSwitcher } from '@/components/admin/announcements/TabSwitcher'
import { HomeBlockList } from '@/components/admin/home-blocks/HomeBlockList'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('廣告管理', '管理前台廣告內容')
}

// 強制動態渲染，避免預渲染時 workUnitAsyncStorage 未初始化錯誤
export const dynamic = 'force-dynamic'

interface AnnouncementsPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AnnouncementsPage({ searchParams }: AnnouncementsPageProps) {
  const resolvedParams = await searchParams
  const tab = (resolvedParams?.tab as string) || 'home'

  // 僅在 products tab 時載入商品頁廣告
  let announcements: Array<any> = []
  if (tab === 'products') {
    const result = await getAllAnnouncements()
    announcements = result.success ? (result.data || []) : []
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">廣告管理</h1>
        <p className="mt-2 text-text-secondary">管理前台廣告內容</p>
      </div>

      {/* Tab 切換器 */}
      <TabSwitcher />

      {/* 首頁廣告 */}
      {tab === 'home' && (
        <>
          <div>
            <h2 className="text-2xl font-bold">首頁廣告</h2>
            <p className="mt-1 text-text-secondary">首頁上的廣告區塊（圖片輪播、商品展示、文字區塊）</p>
          </div>
          <HomeBlockList />
        </>
      )}

      {/* 商品頁廣告 */}
      {tab === 'products' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">商品頁廣告</h2>
              <p className="mt-1 text-text-secondary">商品頁面上方的輪播廣告</p>
            </div>
            <Link
              href="/admin/announcements/new"
              className="inline-flex items-center gap-2 rounded-theme-sm border-theme bg-green-400 dark:bg-green-600 px-6 py-3 font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
            >
              <Plus className="h-5 w-5" />
              新增廣告
            </Link>
          </div>

          {/* Announcements List */}
          {announcements.length === 0 ? (
            <div className="rounded-theme-sm border-theme bg-surface p-12 text-center shadow-neo">
              <p className="text-lg text-text-secondary">目前沒有任何廣告</p>
              <Link
                href="/admin/announcements/new"
                className="mt-4 inline-flex items-center gap-2 rounded-theme-sm border bg-green-400 dark:bg-green-600 px-4 py-2 font-bold transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
              >
                <Plus className="h-4 w-4" />
                新增第一個廣告
              </Link>
            </div>
          ) : (
            <AnnouncementListClient announcements={announcements} />
          )}
        </>
      )}
    </div>
  )
}
