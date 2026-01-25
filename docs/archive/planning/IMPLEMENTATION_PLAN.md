# Vsale-lite 系統擴充功能實作計畫

**建立日期**: 2026-01-03
**當前分支**: 005-reports-analytics
**預估工作量**: 12-15 小時
**優先級**: P0 (核心擴充功能)

---

## 一、需求總覽

基於使用者需求與探索結果，本計畫實作以下功能：

### A. 價格機制優化
- **A1**: 價格管理頁面新增「選擇商品」模式（現有僅支援「選擇系列」）
- **零售價格政策**: 可在商品編輯頁修改，但在價格管理頁面保持唯讀/隱藏

### B. 訂單留言系統（雙向對話）
- 擴充 `order_timelines` 表支援 `action_type = 'comment'`
- 客戶與管理員可在訂單詳情頁新增留言
- 保留原始 `orders.notes`（下單時的初始備註），與留言分開顯示
- 時間軸式 UI，左右氣泡區分角色

### C. 客戶管理擴充
- 新增 `profiles.address` 欄位（常用地址）
- 重新命名 `profiles.notes` → `admin_notes`（管理員備註）
- 客戶管理列表顯示地址與備註摘要
- 訂單詳情頁顯示客戶地址與備註（含快速跳轉編輯）

### D. 系列頁圖片切換
- 系列頁預設顯示系列圖片（大圖置頂）
- 點擊商品卡片 → 大圖切換為商品圖片（若有）
- 點擊空白處或 X 按鈕 → 恢復系列圖片
- 若商品無圖片，卡片禁用點擊效果

### E. 廣告輪播系統
- **前台**: 首頁頂部嵌入輪播元件（3-5 則廣告）
- **後台**: 完整廣告管理（新增/編輯/刪除/排序/啟用）
- 支援圖片上傳到 Supabase Storage
- 支援超連結設定（選填）

---

## 二、技術架構決策

### 2.1 資料庫變更

#### Migration 1: 客戶擴充欄位
**檔案**: `supabase/migrations/20260109_profiles_address_and_admin_notes.sql`

```sql
-- 新增地址欄位
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- 重新命名 notes → admin_notes
ALTER TABLE profiles RENAME COLUMN notes TO admin_notes;
```

**影響範圍**:
- ✅ 向後相容（僅新增與重新命名）
- ⚠️ 需更新 TypeScript 型別 (`types/index.ts`)
- ⚠️ 需更新現有 Server Actions 引用 `notes` 的地方（改為 `admin_notes`）

---

#### Migration 2: 訂單留言系統
**檔案**: `supabase/migrations/20260109_order_timelines_comment_support.sql`

```sql
-- 擴充 action_type 支援 'comment'
ALTER TABLE order_timelines
  DROP CONSTRAINT IF EXISTS order_timelines_action_type_check;

ALTER TABLE order_timelines
  ADD CONSTRAINT order_timelines_action_type_check
  CHECK (action_type IN ('created', 'status_changed', 'cancelled', 'comment'));

-- 建立索引優化留言查詢
CREATE INDEX IF NOT EXISTS idx_order_timelines_comment
  ON order_timelines(order_id, action_type)
  WHERE action_type = 'comment';
```

**技術決策**:
- ✅ 重用 `order_timelines` 表（無需新建 `order_comments` 表）
- ✅ 使用 `actor_role` 區分留言來源（'client' / 'admin'）
- ✅ RLS 策略已相容（客戶可查看自己訂單的所有 timelines）

---

#### Migration 3: 廣告輪播系統
**檔案**: `supabase/migrations/20260109_announcements_system.sql`

```sql
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 建立索引
CREATE INDEX idx_announcements_active_sort
  ON announcements(is_active, sort_order)
  WHERE is_active = true;

-- RLS 策略
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 客戶可查看啟用的廣告
CREATE POLICY "Authenticated users can view active announcements"
  ON announcements FOR SELECT TO authenticated
  USING (is_active = true);

-- 管理員可管理所有廣告
CREATE POLICY "Admins can manage all announcements"
  ON announcements FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
```

