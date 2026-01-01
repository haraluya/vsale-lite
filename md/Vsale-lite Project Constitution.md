# 無標題

上級 項目: Vsale-SpecKit (https://www.notion.so/Vsale-SpecKit-2dbd43f1a90b80dc8751f11d83155be7?pvs=21)
日期: 2026年1月1日 下午10:00

# Vsale-lite Project Constitution

# Version: 1.2.0 (Platform & API Optimization)

# Last Updated: 2026-01-01

## 1. 系統概述 (System Overview)

Vsale-lite 是一個專為批發業務設計的輕量級 B2B 訂貨系統。

- **核心目標**: 解決傳統 Excel/LINE 下單混亂、價格不透明的問題。
- **核心設計**: 採用「雙入口」設計，嚴格區分買家與賣家的操作環境。
- **設計風格**: 採用強烈的 "Neo-Brutalism" 風格建立品牌識別。

## 2. 使用者角色 (User Roles)

### 2.1 客戶 (Client)

- **特徵**: 追求下單速度與直覺操作。
- **識別**: 使用「手機號碼」登入。
- **裝置支援**:
    - **Mobile (主力)**: 優化單手操作、大點擊熱區。
    - **PC (輔助)**: 支援響應式佈局 (Responsive)，利用寬螢幕展示更多商品列。
- **權限**:
    - 只能看到自己等級 (Tier) 的價格。
    - 只能管理自己的訂單。
    - **禁止**: 進入 `/admin` 區域。

### 2.2 管理員 (Admin)

- **特徵**: 需處理大量數據與訂單調度。
- **識別**: 使用 Email/帳號登入。
- **裝置支援**:
    - **PC (主力)**: 高密度表格視圖，適合大量資料輸入與報表檢視。
    - **Mobile (輔助)**: 支援緊急操作（如手機改單、緊急開戶），表格需可橫向捲動或轉為卡片視圖。
- **權限**:
    - 上帝視角，可管理所有資料。
    - 可代客下單、修改訂單。
    - 可配置系統參數（價格、商品）。

## 3. 功能需求詳解 (Functional Requirements)

### 3.1 認證與授權 (Auth & RBAC)

- **[P0] 雙登入入口**:
    - 前台 `/login`: 僅接受手機號碼 + 密碼。
    - 後台 `/admin/login`: 接受 Email + 密碼。
- **[P0] 權限阻擋 (Middleware)**:
    - 未登入者訪問 `/store/*` 重導至 `/login`。
    - 非管理員訪問 `/admin/*` 重導至 `/admin/login` 或 403 頁面。
- **[P1] 一鍵開戶與預設密碼**:
    - 後台新增會員時，輸入手機號碼、選擇等級。
    - **預設密碼邏輯**: 系統自動抓取手機號碼後六碼作為初始密碼。
    - 功能: 提供「複製帳密」按鈕，格式範例：「您的帳號: 0912345678 / 密碼: 345678 (手機後六碼)」。

### 3.2 商品展示與瀏覽 (Product Logic)

- **[P0] 系列優先 (Series-First) 結構**:
    - 列表頁僅顯示「系列卡片」。
    - 點擊系列卡片，展開/進入該系列下的「產品 (Product/Variant)」列表。
- **[P1] 動態圖片切換**:
    - **預設顯示**: 系列主圖 (Default Image)。
    - **互動觸發**: 當滑鼠 Hover 或選中某產品（口味）時。
    - **邏輯**: 若該產品有 `specific_image`，則切換顯示；否則維持系列主圖。
- **[P1] 搜尋與過濾**:
    - 支援依「標籤 (Tags)」搜尋（如：涼感、甜味）。

### 3.3 價格與購物車 (Pricing & Cart)

- **[P0] 核心機制: 等級綁定價格 (Tier-Based Pricing)**:
    - 系統必須強制執行「不同人看不同價」。
    - 資料庫中 `prices` 表為正規化設計，關聯 `tier_id` 與 `product_id`。
    - **擴充性**: 新增等級 (Tier) 時（如 "VIP經銷"），無需修改程式碼，僅需在資料庫/後台新增 Tier 並設定對應價格。
- **[P0] 後台價格矩陣 (Price Matrix View)**:
    - 管理員後台需提供「矩陣式編輯介面」。
    - **呈現**: 表格橫軸為所有會員等級 (Retail, Wholesale, Distributor...)，縱軸為商品。
    - **功能**: 管理員可像 Excel 一樣快速填寫不同等級的價格，並支援批量儲存。
- **[P0] 前台報價邏輯**:
    - 顯示價格 = `SELECT amount FROM prices WHERE product_id = X AND tier_id = CurrentUser.tier_id`
- **[P0] N/A 防呆機制**:
    - 若查詢結果為 NULL（該等級未設定價格），前端顯示 "N/A"。
    - 該商品的「加入購物車」按鈕必須為 **Disabled** 狀態。
- **[P0] 負庫存下單**:
    - 系統 **不檢查** `Stock > 0`。
    - 庫存可為負數（表示欠貨/預購）。

### 3.4 訂單處理 (Order Lifecycle)

- **[P0] 訂單建立**:
    - 寫入 `orders` 表。
    - 寫入 `order_items` 表，必須記錄 `deal_price`（當下成交價）。
    - 扣除庫存 (Transaction)。
    - **初始狀態**: Pending (待確認)。
- **[P1] 客戶端修改 (僅限 Pending 狀態)**:
    - 修改數量：直接更新訂單明細。
    - 退回購物車：
        1. 將訂單內容寫回 LocalStorage/Zustand 購物車。
        2. 刪除該筆訂單。
        3. 觸發庫存回補 (Rollback Stock)。
- **[P1] 管理端強制修改**:
    - 管理員可於任何狀態修改價格、數量、刪除項目。
    - **痕跡紀錄**: 系統自動將修改動作寫入 `order_timelines` (例: "Admin modified Apple Juice qty from 5 to 3")。

## 4. 資料庫架構 (Database Schema)

| **Table Name** | **Columns** | **Notes** |
| --- | --- | --- |
| **tiers** | id, name (Retail/Wholesale), rank | 會員等級 |
| **users** | id, phone, tier_id (FK), role (client/admin) | 使用者 |
| **series** | id, name, default_image_url, is_active | 產品系列 |
| **products** | id, series_id (FK), name, tags (Array), stock, specific_image_url | 產品單項 |
| **prices** | id, tier_id (FK), product_id (FK), amount | **Constraint**: Unique (tier_id, product_id) |
| **orders** | id, user_id, status, total_amount, created_at | 訂單主表 |
| **order_items** | id, order_id, product_id, quantity, deal_price | 訂單明細 |
| **order_timelines** | id, order_id, type (System/User/Admin), content, created_at | 操作紀錄 |

## 5. 設計規範 (Design Guidelines)

### 風格定義: Neo-Brutalism (Gen Z Bold)

- **核心精神**: 自信、直率、高對比。
- **邊框 (Borders)**: 所有卡片、按鈕、輸入框皆使用 `border-2` 或 `border-3` 實心黑線。
- **陰影 (Shadows)**: 使用 CSS box-shadow 產生硬邊陰影（無 blur）。
    - Utility: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- **Active State**: 點擊時 `translate-x-[2px] translate-y-[2px] shadow-none` (按壓感)。
- **色彩 (Colors)**:
    - Primary: 指定的深紫色/亮色。
    - Surface: 白色或極淺灰。
    - Text: 純黑（針對標題）、深灰（針對內文）。

### 格局配置 (Layout Configuration)

### A. 前台 (Client Store)

- **導航 (Top Bar)**: 左側 Logo，右側「購物車圖示（含數量 Badge）」與「會員選單」。
- **Sticky Header**: 購物車按鈕需在 Mobile 頁面捲動時保持置頂或置底懸浮 (FAB)，方便隨時結帳。
- **Grid Layout**:
    - **Mobile**: 單欄 (1col) 或雙欄 (2col) 卡片流，確保圖片夠大，手指好點。
    - **Desktop**: 四欄 (4col) 或五欄 (5col)，展示更多系列。
- **操作熱區**: 「加入購物車」與「數量增減」按鈕需放大 (**Min-height: 48px**)。

### B. 後台 (Admin Dashboard)

- **導航**:
    - **Sidebar (PC)**: 左側固定側邊欄 (Dashboard, Orders, Products, Users, Settings)。
    - **Drawer (Mobile)**: 左上角漢堡選單觸發側滑抽屜。
- **Data Tables**:
    - 預設使用高密度表格 (Dense Table)。
    - **Responsive**: 手機版需支援橫向捲動 (Overflow-x-auto) 或轉為「卡片式清單」。
- **Action Bar**: 每個頁面頂部需有固定操作區（新增、搜尋、篩選）。

## 6. 技術實作建議 (Tech Implementation)

### 6.1 建置與部署 (Deployment & Platform)

- **Firebase**: 主要 Hosting 與建置平台。
    - 使用 Firebase App Hosting (支援 Next.js SSR/Server Actions)。
    - 使用 Firebase Functions 處理部分後端邏輯（視需求）。
- **Supabase**: 核心資料庫 (PostgreSQL) 與 Auth 服務。
    - *理由*: 結合 Firebase 的全球 CDN 與 Supabase 的 SQL 優勢。

### 6.2 API 模組化策略 (API Modularization Strategy)

- **核心原則**: UI Component 只負責顯示與呼叫 API；API/Action 負責驗證 (Zod)、權限 (Auth) 與 DB 操作。
- **建議 API Endpoints**:
    - `POST /api/cart/sync`: 處理購物車同步與價格驗證。
    - `POST /api/orders/create`: 處理下單交易 (Transaction: 扣庫存 + 寫訂單)。
    - `POST /api/admin/orders/modify`: 管理員強制改單專用接口 (含 Timeline)。
    - `GET /api/products/matrix`: 供後台快速抓取「產品 x 等級」的價格矩陣資料。
- **Next.js 15**: 使用 Server Actions 處理所有表單提交。
- **狀態管理**:
    - `Zustand`: 僅在「前台購物車」使用。
    - `Server State`: 訂單確認後的狀態全由 Server 管理。
    - `Optimistic UI`: 修改訂單數量時提供零延遲體驗。