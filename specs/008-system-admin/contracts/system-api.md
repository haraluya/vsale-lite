# API Contract: System Settings (系統設定管理)

**Module**: `lib/actions/system.ts`
**Date**: 2026-01-04
**Status**: Phase 1 Design

## Overview

系統設定管理 Server Actions，負責系統設定的查詢、更新與 Logo 圖片上傳。支援公開設定（客戶可讀）與私密設定（僅管理員可讀）的權限控制。

---

## Common Types

```typescript
// types/index.ts

export type SettingValueType = 'text' | 'number' | 'boolean' | 'json' | 'image_url'
export type SettingCategory = 'general' | 'branding' | 'carousel' | 'system'

export interface SystemSetting {
  id: string
  key: string
  value: string
  value_type: SettingValueType
  category: SettingCategory
  is_public: boolean
  description: string | null
  updated_by: string | null
  updated_at: string
}

export interface ParsedSetting {
  key: string
  value: string | number | boolean | object
  value_type: SettingValueType
  description: string | null
}
```

---

## Server Actions

### 1. getSettings

**用途**: 查詢系統設定（支援類別篩選）

**路徑**: `lib/actions/system.ts`

**簽名**:
```typescript
export async function getSettings(
  category?: SettingCategory
): Promise<ActionResult<ParsedSetting[]>>
```

**權限**: 管理員 (role = 'admin')

**查詢邏輯**:
```typescript
let query = supabase
  .from('system_settings')
  .select('key, value, value_type, category, description')
  .order('category', { ascending: true })
  .order('key', { ascending: true })

if (category) {
  query = query.eq('category', category)
}

const { data: settings } = await query
```

**值解析邏輯**:
```typescript
function parseSettingValue(value: string, valueType: SettingValueType): any {
  switch (valueType) {
    case 'number':
      return parseFloat(value)
    case 'boolean':
      return value === 'true'
    case 'json':
      return JSON.parse(value)
    default:
      return value
  }
}

const parsed = settings.map(s => ({
  key: s.key,
  value: parseSettingValue(s.value, s.value_type),
  value_type: s.value_type,
  description: s.description
}))
```

**回傳範例**:
```typescript
{
  success: true,
  data: [
    {
      key: 'site_title',
      value: 'Vsale-lite - B2B 批發訂貨系統',
      value_type: 'text',
      description: '網站標題'
    },
    {
      key: 'carousel_auto_play',
      value: true,
      value_type: 'boolean',
      description: '廣告輪播自動播放'
    },
    {
      key: 'carousel_interval',
      value: 5000,
      value_type: 'number',
      description: '廣告輪播間隔（毫秒）'
    }
  ]
}
```

---

### 2. getPublicSettings

**用途**: 查詢公開設定（客戶與未登入使用者可讀）

**簽名**:
```typescript
export async function getPublicSettings(): Promise<ActionResult<ParsedSetting[]>>
```

**權限**: 無（公開）

**查詢邏輯**:
```typescript
const { data: settings } = await supabase
  .from('system_settings')
  .select('key, value, value_type, description')
  .eq('is_public', true)
  .order('key', { ascending: true })
```

**回傳範例**:
```typescript
{
  success: true,
  data: [
    {
      key: 'site_title',
      value: 'Vsale-lite - B2B 批發訂貨系統',
      value_type: 'text',
      description: '網站標題'
    },
    {
      key: 'logo_url',
      value: 'https://supabase.co/storage/v1/object/public/products/system/logo.png',
      value_type: 'image_url',
      description: '完整版 Logo'
    }
  ]
}
```

**使用場景**:
- 前台 Layout 顯示網站標題、Logo
- 未登入使用者瀏覽前台時取得基本設定

---

### 3. updateSetting

**用途**: 更新單一系統設定

**簽名**:
```typescript
export async function updateSetting(input: {
  key: string
  value: string | number | boolean | object
}): Promise<ActionResult<{ key: string; value: string }>>
```

**權限**: 管理員 (role = 'admin')

**輸入驗證**:
```typescript
// lib/validations/system.schema.ts
export const updateSettingSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/, '設定鍵格式錯誤'),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.any())
  ])
})
```

**處理流程**:
1. 驗證管理員權限
2. 驗證輸入
3. 查詢設定的 `value_type`（確保值類型正確）:
   ```typescript
   const { data: setting } = await supabase
     .from('system_settings')
     .select('value_type, value')
     .eq('key', input.key)
     .single()

   if (!setting) {
     return { success: false, message: '設定不存在' }
   }
   ```
