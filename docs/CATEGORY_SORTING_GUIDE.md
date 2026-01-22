# 分類拖曳排序功能使用指南

## 功能概述

分類管理頁面現在支援拖曳排序功能，管理員可以透過拖曳的方式調整分類的顯示順序。排序會自動套用到所有使用分類的地方。

## 使用方式

### 桌面版（lg 以上）

1. 進入「商品分類管理」頁面 (`/admin/categories`)
2. 在表格的「排序」欄位，找到拖曳手把圖示（⋮⋮）
3. 按住拖曳手把，上下拖曳分類項目
4. 放開滑鼠後，系統會自動儲存新的排序
5. 看到「排序更新成功」的提示訊息

### 手機版（lg 以下）

1. 進入「商品分類管理」頁面 (`/admin/categories`)
2. 在每個分類卡片的左上角，找到拖曳手把圖示（⋮⋮）
3. 按住拖曳手把，上下拖曳分類卡片
4. 放開手指後，系統會自動儲存新的排序
5. 看到「排序更新成功」的提示訊息

## 技術細節

### 排序規則

- 分類會依據 `sort_order` 欄位排序（數字越小越前面）
- 若 `sort_order` 相同，則依 `created_at` 排序
- 拖曳後會自動重新計算所有分類的 `sort_order`

### 自動套用範圍

排序會自動套用到以下地方：
1. ✅ 後台分類管理頁面 (`/admin/categories`)
2. ✅ 後台系列管理頁面 (`/admin/series`) - 分類篩選下拉選單
3. ✅ 後台商品管理頁面 (`/admin/products`) - 分類篩選下拉選單
4. ✅ 前台商品列表頁面 (`/store`) - 分類篩選按鈕

### 資料庫結構

```sql
-- categories 表已包含 sort_order 欄位
ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
COMMENT ON COLUMN categories.sort_order IS '排序順序（數字越小越前面）';
```

### Server Action

```typescript
// 批次更新分類排序
export async function updateCategoriesOrder(
  categoryOrders: Array<{ id: string; sort_order: number }>
): Promise<ActionResult>
```

### UI 元件

- 使用 `@dnd-kit/core` 和 `@dnd-kit/sortable` 實作拖曳功能
- 拖曳時會有視覺回饋（透明度 50%）
- 儲存時會顯示「儲存排序中...」的提示
- 失敗時會自動還原排序

## 測試清單

### 功能測試

- [ ] 拖曳分類項目，排序立即更新
- [ ] 放開滑鼠/手指後，顯示「排序更新成功」提示
- [ ] 重新整理頁面，排序保持不變
- [ ] 前台商品列表的分類篩選按鈕順序正確
- [ ] 後台系列管理的分類下拉選單順序正確
- [ ] 後台商品管理的分類下拉選單順序正確

### 桌面版測試

- [ ] 拖曳手把圖示正確顯示在「排序」欄位
- [ ] 滑鼠 hover 時手把圖示變色
- [ ] 拖曳時游標變為 `grabbing`
- [ ] 拖曳項目透明度正確（50%）

### 手機版測試

- [ ] 拖曳手把圖示正確顯示在卡片左上角
- [ ] 觸控拖曳流暢，沒有誤觸問題
- [ ] 拖曳項目透明度正確（50%）

### 錯誤處理測試

- [ ] 拖曳失敗時，顯示錯誤訊息
- [ ] 拖曳失敗時，排序還原到原始狀態
- [ ] 網路中斷時，顯示適當錯誤訊息

## 常見問題

### Q: 拖曳後沒有儲存成功怎麼辦？

A: 系統會自動還原排序，並顯示錯誤訊息。請檢查網路連線或聯絡系統管理員。

### Q: 可以一次拖曳多個分類嗎？

A: 目前不支援多選拖曳，一次只能拖曳一個分類項目。

### Q: 排序會影響資料庫效能嗎？

A: 不會。`sort_order` 欄位已建立索引，查詢效能不受影響。

### Q: 新增的分類會出現在哪裡？

A: 新增的分類 `sort_order` 預設為 0，會出現在最前面。建議新增後立即拖曳到適當位置。

## 相關檔案

- Server Action: `lib/actions/categories.ts`
- UI 元件: `components/admin/category-table.tsx`
- 型別定義: `types/index.ts`
- Migration: `supabase/migrations/20260107140248_fix_categories_missing_sort_order.sql`

## 更新日誌

### 2026-01-11
- ✅ 新增分類拖曳排序功能
- ✅ 支援桌面版與手機版
- ✅ 自動套用到所有使用分類的地方
- ✅ TypeScript 型別檢查通過
- ✅ ESLint 檢查通過