**Supabase Storage**:
- 新建 bucket: `announcements`（公開讀取）
- 路徑格式: `{announcementId}/main.{ext}`

---

### 2.2 Server Actions 清單

#### 新增檔案

**1. `lib/actions/order-comments.ts`**
- `addOrderComment(orderId, message)` - 新增訂單留言
  - 驗證權限（客戶僅能在自己訂單留言）
  - 插入 `order_timelines` (action_type='comment')
  - 重新驗證快取

**2. `lib/actions/announcements.ts`**
- `getAnnouncements(adminMode)` - 查詢廣告列表
- `createAnnouncement(data)` - 建立廣告
- `updateAnnouncement(id, data)` - 更新廣告
- `deleteAnnouncement(id)` - 刪除廣告（含 Storage 圖片）
- `uploadAnnouncementImage(announcementId, file)` - 上傳圖片

---

#### 修改檔案

**3. `lib/actions/clients.ts`**
- 修改 `getClients()` 查詢新增 `address`, `admin_notes` 欄位
- 新增 `updateClientNotes(clientId, { address, admin_notes })` - 更新客戶地址與備註

**4. `lib/actions/orders.ts`**
- 修改 `getOrderById()` 查詢新增客戶 `address`, `admin_notes` 欄位（用於訂單詳情頁顯示）

---

### 2.3 UI 元件架構

#### 訂單留言系統

**新增元件**:
- `components/admin/order-comment-input.tsx` - 留言輸入框（客戶與管理員共用）
  - 500 字限制
  - 即時字數統計
  - Loading 與錯誤處理

**修改元件**:
- `components/admin/order-timeline.tsx` - 時間軸元件
  - 擴充 `ACTION_TYPE_CONFIG` 支援 `'comment'`
  - 留言氣泡設計（左右區分角色）
    - 客戶留言：靠左，灰色背景
    - 管理員留言：靠右，藍色背景
  - 顯示發言人姓名與角色標籤

**頁面整合**:
- `app/(admin)/admin/orders/[id]/page.tsx` - 管理端訂單詳情
  - 保留「客戶備註」區塊（`orders.notes`）
  - 新增「操作歷史與留言」區塊（含 `OrderCommentInput`）

- `app/(shop)/store/orders/[id]/page.tsx` - 客戶端訂單詳情
  - 同樣結構，但 UI 簡化

---

#### 客戶管理擴充

**修改元件**:
- `components/admin/client-table.tsx` - 客戶列表表格
  - 新增「地址」與「備註」欄位（摘要顯示，最多 30 字）

**修改頁面**:
- `app/(admin)/admin/clients/[id]/edit/page.tsx` - 客戶編輯頁面
  - 新增「常用地址」textarea（3 行）
  - 新增「管理員備註」textarea（3 行）

- `app/(admin)/admin/orders/[id]/page.tsx` - 管理端訂單詳情
  - 客戶資訊區塊新增「常用地址」與「管理員備註」顯示
  - 新增「編輯客戶資料」快速跳轉按鈕

---

#### 系列頁圖片切換

**修改頁面**:
- `app/(shop)/store/series/[id]/page.tsx` - 系列詳情頁
  - 改為 Client Component（使用 `'use client'`）
  - 使用 `useState` 管理選中圖片狀態
    ```typescript
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [selectedProductName, setSelectedProductName] = useState<string | null>(null)
    const currentImage = selectedImage || series.image_url || '/placeholder.jpg'
    ```
  - 頂部新增大圖區域（aspect-video，1200x400）
  - 商品卡片新增 onClick 事件（若有 `image_url`）
  - 固定背景遮罩層（點擊恢復系列圖片）

**設計細節**:
- 圖片切換動畫：`transition-opacity duration-300`
- 若商品無圖片：卡片 `opacity-50` 且 `cursor-default`
- 選中商品時，大圖右上角顯示 X 按鈕

---

#### 廣告輪播系統

**前台元件**:

