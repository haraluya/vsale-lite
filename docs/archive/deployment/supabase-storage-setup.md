# Supabase Storage Bucket 創建指南

## 步驟一：登入 Supabase Dashboard

### 站點二
1. 前往 https://supabase.com/dashboard
2. 選擇專案：`rdyvmgomjdglflrcfijs`

### 站點三  
1. 前往 https://supabase.com/dashboard
2. 選擇專案：`dewhcpfzrzewgknaqzwy`

## 步驟二：創建 Storage Bucket

1. 在左側選單選擇 **Storage**
2. 點擊 **Create a new bucket** 或 **New Bucket**
3. 填寫設定：
   - **Name**: `products`
   - **Public bucket**: ✅ 勾選（允許公開讀取）
   - **File size limit**: `52428800` (50MB)
   - **Allowed MIME types**: 留空或填入 `image/jpeg,image/png,image/webp`
4. 點擊 **Create bucket**

## 步驟三：設定 Bucket Policies

創建 bucket 後，需要設定存取政策：

1. 點擊剛創建的 `products` bucket
2. 切換到 **Policies** 標籤
3. 點擊 **New Policy**

### Policy 1: 公開讀取（必需）

```sql
CREATE POLICY "Allow public to read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');
```

- **Policy name**: `Allow public to read`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **USING expression**: `bucket_id = 'products'`

### Policy 2: 認證使用者上傳（必需）

```sql
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');
```

- **Policy name**: `Allow authenticated users to upload`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**: `bucket_id = 'products'`

### Policy 3: 認證使用者更新（必需）

```sql
CREATE POLICY "Allow authenticated users to update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products');
```

- **Policy name**: `Allow authenticated users to update`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'products'`

### Policy 4: 認證使用者刪除（必需）

```sql
CREATE POLICY "Allow authenticated users to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');
```

- **Policy name**: `Allow authenticated users to delete`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'products'`

## 步驟四：驗證設定

完成後應該會看到：
- ✅ `products` bucket 已創建
- ✅ 4 個 policies 已設定
- ✅ Bucket 設定為 public（可公開讀取）

## 快速驗證腳本

完成手動設定後，可執行以下命令驗證：

```bash
npx tsx scripts/check-storage-buckets.ts
```

預期輸出應顯示兩個站點都有 `products` bucket。

## 常見問題

**Q: 為什麼需要設定為 public bucket?**  
A: 前台使用者需要能夠直接讀取廣告圖片，不需要認證。

**Q: 這會影響安全性嗎?**  
A: 只有公開讀取，上傳/修改/刪除仍需要認證。圖片 URL 雖然公開，但無法列出所有檔案或猜測路徑。

**Q: 站點一（主站）需要設定嗎?**  
A: 建議也檢查一下，確保一致性。主站 URL: `qwovavytryvgchcowjof.supabase.co`
