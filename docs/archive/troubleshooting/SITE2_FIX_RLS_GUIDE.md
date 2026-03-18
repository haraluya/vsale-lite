# 站點二 RLS 策略修復指南

## 問題說明

站點二的成員管理頁面出現錯誤，原因是 `profiles` 表的 RLS (Row Level Security) 策略過於嚴格，導致已認證用戶無法查詢管理員資料。

**診斷結果**：
- ✅ 管理員帳號 `haraluya` 存在
- ✅ Service Role Key 可以查詢到資料
- ❌ Anon Key（一般認證）查詢回傳 0 筆記錄 ← **問題所在**

## 快速修復步驟

### 步驟 1: 開啟 Supabase Dashboard

1. 前往站點二的 Supabase Dashboard：
   ```
   https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs
   ```

2. 點選左側選單的 **SQL Editor**

### 步驟 2: 執行修復 SQL

複製以下 SQL 並貼到 SQL Editor 中執行：

```sql
-- ========================================
-- 修復站點二 RLS 策略
-- ========================================

-- 1. 刪除現有的 profiles RLS 策略
DROP POLICY IF EXISTS "Allow admin to manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin to read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;

-- 2. 確保 RLS 已啟用
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. 重新建立 RLS 策略

-- 策略 1: 允許所有已認證用戶讀取 profiles（與站點一一致）⭐ 最重要
CREATE POLICY "Allow admin to read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

COMMENT ON POLICY "Allow admin to read all profiles" ON public.profiles
IS '允許所有已認證用戶讀取 Profiles（RLS 層級寬鬆，權限由 Server Action 控制）';

-- 策略 2: 允許使用者讀取自己的 profile
CREATE POLICY "Allow users to read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

COMMENT ON POLICY "Allow users to read own profile" ON public.profiles
IS '允許使用者讀取自己的 Profile 資料';

-- 策略 3: 允許修改自己的資料
CREATE POLICY "Allow admin to manage profiles"
ON public.profiles
TO authenticated
USING (id = auth.uid());

COMMENT ON POLICY "Allow admin to manage profiles" ON public.profiles
IS '僅允許修改自己的資料（管理員操作使用 Admin Client 繞過 RLS）';
```

### 步驟 3: 驗證修復結果

執行以下 SQL 檢查策略是否正確建立：

```sql
-- 查看 profiles 表的所有 RLS 策略
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
```

**預期結果**：應該看到 3 個策略
- `Allow admin to manage profiles`
- `Allow admin to read all profiles` ⭐ 最重要（這個策略允許查詢）
- `Allow users to read own profile`

### 步驟 4: 測試成員管理頁面

1. 前往站點二的成員管理頁面：
   ```
   https://vsale-site2.vercel.app/admin/system/members
   ```

2. 使用帳號 `haraluya` 登入

3. 確認可以正常看到管理員列表

## 本地驗證腳本

如果您想在本地先驗證修復是否成功，可以執行：

```bash
# 驗證 RLS 策略是否正確
pnpm tsx scripts/test-site2-getadmins.ts
```

**預期結果**：
- Anon Key 查詢: ✅ 成功（找到 1 筆記錄）
- Service Role Key 查詢: ✅ 成功（找到 1 筆記錄）

## 為什麼需要這個修復？

### 問題根源

站點二的 RLS 策略可能在 Migration 推送時沒有正確建立，或者被手動修改過。正確的策略應該是：

**站點一（正常運作）**：
- `Allow admin to read all profiles` 策略允許所有**已認證用戶**讀取 profiles
- 權限控制由 Server Action 層級處理（`checkAuth('admin')`）

**站點二（修復前）**：
- RLS 策略過於嚴格，阻擋了一般認證用戶查詢
- 導致 `getAdmins()` 回傳 0 筆記錄

### 架構說明

```
Next.js Server Component
  ↓
getAdmins() Server Action
  ↓
createClient() ← 使用 Anon Key + Session（受 RLS 限制）
  ↓
Supabase profiles 表
  ↓
RLS 策略檢查 ← 必須允許 authenticated 角色讀取
```

## 疑難排解

### 問題 1: SQL 執行失敗

**錯誤訊息**：`permission denied` 或 `insufficient privilege`

**解決方式**：
1. 確認您使用的是具有管理員權限的帳號登入 Supabase Dashboard
2. 確認專案 ID 正確（rdyvmgomjdglflrcfijs）

### 問題 2: 修復後仍然看不到資料

**檢查步驟**：
1. 確認已登入站點二（不是站點一）
2. 清除瀏覽器快取並重新整理
3. 執行本地驗證腳本確認 RLS 策略正確

### 問題 3: 策略已存在錯誤

**錯誤訊息**：`policy "xxx" for table "profiles" already exists`

**解決方式**：
先執行刪除策略的部分：
```sql
DROP POLICY IF EXISTS "Allow admin to manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin to read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
```

然後再執行建立策略的部分。

## 預防未來問題

### 確保 Migration 同步

每次在站點一執行 Migration 時，記得也要在站點二執行：

```bash
# 切換到站點二
supabase link --project-ref rdyvmgomjdglflrcfijs

# 推送 Migration
supabase db push

# 驗證狀態
supabase migration list
```

### 定期檢查 RLS 策略

可以將驗證腳本加入 CI/CD 流程：

```bash
pnpm tsx scripts/test-site2-getadmins.ts
```

---

**最後更新**: 2026-01-23
**相關文件**:
- [站點資訊](SITE_CREDENTIALS.md)
- [站點資料遷移指南](SITE2_MIGRATION_GUIDE.md)
