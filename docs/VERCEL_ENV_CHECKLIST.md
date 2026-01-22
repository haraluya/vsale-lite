# Vercel 環境變數設定檢查清單

**用途**: 確保每個客戶的 Vercel 專案環境變數設定完整且正確

**使用時機**:
- 新客戶開站時（階段 3.4）
- 環境變數更新時
- 除錯部署問題時

---

## 必要環境變數（4 個）

### 1. NEXT_PUBLIC_SUPABASE_URL

| 項目 | 說明 |
|------|------|
| **變數名稱** | `NEXT_PUBLIC_SUPABASE_URL` |
| **說明** | Supabase 專案 API URL |
| **取得方式** | Supabase Dashboard → Project Settings → API → Project URL |
| **範例值** | `https://abcdefgh.supabase.co` |
| **環境** | ✅ Production<br>✅ Preview<br>✅ Development |
| **驗證方式** | URL 格式為 `https://[project-id].supabase.co` |

**設定步驟**:
1. 在 Vercel 專案 → Settings → Environment Variables
2. 點擊 "Add New"
3. Key: `NEXT_PUBLIC_SUPABASE_URL`
4. Value: 貼上從 Supabase 複製的 URL
5. 勾選 Production, Preview, Development
6. 點擊 "Save"

---

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY

| 項目 | 說明 |
|------|------|
| **變數名稱** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **說明** | Supabase 公開金鑰（客戶端使用） |
| **取得方式** | Supabase Dashboard → Project Settings → API → Project API keys → anon public |
| **範例值** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| **環境** | ✅ Production<br>✅ Preview<br>✅ Development |
| **驗證方式** | 字串以 `eyJ` 開頭，長度約 300+ 字元 |

**設定步驟**:
1. Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Value: 貼上從 Supabase 複製的 Anon Key
3. 勾選 Production, Preview, Development
4. 點擊 "Save"

---

### 3. SUPABASE_SERVICE_ROLE_KEY

| 項目 | 說明 |
|------|------|
| **變數名稱** | `SUPABASE_SERVICE_ROLE_KEY` |
| **說明** | Supabase 服務金鑰（Server 端使用，具完整權限） |
| **取得方式** | Supabase Dashboard → Project Settings → API → Project API keys → service_role |
| **範例值** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| **環境** | ✅ Production<br>❌ Preview（安全考量）<br>❌ Development（安全考量） |
| **⚠️ 安全警告** | **絕對不可洩漏！** 此金鑰可繞過 RLS 策略，擁有完整資料庫權限 |

**設定步驟**:
1. Key: `SUPABASE_SERVICE_ROLE_KEY`
2. Value: 貼上從 Supabase 複製的 Service Role Key
3. **僅勾選 Production**（重要！）
4. 點擊 "Save"

---

### 4. SITE_IDENTIFIER

| 項目 | 說明 |
|------|------|
| **變數名稱** | `SITE_IDENTIFIER` |
| **說明** | 站點識別碼（用於備份檔案命名） |
| **取得方式** | 自訂，建議格式：`client-{客戶名稱}` |
| **範例值** | `client-abc` |
| **環境** | ✅ Production<br>✅ Preview<br>✅ Development |
| **驗證方式** | 純小寫英文 + 數字 + 連字號，無空格 |

**設定步驟**:
1. Key: `SITE_IDENTIFIER`
2. Value: 例如 `client-abc`（替換為實際客戶名稱）
3. 勾選 Production, Preview, Development
4. 點擊 "Save"

---

## 可選環境變數（資料庫備份功能）

**如果客戶需要自動備份功能**，需設定以下 7 個變數：

### 5. CRON_SECRET

| 項目 | 說明 |
|------|------|
| **變數名稱** | `CRON_SECRET` |
| **說明** | Cron Job 驗證金鑰 |
| **取得方式** | 隨機生成（至少 32 字元） |
| **範例值** | `kJ8fG3nM9pQ2rT5vW7xY1zB4cD6eH0iL2mN4oP6qR8sT` |
| **環境** | ✅ Production |

**生成方式（PowerShell）**:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

---

### 6. GCS_PROJECT_ID

| 項目 | 說明 |
|------|------|
| **變數名稱** | `GCS_PROJECT_ID` |
| **說明** | Google Cloud Storage 專案 ID |
| **取得方式** | GCP Console → Project Info |
| **範例值** | `vsale-backup` |
| **環境** | ✅ Production |

---

### 7. GCS_BUCKET_NAME

| 項目 | 說明 |
|------|------|
| **變數名稱** | `GCS_BUCKET_NAME` |
| **說明** | GCS Bucket 名稱 |
| **取得方式** | GCP Console → Cloud Storage → Buckets |
| **範例值** | `vsale-backups-client-abc` |
| **環境** | ✅ Production |
| **建議** | 每個客戶使用獨立 Bucket |

