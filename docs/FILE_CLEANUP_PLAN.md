# 文件清理計畫

**清理時間**: 2026-01-23
**目的**: 刪除重複和過時的文件，只保留最新版本

---

## 📦 保留的核心文件

### 腳本 (scripts/)

| 檔案 | 用途 | 原因 |
|------|------|------|
| `setup-new-site.ts` | 新站點一鍵設置 | ⭐ 核心工具 |
| `test-site2-auth-auto.ts` | 登入後查詢測試 | 驗證工具 |
| `diagnose-site2-profiles.ts` | 診斷 profiles 資料 | 問題排查 |
| `create-site2-admin.js` | 建立管理員（舊） | package.json 引用 |
| `compare-sites.js` | 比較站點資料 | 資料遷移用 |
| `migrate-to-site2-smart.js` | 智慧型資料遷移 | 資料遷移用 |

### 文件 (docs/)

| 檔案 | 用途 | 原因 |
|------|------|------|
| `NEW_SITE_SETUP_GUIDE.md` | 新站點完整設置指南 | ⭐ 核心文件 |
| `SITE_CREDENTIALS.md` | 多站點連線資訊 | 必須保留 |
| `SITE2_FIX_RLS_GUIDE.md` | RLS 問題修復指南 | 案例分析 |
| `SITE2_MIGRATION_GUIDE.md` | 資料遷移指南 | 商品資料複製 |

---

## 🗑️ 刪除的重複文件

### 腳本 (scripts/)

| 檔案 | 原因 |
|------|------|
| `fix-site2-rls.ts` | 功能已整合到 `setup-new-site.ts` |
| `fix-site2-rls.sql` | 手動 SQL，已在文件中提供 |
| `test-site2-auth.ts` | 互動式版本，已有自動化版本 |
| `setup-site2-admin.ts` | 舊版設置，已被 `setup-new-site.ts` 取代 |
| `test-site2-getadmins.ts` | 功能已整合到 `test-site2-auth-auto.ts` |
| `diagnose-site2.ts` | 舊版診斷，已被 `diagnose-site2-profiles.ts` 取代 |

### 文件 (docs/)

| 檔案 | 原因 |
|------|------|
| `DEPLOY_SITE3_SOP.md` | 舊的站點三 SOP，已被 `NEW_SITE_SETUP_GUIDE.md` 取代 |
| `MULTI_SITE_SETUP_GUIDE.md` | 舊版多站點指南，已過時 |
| `MULTI_SITE_INFO.md` | 與 `SITE_CREDENTIALS.md` 重複 |
| `SITE2_DIAGNOSTIC_REPORT.md` | 臨時診斷報告，問題已解決 |
| `SITE2_ENV_ANALYSIS.md` | 臨時分析文件 |
| `SITE2_MIGRATION_SUMMARY.md` | 摘要，與 `SITE2_MIGRATION_GUIDE.md` 重複 |
| `SITE2_QUICK_SETUP.md` | 快速設置，已過時 |
| `SYNC_GCS_TO_SITE2.md` | 臨時文件 |

---

## ✅ 清理後的結構

### scripts/ 目錄（站點相關）

```
scripts/
├── setup-new-site.ts              ⭐ 核心：新站點一鍵設置
├── test-site2-auth-auto.ts        驗證工具
├── diagnose-site2-profiles.ts     診斷工具
├── create-site2-admin.js          (舊，package.json 引用)
├── compare-sites.js               資料遷移工具
└── migrate-to-site2-smart.js      資料遷移工具
```

### docs/ 目錄（站點相關）

```
docs/
├── NEW_SITE_SETUP_GUIDE.md        ⭐ 核心：新站點完整設置指南
├── SITE_CREDENTIALS.md            多站點連線資訊
├── SITE2_FIX_RLS_GUIDE.md         RLS 問題修復指南
└── SITE2_MIGRATION_GUIDE.md       資料遷移指南
```

---

## 📝 備註

1. **已刪除的腳本**：功能已整合到新版本
2. **已刪除的文件**：內容已過時或重複
3. **保留的舊腳本**：`create-site2-admin.js` 因為 `package.json` 中有引用（`site2:create-admin`）

---

**清理完成後，未來新增站點只需**：
1. 參考 `NEW_SITE_SETUP_GUIDE.md`
2. 執行 `pnpm tsx scripts/setup-new-site.ts site3`
