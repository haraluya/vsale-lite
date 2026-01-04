# API Contract: Admin Management (管理員帳號管理)

**Module**: `lib/actions/admins.ts`
**Date**: 2026-01-04
**Status**: Phase 1 Design

## Overview

管理員帳號管理 Server Actions，負責管理員的建立、查詢、編輯、密碼重設與刪除操作。所有操作包含權限驗證、輸入驗證與操作日誌記錄。

---

## Common Types

```typescript
// types/index.ts

export interface Admin {
  id: string
  username: string
  display_name: string | null
  email: string
  created_at: string
}

export interface AdminWithProfile extends Admin {
  last_login: string | null
  created_orders_count?: number
}
```

---

## Server Actions

### 1. createAdmin

**用途**: 建立新的管理員帳號（超級管理員）

**路徑**: `lib/actions/admins.ts`

**簽名**:
```typescript
export async function createAdmin(input: {
  username: string
  password: string
  display_name: string
  email?: string
}): Promise<ActionResult<{ adminId: string; username: string }>>
```

**權限**: 管理員 (role = 'admin')

**輸入驗證** (Zod Schema):
```typescript
// lib/validations/admin.schema.ts
export const createAdminSchema = z.object({
  username: z.string()
    .min(3, '帳號最少 3 個字元')
    .max(20, '帳號最多 20 個字元')
    .regex(/^[a-z0-9_]+$/, '帳號僅允許小寫字母、數字、底線'),
  password: z.string()
    .min(8, '密碼最少 8 個字元')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密碼必須包含大小寫字母與數字'),
  display_name: z.string()
    .min(1, '暱稱不得為空')
    .max(20, '暱稱最多 20 個字元'),
  email: z.string().email('Email 格式錯誤').optional()
})
```

**處理流程**:
1. 驗證管理員權限 (`checkAuth('admin')`)
2. 驗證輸入 (Zod schema)
3. 檢查帳號是否已存在:
   ```typescript
   const { data: existing } = await supabase
     .from('profiles')
     .select('id')
     .eq('username', input.username)
     .single()

   if (existing) {
     return { success: false, message: '帳號已存在' }
   }
   ```
4. 使用 Supabase Auth 建立使用者:
   ```typescript
   const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
     email: input.email || `${input.username}@vsale-internal.local`,
     password: input.password,
     email_confirm: true,
     user_metadata: {
       username: input.username,
       display_name: input.display_name,
       role: 'admin'
     }
   })
   ```
5. 更新 `profiles` 表:
   ```typescript
   await supabase
     .from('profiles')
     .update({
       username: input.username,
       display_name: input.display_name,
       email: input.email || `${input.username}@vsale-internal.local`,
       role: 'admin'
     })
     .eq('id', authUser.user.id)
   ```
6. 記錄操作日誌 (`logAudit`)
7. 執行 `revalidatePath('/admin/system/admins')`
8. 回傳管理員 ID 與帳號

**回傳範例**:
```typescript
// 成功
{
  success: true,
  data: {
    adminId: '123e4567-e89b-12d3-a456-426614174000',
    username: 'alice'
  },
  message: '管理員帳號建立成功'
}

// 失敗
{
  success: false,
  message: '帳號已存在',
  errors: {
    username: ['帳號 alice 已被使用']
  }
}
```

**錯誤處理**:
- 帳號已存在: `{ success: false, message: '帳號已存在' }`
- 密碼強度不足: `{ success: false, errors: { password: ['密碼必須包含大小寫字母與數字'] } }`
- Supabase Auth 錯誤: `{ success: false, message: '帳號建立失敗' }`

---

### 2. getAdmins

**用途**: 查詢所有管理員帳號列表

**簽名**:
```typescript
export async function getAdmins(): Promise<ActionResult<Admin[]>>
```

**權限**: 管理員 (role = 'admin')

**查詢邏輯**:
```typescript
const { data: admins } = await supabase
  .from('profiles')
  .select('id, username, display_name, email, created_at')
  .eq('role', 'admin')
  .order('created_at', { ascending: false })
```

**回傳範例**:
```typescript
{
  success: true,
  data: [
    {
      id: '...',
      username: 'alice',
      display_name: '小愛',
      email: 'alice@company.com',
      created_at: '2026-01-01T00:00:00Z'
    },
    {
      id: '...',
      username: 'bob',
      display_name: '小寶',
      email: 'bob@company.com',
      created_at: '2026-01-02T00:00:00Z'
    }
  ]
}
```

---

### 3. getAdminById

**用途**: 查詢特定管理員的詳細資訊

**簽名**:
```typescript
export async function getAdminById(
  adminId: string
): Promise<ActionResult<AdminWithProfile>>
```

