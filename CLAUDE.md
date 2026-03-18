# Vsale-lite - Claude Code Context

**專案類型**: B2B 批發訂貨系統（Next.js 15 App Router + Supabase + Tailwind v4）
**部署**: Vercel (sin1) + GitHub Actions 自動部署

---

## ⚠️ Supabase 生產環境安全協議

**本專案直連生產資料庫，所有操作直接影響線上資料。**

- ❌ **絕對禁止** `supabase db reset` / `pnpm db:reset`
- ❌ **避免** DROP / TRUNCATE 等破壞性變更
- ✅ 執行前必須備份 + `pnpm db:diff` 確認變更
- ✅ 僅使用增量式 Migration（ADD COLUMN, CREATE TABLE, CREATE INDEX）
- ✅ 刪除操作改為重新命名，保留 30 天
- ✅ 每次 DB 修改必須同步到站點 2/3，提供手動 SQL 指令

**Migration 流程**: `supabase migration new <name>` → 編輯 SQL → `pnpm db:migrate`（執行前必須備份）

**詳細文件**: [安全協議](docs/DATABASE_SAFETY_PROTOCOL.md) | [Migration 指南](docs/SAFE_MIGRATION_GUIDE.md) | [備份速查](docs/BACKUP_RESTORE_CHEATSHEET.md)

**多站點管理**: [站點資訊](docs/SITE_CREDENTIALS.md) | [多站點總覽](docs/MULTI_SITE_README.md) | [遷移指南](docs/SITE2_MIGRATION_GUIDE.md)

---

## 核心架構規則

### 雙入口設計
- 客戶：手機號碼登入 → `/store`（行動優先）
- 管理員：Email 登入 → `/admin/dashboard`（桌面優先）
- Middleware 自動路由保護，管理員可訪問所有路由

### Server Actions 模式
所有資料操作必須透過 Server Actions（`lib/actions/`），Client Component 不直接呼叫 Supabase。

必備步驟：`'use server'` → `checkAuth()` → Zod 驗證 → `ActionResult<T>` → `revalidatePath()`

### Supabase Client
- Server: `createClient()` from `lib/supabase/server.ts`
- Client: `createClient()` from `lib/supabase/client.ts`（僅認證用）

### 等級綁定價格
- 零售價（retail_price）為必填基準價格
- 等級價格（tier_prices 表）選填，未設定時回退到零售價
- **必須** 強制「不同人看不同價」

### 負庫存支援
- **必須** 支援負庫存下單，不檢查 `stock >= 0`

### 組合優惠與優惠券
詳見 [組合優惠規則](docs/COMBO_COUPON_RULES.md)

### 資料庫關聯
- 刪除保護: `ON DELETE RESTRICT` | 級聯刪除: `ON DELETE CASCADE` | 軟刪除: `status` 欄位

---

## 設計系統

預設主題: **Clean Commerce**（支援: Neo-Brutalism / Warm Industrial / Soft Depth）

主題透過 CSS 變數 + 設計 Token（`lib/design-tokens.ts`）驅動：
- 圓角: `rounded-theme` / `-sm` / `-lg` | 邊框: `border-theme` | 陰影: `shadow-neo-sm` / `shadow-neo`
- 互動: `hover:-translate-y-0.5 hover:shadow-theme-hover active:scale-[0.98]`
- Mobile-First，觸控目標 >= 44px，斷點: `md: 768px` / `lg: 1024px`

詳見 [設計 Token](docs/design-tokens.md) | [響應式指南](docs/responsive-guide.md)

### 統一對話框
**禁止** `window.alert()` / `window.confirm()` / `window.prompt()`（ESLint 攔截）
使用 `useAlert` / `useConfirm` / `usePrompt` from `@/lib/contexts/dialog-context`

---

## 開發慣例

- Git Commit **必須**繁體中文：`feat: 新增功能` / `fix: 修復問題`
- 測試策略：P0 整合測試 / P1 單元測試 / P2 可選

### 常用指令

```bash
pnpm dev            # 開發伺服器
pnpm build          # 建置
pnpm type-check     # 型別檢查
pnpm lint           # ESLint
pnpm test           # Vitest
pnpm health-check   # 專案健康檢查
```
