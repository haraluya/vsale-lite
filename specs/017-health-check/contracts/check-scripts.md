# Check Scripts API Contract

**Feature Branch**: `017-health-check`
**Created**: 2026-01-13
**Related**: [types.ts](./types.ts) | [data-model.md](../data-model.md)

---

## Overview

本文件定義所有健康檢查腳本的 API 合約，包含輸入參數、輸出格式、錯誤處理等。

所有檢查腳本都位於 `scripts/health-check/` 目錄，使用 TypeScript 撰寫，可透過 `tsx` 執行。

---

## Common Interface

所有檢查腳本都遵循相同的介面規範：

```typescript
interface CheckScript<T> {
  /**
   * 執行檢查
   * @param options 檢查選項
   * @returns 檢查結果
   */
  run(options: CheckOptions): Promise<CheckScriptResult<T>>
}
```

### CheckOptions

```typescript
interface CheckOptions {
  /** 專案根目錄（預設：process.cwd()） */
  rootDir?: string

  /** 輸出目錄（預設：specs/017-health-check/reports/latest） */
  outputDir?: string

  /** 是否詳細輸出（預設：false） */
  verbose?: boolean

  /** 是否產生 JSON 報告（預設：true） */
  generateJson?: boolean

  /** 是否產生 Markdown 報告（預設：true） */
  generateMarkdown?: boolean
}
```

### CheckScriptResult<T>

```typescript
interface CheckScriptResult<T> {
  /** 是否成功 */
  success: boolean

  /** 領域報告 */
  report: T

  /** 錯誤訊息（如失敗） */
  error?: string

  /** 執行時間（秒） */
  duration: number
}
```

---

## Main Script

### run-health-check.ts

主執行腳本，並行執行所有領域檢查，並產生綜合報告。

#### Usage

```bash
# 執行完整健康檢查
tsx scripts/health-check/run-health-check.ts

# 執行特定領域檢查
tsx scripts/health-check/run-health-check.ts --domains architecture,api

# 詳細輸出模式
tsx scripts/health-check/run-health-check.ts --verbose

# 僅產生 JSON 報告（不產生 Markdown）
tsx scripts/health-check/run-health-check.ts --no-markdown
```

#### CLI Options

```typescript
interface CliOptions {
  /** 要執行的領域（逗號分隔，預設：all） */
  domains?: string

  /** 輸出目錄（預設：自動產生時間戳目錄） */
  output?: string

  /** 詳細輸出 */
  verbose?: boolean

  /** 是否產生 JSON 報告（預設：true） */
  json?: boolean

  /** 是否產生 Markdown 報告（預設：true） */
  markdown?: boolean

  /** 是否匯出為 GitHub Issues（預設：false） */
  exportIssues?: boolean
}
```

#### Function Signature

```typescript
async function runHealthCheck(
  options: CliOptions
): Promise<CheckScriptResult<HealthCheckReport>>
```

#### Output

```text
specs/017-health-check/reports/2026-01-13-160000/
├── summary.md                    # 綜合健康檢查報告（Markdown）
├── summary.json                  # 綜合健康檢查報告（JSON）
├── architecture.json             # 架構檢查詳細報告
├── api.json                      # API 檢查詳細報告
├── ux.json                       # UX 檢查詳細報告
├── design.json                   # 設計檢查詳細報告
├── performance.json              # 效能檢查詳細報告
├── bugs.json                     # Bug 檢查詳細報告
├── security.json                 # 安全檢查詳細報告
└── issues/
    ├── critical.md               # Critical 問題清單
    ├── high.md                   # High 問題清單
    ├── medium.md                 # Medium 問題清單
    └── low.md                    # Low 問題清單
```

#### Example

```typescript
import { runHealthCheck } from './scripts/health-check/run-health-check'

const result = await runHealthCheck({
  domains: 'architecture,api,security',
  output: 'specs/017-health-check/reports/2026-01-13-160000',
  verbose: true,
  json: true,
  markdown: true,
  exportIssues: false,
})

console.log(`Overall Score: ${result.report.overallScore}`)
console.log(`Critical Issues: ${result.report.issueCounts.critical}`)
```

---

## Domain Check Scripts

### 1. check-architecture.ts

檢查架構健康度（路由結構、Server Actions 模式、Supabase Client 使用、模組依賴）。

#### Function Signature

```typescript
export async function checkArchitecture(
  options: CheckOptions
): Promise<CheckScriptResult<ArchitectureReport>>
```

#### Checks

