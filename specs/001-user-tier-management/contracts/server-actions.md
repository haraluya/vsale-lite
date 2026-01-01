# Server Actions API Contracts

**Feature**: 001-user-tier-management
**Date**: 2026-01-01
**Version**: 1.0.0

## 概述

本文件定義客戶與會員等級管理功能的 Server Actions 介面規格。所有 Server Actions 遵循 Next.js 15 標準,使用 Zod 進行輸入驗證,並回傳統一的回應格式。

**設計原則**:
- ✅ 輸入驗證: 使用 Zod Schema 驗證所有輸入
- ✅ 錯誤處理: 統一回應格式 (success/error)
- ✅ 權限檢查: 在 Action 內部驗證使用者角色
- ✅ 路徑重新驗證: 使用 `revalidatePath` 同步快取

---

## 通用型別定義

### ActionResult<T>
```typescript
type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; errors?: Record<string, string[]>; message: string }
```

### AuthContext
```typescript
type AuthContext = {
  userId: string
  role: 'client' | 'admin'
  tierId?: string  // 僅客戶有
}
```

---

## 1. Authentication Actions

### 1.1 loginWithPhone

**用途**: 前台客戶登入 (使用手機號碼)

**檔案位置**: `src/lib/actions/auth.ts`

**函式簽章**:
```typescript
async function loginWithPhone(
  prevState: any,
  formData: FormData
): Promise<ActionResult>
```

**輸入驗證 Schema**:
```typescript
const loginWithPhoneSchema = z.object({
  phone: z.string()
    .regex(/^09\d{8}$/, '請輸入有效的手機號碼 (09 開頭,共 10 碼)')
    .transform(val => val.replace(/[\s-]/g, '')),
  password: z.string().min(1, '密碼不可為空'),
})
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `phone` | string | ✅ | 手機號碼 (自動移除空格與連字號) |
| `password` | string | ✅ | 密碼 |

**回應範例**:
```typescript
// 成功
{ success: true, message: '登入成功' }

// 失敗 - 驗證錯誤
{
  success: false,
  errors: { phone: ['請輸入有效的手機號碼 (09 開頭,共 10 碼)'] },
  message: '驗證失敗'
}

// 失敗 - 帳號或密碼錯誤
{ success: false, message: '手機號碼或密碼錯誤' }

// 失敗 - 非客戶帳號
{ success: false, message: '此帳號無法使用前台登入' }
```

**業務邏輯**:
1. 驗證手機號碼格式
2. 呼叫 Supabase Auth `signInWithPassword({ phone, password })`
3. 查詢 `profiles` 表取得 `role` 和 `tier_id`
4. 驗證 `role === 'client'` (非客戶不可登入前台)
5. 設定 Session Cookie
6. 重導向至 `/store`

**錯誤處理**:
- 手機號碼格式錯誤 → 回傳驗證錯誤
- 帳號密碼錯誤 → 回傳統一訊息 (避免洩漏帳號存在與否)
- 角色不符 → 回傳權限錯誤

---

### 1.2 loginWithEmail

**用途**: 後台管理員登入 (使用 Email)

**檔案位置**: `src/lib/actions/auth.ts`

**函式簽章**:
```typescript
async function loginWithEmail(
  prevState: any,
  formData: FormData
): Promise<ActionResult>
```

**輸入驗證 Schema**:
```typescript
const loginWithEmailSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(1, '密碼不可為空'),
})
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `email` | string | ✅ | Email 帳號 |
| `password` | string | ✅ | 密碼 |

**回應範例**:
```typescript
// 成功
{ success: true, message: '登入成功' }

// 失敗
{ success: false, message: 'Email 或密碼錯誤' }
```

**業務邏輯**:
1. 驗證 Email 格式
2. 呼叫 Supabase Auth `signInWithPassword({ email, password })`
3. 查詢 `profiles` 表驗證 `role === 'admin'`
4. 設定 Session Cookie
5. 重導向至 `/admin/dashboard`

---

### 1.3 logout

**用途**: 登出 (前後台共用)

