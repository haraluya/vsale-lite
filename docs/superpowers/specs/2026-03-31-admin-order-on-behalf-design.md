# 代客下單功能設計

## 概述

在管理後台訂單管理頁面新增「代客下單」功能，讓工作人員透過右側滑出面板（Sheet）幫客戶建立訂單。價格、優惠、組合優惠等全部帶入目標客戶的等級設定。

## 設計決策

### 架構方案：獨立狀態 + 複用計算模組

- 新建 `useAdminOrderDraft` hook 管理草稿狀態（React useState，Sheet 關閉即清除）
- 計算邏輯完全複用現有模組：`order-calculator`、`coupon-helpers`、`combo-deals` 計算
- `createOrder` action 加入 `onBehalfOfUserId` 參數，最小改動
- 不使用 Zustand，不碰 localStorage，與現有購物車完全隔離

### 訂單來源標記：order_timelines 記錄

不新增任何 DB 欄位。透過 `order_timelines` 中 `action_type='created'` + `actor_role='admin'` 判斷是否為代客下單，前後端訂單列表和詳情頁據此顯示「代客下單」標籤。

---

## 操作流程

三步驟右側 Sheet 面板：

### Step 1：選擇客戶

- 搜尋輸入框（手機號碼或客戶名稱）
- 客戶列表顯示：名稱、手機、等級標籤
- 選擇後記錄客戶 `id`、`tierId`，後續所有價格查詢帶入此 tier

### Step 2：選擇商品

兩個獨立區塊：

**普通商品區：**
- 上方搜尋欄（商品名稱搜尋）
- 系列分類標籤篩選
- 商品列表顯示等級價格，可加入並調整數量

**組合優惠區：**
- 顯示該客戶等級可用的組合優惠
- 點擊「選購」進入組合優惠商品選擇流程
- 複用現有組合優惠計算邏輯

**底部浮動摘要條：** 顯示「已選 N 件 · $XXX」

### Step 3：確認結帳

複用前端計算模組的結帳確認頁：

- 左側：訂單明細（普通商品 + 組合優惠分區顯示）
- 右側：金額摘要
  - 零售價總計
  - 會員折扣
  - 組合優惠折扣
  - 優惠券折扣（此步驟套用）
  - 訂單合計
- 優惠券套用按鈕（查詢目標客戶可用優惠券）
- 備註輸入欄位
- 確認送出按鈕

---

## 資料層改動

### createOrder action 擴展

```typescript
// lib/actions/orders.ts
interface CreateOrderParams {
  items: ...;
  comboDealItems: ...;
  notes?: string;
  userCouponId?: string;
  onBehalfOfUserId?: string;  // 新增：目標客戶 ID
}
```

行為：
- 未傳 `onBehalfOfUserId`：完全不變，用 `checkAuth()` 取得當前使用者
- 傳入 `onBehalfOfUserId`：需 `checkAdmin()` 驗證，用目標客戶 ID 建立訂單

所有現有下單路徑（客戶結帳）不受影響，`onBehalfOfUserId` 為 optional。

### order_timelines 記錄

代客下單時：
```typescript
{
  action_type: 'created',
  actor_id: adminUserId,
  actor_role: 'admin',
  content: '管理員代客建立訂單',
  new_status: 'pending'
}
```

客戶下單維持現有：
```typescript
{
  action_type: 'created',
  actor_id: userId,
  actor_role: 'client',
  new_status: 'pending'
}
```

### 「代客下單」標籤判斷

```sql
-- order_timelines 中 action_type='created' AND actor_role='admin'
```

前後端訂單列表、訂單詳情頁據此顯示標籤。

---

## 前端狀態管理

### useAdminOrderDraft Hook

```typescript
// hooks/use-admin-order-draft.ts
interface AdminOrderDraft {
  // Step 1
  selectedCustomer: {
    id: string;
    name: string;
    phone: string;
    tierId: string;
    tierName: string;
  } | null;

  // Step 2
  regularItems: {
    productId: string;
    productName: string;
    seriesId: string;
    quantity: number;
    retailPrice: number;
    tierPrice: number;
  }[];
  comboDeals: ComboDealCartItem[];

  // Step 3
  appliedCoupon: {
    userCouponId: string;
    coupon: Coupon;
    discountAmount: number;
  } | null;
  notes: string;

  // 計算結果
  calculation: OrderCalculationResult | null;
}
```

