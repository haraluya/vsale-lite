# Implementation Plan: 報表與分析系統

**Branch**: `005-reports-analytics` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-reports-analytics/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

實作完整的報表與分析系統，為管理員提供即時數據洞察與決策支援。系統包含三大核心模組：

1. **銷售報表**：訂單統計、營收分析、熱銷商品排行
2. **庫存分析**：庫存水位監控、缺貨預警、庫存週轉率
3. **客戶分析**：等級分佈、下單頻率、客單價統計

採用 PostgreSQL 視圖 (Views) 與聚合函數實現高效能查詢，透過 Next.js Server Actions 提供 API，使用 Recharts 進行資料視覺化。

## Technical Context

**Language/Version**: TypeScript 5.7+
**Primary Dependencies**: Next.js 15.1+, React 19, Supabase (@supabase/supabase-js v2.47+), Recharts 2.x, date-fns 3.x
**Storage**: Supabase (PostgreSQL) - 使用 Views、Materialized Views、PostgreSQL Functions
**Testing**: Vitest + React Testing Library
**Target Platform**: Web (管理員桌面裝置優先)
**Project Type**: Web Application (Next.js App Router)
**Performance Goals**:
- 報表查詢響應時間 < 500ms (p95)
- 圖表渲染時間 < 200ms
- 支援最近 12 個月的歷史數據即時查詢
- 大數據集（10,000+ 訂單）分頁載入 < 300ms

**Constraints**:
- 資料查詢必須使用 RLS (Row Level Security) 保護
- 所有統計計算在資料庫層完成（避免客戶端大量運算）
- 圖表必須支援 RWD（桌面、平板、手機）
- 報表數據必須可匯出（CSV/PDF）

**Scale/Scope**:
- 支援 1,000+ 客戶
- 處理 10,000+ 訂單歷史記錄
- 100+ 商品 SKU
- 5-10 個會員等級

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. 使用者角色優先 (User Role First)
- **符合**: 報表與分析系統僅供管理員使用，優化桌面裝置體驗
- **設計決策**:
  - 管理端路由：`/admin/analytics/*`
  - 權限檢查：所有 Server Actions 必須驗證 `role = 'admin'`
  - UI 優化：寬螢幕佈局、多欄位表格、複雜圖表

### ✅ II. 等級綁定價格 (Tier-Based Pricing)
- **符合**: 客戶分析模組會分析不同等級的購買行為與客單價
- **設計決策**:
  - 使用現有 `tiers` 與 `tier_prices` 表進行統計
  - 報表可依會員等級篩選與分組

### ✅ III. 使用者故事驅動開發 (User Story Driven Development)
- **符合**: 功能拆分為獨立可測試的使用者故事（銷售報表、庫存分析、客戶分析）
- **設計決策**:
  - P0: 銷售報表（訂單統計、營收趨勢）
  - P1: 庫存分析（庫存水位、缺貨預警）
  - P2: 客戶分析（等級分佈、購買行為）

### ✅ IV. API 模組化與職責分離 (API Modularization)
- **符合**: UI 元件僅負責顯示，所有統計計算透過 Server Actions 執行
- **設計決策**:
  - 新增 `lib/actions/analytics.ts` - 統一處理報表查詢
  - 資料庫層使用 PostgreSQL Views/Functions 預處理聚合數據
  - UI 元件使用 Recharts 進行視覺化

### ✅ V. 設計系統一致性 (Design System Consistency)
- **符合**: 所有報表卡片、圖表容器遵循 Neo-Brutalism 風格
- **設計決策**:
  - 卡片樣式：`border-3 border-black shadow-neo`
  - 圖表容器：黑邊框 + 硬邊陰影
  - 數據卡片：粗黑邊框 + 鮮明背景色（黃/綠/紅）

### ✅ VI. 負庫存支援 (Negative Stock Support)
- **符合**: 庫存分析模組必須正確處理負庫存（欠貨）狀態
- **設計決策**:
  - 庫存水位圖表支援負值顯示
  - 缺貨預警包含「負庫存商品」類別
  - 週轉率計算考慮負庫存情境

**憲章符合性結論**: ✅ 所有原則均符合，無違規事項

## Project Structure

### Documentation (this feature)

