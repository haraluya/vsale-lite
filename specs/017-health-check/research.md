# Vsale-lite 健康檢查系統 - 技術研究報告

**專案**: Vsale-lite B2B 批發訂貨系統
**撰寫日期**: 2026-01-13
**研究範圍**: 技術選型與最佳實踐

---

## 目錄

1. [研究概述](#研究概述)
2. [Q1: TypeScript AST 分析工具選型](#q1-typescript-ast-分析工具選型)
3. [Q2: 樣式一致性檢查工具](#q2-樣式一致性檢查工具)
4. [Q3: 效能測量工具](#q3-效能測量工具)
5. [Q4: 手動測試清單格式](#q4-手動測試清單格式)
6. [Q5: 健康檢查報告格式](#q5-健康檢查報告格式)
7. [整合建議](#整合建議)
8. [參考資料](#參考資料)

---

## 研究概述

本研究針對 Vsale-lite 專案建立全面的健康檢查系統，涵蓋七個關鍵領域：

- **架構檢查**: 路由結構、Server Actions 模式、Supabase Client 使用、模組依賴
- **API 整合度**: Server Actions 品質、錯誤處理、權限驗證、RLS Policies
- **使用者體驗**: 操作流程、錯誤提示、載入狀態
- **設計系統**: Neo-Brutalism 風格、響應式設計、設計 Token
- **效能**: 頁面載入時間、資料庫查詢效能、圖片優化
- **Bug 檢查**: 邊界條件、資料一致性、並發操作
- **資料庫安全**: RLS Policies、Migration 品質、備份系統

本報告將針對五個核心技術問題提供詳細的決策分析、理由說明與實作範例。

---

## Q1: TypeScript AST 分析工具選型

### 目的
自動檢查 Server Actions 模式（`'use server'`、`checkAuth()`、Zod 驗證、`ActionResult<T>` 回傳型別）

### 決策：**ts-morph**

**選擇理由**:

1. **高階 API 易用性**: ts-morph 提供直觀的物件導向 API，大幅簡化 TypeScript AST 操作，無需深入理解 TypeScript Compiler API 的複雜細節
2. **完整型別資訊**: 完整保留 TypeScript 的型別檢查能力，可分析函數回傳型別（`ActionResult<T>`）、泛型參數等
3. **活躍社區支援**: NPM 上有 3153 個專案使用 ts-morph，社群活躍，文件完善，最新版本 27.0.2（2025年10月發布）
4. **記憶體內操作**: 所有變更保存在記憶體中，不會影響原始檔案，適合分析與報告生成
5. **MCP 整合**: 2025年11月推出 MCP ts-morph Refactoring Tools，支援符號重命名、檔案移動等自動化重構操作

**替代方案**:

- **@typescript/compiler API**
  - **優點**: 官方 API，功能最完整，效能優異
  - **缺點**: API 複雜度極高，學習曲線陡峭，需要深入理解編譯器內部結構
  - **不選原因**: 開發成本過高，對於健康檢查工具來說 ts-morph 已足夠

- **babel-parser + @babel/traverse**
  - **優點**: 解析速度快，emit 速度優於 TSC
  - **缺點**: 不支援型別檢查，無法分析 TypeScript 型別系統，無法產生 `.d.ts` 檔案
  - **不選原因**: 無法檢查函數回傳型別（`ActionResult<T>`），不符合需求

### 範例程式碼

```typescript
// scripts/health-check/check-server-actions.ts
import { Project, SyntaxKind, Node } from 'ts-morph'
import path from 'path'

interface ServerActionIssue {
  file: string
  line: number
  column: number
  functionName: string
  issue: string
  severity: 'error' | 'warning'
}

/**
 * 檢查 Server Actions 是否遵循專案規範
 */
export async function checkServerActions(): Promise<ServerActionIssue[]> {
  const project = new Project({
    tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
  })

  const issues: ServerActionIssue[] = []

  // 掃描 lib/actions/ 目錄下的所有 TypeScript 檔案
  const sourceFiles = project.addSourceFilesAtPaths('lib/actions/**/*.ts')

  for (const sourceFile of sourceFiles) {
    // 檢查是否包含 'use server' 指令
    const hasUseServer = sourceFile.getStatements().some((statement) => {
      if (Node.isExpressionStatement(statement)) {
        const expression = statement.getExpression()
        if (Node.isStringLiteral(expression)) {
          return expression.getLiteralValue() === 'use server'
        }
      }
      return false
    })

    if (!hasUseServer) {
      issues.push({
        file: sourceFile.getFilePath(),
        line: 1,
        column: 1,
        functionName: '',
        issue: '缺少 "use server" 指令',
        severity: 'error',
      })
    }

    // 檢查所有匯出的函數
    const functions = sourceFile.getFunctions()
    for (const func of functions) {
      if (!func.isExported()) continue

      const functionName = func.getName() || '<anonymous>'
      const { line, column } = sourceFile.getLineAndColumnAtPos(func.getStart())

      // 檢查是否呼叫 checkAuth()（針對需要權限的操作）
      const hasCheckAuth = func.getDescendantsOfKind(SyntaxKind.CallExpression).some((call) => {
        const expression = call.getExpression()
        return Node.isIdentifier(expression) && expression.getText() === 'checkAuth'
      })

      // 假設所有 create/update/delete 開頭的函數都需要權限檢查
      if (/^(create|update|delete)/.test(functionName) && !hasCheckAuth) {
        issues.push({
          file: sourceFile.getFilePath(),
          line,
          column,
          functionName,
          issue: '缺少 checkAuth() 權限檢查',
          severity: 'error',
        })
      }

      // 檢查回傳型別是否為 ActionResult<T> 或 Promise<ActionResult<T>>
      const returnType = func.getReturnType()
      const returnTypeText = returnType.getText()

      // 簡化檢查：是否包含 ActionResult
      if (
        /^(create|update|delete)/.test(functionName) &&
        !returnTypeText.includes('ActionResult') &&
        !returnTypeText.includes('Promise<ActionResult')
      ) {
        issues.push({
          file: sourceFile.getFilePath(),
          line,
          column,
          functionName,
          issue: `回傳型別應為 ActionResult<T> 或 Promise<ActionResult<T>>，目前為 ${returnTypeText}`,
          severity: 'warning',
        })
      }

      // 檢查是否有 Zod 驗證（搜尋 .parse() 或 .safeParse()）
      const hasZodValidation = func.getDescendantsOfKind(SyntaxKind.CallExpression).some((call) => {
        const expression = call.getExpression()
        if (Node.isPropertyAccessExpression(expression)) {
          const methodName = expression.getName()
          return methodName === 'parse' || methodName === 'safeParse'
        }
        return false
      })

      if (/^(create|update)/.test(functionName) && !hasZodValidation) {
        issues.push({
          file: sourceFile.getFilePath(),
          line,
          column,
          functionName,
          issue: '缺少 Zod 驗證（.parse() 或 .safeParse()）',
          severity: 'warning',
        })
      }
    }
  }

  return issues
}

/**
 * 產生報告
 */
export function generateServerActionsReport(issues: ServerActionIssue[]): string {
  if (issues.length === 0) {
    return '✅ 所有 Server Actions 皆符合規範'
  }

  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')

  let report = '## Server Actions 檢查報告\n\n'
  report += `**總問題數**: ${issues.length} (${errors.length} 錯誤, ${warnings.length} 警告)\n\n`

  if (errors.length > 0) {
    report += '### ❌ 錯誤 (Errors)\n\n'
    report += '| 檔案 | 位置 | 函數 | 問題 |\n'
    report += '|------|------|------|------|\n'
    errors.forEach((issue) => {
      const relPath = path.relative(process.cwd(), issue.file)
      report += `| ${relPath} | ${issue.line}:${issue.column} | \`${issue.functionName}\` | ${issue.issue} |\n`
    })
    report += '\n'
  }

  if (warnings.length > 0) {
    report += '### ⚠️ 警告 (Warnings)\n\n'
    report += '| 檔案 | 位置 | 函數 | 問題 |\n'
    report += '|------|------|------|------|\n'
    warnings.forEach((issue) => {
      const relPath = path.relative(process.cwd(), issue.file)
      report += `| ${relPath} | ${issue.line}:${issue.column} | \`${issue.functionName}\` | ${issue.issue} |\n`
    })
    report += '\n'
  }

  return report
}
```

**使用方式**:
```bash
pnpm add -D ts-morph
node --loader ts-node/esm scripts/health-check/check-server-actions.ts
```

---

## Q2: 樣式一致性檢查工具

### 目的
檢查 UI 元件是否遵循 Neo-Brutalism 設計規範（邊框、陰影、點擊效果）

### 決策：**自訂腳本（正規表示式 + AST 解析）**

**選擇理由**:

1. **Tailwind CSS 特性**: 專案使用 Tailwind CSS，樣式以 className 字串形式存在，stylelint 無法有效解析
2. **專案特定規範**: Neo-Brutalism 規範高度客製化（`border-2 md:border-3`、`shadow-neo-sm md:shadow-neo`），現有工具無法直接支援
3. **輕量高效**: 使用正規表示式快速掃描 TSX 檔案，無需複雜的依賴
4. **設計 Token 整合**: 專案已有 `lib/design-tokens.ts`，可直接檢查是否使用 Token 而非硬編碼樣式
5. **易於維護**: 規則集中管理，可隨專案規範演進而調整

**替代方案**:

- **stylelint + tailwindcss plugin**
  - **優點**: 成熟的 CSS linting 工具，社群支援良好
  - **缺點**: 無法解析 JSX 中的 className 字串，無法檢查 Tailwind 動態類別
  - **不選原因**: 不適用於 Tailwind CSS 專案

- **eslint-plugin-tailwindcss**
  - **優點**: 專為 Tailwind 設計，可檢查類別順序、無效類別
  - **缺點**: 無法自訂專案特定規範（如響應式邊框、陰影組合）
  - **不選原因**: 功能不足以涵蓋專案需求

### 範例程式碼

```typescript
// scripts/health-check/check-neo-brutalism.ts
import { globSync } from 'glob'
import fs from 'fs/promises'
import path from 'path'

interface StyleIssue {
  file: string
  line: number
  component: string
  issue: string
  suggestion: string
  severity: 'error' | 'warning'
}

/**
 * Neo-Brutalism 設計規範
 */
const DESIGN_RULES = {
  // 邊框規範
  border: {
    pattern: /border-2(?:\s+md:border-3)?/,
    required: true,
    suggestion: '使用 border-2 md:border-3 或使用設計 Token',
  },
  // 陰影規範
  shadow: {
    pattern: /shadow-neo-sm(?:\s+md:shadow-neo)?/,
    required: true,
    suggestion: '使用 shadow-neo-sm md:shadow-neo 或使用設計 Token',
  },
  // 點擊效果規範
  active: {
    pattern: /active:translate-x-\[2px\]\s+active:translate-y-\[2px\]\s+active:shadow-none/,
    required: false, // 僅按鈕類元件需要
    suggestion: '使用 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
  },
  // 設計 Token 使用（推薦）
  designToken: {
    pattern: /getNeoBrutalismClasses|designTokens\.neoBrutalism/,
    preferred: true,
    suggestion: '建議使用 getNeoBrutalismClasses() 工具函式',
  },
}

/**
 * 檢查 Neo-Brutalism 樣式一致性
 */
export async function checkNeoBrutalism(): Promise<StyleIssue[]> {
  const issues: StyleIssue[] = []

  // 掃描 components/ 和 app/ 目錄下的所有 TSX 檔案
  const files = globSync('**/*.tsx', {
    cwd: process.cwd(),
    ignore: ['node_modules/**', '.next/**', 'specs/**'],
  })

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8')
    const lines = content.split('\n')

    // 提取所有 className 屬性
    const classNameRegex = /className=["'`]([^"'`]+)["'`]/g
    let match: RegExpExecArray | null

    while ((match = classNameRegex.exec(content)) !== null) {
      const className = match[1]
      const matchIndex = match.index
      const lineNumber = content.slice(0, matchIndex).split('\n').length

      // 推斷元件名稱（取當前行或前一行的標籤名）
      const componentMatch = content
        .slice(Math.max(0, matchIndex - 100), matchIndex)
        .match(/<(\w+)/g)
      const component = componentMatch ? componentMatch[componentMatch.length - 1].slice(1) : 'unknown'

      // 檢查是否為互動式元件（button、a、input 等）
      const isInteractive = ['button', 'Button', 'a', 'Link', 'input', 'Input'].includes(component)

      // 檢查是否使用設計 Token
      const usesDesignToken = DESIGN_RULES.designToken.pattern.test(content)

      // 跳過已使用設計 Token 的檔案
      if (usesDesignToken) {
        continue
      }

      // 檢查邊框
      if (!DESIGN_RULES.border.pattern.test(className)) {
        // 檢查是否有任何 border 類別
        if (/border-/.test(className)) {
          issues.push({
            file,
            line: lineNumber,
            component,
            issue: '邊框樣式不符合響應式規範',
            suggestion: DESIGN_RULES.border.suggestion,
            severity: 'warning',
          })
        }
      }

      // 檢查陰影
      if (!DESIGN_RULES.shadow.pattern.test(className)) {
        if (/shadow-/.test(className)) {
          issues.push({
            file,
            line: lineNumber,
            component,
            issue: '陰影樣式不符合響應式規範',
            suggestion: DESIGN_RULES.shadow.suggestion,
            severity: 'warning',
          })
        }
      }

      // 檢查互動式元件的點擊效果
      if (isInteractive && !DESIGN_RULES.active.pattern.test(className)) {
        if (/active:/.test(className)) {
          issues.push({
            file,
            line: lineNumber,
            component,
            issue: '點擊效果不完整',
            suggestion: DESIGN_RULES.active.suggestion,
            severity: 'warning',
          })
        }
      }
    }
  }

  return issues
}

/**
 * 產生報告
 */
export function generateNeoBrutalismReport(issues: StyleIssue[]): string {
  if (issues.length === 0) {
    return '✅ 所有 UI 元件皆符合 Neo-Brutalism 設計規範'
  }

  let report = '## Neo-Brutalism 設計一致性檢查報告\n\n'
  report += `**總問題數**: ${issues.length}\n\n`

  // 依檔案分組
  const issuesByFile = issues.reduce((acc, issue) => {
    if (!acc[issue.file]) acc[issue.file] = []
    acc[issue.file].push(issue)
    return acc
  }, {} as Record<string, StyleIssue[]>)

  for (const [file, fileIssues] of Object.entries(issuesByFile)) {
    const relPath = path.relative(process.cwd(), file)
    report += `### 📄 ${relPath}\n\n`
    report += '| 行號 | 元件 | 問題 | 建議 |\n'
    report += '|------|------|------|------|\n'
    fileIssues.forEach((issue) => {
      report += `| ${issue.line} | \`<${issue.component}>\` | ${issue.issue} | ${issue.suggestion} |\n`
    })
    report += '\n'
  }

  report += '### 💡 最佳實踐建議\n\n'
  report += '1. **使用設計 Token**: 匯入 `getNeoBrutalismClasses()` 工具函式\n'
  report += '   ```typescript\n'
  report += '   import { getNeoBrutalismClasses } from "@/lib/design-tokens"\n'
  report += '   className={getNeoBrutalismClasses({ hover: true, active: true })}\n'
  report += '   ```\n\n'
  report += '2. **響應式邊框**: 使用 `border-2 md:border-3`\n'
  report += '3. **響應式陰影**: 使用 `shadow-neo-sm md:shadow-neo`\n'
  report += '4. **點擊效果**: 使用 `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`\n\n'

  return report
}
```

---

## Q3: 效能測量工具

### 目的
測量頁面載入時間、資料庫查詢時間、圖片優化

### 決策：**Lighthouse CI + Next.js Web Vitals + Supabase Dashboard**

**選擇理由**:

1. **多層次效能監控**:
   - **Lighthouse CI**: 前端效能（頁面載入、圖片優化、SEO）
   - **Next.js Web Vitals**: 真實用戶體驗（RUM）
   - **Supabase Dashboard**: 資料庫查詢效能

2. **Next.js 原生整合**: Next.js 15 內建 `useReportWebVitals` hook，可追蹤 TTFB、FCP、LCP、FID、CLS
3. **CI/CD 自動化**: Lighthouse CI 支援 GitHub Actions，可在每次 commit 自動執行效能測試
4. **效能預算**: Lighthouse CI 支援設定效能預算，自動阻擋不符合標準的部署
5. **真實用戶監控**: 結合 Vercel Analytics 或 Google Analytics 進行 RUM

**替代方案**:

- **Chrome DevTools Performance API**
  - **優點**: 詳細的效能分析，可錄製火焰圖
  - **缺點**: 手動操作，無法自動化，不適合 CI/CD
  - **不選原因**: 無法整合到健康檢查流程

- **單純使用 Vercel Analytics**
  - **優點**: 零配置，自動追蹤 Web Vitals
  - **缺點**: 僅提供統計資料，無法設定效能預算、無法阻擋部署
  - **不選原因**: 功能不足，需搭配 Lighthouse CI

### 實作方案

#### 3.1 Lighthouse CI 設定

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      // 測試本地建置
      startServerCommand: 'pnpm start',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/login',
        'http://localhost:3000/store',
        'http://localhost:3000/admin/dashboard',
        'http://localhost:3000/admin/products',
      ],
      numberOfRuns: 3, // 執行 3 次取平均值減少變異
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // 自訂效能預算
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }], // 2s
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // 2.5s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }], // 300ms
        'speed-index': ['error', { maxNumericValue: 3000 }], // 3s

        // 圖片優化
        'uses-optimized-images': 'warn',
        'modern-image-formats': 'warn',
        'uses-responsive-images': 'warn',

        // Next.js 最佳實踐
        'uses-http2': 'warn',
        'uses-text-compression': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage', // 或設定為私有 LHCI server
    },
  },
}
```

```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI
on:
  pull_request:
    branches: [master]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.15.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

#### 3.2 Next.js Web Vitals 整合

```typescript
// app/layout.tsx
import { Suspense } from 'react'
import { WebVitals } from '@/components/web-vitals'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        {children}
        <Suspense>
          <WebVitals />
        </Suspense>
      </body>
    </html>
  )
}
```

```typescript
// components/web-vitals.tsx
'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // 發送到分析服務（Vercel Analytics、Google Analytics、自訂 API）
    if (process.env.NODE_ENV === 'production') {
      // 範例：發送到自訂 API
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
          navigationType: metric.navigationType,
        }),
      })
    }

    // 開發環境：輸出到 console
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
      })
    }
  })

  return null
}
```

#### 3.3 資料庫查詢效能監控

```typescript
// lib/supabase/performance.ts
import { createClient } from '@/lib/supabase/server'

