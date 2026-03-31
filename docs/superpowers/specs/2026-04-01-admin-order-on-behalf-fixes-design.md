# 代客下單功能修復與完善設計

## 概述

針對代客下單功能的全面檢討結果，修復邏輯問題、UI 問題和邊際情況，並實作組合優惠選購流程。

---

## 修復項目

### 1. 白屏防護（Step 3 無商品）

**問題**：`calculation` 為 null 時 StepCheckout return null，白屏。

**修復**：顯示空狀態提示 + 返回按鈕，引導用戶回到 Step 2 選擇商品。

### 2. 摘要條金額同步

**問題**：DraftItemsSummary 用自己的 reduce 計算，和 order-calculator 結果不一致。

**修復**：改用 `draft.calculation` 取得金額。若 calculation 為 null（無商品），不顯示摘要條（現有邏輯已處理 `if (!draft.hasItems) return null`）。

### 3. 未設定等級客戶提示

**問題**：點擊未設定等級的客戶後無任何回饋。

**修復**：點擊後在該客戶項目下方顯示 inline 紅色提示文字「此客戶未設定等級，無法代客下單」。不使用彈窗。

### 4. 後端 tierId 驗證

**問題**：createOrder 允許 tierId 為 undefined 建立訂單。

**修復**：代客下單時，若目標客戶 tier_id 為 null，直接回傳錯誤「目標客戶未設定等級，無法建立訂單」。

### 5. 組合優惠選購流程

**問題**：組合優惠「選購」按鈕目前 disabled。

**修復**：實作展開式（accordion）選購流程。

#### 互動設計
- 點擊「選購」→ 在該組合優惠卡片下方展開商品選擇區域
- 再次點擊或點「收合」→ 收合展開區域
- 同一時間只展開一個組合優惠

#### 各選模式 (each)
- 顯示每個系列的商品列表
- 每個系列旁標示「需選 N 件」
- 用戶從每個系列中選擇商品和數量
- 所有系列都達到需求數量後，「加入訂單」按鈕啟用

#### 任選模式 (mix_match)
- 顯示所有系列的商品（可按系列分組）
- 頂部標示「共需選 N 件」和當前已選數量
- 達到總數量後，「加入訂單」按鈕啟用

#### 價格計算
- 使用 `calculateComboDealPrice` 計算折扣
- 需要查詢選中商品的等級價格（使用 `getProductsWithTierPrices`）
- 展開時即時顯示原價、折後價、節省金額

#### 加入訂單
- 點擊「加入訂單」→ 建立 ComboDealCartItem 加入 draft.comboDeals
- 收合展開區域
- 同一組合優惠可多次加入（不同商品組合）

#### 需要的額外資料
- 需要新增一個 action 查詢組合優惠的完整詳情（含各系列商品列表），或擴展現有的 `getActiveComboDealsByTierId` 回傳更多資訊。

### 6. 移除庫存顯示

**修復**：商品卡片中移除「庫存: X」文字。

### 7. API 錯誤顯示

**問題**：商品/組合優惠載入失敗時靜默失敗。

**修復**：載入失敗時顯示 inline 錯誤提示（紅色文字 + 重試按鈕）。

### 8. 系列名稱為空處理

**修復**：`series_name` 為空時 fallback 顯示「未分類」。

### 9. 移除所有會觸發 Sheet 關閉的彈窗

**問題**：alert/confirm 對話框關閉時會連帶觸發 Sheet 的 onOpenChange。

**修復**：
- 全面檢查 combo-deal-picker.tsx 和其他元件中的 `useAlert` 使用
- 替換為 inline 提示或 toast
- 確保只有 Sheet 的 X 按鈕和 overlay 點擊才能關閉 Sheet

### 10. 價格編輯保持不限制

不做任何改動，管理員可自由調價（包括 0）。

---

## 不做的事

- 不做優惠券 series restrictions 完整帶入（後續改善）
- 不做批次下單
- 不做草稿持久化