**1. `components/shop/announcement-carousel.tsx`** - 輪播元件
- 左右箭頭切換
- 指示器顯示當前頁數（圓點）
- 自動播放（選用，5 秒切換）
- 點擊圖片跳轉連結（若有設定 `link_url`）

**頁面整合**:
- `app/(shop)/store/page.tsx` - 前台首頁
  - 系列列表上方嵌入 `AnnouncementCarousel`
  - 查詢啟用的廣告（`getAnnouncements(false)`）
  - 限制顯示最多 5 則

---

**後台元件**:

**1. `components/admin/announcement-table.tsx`** - 廣告列表表格
- 顯示縮圖、標題、連結、排序、狀態
- 快速啟用/停用按鈕
- 編輯與刪除按鈕

**2. `components/admin/announcement-form.tsx`** - 廣告表單
- 圖片上傳（Drag & Drop）
- 標題、連結、排序設定
- 即時預覽

**頁面**:
- `app/(admin)/admin/announcements/page.tsx` - 廣告管理列表
- `app/(admin)/admin/announcements/new/page.tsx` - 新增廣告
- `app/(admin)/admin/announcements/[id]/edit/page.tsx` - 編輯廣告

**側邊欄導航**:
- `app/(admin)/admin/layout.tsx` 新增「廣告管理」選單項目

---

#### 價格管理優化

**修改頁面**:
- `app/(admin)/admin/pricing/page.tsx` - 價格管理頁面
  - 使用 Tabs 元件切換模式
    - Tab 1: 選擇系列（現有功能）
    - Tab 2: 選擇商品（新功能）
  - 使用 `searchParams.mode` 控制預設 Tab

**新增元件**:
- `components/admin/product-selector.tsx` - 商品選擇器（下拉選單）
- `components/admin/product-price-table.tsx` - 單一商品價格表格
  - 顯示一個商品 × 所有等級的價格矩陣
  - 零售等級價格欄位唯讀（顯示但禁用輸入）

---

## 三、實作階段規劃

### Phase 1: 資料庫 Migration（2 小時）

**任務清單**:
1. ✅ 建立 `20260109_profiles_address_and_admin_notes.sql`
2. ✅ 建立 `20260109_order_timelines_comment_support.sql`
3. ✅ 建立 `20260109_announcements_system.sql`
4. ✅ 手動建立 Supabase Storage bucket: `announcements`
5. ✅ 執行 `supabase db reset` 測試 Migration
6. ✅ 更新 TypeScript 型別定義 (`types/index.ts`)

**驗收標準**:
- Migration 無錯誤執行
- `profiles.admin_notes` 與 `address` 欄位存在
- `order_timelines` 支援 `action_type = 'comment'`
- `announcements` 表與 RLS 策略正常

---

### Phase 2: Server Actions 實作（3 小時）

**任務清單**:
1. ✅ 新增 `lib/actions/order-comments.ts`
2. ✅ 修改 `lib/actions/clients.ts`（新增欄位查詢 + updateClientNotes）
3. ✅ 修改 `lib/actions/orders.ts`（getOrderById 新增客戶欄位）
4. ✅ 新增 `lib/actions/announcements.ts`
5. ✅ 新增 Zod Schema 驗證（`lib/validations/announcement.schema.ts`）

**驗收標準**:
- 所有 Server Actions 通過 TypeScript 型別檢查
- 包含完整錯誤處理與權限驗證
- 執行 `revalidatePath()` 更新快取

---

### Phase 3: UI 元件實作（5 小時）

**任務清單**:

#### 3.1 訂單留言系統（1.5 小時）
1. ✅ 新增 `components/admin/order-comment-input.tsx`
2. ✅ 修改 `components/admin/order-timeline.tsx`（留言氣泡設計）
3. ✅ 整合到訂單詳情頁（客戶端與管理端）

#### 3.2 客戶管理擴充（1 小時）
1. ✅ 修改 `components/admin/client-table.tsx`（新增欄位）
2. ✅ 修改客戶編輯頁面表單
3. ✅ 修改訂單詳情頁客戶資訊區塊

