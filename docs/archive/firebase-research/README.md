# Firebase 研究報告封存

## 說明

這些檔案記錄了 Vsale-lite 專案在 2026-01-09 遷移到 Vercel 之前的 Firebase 研究與計畫。

**專案現狀**: 已完全遷移至 Vercel + Supabase 技術棧，不再使用 Firebase。

---

## 檔案清單

### 研究文件
- [RESEARCH_SUMMARY.txt](RESEARCH_SUMMARY.txt) - Firebase Cloud Scheduler 與自動化 REFRESH 機制研究
- [RESEARCH_COMPLETION_REPORT.txt](RESEARCH_COMPLETION_REPORT.txt) - 計畫階段的部署選項評估

---

## 歷史參考價值

這些文件保留作為：
1. **技術決策過程記錄** - 記錄專案在選擇部署平台時的評估過程
2. **替代方案評估參考** - 提供未來類似專案的技術選型參考
3. **專案演進歷史** - 完整保留專案從 Firebase 計畫到 Vercel 實作的演進軌跡

---

## 技術棧演進時間軸

```
2026-01 初期
├─ Firebase App Hosting (計畫階段)
│  ├─ Cloud Scheduler 自動化研究
│  ├─ Firebase Auth 評估
│  └─ Firestore 資料庫方案
│
└─ 2026-01-09 遷移決策
   ├─ ✅ 改用 Vercel (Serverless)
   ├─ ✅ 採用 Supabase (PostgreSQL + Auth)
   ├─ ✅ Vercel Cron Job 替代 Cloud Scheduler
   └─ ✅ Google Cloud Storage 備份方案
```

---

## 現行技術棧（2026-01-10）

| 項目 | 技術選型 | 備註 |
|------|---------|------|
| **部署平台** | Vercel (Serverless) | sin1 區域（新加坡） |
| **資料庫** | Supabase (PostgreSQL) | ap-southeast-1 區域 |
| **認證** | Supabase Auth | 完整 RLS 權限控制 |
| **儲存** | Supabase Storage + Vercel Blob + Google Cloud Storage | 多層備份策略 |
| **自動化** | Vercel Cron Job + GitHub Actions | CI/CD 全自動化 |
| **備份** | Supabase 原生備份 API | 每日自動備份 |

---

## 相關文件

### 現行部署指南
- [DEPLOYMENT.md](../../../DEPLOYMENT.md) - 完整 Vercel 部署指南
- [CLAUDE.md](../../../CLAUDE.md) - 專案上下文與技術棧說明

### Migration 文件
- [_CHECKLIST.md](../../../supabase/migrations/_CHECKLIST.md) - 部署檢查清單
- [MIGRATION_STANDARDS.md](../../../supabase/migrations/MIGRATION_STANDARDS.md) - Migration 標準

### 備份方案
- [specs/015-cloud-backup/](../../../specs/015-cloud-backup/) - 雲端備份系統完整規格

---

**封存日期**: 2026-01-10
**封存原因**: 專案已完全遷移至 Vercel，Firebase 相關內容不再使用
**封存者**: Claude Code (Sonnet 4.5)