**函式簽章**:
```typescript
async function logout(): Promise<ActionResult>
```

**業務邏輯**:
1. 呼叫 Supabase Auth `signOut()`
2. 清除 Session Cookie
3. 重導向至 `/login` (前台) 或 `/admin/login` (後台)

---

## 2. Tier Management Actions

### 2.1 createTier

**用途**: 建立新會員等級

**檔案位置**: `src/lib/actions/tiers.ts`

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function createTier(
  prevState: any,
  formData: FormData
): Promise<ActionResult<{ id: string }>>
```

**輸入驗證 Schema**:
```typescript
const createTierSchema = z.object({
  name: z.string()
    .min(1, '等級名稱不可為空')
    .max(50, '等級名稱最多 50 字'),
  rank: z.coerce.number()
    .int('排序必須為整數')
    .min(1, '排序必須大於 0'),
})
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `name` | string | ✅ | 等級名稱 (如: 零售、批發) |
| `rank` | number | ✅ | 排序數字 (越小越優先) |

**回應範例**:
```typescript
// 成功
{ success: true, data: { id: 'uuid-xxx' }, message: '等級建立成功' }

// 失敗 - 名稱重複
{ success: false, message: '此等級名稱已存在' }

// 失敗 - 權限不足
{ success: false, message: '權限不足,僅管理員可執行此操作' }
```

**業務邏輯**:
1. 驗證當前使用者為 Admin
2. 驗證輸入欄位
3. 檢查等級名稱是否重複
4. 寫入 `tiers` 表
5. `revalidatePath('/admin/tiers')`

---

### 2.2 updateTier

**用途**: 更新會員等級

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function updateTier(
  id: string,
  prevState: any,
  formData: FormData
): Promise<ActionResult>
```

**輸入驗證 Schema**:
```typescript
const updateTierSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  rank: z.coerce.number().int().min(1).optional(),
})
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 等級 ID (URL 參數) |
| `name` | string | ❌ | 新的等級名稱 |
| `rank` | number | ❌ | 新的排序數字 |

**回應範例**:
```typescript
// 成功
{ success: true, message: '等級更新成功' }

// 失敗 - 等級不存在
{ success: false, message: '等級不存在' }
```

**業務邏輯**:
1. 驗證 Admin 權限
2. 檢查等級是否存在
3. 若修改 `name`,檢查是否與其他等級重複
4. 更新 `tiers` 表
5. `revalidatePath('/admin/tiers')`

---

### 2.3 deleteTier

**用途**: 刪除會員等級

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function deleteTier(id: string): Promise<ActionResult>
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 等級 ID |

**回應範例**:
```typescript
// 成功
{ success: true, message: '等級刪除成功' }

// 失敗 - 有客戶使用
{
  success: false,
  message: '此等級已有 5 位客戶使用,無法刪除'
}
```

**業務邏輯**:
1. 驗證 Admin 權限
2. 查詢 `profiles` 表計算使用此等級的客戶數量
3. 若 `count > 0`,回傳錯誤訊息並附上客戶數量
4. 若 `count === 0`,執行刪除
5. `revalidatePath('/admin/tiers')`

---

### 2.4 getTiers

**用途**: 查詢所有會員等級 (依 rank 排序)

**權限要求**: 無 (公開 API,但僅後台使用)

**函式簽章**:
```typescript
async function getTiers(): Promise<Tier[]>

type Tier = {
  id: string
  name: string
  rank: number
  created_at: string
  updated_at: string
}
```

**回應範例**:
```typescript
[
  { id: 'uuid-1', name: '零售', rank: 1, created_at: '...', updated_at: '...' },
  { id: 'uuid-2', name: '批發', rank: 2, created_at: '...', updated_at: '...' },
  { id: 'uuid-3', name: '經銷商', rank: 3, created_at: '...', updated_at: '...' }
]
```

**業務邏輯**:
1. 查詢 `tiers` 表
2. 依 `rank ASC` 排序
3. 回傳所有等級

---

## 3. User Management Actions