interface QueryPerformance {
  query: string
  duration: number
  timestamp: number
  result: 'success' | 'error'
}

const queryLogs: QueryPerformance[] = []

/**
 * 包裝 Supabase 查詢以測量效能
 */
export async function measureQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now()

  try {
    const result = await queryFn()
    const duration = performance.now() - start

    queryLogs.push({
      query: queryName,
      duration,
      timestamp: Date.now(),
      result: 'success',
    })

    // 開發環境：警告慢查詢
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.warn(`[Slow Query] ${queryName} took ${duration.toFixed(2)}ms`)
    }

    return result
  } catch (error) {
    const duration = performance.now() - start

    queryLogs.push({
      query: queryName,
      duration,
      timestamp: Date.now(),
      result: 'error',
    })

    throw error
  }
}

/**
 * 產生查詢效能報告
 */
export function getQueryPerformanceReport() {
  if (queryLogs.length === 0) return null

  const avgDuration = queryLogs.reduce((sum, log) => sum + log.duration, 0) / queryLogs.length
  const maxDuration = Math.max(...queryLogs.map((log) => log.duration))
  const slowQueries = queryLogs.filter((log) => log.duration > 100)

  return {
    totalQueries: queryLogs.length,
    avgDuration: avgDuration.toFixed(2),
    maxDuration: maxDuration.toFixed(2),
    slowQueries: slowQueries.length,
    slowQueriesDetails: slowQueries.map((log) => ({
      query: log.query,
      duration: log.duration.toFixed(2),
    })),
  }
}

