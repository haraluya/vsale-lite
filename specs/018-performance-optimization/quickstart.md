# 快速入門：效能優化專案

**功能編號**：018
**適用對象**：開發人員
**最後更新**：2026-01-17

---

## 🎯 專案目標

優化 Vsale-lite 系統效能，提升頁面載入速度 50%+，同時修復後台價格管理頁面的空白 Bug。

---

## 🚀 快速開始（5 分鐘）

### 1. 檢出分支

```bash
git checkout 001-performance-optimization
```

### 2. 安裝依賴（如需要）

```bash
pnpm install
```

### 3. 啟動開發伺服器

```bash
pnpm dev
```

### 4. 開始實作

**建議順序**：
1. **先修復空白 Bug**（Task 3.2，最高優先級）
2. **前台快取策略**（Task 1.1-1.3）
3. **查詢並行化**（Task 5.1-5.2，效能提升最明顯）
4. **Loading UI**（Task 4.3-4.7，提升使用者體驗）

---

## 📋 核心變更清單

### ✅ 前台快取策略

**變更檔案**：
- `app/(shop)/layout.tsx` → 移除 `force-dynamic`，新增 `revalidate: 300`
- `app/(shop)/store/products/page.tsx` → 新增 `revalidate: 300`
- `app/(shop)/store/[id]/page.tsx` → 新增 `revalidate: 600`
- `app/(shop)/store/series/[id]/page.tsx` → 新增 `revalidate: 300`

**範例**：
```typescript
// app/(shop)/store/products/page.tsx
export const revalidate = 300  // 5 分鐘快取

export default async function ProductsPage() {
  // 現有程式碼
}
```

---

### ✅ 後台快取失效（修復空白 Bug）⭐

**變更檔案**：`lib/actions/tier-prices.ts`

**關鍵變更**（所有函數都要加）：
```typescript
import { revalidateTag, revalidatePath } from 'next/cache'

export async function updateTierPrice(data: UpdateTierPriceInput) {
  // ... 現有更新邏輯

  // ✅ 新增這 3 行（修復空白 Bug）
  revalidatePath('/admin/tier-prices')  // ← 最重要！
  revalidateTag('tier-prices')
  revalidateTag('products')

  return { success: true }
}
```

**其他需要更新的函數**：
- `createTierPrice()`
- `deleteTierPrice()`
- `batchUpdateTierPrices()`

---

### ✅ 查詢並行化（Dashboard）

**變更檔案**：`lib/actions/dashboard.ts`

**當前（序列執行）**：
```typescript
const todayOrders = await supabase.from('orders').select(...)
const todayRevenue = await supabase.from('orders').select(...)
// ... 7 個更多查詢
```

**優化後（並行執行）**：
```typescript
const [todayMetrics, monthMetrics, trendData, ...] = await Promise.all([
  supabase.from('orders').select(...),
  supabase.from('orders').select(...),
  // ... 其他查詢
])
```

**預期改善**：600ms → 200ms（-67%）

---

### ✅ Loading UI

**新建檔案列表**：
- `components/ui/skeleton.tsx`（檢查是否存在）
- `components/shop/product-card-skeleton.tsx`
- `app/(shop)/store/series/[id]/loading.tsx`
- `app/(shop)/store/orders/loading.tsx`
- `app/(admin)/admin/orders/loading.tsx`
- `app/(admin)/admin/tier-prices/loading.tsx`
- `app/(admin)/admin/products/loading.tsx`

**基礎元件**：
```tsx
// components/ui/skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className="animate-pulse bg-gray-200 border-2 border-black" />
  )
}
```

---

## 🧪 測試指南

### 1. 修復空白 Bug 驗證（最重要）

**測試步驟**：
1. 啟動開發伺服器 `pnpm dev`
2. 管理員登入後台 `/admin`
3. 前往價格管理頁面 `/admin/tier-prices`
4. 選擇系列與等級，設定新價格 $100
5. 點擊「儲存」
6. **驗證**：頁面立即顯示新價格（無空白）

**預期結果**：
- ✅ 儲存成功後，頁面**立即**顯示新價格
- ✅ **無空白頁面**
- ✅ **無需手動刷新瀏覽器**

---

### 2. 前台快取驗證

**測試步驟**：
1. 訪問商品列表頁 `http://localhost:3000/store/products`
2. 記錄載入時間
3. 刷新頁面
4. 確認第 2 次明顯更快

**預期結果**：
- 第 1 次：約 1.5-2 秒
- 第 2 次：< 0.5 秒（快取命中）

---

### 3. 查詢並行化驗證

**測試步驟**：
1. 開啟瀏覽器開發者工具 > Network 面板
2. 訪問 Dashboard `/admin/dashboard`
3. 查看 Waterfall 視圖