### 3.1 createClient

**用途**: 快速建立客戶帳號 (含預設密碼生成)

**檔案位置**: `src/lib/actions/users.ts`

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function createClient(
  prevState: any,
  formData: FormData
): Promise<ActionResult<{ phone: string; password: string }>>
```

**輸入驗證 Schema**:
```typescript
const createClientSchema = z.object({
  phone: z.string()
    .regex(/^09\d{8}$/, '請輸入有效的手機號碼')
    .transform(val => val.replace(/[\s-]/g, '')),
  tier_id: z.string().uuid('請選擇會員等級'),
})
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `phone` | string | ✅ | 手機號碼 |
| `tier_id` | string | ✅ | 會員等級 ID |

**回應範例**:
```typescript
// 成功
{
  success: true,
  data: { phone: '0912345678', password: '345678' },
  message: '客戶建立成功'
}

// 失敗 - 手機號碼重複
{ success: false, message: '此手機號碼已註冊' }

// 失敗 - 等級不存在
{ success: false, message: '選擇的會員等級不存在' }
```

**業務邏輯**:
1. 驗證 Admin 權限
2. 驗證手機號碼格式
3. 檢查手機號碼是否重複 (查詢 `profiles.phone`)
4. 驗證 `tier_id` 是否存在
5. 產生預設密碼: 取手機號碼後六碼 (如 `0912345678` → `345678`)
6. 呼叫 Supabase Auth 建立使用者:
   ```typescript
   supabase.auth.admin.createUser({
     phone: validatedPhone,
     password: generatedPassword,
     phone_confirm: true,  // 跳過手機驗證
   })
   ```
7. 寫入 `profiles` 表:
   ```sql
   INSERT INTO profiles (id, phone, role, tier_id)
   VALUES (auth_user_id, phone, 'client', tier_id)
   ```
8. `revalidatePath('/admin/users')`
9. 回傳帳號密碼供管理員複製

**注意事項**:
- 密碼僅在建立時回傳一次,不儲存明文
- 前端應提供「複製帳密」按鈕,格式為:
  ```
  您的帳號: 0912345678 / 密碼: 345678 (手機後六碼)
  ```

---

### 3.2 updateClient

**用途**: 更新客戶資料 (主要是變更會員等級)

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function updateClient(
  id: string,
  prevState: any,
  formData: FormData
): Promise<ActionResult>
```

**輸入驗證 Schema**:
```typescript
const updateClientSchema = z.object({
  tier_id: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
})
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 客戶 ID (URL 參數) |
| `tier_id` | string | ❌ | 新的會員等級 ID |
| `notes` | string | ❌ | 管理員備註 |

**回應範例**:
```typescript
// 成功
{ success: true, message: '客戶資料更新成功' }

// 失敗 - 客戶不存在
{ success: false, message: '客戶不存在' }
```

**業務邏輯**:
1. 驗證 Admin 權限
2. 檢查客戶是否存在
3. 若修改 `tier_id`,驗證新等級是否存在
4. 更新 `profiles` 表
5. `revalidatePath('/admin/users')`
6. `revalidatePath(\`/admin/users/\${id}\`)`

**影響**:
- 變更等級後,客戶下次登入將看到新等級的價格

---

### 3.3 getClients

**用途**: 查詢客戶列表 (含分頁與搜尋)

**權限要求**: 僅 Admin

**函式簽章**:
```typescript
async function getClients(params: {
  search?: string       // 手機號碼關鍵字
  tier_id?: string      // 等級篩選
  limit?: number        // 每頁筆數 (預設 20)
  offset?: number       // 偏移量 (預設 0)
}): Promise<{ data: Client[]; total: number }>

type Client = {
  id: string
  phone: string
  tier_id: string
  tier_name: string
  created_at: string
  notes?: string
}
```

**輸入參數**:
| 欄位 | 型別 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `search` | string | ❌ | - | 手機號碼關鍵字 (模糊搜尋) |
| `tier_id` | string | ❌ | - | 依等級篩選 |
| `limit` | number | ❌ | 20 | 每頁筆數 |
| `offset` | number | ❌ | 0 | 偏移量 |

