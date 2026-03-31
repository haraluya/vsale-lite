# 價格體系重構與優化設計

**日期**: 2026-03-31
**狀態**: 已核可
**範圍**: 價格計算模組化、組合優惠獨立化、購物車顯示優化

---

## 1. 背景與問題

系統有三層折扣體系：等級價格、組合優惠、優惠券。因不同時期開發，存在以下問題：

### Bug（已確認）

1. **訂單建立優惠券計算未使用共用函數**（嚴重）
   - `orders.ts:341-356` 有內聯的優惠券折扣計算，與 `coupon-helpers.ts` 的 `calculateCouponDiscount()` 邏輯不同
   - 前端驗證的折扣金額與實際訂單儲存的金額可能不一致

2. **前端運費預覽基數錯誤**（中度）
   - `cart-summary.tsx` 用組合優惠原價算運費
   - `orders.ts` 用組合優惠折後價算運費
   - 導致前端免運提示可能不準確

3. **四捨五入精度不一致**（低度）
   - `combo-deals.ts` 使用 `Math.round(x)` 整數
   - `coupon-helpers.ts` 使用 `Math.round(x * 100) / 100` 保留小數

### 結構性問題

- 優惠券折扣計算有兩套邏輯（orders.ts 內聯 + coupon-helpers.ts）
- 死碼：`applyCouponToComboDealprice()`、重複 wrapper 函數
- 前端計算邏輯分散在 cart-summary.tsx 和 CartContent.tsx

---

## 2. 設計決策

### 2.1 組合優惠與優惠券完全獨立

- 優惠券折扣基數 = **僅普通商品等級價**（有系列限制時進一步篩選）
- 組合優惠有自己的折扣計算，不參與優惠券體系
- 組合優惠參與免運門檻計算（使用折後金額）

### 2.2 原價統一使用零售價

- 所有價格顯示的「原價」= 商品零售價（retail_price）
- 等級價格顯示為「會員專屬折扣」（零售價 - 等級價）
- 適用於普通商品和組合優惠商品

### 2.3 金額全部整數

- 統一使用 `Math.round()` 取整數
- 移除所有 `Math.round(x * 100) / 100` 的小數精度處理

### 2.4 移除組合優惠-優惠券互動機制

- 移除 `coupon_combo_restrictions` 表
- 移除 `coupons.exclude_combo_deals` 欄位
- 移除相關 RLS 政策
- 移除程式碼中的互動檢查邏輯

---

## 3. 統一價格計算模組

### 3.1 新增 `lib/pricing/order-calculator.ts`

```typescript
interface OrderCalculationInput {
  regularItems: Array<{ retailPrice: number; tierPrice: number; quantity: number }>
  comboDeals: Array<{ originalPrice: number; discountedPrice: number; discountAmount: number }>
  coupon?: {
    discountType: 'fixed' | 'percentage'
    discountValue: number
    minOrderAmount?: number
    seriesRestrictions?: string[]
  }
  couponEligibleItems?: Array<{ tierPrice: number; quantity: number; seriesId: string }>
}

interface OrderCalculationResult {
  // 原價基準（零售價）
  retailTotal: number             // 全部商品零售價合計（普通 + 組合）

  // 折扣明細
  memberDiscount: number          // 會員折扣 = 零售價 - 等級價（普通 + 組合）
  comboDiscount: number           // 組合優惠折扣金額合計
  couponDiscount: number          // 優惠券折扣金額

  // 計算用中間值
  couponEligibleAmount: number    // 優惠券適用金額（僅普通商品等級價）
  shippingSubtotal: number        // 運費基數 = 普通等級價 + 組合折後價

  // 最終
  grandTotal: number              // retailTotal - memberDiscount - comboDiscount - couponDiscount + shipping
}
```

### 3.2 計算規則

```
retailTotal = Σ(regularItem.retailPrice × quantity) + Σ(comboRetailPrice)

memberDiscount = retailTotal - Σ(regularItem.tierPrice × quantity) - Σ(comboOriginalPrice)

comboDiscount = Σ(comboDeal.discountAmount)

couponEligibleAmount = 有系列限制 ? Σ(符合系列的普通商品等級價 × quantity)
                                  : Σ(全部普通商品等級價 × quantity)

couponDiscount = fixed ? min(discountValue, couponEligibleAmount)
               : percentage ? round(couponEligibleAmount × discountValue / 100)
               : 0
               → 確保 >= 0 且 <= couponEligibleAmount

shippingSubtotal = Σ(regularItem.tierPrice × quantity) + Σ(comboDeal.discountedPrice)

grandTotal = retailTotal - memberDiscount - comboDiscount - couponDiscount + shippingFee
```

### 3.3 使用方式

- `orders.ts createOrder()` — 呼叫此模組計算所有金額
- `cart-summary.tsx` — 呼叫此模組計算顯示金額
- 不再有內聯計算邏輯

---

## 4. 購物車組合優惠顯示

### 4.1 組合優惠區塊設計

參考 monskr-shop-pwa 的 bundle 呈現方式：

- 容器：`border-2 border-amber-200 bg-amber-50/30 rounded-xl`
- 標題列：🔥 圖示 + 組合名稱（粗體）+ 已省金額（green-600）+ 移除整組按鈕（red-500）
- 商品列表：compact 模式，顯示名稱、數量、單價
- 小計行：零售原價刪除線 + 折後價格
- 組合內商品不可單獨調整數量

