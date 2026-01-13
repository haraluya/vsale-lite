# Data Model: 專案健康檢查系統

**Feature Branch**: `017-health-check`
**Created**: 2026-01-13
**Related**: [spec.md](./spec.md) | [research.md](./research.md)

---

## Overview

專案健康檢查系統的資料模型定義了健康檢查報告的資料結構。這些資料結構**不會儲存到資料庫**，而是以 **JSON + Markdown 檔案**形式儲存在專案中，方便版本控制和追蹤。

### 設計原則

1. **檔案系統儲存**: 所有報告儲存為檔案（Markdown + JSON），不佔用資料庫空間
2. **版本控制友善**: 使用 Git 追蹤報告變更歷史，可比較不同時間點的健康度
3. **人類可讀**: Markdown 格式易讀，JSON 格式可程式化處理
4. **可追蹤性**: 每個問題都有唯一 ID，可追蹤修復進度

---

## File Structure

```text
specs/017-health-check/
├── reports/                              # 健康檢查報告目錄
│   ├── YYYY-MM-DD-HHMMSS/                # 報告時間戳目錄
│   │   ├── summary.md                    # 綜合健康檢查報告（Markdown）
│   │   ├── summary.json                  # 綜合健康檢查報告（JSON）
│   │   ├── architecture.json             # 架構檢查結果（詳細）
│   │   ├── api.json                      # API 整合度檢查結果（詳細）
│   │   ├── ux.json                       # 使用者體驗檢查結果（詳細）
│   │   ├── design.json                   # 設計系統檢查結果（詳細）
│   │   ├── performance.json              # 效能檢查結果（詳細）
│   │   ├── bugs.json                     # Bug 檢查結果（詳細）
│   │   ├── security.json                 # 安全性檢查結果（詳細）
│   │   └── issues/                       # 問題清單（可匯出為 GitHub Issues）
│   │       ├── critical.md               # Critical 問題清單
│   │       ├── high.md                   # High 問題清單
│   │       ├── medium.md                 # Medium 問題清單
│   │       └── low.md                    # Low 問題清單
│   └── latest -> YYYY-MM-DD-HHMMSS/      # 符號連結指向最新報告
└── scripts/                              # 健康檢查腳本（產生報告）
    ├── run-health-check.ts               # 主執行腳本
    ├── check-architecture.ts             # 架構檢查腳本
    ├── check-api.ts                      # API 檢查腳本
    ├── check-ux.ts                       # UX 檢查腳本
    ├── check-design.ts                   # 設計檢查腳本
    ├── check-performance.ts              # 效能檢查腳本
    ├── check-bugs.ts                     # Bug 檢查腳本
    ├── check-security.ts                 # 安全檢查腳本
    ├── generate-report.ts                # 報告產生器
    └── export-to-github-issues.ts        # GitHub Issues 匯出器
```

---

## Core Entities

### 1. HealthCheckReport (健康檢查報告)

綜合健康檢查報告，包含所有領域的評分和問題摘要。

```typescript
interface HealthCheckReport {
  // 基本資訊
  reportId: string                 // 報告 ID（UUID）
  timestamp: string                // 報告產生時間（ISO 8601 格式）
  branch: string                   // 檢查的 Git 分支名稱
  commit: string                   // 檢查的 Git commit hash

  // 整體評分
  overallScore: number             // 整體健康度評分（0-100）
  previousScore?: number           // 上次檢查的評分（用於比較）
  scoreChange?: number             // 評分變化（+5 / -3）

  // 各領域評分（權重總和 = 100%）
  scores: {
    architecture: DomainScore      // 架構健康度（權重 15%）
    api: DomainScore               // API 整合度（權重 15%）
    ux: DomainScore                // 使用者體驗（權重 15%）
    design: DomainScore            // 設計一致性（權重 10%）
    performance: DomainScore       // 效能表現（權重 15%）
    bugs: DomainScore              // Bug 修復（權重 15%）
    security: DomainScore          // 資料安全（權重 15%）
  }

  // 問題統計
  issueCounts: {
    total: number                  // 總問題數
    critical: number               // Critical 問題數
    high: number                   // High 問題數
    medium: number                 // Medium 問題數
    low: number                    // Low 問題數
  }

  // 問題清單（依嚴重程度排序）
  issues: Issue[]

  // 修復建議
  recommendations: Recommendation[]

  // 執行資訊
  execution: {
    duration: number               // 執行時間（秒）
    checksRun: number              // 執行的檢查項目數
    checksPassed: number           // 通過的檢查項目數
    checksFailed: number           // 失敗的檢查項目數
  }
}
```

