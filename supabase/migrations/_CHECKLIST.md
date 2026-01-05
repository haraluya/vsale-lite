# Migration 部署檢查清單

> **目的**: 確保每次 Migration 部署都經過完整驗證，避免資料遺失或服務中斷
> **參考文件**: [SAFE_MIGRATION_GUIDE.md](../../docs/SAFE_MIGRATION_GUIDE.md) | [BACKUP_RESTORE_CHEATSHEET.md](../../docs/BACKUP_RESTORE_CHEATSHEET.md)

---

## 📋 使用方式

1. **複製此檢查清單** 到你的 Migration 規劃文件（例如 `specs/XXX/plan.md`）
2. **逐項確認** 每個步驟
3. **記錄結果** 在每個項目旁標記 ✅ 或記錄問題
4. **保留記錄** 以便日後稽核

---

## Phase 1: 規劃階段

### 📝 Migration 設計

- [ ] **已填寫 Migration Metadata**
  - Migration 名稱、描述、影響範圍
  - 風險等級（LOW/MEDIUM/HIGH）
  - 回滾計畫
  - 對應的功能規格文件路徑

- [ ] **已檢查操作類型**
  - ✅ 優先使用安全操作（ADD COLUMN, CREATE TABLE, CREATE INDEX）
  - ⚠️ 避免危險操作（DROP COLUMN, DROP TABLE, ALTER TYPE 縮小）
  - 如有危險操作，已規劃替代方案（重新命名 → 保留 30 天 → 刪除）

- [ ] **已規劃分階段執行**（如為複雜變更）
  - Phase 1: 新增新欄位/表
  - Phase 2: 資料遷移
  - Phase 3: 應用程式更新
  - Phase 4: 清理舊結構（30 天後）

- [ ] **已準備回滾計畫**
  - 記錄反向 Migration SQL
  - 確認備份檔案位置
  - 預估回滾所需時間

---

## Phase 2: 開發階段

### 💻 本地測試

- [ ] **已在本地環境完整測試**
  ```bash
  supabase db reset              # 重置本地資料庫
  pnpm dev                       # 啟動開發伺服器
  # 手動測試新功能
  ```

- [ ] **已執行型別檢查**
  ```bash
  pnpm type-check                # 必須通過，無 TypeScript 錯誤
  ```

- [ ] **已執行測試（如有）**
  ```bash
  pnpm test                      # 確保所有測試通過
  ```

- [ ] **已檢查 Migration 檔案語法**
  - 無 SQL 語法錯誤
  - 使用 `BEGIN;` 和 `COMMIT;` 包裹（原子性）
  - 外鍵關聯正確（ON DELETE RESTRICT/CASCADE）
  - RLS 政策正確（角色檢查、權限範圍）

- [ ] **已驗證資料遷移邏輯**（如有 UPDATE/INSERT）
  - 檢查 WHERE 條件是否正確
  - 確認不會誤更新其他記錄
  - 大量資料考慮分批執行

---

## Phase 3: 部署前準備

### 🛡️ 備份與安全

- [ ] **已備份生產資料庫**
  ```bash
  # 使用 Supabase Dashboard 手動備份
  # Dashboard → Database → Backups → Create Backup

  # 或使用 pg_dump
  export PGPASSWORD="your-password"
  pg_dump -h db.qwovavytryvgchcowjof.supabase.co \
    -U postgres -d postgres \
    -F custom \
    -f "backup_$(date +%Y%m%d_%H%M%S).dump"
  ```
  - 備份檔案位置: `___________________`
  - 備份大小: `___________________`
  - 備份時間: `___________________`

- [ ] **已記錄當前系統狀態**
  - 當前 Git Commit Hash: `___________________`
  - 當前部署版本: `___________________`
  - 當前 Migration 版本: `___________________`
  ```bash
  supabase migration list        # 查看已執行的 Migration
  ```

- [ ] **已通知團隊即將部署**
  - 部署時間: `___________________`
  - 預估維護時間: `___________________`
  - 影響範圍: `___________________`

### 📊 風險評估

- [ ] **已確認部署時間**
  - ✅ 離峰時段（凌晨 2-4 AM）
  - ⚠️ 避免尖峰時段（中午 12-14、晚上 18-21）
  - ⚠️ 避免節日前後、促銷活動期間

- [ ] **已評估影響範圍**
  - 受影響的資料表: `___________________`
  - 預估停機時間: `___________________`
  - 是否需要維護公告: `[ ] 是  [ ] 否`

---

## Phase 4: 部署執行

### 🚀 Migration 部署

- [ ] **已連結到正確專案**
  ```bash
  supabase link --project-ref qwovavytryvgchcowjof
  ```

- [ ] **已確認將要執行的 Migration**
  ```bash
  ls -la supabase/migrations/
  # 確認檔案名稱、時間戳、內容正確
  ```

- [ ] **已執行 Migration**
  ```bash
  supabase db push
  ```
  - 執行時間: `___________________`
  - 是否成功: `[ ] 是  [ ] 否`
  - 錯誤訊息（如有）: `___________________`

- [ ] **已驗證 Migration 成功**
  ```bash
  supabase db diff               # 應該顯示 "No changes detected"
  ```

### 🌐 應用程式部署

- [ ] **已部署應用程式**
  ```bash
  pnpm build                     # 建置生產環境
  firebase deploy --only hosting # 僅部署 Hosting
  ```
  - 部署時間: `___________________`
  - 部署 URL: `___________________`

- [ ] **已檢查部署日誌**
  - 無建置錯誤
  - 無部署錯誤
  - Firebase Hosting 顯示成功

---

## Phase 5: 部署後驗證

### ✅ 功能驗證

