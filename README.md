# Vsale-lite - B2B 批發訂貨系統

一個專為批發業務設計的輕量級 B2B 訂貨系統,解決傳統 Excel/LINE 下單混亂、價格不透明的問題。

## 核心特色

- 🎯 **雙入口設計**: 客戶使用手機號碼登入,管理員使用 Email 登入
- 💰 **等級綁定價格**: 不同會員等級看到不同價格 (未來功能)
- 📱 **行動優先**: 客戶端優化單手操作,管理端優化桌面批量操作
- 🎨 **Neo-Brutalism 設計風格**: 強烈的品牌識別

## 技術棧

- **框架**: Next.js 15.5+ (App Router)
- **語言**: TypeScript 5.7+
- **UI**: React 19 + Tailwind CSS v4
- **資料庫**: Supabase (PostgreSQL)
- **認證**: Supabase Auth
- **表單驗證**: Zod 3.24+
- **圖示**: Lucide React

## 前置需求

- Node.js v22.x LTS (Iron)
- pnpm 9.x+
- Supabase 帳號

## 快速開始

### 1. 安裝依賴

```bash
pnpm install
```

### 2. 環境變數設定

複製環境變數範本並填入 Supabase 憑證:

```bash
cp .env.local.example .env.local
```

編輯 `.env.local` 並填入:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 資料庫設定

執行以下 SQL Migration 檔案 (在 Supabase SQL Editor 中):

1. `supabase/migrations/20260101_initial_schema.sql` - 建立資料表結構 (會員等級與客戶)
2. `supabase/migrations/20260101_seed_data.sql` - 插入預設會員等級與測試管理員
3. `supabase/migrations/20260102_products_and_categories.sql` - 建立商品與分類表 (含 Storage Bucket)

### 4. 啟動開發伺服器

```bash
pnpm dev
```