// 使用範例
// lib/actions/products.ts
export async function getProducts() {
  return measureQuery('getProducts', async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  })
}
```

### 效能目標（參考 CLAUDE.md）

| 指標 | 目標值 | 測量工具 |
|------|-------|---------|
| 頁面首次載入 (Mobile 4G) | < 2s | Lighthouse CI (FCP) |
| 登入驗證響應 | < 500ms | Web Vitals (TTFB) |
| 客戶搜尋即時響應 | < 300ms | 自訂效能監控 |
| 資料庫查詢 (p95) | < 100ms | measureQuery + Supabase Dashboard |

---

## Q4: 手動測試清單格式

### 目的
提供清晰的操作流程測試清單

### 決策：**Markdown Tasklist + Given-When-Then 混合格式**

**選擇理由**:

1. **易讀性**: Markdown Tasklist 格式清晰，支援 GitHub、VSCode 等工具原生渲染
2. **可追蹤性**: 支援 `- [ ]` / `- [x]` 勾選狀態，測試進度一目了然
3. **結構化**: Given-When-Then 格式提供清晰的前提條件、操作步驟、預期結果
4. **可轉換性**: 可輕鬆轉換為 Gherkin 格式進行自動化測試（未來擴充）
5. **無額外工具**: 不需要 Cucumber 等 BDD 框架，降低學習成本

**替代方案**:

- **純 Gherkin 格式（Cucumber）**
  - **優點**: 標準 BDD 格式，可直接執行自動化測試
  - **缺點**: 需要安裝 Cucumber、編寫 step definitions，學習成本高
  - **不選原因**: 過度工程化，手動測試不需要如此複雜的工具鏈

- **純 Markdown Checklist（無結構）**
  - **優點**: 極簡單，易於維護
  - **缺點**: 缺乏前提條件、預期結果的結構化描述，不易轉換為自動化測試
  - **不選原因**: 結構不足，難以確保測試完整性

### 範例格式

```markdown
# 手動測試清單：會員等級管理