1. **Route Structure**: 檢查路由群組隔離（(auth)、(shop)、(admin)）
2. **Server Actions Pattern**: 檢查 Server Actions 是否包含 'use server'、checkAuth()、Zod 驗證
3. **Supabase Client Usage**: 檢查 Server/Client 分離是否正確
4. **Module Dependencies**: 檢查模組間依賴關係（無循環依賴）

#### Example Output

```typescript
{
  success: true,
  report: {
    domain: 'architecture',
    timestamp: '2026-01-13T16:00:00.000Z',
    score: {
      name: 'Architecture',
      score: 95,
      weight: 0.15,
      weightedScore: 14.25,
      checksTotal: 4,
      checksPassed: 4,
      checksFailed: 0,
      passRate: 1.0,
      issueCount: { critical: 0, high: 0, medium: 1, low: 2 },
      detailsFile: 'architecture.json'
    },
    checks: {
      routeStructure: {
        name: 'Route Structure',
        passed: true,
        details: 'All route groups are correctly isolated',
        items: [
          {
            location: { type: 'route', route: '/admin/*' },
            status: 'pass',
            message: 'Admin routes correctly grouped in (admin)'
          }
        ]
      },
      // ... 其他檢查
    },
    issues: [],
    recommendations: []
  },
  duration: 3.5
}
```

---

### 2. check-api.ts

檢查 API 整合度（Server Actions 品質、錯誤處理、權限驗證、RLS Policies）。

#### Function Signature

```typescript
export async function checkAPI(
  options: CheckOptions
): Promise<CheckScriptResult<APIReport>>
```

#### Checks

1. **Server Actions Quality**: 檢查必要步驟（'use server'、checkAuth()、Zod 驗證、revalidatePath()）
2. **Error Handling**: 檢查錯誤處理完整性（try-catch、ActionResult<T> 回傳）
3. **Authorization Checks**: 檢查權限驗證（checkAuth('admin') / checkAuth('client')）
4. **RLS Policies**: 檢查所有表是否啟用 RLS、Policies 是否完整

#### Example Output

