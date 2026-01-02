# Supabase 快速參考卡

**專案**: Vsale-lite
**更新**: 2026-01-02

---

## 🚀 一鍵啟動 (本地開發)

```bash
# 1. 啟動 Supabase
supabase start

# 2. 切換到本地環境
cp .env.local.docker .env.local

# 3. 啟動 Next.js
pnpm dev
```

**訪問**:
- 前台: http://localhost:3000
- 後台: http://localhost:3000/admin/login
- Studio: http://127.0.0.1:54323

---

## 🔄 環境切換

### 切換到本地 (Docker)
```bash
cp .env.local.docker .env.local
supabase start
pnpm dev
```

### 切換回遠端 (Supabase Cloud)
```bash
git checkout .env.local
# 或手動編輯 .env.local
pnpm dev
```

---

## 📝 常用指令

### Supabase 服務管理
```bash
supabase start          # 啟動本地環境
supabase stop           # 停止服務
supabase restart        # 重啟服務
supabase status         # 查看狀態
supabase logs           # 查看日誌
```

### 資料庫操作
```bash
supabase db reset                    # 重置資料庫 (套用所有 migrations)
supabase migration list              # 列出 migrations
supabase migration new feature_name  # 建立新 migration
supabase db push                     # 推送到遠端
supabase db pull                     # 從遠端拉取
```

### 專案管理
```bash
supabase projects list   # 列出所有專案
supabase link            # 連結專案
supabase unlink          # 取消連結
```

---

## 🌐 服務 URLs

### 本地環境 (Docker)
| 服務 | URL |
|------|-----|
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Mailpit | http://127.0.0.1:54324 |
| Database | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

### 遠端環境 (Supabase Cloud)
| 服務 | URL |
|------|-----|
| API | https://qwovavytryvgchcowjof.supabase.co |
| Studio | https://supabase.com/dashboard/project/qwovavytryvgchcowjof |

---

## 🔑 API Keys

### 本地環境
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
```

### 遠端環境
```env
NEXT_PUBLIC_SUPABASE_URL=https://qwovavytryvgchcowjof.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_kFM9ARoFRxjTIReee26daA_ZjCoKvYZ
SUPABASE_SERVICE_ROLE_KEY=<see .env.local>
```

---

## 🗄️ 資料表清單

| 資料表 | 用途 | Migration |
|--------|------|-----------|
| `tiers` | 會員等級 | 20260101 |
| `profiles` | 使用者資料 | 20260101 |
| `categories` | 商品分類 | 20260102 |
| `products` | 商品 | 20260102 |

### Storage Buckets
| Bucket | 用途 |
|--------|------|
| `products` | 商品圖片 |

---

## 🧪 測試帳號

### 本地環境測試帳號
在 Studio (http://127.0.0.1:54323) 建立:

**管理員**:
```
Email: admin@local.test
Password: admin123456
```

**客戶**:
```
Phone: 0912345678
Password: client123456
```

### 遠端環境
使用您建立的實際帳號

---

## 🔧 常見操作

### 重置本地資料庫
```bash
supabase db reset
```

### 查看資料表內容
```bash
# 在 Studio SQL Editor 執行
SELECT * FROM products LIMIT 10;
SELECT * FROM categories;
SELECT * FROM tiers;
```

### 建立測試資料
```sql
-- 建立測試商品
INSERT INTO products (code, name, category_id, stock, unit)
VALUES (
  'TEST001',
  '測試商品',
  (SELECT id FROM categories LIMIT 1),
  100,
  '件'
);
```

### 備份本地資料
```bash
supabase db dump -f backup.sql
```

### 復原備份
```bash
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f backup.sql
```

---

## ⚠️ 注意事項

### ❌ 不要做
- ❌ 不要在本地 Docker 使用遠端 API Keys
- ❌ 不要直接刪除已套用的 migrations
- ❌ 不要在本地測試時推送到遠端

### ✅ 應該做
- ✅ 使用正確的環境變數檔案
- ✅ 定期備份重要資料
- ✅ 測試通過後再推送 migrations
- ✅ 使用 Git 追蹤所有變更

---

## 🐛 快速除錯

### 問題: 無法啟動 Supabase
```bash
# 解決方案
docker ps -a | grep supabase  # 檢查容器
supabase stop                 # 停止服務
rm -rf .supabase              # 清除資料
supabase start                # 重新啟動
```

### 問題: Migration 失敗
```bash
# 解決方案
supabase db reset --db-url postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### 問題: Port 被佔用
```bash
# 檢查 Port
netstat -ano | findstr :54321

# 停止佔用 Port 的程式
taskkill /PID <PID> /F
```

---

## 📚 相關文件

- [完整安裝教學](./supabase-docker-setup.md)
- [Supabase CLI 官方文件](https://supabase.com/docs/guides/cli)
- [Migrations 說明](../supabase/migrations/README.md)

---

**最後更新**: 2026-01-02
**維護者**: Claude Code