```text
specs/005-reports-analytics/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - 技術選型與最佳實踐研究
├── data-model.md        # Phase 1 output - 資料庫 Views/Functions 設計
├── quickstart.md        # Phase 1 output - 開發者快速上手指南
├── contracts/           # Phase 1 output - Server Actions API 合約
│   ├── analytics.md     # 報表查詢 API
│   └── export.md        # 資料匯出 API
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
└── (admin)/
    └── admin/
        └── analytics/                  # 🆕 報表與分析路由
            ├── layout.tsx              # 報表頁面佈局
            ├── page.tsx                # 總覽儀表板
            ├── sales/
            │   └── page.tsx            # 銷售報表
            ├── inventory/
            │   └── page.tsx            # 庫存分析
            └── customers/
                └── page.tsx            # 客戶分析

components/
└── admin/
    └── analytics/                      # 🆕 報表元件
        ├── sales/
        │   ├── RevenueChart.tsx        # 營收趨勢圖
        │   ├── OrderStatsCard.tsx      # 訂單統計卡片
        │   └── TopProductsTable.tsx    # 熱銷商品表格
        ├── inventory/
        │   ├── StockLevelChart.tsx     # 庫存水位圖
        │   ├── LowStockAlert.tsx       # 缺貨預警
        │   └── TurnoverRateCard.tsx    # 週轉率卡片
        └── customers/
            ├── TierDistributionChart.tsx # 等級分佈圖
            ├── OrderFrequencyChart.tsx   # 下單頻率圖
            └── AvgOrderValueCard.tsx     # 平均客單價卡片

lib/
└── actions/
    ├── analytics.ts                    # 🆕 報表查詢 Server Actions
    └── export.ts                       # 🆕 資料匯出 Server Actions

supabase/
└── migrations/
    └── 20260103000000_analytics_views.sql  # 🆕 資料庫 Views/Functions

types/
└── analytics.ts                        # 🆕 報表資料型別定義
```

**Structure Decision**: 採用 Next.js App Router 標準結構，報表功能集中在 `/admin/analytics` 路由群組下。所有統計計算透過資料庫 Views 與 Server Actions 完成，UI 元件專注於資料視覺化。

## Complexity Tracking

> **此功能無憲章違規事項，此區塊為空**

## Phase 0: Research Tasks

**目標**: 解決技術選型與最佳實踐問題，輸出 `research.md`

### Research Items

1. **PostgreSQL Views vs Materialized Views**
   - 問題：報表查詢應使用 Views 還是 Materialized Views？
   - 研究方向：
     - 即時性需求 vs 效能考量
     - 更新頻率與 Refresh 策略
     - Supabase 對 Materialized Views 的支援

2. **圖表函式庫選擇**
   - 問題：Recharts vs Chart.js vs D3.js？
   - 研究方向：
     - React 整合友善度
     - RWD 支援
     - 客製化能力
     - Bundle Size

3. **日期範圍篩選最佳實踐**
   - 問題：如何高效處理「最近 7 天 / 30 天 / 12 個月」等時間範圍查詢？
   - 研究方向：
     - PostgreSQL 日期函數最佳實踐
     - 索引策略
     - 快取策略

4. **資料匯出策略**
   - 問題：CSV/PDF 匯出應在前端還是後端處理？
   - 研究方向：
     - 大數據集匯出效能
     - 瀏覽器記憶體限制
     - Streaming 匯出可行性

5. **RLS 與聚合查詢效能**
   - 問題：RLS 是否會影響聚合查詢效能？
   - 研究方向：
     - Supabase RLS 對 Views 的影響
     - 查詢計畫分析
     - 效能優化策略

## Phase 1: Design Artifacts

**前置條件**: `research.md` 完成

### 1. data-model.md

**內容**:
- 資料庫 Views 設計（sales_overview, inventory_status, customer_stats）
- PostgreSQL Functions（calculate_turnover_rate, get_top_products）
- 索引策略
- RLS 策略

### 2. contracts/

**檔案**:
- `analytics.md`: 定義所有報表查詢 Server Actions 的輸入/輸出型別
- `export.md`: 定義資料匯出 API 的格式與參數

### 3. quickstart.md

**內容**:
- 開發環境設置（安裝 Recharts、date-fns）
- 資料庫 Migration 執行步驟
- 本地測試資料產生腳本
- 圖表元件使用範例

## Next Steps

執行順序：
1. ✅ 填寫 Technical Context（已完成）
2. ⏳ 執行 Constitution Check（進行中）
3. ⏭ Phase 0: 執行研究任務，產生 `research.md`
4. ⏭ Phase 1: 基於研究結果，產生設計文件
5. ⏭ Phase 1: 執行 `update-agent-context.ps1` 更新 CLAUDE.md
6. ⏭ 重新檢查 Constitution Check
7. ⏭ 產生完整實作計畫報告

**注意**: 本計畫僅執行到 Phase 1，不包含 Phase 2 (tasks.md)。任務拆分由 `/speckit.tasks` 命令執行。