```typescript
{
  success: true,
  report: {
    domain: 'api',
    timestamp: '2026-01-13T16:00:00.000Z',
    score: {
      name: 'API Integration',
      score: 92,
      weight: 0.15,
      weightedScore: 13.80,
      // ...
    },
    checks: {
      serverActionsQuality: {
        name: 'Server Actions Quality',
        passed: true,
        details: '45/47 Server Actions have all required steps',
        items: [
          {
            location: {
              type: 'function',
              filePath: 'lib/actions/products.ts',
              lineStart: 42,
              name: 'updateProduct'
            },
            status: 'fail',
            message: 'Missing checkAuth() call'
          }
        ]
      },
      // ... 其他檢查
    },
    serverActionsStats: {
      total: 47,
      withUseServer: 47,
      withCheckAuth: 45,
      withZodValidation: 43,
      withRevalidatePath: 38,
      withCorrectReturnType: 47
    },
    issues: [
      {
        issueId: '550e8400-e29b-41d4-a716-446655440000',
        reportId: '017-health-check-2026-01-13-160000',
        category: 'api',
        severity: 'high',
        title: '2 個 Server Actions 缺少權限驗證',
        description: 'updateProduct() 和 deleteProduct() 缺少 checkAuth() 呼叫',
        location: {
          type: 'file',
          filePath: 'lib/actions/products.ts',
          lineStart: 42,
          lineEnd: 58
        },
        impact: '未授權使用者可能執行管理員操作',
        status: 'open',
        discoveredAt: '2026-01-13T16:00:00.000Z'
      }
    ],
    recommendations: [
      {
        recommendationId: '550e8400-e29b-41d4-a716-446655440001',
        issueId: '550e8400-e29b-41d4-a716-446655440000',
        priority: 'p0',
        title: '加入權限驗證呼叫',
        action: '在 updateProduct() 和 deleteProduct() 函數開頭加入 `await checkAuth(\'admin\')`',
        estimatedEffort: '30 分鐘',
        references: [
          {
            title: '專案 Server Actions 規範',
            url: '../../CLAUDE.md#server-actions-模式',
            type: 'spec'
          }
        ],
        exampleCode: `export async function updateProduct(data: ProductInput): Promise<ActionResult<Product>> {
  'use server'

  // ✅ 加入權限驗證
  await checkAuth('admin')

  // ... 其餘邏輯
}`,
        status: 'pending',
        createdAt: '2026-01-13T16:00:00.000Z'
      }
    ]
  },
  duration: 5.2
}
```

---

### 3. check-ux.ts

檢查使用者體驗（操作流程、錯誤提示、載入狀態）。

#### Function Signature

```typescript
export async function checkUX(
  options: CheckOptions
): Promise<CheckScriptResult<UXReport>>
```

#### Checks

1. **Frontend Flows**: 檢查前台核心操作流程（登入 → 瀏覽 → 購物車 → 結帳 → 訂單）
2. **Admin Flows**: 檢查後台核心操作流程（登入 → 開戶 → 商品管理 → 訂單管理）
3. **Error Messages**: 檢查錯誤訊息是否友善、清晰
4. **Loading States**: 檢查是否有適當的載入狀態提示

#### Example Output

```typescript
{
  success: true,
  report: {
    domain: 'ux',
    timestamp: '2026-01-13T16:00:00.000Z',
    score: {
      name: 'User Experience',
      score: 88,
      weight: 0.15,
      weightedScore: 13.20,
      // ...
    },
    checks: {
      frontendFlows: {
        name: 'Frontend Flows',
        passed: true,
        details: '4/5 frontend flows passed',
        items: []
      },
      // ... 其他檢查
    },
    flows: [
      {
        name: '客戶登入 → 瀏覽商品 → 加入購物車',
        steps: 5,
        passed: true,
        issues: []
      },
      {
        name: '購物車 → 套用優惠券 → 結帳',
        steps: 7,
        passed: false,
        issues: [
          '優惠券輸入框無載入狀態',
          '優惠券驗證失敗訊息不清晰'
        ]
      }
    ],
    issues: [],
    recommendations: []
  },
  duration: 2.8
}
```

---

### 4. check-design.ts

檢查設計系統一致性（Neo-Brutalism 風格、響應式設計、設計 Token、對話框系統）。

#### Function Signature

```typescript
export async function checkDesign(
  options: CheckOptions
): Promise<CheckScriptResult<DesignReport>>
```

#### Checks

1. **Neo-Brutalism Style**: 檢查邊框、陰影、點擊效果是否符合規範
2. **Responsive Design**: 檢查響應式斷點、手機/桌面樣式差異
3. **Design Tokens**: 檢查是否使用 lib/design-tokens.ts 而非硬編碼
4. **Dialog System**: 檢查是否使用統一對話框 hooks 而非原生對話框

#### Example Output

```typescript
{
  success: true,
  report: {
    domain: 'design',
    timestamp: '2026-01-13T16:00:00.000Z',
    score: {
      name: 'Design Consistency',
      score: 90,
      weight: 0.10,
      weightedScore: 9.00,
      // ...
    },
    checks: {
      neoBrutalism: {
        name: 'Neo-Brutalism Style',
        passed: true,
        details: '95% of components follow Neo-Brutalism design',
        items: [
          {
            location: {
              type: 'component',
              filePath: 'components/admin/TierCard.tsx',
              lineStart: 23,
              name: 'TierCard'
            },
            status: 'warning',
            message: 'Missing responsive shadow (should use shadow-neo-sm md:shadow-neo)'
          }
        ]
      },
      // ... 其他檢查
    },
    styleIssues: [
      {
        component: 'TierCard',
        filePath: 'components/admin/TierCard.tsx',
        issues: [
          'Missing responsive shadow (line 23)',
          'Hard-coded border color instead of using design token (line 25)'
        ]
      }
    ],
    issues: [],
    recommendations: []
  },
  duration: 4.1
}
```

---

### 5. check-performance.ts

檢查效能（頁面載入時間、資料庫查詢效能、圖片優化、快取策略）。

#### Function Signature

```typescript
export async function checkPerformance(
  options: CheckOptions
): Promise<CheckScriptResult<PerformanceReport>>
```

#### Checks

1. **Page Load Time**: 使用 Lighthouse 測量頁面載入時間
2. **Database Queries**: 從 Supabase Dashboard 取得查詢效能統計
3. **Image Optimization**: 檢查是否使用 Next.js Image、sizes 屬性、WebP 格式
4. **Cache Strategy**: 檢查 revalidatePath 使用、ISR 設定

#### Example Output

```typescript
{
  success: true,
  report: {
    domain: 'performance',
    timestamp: '2026-01-13T16:00:00.000Z',
    score: {
      name: 'Performance',
      score: 85,
      weight: 0.15,
      weightedScore: 12.75,
      // ...
    },
    lighthouse: {
      performance: 88,
      accessibility: 95,
      bestPractices: 92,
      seo: 100,
      pwa: 80,
      metrics: {
        firstContentfulPaint: 1200,
        largestContentfulPaint: 1800,
        totalBlockingTime: 150,
        cumulativeLayoutShift: 0.05,
        speedIndex: 1500,
        timeToInteractive: 2100
      },
      budgets: [
        {
          name: 'JavaScript Bundle Size',
          budget: 500000,
          actual: 480000,
          passed: true
        },
        {
          name: 'First Contentful Paint',
          budget: 1500,
          actual: 1200,
          passed: true
        }
      ]
    },
    webVitals: [
      {
        route: '/store/home',
        lcp: 1800,
        fid: 50,
        cls: 0.05,
        ttfb: 300,
        fcp: 1200
      },
      {
        route: '/admin/dashboard',
        lcp: 2200,
        fid: 80,
        cls: 0.08,
        ttfb: 400,
        fcp: 1500
      }
    ],
    databaseQueries: [
      {
        query: 'SELECT * FROM products WHERE category_id = $1',
        p50: 45,
        p95: 85,
        p99: 120,
        passed: true
      },
      {
        query: 'Complex join query for order details',
        p50: 120,
        p95: 180,
        p99: 250,
        passed: false
      }
    ],
    issues: [],
    recommendations: []
  },
  duration: 8.5
}
```

---

### 6. check-bugs.ts

檢查潛在 Bug（邊界條件、資料一致性、並發操作、錯誤恢復）。

#### Function Signature

```typescript
export async function checkBugs(
  options: CheckOptions
): Promise<CheckScriptResult<BugsReport>>
```

#### Checks

1. **Boundary Conditions**: 測試邊界條件（空值、負數、超大數值、特殊字元）
2. **Data Consistency**: 檢查資料一致性（庫存扣減/回補、訂單狀態、優惠券使用）
3. **Concurrency**: 測試並發操作（多使用者同時操作）
4. **Error Recovery**: 測試錯誤恢復（服務不可用、網路中斷）

#### Example Output

```typescript
{
  success: true,
  report: {
    domain: 'bugs',
    timestamp: '2026-01-13T16:00:00.000Z',
    score: {
      name: 'Bug Checks',
      score: 80,
      weight: 0.15,
      weightedScore: 12.00,
      // ...
    },
    checks: {
      boundaryConditions: {
        name: 'Boundary Conditions',
        passed: false,
        details: '12/15 test cases passed',
        items: []
      },
      // ... 其他檢查
    },
    testCases: [
      {
        name: '負庫存支援：庫存 = -10 時仍可下單',
        passed: true,
        details: 'System correctly allows orders with negative stock'
      },
      {
        name: '優惠券過期檢查：過期優惠券無法套用',
        passed: false,
        details: 'Expired coupon was still applied at checkout'
      }
    ],
    issues: [],
    recommendations: []
  },
  duration: 6.3
}
```

---

### 7. check-security.ts

檢查資料庫安全（RLS Policies、Migration 品質、備份系統、索引）。

#### Function Signature

```typescript
export async function checkSecurity(
  options: CheckOptions
): Promise<CheckScriptResult<SecurityReport>>
```

#### Checks

1. **RLS Policies**: 檢查所有表是否啟用 RLS、Policies 是否完整
2. **Migration Quality**: 檢查 Migration 檔案品質（增量式、無破壞性變更）
3. **Backup System**: 檢查備份系統設定（自動備份、雲端儲存、滾動刪除）
4. **Indexes**: 檢查索引完整性（外鍵索引、常用查詢索引）

#### Example Output

```typescript
{
  success: true,
  report: {
    domain: 'security',
    timestamp: '2026-01-13T16:00:00.000Z',
    score: {
      name: 'Security',
      score: 93,
      weight: 0.15,
      weightedScore: 13.95,
      // ...
    },
    checks: {
      rlsPolicies: {
        name: 'RLS Policies',
        passed: true,
        details: '18/18 tables have RLS enabled',
        items: []
      },
      // ... 其他檢查
    },
    rlsStats: {
      totalTables: 18,
      tablesWithRLS: 18,
      tablesWithoutRLS: [],
      totalPolicies: 62
    },
    migrationStats: {
      totalMigrations: 8,
      safeMigrations: 8,
      riskyMigrations: 0,
      riskyFiles: []
    },
    backupStatus: {
      automated: true,
      lastBackup: '2026-01-13T02:00:00.000Z',
      backupCount: 10,
      cloudStorage: true
    },
    issues: [],
    recommendations: []
  },
  duration: 3.2
}
```

---

## Report Generation

### generate-report.ts

產生綜合健康檢查報告（Markdown + JSON 格式）。

#### Function Signature

```typescript
export async function generateReport(
  domainReports: {
    architecture: ArchitectureReport
    api: APIReport
    ux: UXReport
    design: DesignReport
    performance: PerformanceReport
    bugs: BugsReport
    security: SecurityReport
  },
  options: {
    outputDir: string
    previousReport?: HealthCheckReport
  }
): Promise<HealthCheckReport>
```

#### Output Files

1. **summary.md**: Markdown 格式綜合報告
2. **summary.json**: JSON 格式綜合報告
3. **{domain}.json**: 各領域詳細報告（7 個檔案）
4. **issues/*.md**: 問題清單（依嚴重程度分類，4 個檔案）

---

## GitHub Issues Export

### export-to-github-issues.ts

將健康檢查報告匯出為 GitHub Issues。

#### Function Signature

```typescript
export async function exportToGitHubIssues(
  report: HealthCheckReport,
  options: {
    /** GitHub Repository（格式：owner/repo） */
    repo: string

    /** GitHub Token（需要 repo scope） */
    token: string

    /** Milestone 名稱（預設：feature branch 名稱） */
    milestone?: string

    /** Labels 前綴（預設：health-check） */
    labelPrefix?: string

    /** 是否建立 Milestone（預設：true） */
    createMilestone?: boolean

    /** 是否僅匯出 Critical + High 問題（預設：false） */
    criticalOnly?: boolean
  }
): Promise<{
  created: number
  failed: number
  errors: string[]
}>
```

#### Example

```bash
# 匯出所有問題為 GitHub Issues
tsx scripts/health-check/export-to-github-issues.ts \
  --report specs/017-health-check/reports/latest/summary.json \
  --repo user/vsale \
  --token $GITHUB_TOKEN \
  --milestone 017-health-check

