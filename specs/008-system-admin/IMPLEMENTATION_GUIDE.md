# Feature 008 實作指引 - 剩餘任務完整程式碼

**當前進度**: Phase 1-3 已完成，Phase 4 部分完成（Server Actions + UI 元件已實作）
**本文件用途**: 提供 Phase 4-8 剩餘任務的完整程式碼範本與執行步驟

---

## ✅ 已完成任務總結

### Phase 1-2: 基礎建設（17 任務）
- ✅ Migration 檔案、型別定義、Validation Schemas
- ✅ 資料庫 Migration 執行成功
- ✅ 操作日誌核心函式 (`lib/actions/audit.ts`)
- ✅ 管理員 CRUD Server Actions (`lib/actions/admins.ts`)

### Phase 3: User Story 1（6 任務）
- ✅ 管理員帳號登入功能完整實作

### Phase 4: 部分完成（6/16 任務）
- ✅ T018-T023: Server Actions (createAdmin, getAdmins, updateAdmin, resetPassword, deleteAdmin)
- ✅ T024-T025: UI 元件 (AdminList.tsx, AdminForm.tsx)
- ⏳ T026-T033: 頁面與整合測試（待完成）

---

## 📋 Phase 4 剩餘任務 (T026-T033)

### T026: 管理員列表頁面

**檔案**: `app/(admin)/admin/system/admins/page.tsx`

```typescript
import { getAdmins, deleteAdmin, resetPassword } from '@/lib/actions/admins'
import { AdminList } from '@/components/admin/AdminList'
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { checkAuth } from '@/lib/actions/helpers'
import { redirect } from 'next/navigation'

export default async function AdminsPage({
  searchParams,
}: {
  searchParams: { search?: string; page?: string }
}) {
  // 權限檢查
  const { user } = await checkAuth('admin')

  // 查詢管理員列表
  const result = await getAdmins({
    search: searchParams.search,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    limit: 20,
  })

  if (!result.success || !result.data) {
    return <div>載入失敗</div>
  }

  const { admins, total } = result.data

  return (
    <div className="space-y-6">
      {/* 標題列 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">管理員帳號管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            共 {total} 個管理員帳號
          </p>
        </div>
        <Link href="/admin/system/admins/new">
          <Button className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            新增管理員
          </Button>
        </Link>
      </div>

      {/* 搜尋列 */}
      <form className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            name="search"
            placeholder="搜尋帳號或 Email"
            defaultValue={searchParams.search}
            className="w-full rounded-none border-3 border-black pl-10 pr-4 py-2 font-bold shadow-neo focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all"
          />
        </div>
        <Button type="submit">搜尋</Button>
      </form>

      {/* 管理員列表 */}
      <AdminList
        admins={admins}
        currentUserId={user.userId}
        onDelete={async (adminId, username) => {
          'use server'
          const result = await deleteAdmin({ admin_id: adminId })
          if (result.success) {
            redirect('/admin/system/admins')
          }
        }}
        onResetPassword={async (adminId, username) => {
          'use server'
          // 需要彈窗輸入新密碼，此處簡化處理
          redirect(`/admin/system/admins/${adminId}?action=reset-password`)
        }}
      />
    </div>
  )
}
```

---

### T027: 新增管理員頁面

**檔案**: `app/(admin)/admin/system/admins/new/page.tsx`

```typescript
import { createAdmin } from '@/lib/actions/admins'
import { AdminForm } from '@/components/admin/AdminForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ActionResult } from '@/types'

export default function NewAdminPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 返回按鈕 */}
      <Link
        href="/admin/system/admins"
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        返回管理員列表
      </Link>

      {/* 標題 */}
      <div className="rounded-none border-3 border-black bg-yellow-400 p-6 shadow-neo">
        <h1 className="text-2xl font-black">新增管理員</h1>
        <p className="mt-2 text-sm font-bold text-gray-700">
          建立新的管理員帳號
        </p>
      </div>

      {/* 表單 */}
      <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
        <AdminForm
          onSubmit={async (prevState, formData) => {
            'use server'
            const result = await createAdmin({
              username: formData.get('username') as string,
              email: formData.get('email') as string,
              password: formData.get('password') as string,
              display_name: (formData.get('display_name') as string) || null,
            })

            if (result.success) {
              redirect('/admin/system/admins')
            }

            return result
          }}
          submitLabel="建立管理員"
        />
      </div>
    </div>
  )
}
```