**測試日期**: 2026-01-13
**測試人員**: @username
**測試環境**: Staging / Production

---

## US1: 建立新會員等級

### 場景 1.1: 成功建立等級

**Given** (前提條件):
- 已登入管理員帳號
- 位於會員等級管理頁面 `/admin/tiers`
- 尚未有「VIP」等級

**When** (操作步驟):
- [ ] 點擊「新增等級」按鈕
- [ ] 輸入等級名稱：「VIP」
- [ ] 輸入等級代碼：「vip」
- [ ] 設定排序：1
- [ ] 點擊「儲存」按鈕

**Then** (預期結果):
- [ ] 顯示成功訊息：「會員等級建立成功」
- [ ] 等級列表中出現「VIP」等級
- [ ] 等級排序正確（rank = 1）
- [ ] 等級狀態為「啟用」

**實際結果**: ✅ 通過 / ❌ 失敗
**備註**: _（如有異常請記錄）_

---

### 場景 1.2: 驗證等級代碼唯一性

**Given**:
- 已登入管理員帳號
- 已存在「VIP」等級（code = `vip`）

**When**:
- [ ] 點擊「新增等級」按鈕
- [ ] 輸入等級名稱：「VVIP」
- [ ] 輸入等級代碼：「vip」（與現有等級重複）
- [ ] 點擊「儲存」按鈕