---

### 2. DomainScore (領域評分)

單一領域的評分詳情。

```typescript
interface DomainScore {
  name: string                     // 領域名稱（如 "Architecture"）
  score: number                    // 評分（0-100）
  weight: number                   // 權重（0-1，如 0.15 表示 15%）
  weightedScore: number            // 加權評分（score × weight）

  // 檢查統計
  checksTotal: number              // 總檢查項目數
  checksPassed: number             // 通過檢查項目數
  checksFailed: number             // 失敗檢查項目數
  passRate: number                 // 通過率（0-1）

  // 問題數
  issueCount: {
    critical: number
    high: number
    medium: number
    low: number
  }

  // 詳細報告檔案路徑
  detailsFile: string              // 如 "architecture.json"
}
```

---

### 3. Issue (問題)

發現的問題詳情。

```typescript
interface Issue {
  // 基本資訊
  issueId: string                  // 問題 ID（UUID）
  reportId: string                 // 所屬報告 ID

  // 分類
  category: IssueCat Category      // 領域（architecture / api / ux / design / performance / bugs / security）
  severity: IssueSeverity          // 嚴重程度（critical / high / medium / low）

  // 內容
  title: string                    // 問題標題（簡短描述）
  description: string              // 問題描述（詳細說明）

  // 位置
  location: IssueLocation          // 問題位置（檔案路徑、行號、元件名稱等）

  // 影響
  impact: string                   // 影響範圍和嚴重性說明

  // 狀態
  status: IssueStatus              // 狀態（open / fixed / acknowledged / wont_fix）

  // 修復建議
  recommendation?: Recommendation  // 對應的修復建議

  // 時間戳
  discoveredAt: string             // 發現時間（ISO 8601）
  fixedAt?: string                 // 修復時間（如已修復）
}

type IssueCategory =
  | 'architecture'
  | 'api'
  | 'ux'
  | 'design'
  | 'performance'
  | 'bugs'
  | 'security'

type IssueSeverity =
  | 'critical'   // 嚴重影響系統穩定性或安全性，必須立即修復
  | 'high'       // 明顯影響使用者體驗或效能，應盡快修復
  | 'medium'     // 次要問題，但應在下個迭代修復
  | 'low'        // 優化建議，可排程處理

type IssueStatus =
  | 'open'         // 待修復
  | 'fixed'        // 已修復
  | 'acknowledged' // 已知曉但暫不修復（記錄原因）
  | 'wont_fix'     // 不修復（記錄原因）

interface IssueLocation {
  type: 'file' | 'component' | 'function' | 'route' | 'database'

  // 檔案位置
  filePath?: string                // 檔案路徑（相對於專案根目錄）
  lineStart?: number               // 起始行號
  lineEnd?: number                 // 結束行號
  columnStart?: number             // 起始列號
  columnEnd?: number               // 結束列號

  // 元件/函數名稱
  name?: string                    // 元件或函數名稱

  // 路由
  route?: string                   // 路由路徑（如 "/admin/dashboard"）

  // 資料庫
  table?: string                   // 資料表名稱
  column?: string                  // 欄位名稱
  policy?: string                  // RLS Policy 名稱

  // 超連結（方便導覽）
  link?: string                    // VSCode 超連結（如 "file:///.../file.ts#L42"）
}
```

---

### 4. Recommendation (修復建議)

具體的修復建議和步驟。

