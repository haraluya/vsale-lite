# 文檔目錄

**最後更新**: 2026-01-25

---

## 🛡️ 資料庫安全與 Migration（⚠️ 最高優先級 - 必讀！）

| 文件 | 用途 | 閱讀時機 |
|------|------|---------|
| **[資料庫管理與遷移協議](DATABASE_SAFETY_PROTOCOL.md)** | ⚡ 最高指導原則（簡潔版） | **執行任何資料庫操作前必讀** |
| **[SAFE_MIGRATION_GUIDE.md](SAFE_MIGRATION_GUIDE.md)** | 完整安全指南（7 種操作類型） | 建立 Migration 前參考 |
| **[BACKUP_RESTORE_CHEATSHEET.md](BACKUP_RESTORE_CHEATSHEET.md)** | 快速參考與部署檢查清單 | 部署到生產環境前使用 |
| **[MIGRATION_WORKFLOW.md](MIGRATION_WORKFLOW.md)** | Migration 工作流程 | 理解 Migration 基礎概念 |
| **[MIGRATION_DECISION_TREE.md](MIGRATION_DECISION_TREE.md)** | Migration 決策樹 | 選擇正確的 Migration 策略 |

**🚨 緊急提醒**: 如果你看到「衝突需要 reset」的提示，**立即停止**並參考協議文件，絕不自動執行重置！

**相關資源**:
- [Migration 檢查清單](../supabase/migrations/_CHECKLIST.md)
- [Migration 範本](../supabase/migrations/_TEMPLATE_safe_migration.sql)

---

## 🌐 多站點管理

本專案支援多站點部署（目前管理 3 個站點）。

| 文件 | 用途 | 適用時機 |
|------|------|---------|
| **[MULTI_SITE_README.md](MULTI_SITE_README.md)** | 多站點管理總覽 | 了解多站點架構 |
| **[SITE_CREDENTIALS.md](SITE_CREDENTIALS.md)** | 站點連線資訊（敏感） | 需要連線站點時 |
| **[SITE2_MIGRATION_GUIDE.md](SITE2_MIGRATION_GUIDE.md)** | 站點 2 遷移指南（API 版本） | 遷移資料到站點 2 |
| **[SITE2_FIX_RLS_GUIDE.md](SITE2_FIX_RLS_GUIDE.md)** | RLS 問題修復經驗 | 遇到 RLS 權限問題 |
| **[SITE3_MIGRATION_GUIDE.md](SITE3_MIGRATION_GUIDE.md)** | 站點 3 遷移指南 | 遷移資料到站點 3 |
| **[NEW_SITE_SETUP_GUIDE.md](NEW_SITE_SETUP_GUIDE.md)** | 新站點完整設置指南 | 建立新站點時 |
| **[STORAGE_MIGRATION_CLI.md](STORAGE_MIGRATION_CLI.md)** | Storage 遷移工具 | 遷移 Supabase Storage 檔案 |

**站點概覽**:
- **站點 1 (主站)**: `qwovavytryvgchcowjof` - 生產環境主要站點（新加坡）
- **站點 2**: `rdyvmgomjdglflrcfijs` - 第二營運站點（新加坡）
- **站點 3**: `dewhcpfzrzewgknaqzwy` - 第三營運站點（孟買）

---

## 🎨 設計系統與 UI

| 文件 | 用途 | 適用時機 |
|------|------|---------|
| **[design-tokens.md](design-tokens.md)** | 設計 Token 系統 | 設計新元件時參考 |
| **[responsive-ui-design.md](responsive-ui-design.md)** | 響應式 UI 設計詳解 | 理解響應式設計原則 |
| **[responsive-guide.md](responsive-guide.md)** | 響應式開發指南 | 實作響應式元件 |
| **[component-responsive-checklist.md](component-responsive-checklist.md)** | 元件響應式檢查清單 | 驗證元件響應式支援 |

**核心原則**:
- Mobile-First 策略
- Neo-Brutalism 設計風格
- 觸控目標 >= 44px × 44px (WCAG 2.1 AA)
- 響應式斷點: `md: 768px` (平板) / `lg: 1024px` (桌面)

---

## 📚 參考文檔

| 文件 | 用途 |
|------|------|
| **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** | 快速參考指南 |
| **[supabase-quick-reference.md](supabase-quick-reference.md)** | Supabase 快速參考 |
| **[supabase-docker-setup.md](supabase-docker-setup.md)** | Supabase Docker 設置 |

---

## 📝 專案管理

| 文件 | 用途 |
|------|------|
| **[FILE_CLEANUP_PLAN.md](FILE_CLEANUP_PLAN.md)** | 檔案清理計畫 |
| **[CLEANUP_SUMMARY.md](CLEANUP_SUMMARY.md)** | 清理摘要 |
| **[LESSONS_LEARNED.md](LESSONS_LEARNED.md)** | 經驗教訓 |
| **[CI_CD_MIGRATION_AUTOMATION_PLAN(未完成).md](CI_CD_MIGRATION_AUTOMATION_PLAN(未完成).md)** | CI/CD 自動化計畫（待實施） |

---

## 📦 Archive 資料夾

已移至 Archive 的文檔（仍可查閱）：

```
docs/archive/
├── deployment/      部署與環境變數指南
├── backup/          備份與還原教學
├── performance/     性能優化研究（PostgreSQL 日期範圍查詢最佳實踐）
├── troubleshooting/ 故障排除指南
├── migration/       Migration 快速指南
├── fixes/           已修復的問題
├── research/        已整合的研究
├── debugging/       已解決的除錯
├── decisions/       已整合的決策
├── planning/        已完成的計畫
└── firebase-research/ 已棄用的技術研究
```

詳見 [Archive README](archive/ARCHIVE_README.md)

---

## 🔍 快速搜尋

### 我想...

- **執行 Migration** → 閱讀 [DATABASE_SAFETY_PROTOCOL.md](DATABASE_SAFETY_PROTOCOL.md)
- **設置新站點** → 閱讀 [NEW_SITE_SETUP_GUIDE.md](NEW_SITE_SETUP_GUIDE.md)
- **遷移站點資料** → 閱讀對應站點的 Migration Guide
- **設計響應式元件** → 閱讀 [responsive-guide.md](responsive-guide.md) + [design-tokens.md](design-tokens.md)
- **查詢 Supabase 用法** → 閱讀 [supabase-quick-reference.md](supabase-quick-reference.md)
- **查看過時文檔** → 瀏覽 `archive/` 資料夾

---

## 📊 文檔統計

- **主目錄文件**: 24 個（核心參考）
- **Archive 文件**: ~56 個（歷史參考）
- **總計**: ~80 個文檔

**最近更新**:
- 2026-01-25: 完成文檔整理，將 35 個文件移至 Archive
- 2026-01-25: 新增 PHASE3_MANUAL_SYNC_GUIDE（已移至 Archive）
- 2026-01-24: 首頁優化完成（已移至 Archive）

---

**維護者**: Claude Code
**專案**: Vsale-lite B2B 批發訂貨系統
