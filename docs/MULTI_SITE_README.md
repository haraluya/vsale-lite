# 多站點管理文件說明

**最後更新**: 2026-01-23

本目錄包含 Vsale-lite 多站點部署的核心文件與工具。

---

## 📚 核心文件

### 1. 新站點設置 ⭐

| 文件 | 用途 | 使用時機 |
|------|------|----------|
| [NEW_SITE_SETUP_GUIDE.md](NEW_SITE_SETUP_GUIDE.md) | 新站點完整設置指南 | 設置站點三、站點四... |
| [../scripts/setup-new-site.ts](../scripts/setup-new-site.ts) | 一鍵自動化設置腳本 | 執行新站點設置 |

**快速開始**：
```bash
# 設置新站點（例如：站點三）
pnpm tsx scripts/setup-new-site.ts site3
```

---

### 2. 站點資訊

| 文件 | 用途 |
|------|------|
| [SITE_CREDENTIALS.md](SITE_CREDENTIALS.md) | 多站點連線資訊（Supabase、Vercel） |

⚠️ **重要**: 此檔案包含敏感資訊，已加入 `.gitignore`

---

### 3. 資料遷移

| 文件 | 用途 | 使用時機 |
|------|------|----------|
| [SITE2_MIGRATION_GUIDE.md](SITE2_MIGRATION_GUIDE.md) | 資料遷移指南 | 複製商品資料到新站點 |
| [../scripts/compare-sites.js](../scripts/compare-sites.js) | 比較站點資料差異 | 遷移前檢查 |
| [../scripts/migrate-to-site2-smart.js](../scripts/migrate-to-site2-smart.js) | 智慧型資料遷移 | 執行資料複製 |

**快速開始**：
```bash
# 比較主站與站點二的資料
pnpm site2:compare

# 執行資料遷移
pnpm site2:migrate
```

---

### 4. 問題診斷與修復

| 文件 | 用途 | 使用時機 |
|------|------|----------|
| [SITE2_FIX_RLS_GUIDE.md](SITE2_FIX_RLS_GUIDE.md) | RLS 問題修復指南 | 站點出現「系統錯誤」 |
| [../scripts/diagnose-site2-profiles.ts](../scripts/diagnose-site2-profiles.ts) | 診斷 profiles 資料 | 檢查管理員帳號 |
| [../scripts/test-site2-auth-auto.ts](../scripts/test-site2-auth-auto.ts) | 測試登入與查詢 | 驗證 RLS 策略 |

**快速開始**：
```bash
# 診斷 profiles 資料
pnpm tsx scripts/diagnose-site2-profiles.ts

# 測試登入後查詢（自動化）
pnpm tsx scripts/test-site2-auth-auto.ts
```

---

## 🚀 常見使用場景

### 場景 1: 設置新站點（站點三）

```bash
# 1. 在 .env.local 設定環境變數
NEXT_PUBLIC_SUPABASE_URL_SITE3=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY_SITE3=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY_SITE3=eyJhbG...

# 2. 推送 Migration
supabase link --project-ref <site3-project-id>
supabase db push

# 3. 執行一鍵設置
pnpm tsx scripts/setup-new-site.ts site3
```

**參考文件**: [NEW_SITE_SETUP_GUIDE.md](NEW_SITE_SETUP_GUIDE.md)

---

### 場景 2: 複製商品資料到新站點

```bash
# 1. 比較資料差異
pnpm site2:compare

# 2. 執行遷移
pnpm site2:migrate
```

**參考文件**: [SITE2_MIGRATION_GUIDE.md](SITE2_MIGRATION_GUIDE.md)

---

### 場景 3: 站點出現「系統錯誤」

```bash
# 1. 診斷 profiles 資料
pnpm tsx scripts/diagnose-site2-profiles.ts

# 2. 測試登入與查詢
pnpm tsx scripts/test-site2-auth-auto.ts

# 3. 如果出現 RLS 無限遞迴錯誤，參考修復指南
```

**參考文件**: [SITE2_FIX_RLS_GUIDE.md](SITE2_FIX_RLS_GUIDE.md)

---

## 📋 站點二經驗教訓

### 問題：RLS 策略無限遞迴

**錯誤範例**：
```sql
-- ❌ 造成無限遞迴
CREATE POLICY "Admins can view all profiles"
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

**正確範例**：
```sql
-- ✅ 簡單且正確
CREATE POLICY "Allow authenticated to read profiles"
USING (true);
```

**參考**: [SITE2_FIX_RLS_GUIDE.md](SITE2_FIX_RLS_GUIDE.md)

---

## 🔗 相關文件

- [DATABASE_SAFETY_PROTOCOL.md](DATABASE_SAFETY_PROTOCOL.md) - Migration 安全協議
- [CLIENT_DELIVERY_CHECKLIST.md](CLIENT_DELIVERY_CHECKLIST.md) - 客戶交付檢查清單
- [VERCEL_ENV_CHECKLIST.md](VERCEL_ENV_CHECKLIST.md) - Vercel 環境變數檢查

---

**維護者**: Claude Code
**基於**: 站點二實戰經驗改進