訪問 [http://localhost:3000](http://localhost:3000)

## 測試帳號

**管理員後台** (http://localhost:3000/admin/login):
- Email: `admin@test.com`
- 密碼: `Admin@123456`

**客戶前台** (http://localhost:3000/login):
- 使用後台「快速開戶」功能建立測試客戶
- 預設密碼為手機號碼後 6 碼

## 專案結構

```
vsale/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # 認證路由群組
│   │   ├── login/                # 前台登入 (手機號碼)
│   │   └── admin/login/          # 後台登入 (Email)
│   ├── (shop)/                   # 客戶保護路由群組
│   │   └── store/                # 商品列表與商品詳情
│   └── (admin)/                  # 管理員保護路由群組
│       └── admin/
│           ├── dashboard/        # 管理首頁
│           ├── tiers/            # 會員等級管理
│           ├── clients/          # 客戶管理
│           ├── categories/       # 商品分類管理
│           └── products/         # 商品管理
├── components/
│   ├── ui/                       # 基礎 UI 元件
│   ├── auth/                     # 認證相關元件
│   ├── admin/                    # 後台元件
│   └── shop/                     # 前台元件 (商品展示)
├── lib/
│   ├── supabase/                 # Supabase Clients
│   │   ├── client.ts             # Browser Client
│   │   ├── server.ts             # Server Client
│   │   └── storage.ts            # Storage Helper
│   ├── actions/                  # Server Actions
│   │   ├── categories.ts         # 分類 CRUD
│   │   └── products.ts           # 商品 CRUD & 圖片管理
│   ├── validations/              # Zod Schemas
│   └── utils.ts                  # 工具函式
├── types/                        # TypeScript 型別定義
├── supabase/migrations/          # SQL Migration Files
└── middleware.ts                 # 路由保護 Middleware
```

## 可用指令

```bash
# 開發
pnpm dev              # 啟動開發伺服器
pnpm build            # 建置生產環境
pnpm start            # 啟動生產伺服器

# 程式碼品質
pnpm type-check       # TypeScript 型別檢查
pnpm lint             # ESLint 檢查
```

## 核心功能

### ✅ 已完成功能

1. **會員等級管理** (Admin)
   - 建立、編輯、刪除會員等級
   - 等級排序功能
   - 刪除保護 (檢查是否有客戶使用)

2. **快速開戶** (Admin)
   - 輸入手機號碼與選擇等級
   - 自動產生預設密碼 (手機號碼後 6 碼)
   - 一鍵複製完整登入指引 (含網址、電話、密碼)
   - 手機號碼格式驗證 (09 開頭,10 碼)
   - 重複檢查

3. **雙入口登入**
   - 前台: 手機號碼登入 (`/login`)
   - 後台: Email 登入 (`/admin/login`)
   - 完全隔離的認證機制

4. **客戶列表管理** (Admin)
   - 客戶列表查看
   - 搜尋功能 (手機號碼)
   - 會員等級篩選
   - 分頁功能
   - 編輯客戶資料 (等級變更、備註編輯)

5. **路由保護**
   - Middleware 自動檢查權限
   - 未登入重導向
   - 客戶無法訪問後台
   - 管理員「上帝視角」(可訪問所有路由)

6. **商品分類管理** (Admin)
   - 建立、編輯、刪除商品分類
   - 分類排序功能
   - 刪除保護 (檢查是否有商品使用)
   - 分類遷移功能 (批量更新商品分類)

7. **商品管理** (Admin)
   - 商品 CRUD (建立、編輯、刪除)
   - 商品編號唯一性驗證
   - 負庫存支援 (欠貨/預購)
   - 商品圖片上傳 (支援 JPG/PNG/WebP,最大 5MB)
   - 圖片替換與刪除
   - 商品狀態管理 (啟用/停用)
   - 商品搜尋 (商品編號或名稱)
   - 分類篩選
   - 分頁功能 (20/50/100 筆可選)

8. **前台商品瀏覽** (Client)
   - 商品列表展示
   - 分類篩選
   - 商品詳情頁
   - 庫存狀態顯示 (含負庫存提示)
   - 圖片展示

### 🚧 進行中功能

- 價格設定 (等級綁定價格)
- 購物車與訂單

## 資料庫結構

### 核心資料表

**tiers** (會員等級):
```sql
- id: UUID (PK)
- name: TEXT (等級名稱,如「零售」、「批發」)
- rank: INTEGER (排序順序)
- created_at: TIMESTAMPTZ
```

**profiles** (使用者業務資料):
```sql
- id: UUID (PK, FK → auth.users)
- phone: TEXT (手機號碼,UNIQUE)
- role: TEXT ('admin' | 'client')
- tier_id: UUID (FK → tiers, nullable for admin)
- display_name: TEXT (顯示名稱,可選)
- notes: TEXT (管理員備註,可選)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**categories** (商品分類):
```sql
- id: UUID (PK)
- name: TEXT (分類名稱,UNIQUE)
- description: TEXT (分類描述,可選)
- sort_order: INTEGER (排序順序)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**products** (商品):
```sql
- id: UUID (PK)
- code: VARCHAR(50) (商品編號,UNIQUE)
- name: TEXT (商品名稱)
- category_id: UUID (FK → categories, ON DELETE RESTRICT)
- description: TEXT (商品描述,可選)
- stock: INTEGER (庫存數量,支援負數)
- unit: TEXT (單位,如「件」、「箱」)
- image_url: TEXT (商品圖片 URL,可選)
- status: TEXT ('active' | 'inactive')
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Supabase Storage

**products bucket**:
- 公開讀取,管理員可寫入
- 檔案結構: `{product_id}/main.{ext}`
- 支援格式: JPG, PNG, WebP
- 大小限制: 5MB

## 安全性

- ✅ Server Actions 包含權限檢查
- ✅ 所有輸入使用 Zod 驗證
- ✅ Middleware 路由保護
- ✅ 角色隔離 (admin vs client)
- ⚠️ 預設密碼為手機號碼後 6 碼 (建議後續加入「首次登入強制修改密碼」)

## 設計系統

採用 **Neo-Brutalism** 風格:
- 2-3px 實心黑邊框
- 硬邊陰影: `shadow-neo` (4px 4px 0px 0px rgba(0,0,0,1))
- 點擊效果: 位移 2px + 陰影消失
- 高對比度配色

## 開發規範

### Git Commit 規則

使用繁體中文 Conventional Commits:

```
feat: 新增客戶端購物車功能
fix: 修復價格顯示錯誤
docs: 更新 README 安裝步驟
refactor: 重構會員等級查詢邏輯
```

### 程式碼風格

- TypeScript Strict Mode
- ESLint + Prettier
- Server Components 優先
- Server Actions 處理所有資料操作

## 效能目標

- 頁面首次載入 < 2s (Mobile 4G)
- 登入驗證響應 < 500ms
- 客戶搜尋即時響應 < 300ms
- 資料庫查詢 < 100ms (p95)

## 部署

### Vercel 自動部署 (推薦)

專案已配置 Vercel 自動部署，每次推送到 GitHub master 分支時會自動部署。

#### 設定步驟

1. **在 Vercel 匯入專案**
   - 前往 [Vercel Dashboard](https://vercel.com/dashboard)
   - 點擊「Add New Project」
   - 選擇「Import Git Repository」
   - 連結 GitHub 帳號並選擇 `haraluya/vsale-lite` 倉庫

2. **配置專案設定**
   - Framework Preset: `Next.js`
   - Build Command: `pnpm build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`
   - Node.js Version: `22.x`

3. **設定環境變數**

   在 Vercel 專案設定中新增以下環境變數：

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://qwovavytryvgchcowjof.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_SUPABASE_ANON_KEY
   ```

4. **部署**
   - 點擊「Deploy」開始首次部署
   - 之後每次推送到 master 分支都會自動觸發部署

#### GitHub Actions (可選)

專案支援 GitHub Actions 進行 CI/CD：
- 自動執行 TypeScript 型別檢查
- 自動執行 ESLint 檢查
- 自動部署到 Vercel

### 手動部署

如需手動部署：

```bash
# 建置
pnpm build

# 驗證
pnpm start
```

環境變數設定:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 授權

MIT License

## 相關文件

### 001-user-tier-management (會員等級與客戶管理)
- 規格文件: `specs/001-user-tier-management/spec.md`
- 實作計畫: `specs/001-user-tier-management/plan.md`
- 任務清單: `specs/001-user-tier-management/tasks.md`
- API 合約: `specs/001-user-tier-management/contracts/`
- Middleware 測試場景: `specs/001-user-tier-management/middleware-test-scenarios.md`
- Quickstart Guide: `specs/001-user-tier-management/quickstart.md`
- 研究紀錄: `specs/001-user-tier-management/research.md`

### 002-product-management (商品管理)
- 規格文件: `specs/002-product-management/spec.md`
- 實作計畫: `specs/002-product-management/plan.md`
- 任務清單: `specs/002-product-management/tasks.md`
- 資料模型: `specs/002-product-management/data-model.md`
- API 合約: `specs/002-product-management/contracts/server-actions.md`
- Quickstart Guide: `specs/002-product-management/quickstart.md`
- 研究紀錄: `specs/002-product-management/research.md`