```typescript
interface Recommendation {
  // 基本資訊
  recommendationId: string         // 建議 ID（UUID）
  issueId: string                  // 對應的問題 ID

  // 優先級
  priority: RecommendationPriority // 優先級（p0 / p1 / p2）

  // 內容
  title: string                    // 建議標題
  action: string                   // 具體的修復步驟（Markdown 格式，支援程式碼區塊）

  // 工作量
  estimatedEffort: string          // 預估工作量（如 "1-2 小時" / "1 天" / "1 週"）

  // 參考資料
  references: Reference[]          // 參考資料清單

  // 範例
  exampleCode?: string             // 修復範例程式碼（如適用）

  // 狀態
  status: RecommendationStatus     // 狀態（pending / in_progress / done / skipped）

  // 時間戳
  createdAt: string                // 建立時間
  completedAt?: string             // 完成時間（如已完成）
}

type RecommendationPriority =
  | 'p0'  // 必須立即修復（blocking issues）
  | 'p1'  // 應該盡快修復（高優先級）
  | 'p2'  // 可以排程修復（中優先級）

type RecommendationStatus =
  | 'pending'      // 待處理
  | 'in_progress'  // 處理中
  | 'done'         // 已完成
  | 'skipped'      // 已跳過（記錄原因）

interface Reference {
  title: string                    // 參考資料標題
  url: string                      // 參考資料 URL
  type: ReferenceType              // 參考資料類型
}

type ReferenceType =
  | 'documentation'  // 官方文件
  | 'guide'          // 教學指南
  | 'example'        // 範例程式碼
  | 'discussion'     // 討論串
  | 'issue'          // GitHub Issue
  | 'spec'           // 專案規格文件
```

---

## Detailed Domain Reports

各領域的詳細檢查報告（JSON 格式），包含所有檢查項目的結果。

### Architecture Report (architecture.json)

```typescript
interface ArchitectureReport {
  domain: 'architecture'
  timestamp: string
  score: DomainScore

  checks: {
    // 路由結構檢查
    routeStructure: CheckResult
    // Server Actions 模式檢查
    serverActions: CheckResult
    // Supabase Client 使用檢查
    supabaseClientUsage: CheckResult
    // 模組依賴檢查
    moduleDependencies: CheckResult
  }

  issues: Issue[]
  recommendations: Recommendation[]
}

interface CheckResult {
  name: string                     // 檢查項目名稱
  passed: boolean                  // 是否通過
  details: string                  // 詳細結果
  items: CheckItem[]               // 檢查的具體項目
}

interface CheckItem {
  location: IssueLocation          // 位置
  status: 'pass' | 'fail' | 'warning'
  message: string                  // 訊息
}
```

### API Report (api.json)

```typescript
interface APIReport {
  domain: 'api'
  timestamp: string
  score: DomainScore

  checks: {
    // Server Actions 品質檢查
    serverActionsQuality: CheckResult
    // 錯誤處理檢查
    errorHandling: CheckResult
    // 權限驗證檢查
    authorizationChecks: CheckResult
    // RLS Policies 檢查
    rlsPolicies: CheckResult
  }

  // Server Actions 統計
  serverActionsStats: {
    total: number                  // 總 Server Actions 數
    withUseServer: number          // 包含 'use server' 的數量
    withCheckAuth: number          // 包含 checkAuth() 的數量
    withZodValidation: number      // 包含 Zod 驗證的數量
    withRevalidatePath: number     // 包含 revalidatePath() 的數量
    withCorrectReturnType: number  // 回傳型別正確的數量
  }

  issues: Issue[]
  recommendations: Recommendation[]
}
```

### Performance Report (performance.json)

```typescript
interface PerformanceReport {
  domain: 'performance'
  timestamp: string
  score: DomainScore

  // Lighthouse 報告
  lighthouse: {
    performance: number            // 效能評分（0-100）
    accessibility: number          // 無障礙評分（0-100）
    bestPractices: number          // 最佳實踐評分（0-100）
    seo: number                    // SEO 評分（0-100）
    pwa: number                    // PWA 評分（0-100）

    metrics: {
      firstContentfulPaint: number  // 首次內容繪製（ms）
      largestContentfulPaint: number // 最大內容繪製（ms）
      totalBlockingTime: number     // 總阻塞時間（ms）
      cumulativeLayoutShift: number // 累積版面配置偏移
      speedIndex: number            // 速度指數（ms）
      timeToInteractive: number     // 可互動時間（ms）
    }

    // 效能預算
    budgets: {
      name: string                  // 預算名稱
      budget: number                // 預算值
      actual: number                // 實際值
      passed: boolean               // 是否通過
    }[]
  }

  // Web Vitals
  webVitals: {
    route: string                   // 路由
    lcp: number                     // Largest Contentful Paint (ms)
    fid: number                     // First Input Delay (ms)
    cls: number                     // Cumulative Layout Shift
    ttfb: number                    // Time to First Byte (ms)
    fcp: number                     // First Contentful Paint (ms)
  }[]

  // 資料庫查詢效能
  databaseQueries: {
    query: string                   // 查詢描述
    p50: number                     // P50 查詢時間（ms）
    p95: number                     // P95 查詢時間（ms）
    p99: number                     // P99 查詢時間（ms）
    passed: boolean                 // 是否通過目標（< 100ms）
  }[]

  issues: Issue[]
  recommendations: Recommendation[]
}
```

