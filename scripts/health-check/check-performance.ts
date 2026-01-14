/**
 * 效能與速度檢查
 *
 * 檢查專案的載入速度、資料庫查詢效能、圖片優化、快取策略等
 */

import path from 'path'
import type {
  PerformanceReport,
  CheckResult,
  Issue,
  Recommendation,
  DomainScore,
} from './types'

/**
 * 執行效能檢查
 */
export async function checkPerformance(rootDir: string): Promise<PerformanceReport> {
  const timestamp = new Date().toISOString()

  console.log('🔍 執行效能檢查...')

  // 執行各項檢查
  const lighthouseCheck = await integrateLighthouseReport(rootDir)
  const webVitalsCheck = await measureWebVitals(rootDir)
  const databaseCheck = await measureDatabaseQueries(rootDir)
  const imageCheck = await checkImageOptimization(rootDir)
  const budgetCheck = await checkPerformanceBudgets(rootDir)

  const checks = {
    lighthouse: lighthouseCheck,
    webVitals: webVitalsCheck,
    database: databaseCheck,
    images: imageCheck,
    budgets: budgetCheck,
  }

  // 收集所有問題
  const issues: Issue[] = []
  const recommendations: Recommendation[] = []

  // TODO: 從各項檢查中提取問題和建議（目前未使用）
  // Object.values(checks).forEach((check) => {
  //   check.items.forEach((item) => {
  //     if (item.status === 'fail') {
  //       issues.push({
  //         issueId: `perf-${issues.length + 1}`,
  //         reportId: '',
  //         severity: 'medium',
  //         category: 'performance',
  //         title: item.message,
  //         description: '',
  //         location: item.location,
  //         impact: '',
  //         status: 'open',
  //         discoveredAt: new Date().toISOString(),
  //       })
  //     }
  //   })
  // })

  // 計算評分
  const score = calculateDomainScore([
    checks.lighthouse,
    checks.webVitals,
    checks.database,
    checks.images,
    checks.budgets,
  ])

  return {
    domain: 'performance',
    timestamp,
    score,
    lighthouse: {
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      pwa: 0,
      metrics: {
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        totalBlockingTime: 0,
        cumulativeLayoutShift: 0,
        speedIndex: 0,
        timeToInteractive: 0,
      },
      budgets: [],
    },
    webVitals: [],
    databaseQueries: [],
    issues,
    recommendations,
  }
}

/**
 * 整合 Lighthouse 報告
 *
 * 注意：需要先安裝 @lhci/cli 並執行 lighthouse
 * 此函式嘗試讀取 Lighthouse 報告，如果不存在則產生手動測試建議
 */
async function integrateLighthouseReport(rootDir: string): Promise<CheckResult> {
  console.log('  檢查 Lighthouse 報告...')

  // 檢查是否有 Lighthouse 報告檔案
  // 實際應用中應讀取 .lighthouseci/ 目錄下的報告

  return {
    name: 'Lighthouse 效能檢查',
    passed: false,
    details: 'Lighthouse 需手動執行並整合報告',
    items: [
      {
        location: { type: 'file' as const, filePath: 'lighthouserc.js' },
        status: 'warning' as const,
        message: '尚未執行 Lighthouse CI 測試',
        details:
          '請執行 `pnpm lighthouse` 來產生效能報告。建議目標：Performance Score >= 90',
        severity: 'medium' as const,
      },
    ],
  }
}

/**
 * 測量 Web Vitals
 *
 * 注意：Web Vitals 需要在實際執行環境中測量
 * 此函式提供檢查指引和參考目標
 */
async function measureWebVitals(rootDir: string): Promise<CheckResult> {
  console.log('  檢查 Web Vitals...')

  return {
    name: 'Web Vitals 測量',
    passed: false,
    details: 'Web Vitals 需使用 Chrome DevTools 或 Vercel Analytics 測量',
    items: [
      {
        location: { type: 'route' as const, route: '/' },
        status: 'warning' as const,
        message: '尚未測量 Web Vitals 指標',
        details: `
建議使用以下工具測量：
1. Chrome DevTools Lighthouse
2. Vercel Analytics (已部署應用)
3. web-vitals 套件

目標值：
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1
- TTFB (Time to First Byte) < 600ms
- FCP (First Contentful Paint) < 1.8s
        `.trim(),
        severity: 'medium' as const,
      },
    ],
  }
}

/**
 * 測量資料庫查詢效能
 *
 * 檢查是否有 N+1 查詢問題、缺少索引、慢查詢等
 */