---

### T028: 編輯管理員頁面

**檔案**: `app/(admin)/admin/system/admins/[id]/page.tsx`

```typescript
import { getAdminById, updateAdmin, resetPassword } from '@/lib/actions/admins'
import { AdminForm } from '@/components/admin/AdminForm'
import { ArrowLeft, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { ActionResult } from '@/types'

export default async function EditAdminPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { action?: string }
}) {
  // 查詢管理員資料
  const result = await getAdminById(params.id)

  if (!result.success || !result.data) {
    notFound()
  }

  const admin = result.data
  const isResetPasswordMode = searchParams.action === 'reset-password'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 返回按鈕 */}
      <Link
        href="/admin/system/admins"
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        返回管理員列表
      </Link>

      {/* 標題 */}
      <div className="rounded-none border-3 border-black bg-yellow-400 p-6 shadow-neo">
        <h1 className="text-2xl font-black">編輯管理員</h1>
        <p className="mt-2 text-sm font-bold text-gray-700">
          帳號：{admin.username}
        </p>
      </div>

      {/* 重設密碼區塊 */}
      {isResetPasswordMode ? (
        <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
          <h2 className="text-xl font-black mb-4">重設密碼</h2>
          <form
            action={async (formData: FormData) => {
              'use server'
              const result = await resetPassword({
                admin_id: params.id,
                new_password: formData.get('new_password') as string,
              })
              if (result.success) {
                redirect('/admin/system/admins')
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-bold mb-2">新密碼</label>
              <input
                type="password"
                name="new_password"
                required
                className="w-full rounded-none border-3 border-black px-4 py-2 font-bold"
                placeholder="至少 8 字元，含大小寫字母+數字"
              />
            </div>
            <Button type="submit" className="w-full">
              確認重設
            </Button>
          </form>
        </div>
      ) : (
        <>
          {/* 編輯表單 */}
          <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
            <AdminForm
              admin={admin}
              onSubmit={async (prevState, formData) => {
                'use server'
                const result = await updateAdmin({
                  admin_id: params.id,
                  email: formData.get('email') as string,
                  display_name: (formData.get('display_name') as string) || null,
                })

                if (result.success) {
                  redirect('/admin/system/admins')
                }

                return result
              }}
              submitLabel="儲存變更"
            />
          </div>

          {/* 重設密碼按鈕 */}
          <Link
            href={`/admin/system/admins/${params.id}?action=reset-password`}
            className="inline-flex items-center gap-2 rounded-none border-2 border-black bg-orange-400 px-4 py-2 font-bold shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            <KeyRound className="h-4 w-4" />
            重設密碼
          </Link>
        </>
      )}
    </div>
  )
}
```

---

### T029-T033: 整合與測試

**T029**: 操作日誌已在 Server Actions 中自動整合（`logAudit` 呼叫）

**T030-T033**: 測試步驟

1. **啟動開發伺服器**: `pnpm dev`
2. **登入後台**: 訪問 http://localhost:3000/admin/login，使用帳號 `admin` / 密碼 `password123`
3. **測試建立管理員**:
   - 訪問 `/admin/system/admins/new`
   - 輸入帳號 `testadmin`、Email `test@example.com`、密碼 `Test123456`
   - 驗證建立成功
4. **測試編輯管理員**:
   - 點擊「編輯」按鈕
   - 修改暱稱與 Email
   - 驗證儲存成功
5. **測試重設密碼**:
   - 點擊「重設密碼」按鈕
   - 輸入新密碼 `NewPass123`
   - 驗證重設成功
6. **測試刪除管理員**:
   - 點擊「刪除」按鈕（非當前帳號）
   - 驗證刪除成功
   - 驗證無法刪除自己

---

## 📋 Phase 5: User Story 3 - 操作日誌系統 (T034-T050)

### T034-T036: Server Actions（已部分完成於 audit.ts）

✅ 已完成：
- `getAuditLogs()`: 查詢操作日誌列表
- `getAuditLogsByTarget()`: 查詢特定實體操作歷史
- `getAuditLogStats()`: 查詢操作日誌統計

---

### T037-T039: UI 元件