### 4.2 排列順序

購物車由上到下：
1. 普通商品列表
2. 組合優惠區塊（各自獨立一個區塊）

---

## 5. 價格摘要折扣顯示

### 5.1 折扣加總 + 展開明細

參考 monskr-shop-pwa 的 PriceSummary 元件：

```
商品金額（零售價）    NT$ 3,600
- 會員專屬折扣        - NT$ 400
- 優惠折扣 ▾          - NT$ 350
  ├ 🔥 夏日組合優惠    - NT$ 200
  └ 🏷️ WELCOME50      - NT$ 150
+ 運費                 NT$ 60
─────────────────────
總金額                 NT$ 2,910
```

- 多折扣時顯示 ▾ 展開圖示（framer-motion rotate 動畫）
- 折扣明細左側紅色邊框（`border-l-2 border-red-200`）
- 單一折扣時直接顯示 label，不需展開
- 金額顏色：總額 red-500、明細 red-400

### 5.2 折扣類型分類

```typescript
type DiscountDetail = {
  label: string   // "🔥 組合優惠名稱" | "🏷️ 優惠券代碼"
  amount: number
  type: 'member' | 'combo' | 'coupon'
}
```

- 會員折扣：藍色（blue-600）獨立顯示行，不計入「優惠折扣」展開區
- 組合優惠折扣 + 優惠券折扣：合併為「優惠折扣」加總行，可展開明細

---

## 6. 優惠券提示設計

### 6.1 優惠券卡片提示

每張優惠券卡片底部固定顯示：
```
ℹ️ 僅適用於一般商品，組合優惠不列入計算
```
樣式：`text-xs text-text-secondary`

### 6.2 純組合優惠訂單（無普通商品）

優惠券按鈕保留但反灰不可點擊：
```
🏷️ 選擇優惠券                    [反灰不可按]
⚠️ 購物車內無適用商品（組合優惠不列入計算）
```

### 6.3 有普通商品但未達門檻

優惠券卡片顯示不可用狀態：
```
🏷️ WELCOME50          現金折扣 $50  [不可用]
滿 $500 可用
⚠️ 一般商品金額 NT$300，未達最低消費門檻
ℹ️ 僅適用於一般商品，組合優惠不列入計算
```
卡片 `opacity-60`，按鈕反灰。

---

## 7. 資料庫清理

### 7.1 Migration（3 站各執行一次）

```sql
-- 移除組合優惠-優惠券限制表
DROP TABLE IF EXISTS coupon_combo_restrictions;

-- 移除排除組合優惠欄位
ALTER TABLE coupons DROP COLUMN IF EXISTS exclude_combo_deals;
```

### 7.2 執行方式

由使用者登入各站的 Supabase CLI，然後由 Claude 執行 migration。逐站完成。

---

## 8. 程式碼清理

### 移除項目

| 檔案 | 移除內容 |
|------|---------|
| `lib/pricing/combo-deals.ts` | `applyCouponToComboDealprice()`、`calculateEachModePricing()`、`calculateMixMatchModePricing()` |
| `lib/actions/coupons.ts` | `checkCouponComboRestrictions()` 及所有組合優惠限制檢查邏輯 |
| `lib/actions/orders.ts` | 內聯優惠券折扣計算（改用統一模組） |
| 優惠券管理表單（admin） | 組合優惠限制設定區塊 |
| `lib/utils/coupon-helpers.ts` | 移除 `comboDealsTotal` 參數 |

---

## 9. 影響範圍

### 修改檔案

| 類別 | 檔案 | 變更 |
|------|------|------|
| 新增 | `lib/pricing/order-calculator.ts` | 統一計算模組 |
| 重構 | `lib/actions/orders.ts` | 改用統一計算模組 |
| 重構 | `lib/utils/coupon-helpers.ts` | 基數改為僅普通商品，整數精度 |
| 重構 | `lib/pricing/combo-deals.ts` | 移除死碼 |
| 重構 | `components/shop/cart-summary.tsx` | 改用統一計算模組，折扣展開明細 |
| 重構 | `components/shop/CartContent.tsx` | 組合優惠 amber 容器改版 |
| 修改 | `lib/actions/coupons.ts` | 移除組合優惠限制檢查 |
| 修改 | 優惠券選擇元件 | 提示文字、反灰狀態 |
| 修改 | 優惠券管理表單（admin） | 移除組合優惠限制設定 |
| 新增 | migration SQL | DROP TABLE + DROP COLUMN |

### 不影響的功能

- 後台訂單管理、出貨、庫存扣減
- 歷史訂單顯示（快照機制不變）
- 組合優惠建立、編輯、等級限制
- 客戶登入、等級管理

### 測試重點（P0）

1. 純普通商品訂單 — 優惠券折扣正確，運費正確
2. 純組合優惠訂單 — 優惠券不可用並正確提示，運費正確
3. 混合訂單 — 優惠券僅折普通商品，組合獨立計算，運費基數正確
4. 前後端金額一致 — 購物車顯示金額 = 實際建立訂單金額
5. 免運門檻 — 基數 = 普通等級價 + 組合折後價
6. 零售價顯示 — 所有原價顯示為零售價
