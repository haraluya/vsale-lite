# Specification

上級 項目: Vsale-SpecKit (https://www.notion.so/Vsale-SpecKit-2dbd43f1a90b80dc8751f11d83155be7?pvs=21)
日期: 2026年1月1日 下午10:12

# Vsale-lite Specification & Roadmap

## 1. 技術棧詳解 (Tech Stack Specification)

為確保系統穩定性與長期維護便利性，本專案採用以下鎖定版本（Pinned Versions）：

### Core Framework & Runtime

- **Node.js**: `v22.x` (LTS Iron) - *確保 Firebase Functions 執行環境兼容性。*
- **Package Manager**: `pnpm v9.x` - *優化依賴安裝速度與磁碟空間。*
- **Framework**: `Next.js v15.1+` (App Router) - *使用穩定的 Server Actions 與 Partial Prerendering 功能。*
- **Language**: `TypeScript v5.7+` - *利用最新的型別推斷功能提升開發 DX。*
- **Library**: `React v19.x` - *完整支援 Server Components 與 useActionState hook。*

### UI & Styling

- **Styling**: `Tailwind CSS v4.0` - *零配置 (Zero-config) 架構，效能更佳。*
- **Icons**: `Lucide React` - *輕量、風格統一的 SVG icon 庫。*
- **Components**: `shadcn/ui` (Base) - *無頭組件基礎，便於客製化 Neo-Brutalism 風格。*

### Backend & Data

- **Auth & DB SDK**: `@supabase/supabase-js v2.47+`
- **Server Helpers**: `@supabase/ssr v0.5+` - *專為 Next.js App Router 設計的 cookie 處理 helper。*
- **Validation**: `zod v3.24+` - *與 Server Actions 結合進行 Schema 驗證。*

### Deployment

- **Hosting**: Firebase App Hosting
- **Region**: `asia-east1` (Taiwan) - *降低延遲。*

### State Management

- **Client Global**: `zustand v5.0+` - *極簡的客戶端購物車狀態管理。*
- **Server State**: Native React Server Components (RSC) + Server Actions - *減少客戶端 bundle size。*

## 2. 設計系統配置 (Design System Config)

基於 Neo-Brutalism 風格的 Tailwind 設定建議 (`tailwind.config.ts` / CSS Variables)：

- **Borders**: 全域預設 `border-black` (`2px` or `3px`)。
- **Shadows (Extend)**:
    - `'neo': '4px 4px 0px 0px rgba(0,0,0,1)'`
    - `'neo-sm': '2px 2px 0px 0px rgba(0,0,0,1)'`
- **Animation**:
    - Active button press: `translate-x-[2px] translate-y-[2px] shadow-none`
- **Colors**:
    - `primary`: (需定義具體色碼，如 `#8B5CF6` 紫色)
    - `surface`: `#FFFFFF`
    - `background`: `#F3F4F6`

## 3. 目錄結構規劃 (Directory Structure)

```
src/
├── app/
│   ├── (auth)/              # Auth Group
│   │   ├── login/           # Client Login (Phone)
│   │   └── admin/login/     # Admin Login (Email)
│   ├── (shop)/              # Client Protected Group
│   │   ├── layout.tsx       # Client Navbar/Footer
│   │   ├── store/           # Product List (Series -> Products)
│   │   └── cart/            # Checkout Page
│   └── (admin)/             # Admin Protected Group
│   │   ├── admin/
│   │       ├── dashboard/   # Overview
│   │       ├── orders/      # Order Management
│   │       ├── products/    # Product & Series Management
│   │       ├── matrix/      # Price Matrix (Grid View)
│   │       └── users/       # User Management
├── components/
│   ├── ui/                  # Base UI (Neo-Brutalism buttons, inputs)
│   ├── shop/                # ProductCard, CartDrawer
│   └── admin/               # DataTable, PriceInputCell
├── lib/
│   ├── supabase/            # Supabase Client/Server Clients
│   ├── actions/             # Server Actions (form submission)
│   └── utils.ts             # CN, Formatters
├── types/                   # TypeScript Interfaces (DB shapes)
└── stores/                  # Zustand (useCartStore)

```

## 4. 資料庫模型定義 (Data Models & Types)

對應 Constitution 的 Schema，補充欄位型別與關聯細節。

### 4.1 Users & Auth

- **profiles** (映射 `users` 表)
    - `id`: uuid (PK, references auth.users)
    - `phone`: text (Unique)
    - `tier_id`: uuid (FK -> tiers.id)
    - `role`: text ('client' | 'admin')

### 4.2 Products

- **series**
    - `id`: uuid
    - `name`: text
    - `default_image_url`: text
- **products**
    - `id`: uuid
    - `series_id`: uuid (FK)
    - `name`: text (e.g., "Apple Flavor")
    - `tags`: text[] (Array)
    - `stock`: integer (Allow negative)
    - `specific_image_url`: text (Nullable)

### 4.3 Pricing Strategy

- **tiers**
    - `id`: uuid
    - `name`: text (Retail, Wholesale...)
    - `rank`: integer (排序用)
- **prices**
    - `id`: uuid
    - `tier_id`: uuid
    - `product_id`: uuid
    - `amount`: decimal/numeric
    - **Constraint**: Unique(`tier_id`, `product_id`)

### 4.4 Orders

- **orders**
    - `id`: text (自定義格式如 `ORD-20260101-XXXX`)
    - `user_id`: uuid
    - `status`: text ('pending', 'confirmed', 'shipped', 'cancelled')
    - `total_amount`: numeric
- **order_items**
    - `order_id`: text
    - `product_id`: uuid
    - `quantity`: integer
    - `deal_price`: numeric (Snapshot price at moment of purchase)

## 5. API 與 Server Actions 規劃

### 5.1 Client Actions (`/lib/actions/shop.ts`)

- `loginWithPhone(phone, password)`: 處理前台登入。
- `submitOrder(cartItems)`:
    - 驗證 `prices`。
    - 開啟 DB Transaction。
    - 寫入 `orders` -> 寫入 `order_items` -> 扣減 `products.stock`。
    - Revalidate Path `/store`.

### 5.2 Admin Actions (`/lib/actions/admin.ts`)

- `createTier(name, rank)`: 新增會員等級。
- `updatePriceMatrix(updates[])`: 批量更新價格矩陣。
    - Input: `[{ tier_id, product_id, amount }, ...]`
    - Use `upsert` operation.
- `adminModifyOrder(orderId, changes)`:
    - 更新訂單內容。
    - 寫入 `order_timelines` 紀錄操作者與變更內容。

## 6. 開發階段路線圖 (Development Phases)

### Phase 1: Foundation (基建)

1. Initialize Next.js 15 project (`pnpm create next-app`).
2. Setup Tailwind v4 with Neo-Brutalism config.
3. Setup Supabase project & Table Definitions (SQL Migration).
4. Generate TypeScript Types (`supabase gen types`).

### Phase 2: Authentication (權限)

1. Implement `/login` page (Phone auth logic).
2. Implement `/admin/login` page (Email auth logic).
3. Middleware protection rules (`middleware.ts`).

### Phase 3: Product & Pricing (核心業務)

1. Admin: Series/Product management UI.
2. Admin: **Price Matrix** component (複雜度高，需優先處理).
3. Client: Product List (Series First View).
4. Logic: Dynamic Image Switching & Tier-based Price Display.

### Phase 4: Cart & Orders (交易)

1. Client: Zustand Cart Implementation.
2. Server Action: Order Transaction logic (Stock deduction).
3. Admin: Order Management Table & Timeline Logs.

### Phase 5: Polish (優化)

1. Optimistic UI updates for cart.
2. Mobile responsiveness testing (Horizontal scroll tables).
3. Deployment to Firebase App Hosting.