**回應範例**:
```typescript
{
  data: [
    {
      id: 'uuid-1',
      phone: '0912345678',
      tier_id: 'tier-uuid',
      tier_name: '批發',
      created_at: '2026-01-01T10:00:00Z',
      notes: 'VIP 客戶'
    },
    // ...more
  ],
  total: 150  // 總筆數 (用於分頁計算)
}
```

**業務邏輯**:
1. 驗證 Admin 權限
2. 建立 SQL 查詢:
   ```sql
   SELECT
     p.id, p.phone, p.tier_id, t.name AS tier_name, p.created_at, p.notes
   FROM profiles p
   LEFT JOIN tiers t ON p.tier_id = t.id
   WHERE p.role = 'client'
     AND (p.phone LIKE '%{search}%' OR {search} IS NULL)
     AND (p.tier_id = {tier_id} OR {tier_id} IS NULL)
   ORDER BY p.created_at DESC
   LIMIT {limit} OFFSET {offset}
   ```
3. 同時查詢總筆數 (`COUNT(*)`)
4. 回傳客戶列表與總筆數

---

## 4. 權限檢查 Helper

### checkAuth

**用途**: 驗證當前使用者身份與權限

**檔案位置**: `src/lib/actions/helpers.ts`

**函式簽章**:
```typescript
async function checkAuth(requiredRole?: 'admin' | 'client'): Promise<AuthContext>

type AuthContext = {
  userId: string
  role: 'client' | 'admin'
  tierId?: string
}
```

**使用範例**:
```typescript
export async function createTier(prevState: any, formData: FormData) {
  // 1. 驗證權限
  const auth = await checkAuth('admin')  // 若非 admin 會拋出錯誤

  // 2. 業務邏輯...
}
```

**錯誤處理**:
- 未登入 → 拋出 `Unauthorized` 錯誤
- 角色不符 → 拋出 `Forbidden` 錯誤

---

## 5. 錯誤碼定義

| 錯誤碼 | HTTP 狀態 | 說明 | 處理方式 |
|--------|----------|------|---------|
| `VALIDATION_ERROR` | 400 | 輸入驗證失敗 | 顯示欄位錯誤訊息 |
| `UNAUTHORIZED` | 401 | 未登入 | 重導向至登入頁 |
| `FORBIDDEN` | 403 | 權限不足 | 顯示錯誤訊息或重導向 |
| `NOT_FOUND` | 404 | 資源不存在 | 顯示錯誤訊息 |
| `CONFLICT` | 409 | 資料衝突 (如重複) | 顯示具體衝突原因 |
| `INTERNAL_ERROR` | 500 | 伺服器錯誤 | 顯示通用錯誤訊息 |

---

## 6. 測試範例

### 單元測試 (Vitest)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createTier } from '@/lib/actions/tiers'

describe('createTier', () => {
  it('應該成功建立等級', async () => {
    const formData = new FormData()
    formData.append('name', '測試等級')
    formData.append('rank', '10')

    const result = await createTier(null, formData)

    expect(result.success).toBe(true)
    expect(result.data?.id).toBeDefined()
  })

  it('應該拒絕重複的等級名稱', async () => {
    const formData = new FormData()
    formData.append('name', '零售')  // 已存在
    formData.append('rank', '1')

    const result = await createTier(null, formData)

    expect(result.success).toBe(false)
    expect(result.message).toContain('已存在')
  })
})
```

---

## 總結

本 API Contracts 定義涵蓋:
- ✅ 3 個認證 Actions (登入前台、登入後台、登出)
- ✅ 4 個等級管理 Actions (CRUD)
- ✅ 3 個客戶管理 Actions (建立、更新、查詢)
- ✅ 統一的錯誤處理與回應格式
- ✅ 完整的權限檢查機制
- ✅ Zod Schema 輸入驗證

**下一步**: 建立 quickstart.md (開發環境設定指南)