# 僅匯出 Critical + High 問題
tsx scripts/health-check/export-to-github-issues.ts \
  --report specs/017-health-check/reports/latest/summary.json \
  --repo user/vsale \
  --token $GITHUB_TOKEN \
  --critical-only
```

---

## Error Handling

所有檢查腳本都應該遵循以下錯誤處理規範：

### Success Case

```typescript
{
  success: true,
  report: { /* 報告內容 */ },
  duration: 3.5
}
```

### Error Case

```typescript
{
  success: false,
  report: { /* 部分報告內容（如有） */ },
  error: '錯誤訊息（包含堆疊追蹤）',
  duration: 1.2
}
```

### Common Errors

1. **File Not Found**: 找不到必要的檔案（如 tsconfig.json）
2. **Parse Error**: 無法解析 TypeScript/JSON 檔案
3. **Supabase Connection Error**: 無法連接到 Supabase
4. **Lighthouse Error**: Lighthouse 執行失敗
5. **Permission Error**: 權限不足（如無法讀取 .env 檔案）

---

## Testing

### Unit Tests

每個檢查腳本都應該包含單元測試（使用 Vitest）。

```typescript
// scripts/health-check/__tests__/check-architecture.test.ts
import { describe, it, expect } from 'vitest'
import { checkArchitecture } from '../check-architecture'

