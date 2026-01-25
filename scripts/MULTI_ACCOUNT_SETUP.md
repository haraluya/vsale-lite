# Supabase 多帳號切換指南

**最後更新**: 2026-01-25

## 📋 概述

由於站點 2 和站點 3 使用不同的 Supabase 帳號，需要透過環境變數切換 Access Token 來管理不同站點的 Migration。

---

## 🎯 解決方案：環境變數切換

Supabase CLI 支援透過 `SUPABASE_ACCESS_TOKEN` 環境變數來切換帳號，無需重複登入登出。

---

## 🚀 設定步驟

### 步驟 1: 為每個帳號建立 Access Token

#### 主站帳號（已登入）

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 前往 [Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
3. 點擊 "Generate New Token"
4. 命名: "Main Account CLI"
5. **複製並儲存 Token**

#### 站點 2 & 3 帳號

1. 使用**另一個瀏覽器**或**無痕模式**登入第二個 Supabase 帳號
2. 前往 [Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
3. 點擊 "Generate New Token"
4. 命名: "Site 2&3 CLI"
5. **複製並儲存 Token**

---

### 步驟 2: 更新切換腳本中的 Token

#### 編輯 `scripts/switch-to-main.ps1`

找到第 6 行，替換 `<YOUR_MAIN_ACCOUNT_ACCESS_TOKEN>` 為實際 Token：

```powershell
$env:SUPABASE_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 編輯 `scripts/switch-to-site23.ps1`

找到第 15 行，替換 `<YOUR_SITE23_ACCOUNT_ACCESS_TOKEN>` 為實際 Token：

```powershell
$env:SUPABASE_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📖 使用方式

### 基本切換操作

#### 切換到主站

```powershell
.\scripts\switch-to-main.ps1
```

**輸出**:
```
🔄 切換到主站 Supabase 帳號...
📡 正在連結主站專案 (qwovavytryvgchcowjof)...
✅ 已成功切換到主站

📋 目前連結資訊:
...
```

#### 切換到站點 2

```powershell
.\scripts\switch-to-site23.ps1 site2
```

或（預設為 site2）：
```powershell
.\scripts\switch-to-site23.ps1
```

#### 切換到站點 3

```powershell
.\scripts\switch-to-site23.ps1 site3
```

---

### 完整工作流程：同步 Migration

#### 同步到站點 2

```powershell
# 1. 切換到站點 2
.\scripts\switch-to-site23.ps1 site2

# 2. 推送所有 Migration
supabase db push

# 3. 驗證成功
supabase migration list

# 4. 切換回主站
.\scripts\switch-to-main.ps1
```

#### 同步到站點 3

```powershell
# 1. 切換到站點 3
.\scripts\switch-to-site23.ps1 site3

# 2. 推送所有 Migration
supabase db push

# 3. 驗證成功
supabase migration list

# 4. 切換回主站
.\scripts\switch-to-main.ps1
```

---

## 🔍 檢查目前連結狀態

隨時執行以下指令查看目前連結的專案：

```powershell
supabase status
```

**輸出**:
```
supabase local development setup is running.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: ...
service_role key: ...
   S3 Access Key: ...
   S3 Secret Key: ...
       S3 Region: local

  Linked project: qwovavytryvgchcowjof  ← 目前連結的專案
```

---

## ⚠️ 重要注意事項

### 1. Access Token 安全性

- ✅ Access Token 具有**完整帳號權限**
- ❌ **絕對不要**將包含 Token 的腳本提交到 Git
- ✅ `.gitignore` 已排除 `switch-to-*.ps1`（如果包含 Token）
- 🔄 建議**定期輪換** Token（每 3-6 個月）

### 2. 環境變數作用域

- `$env:SUPABASE_ACCESS_TOKEN` 僅在**當前 PowerShell 視窗**有效
- 關閉視窗後，需**重新執行**切換腳本
- 如果開啟多個 PowerShell 視窗，每個視窗需**獨立切換**

### 3. Token 失效

如果切換失敗，可能原因：
1. Token 已過期或被撤銷
2. 帳號權限變更
3. Token 格式錯誤

**解決方法**：前往 Supabase Dashboard 重新生成 Token

---

## 🛡️ 安全建議（進階）

### 選項 1: 使用 `.env.supabase` 檔案（建議）

建立 `.env.supabase`（已加入 .gitignore）：

```env
SUPABASE_ACCESS_TOKEN_MAIN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ACCESS_TOKEN_SITE23=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

修改腳本讀取環境變數：

```powershell
# 在腳本開頭新增
if (Test-Path ".env.supabase") {
    Get-Content .env.supabase | ForEach-Object {
        if ($_ -match "^([^=]+)=(.+)$") {
            $name = $matches[1]
            $value = $matches[2]
            Set-Item -Path "env:$name" -Value $value
        }
    }
}

# 使用對應的 Token
$env:SUPABASE_ACCESS_TOKEN = $env:SUPABASE_ACCESS_TOKEN_MAIN
```

### 選項 2: 使用 Windows Credential Manager

```powershell
# 儲存 Token（首次）
cmdkey /generic:SupabaseMainToken /user:main /pass:YOUR_TOKEN
cmdkey /generic:SupabaseSite23Token /user:site23 /pass:YOUR_TOKEN

# 讀取 Token（腳本中）
# 需要額外的 PowerShell 模組來讀取，較複雜
```

### 選項 3: 使用環境變數（系統層級）

不建議，因為：
- 需要每次手動切換
- 容易忘記切換導致操作錯誤

---

## 🔧 疑難排解

### 問題 1: 切換失敗 - 權限不足

**錯誤訊息**:
```
Unexpected error retrieving remote project status: {"message":"Your account does not have the necessary privileges..."}
```

**原因**: Access Token 不正確或權限不足

**解決方法**:
1. 確認使用正確的瀏覽器帳號生成 Token
2. 重新生成 Access Token
3. 確認 Token 完整複製（包含前後沒有空格）

### 問題 2: 環境變數未生效

**現象**: 執行切換腳本後，`supabase link` 仍使用舊帳號

**原因**: 環境變數未正確設定

**解決方法**:
```powershell
# 檢查環境變數
$env:SUPABASE_ACCESS_TOKEN

# 如果為空，重新執行切換腳本
.\scripts\switch-to-site23.ps1 site2
```

### 問題 3: 切換後無法執行指令

**錯誤訊息**:
```
Error: Project ref is required
```

**原因**: 切換後未成功連結專案

**解決方法**:
```powershell
# 手動連結專案
supabase link --project-ref rdyvmgomjdglflrcfijs

# 或重新執行切換腳本
.\scripts\switch-to-site23.ps1 site2
```

---

## 📚 相關文件

- [PHASE3_MANUAL_SYNC_GUIDE.md](../docs/PHASE3_MANUAL_SYNC_GUIDE.md) - Phase 3 Migration 手動同步指南
- [SITE_CREDENTIALS.md](../docs/SITE_CREDENTIALS.md) - 站點憑證資訊
- [Supabase CLI 文件](https://supabase.com/docs/guides/cli)
- [Access Control 指南](https://supabase.com/docs/guides/platform/access-control)

---

## 📝 快速參考

### 常用指令

```powershell
# 切換到主站
.\scripts\switch-to-main.ps1

# 切換到站點 2
.\scripts\switch-to-site23.ps1 site2

# 切換到站點 3
.\scripts\switch-to-site23.ps1 site3

# 查看目前連結
supabase status

# 推送 Migration
supabase db push

# 查看 Migration 狀態
supabase migration list
```

### 環境變數

```powershell
# 查看目前使用的 Access Token
$env:SUPABASE_ACCESS_TOKEN

# 清除環境變數（測試用）
Remove-Item env:SUPABASE_ACCESS_TOKEN
```

---

**最後更新**: 2026-01-25
