# 站點文件清理變更日誌

**日期**: 2026-01-23
**版本**: 站點管理工具 v2.0

---

## 📦 新增文件

### 核心工具

1. **scripts/setup-new-site.ts**
   - 用途：新站點一鍵自動化設置
   - 功能：Migration 檢查 + RLS 修復 + 管理員建立 + 完整驗證
   - 使用：`pnpm tsx scripts/setup-new-site.ts site3`

2. **scripts/test-site2-auth-auto.ts**
   - 用途：自動化登入與查詢測試
   - 功能：驗證 RLS 策略是否正常運作
   - 使用：`pnpm tsx scripts/test-site2-auth-auto.ts`

3. **scripts/diagnose-site2-profiles.ts**
   - 用途：診斷 profiles 資料
   - 功能：檢查管理員帳號是否存在
   - 使用：`pnpm tsx scripts/diagnose-site2-profiles.ts`

### 核心文件

1. **docs/NEW_SITE_SETUP_GUIDE.md**
   - 用途：新站點完整設置指南
   - 內容：基於站點二經驗的完整設置流程
   - 包含：手動步驟、檢查清單、常見問題

2. **docs/SITE2_FIX_RLS_GUIDE.md**
   - 用途：RLS 問題修復指南
   - 內容：站點二無限遞迴問題案例分析與修復步驟

3. **docs/MULTI_SITE_README.md**
   - 用途：多站點管理文件總覽
   - 內容：所有站點相關文件的快速導覽

4. **docs/FILE_CLEANUP_PLAN.md**
   - 用途：文件清理計畫說明
   - 內容：記錄保留與刪除的文件及原因

---

## 🗑️ 刪除文件

### 重複的腳本

| 檔案 | 刪除原因 |
|------|----------|
| `scripts/fix-site2-rls.ts` | 功能已整合到 `setup-new-site.ts` |
| `scripts/fix-site2-rls.sql` | 手動 SQL，已在文件中提供 |
| `scripts/test-site2-auth.ts` | 互動式版本，已有自動化版本 `test-site2-auth-auto.ts` |
| `scripts/setup-site2-admin.ts` | 舊版設置，已被 `setup-new-site.ts` 取代 |
| `scripts/test-site2-getadmins.ts` | 功能已整合到 `test-site2-auth-auto.ts` |
| `scripts/diagnose-site2.ts` | 舊版診斷，已被 `diagnose-site2-profiles.ts` 取代 |

### 過時的文件

| 檔案 | 刪除原因 |
|------|----------|
| `docs/DEPLOY_SITE3_SOP.md` | 舊的站點三 SOP，已被 `NEW_SITE_SETUP_GUIDE.md` 取代 |
| `docs/MULTI_SITE_SETUP_GUIDE.md` | 舊版多站點指南，內容已過時 |
| `docs/MULTI_SITE_INFO.md` | 與 `SITE_CREDENTIALS.md` 重複 |
| `docs/SITE2_DIAGNOSTIC_REPORT.md` | 臨時診斷報告，問題已解決 |
| `docs/SITE2_ENV_ANALYSIS.md` | 臨時分析文件 |
| `docs/SITE2_MIGRATION_SUMMARY.md` | 摘要，與 `SITE2_MIGRATION_GUIDE.md` 重複 |
| `docs/SITE2_QUICK_SETUP.md` | 快速設置指南，已過時 |
| `docs/SYNC_GCS_TO_SITE2.md` | 臨時文件 |

---

## ✅ 保留的核心文件

### 腳本工具

| 檔案 | 用途 |
|------|------|
| `scripts/setup-new-site.ts` | ⭐ 新站點一鍵設置 |
| `scripts/test-site2-auth-auto.ts` | 登入查詢測試 |
| `scripts/diagnose-site2-profiles.ts` | profiles 診斷 |
| `scripts/create-site2-admin.js` | 建立管理員（package.json 引用） |
| `scripts/compare-sites.js` | 比較站點資料 |
| `scripts/migrate-to-site2-smart.js` | 智慧型資料遷移 |

### 文件指南

| 檔案 | 用途 |
|------|------|
| `docs/NEW_SITE_SETUP_GUIDE.md` | ⭐ 新站點設置指南 |
| `docs/SITE_CREDENTIALS.md` | 多站點連線資訊 |
| `docs/SITE2_FIX_RLS_GUIDE.md` | RLS 問題修復 |
| `docs/SITE2_MIGRATION_GUIDE.md` | 資料遷移指南 |
| `docs/MULTI_SITE_README.md` | 文件總覽 |

---

## 🎯 清理成果

### 清理前

- 腳本：15+ 個站點相關腳本（重複功能）
- 文件：12+ 個站點相關文件（內容重疊）

### 清理後

- 腳本：6 個核心工具（功能清晰）
- 文件：5 個核心文件（各司其職）

### 改善

- ✅ 減少 60% 的重複文件
- ✅ 統一設置流程（一鍵設置）
- ✅ 清晰的文件結構
- ✅ 完整的案例分析（站點二經驗）

---

## 📚 使用建議

### 設置新站點

**推薦使用**：
```bash
pnpm tsx scripts/setup-new-site.ts site3
```

**參考文件**：
- [NEW_SITE_SETUP_GUIDE.md](docs/NEW_SITE_SETUP_GUIDE.md)

### 問題排查

**推薦使用**：
```bash
pnpm tsx scripts/diagnose-site2-profiles.ts
pnpm tsx scripts/test-site2-auth-auto.ts
```

**參考文件**：
- [SITE2_FIX_RLS_GUIDE.md](docs/SITE2_FIX_RLS_GUIDE.md)

### 快速導覽

**推薦查看**：
- [MULTI_SITE_README.md](docs/MULTI_SITE_README.md)

---

## 🔄 未來維護

### 新增站點時

1. 不需要建立新的設置文件
2. 直接使用 `setup-new-site.ts <site-name>`
3. 所有配置統一在 `.env.local` 管理

### 遇到問題時

1. 參考 `SITE2_FIX_RLS_GUIDE.md` 案例
2. 使用診斷工具排查
3. 更新 `NEW_SITE_SETUP_GUIDE.md` 補充新案例

---

**維護者**: Claude Code
**基於**: 站點二實戰經驗