---

### 8. GCS_SERVICE_ACCOUNT_KEY

| 項目 | 說明 |
|------|------|
| **變數名稱** | `GCS_SERVICE_ACCOUNT_KEY` |
| **說明** | GCS 服務帳號金鑰（JSON 格式） |
| **取得方式** | GCP Console → IAM & Admin → Service Accounts → Create Key → JSON |
| **範例值** | `{"type":"service_account","project_id":"vsale-backup",...}` |
| **環境** | ✅ Production |
| **⚠️ 安全警告** | **完整 JSON 內容**，不可洩漏 |

**注意**: 需將完整 JSON 內容貼入（包含 `{` `}` 符號）

---

### 9. DB_HOST

| 項目 | 說明 |
|------|------|
| **變數名稱** | `DB_HOST` |
| **說明** | Supabase 資料庫主機位址 |
| **取得方式** | Supabase Dashboard → Project Settings → Database → Connection string → Host |
| **範例值** | `aws-0-ap-southeast-1.pooler.supabase.com` |
| **環境** | ✅ Production |

---

### 10. DB_PORT

| 項目 | 說明 |
|------|------|
| **變數名稱** | `DB_PORT` |
| **說明** | 資料庫連線埠 |
| **取得方式** | Supabase Dashboard → Project Settings → Database → Connection string → Port |
| **範例值** | `6543` |
| **環境** | ✅ Production |

---

### 11. DB_NAME

| 項目 | 說明 |
|------|------|
| **變數名稱** | `DB_NAME` |
| **說明** | 資料庫名稱（Supabase 固定為 postgres） |
| **取得方式** | 固定值 |
| **範例值** | `postgres` |
| **環境** | ✅ Production |

---

### 12. DB_USER

| 項目 | 說明 |
|------|------|
| **變數名稱** | `DB_USER` |
| **說明** | 資料庫使用者名稱 |
| **取得方式** | Supabase Dashboard → Project Settings → Database → Connection string → User |
| **範例值** | `postgres.abcdefgh` |
| **環境** | ✅ Production |
| **格式** | `postgres.[project-id]` |

---

### 13. DB_PASSWORD

| 項目 | 說明 |
|------|------|
| **變數名稱** | `DB_PASSWORD` |
| **說明** | 資料庫密碼（建立 Supabase 專案時設定） |
| **取得方式** | 建立專案時自動生成（需記錄） |
| **範例值** | `your-secure-password-here` |
| **環境** | ✅ Production |
| **⚠️ 安全警告** | 如遺失密碼，需在 Supabase Dashboard 重設 |

**重設密碼方式**:
1. Supabase Dashboard → Project Settings → Database
2. 點擊 "Reset database password"
3. 記錄新密碼並更新 Vercel 環境變數

---

## 環境變數設定完成檢查表

### 必要變數（所有客戶都需要）

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - 已設定於 Production, Preview, Development
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - 已設定於 Production, Preview, Development
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - **僅設定於 Production**
- [ ] `SITE_IDENTIFIER` - 已設定於 Production, Preview, Development

### 可選變數（備份功能）

- [ ] `CRON_SECRET` - 已設定於 Production
- [ ] `GCS_PROJECT_ID` - 已設定於 Production
- [ ] `GCS_BUCKET_NAME` - 已設定於 Production
- [ ] `GCS_SERVICE_ACCOUNT_KEY` - 已設定於 Production（完整 JSON）
- [ ] `DB_HOST` - 已設定於 Production
- [ ] `DB_PORT` - 已設定於 Production
- [ ] `DB_NAME` - 已設定於 Production
- [ ] `DB_USER` - 已設定於 Production
- [ ] `DB_PASSWORD` - 已設定於 Production

---

## 驗證方式

### 方法 1: Vercel Dashboard 檢查

1. 前往 Vercel 專案 → Settings → Environment Variables
2. 確認所有必要變數都顯示在列表中
3. 檢查每個變數的環境標籤（Production/Preview/Development）
4. 點擊變數名稱，確認值的前幾個字元正確（不會顯示完整值）

### 方法 2: 測試部署

**建立測試 API 路由**（臨時測試用）:

```typescript
// app/api/test-env/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    siteIdentifier: process.env.SITE_IDENTIFIER,
    hasCronSecret: !!process.env.CRON_SECRET,
  })
}
```

訪問 `https://your-site.vercel.app/api/test-env` 查看結果。

**⚠️ 測試完成後務必刪除此檔案！**

### 方法 3: 檢查 Function Logs