#### 3.3 系列頁圖片切換（1 小時）
1. ✅ 修改 `app/(shop)/store/series/[id]/page.tsx`
2. ✅ 新增圖片切換邏輯（useState）
3. ✅ 優化點擊互動（hover 效果、禁用狀態）

#### 3.4 廣告輪播系統（1.5 小時）
1. ✅ 新增 `components/shop/announcement-carousel.tsx`
2. ✅ 整合到前台首頁 (`app/(shop)/store/page.tsx`)
3. ✅ 新增 `components/admin/announcement-table.tsx`
4. ✅ 新增 `components/admin/announcement-form.tsx`
5. ✅ 建立後台管理頁面（列表、新增、編輯）
6. ✅ 側邊欄新增「廣告管理」選單項目

#### 3.5 價格管理優化（30 分鐘）
1. ✅ 修改 `app/(admin)/admin/pricing/page.tsx`（Tabs 切換）
2. ✅ 新增 `components/admin/product-selector.tsx`
3. ✅ 新增 `components/admin/product-price-table.tsx`

**驗收標準**:
- 所有元件符合 Neo-Brutalism 設計風格
- RWD 響應式設計（手機、平板、桌面）
- Loading 與錯誤狀態處理完整

---

### Phase 4: 整合測試（2 小時）

**測試場景**:

#### 4.1 訂單留言系統
- ✅ 客戶在自己訂單留言成功
- ❌ 客戶無法在他人訂單留言（403 錯誤）
- ✅ 管理員可在任何訂單留言
- ✅ 留言時間軸正確顯示（區分角色）
- ✅ 原始備註 (`orders.notes`) 與留言分開顯示

#### 4.2 客戶管理擴充
- ✅ 管理員編輯客戶地址與備註成功
- ❌ 客戶端無法查看 `admin_notes` 欄位（RLS 阻擋）
- ✅ 訂單詳情頁正確顯示客戶資訊
- ✅ 快速跳轉編輯客戶按鈕正常

#### 4.3 系列頁圖片切換
- ✅ 點擊有圖片的商品卡片，大圖切換
- ✅ 點擊無圖片的商品卡片，無反應
- ✅ 點擊空白處或 X 按鈕，恢復系列圖片
- ✅ 圖片切換動畫流暢

#### 4.4 廣告輪播系統
- ✅ 前台首頁顯示啟用的廣告
- ✅ 左右箭頭切換正常
- ✅ 點擊圖片跳轉連結（若有設定）
- ✅ 管理員可新增/編輯/刪除廣告
- ✅ 圖片上傳成功並顯示

#### 4.5 價格管理優化
- ✅ Tab 切換「選擇系列」與「選擇商品」
- ✅ 零售價格欄位唯讀（顯示但禁用）
- ✅ 批量儲存成功

---

### Phase 5: 文件與部署（1 小時）

**任務清單**:
1. ✅ 更新 `CLAUDE.md`（新功能說明）
2. ✅ 建立 Migration 執行指南（本地與雲端）
3. ✅ 部署檢查清單
4. ✅ Git Commit（繁體中文）

