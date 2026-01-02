# API Contract: Series Management (系列管理)

**Module**: `lib/actions/series.ts`
**Feature**: 003-series-and-pricing
**Date**: 2026-01-02

## Overview

系列管理 Server Actions，提供系列 CRUD 功能（建立、讀取、更新、刪除）與圖片上傳。

---

## getSeries

**用途**: 查詢所有系列（管理員可見全部，客戶僅可見 active）

### Signature

```typescript
export async function getSeries(
  category_id?: string
): Promise<ActionResult<Series[]>>
```

### Input

```typescript
{
  category_id?: string  // 選填：過濾特定分類的系列
}
```

### Output (Success)

```typescript
{
  success: true,
  data: [
    {
      id: "uuid-1",
      category_id: "uuid-cat-1",
      name: "美粒果系列",
      description: "各式果汁飲料",
      image_url: "https://...storage.../series/uuid-1/main.jpg",
      status: "active",
      sort_order: 1,
      created_at: "2026-01-02T10:00:00Z",
      updated_at: "2026-01-02T10:00:00Z"
    }
  ]
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "無權限查詢系列" | "查詢失敗"
}
```

### Authorization

- **客戶**: 僅回傳 `status = 'active'` 的系列
- **管理員**: 回傳所有系列（包含 inactive）

### Validation

- 無需驗證（查詢操作）

---

## getSeriesById

**用途**: 查詢單一系列詳情

### Signature

```typescript
export async function getSeriesById(
  id: string
): Promise<ActionResult<Series>>
```

### Input

```typescript
{
  id: string  // 系列 ID
}
```

### Output (Success)

```typescript
{
  success: true,
  data: {
    id: "uuid-1",
    category_id: "uuid-cat-1",
    name: "美粒果系列",
    description: "各式果汁飲料",
    image_url: "https://...storage.../series/uuid-1/main.jpg",
    status: "active",
    sort_order: 1,
    created_at: "2026-01-02T10:00:00Z",
    updated_at: "2026-01-02T10:00:00Z"
  }
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "系列不存在" | "無權限查看此系列"
}
```

### Authorization

- **客戶**: 僅能查詢 `status = 'active'` 的系列
- **管理員**: 可查詢所有系列

---

## createSeries

**用途**: 建立新系列（僅管理員）

### Signature

```typescript
export async function createSeries(
  data: CreateSeriesInput
): Promise<ActionResult<Series>>
```

### Input

```typescript
{
  category_id: string,      // 所屬分類 ID（可為空字串，表示未分類）
  name: string,             // 系列名稱（必填，最小 1 字元）
  description?: string,     // 系列描述（選填）
  sort_order?: number       // 排序權重（選填，預設 0）
}
```

### Zod Schema

```typescript
// lib/validations/series.schema.ts
export const createSeriesSchema = z.object({
  category_id: z.string().uuid().nullable(),
  name: z.string().min(1, "系列名稱不可為空"),
  description: z.string().optional(),
  sort_order: z.number().int().min(0).default(0)
})
```

### Output (Success)

```typescript
{
  success: true,
  data: {
    id: "uuid-new",
    category_id: "uuid-cat-1",
    name: "美粒果系列",
    description: "各式果汁飲料",
    image_url: null,  // 建立時無圖片
    status: "active",  // 預設 active
    sort_order: 1,
    created_at: "2026-01-02T10:00:00Z",
    updated_at: "2026-01-02T10:00:00Z"
  },
  message: "系列建立成功"
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "無權限建立系列",
  errors: {
    name: ["系列名稱不可為空"],
    category_id: ["分類不存在"]
  }
}
```

### Authorization

- **僅管理員** 可執行

### Side Effects

- `revalidatePath('/admin/series')`: 更新系列列表快取
- `revalidatePath('/store')`: 更新前台系列快取（若 active）

---

## updateSeries

**用途**: 更新系列資訊（僅管理員）

### Signature

```typescript
export async function updateSeries(
  id: string,
  data: UpdateSeriesInput
): Promise<ActionResult<Series>>
```

### Input

```typescript
{
  id: string,               // 系列 ID
  category_id?: string,     // 更新所屬分類（選填）
  name?: string,            // 更新系列名稱（選填）
  description?: string,     // 更新系列描述（選填）
  status?: "active" | "inactive",  // 更新狀態（選填）
  sort_order?: number       // 更新排序權重（選填）
}
```

### Zod Schema

```typescript
export const updateSeriesSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sort_order: z.number().int().min(0).optional()
})
```

### Output (Success)

```typescript
{
  success: true,
  data: {
    id: "uuid-1",
    category_id: "uuid-cat-2",  // 已更新
    name: "美粒果系列（新名稱）",
    description: "各式果汁飲料",
    image_url: "https://...storage.../series/uuid-1/main.jpg",
    status: "active",
    sort_order: 2,
    created_at: "2026-01-02T10:00:00Z",
    updated_at: "2026-01-02T11:00:00Z"  // 自動更新
  },
  message: "系列更新成功"
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "系列不存在" | "無權限更新系列",
  errors: {
    name: ["系列名稱不可為空"]
  }
}
```