特性：
- React `useState` 管理，Sheet 關閉自動重置
- 商品加入/移除時即時呼叫 `calculateOrderAmounts()` 更新
- 優惠券套用時呼叫 `calculateCouponDiscount()` 驗證
- 所有計算函式直接 import 現有模組

---

## 元件架構

```
AdminOrderSheet（Sheet 容器 + useAdminOrderDraft + 步驟控制）
├── StepCustomerSelect — 客戶搜尋選擇
├── StepProductSelect — 商品選擇
│   ├── RegularProductPicker — 搜尋 + 系列篩選 + 加入商品
│   ├── ComboDealPicker — 組合優惠列表 + 選購
│   └── DraftItemsSummary — 已選商品摘要（底部浮動條）
└── StepCheckout — 確認結帳
    ├── 訂單明細（普通商品 + 組合優惠）
    ├── CouponSelector — 優惠券套用
    ├── 金額摘要（order-calculator 結果）
    ├── 備註輸入
    └── 確認送出按鈕
```

所有元件放在 `components/admin/orders/` 目錄下。

### AdminOrderSheet

唯一持有 `useAdminOrderDraft` 狀態的元件，透過 props 向下傳遞。管理步驟導航（上方步驟指示器），支援返回上一步。

---

## 新增 Server Actions

共 3 個，全部需要 `checkAdmin()` 權限驗證：

| Action | 用途 | 檔案 |
|--------|------|------|
| `searchCustomers(query)` | 搜尋客戶（名稱/手機） | `lib/actions/clients.ts`（擴展現有檔案） |
| `getProductsWithTierPrices(tierId, options)` | 帶入等級價格的商品查詢（支援搜尋、系列篩選） | `lib/actions/products.ts`（擴展） |
| `getCustomerCoupons(userId)` | 查詢目標客戶可用優惠券 | `lib/actions/coupons.ts`（擴展） |

---

## 複用模組清單

| 模組 | 用途 | 改動 |
|------|------|------|
| `lib/pricing/order-calculator.ts` | 訂單金額計算 | 無 |
| `lib/pricing/combo-deals.ts` | 組合優惠價格計算 | 無 |
| `lib/utils/coupon-helpers.ts` | 優惠券折扣計算 | 無 |
| `lib/actions/orders.ts` | createOrder | 加入 `onBehalfOfUserId` 參數 |
| `lib/actions/combo-deals.ts` | 查詢組合優惠 | 無（複用 getActiveComboDealsByTier） |
| `stores/cart.ts` | — | 不使用，完全隔離 |

---

## 邊界情況處理

| 情境 | 處理方式 |
|------|---------|
| 切換客戶（Step 1 回改） | 清空已選商品和優惠券，用 `useConfirm` 確認對話框 |
| Sheet 關閉 | 若有已選商品，用 `useConfirm` 確認「放棄草稿？」 |
| 商品已下架/停用 | 查詢時過濾，已加入的商品若被停用則在 Step 3 標記警告 |
| 組合優惠過期 | 進入 Step 3 時重新驗證，過期則提示移除 |
| 優惠券不適用 | 複用 `calculateCouponDiscount` 驗證，不符合條件顯示原因 |
| 送出失敗 | 顯示錯誤訊息，保留草稿狀態，不清空 |

### 權限驗證

- 所有新增 Server Action 都 `checkAdmin()`
- `createOrder` 傳入 `onBehalfOfUserId` 時驗證操作者為管理員
- 目標客戶必須存在且未被停用

### 併發安全

- 複用現有 `createOrder` 的 locking 機制
- 優惠券走現有原子操作
- 無需額外併發處理

---

## 不做的事（YAGNI）

- 不做草稿持久化（localStorage / DB）
- 不做批次代客下單
- 不做審批流程
- 不做商品推薦邏輯
- 不新增 DB 欄位或表