**Commit Message 範例**:
```
feat: 完成系統擴充功能（訂單留言、客戶管理、廣告輪播、圖片切換）

- 新增訂單留言系統（雙向對話，保留原始備註）
- 新增客戶地址與管理員備註欄位
- 新增廣告輪播系統（前台首頁嵌入，後台完整管理）
- 新增系列頁商品圖片切換功能
- 優化價格管理頁面（新增「選擇商品」模式）

資料庫變更：
- profiles: 新增 address, 重新命名 notes → admin_notes
- order_timelines: 支援 action_type = 'comment'
- announcements: 新增廣告輪播表與 Storage bucket

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## 四、關鍵檔案清單

### 必須修改的檔案（Critical Files）

#### 資料庫
1. `supabase/migrations/20260109_profiles_address_and_admin_notes.sql` - 新增
2. `supabase/migrations/20260109_order_timelines_comment_support.sql` - 新增
3. `supabase/migrations/20260109_announcements_system.sql` - 新增

#### Server Actions
4. `lib/actions/order-comments.ts` - 新增
5. `lib/actions/announcements.ts` - 新增
6. `lib/actions/clients.ts` - 修改（新增欄位查詢）
7. `lib/actions/orders.ts` - 修改（getOrderById 擴充）

#### 型別定義
8. `types/index.ts` - 修改（Profile, OrderTimeline, Announcement 型別）

#### UI 元件
9. `components/admin/order-comment-input.tsx` - 新增
10. `components/admin/order-timeline.tsx` - 修改（留言氣泡）
11. `components/shop/announcement-carousel.tsx` - 新增
12. `components/admin/announcement-table.tsx` - 新增
13. `components/admin/announcement-form.tsx` - 新增
14. `components/admin/client-table.tsx` - 修改（新增欄位）

#### 頁面
15. `app/(shop)/store/page.tsx` - 修改（嵌入廣告輪播）
16. `app/(shop)/store/series/[id]/page.tsx` - 修改（圖片切換）
17. `app/(admin)/admin/orders/[id]/page.tsx` - 修改（客戶資訊、留言區塊）
18. `app/(shop)/store/orders/[id]/page.tsx` - 修改（留言區塊）
19. `app/(admin)/admin/clients/[id]/edit/page.tsx` - 修改（新增欄位）
20. `app/(admin)/admin/pricing/page.tsx` - 修改（Tabs 切換）
21. `app/(admin)/admin/announcements/page.tsx` - 新增
22. `app/(admin)/admin/announcements/new/page.tsx` - 新增
23. `app/(admin)/admin/announcements/[id]/edit/page.tsx` - 新增
24. `app/(admin)/admin/layout.tsx` - 修改（側邊欄新增項目）

#### 其他
25. `components/admin/product-selector.tsx` - 新增
26. `components/admin/product-price-table.tsx` - 新增
27. `lib/validations/announcement.schema.ts` - 新增

**檔案總數**: 27 個（12 新增，15 修改）

---

## 五、風險評估與緩解策略

### 風險 1: Migration 執行失敗
**緩解策略**:
- Migration 前備份資料庫（`supabase db dump`）
- 本地測試後再推送雲端（`supabase db push`）

### 風險 2: RLS 策略過於寬鬆
**緩解策略**:
- 嚴格限制 `admin_notes` 與 `address` 僅管理員可查看
- 整合測試驗證權限邊界（客戶無法訪問他人資料）

### 風險 3: 圖片上傳失敗
**緩解策略**:
- 手動建立 `announcements` bucket 並設定 RLS Policy
- 測試圖片上傳前驗證 bucket 存在

### 風險 4: 圖片切換效能問題
**緩解策略**:
- 使用 Next.js `Image` 元件（自動優化）
- 預載入第一張圖片（`priority` 屬性）

---

## 六、憲章符合性檢查

### I. 使用者角色優先 ✅
- 訂單留言、客戶管理、廣告輪播均嚴格區分角色權限

### II. 等級綁定價格 ✅
- 零售價格保持固定（商品編輯頁可修改，價格管理頁唯讀）

### III. 使用者故事驅動開發 ✅
- 每個功能可獨立測試與交付

### IV. API 模組化與職責分離 ✅
- 所有資料操作透過 Server Actions

### V. 設計系統一致性 ✅
- 所有新元件遵循 Neo-Brutalism 風格

### VI. 負庫存支援 ✅
- 無影響

**結論**: ✅ 所有功能均符合專案憲章

---

## 七、使用者回答摘要

1. **零售價格**: 可在商品編輯頁修改，價格管理頁唯讀/隱藏
2. **訂單備註**: 保留原始備註，與留言分開顯示
3. **廣告位置**: 首頁頂部輪播（系列列表上方）
4. **圖片切換**: 點擊商品卡片切換（含點擊空白處恢復）

---

**計畫版本**: 1.0
**預估完成時間**: 12-15 小時
**建議實作順序**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