describe('checkArchitecture', () => {
  it('should detect route structure issues', async () => {
    const result = await checkArchitecture({
      rootDir: './test-fixtures/bad-routes',
      generateJson: false,
      generateMarkdown: false,
    })

    expect(result.success).toBe(true)
    expect(result.report.checks.routeStructure.passed).toBe(false)
    expect(result.report.issues.length).toBeGreaterThan(0)
  })

  it('should detect Server Actions without checkAuth', async () => {
    const result = await checkArchitecture({
      rootDir: './test-fixtures/missing-auth',
      generateJson: false,
      generateMarkdown: false,
    })

    expect(result.success).toBe(true)
    expect(result.report.checks.serverActions.passed).toBe(false)
  })
})
```

---

## Performance Targets

- **單一檢查腳本**: < 10 秒
- **完整健康檢查**: < 10 分鐘
- **報告產生**: < 1 分鐘
- **GitHub Issues 匯出**: < 2 分鐘（30 個 issues）

---

## Future Enhancements

1. **Parallel Execution**: 使用 Worker Threads 並行執行檢查
2. **Incremental Checks**: 僅檢查變更的檔案（使用 Git diff）
3. **Watch Mode**: 監看檔案變更並自動執行檢查
4. **CI/CD Integration**: 整合到 GitHub Actions
5. **Web Dashboard**: 建立網頁介面查看報告
6. **Email Notifications**: Critical 問題自動發送 Email
7. **Slack Integration**: 發送報告摘要到 Slack
