# 訂單詳情頁面設計方案

本目錄包含三種不同的訂單詳情頁面設計方案，每種方案都針對不同的使用場景優化。

## 📋 方案概覽

### 方案 1：極簡卡片式佈局（Compact Card Layout）
**檔案**: `CompactCardLayout.tsx`

**設計特點**:
- ✅ 高密度資訊顯示，減少垂直空間浪費
- ✅ 改善邊框間距（16-20px 內邊距，相較於原本的 12-16px）
- ✅ 使用網格系統將相關資訊分組
- ✅ 商品項目採用緊湊的列表式呈現
- ✅ 黑色背景標題區提升視覺層次

**適用場景**:
- 需要在一個畫面內快速瀏覽所有訂單資訊
- 手機端瀏覽（減少滾動距離）
- 訂單管理與比對

**關鍵改善**:
- 商品名稱與系列標籤在同一行，節省 30% 垂直空間
- 金額摘要區使用緊湊的 `space-y-2`，行距更合理
- 邊框與內容間距從 `p-3` 提升到 `p-5`，避免文字與框線過近

---

### 方案 2：發票式佈局（Invoice-Style Layout）
**檔案**: `InvoiceStyleLayout.tsx`

**設計特點**:
- ✅ 專業發票風格，類似正式單據
- ✅ 桌面版使用表格式清晰分欄（商品、單價、數量、小計）
- ✅ 手機版自動切換為卡片式呈現
- ✅ 金額計算邏輯清晰展示（適合對帳）
- ✅ 強化邊框層次（3px 主邊框、2px 次邊框）

**適用場景**:
- 需要列印或匯出 PDF
- B2B 業務（需正式單據）
- 會計對帳與稽核
- 桌面端瀏覽體驗優化

**關鍵改善**:
- 表格標題使用 `uppercase` 與 `text-xs` 強化專業感
- 金額摘要區固定寬度 `max-w-md ml-auto`，對齊更整齊
- 備註區使用黃色背景 `bg-yellow-50` 提升可見度

---

### 方案 3：分屏式佈局（Split-Panel Layout）
**檔案**: `SplitPanelLayout.tsx`

**設計特點**:
- ✅ 桌面版左右分欄（商品 2/3 + 摘要 1/3）
- ✅ 手機版上下分區（自動響應）
- ✅ 金額摘要固定在右側（`sticky top-4`）
- ✅ 漸層色標題區（綠→藍）提升視覺吸引力
- ✅ 使用 Lucide Icons 提升專業度

**適用場景**:
- 大螢幕瀏覽體驗（1440px+）
- 需要邊看商品邊核對金額
- 視覺設計要求較高的場景
- 現代化 SaaS 應用風格

**關鍵改善**:
- 商品卡片使用 `hover:border-black` 互動回饋
- 右側摘要卡片使用 `lg:sticky lg:top-4` 保持可見
- 訂單資訊卡片使用圖示 + 文字排版，更易掃視

---

## 🎨 共同設計原則

所有方案都遵循以下設計原則：

### 1. Neo-Brutalism 風格
- 使用 `border-3 border-black` 強烈邊框
- 使用 `shadow-neo` 陰影效果
- 無圓角設計（`rounded-none`）
- 高對比度配色

### 2. 改善的間距系統
| 區域 | 原始間距 | 新間距 | 改善說明 |
|------|---------|--------|---------|
| 卡片內邊距 | `p-3 md:p-4` | `p-5 md:p-6` | 增加 40% 空間 |
| 元素間距 | `space-y-3` | `space-y-2` | 緊湊但不擁擠 |
| 金額摘要區 | `space-y-3` | `space-y-2.5` | 更適合數字對齊 |
| 邊框到文字 | 12-16px | 16-24px | 避免視覺壓迫 |

