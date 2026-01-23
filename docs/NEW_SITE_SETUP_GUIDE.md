# 新站點設置指南（完整版）

**版本**: 2.0（基於站點二經驗改進）
**最後更新**: 2026-01-23

---

## 📋 站點二的問題總結

### 遇到的問題

1. ✅ **管理員帳號創建成功** - `haraluya` 帳號存在
2. ❌ **RLS 策略無限遞迴** - 導致查詢失敗
3. ❌ **缺乏完整驗證** - 沒有及時發現問題

### 根本原因

**錯誤的 RLS 策略**：
```sql
-- ❌ 錯誤範例：USING 條件查詢 profiles 表本身
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles  -- ❌ 這裡造成無限遞迴！
    WHERE id = auth.uid() AND role = 'admin'
  ) OR (id = auth.uid())
);
```

**錯誤流程**：
1. 查詢 `profiles` 表
2. RLS 檢查條件需要查詢 `profiles` 表
3. 再次觸發 RLS 檢查
4. **無限遞迴** 💥

---

## ✅ 正確的設置流程

### 前置準備

1. **環境變數配置** (`.env.local`)

```env
# 站點三 Supabase 配置
NEXT_PUBLIC_SUPABASE_URL_SITE3=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY_SITE3=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY_SITE3=eyJhbG...
```

2. **Supabase CLI 配置**

確保已安裝 Supabase CLI：
```bash
# 檢查版本
supabase --version

# 如未安裝，請參考：https://supabase.com/docs/guides/cli
```

---

## 🚀 快速設置（推薦方法）

### 方法 1: 使用自動化腳本（最簡單）⭐

```bash
# 執行一鍵設置腳本
pnpm tsx scripts/setup-new-site.ts site3
```

**腳本會自動完成**：
1. ✅ 檢查 Migration 狀態
2. ✅ 修復 RLS 策略（防止無限遞迴）
3. ✅ 建立管理員帳號
4. ✅ 驗證設置（登入測試、查詢測試）
5. ✅ 顯示設置摘要

---

## 📝 手動設置（完整步驟）

### 步驟 1: 推送 Migration

```bash
# 1. 連結到站點三專案
supabase link --project-ref <site3-project-id>

# 2. 推送所有 Migration
supabase db push

# 3. 驗證 Migration 狀態
supabase migration list
```

**預期結果**：
- 所有 Migration 顯示為 `Applied`
- 沒有 `Pending` 的 Migration

---

### 步驟 2: 修復 RLS 策略

**重要**：即使 Migration 已推送，也必須手動檢查並修復 RLS 策略！

#### 2.1 開啟 Supabase Dashboard SQL Editor

```
https://supabase.com/dashboard/project/<site3-project-id>
→ SQL Editor
```

#### 2.2 執行以下 SQL

```sql
-- ========================================
-- 修復 RLS 策略（防止無限遞迴）
-- ========================================

-- 1. 刪除可能有問題的策略
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin to manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin to read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. 建立正確的 RLS 策略

-- ⭐ 策略 1: 允許所有已認證用戶讀取 profiles
-- 重點：USING (true) 不查詢 profiles 表，避免遞迴
CREATE POLICY "Allow authenticated to read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 策略 2: 允許修改自己的資料
CREATE POLICY "Allow users to update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. 驗證策略
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
```

#### 2.3 驗證結果

**預期結果**：
| policyname | cmd | qual | with_check |
|-----------|-----|------|------------|
| Allow authenticated to read profiles | SELECT | true | NULL |
| Allow users to update own profile | UPDATE | (id = auth.uid()) | (id = auth.uid()) |

---

### 步驟 3: 建立管理員帳號

```bash
# 執行管理員建立腳本
pnpm site3:create-admin

# 或手動指定帳密
node scripts/create-site-admin.js site3 admin@admin.local password123
```

---

### 步驟 4: 驗證設置

```bash
# 執行驗證腳本
pnpm tsx scripts/test-site3-auth-auto.ts
```

**預期結果**：
```
✅ 登入成功
✅ 查詢自己的 profile 成功
✅ 查詢管理員列表成功（找到 1 筆記錄）
✅ RLS 策略正常運作！
```

---

## 🔍 檢查清單

### Migration 檢查

- [ ] `supabase migration list` 顯示所有 Migration 已套用
- [ ] `profiles` 表存在
- [ ] `tiers` 表存在
- [ ] RLS 已啟用：`SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles'` 回傳 `true`

### RLS 策略檢查

- [ ] `Allow authenticated to read profiles` 策略存在
- [ ] USING 條件是 `true`（不是查詢 profiles）
- [ ] 沒有「無限遞迴」錯誤

### 管理員帳號檢查

