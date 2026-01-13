# 017-health-check: 專案健康檢查系統

## 專案概述

這是 Vsale-lite 專案的全面健康檢查規劃，涵蓋架構、API、使用者體驗、設計、效能、Bug 和安全性等七大領域的深度檢查。

## 檢查領域

### 🏗️ 1. 架構健康度 (Priority: P0)
- 路由結構檢查（路由群組隔離、middleware 權限控制）
- Server Actions 模式檢查
- Supabase Client 使用規範
- 模組依賴關係檢查

### 🔌 2. API 整合度 (Priority: P0)
- Server Actions 品質檢查（checkAuth、Zod 驗證、revalidatePath）
- 回傳型別統一性（ActionResult<T>）
- 錯誤處理完整性
- RLS Policies 檢查

### 👤 3. 使用者體驗 (Priority: P1)
- 前台操作流程（登入 → 瀏覽 → 購物車 → 結帳 → 訂單）
- 後台操作流程（登入 → 開戶 → 商品管理 → 訂單管理）
- 錯誤提示清晰度
- 操作步驟合理性

### 🎨 4. 設計系統一致性 (Priority: P1)
- Neo-Brutalism 風格檢查（邊框、陰影、點擊效果）
- 響應式設計規範（斷點、手機/桌面樣式）
- 設計 Token 使用檢查
- 統一對話框系統檢查

### ⚡ 5. 效能與速度 (Priority: P1)
- 頁面載入時間測量（目標: < 2s）
- 資料庫查詢效能（目標: p95 < 100ms）
- 圖片優化檢查（Next.js Image、WebP 格式）
- 快取策略檢查

### 🐛 6. Bug 與邏輯錯誤 (Priority: P0)
- 邊界條件測試（空值、負數、特殊字元）
- 資料一致性檢查（庫存、訂單狀態、優惠券）
- 並發操作測試
- 錯誤恢復測試

### 🔒 7. 資料庫安全 (Priority: P0)
- RLS Policies 完整性
- Migration 品質檢查（增量式、無破壞性變更）
- 備份系統檢查
- 索引檢查

## 檔案結構

```
specs/017-health-check/
├── spec.md                          # 功能規格文件（本階段完成）
├── README.md                        # 本檔案
├── checklists/
│   └── requirements.md              # 規格品質檢查清單（✅ 已通過）
├── contracts/                       # API 合約（計畫階段產生）
└── [其他檔案將在後續階段產生]
    ├── plan.md                      # 實作計畫
    ├── tasks.md                     # 任務清單
    ├── research.md                  # 研究紀錄
    └── quickstart.md                # 快速上手指南
```

## 當前狀態

### ✅ 已完成 (Specify 階段)

1. **規格文件撰寫** (`spec.md`)
   - 7 個使用者故事（US1-US7）涵蓋所有檢查領域
   - 8 個功能需求（FR1-FR8）定義檢查項目和輸出格式
   - 8 個成功標準（Success Criteria）定義量化目標
   - 6 個邊界條件（Edge Cases）識別潛在風險

2. **規格品質驗證** (`checklists/requirements.md`)
   - ✅ 所有品質檢查項目通過
   - ✅ 無 [NEEDS CLARIFICATION] 標記
   - ✅ 成功標準皆為可量化、技術無關
   - ✅ 已準備好進入計畫階段

### 📋 下一步

執行 `/speckit.planning` 進入實作計畫階段，將產生：
- 詳細的實作計畫（技術選型、工具選擇、實作步驟）
- 任務分解（逐步執行的檢查項目）
- 時程規劃（各檢查領域的執行順序）

## 預期成果

### 綜合健康檢查報告

完成所有檢查後，將產生一份綜合報告，包含：

1. **整體健康度評分** (0-100 分)
   - 架構健康度（權重: 15%）
   - API 整合度（權重: 15%）
   - 使用者體驗（權重: 15%）
   - 設計一致性（權重: 10%）
   - 效能表現（權重: 15%）
   - Bug 修復（權重: 15%）
   - 資料安全（權重: 15%）

2. **問題清單** (依嚴重程度排序)
   - Critical: 嚴重影響系統穩定性或安全性
   - High: 明顯影響使用者體驗或效能
   - Medium: 次要問題，但應盡快修復
   - Low: 優化建議，可排程處理

3. **修復建議** (具體步驟 + 預估工作量)
   - P0: 必須立即修復（blocking issues）
   - P1: 應該盡快修復（高優先級）
   - P2: 可以排程修復（中優先級）

## 效能目標

根據專案憲章定義的效能目標：

| 指標 | 目標 | 測試條件 |
|------|------|----------|
| 頁面首次載入 | < 2s | Mobile 4G 網路 |
| 登入驗證響應 | < 500ms | 正常網路條件 |
| 客戶搜尋響應 | < 300ms | 正常網路條件 |
| 資料庫查詢 | < 100ms (p95) | 正常負載條件 |

## 參考資料

- 專案憲章: [d:\APP\vsale\CLAUDE.md](../../CLAUDE.md)
- 資料庫安全協議: [docs/DATABASE_SAFETY_PROTOCOL.md](../../docs/DATABASE_SAFETY_PROTOCOL.md)
- 響應式設計規範: 憲章第 VII 條（005-responsive-ui）
- 統一對話框系統: 憲章第 VIII 條（013-unified-dialog）

## 關於 SpecKit 結構

本專案使用 Claude Code 的 SpecKit 系統進行功能開發管理。SpecKit 的命令檔案位於 `.claude/commands/` 目錄：

- `/speckit.specify`: 建立功能規格文件（當前階段）
- `/speckit.clarify`: 釐清規格需求
- `/speckit.planning`: 建立技術實作計畫
- `/speckit.tasks`: 產生任務清單
- `/speckit.implement`: 執行實作
- `/speckit.analyze`: 分析規格一致性

**注意**: 本專案不使用 `.specify/scripts/` 目錄結構，所有 specs 目錄都是手動建立和管理的。這是正常且靈活的使用方式。
