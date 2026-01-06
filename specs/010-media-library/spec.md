# 010-media-library: Supabase Storage 圖片管理系統

**功能編號**: 010-media-library
**優先級**: P2（未來規劃）
**預估工時**: 10-13 天
**狀態**: 📋 規劃中
**建立日期**: 2026-01-06

---

## 📋 目錄

1. [專案背景](#專案背景)
2. [核心問題分析](#核心問題分析)
3. [解決方案設計](#解決方案設計)
4. [實作階段規劃](#實作階段規劃)
5. [技術架構](#技術架構)
6. [安全性考量](#安全性考量)
7. [附錄：備份匯出方案](#附錄備份匯出方案)

---

## 專案背景

### 當前圖片上傳架構

**Storage Bucket**: 單一 `products` bucket，所有圖片分資料夾存放

**路徑結構**:
- 商品: `{productId}/main.{ext}`
- 系列: `series/{seriesId}/main.{ext}`
- 廣告: `announcements/{announcementId}/main.{ext}`
- Logo: `system/{logoType}.{ext}`

**現有實作檔案**:
- `lib/actions/products.ts` - uploadProductImage()
- `lib/actions/series.ts` - uploadSeriesImage()
- `lib/actions/announcements.ts` - uploadAnnouncementImage()
- `lib/actions/system.ts` - uploadLogo()

---

## 核心問題分析

### 問題 1: DB 重置時圖片的命運

**現象**: 執行 `supabase db reset` 後，圖片 URL 丟失

```
資料庫 (PostgreSQL)          ⟷  Supabase Storage (Object Storage)
 ├─ products 表                    ├─ products bucket
 │   └─ image_url: "https://..."   │   └─ {productId}/main.jpg
 └─ series 表                      └─ series/{seriesId}/main.jpg
     └─ image_url: "https://..."
```

**執行 `supabase db reset` 時**:
- ✅ 資料庫表格被清空 → `image_url` 欄位遺失
- ❌ Storage 檔案**不受影響**（Storage 與 DB 獨立）

**驗證方式**:
```bash
# 在 Supabase Studio 中查看
Storage → products bucket → 會看到孤兒檔案
```

**影響範圍**: 🟡 中等
- 圖片不會丟失（好消息）
- 但失去關聯，無法透過資料庫找回（需手動管理）
- 長期累積會造成 Storage 空間浪費

---

### 問題 2: 缺乏統一的圖片管理介面

**當前痛點**:
1. ❌ 無法瀏覽已上傳的所有圖片
2. ❌ 無法搜尋/篩選圖片
3. ❌ 無法識別未使用的圖片（孤兒檔案）
4. ❌ 無法批次上傳圖片
5. ❌ 重複上傳相同圖片浪費儲存空間

**需求目標**:
- 類似 WordPress 的媒體庫管理介面
- 支援圖片瀏覽、搜尋、篩選
- 支援批次上傳與管理
- 自動追蹤圖片使用狀況

---

### 問題 3: DB 重置後圖片重新關聯困難

**當前流程問題**:
```
DB Reset → image_url 清空 → 前端看不到圖片
                          ↓
                      手動重新上傳（即使 Storage 已有相同檔案）
```

**期望流程**:
```
DB Reset → image_url 清空 → 從媒體庫選擇現有圖片
                          ↓
                      直接關聯，無需重新上傳
```

---

## 解決方案設計

### 核心設計：專屬媒體庫系統

#### 資料表設計

```sql
CREATE TABLE media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 檔案基本資訊
  file_name TEXT NOT NULL,              -- 原始檔名
  file_path TEXT NOT NULL UNIQUE,       -- Storage 路徑: products/abc123/main.jpg
  file_url TEXT NOT NULL,               -- 完整公開 URL
  file_type TEXT NOT NULL,              -- MIME type: image/jpeg
  file_size INTEGER NOT NULL,           -- 檔案大小（bytes）

  -- 圖片元數據
  width INTEGER,                        -- 圖片寬度
  height INTEGER,                       -- 圖片高度
  alt_text TEXT,                        -- SEO 替代文字

  -- 使用狀態追蹤
  reference_type TEXT,                  -- 'product', 'series', 'announcement', 'system'
  reference_id TEXT,                    -- 外部關聯 ID
  is_orphan BOOLEAN DEFAULT FALSE,      -- 孤兒檔案標記

  -- 系統欄位
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引優化
CREATE INDEX idx_media_file_path ON media_library(file_path);
CREATE INDEX idx_media_reference ON media_library(reference_type, reference_id);
CREATE INDEX idx_media_orphan ON media_library(is_orphan) WHERE is_orphan = TRUE;
CREATE INDEX idx_media_type ON media_library(file_type);
CREATE INDEX idx_media_created ON media_library(created_at DESC);
```

---

## 實作階段規劃

### Phase 1: 基礎媒體庫（P0 核心）- 4-5 天

**目標**: 建立媒體庫基礎架構，解決 DB 重置後圖片失聯問題

**實作項目**:
1. ✅ 資料表建立 + Migration
2. ✅ 修改現有上傳邏輯同步寫入 `media_library`
3. ✅ 基礎媒體庫列表頁（唯讀）
4. ✅ 孤兒檔案掃描功能

**成果**:
- ✅ 所有圖片上傳自動記錄到媒體庫
- ✅ 可查看所有已上傳圖片
- ✅ 可識別孤兒檔案

---

### Phase 2: 圖片選擇器（P1 重要）- 2-3 天

**目標**: 提供「從媒體庫選擇」功能，避免重複上傳

**實作項目**:
1. ✅ MediaPicker 元件
2. ✅ 整合到 ProductForm / SeriesForm
3. ✅ 支援即時上傳（在選擇器內）

**成果**:
- ✅ 避免重複上傳相同圖片
- ✅ 零流量消耗（使用現有圖片）

---

### Phase 3: 批次上傳與管理（P1 重要）- 3-4 天

**目標**: 完整的 WordPress 級媒體庫體驗

**實作項目**:
1. ✅ 批次上傳 UI
2. ✅ 圖片詳情編輯
3. ✅ 圖片刪除功能
4. ✅ 網格/列表視圖切換

---

### Phase 4: ZIP 匯出匯入（P2 可選）- 4-5 天

**目標**: 完整的資料備份方案（含圖片）

**實作項目**:
1. ✅ ZIP 匯出功能
2. ✅ ZIP 匯入功能
3. ✅ ID 對應處理

**詳細設計**: 見規格文件附錄

---

## 技術架構

### 所需套件

```json
{
  "dependencies": {
    "jszip": "^3.10.1",
    "react-dropzone": "^14.2.3"
  }
}
```

### 檔案結構

```
app/(admin)/admin/media/
components/admin/media/
lib/actions/media.ts
lib/validations/media.schema.ts
types/media.ts
supabase/migrations/20260106_create_media_library.sql
```

---

## 總結

### 功能難度評估

| 階段 | 難度 | 工時 |
|------|-----|------|
| Phase 1 | 🟢 簡單 | 4-5 天 |
| Phase 2 | 🟢 簡單 | 2-3 天 |
| Phase 3 | 🟡 中等 | 3-4 天 |
| Phase 4 | 🟡 中等 | 4-5 天 |

**總計工時**: 10-13 天（分階段實作）

---

**文件版本**: 1.0.0
**最後更新**: 2026-01-06
**狀態**: 📋 規劃完成，待排程實作