**權限**: 管理員 (role = 'admin')

**查詢邏輯**:
```typescript
const { data: admin } = await supabase
  .from('profiles')
  .select(`
    id,
    username,
    display_name,
    email,
    created_at,
    last_sign_in_at
  `)
  .eq('id', adminId)
  .eq('role', 'admin')
  .single()
```

**回傳範例**:
```typescript
{
  success: true,
  data: {
    id: '...',
    username: 'alice',
    display_name: '小愛',
    email: 'alice@company.com',
    created_at: '2026-01-01T00:00:00Z',
    last_login: '2026-01-04T10:30:00Z'
  }
}
```

---

### 4. updateAdmin

**用途**: 更新管理員資料（暱稱、Email）

**簽名**:
```typescript
export async function updateAdmin(input: {
  adminId: string
  display_name?: string
  email?: string
}): Promise<ActionResult<{ adminId: string }>>
```

**權限**: 管理員 (role = 'admin')

**輸入驗證**:
```typescript
export const updateAdminSchema = z.object({
  adminId: z.string().uuid(),
  display_name: z.string().min(1).max(20).optional(),
  email: z.string().email().optional()
}).refine(data => data.display_name || data.email, {
  message: '至少需要更新一個欄位'
})
```

**處理流程**:
1. 驗證管理員權限
2. 驗證輸入
3. 查詢舊資料（用於操作日誌）:
   ```typescript
   const { data: oldData } = await supabase
     .from('profiles')
     .select('display_name, email')
     .eq('id', input.adminId)
     .single()
   ```
4. 更新 `profiles` 表:
   ```typescript
   await supabase
     .from('profiles')
     .update({
       display_name: input.display_name,
       email: input.email
     })
     .eq('id', input.adminId)
   ```
5. 記錄操作日誌:
   ```typescript
   await logAudit({
     targetType: 'admin',
     targetId: input.adminId,
     actionType: 'updated',
     oldValues: { display_name: oldData.display_name, email: oldData.email },
     newValues: { display_name: input.display_name, email: input.email }
   })
   ```
6. 執行 `revalidatePath('/admin/system/admins')`

**回傳範例**:
```typescript
{
  success: true,
  data: { adminId: '...' },
  message: '管理員資料更新成功'
}
```

---

### 5. resetPassword

**用途**: 重設管理員密碼（超級管理員）

**簽名**:
```typescript
export async function resetPassword(input: {
  adminId: string
  newPassword: string
}): Promise<ActionResult<{ adminId: string }>>
```

**權限**: 管理員 (role = 'admin')

**輸入驗證**:
```typescript
export const resetPasswordSchema = z.object({
  adminId: z.string().uuid(),
  newPassword: z.string()
    .min(8, '密碼最少 8 個字元')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密碼必須包含大小寫字母與數字')
})
```

**處理流程**:
1. 驗證管理員權限
2. 驗證輸入
3. 使用 Supabase Auth Admin API 重設密碼:
   ```typescript
   const { error } = await supabase.auth.admin.updateUserById(
     input.adminId,
     { password: input.newPassword }
   )
   ```
4. 記錄操作日誌:
   ```typescript
   await logAudit({
     targetType: 'admin',
     targetId: input.adminId,
     actionType: 'updated',
     oldValues: null,
     newValues: { action: 'password_reset' },
     notes: '管理員密碼已重設'
   })
   ```
5. 執行 `revalidatePath('/admin/system/admins')`

**回傳範例**:
```typescript
{
  success: true,
  data: { adminId: '...' },
  message: '密碼重設成功'
}
```

**錯誤處理**:
- 密碼強度不足: `{ success: false, errors: { newPassword: ['密碼必須包含大小寫字母與數字'] } }`
- Supabase Auth 錯誤: `{ success: false, message: '密碼重設失敗' }`

---

### 6. deleteAdmin

**用途**: 刪除管理員帳號（超級管理員）

**簽名**:
```typescript
export async function deleteAdmin(
  adminId: string
): Promise<ActionResult<{ adminId: string }>>
```

**權限**: 管理員 (role = 'admin')

**處理流程**:
1. 驗證管理員權限
2. 檢查是否刪除自己:
   ```typescript
   const { user } = await checkAuth('admin')
   if (user.id === adminId) {
     return { success: false, message: '無法刪除自己的帳號' }
   }
   ```
3. 查詢管理員資料（用於操作日誌）:
   ```typescript
   const { data: adminData } = await supabase
     .from('profiles')
     .select('username, display_name, email')
     .eq('id', adminId)
     .single()
   ```
4. 刪除 Supabase Auth 使用者:
   ```typescript
   await supabase.auth.admin.deleteUser(adminId)
   ```