**Then**:
- [ ] 顯示錯誤訊息：「等級代碼已存在」
- [ ] 表單保持編輯狀態，不清空資料
- [ ] 等級列表中不新增重複記錄

**實際結果**: ✅ 通過 / ❌ 失敗
**備註**: _（如有異常請記錄）_

---

## US2: 編輯現有等級

### 場景 2.1: 更新等級名稱

**Given**:
- 已登入管理員帳號
- 已存在「VIP」等級

**When**:
- [ ] 在等級列表中點擊「VIP」等級的「編輯」按鈕
- [ ] 修改等級名稱為「VIP 會員」
- [ ] 點擊「儲存」按鈕

**Then**:
- [ ] 顯示成功訊息：「會員等級更新成功」
- [ ] 等級列表中名稱更新為「VIP 會員」
- [ ] 其他欄位（代碼、排序）保持不變

**實際結果**: ✅ 通過 / ❌ 失敗
**備註**: _（如有異常請記錄）_

---

## US3: 刪除等級（含限制檢查）

### 場景 3.1: 無法刪除有客戶關聯的等級

**Given**:
- 已登入管理員帳號
- 已存在「VIP」等級
- 有至少 1 位客戶使用「VIP」等級

**When**:
- [ ] 在等級列表中點擊「VIP」等級的「刪除」按鈕
- [ ] 在確認對話框中點擊「確認」

**Then**:
- [ ] 顯示錯誤訊息：「無法刪除，還有客戶使用此等級」
- [ ] 等級仍存在於列表中
- [ ] 客戶資料未受影響

**實際結果**: ✅ 通過 / ❌ 失敗
**備註**: _（如有異常請記錄）_

---

### 場景 3.2: 成功刪除無關聯的等級

**Given**:
- 已登入管理員帳號
- 已存在「測試等級」
- 無任何客戶使用「測試等級」

**When**:
- [ ] 在等級列表中點擊「測試等級」的「刪除」按鈕
- [ ] 在確認對話框中點擊「確認」

**Then**:
- [ ] 顯示成功訊息：「會員等級刪除成功」
- [ ] 等級從列表中消失
- [ ] 相關等級價格記錄被級聯刪除（檢查 `tier_prices` 表）

**實際結果**: ✅ 通過 / ❌ 失敗
**備註**: _（如有異常請記錄）_

---

## 測試總結

| 場景 | 狀態 | 備註 |
|------|------|------|
| 1.1 成功建立等級 | ⬜ 待測試 / ✅ 通過 / ❌ 失敗 | |
| 1.2 驗證等級代碼唯一性 | ⬜ 待測試 / ✅ 通過 / ❌ 失敗 | |
| 2.1 更新等級名稱 | ⬜ 待測試 / ✅ 通過 / ❌ 失敗 | |
| 3.1 無法刪除有關聯的等級 | ⬜ 待測試 / ✅ 通過 / ❌ 失敗 | |
| 3.2 成功刪除無關聯的等級 | ⬜ 待測試 / ✅ 通過 / ❌ 失敗 | |

**總測試場景數**: 5
**通過**: 0
**失敗**: 0
**待測試**: 5

**整體評估**: _（測試完成後填寫）_
```

### 轉換為自動化測試（未來擴充）

```typescript
// tests/e2e/tiers.spec.ts (Playwright 範例)
import { test, expect } from '@playwright/test'