4. 驗證值類型:
   ```typescript
   function validateValueType(value: any, expectedType: SettingValueType): boolean {
     switch (expectedType) {
       case 'number':
         return typeof value === 'number'
       case 'boolean':
         return typeof value === 'boolean'
       case 'json':
         return typeof value === 'object'
       default:
         return typeof value === 'string'
     }
   }

   if (!validateValueType(input.value, setting.value_type)) {
     return { success: false, message: '值類型錯誤' }
   }
   ```
5. 轉換值為 TEXT 格式儲存:
   ```typescript
   const valueString = setting.value_type === 'json'
     ? JSON.stringify(input.value)
     : String(input.value)
   ```
6. 更新設定:
   ```typescript
   const { user } = await checkAuth('admin')

   await supabase
     .from('system_settings')
     .update({
       value: valueString,
       updated_by: user.id,
       updated_at: new Date().toISOString()
     })
     .eq('key', input.key)
   ```
7. 記錄操作日誌:
   ```typescript
   await logAudit({
     targetType: 'system_setting',
     targetId: input.key,
     actionType: 'updated',
     oldValues: { value: setting.value },
     newValues: { value: valueString }
   })
   ```
8. 執行 `revalidatePath('/', 'layout')`（設定變更影響全站）

**回傳範例**:
```typescript
// 成功
{
  success: true,
  data: {
    key: 'site_title',
    value: '新的網站標題'
  },
  message: '設定更新成功'
}

// 失敗
{
  success: false,
  message: '值類型錯誤'
}
```

**錯誤處理**:
- 設定不存在: `{ success: false, message: '設定不存在' }`
- 值類型錯誤: `{ success: false, message: '值類型錯誤' }`

---

### 4. uploadLogo

**用途**: 上傳 Logo 圖片（完整版、圖示版、Favicon）

**簽名**:
```typescript
export async function uploadLogo(input: {
  logoType: 'logo' | 'logo-icon' | 'favicon'
  file: File
}): Promise<ActionResult<{ publicUrl: string }>>
```

**權限**: 管理員 (role = 'admin')

**輸入驗證**:
```typescript
export const uploadLogoSchema = z.object({
  logoType: z.enum(['logo', 'logo-icon', 'favicon']),
  file: z.instanceof(File)
})
```

**檔案驗證**:
```typescript
const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

if (!ALLOWED_TYPES.includes(file.type)) {
  return {
    success: false,
    message: '僅支援 JPG、PNG、WebP、SVG 格式'
  }
}

if (file.size > MAX_SIZE) {
  return {
    success: false,
    message: '檔案大小不得超過 2MB'
  }
}
```

**處理流程**:
1. 驗證管理員權限
2. 驗證檔案格式與大小
3. 上傳至 Supabase Storage:
   ```typescript
   const supabase = await createClient()
   const fileExt = file.name.split('.').pop()
   const filePath = `system/${input.logoType}.${fileExt}`

   const { error: uploadError } = await supabase.storage
     .from('products')  // 使用現有的 products bucket
     .upload(filePath, file, {
       upsert: true,  // 覆寫舊圖片
       contentType: file.type
     })

   if (uploadError) {
     return { success: false, message: '圖片上傳失敗' }
   }
   ```
4. 取得公開 URL:
   ```typescript
   const { data: { publicUrl } } = supabase.storage
     .from('products')
     .getPublicUrl(filePath)
   ```
5. 更新 `system_settings` 表:
   ```typescript
   const adminClient = createAdminClient()
   const settingKey = `${input.logoType.replace('-', '_')}_url`  // logo-icon → logo_icon_url

   await adminClient
     .from('system_settings')
     .update({
       value: publicUrl,
       updated_by: user.id,
       updated_at: new Date().toISOString()
     })
     .eq('key', settingKey)
   ```
6. 記錄操作日誌:
   ```typescript
   await logAudit({
     targetType: 'system_setting',
     targetId: settingKey,
     actionType: 'updated',
     oldValues: null,
     newValues: { logo_url: publicUrl },
     notes: `上傳 ${input.logoType} 圖片`
   })
   ```
7. 執行 `revalidatePath('/', 'layout')`

**回傳範例**:
```typescript
// 成功
{
  success: true,
  data: {
    publicUrl: 'https://supabase.co/storage/v1/object/public/products/system/logo.png'
  },
  message: 'Logo 上傳成功'
}

// 失敗（檔案大小）
{
  success: false,
  message: '檔案大小不得超過 2MB'
}

// 失敗（格式錯誤）
{
  success: false,
  message: '僅支援 JPG、PNG、WebP、SVG 格式'
}
```