- [ ] 管理員帳號存在於 `profiles` 表
- [ ] `role = 'admin'`
- [ ] 可以登入

### 功能驗證

- [ ] 登入後可以查詢自己的 profile
- [ ] 登入後可以查詢管理員列表
- [ ] 成員管理頁面正常顯示
- [ ] 系統設定頁面正常顯示

---

## ⚠️ 常見問題與解決方案

### 問題 1: Migration 推送失敗

**錯誤訊息**：`Migration already exists`

**解決方式**：
```bash
# 檢查遠端 Migration 狀態
supabase migration list

# 如果遠端已有 Migration，無需重新推送
```

---

### 問題 2: RLS 無限遞迴錯誤

**錯誤訊息**：`infinite recursion detected in policy for relation "profiles"`

**原因**：RLS 策略的 USING 條件查詢了 `profiles` 表本身

**解決方式**：
1. 刪除有問題的策略
2. 使用 `USING (true)` 允許所有已認證用戶讀取
3. 權限控制由 Server Action 層級處理（`checkAuth()`）

---

### 問題 3: 登入後仍無法查詢資料

**可能原因**：
1. Session Cookie 未正確設定
2. Anon Key 錯誤
3. RLS 策略未生效

**診斷步驟**：
```bash
# 1. 測試 Service Role Key（應該成功）
pnpm tsx scripts/diagnose-site3-profiles.ts

# 2. 測試登入後查詢（應該成功）
pnpm tsx scripts/test-site3-auth-auto.ts

# 3. 如果都失敗，檢查 Supabase Dashboard → Authentication → Policies
```

---

### 問題 4: 網站顯示「系統錯誤」

**即使本地測試成功，網站仍顯示錯誤**

**可能原因**：
1. Vercel 部署快取
2. 瀏覽器快取
3. 環境變數未更新

**解決方式**：
```bash
# 1. 清除瀏覽器快取（Ctrl+Shift+R）

# 2. 觸發 Vercel 重新部署
git commit --allow-empty -m "chore: 觸發重新部署"
git push

# 3. 檢查 Vercel 環境變數
# Vercel Dashboard → Settings → Environment Variables
```

---

## 📚 相關腳本

### 診斷工具

```bash
# 診斷 profiles 資料
pnpm tsx scripts/diagnose-site3-profiles.ts

# 測試登入後查詢
pnpm tsx scripts/test-site3-auth-auto.ts

# 比較兩個站點資料
pnpm site3:compare
```

### 資料遷移

```bash
# 比較主站與站點三的資料差異
pnpm site3:compare

# 執行資料遷移
pnpm site3:migrate
```

---

## 🎯 最佳實踐

### 1. 使用自動化腳本

✅ **推薦**：
```bash
pnpm tsx scripts/setup-new-site.ts site3
```

❌ **不推薦**：手動一步步執行（容易遺漏步驟）

---

### 2. 先驗證再部署

執行順序：
1. ✅ 推送 Migration
2. ✅ 修復 RLS 策略
3. ✅ 建立管理員
4. ✅ **本地驗證**
5. ✅ 更新 Vercel 環境變數
6. ✅ 部署到 Vercel

---

### 3. RLS 策略設計原則

**DO（推薦）**：
```sql
-- ✅ 簡單的條件，不查詢其他表
USING (true)
USING (id = auth.uid())
USING (status = 'active')
```

**DON'T（避免）**：
```sql
-- ❌ 查詢同一個表（無限遞迴）
USING (EXISTS (SELECT 1 FROM profiles WHERE ...))

-- ❌ 複雜的子查詢
USING (id IN (SELECT user_id FROM ...))
```

**正確做法**：
- RLS 層級：寬鬆策略（`USING (true)`）
- Server Action 層級：嚴格權限檢查（`checkAuth('admin')`）

---

### 4. 環境變數命名規範

```env
# 主站
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# 站點二
NEXT_PUBLIC_SUPABASE_URL_SITE2=https://yyy.supabase.co
SUPABASE_SERVICE_ROLE_KEY_SITE2=eyJhbG...

# 站點三
NEXT_PUBLIC_SUPABASE_URL_SITE3=https://zzz.supabase.co
SUPABASE_SERVICE_ROLE_KEY_SITE3=eyJhbG...
```

---

## 🔗 相關文件

- [站點資訊](SITE_CREDENTIALS.md) - 多站點連線資訊
- [站點二 RLS 修復指南](SITE2_FIX_RLS_GUIDE.md) - 問題案例
- [站點資料遷移指南](SITE2_MIGRATION_GUIDE.md) - 資料遷移
- [資料庫安全協議](DATABASE_SAFETY_PROTOCOL.md) - Migration 安全

---

**最後更新**: 2026-01-23
**作者**: Claude Code (基於站點二經驗改進)