#### T037: 操作日誌列表元件

**檔案**: `components/admin/AuditLogList.tsx`

```typescript
'use client'

import { AuditLog } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { ActionTypeBadge } from './ActionTypeBadge'

interface AuditLogListProps {
  logs: AuditLog[]
}

export function AuditLogList({ logs }: AuditLogListProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-none border-3 border-gray-300 bg-gray-50 p-12 text-center">
        <p className="text-lg font-bold text-gray-500">尚無操作記錄</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="rounded-none border-3 border-black bg-white p-4 shadow-neo hover:shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <ActionTypeBadge actionType={log.action_type} />
                <span className="text-sm font-bold text-gray-700">
                  {log.target_type}
                </span>
                <span className="text-sm text-gray-500">#{log.target_id.slice(0, 8)}</span>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-bold">{log.actor_display_name || '未知'}</span>
                  {' '}執行操作
                </p>

                {log.old_values && log.new_values && (
                  <div className="text-xs bg-gray-50 p-2 rounded border border-gray-200 mt-2">
                    <p className="font-bold mb-1">變更內容：</p>
                    {Object.keys(log.new_values).map((key) => (
                      <p key={key}>
                        {key}: {JSON.stringify(log.old_values?.[key])} → {JSON.stringify(log.new_values[key])}
                      </p>
                    ))}
                  </div>
                )}

                {log.notes && (
                  <p className="text-xs text-gray-500 italic">備註：{log.notes}</p>
                )}
              </div>
            </div>

            <div className="text-right text-xs text-gray-500">
              {formatDistanceToNow(new Date(log.created_at), {
                addSuffix: true,
                locale: zhTW,
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

#### T038: 操作日誌篩選器元件

**檔案**: `components/admin/AuditLogFilters.tsx`

```typescript
'use client'

import { AuditActionType } from '@/types'
import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'

interface AuditLogFiltersProps {
  currentFilters: {
    action_type?: AuditActionType
    date_from?: string
    date_to?: string
  }
}

export function AuditLogFilters({ currentFilters }: AuditLogFiltersProps) {
  return (
    <form className="rounded-none border-3 border-black bg-white p-4 shadow-neo space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5" />
        <h3 className="font-black text-lg">篩選條件</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 操作類型篩選 */}
        <div>
          <label className="block text-sm font-bold mb-2">操作類型</label>
          <select
            name="action_type"
            defaultValue={currentFilters.action_type || ''}
            className="w-full rounded-none border-2 border-black px-3 py-2 font-bold"
          >
            <option value="">全部</option>
            <option value="created">建立</option>
            <option value="updated">更新</option>
            <option value="deleted">刪除</option>
            <option value="stock_adjusted">庫存調整</option>
            <option value="comment_added">留言</option>
          </select>
        </div>

        {/* 起始日期 */}
        <div>
          <label className="block text-sm font-bold mb-2">起始日期</label>
          <input
            type="date"
            name="date_from"
            defaultValue={currentFilters.date_from}
            className="w-full rounded-none border-2 border-black px-3 py-2 font-bold"
          />
        </div>

        {/* 結束日期 */}
        <div>
          <label className="block text-sm font-bold mb-2">結束日期</label>
          <input
            type="date"
            name="date_to"
            defaultValue={currentFilters.date_to}
            className="w-full rounded-none border-2 border-black px-3 py-2 font-bold"
          />
        </div>
      </div>

      <Button type="submit" className="w-full">
        套用篩選
      </Button>
    </form>
  )
}
```

#### T039: 操作類型顏色編碼 Badge 元件

**檔案**: `components/admin/ActionTypeBadge.tsx`

```typescript
import { AuditActionType } from '@/types'

const ACTION_TYPE_CONFIG: Record<
  AuditActionType,
  { label: string; color: string }
> = {
  created: { label: '建立', color: 'bg-green-400 border-green-600 text-green-900' },
  updated: { label: '更新', color: 'bg-blue-400 border-blue-600 text-blue-900' },
  deleted: { label: '刪除', color: 'bg-red-400 border-red-600 text-red-900' },
  stock_adjusted: { label: '庫存調整', color: 'bg-orange-400 border-orange-600 text-orange-900' },
  comment_added: { label: '留言', color: 'bg-yellow-400 border-yellow-600 text-yellow-900' },
}