**預期結果**：
- 多個 Supabase 查詢的開始時間相近（< 50ms 差異）
- 總查詢時間 < 300ms

---

### 4. Loading UI 驗證

**測試步驟**：
1. 開啟開發者工具 > Network 面板
2. 設定網路節流（Slow 3G）
3. 訪問各個頁面

**檢查頁面**：
- `/store/series/123`
- `/store/orders`
- `/admin/orders`
- `/admin/tier-prices`

**預期結果**：
- 骨架屏立即顯示（無白屏）
- 佈局與實際內容相似

---

## 📊 效能指標測試

### 使用 Lighthouse 測試

```bash
# 安裝 Lighthouse CLI（如需要）
npm install -g lighthouse

# 測試商品列表頁
lighthouse http://localhost:3000/store/products --view
```

**目標指標**：
- **FCP**：< 1.2 秒
- **LCP**：< 2 秒
- **TTI**：< 2.5 秒
- **CLS**：< 0.1

---

## 🐛 常見問題與解決

### Q1：價格更新後仍然出現空白頁面

**檢查**：
1. 確認 `lib/actions/tier-prices.ts` 中有 `revalidatePath('/admin/tier-prices')`
2. 確認函數執行成功（無錯誤）
3. 檢查瀏覽器 Console 是否有錯誤

**解決方案**：
```typescript
// 確保所有價格 Server Actions 都有這 3 行
revalidatePath('/admin/tier-prices')
revalidateTag('tier-prices')
revalidateTag('products')
```

---

### Q2：前台快取未生效

**檢查**：
1. 確認 Layout 沒有 `force-dynamic`
2. 確認 page.tsx 有 `revalidate` 設定
3. 檢查 Response Headers

**解決方案**：
```bash
# 檢查 Response Headers
curl -I http://localhost:3000/store/products
# 應該看到 Cache-Control: s-maxage=300
```

---

### Q3：查詢並行化後資料不一致

**檢查**：
1. 確認查詢之間無相依性（A 不依賴 B 的結果）
2. 檢查錯誤處理（使用 `try-catch`）

**解決方案**：
```typescript
// 如果需要錯誤處理，使用 Promise.allSettled
const results = await Promise.allSettled([
  query1(),
  query2(),
  query3(),
])

results.forEach((result, index) => {
  if (result.status === 'rejected') {
    console.error(`Query ${index} failed:`, result.reason)
  }
})
```

---

### Q4：Loading UI 不顯示

**檢查**：
1. 確認 `loading.tsx` 檔案存在於正確位置
2. 確認檔案名稱正確（`loading.tsx`，不是 `Loading.tsx`）
3. 確認 `Skeleton` 元件正確匯入

**解決方案**：
```bash
# 檢查檔案是否存在
ls app/(shop)/store/series/[id]/loading.tsx
```

---

## 📚 延伸閱讀

### Next.js 15 快取機制

- [Data Cache and Full Route Cache](https://nextjs.org/docs/app/building-your-application/caching)
- [ISR (Incremental Static Regeneration)](https://nextjs.org/docs/app/building-your-application/data-fetching/revalidating)
- [revalidateTag and revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)

### 效能優化

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Promise.all 最佳實踐](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)

---

## 🎉 完成檢查清單

實作完成後，確認以下項目：

**前台快取策略**：
- [ ] Layout 移除 `force-dynamic`
- [ ] 4 個頁面設定 `revalidate`
- [ ] 購物車與訂單頁保持 `force-dynamic`
- [ ] 快取測試通過

**後台動態渲染**：
- [ ] 價格更新後立即顯示（無空白）⭐
- [ ] 所有後台頁面即時顯示資料

**快取失效機制**：
- [ ] 商品 Server Actions（3 個函數）
- [ ] 價格 Server Actions（4 個函數）⭐
- [ ] 系列與分類 Server Actions
- [ ] 訂單 Server Actions

**Loading UI**：
- [ ] 5 個路由的 loading.tsx 建立
- [ ] 骨架屏正確顯示

**查詢並行化**：
- [ ] Dashboard 查詢優化
- [ ] 商品頁面查詢優化
- [ ] 載入時間減少 50%+

**效能指標**：
- [ ] FCP < 1.2 秒
- [ ] LCP < 2 秒
- [ ] Dashboard 查詢時間 < 300ms

---

## 📞 需要協助？

- **規格文件**：[spec.md](spec.md)
- **實作計畫**：[plan.md](plan.md)
- **詳細任務**：[tasks.md](tasks.md)

---

**祝你實作順利！** 🚀

如有問題，請參考 [plan.md](plan.md) 的詳細說明。