- [ ] **首頁可正常開啟**
  - 前台: https://your-app.web.app/store
  - 後台: https://your-app.web.app/admin/login

- [ ] **新功能正常運作**
  - 測試項目 1: `___________________` ✅
  - 測試項目 2: `___________________` ✅
  - 測試項目 3: `___________________` ✅

- [ ] **舊功能未受影響**
  - 登入功能正常
  - 商品列表正常
  - 訂單查詢正常
  - 購物車功能正常

- [ ] **資料庫連線正常**
  ```bash
  psql -h db.qwovavytryvgchcowjof.supabase.co \
    -U postgres -d postgres \
    -c "SELECT NOW();"
  ```

### 🔍 資料驗證

- [ ] **已檢查資料表結構**
  ```bash
  psql -h db.qwovavytryvgchcowjof.supabase.co \
    -U postgres -d postgres \
    -c "\d+ new_table_name"
  ```
  - 欄位型別正確
  - 索引已建立
  - 外鍵關聯正確

- [ ] **已檢查資料筆數**
  ```bash
  psql -h db.qwovavytryvgchcowjof.supabase.co \
    -U postgres -d postgres \
    -c "SELECT COUNT(*) FROM new_table_name;"
  ```
  - 資料筆數符合預期
  - 無資料遺失

- [ ] **已檢查 RLS 政策**
  ```bash
  psql -h db.qwovavytryvgchcowjof.supabase.co \
    -U postgres -d postgres \
    -c "SELECT policyname FROM pg_policies WHERE tablename = 'new_table_name';"
  ```
  - 政策已啟用
  - 權限設定正確

### 📊 監控與日誌

- [ ] **已監控錯誤日誌（至少 30 分鐘）**
  - Supabase Dashboard → Logs
  - Firebase Console → Functions Logs (如有使用)
  - 無異常錯誤

- [ ] **已檢查效能指標**
  - 頁面載入時間 < 2s
  - API 回應時間 < 500ms
  - 資料庫查詢時間 < 100ms (p95)

---

## Phase 6: 收尾與文件

### 📝 文件更新

- [ ] **已更新部署記錄**
  - 部署日期: `___________________`
  - Migration 版本: `___________________`
  - 部署者: `___________________`
  - 備註: `___________________`

- [ ] **已更新 CLAUDE.md**（如有架構變更）
  - 新增資料表說明
  - 更新資料模型
  - 更新 API 文件

- [ ] **已建立 Git Commit**
  ```bash
  git add .
  git commit -m "feat: 新增 XXX 功能

  - 新增 XXX 資料表
  - 新增 XXX API
  - 更新 XXX UI

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
  ```

- [ ] **已通知團隊部署完成**
  - 新功能說明
  - 已知問題（如有）
  - 注意事項

### 🗑️ 清理工作（如有舊結構）

- [ ] **已標記舊欄位/表為已棄用**（不立即刪除）
  ```sql
  -- 30 天後再執行
  -- ALTER TABLE old_table RENAME TO deprecated_old_table;
  ```

- [ ] **已設定清理提醒**
  - 提醒日期: `___________________`（30 天後）
  - 清理項目: `___________________`

---

## 🚨 緊急回滾程序

### 如果部署失敗，立即執行：

#### 方案 A: 從備份還原（最安全）

```bash
# 1. 停止應用程式（避免寫入資料）
firebase hosting:disable

# 2. 還原資料庫
pg_restore -h db.qwovavytryvgchcowjof.supabase.co \
  -U postgres -d postgres \
  --clean --if-exists \
  backup_YYYYMMDD_HHMMSS.dump

# 3. 重新部署舊版應用程式
git checkout previous-commit-hash
pnpm build
firebase deploy --only hosting

# 4. 驗證系統正常
```

#### 方案 B: 執行反向 Migration

```sql
-- 根據 Migration 中的回滾指令執行
BEGIN;
DROP TABLE IF EXISTS new_table CASCADE;
ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;
COMMIT;
```

### 回滾檢查清單

- [ ] 已停止應用程式寫入
- [ ] 已執行回滾操作
- [ ] 已驗證資料完整性
- [ ] 已重新部署舊版應用程式
- [ ] 已測試核心功能
- [ ] 已通知團隊回滾完成
- [ ] 已記錄失敗原因
- [ ] 已規劃修復方案

---

## 📌 常見問題

### Q1: Migration 執行失敗怎麼辦？

**A**: 不要慌張，按照以下步驟處理：
1. 檢查錯誤訊息（通常會指出問題所在）
2. 如果是語法錯誤，修正 SQL 後重新執行
3. 如果是資料問題（如違反約束），使用方案 A 從備份還原
4. 記錄失敗原因，修正後重新規劃部署

### Q2: 如何確認 Migration 已成功執行？

**A**: 執行以下檢查：
```bash
# 1. 檢查 Migration 狀態
supabase migration list

# 2. 檢查資料表是否存在
psql -c "\dt" | grep new_table_name

# 3. 檢查欄位是否新增
psql -c "\d+ table_name" | grep new_column
```

### Q3: 部署時間太長怎麼辦？

**A**:
- 考慮使用 `CREATE INDEX CONCURRENTLY`（避免鎖表）
- 大量資料遷移考慮分批執行
- 複雜變更採用分階段部署（藍綠部署）

### Q4: 如何測試 RLS 政策是否正確？

**A**: 使用不同角色的帳號測試：
```bash
# 1. 以客戶身份登入，嘗試查詢資料
# 2. 以管理員身份登入，嘗試查詢資料
# 3. 確認客戶只能看到自己的資料，管理員可看到所有資料
```

---

**最後更新**: 2026-01-05
**文件版本**: 1.0.0

**記住**：寧可多花 10 分鐘確認，也不要花 10 小時修復資料！