---

## Example Report

### summary.md (Markdown 格式範例)

```markdown
# 健康檢查報告

**報告 ID**: 017-health-check-2026-01-13-160000
**報告時間**: 2026-01-13 16:00:00
**分支**: 017-health-check
**Commit**: 36118d1

---

## 整體健康度評分

**總分**: 87 / 100 ✅
**上次評分**: 82 / 100
**評分變化**: +5 📈

---

## 各領域評分

| 領域 | 評分 | 權重 | 加權評分 | 狀態 |
|------|------|------|----------|------|
| 架構健康度 | 95 / 100 | 15% | 14.25 | ✅ 優秀 |
| API 整合度 | 92 / 100 | 15% | 13.80 | ✅ 優秀 |
| 使用者體驗 | 88 / 100 | 15% | 13.20 | ✅ 良好 |
| 設計一致性 | 90 / 100 | 10% | 9.00 | ✅ 優秀 |
| 效能表現 | 85 / 100 | 15% | 12.75 | ✅ 良好 |
| Bug 修復 | 80 / 100 | 15% | 12.00 | ⚠️ 需改進 |
| 資料安全 | 93 / 100 | 15% | 13.95 | ✅ 優秀 |

---

## 問題統計

| 嚴重程度 | 數量 | 狀態 |
|----------|------|------|
| Critical | 2 | 🔴 需立即處理 |
| High | 5 | 🟡 應盡快處理 |
| Medium | 12 | 🔵 可排程處理 |
| Low | 8 | ⚪ 優化建議 |
| **總計** | **27** | |

---

## Critical 問題清單

### 1. [🔴 Critical] 缺少 RLS Policy 保護敏感資料表

**位置**: `supabase/migrations/20260107170000_rls_policies.sql`
**影響**: 客戶可能存取到其他客戶的訂單資料

**修復建議** (P0 - 必須立即修復):
1. 為 `orders` 表新增 RLS Policy，限制客戶僅能查看自己的訂單
2. 為 `order_items` 表新增 RLS Policy，限制客戶僅能查看自己訂單的明細

**預估工作量**: 1-2 小時

**參考資料**:
- [Supabase RLS 文件](https://supabase.com/docs/guides/auth/row-level-security)
- [專案 RLS 規範](../../docs/DATABASE_SAFETY_PROTOCOL.md)

---

### 2. [🔴 Critical] 部分 Server Actions 缺少權限驗證

**位置**: `lib/actions/products.ts:42-58`
**影響**: 未授權使用者可能執行管理員操作

**修復建議** (P0 - 必須立即修復):
1. 在 `updateProduct()` 函數開頭加入 `await checkAuth('admin')`
2. 在 `deleteProduct()` 函數開頭加入 `await checkAuth('admin')`

**預估工作量**: 30 分鐘

**範例程式碼**:
\`\`\`typescript
export async function updateProduct(data: ProductInput): Promise<ActionResult<Product>> {
  'use server'

  // ✅ 加入權限驗證
  await checkAuth('admin')

  // ... 其餘邏輯
}
\`\`\`

---

## High 問題清單

（省略，格式同上）

---

## 執行資訊

- **執行時間**: 12 分 34 秒
- **檢查項目**: 156 項
- **通過檢查**: 139 項
- **失敗檢查**: 17 項
- **通過率**: 89.1%

---

## 建議行動

1. **立即處理 Critical 問題** (2 項) - 預估 2-3 小時
2. **規劃 High 優先級問題** (5 項) - 預估 1-2 天
3. **排程 Medium 優先級問題** (12 項) - 可在下個迭代處理
4. **記錄 Low 優先級建議** (8 項) - 可作為長期優化目標

**下次健康檢查建議**: 2 週後（2026-01-27）
```