async function measureDatabaseQueries(rootDir: string): Promise<CheckResult> {
  console.log('  檢查資料庫查詢效能...')

  const fs = await import('fs/promises')
  const glob = (await import('glob')).glob

  // 檢查 Server Actions 中的資料庫查詢
  const actionFiles = await glob('lib/actions/**/*.ts', { cwd: rootDir })

  const issues: CheckResult['items'] = []

  for (const file of actionFiles) {
    const filePath = path.join(rootDir, file)
    const content = await fs.readFile(filePath, 'utf-8')

    // 檢查是否有多次單獨查詢（潛在的 N+1 問題）
    const selectMatches = content.match(/\.from\(['"](.*?)['"]\)\.select/g)
    if (selectMatches && selectMatches.length > 3) {
      issues.push({
        location: { type: 'file' as const, file },
        status: 'warning' as const,
        message: `檔案包含多個資料庫查詢（${selectMatches.length} 個）`,
        details: '建議檢查是否有 N+1 查詢問題，可使用批次查詢或 JOIN 優化',
        severity: 'low' as const,
      })
    }

    // 檢查是否缺少 .limit() 限制
    const unlimitedQueries = content.match(/\.from\(['"](.*?)['"]\)\.select[^]*?(?!\.limit)/g)
    if (unlimitedQueries && unlimitedQueries.length > 0) {
      issues.push({
        location: { type: 'file' as const, file },
        status: 'warning' as const,
        message: '查詢缺少 .limit() 限制',
        details: '無限制的查詢可能導致效能問題，建議加上 .limit()',
        severity: 'medium' as const,
      })
    }
  }

  const passed = issues.filter((i) => i.status === 'fail').length === 0

  return {
    name: '資料庫查詢效能檢查',
    passed,
    details: `檢查 ${actionFiles.length} 個 Server Actions 檔案`,
    items: issues,
  }
}

/**
 * 檢查圖片優化
 *
 * 檢查是否使用 Next.js Image 元件、是否設定 sizes 屬性等
 */
async function checkImageOptimization(rootDir: string): Promise<CheckResult> {
  console.log('  檢查圖片優化...')

  const fs = await import('fs/promises')
  const glob = (await import('glob')).glob

  // 檢查所有 React 元件
  const componentFiles = await glob('{app,components}/**/*.tsx', { cwd: rootDir })

  const issues: CheckResult['items'] = []

  for (const file of componentFiles) {
    const filePath = path.join(rootDir, file)
    const content = await fs.readFile(filePath, 'utf-8')

    // 檢查是否使用 <img> 而非 Next.js Image
    const imgTags = content.match(/<img\s/g)
    if (imgTags) {
      issues.push({
        location: { type: 'file' as const, file },
        status: 'warning' as const,
        message: `使用 <img> 標籤而非 Next.js Image 元件（${imgTags.length} 處）`,
        details:
          '建議使用 Next.js Image 元件以自動優化圖片（格式轉換、大小調整、lazy loading）',
        severity: 'medium' as const,
      })
    }

    // 檢查 Image 元件是否缺少 sizes 屬性
    const imageTags = content.match(/<Image[^>]*>/g)
    if (imageTags) {
      imageTags.forEach((tag) => {
        if (!tag.includes('sizes=')) {
          issues.push({
            location: { type: 'file' as const, file },
            status: 'warning' as const,
            message: 'Image 元件缺少 sizes 屬性',
            details: '建議設定 sizes 屬性以優化響應式圖片載入',
            severity: 'low' as const,
          })
        }
      })
    }
  }

  const passed = issues.filter((i) => i.status === 'fail').length === 0

  return {
    name: '圖片優化檢查',
    passed,
    details: `檢查 ${componentFiles.length} 個元件檔案`,
    items: issues,
  }
}

/**
 * 檢查效能預算
 *
 * 驗證是否符合效能目標：頁面載入 < 2s、資料庫查詢 < 100ms
 */
async function checkPerformanceBudgets(rootDir: string): Promise<CheckResult> {
  console.log('  檢查效能預算...')

  const items: CheckResult['items'] = [
    {
      location: { type: 'file' as const, filePath: 'package.json' },
      status: 'warning' as const,
      message: '效能預算需手動測試驗證',
      details: `
效能目標（來自專案憲章）：
1. 頁面首次載入 < 2s (Mobile 4G)
2. 登入驗證響應 < 500ms
3. 客戶搜尋即時響應 < 300ms
4. 資料庫查詢 < 100ms (p95)

建議使用以下工具測量：
- Chrome DevTools Network/Performance 面板
- Lighthouse CI
- Vercel Analytics
- Supabase Dashboard (查詢統計)
      `.trim(),
      severity: 'medium' as const,
    },
  ]

  return {
    name: '效能預算檢查',
    passed: false,
    details: '效能預算需手動測試驗證',
    items,
  }
}

/**
 * 計算領域評分
 */
function calculateDomainScore(checks: CheckResult[]): DomainScore {
  const checksTotal = checks.length
  const checksPassed = checks.filter((c) => c.passed).length
  const checksFailed = checksTotal - checksPassed
  const passRate = checksTotal > 0 ? (checksPassed / checksTotal) * 100 : 0

  // 效能檢查需實際測量，暫時給予基礎分數
  const score = Math.round(passRate * 0.7 + 30) // 30 分基礎分 + 70% 檢查通過率

  const weight = 0.2 // 效能檢查權重 20%

  return {
    name: '效能表現',
    score,
    weight,
    weightedScore: score * weight,
    checksTotal,
    checksPassed,
    checksFailed,
    passRate,
    issueCount: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    detailsFile: 'performance.json',
  }
}

/**
 * 主執行函式
 */
async function main() {
  const rootDir = process.cwd()
  const report = await checkPerformance(rootDir)

  // 輸出報告
  console.log('\n=== 效能檢查報告 ===\n')
  console.log(`評分: ${report.score.score.toFixed(1)} / 100`)
  console.log(`檢查項目: ${report.score.checksTotal}`)
  console.log(`通過項目: ${report.score.checksPassed}`)
  console.log(`失敗項目: ${report.score.checksFailed}`)
  console.log(`通過率: ${report.score.passRate.toFixed(1)}%`)

  // 輸出問題
  if (report.issues.length > 0) {
    console.log(`\n發現 ${report.issues.length} 個效能問題`)
    report.issues.slice(0, 5).forEach((issue, index) => {
      console.log(`\n${index + 1}. [${issue.severity}] ${issue.title}`)
      console.log(`   位置: ${issue.location.file || issue.location.route || 'N/A'}`)
    })
  }

  // 儲存報告為 JSON
  const fs = await import('fs/promises')
  const outputPath = path.join(rootDir, 'specs', '017-health-check', 'reports', 'performance.json')
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2))

  console.log(`\n✅ 報告已儲存至: ${outputPath}`)
}

// 如果直接執行此腳本
if (require.main === module) {
  main().catch((error) => {
    console.error('執行失敗:', error)
    process.exit(1)
  })
}