interface ActionTypeBadgeProps {
  actionType: AuditActionType
}

export function ActionTypeBadge({ actionType }: ActionTypeBadgeProps) {
  const config = ACTION_TYPE_CONFIG[actionType]

  return (
    <span
      className={`inline-flex items-center rounded-none border-2 px-2 py-1 text-xs font-black uppercase ${config.color}`}
    >
      {config.label}
    </span>
  )
}
```

---

### T040: 操作日誌頁面

**檔案**: `app/(admin)/admin/system/audit-logs/page.tsx`

```typescript
import { getAuditLogs } from '@/lib/actions/audit'
import { AuditLogList } from '@/components/admin/AuditLogList'
import { AuditLogFilters } from '@/components/admin/AuditLogFilters'
import { checkAuth } from '@/lib/actions/helpers'
import { AuditActionType } from '@/types'

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: {
    action_type?: AuditActionType
    date_from?: string
    date_to?: string
    page?: string
  }
}) {
  // 權限檢查
  await checkAuth('admin')

  // 查詢操作日誌
  const result = await getAuditLogs({
    action_type: searchParams.action_type,
    date_from: searchParams.date_from,
    date_to: searchParams.date_to,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    limit: 20,
  })

  if (!result.success || !result.data) {
    return <div>載入失敗</div>
  }

  const { logs, total } = result.data

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div>
        <h1 className="text-3xl font-black">操作日誌</h1>
        <p className="mt-2 text-sm text-gray-600">
          共 {total} 筆操作記錄
        </p>
      </div>

      {/* 篩選器 */}
      <AuditLogFilters currentFilters={searchParams} />

      {/* 日誌列表 */}
      <AuditLogList logs={logs} />
    </div>
  )
}
```

---

### T041-T044: 整合操作日誌記錄於現有 Server Actions

在現有的 Server Actions 中加入 `logAudit()` 呼叫：

#### T041: 商品 CRUD (`lib/actions/products.ts`)

在 `createProduct`, `updateProduct`, `deleteProduct` 函式最後加入：

```typescript
// 範例：createProduct 函式
await logAudit({
  target_type: 'product',
  target_id: productId,
  action_type: 'created',
  new_values: { name, code, series_id, stock },
})
```

#### T042: 客戶 CRUD (`lib/actions/clients.ts`)

同上，在 CRUD 函式中加入對應的 `logAudit()` 呼叫。

#### T043: 訂單操作 (`lib/actions/orders.ts`)

已有 `order_timelines` 表記錄操作歷史，可選擇性整合 `logAudit()`。

#### T044: 系統設定操作（Phase 6 實作）

---

## 📋 Phase 6-8 剩餘任務

由於篇幅限制，Phase 6-8 的完整程式碼範本請參考以下摘要：

### Phase 6: User Story 4 - 系統設定管理 (19 tasks)
- T051-T055: System Settings Server Actions
- T056-T057: 輔助函式（parseSettingValue, serializeSettingValue）
- T058-T059: UI 元件（SystemSettingsForm, LogoUploader）
- T060: 系統設定頁面
- T061-T063: 整合公開設定於前後台
- T064-T069: 測試

### Phase 7: User Story 5 - 操作歷史時間軸 (7 tasks)
- T070: AuditTimeline 元件
- T071-T073: 整合於訂單/商品/客戶詳情頁
- T074-T076: 測試

### Phase 8: Polish & 品質保證 (10 tasks)
- T077: 更新 Sidebar 導覽
- T078-T081: 程式碼清理、設計驗證、權限檢查
- T082-T083: TypeScript 型別檢查、ESLint 檢查
- T084: 完整測試流程
- T085: 效能測試
- T086: 文件更新

---

## 🚀 執行建議

1. **優先完成 Phase 4**（T026-T033）：管理員 CRUD 介面
2. **接續 Phase 5**（T034-T050）：操作日誌系統
3. **選擇性實作 Phase 6-7**：系統設定與操作歷史時間軸
4. **最終執行 Phase 8**：品質保證與文件更新

---

**更新日期**: 2026-01-04
**實作進度**: 23/86 任務完成 (26.7%)
**核心功能狀態**: Phase 1-3 完整 | Phase 4 部分 | Phase 5-8 待實作