### Authorization

- **僅管理員** 可執行

### Side Effects

- `revalidatePath('/admin/series')`: 更新系列列表快取
- `revalidatePath('/store')`: 更新前台系列快取
- `revalidatePath('/store/series/[id]')`: 更新系列詳情頁快取

---

## deleteSeries

**用途**: 刪除系列（僅管理員，需檢查是否有商品）

### Signature

```typescript
export async function deleteSeries(
  id: string
): Promise<ActionResult<void>>
```

### Input

```typescript
{
  id: string  // 系列 ID
}
```

### Output (Success)

```typescript
{
  success: true,
  message: "系列刪除成功"
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "系列不存在" |
           "無權限刪除系列" |
           "無法刪除：此系列下仍有商品，請先刪除或遷移商品"
}
```

### Business Logic

1. 檢查系列是否存在
2. 檢查系列下是否有商品：
   ```sql
   SELECT COUNT(*) FROM products WHERE series_id = $1
   ```
3. 若有商品，拒絕刪除（回傳錯誤訊息）
4. 若無商品，執行刪除

### Authorization

- **僅管理員** 可執行

### Side Effects

- `revalidatePath('/admin/series')`: 更新系列列表快取
- `revalidatePath('/store')`: 更新前台系列快取

---

## uploadSeriesImage

**用途**: 上傳系列主圖（僅管理員）

### Signature

```typescript
export async function uploadSeriesImage(
  series_id: string,
  file: File
): Promise<ActionResult<{ image_url: string }>>
```

### Input

```typescript
{
  series_id: string,  // 系列 ID
  file: File          // 圖片檔案（FormData）
}
```

### Validation

- **檔案格式**: JPG, PNG, WebP
- **檔案大小**: 最大 5MB
- **檔案名稱**: 自動設定為 `main.{ext}`

### Storage Path

```
products/{series_id}/main.{ext}
```

**說明**: 使用與商品圖片相同的 Storage bucket (`products`)，但路徑前綴為 `series/`。

### Output (Success)

```typescript
{
  success: true,
  data: {
    image_url: "https://...storage.../products/series/uuid-1/main.jpg"
  },
  message: "圖片上傳成功"
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "系列不存在" |
           "無權限上傳圖片" |
           "圖片格式不支援（僅支援 JPG, PNG, WebP）" |
           "圖片大小超過 5MB"
}
```

### Business Logic

1. 檢查系列是否存在
2. 驗證檔案格式與大小
3. 上傳到 Supabase Storage（`upsert: true`，覆寫舊圖）
4. 更新 `series.image_url` 欄位
5. 回傳公開 URL

### Authorization

- **僅管理員** 可執行

### Side Effects

- 更新 `series.image_url` 欄位
- 覆寫舊圖片（若存在）
- `revalidatePath('/admin/series/[id]')`: 更新系列編輯頁快取
- `revalidatePath('/store')`: 更新前台系列快取

---

## Error Codes

| Code | Message | HTTP Equivalent |
|------|---------|----------------|
| `UNAUTHORIZED` | 無權限執行此操作 | 403 Forbidden |
| `NOT_FOUND` | 系列不存在 | 404 Not Found |
| `VALIDATION_ERROR` | 輸入資料格式錯誤 | 400 Bad Request |
| `CONFLICT` | 系列下仍有商品，無法刪除 | 409 Conflict |
| `FILE_TOO_LARGE` | 圖片大小超過 5MB | 413 Payload Too Large |
| `UNSUPPORTED_FORMAT` | 圖片格式不支援 | 415 Unsupported Media Type |

---

## Usage Examples

### 建立系列

```typescript
// app/(admin)/admin/series/new/page.tsx
const result = await createSeries({
  category_id: "uuid-cat-1",
  name: "美粒果系列",
  description: "各式果汁飲料",
  sort_order: 1
})

if (result.success) {
  router.push('/admin/series')
}
```

### 上傳系列圖片

```typescript
// components/admin/SeriesForm.tsx
const handleUpload = async (file: File) => {
  const result = await uploadSeriesImage(series.id, file)
  if (result.success) {
    setImageUrl(result.data.image_url)
  }
}
```

---

## Testing Checklist

- [ ] 客戶無法建立/更新/刪除系列
- [ ] 客戶僅能查詢 active 系列
- [ ] 管理員可查詢所有系列（包含 inactive）
- [ ] 系列下有商品時，刪除被拒絕
- [ ] 圖片上傳驗證（格式、大小）
- [ ] 圖片覆寫模式（上傳新圖覆寫舊圖）

---

## Dependencies

- `lib/actions/helpers.ts`: `checkAuth()`, `ActionResult<T>`
- `lib/validations/series.schema.ts`: Zod schemas
- `lib/supabase/server.ts`: `createClient()`
- `lib/supabase/storage.ts`: `uploadFile()`