**Logo 類型對應**:
| `logoType` | 設定鍵 | 說明 | 建議尺寸 |
|-----------|--------|------|---------|
| `logo` | `logo_url` | 完整版 Logo | 200×60 |
| `logo-icon` | `logo_icon_url` | 圖示版 Logo | 60×60 |
| `favicon` | `favicon_url` | Favicon | 60×60 |

---

### 5. deleteLogo

**用途**: 刪除 Logo 圖片

**簽名**:
```typescript
export async function deleteLogo(
  logoType: 'logo' | 'logo-icon' | 'favicon'
): Promise<ActionResult<{ logoType: string }>>
```

**權限**: 管理員 (role = 'admin')

**處理流程**:
1. 驗證管理員權限
2. 查詢舊的 Logo URL（用於刪除 Storage 檔案）:
   ```typescript
   const settingKey = `${logoType.replace('-', '_')}_url`

   const { data: setting } = await supabase
     .from('system_settings')
     .select('value')
     .eq('key', settingKey)
     .single()
   ```
3. 刪除 Supabase Storage 檔案:
   ```typescript
   const filePath = setting.value.split('/').pop()  // 從 URL 提取檔名

   await supabase.storage
     .from('products')
     .remove([`system/${filePath}`])
   ```
4. 更新 `system_settings` 表（清空 URL）:
   ```typescript
   await supabase
     .from('system_settings')
     .update({
       value: '',
       updated_by: user.id,
       updated_at: new Date().toISOString()
     })
     .eq('key', settingKey)
   ```
5. 記錄操作日誌
6. 執行 `revalidatePath('/', 'layout')`

**回傳範例**:
```typescript
{
  success: true,
  data: { logoType: 'logo' },
  message: 'Logo 已刪除'
}
```

---

## Helper Functions

### parseSettingValue

**用途**: 解析設定值（TEXT → 實際型別）

```typescript
export function parseSettingValue(
  value: string,
  valueType: SettingValueType
): string | number | boolean | object {
  switch (valueType) {
    case 'number':
      return parseFloat(value)
    case 'boolean':
      return value === 'true'
    case 'json':
      return JSON.parse(value)
    default:
      return value
  }
}
```

### serializeSettingValue

**用途**: 序列化設定值（實際型別 → TEXT）

```typescript
export function serializeSettingValue(
  value: string | number | boolean | object,
  valueType: SettingValueType
): string {
  if (valueType === 'json') {
    return JSON.stringify(value)
  }
  return String(value)
}
```

---

## Error Handling

所有 Server Actions 遵循統一的錯誤處理模式：

```typescript
try {
  // 1. 權限檢查（僅 getPublicSettings 不需要）
  const { user } = await checkAuth('admin')

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
  revalidatePath('/', 'layout')  // 設定變更影響全站
  return { success: true, data, message }

} catch (error) {
  console.error('[System API Error]', error)
  return {
    success: false,
    message: error instanceof Error ? error.message : '系統錯誤'
  }
}
```

---

## Performance Considerations

1. **公開設定查詢**: `getPublicSettings` 使用 RLS 自動過濾 `is_public = true` 的設定
2. **設定快取**: 前台 Layout 使用 `getPublicSettings` 並依賴 Next.js 快取
3. **Logo 上傳**: 使用 `upsert: true` 模式覆寫舊圖片，避免 Storage 檔案堆積
4. **全站重新驗證**: 設定變更後執行 `revalidatePath('/', 'layout')` 確保所有頁面即時套用

---

## Testing Checklist

- [ ] 管理員可查詢所有系統設定
- [ ] 管理員可依類別篩選設定
- [ ] 客戶與未登入使用者可查詢公開設定
- [ ] 管理員可更新文字設定
- [ ] 管理員可更新數字設定
- [ ] 管理員可更新布林值設定
- [ ] 管理員可上傳完整版 Logo
- [ ] 管理員可上傳圖示版 Logo
- [ ] 管理員可上傳 Favicon
- [ ] Logo 檔案大小驗證正確（2MB 限制）
- [ ] Logo 格式驗證正確（僅支援 JPG/PNG/WebP/SVG）
- [ ] Logo 上傳後前台即時顯示新 Logo
- [ ] 管理員可刪除 Logo
- [ ] 設定變更記錄於 `audit_logs` 表

---

**Status**: ✅ Completed
**Related**: admin-api.md, audit-api.md
**Date**: 2026-01-04