---

## Validation Rules

### Report Generation

1. **報告 ID 格式**: `{feature}-{YYYY-MM-DD}-{HHMMSS}`
2. **時間戳格式**: ISO 8601 格式（`YYYY-MM-DDTHH:MM:SS.SSSZ`）
3. **評分範圍**: 0-100（整數）
4. **權重總和**: 所有領域權重總和必須 = 1.0（100%）

### Issue Validation

1. **問題 ID**: UUID v4 格式
2. **位置資訊**: 至少包含 `filePath` 或 `name` 其中一個
3. **嚴重程度**: 必須為 `critical` / `high` / `medium` / `low` 之一
4. **狀態**: 必須為 `open` / `fixed` / `acknowledged` / `wont_fix` 之一

### Recommendation Validation

1. **建議 ID**: UUID v4 格式
2. **優先級**: 必須為 `p0` / `p1` / `p2` 之一
3. **工作量格式**: `{N}-{M} {單位}`（如 "1-2 小時"、"3-5 天"）
4. **參考資料**: 至少包含 1 個參考資料

---

## Integration with Git

### Tracking Report Changes

```bash
# 建立新報告後自動 commit
git add specs/017-health-check/reports/
git commit -m "chore: 新增健康檢查報告 (2026-01-13)"

# 比較兩次報告的差異
git diff HEAD~1 specs/017-health-check/reports/latest/summary.json
```

### Comparing Scores

```bash
# 使用 jq 比較評分變化
jq '.overallScore' specs/017-health-check/reports/latest/summary.json
jq '.overallScore' specs/017-health-check/reports/2026-01-10-150000/summary.json
```

---

## Export to GitHub Issues

健康檢查報告可自動匯出為 GitHub Issues，方便追蹤修復進度。

### Issue Format

```markdown
### [🔴 Critical] 缺少 RLS Policy 保護敏感資料表

**領域**: Security
**位置**: `supabase/migrations/20260107170000_rls_policies.sql`
**發現時間**: 2026-01-13 16:00:00

#### 問題描述

客戶可能存取到其他客戶的訂單資料，因為 `orders` 和 `order_items` 表缺少 RLS Policy 保護。

#### 影響範圍

- 資料安全風險：高
- 影響使用者：所有客戶
- GDPR 合規性：違反

#### 修復建議 (P0 - 必須立即修復)

1. 為 `orders` 表新增 RLS Policy，限制客戶僅能查看自己的訂單
2. 為 `order_items` 表新增 RLS Policy，限制客戶僅能查看自己訂單的明細

**預估工作量**: 1-2 小時

#### 參考資料

- [Supabase RLS 文件](https://supabase.com/docs/guides/auth/row-level-security)
- [專案 RLS 規範](../../docs/DATABASE_SAFETY_PROTOCOL.md)

#### 健康檢查報告

- 報告 ID: `017-health-check-2026-01-13-160000`
- 問題 ID: `550e8400-e29b-41d4-a716-446655440000`

---

**Labels**: `critical`, `security`, `rls-policy`, `health-check`
**Assignees**: `@team-backend`
**Milestone**: `017-health-check`
```

---

## Performance Considerations

### Report Generation Time

- **目標**: 完整健康檢查在 10 分鐘內完成
- **策略**: 各領域檢查並行執行（使用 Promise.all）

### Report File Size

- **Markdown**: 預估 50-100 KB
- **JSON**: 預估 200-500 KB
- **總計**: < 1 MB（易於 Git 追蹤）

---

## Future Enhancements

1. **歷史趨勢圖表**: 使用 Chart.js 顯示評分趨勢
2. **自動化修復**: 部分問題支援一鍵修復（如格式化、加入 checkAuth）
3. **CI/CD 整合**: 在 GitHub Actions 中自動執行健康檢查
4. **通知系統**: Critical 問題自動發送 Email / Slack 通知
5. **Web Dashboard**: 建立網頁介面查看報告（可選）