1. Vercel Dashboard → 專案 → Logs
2. 嘗試登入後台
3. 如果環境變數錯誤，會顯示類似錯誤：
   - `Invalid API key`
   - `Failed to connect to database`
   - `Missing environment variable`

---

## 常見錯誤排除

### 錯誤 1: 前台/後台無法登入

**可能原因**:
- `NEXT_PUBLIC_SUPABASE_URL` 錯誤
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 錯誤

**檢查方式**:
1. 在瀏覽器開發者工具 → Network 查看 Supabase API 請求
2. 確認請求的 URL 是否正確
3. 確認回應狀態碼（400/401 表示金鑰錯誤）

**解決方式**:
1. 重新從 Supabase 複製正確的 URL 和 Key
2. 更新 Vercel 環境變數
3. 在 Vercel 觸發 Redeploy

---

### 錯誤 2: Server Actions 失敗

**可能原因**:
- `SUPABASE_SERVICE_ROLE_KEY` 未設定或錯誤
- `SUPABASE_SERVICE_ROLE_KEY` 設定於 Preview/Development（不應該）

**檢查方式**:
1. Vercel Dashboard → Logs → Functions
2. 搜尋 "Invalid JWT" 或 "Unauthorized"

**解決方式**:
1. 確認 `SUPABASE_SERVICE_ROLE_KEY` 僅設定於 Production
2. 重新從 Supabase 複製 Service Role Key
3. 更新並 Redeploy

---

### 錯誤 3: Cron Job 備份失敗

**可能原因**:
- 缺少備份相關環境變數（9-13）
- `GCS_SERVICE_ACCOUNT_KEY` JSON 格式錯誤
- `DB_PASSWORD` 錯誤

**檢查方式**:
1. 手動觸發備份：訪問 `https://your-site.vercel.app/api/cron/backup?secret=YOUR_CRON_SECRET`
2. 查看回應錯誤訊息

**解決方式**:
1. 確認所有備份相關變數都已設定
2. 確認 GCS Service Account Key 是完整 JSON（包含 `{` `}`）
3. 確認 DB Password 正確（可在 Supabase 重設密碼）

---

### 錯誤 4: 環境變數更新後沒有生效

**原因**: Vercel 需要重新部署才會套用新的環境變數

**解決方式**:
1. Vercel Dashboard → 專案 → Deployments
2. 點擊最新的部署 → "..." 選單 → "Redeploy"
3. 或在 GitHub 推送任何變更觸發自動部署

---

## 安全最佳實務

### 1. 環境隔離

| 變數 | Production | Preview | Development |
|------|-----------|---------|-------------|
| 公開金鑰（ANON_KEY） | ✅ | ✅ | ✅ |
| 服務金鑰（SERVICE_ROLE_KEY） | ✅ | ❌ | ❌ |
| 備份相關（CRON_SECRET, GCS, DB） | ✅ | ❌ | ❌ |
| 站點識別（SITE_IDENTIFIER） | ✅ | ✅ | ✅ |

**原則**: 敏感金鑰僅設定於 Production

### 2. 金鑰輪換

建議每 **3-6 個月** 輪換一次：
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `DB_PASSWORD`

**輪換步驟**:
1. 在 Supabase/GCP 產生新金鑰
2. 更新 Vercel 環境變數
3. 觸發 Redeploy
4. 驗證功能正常
5. 廢除舊金鑰

### 3. 存取控制

- **Vercel 專案權限**: 僅授予客戶 "Viewer" 角色（可查看但不可修改）
- **Supabase 專案權限**: 客戶如需存取，僅授予 "Developer" 角色（不可變更 RLS）
- **GCS Bucket 權限**: 使用最小權限原則（僅 Storage Object Creator）

---

## 快速參考表

| 變數 | 必要 | 環境 | 從哪裡取得 |
|------|------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | All | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | All | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Prod | Supabase → Settings → API |
| `SITE_IDENTIFIER` | ✅ | All | 自訂（例如：client-abc） |
| `CRON_SECRET` | 可選 | Prod | 隨機生成（32+ 字元） |
| `GCS_PROJECT_ID` | 可選 | Prod | GCP Console |
| `GCS_BUCKET_NAME` | 可選 | Prod | GCP Console |
| `GCS_SERVICE_ACCOUNT_KEY` | 可選 | Prod | GCP Console（JSON） |
| `DB_HOST` | 可選 | Prod | Supabase → Settings → Database |
| `DB_PORT` | 可選 | Prod | Supabase → Settings → Database |
| `DB_NAME` | 可選 | Prod | 固定值：`postgres` |
| `DB_USER` | 可選 | Prod | Supabase → Settings → Database |
| `DB_PASSWORD` | 可選 | Prod | 建立專案時設定 |

---

**文件版本**: 1.0.0
**最後更新**: 2026-01-22