test.describe('會員等級管理', () => {
  test('場景 1.1: 成功建立等級', async ({ page }) => {
    // Given
    await page.goto('/admin/login')
    await page.fill('[name="email"]', 'admin@example.com')
    await page.fill('[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.goto('/admin/tiers')

    // When
    await page.click('text=新增等級')
    await page.fill('[name="name"]', 'VIP')
    await page.fill('[name="code"]', 'vip')
    await page.fill('[name="rank"]', '1')
    await page.click('button:has-text("儲存")')

    // Then
    await expect(page.locator('text=會員等級建立成功')).toBeVisible()
    await expect(page.locator('text=VIP')).toBeVisible()
  })

  // ... 其他測試場景
})
```

---

## Q5: 健康檢查報告格式

### 目的
產生易讀、可追蹤的健康檢查報告

### 決策：**Markdown + JSON 雙格式輸出**

**選擇理由**:

1. **Markdown 優勢**:
   - 人類易讀，支援表格、清單、超連結
   - GitHub 原生渲染，可直接檢視
   - 可轉換為 HTML、PDF 等格式

2. **JSON 優勢**:
   - 機器可解析，可轉換為多種格式
   - 可匯出為 GitHub Issues（使用 GitHub API）
   - 可整合到 CI/CD 流程，觸發警報

3. **評分系統**: 使用 0-100 分量化健康度，清晰呈現系統狀態
4. **可操作性**: 每個問題提供修復建議與檔案連結，方便開發者快速定位

**替代方案**:

- **純 JSON 格式**
  - **優點**: 機器可解析，易於整合
  - **缺點**: 人類不易閱讀，需額外工具轉換
  - **不選原因**: 開發者體驗差

- **純 HTML 格式**
  - **優點**: 視覺效果佳，可加入圖表
  - **缺點**: 需要瀏覽器開啟，不支援 GitHub 直接檢視
  - **不選原因**: 不適合 CLI 工具輸出

### 範例格式

#### Markdown 報告

```markdown
# Vsale-lite 健康檢查報告

**執行時間**: 2026-01-13 16:30:00
**分支**: 017-health-check
**Commit**: abc1234
**執行時長**: 3.5 分鐘

---

## 📊 總覽

| 類別 | 評分 | 狀態 | 問題數 |
|------|------|------|--------|
| 🏗️ 架構檢查 | 95/100 | ✅ 優秀 | 2 個警告 |
| 🔌 API 整合度 | 88/100 | ✅ 良好 | 3 個錯誤, 5 個警告 |
| 👥 使用者體驗 | 92/100 | ✅ 優秀 | 1 個警告 |
| 🎨 設計系統 | 78/100 | ⚠️ 需改進 | 12 個警告 |
| ⚡ 效能 | 85/100 | ✅ 良好 | 4 個警告 |
| 🐛 Bug 檢查 | 100/100 | ✅ 完美 | 無問題 |
| 🔒 資料庫安全 | 90/100 | ✅ 優秀 | 2 個警告 |

**整體健康度**: **89/100** ✅ 良好

---

## 🏗️ 架構檢查 (95/100)

### ✅ 通過項目

- [x] 路由結構符合規範（雙入口設計）
- [x] Middleware 權限檢查完整
- [x] Server Actions 檔案組織良好
- [x] 模組依賴關係清晰

### ⚠️ 警告 (2)

| 檔案 | 問題 | 建議 |
|------|------|------|
| [`lib/actions/helpers.ts:45`](../lib/actions/helpers.ts#L45) | `checkAuth()` 錯誤訊息未使用繁體中文 | 將 "Unauthorized" 改為 "未授權" |
| [`app/(shop)/layout.tsx:12`](../app/(shop)/layout.tsx#L12) | 缺少錯誤邊界 (Error Boundary) | 新增 `<ErrorBoundary>` 元件 |

---

## 🔌 API 整合度 (88/100)

### ❌ 錯誤 (3)

| 檔案 | 函數 | 問題 | 嚴重度 |
|------|------|------|--------|
| [`lib/actions/orders.ts:145`](../lib/actions/orders.ts#L145) | `createOrder()` | 缺少 `checkAuth()` 權限檢查 | 🔴 高 |
| [`lib/actions/series.ts:78`](../lib/actions/series.ts#L78) | `deleteSeries()` | 回傳型別應為 `ActionResult<void>`，目前為 `void` | 🟡 中 |
| [`lib/actions/tier-prices.ts:200`](../lib/actions/tier-prices.ts#L200) | `updateTierPrice()` | 缺少 Zod 驗證 | 🟡 中 |

### ⚠️ 警告 (5)

| 檔案 | 函數 | 問題 |
|------|------|------|
| [`lib/actions/products.ts:55`](../lib/actions/products.ts#L55) | `getProducts()` | 未呼叫 `revalidatePath()` |
| [`lib/actions/coupons.ts:120`](../lib/actions/coupons.ts#L120) | `validateCoupon()` | 錯誤處理不完整，建議使用 try-catch |
| ... | ... | ... |

---

## 🎨 設計系統 (78/100)

### ⚠️ 警告 (12)

**統計**:
- 邊框樣式不符合規範: 5 個元件
- 陰影樣式不符合規範: 4 個元件
- 點擊效果不完整: 3 個元件

| 檔案 | 元件 | 問題 | 建議 |
|------|------|------|------|
| [`components/admin/tier-table.tsx:45`](../components/admin/tier-table.tsx#L45) | `<button>` | 邊框樣式不符合響應式規範 | 使用 `border-2 md:border-3` |
| [`components/shop/cart-summary.tsx:78`](../components/shop/cart-summary.tsx#L78) | `<div>` | 陰影樣式不符合響應式規範 | 使用 `shadow-neo-sm md:shadow-neo` |
| ... | ... | ... | ... |

**建議**: 使用 `getNeoBrutalismClasses()` 工具函式確保一致性

---

## ⚡ 效能 (85/100)

### 📈 Lighthouse 分數

| 頁面 | Performance | Accessibility | Best Practices | SEO |
|------|-------------|---------------|----------------|-----|
| `/` | 92 | 95 | 100 | 100 |
| `/login` | 95 | 98 | 100 | 100 |
| `/store` | 88 | 95 | 100 | 95 |
| `/admin/dashboard` | 85 | 90 | 100 | 90 |

### 🐢 慢查詢 (4)

| 查詢 | 平均時間 | 最大時間 | 建議 |
|------|---------|---------|------|
| `getOrdersWithDetails` | 125ms | 180ms | 新增索引：`orders(user_id, status)` |
| `getProductsWithPrices` | 110ms | 150ms | 使用 JOIN 代替 N+1 查詢 |
| `getTierPricesBySeries` | 95ms | 120ms | 新增索引：`tier_prices(series_id)` |
| `getUserCoupons` | 88ms | 105ms | 可接受，但建議監控 |

---

## 🐛 Bug 檢查 (100/100)

### ✅ 通過項目

- [x] 邊界條件檢查完整
- [x] 資料一致性良好
- [x] 並發操作使用 Transaction
- [x] 錯誤處理完整

**無發現問題** 🎉

---

## 🔒 資料庫安全 (90/100)

### ✅ 通過項目

- [x] RLS Policies 覆蓋率 100%
- [x] Migration 檔案品質良好
- [x] 備份系統運作正常

### ⚠️ 警告 (2)

| 項目 | 問題 | 建議 |
|------|------|------|
| RLS Policy | `tier_prices` 表的 UPDATE policy 過於寬鬆 | 限制僅管理員可更新 |
| Migration | `20260107120000_orders_and_workflow.sql` 缺少回滾腳本 | 新增 DOWN migration |

---

## 🎯 修復優先級建議

### 🔴 高優先級（必須修復）

1. **API 整合度 - `createOrder()` 缺少權限檢查**
   - 檔案: `lib/actions/orders.ts:145`
   - 影響: 安全漏洞，任何人都可建立訂單
   - 修復: 在函數開頭新增 `await checkAuth()`

### 🟡 中優先級（建議修復）

2. **效能 - `getOrdersWithDetails` 慢查詢**
   - 檔案: `lib/actions/orders.ts:78`
   - 影響: 訂單列表載入慢
   - 修復: 新增複合索引 `CREATE INDEX idx_orders_user_status ON orders(user_id, status)`

3. **設計系統 - 12 個元件樣式不符合規範**
   - 影響: 設計一致性
   - 修復: 使用 `getNeoBrutalismClasses()` 工具函式

### 🟢 低優先級（可選修復）

4. **架構 - 缺少錯誤邊界**
   - 檔案: `app/(shop)/layout.tsx:12`
   - 影響: 使用者體驗
   - 修復: 新增 `<ErrorBoundary>` 元件

---

## 📝 詳細報告

完整 JSON 報告: [`health-check-report.json`](./health-check-report.json)

---

**報告生成工具**: Vsale-lite Health Check v1.0.0
**下次執行建議**: 每週一次 / 每次合併到 master 前
```

#### JSON 報告

```json
{
  "metadata": {
    "timestamp": "2026-01-13T16:30:00+08:00",
    "branch": "017-health-check",
    "commit": "abc1234",
    "duration_seconds": 210,
    "version": "1.0.0"
  },
  "summary": {
    "overall_score": 89,
    "overall_status": "good",
    "total_errors": 3,
    "total_warnings": 26,
    "categories": [
      {
        "name": "架構檢查",
        "slug": "architecture",
        "score": 95,
        "status": "excellent",
        "errors": 0,
        "warnings": 2
      },
      {
        "name": "API 整合度",
        "slug": "api-integration",
        "score": 88,
        "status": "good",
        "errors": 3,
        "warnings": 5
      }
    ]
  },
  "categories": {
    "api-integration": {
      "errors": [
        {
          "id": "api-001",
          "file": "lib/actions/orders.ts",
          "line": 145,
          "column": 1,
          "function": "createOrder",
          "issue": "缺少 checkAuth() 權限檢查",
          "severity": "high",
          "suggestion": "在函數開頭新增 await checkAuth()",
          "reference": "https://github.com/your-org/vsale/blob/master/lib/actions/orders.ts#L145"
        }
      ],
      "warnings": [
        {
          "id": "api-101",
          "file": "lib/actions/products.ts",
          "line": 55,
          "column": 1,
          "function": "getProducts",
          "issue": "未呼叫 revalidatePath()",
          "severity": "medium",
          "suggestion": "在函數結尾新增 revalidatePath('/admin/products')"
        }
      ]
    }
  },
  "performance": {
    "lighthouse": [
      {
        "url": "/",
        "performance": 92,
        "accessibility": 95,
        "best_practices": 100,
        "seo": 100
      }
    ],
    "slow_queries": [
      {
        "query": "getOrdersWithDetails",
        "avg_duration_ms": 125,
        "max_duration_ms": 180,
        "suggestion": "新增索引：orders(user_id, status)"
      }
    ]
  }
}
```

#### 匯出為 GitHub Issues

```typescript
// scripts/health-check/export-to-github.ts
import { Octokit } from '@octokit/rest'
import fs from 'fs/promises'

interface HealthCheckReport {
  categories: {
    [key: string]: {
      errors: Array<{
        id: string
        file: string
        line: number
        issue: string
        severity: string
        suggestion: string
      }>
    }
  }
}

async function exportToGitHubIssues() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
  const report: HealthCheckReport = JSON.parse(
    await fs.readFile('health-check-report.json', 'utf-8')
  )

  const owner = 'your-org'
  const repo = 'vsale'

  // 僅為高優先級錯誤建立 Issues
  for (const [category, data] of Object.entries(report.categories)) {
    for (const error of data.errors) {
      if (error.severity !== 'high') continue

      const title = `[健康檢查] ${error.issue} (${error.file})`
      const body = `
## 問題描述

**檔案**: [\`${error.file}:${error.line}\`](https://github.com/${owner}/${repo}/blob/master/${error.file}#L${error.line})
**嚴重度**: 🔴 高
**類別**: ${category}

${error.issue}

## 修復建議

${error.suggestion}

## 相關資訊

- **檢查 ID**: \`${error.id}\`
- **檢查時間**: ${new Date().toISOString()}

---

此 Issue 由健康檢查系統自動建立
      `

      await octokit.issues.create({
        owner,
        repo,
        title,
        body,
        labels: ['health-check', 'bug', `severity:${error.severity}`],
      })

      console.log(`✅ 已建立 Issue: ${title}`)
    }
  }
}

exportToGitHubIssues()
```

---

## 整合建議

### 執行流程

```bash
# 安裝依賴
pnpm add -D ts-morph glob @octokit/rest

# 執行完整健康檢查
pnpm health-check

# 執行特定類別檢查
pnpm health-check:architecture
pnpm health-check:api
pnpm health-check:design
pnpm health-check:performance

# 產生報告並匯出到 GitHub
pnpm health-check --export-issues
```

### package.json Scripts

```json
{
  "scripts": {
    "health-check": "tsx scripts/health-check/index.ts",
    "health-check:architecture": "tsx scripts/health-check/check-architecture.ts",
    "health-check:api": "tsx scripts/health-check/check-server-actions.ts",
    "health-check:design": "tsx scripts/health-check/check-neo-brutalism.ts",
    "health-check:performance": "lhci autorun && tsx scripts/health-check/check-performance.ts",
    "health-check:ci": "pnpm health-check && pnpm health-check:performance"
  }
}
```

### CI/CD 整合

```yaml
# .github/workflows/health-check.yml
name: Health Check
on:
  pull_request:
    branches: [master]
  schedule:
    - cron: '0 2 * * 1' # 每週一凌晨 2:00

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Run health check
        run: pnpm health-check:ci

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: health-check-report
          path: |
            health-check-report.md
            health-check-report.json

      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs')
            const report = fs.readFileSync('health-check-report.md', 'utf-8')
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            })

      - name: Fail if score < 80
        run: |
          SCORE=$(jq '.summary.overall_score' health-check-report.json)
          if [ "$SCORE" -lt 80 ]; then
            echo "❌ 健康檢查未通過，總分 $SCORE < 80"
            exit 1
          fi
```

---

## 參考資料

### TypeScript AST 分析工具

- [ts-morph - npm](https://www.npmjs.com/package/ts-morph)
- [ts-morph - Documentation](https://ts-morph.com/)
- [GitHub - dsherret/ts-morph](https://github.com/dsherret/ts-morph)
- [AST-based refactoring with ts-morph - kimmo.blog](https://kimmo.blog/posts/8-ast-based-refactoring-with-ts-morph/)
- [Ts-morph Overview, Examples, Pros and Cons in 2025](https://best-of-web.builder.io/library/dsherret/ts-morph)
- [Babel vs. TypeScript: Choosing the right compiler for your project - LogRocket Blog](https://blog.logrocket.com/babel-vs-typescript-choosing-right-compiler-project/)
- [TypeScript: Documentation - Using Babel with TypeScript](https://www.typescriptlang.org/docs/handbook/babel-with-typescript.html)
- [Benchmark TypeScript Parsers: Demystify Rust Tooling Performance - DEV Community](https://dev.to/herrington_darkholme/benchmark-typescript-parsers-demystify-rust-tooling-performance-2go8)

### 效能測量工具

- [GitHub - GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci)
- [Introduction to Lighthouse | Chrome for Developers](https://developer.chrome.com/docs/lighthouse/overview)
- [Lighthouse Test Automation: How To Continuously Monitor Site Speed | DebugBear](https://www.debugbear.com/software/lighthouse-automation)
- [How to Integrate Lighthouse with Playwright for Web Performance Testing (2025 Guide)](https://testingplus.me/how-to-integrate-lighthouse-playwright-performance-testing-2025-guide/)
- [Functions: useReportWebVitals | Next.js](https://nextjs.org/docs/pages/api-reference/functions/use-report-web-vitals)
- [Monitoring, Profiling, and Diagnosing Performance in Next.js 15 Web Apps (2025 Edition)](https://medium.com/@sureshdotariya/monitoring-profiling-and-diagnosing-performance-in-next-js-15-web-apps-2025-edition-bed33a88a719)
- [Tracking Web Vitals & Widget Performance in Next.js with OpenTelemetry | SigNoz](https://signoz.io/blog/opentelemetry-nextjs-web-vitals/)

### 手動測試清單格式

- [Writing scenarios with Gherkin syntax | CucumberStudio Documentation](https://support.smartbear.com/cucumberstudio/docs/bdd/write-gherkin-scenarios.html)
- [Examples of Good vs Bad Gherkin Test Scenarios](https://testquality.com/examples-of-good-vs-bad-gherkin-test-scenarios-a-guide-to-better-bdd-testing/)
- [BDD Testing Insights: How Gherkin Format and Cucumber Boost Test Automation Clarity](https://resident.com/resource-guide/2025/12/03/gherkin-format-and-cucumber-what-they-mean-for-test-automation-clarity)
- [How to Write Effective Gherkin Acceptance Criteria](https://testquality.com/gherkin-language-user-stories-and-scenarios/)

### 健康檢查報告格式

- [About GitHub Code Quality - GitHub Docs](https://docs.github.com/en/code-security/code-quality/concepts/about-code-quality)
- [GitHub Code Quality in public preview - GitHub Changelog](https://github.blog/changelog/2025-10-28-github-code-quality-in-public-preview/)
- [Automated Source Code Quality Assessment - GitHub Marketplace](https://github.com/marketplace/actions/automated-source-code-quality-assessment-executive-report-generator)
- [Quality Monitor - GitHub Marketplace](https://github.com/marketplace/actions/quality-monitor)
- [Enhancing code quality on GitHub with tools, metrics, and actions](https://www.graphite.com/guides/enhancing-code-quality-github)
- [GitHub - reviewdog/reviewdog](https://github.com/reviewdog/reviewdog)

---

**研究完成日期**: 2026-01-13
**下一步行動**: 建立 `spec.md` 與 `plan.md`，實作健康檢查系統
