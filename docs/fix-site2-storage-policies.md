# 站點二 Storage Policies 修復指南

## 問題狀況

站點二出現 Storage RLS Policy 錯誤：
- **16:9 首頁廣告**：上傳時一直讀取（卡住）
- **4:5 首頁海報**：上傳失敗，錯誤訊息「new row violates row-level security policy」

## 修復步驟

### 1. 登入 Supabase Dashboard

1. 前往 https://supabase.com/dashboard
2. 選擇站點二專案：`rdyvmgomjdglflrcfijs`

### 2. 執行 SQL 修復

1. 左側選單 → **SQL Editor**
2. 點擊 **New Query**
3. 複製並執行以下 SQL：

```sql
-- 刪除舊的 policies
DROP POLICY IF EXISTS "Allow public to read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON storage.objects;

-- 創建新的 policies
CREATE POLICY "Allow public to read" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'products');

CREATE POLICY "Allow authenticated users to upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Allow authenticated users to update" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'products');

CREATE POLICY "Allow authenticated users to delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'products');
```

4. 點擊 **Run** 執行

### 3. 驗證修復

執行以下 SQL 確認 policies 已創建：

```sql
SELECT policyname, cmd, roles::text[]
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;
```

預期應該看到 4 個 policies。

### 4. 重新測試

1. 返回站點二後台
2. 測試 16:9 首頁廣告上傳
3. 測試 4:5 首頁海報上傳
4. 確認上傳成功

## 或使用腳本檔案

你也可以直接執行預先準備好的 SQL 檔案：
```
scripts/fix-storage-policies-site2.sql
```

複製其中的 SQL 到 Supabase Dashboard 執行。

## 預期結果

- ✅ 16:9 圖片上傳不再卡住
- ✅ 4:5 圖片上傳成功
- ✅ 商品頁廣告上傳正常
- ✅ 前台圖片正常顯示

## 參考

站點三已使用相同方法修復完成，所有廣告類型上傳正常。