5. 刪除 `profiles` 記錄（CASCADE 自動處理）
6. 記錄操作日誌:
   ```typescript
   await logAudit({
     targetType: 'admin',
     targetId: adminId,
     actionType: 'deleted',
     oldValues: adminData,
     newValues: null,
     notes: `管理員 ${adminData.username} (${adminData.display_name}) 已刪除`
   })
   ```
7. 執行 `revalidatePath('/admin/system/admins')`

**回傳範例**:
```typescript
// 成功
{
  success: true,
  data: { adminId: '...' },
  message: '管理員帳號已刪除'
}

// 失敗（刪除自己）
{
  success: false,
  message: '無法刪除自己的帳號'
}
```

**錯誤處理**:
- 刪除自己: `{ success: false, message: '無法刪除自己的帳號' }`
- 管理員不存在: `{ success: false, message: '管理員不存在' }`
- Supabase Auth 錯誤: `{ success: false, message: '管理員刪除失敗' }`

---

### 7. loginWithUsername

**用途**: 管理員使用帳號登入

**簽名**:
```typescript
export async function loginWithUsername(input: {
  username: string
  password: string
}): Promise<ActionResult<{ redirectUrl: string }>>
```

**權限**: 無（公開）

**輸入驗證**:
```typescript
export const loginWithUsernameSchema = z.object({
  username: z.string().min(1, '請輸入帳號'),
  password: z.string().min(1, '請輸入密碼')
})
```

**處理流程**:
1. 驗證輸入
2. 查詢管理員 Email（透過 username）:
   ```typescript
   const { data: profile } = await supabase
     .from('profiles')
     .select('email')
     .eq('username', input.username)
     .eq('role', 'admin')
     .single()

   if (!profile) {
     return { success: false, message: '帳號或密碼錯誤' }
   }
   ```
3. 使用 Supabase Auth 登入（使用 Email + 密碼）:
   ```typescript
   const { error } = await supabase.auth.signInWithPassword({
     email: profile.email,
     password: input.password
   })

   if (error) {
     return { success: false, message: '帳號或密碼錯誤' }
   }
   ```
4. 執行 `revalidatePath('/', 'layout')`
5. 回傳重定向 URL

**回傳範例**:
```typescript
// 成功
{
  success: true,
  data: { redirectUrl: '/admin/dashboard' },
  message: '登入成功'
}

// 失敗
{
  success: false,
  message: '帳號或密碼錯誤'
}
```

**安全性考量**:
- 統一錯誤訊息（「帳號或密碼錯誤」），不區分「帳號不存在」與「密碼錯誤」，防止帳號列舉攻擊
- 登入失敗不記錄詳細錯誤（避免洩漏帳號存在性）

---

## Error Handling

所有 Server Actions 遵循統一的錯誤處理模式：

```typescript
try {
  // 1. 權限檢查
  const { user, role } = await checkAuth('admin')

  // 2. 輸入驗證
  const validated = schema.safeParse(input)
  if (!validated.success) {
    return {
      success: false,
      message: '輸入驗證失敗',
      errors: validated.error.flatten().fieldErrors
    }
  }

  // 3. 業務邏輯
  // ...

  // 4. 記錄操作日誌
  await logAudit({ ... })

  // 5. 成功回傳
  revalidatePath(path)
  return { success: true, data, message }

} catch (error) {
  console.error('[Admin API Error]', error)
  return {
    success: false,
    message: error instanceof Error ? error.message : '系統錯誤'
  }
}
```

---

## Performance Considerations

1. **索引優化**: 使用 `idx_profiles_username` 索引支援快速帳號查詢
2. **RLS 自動過濾**: 管理員查詢時僅返回 `role = 'admin'` 的記錄
3. **批次查詢**: `getAdmins` 一次載入所有管理員（假設數量不超過 100 人）
4. **操作日誌非同步**: 操作日誌記錄不阻塞主流程

---

## Testing Checklist

- [ ] 超級管理員可成功建立新管理員帳號
- [ ] 帳號重複時無法建立
- [ ] 密碼強度驗證正確
- [ ] 管理員可查詢所有管理員列表
- [ ] 管理員可更新暱稱與 Email
- [ ] 管理員可重設其他管理員密碼
- [ ] 管理員無法刪除自己的帳號
- [ ] 管理員可刪除其他管理員帳號
- [ ] 刪除管理員後操作記錄仍保留
- [ ] 管理員可使用帳號登入
- [ ] 登入失敗不洩漏帳號存在性
- [ ] 所有操作都記錄於 `audit_logs` 表

---

**Status**: ✅ Completed
**Related**: system-api.md, audit-api.md
**Date**: 2026-01-04