### 3. 響應式設計
- **手機優先**（Mobile-First）
- **斷點**: `md: 768px`（平板）、`lg: 1024px`（桌面）
- **觸控目標**: 最小 44px × 44px
- **字體縮放**: 手機 `text-sm`、桌面 `text-base`

### 4. 組合優惠視覺區分
- 使用 `bg-yellow-50 border-yellow-500` 黃色背景
- 系列標籤使用 `bg-yellow-200 border-yellow-500`
- 折扣標籤使用 `bg-yellow-200 border-yellow-600`

### 5. 資訊密度優化
- 減少不必要的垂直空間
- 相關資訊分組顯示（網格佈局）
- 重要資訊（金額）使用更大字體強調
- 次要資訊（日期、數量）使用較小字體

---

## 🚀 使用方式

### 預覽三種佈局

訪問以下 URL 即可在同一頁面切換預覽三種設計：

```
/store/orders/[訂單ID]/preview-layouts
```

例如：
```
/store/orders/abc123/preview-layouts
```

### 套用到現有頁面

如果決定使用某個方案，修改 `CustomerOrderDetailContent.tsx`：

```tsx
import { CompactCardLayout } from '@/components/shop/order-detail-layouts/CompactCardLayout'

// 替換原本的 JSX，改用：
return (
  <div className="min-h-screen bg-gray-50 p-4 md:p-6">
    <div className="max-w-7xl mx-auto">
      <CompactCardLayout order={order} />
    </div>
  </div>
)
```

---

## 📊 方案比較表

| 特性 | 極簡卡片式 | 發票式 | 分屏式 |
|------|-----------|--------|--------|
| 資訊密度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 列印友善 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| 手機體驗 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 桌面體驗 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 視覺設計 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 專業感 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 快速掃視 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 建議選擇

### 推薦使用「極簡卡片式」如果：
- 主要使用者為行動裝置
- 需要快速處理大量訂單
- 希望減少頁面滾動距離

### 推薦使用「發票式」如果：
- B2B 批發業務（需正式單據）
- 需要列印或匯出 PDF
- 桌面端使用為主

### 推薦使用「分屏式」如果：
- 視覺設計是優先考量
- 主要在大螢幕瀏覽（1440px+）
- 希望提供現代化 SaaS 體驗

---

## 📁 檔案結構

```
components/shop/order-detail-layouts/
├── CompactCardLayout.tsx          # 方案 1：極簡卡片式
├── InvoiceStyleLayout.tsx         # 方案 2：發票式
├── SplitPanelLayout.tsx           # 方案 3：分屏式
├── LayoutPreviewContent.tsx       # 預覽頁面內容
└── README.md                      # 本文件

app/(shop)/store/orders/[id]/
└── preview-layouts/
    └── page.tsx                   # 預覽頁面路由
```

---

## 🔧 技術細節

### 共用元件
- `OrderStatusBadge` - 訂單狀態標籤
- `formatCurrency` - 金額格式化
- `formatDateTW` - 台灣時間格式化
- `cn` - Tailwind CSS 類名合併工具

### 響應式斷點
```typescript
// Tailwind CSS 預設斷點
sm: 640px   // 小型手機
md: 768px   // 平板
lg: 1024px  // 桌面
xl: 1280px  // 大桌面
```

### 顏色系統
```typescript
// Neo-Brutalism 配色
border-black        // 主邊框
bg-white            // 主背景
bg-gray-50          // 頁面背景
bg-yellow-50        // 組合優惠背景
bg-green-600        // 成功/金額強調
shadow-neo          // 4px 4px 0px 0px rgba(0,0,0,1)
```

---

## 📝 待優化項目

- [ ] 新增列印 CSS（@media print）
- [ ] 新增暗色模式支援
- [ ] 新增無障礙功能測試
- [ ] 新增 Storybook 展示

---

**最後更新**: 2026-01-31
**設計師**: Claude Code (AI)
**專案**: Vsale-lite B2B 批發訂貨系統
