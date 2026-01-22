# 歷史文件歸檔

本目錄保存專案開發過程中產生的臨時文件、除錯記錄、研究報告等，這些檔案已完成其使命，但保留以供日後參考。

---

## 📁 目錄結構

```
docs/archive/
├── fixes/          # 修復記錄（緊急修復、錯誤排查）
├── research/       # 研究報告（技術調研、效能測試）
├── debugging/      # 除錯記錄（問題診斷、日誌）
├── decisions/      # 決策記錄（架構選擇、方案比較）
└── deployment/     # 過時部署文件
```

---

## 📋 歸檔檔案清單

### 1. 修復記錄 (`fixes/`)

歸檔日期: 2026-01-09

| 檔案 | 原因 | 現況 |
|------|------|------|
| `FIX_500_ERROR.md` | Vercel 500 錯誤修復記錄 | ✅ 已修復並部署 |
| `FIX_GITHUB_SECRETS.md` | GitHub Secrets 配置問題 | ✅ 已解決 |
| `QUICK_FIX.md` | 快速修復筆記 | ✅ 已合併至主分支 |
| `SIMPLE_FIX.md` | 簡單修復記錄 | ✅ 已合併至主分支 |
| `URGENT_FIX.md` | 緊急修復記錄 | ✅ 已修復 |
| `VERCEL_ERROR_FIX.md` | Vercel 部署錯誤修復 | ✅ 已解決 |

**狀態**: 所有修復已完成並部署至生產環境。

---

### 2. 研究報告 (`research/`)

歸檔日期: 2026-01-09

| 檔案 | 內容 | 成果 |
|------|------|------|
| `RESEARCH_SUMMARY.md` | 技術研究總結 | ✅ 已整合至 specs/ |
| `RLS_RESEARCH_INDEX.md` | RLS 策略研究索引 | ✅ 已整合至 Migration M8 |
| `RLS_RESEARCH_README.md` | RLS 研究說明 | ✅ 已整合至 Migration M8 |
| `SUPABASE_RLS_PERFORMANCE_RESEARCH.md` | RLS 效能測試報告 | ✅ 已套用至 M7 索引優化 |
| `SUPABASE_RLS_QUICK_REFERENCE.md` | RLS 快速參考 | ✅ 已整合至文件 |
| `VIEWS_RESEARCH.md` | PostgreSQL View 研究 | ✅ 已套用至 M5 優惠券系統 |

**狀態**: 所有研究成果已整合至資料庫 Migration 或專案文件中。

---

### 3. 除錯記錄 (`debugging/`)

歸檔日期: 2026-01-09

| 檔案 | 問題 | 解決方案 |
|------|------|---------|
| `DEBUG-COUPON-CLAIM.md` | 優惠券領取問題診斷 | ✅ 已修復（specs/009） |
| `dialog.md` | 對話框系統除錯筆記 | ✅ 已整合至 specs/013 |

**狀態**: 所有問題已解決並記錄於對應功能規格中。

---

### 4. 決策記錄 (`decisions/`)

歸檔日期: 2026-01-09

| 檔案 | 決策內容 | 結果 |
|------|---------|------|
| `DECISION_GUIDE.md` | 架構與技術選型指南 | ✅ 已整合至 CLAUDE.md |

**狀態**: 決策結果已整合至專案憲章與核心文件。

---

### 5. 過時部署文件 (`deployment/`)

歸檔日期: 2026-01-09

| 檔案 | 內容 | 原因 |
|------|------|------|
| `LOCAL_SUPABASE_SETUP.md` | 本地 Supabase 設定（手動安裝） | ❌ 已改用 Docker（見 [docs/supabase-docker-setup.md](../../supabase-docker-setup.md)） |
| `MIGRATION_REQUIRED.md` | Migration 需求記錄 | ✅ 已完成 Migration 整合（[specs/012](../../../specs/012-migration-consolidation/)） |

**狀態**: 這些文件已被新的流程或工具取代。

---

## 📝 歸檔原則

1. **保留理由**: 這些檔案記錄了專案開發的重要歷程與決策過程
2. **不刪除**: 保留作為歷史參考，未來可能有參考價值
3. **不提交**: 已加入 `.gitignore`，不佔用 Git 倉庫空間
4. **分類管理**: 按功能分類，便於日後查找

---

## 🔍 如何查找歷史資訊

- **修復記錄**: 查看 [fixes/](fixes/) 目錄
- **技術調研**: 查看 [research/](research/) 目錄
- **問題診斷**: 查看 [debugging/](debugging/) 目錄
- **決策記錄**: 查看 [decisions/](decisions/) 目錄
- **最新文件**: 查看 [docs/](../../) 根目錄或 [specs/](../../../specs/) 對應功能模組

---

**最後更新**: 2026-01-09
