# 🚀 立即執行 Storage 遷移

## 只需 2 步驟，3 分鐘完成！

### 步驟 1: 取得站點二 Service Role Key

請前往: https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs/settings/api

在 "Project API keys" 區域，複製 **service_role** key

（格式類似：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...`）

---

### 步驟 2: 執行遷移

在 PowerShell 中執行以下指令（替換 `YOUR_SERVICE_KEY` 為剛才複製的 key）:

```powershell
# 設定環境變數
$env:SITE2_SERVICE_KEY = "YOUR_SERVICE_KEY"

# 執行遷移
node scripts/migrate-storage.mjs
```

---

## 預期結果

```
╔═══════════════════════════════════════════════════════════════╗
║   Supabase Storage 自動遷移工具                               ║
║   主站 → 站點二                                              ║
╚═══════════════════════════════════════════════════════════════╝

📦 正在遷移 Bucket: products
  ℹ️  列出檔案...
  ✅ 找到 48 個檔案
  [1/48] 圖片檔案1
    ✅ 成功
  [2/48] 圖片檔案2
    ✅ 成功
  ...

╔═══════════════════════════════════════════════════════════════╗
║   ✅ 遷移完成！                                              ║
╚═══════════════════════════════════════════════════════════════╝

📊 遷移統計:
  總計:
    - 成功: 53 個
    - 失敗: 0 個
    - 耗時: 45 秒
```

---

## 如果沒有 Service Role Key 訪問權限

請使用手動方式（但會很慢）:

1. 主站下載: https://supabase.com/dashboard/project/qwovavytryvgchcowjof/storage/buckets
2. 站點二上傳: https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs/storage/buckets

---

**準備好了嗎？取得 Service Role Key 後立即執行！** 🚀
