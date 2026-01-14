/**
 * 設計系統一致性檢查
 *
 * 檢查 UI 元件是否遵循 Neo-Brutalism 設計規範
 */

import { glob } from 'glob'
import path from 'path'
import { randomUUID } from 'crypto'
import type {
  DesignReport,
  CheckResult,
  CheckItem,
  Issue,
  Recommendation,
  DomainScore,
} from './types'

/**
 * 執行設計檢查
 */
export async function checkDesign(rootDir: string): Promise<DesignReport> {
  const timestamp = new Date().toISOString()

  console.log('🔍 執行設計系統一致性檢查...')

  // 執行所有檢查
  const [neoBrutalism, responsiveDesign, designTokens, dialogSystem] =
    await Promise.all([
      checkNeoBrutalismStyle(rootDir),
      checkResponsiveDesign(rootDir),
      checkDesignTokenUsage(rootDir),
      checkDialogSystemUsage(rootDir),
    ])

  // 收集樣式問題
  const styleIssues: {
    component: string
    filePath: string
    issues: string[]
  }[] = []

  ;[neoBrutalism, responsiveDesign, designTokens, dialogSystem].forEach((check) => {
    check.items.forEach((item) => {
      if (item.status === 'fail' || item.status === 'warning') {
        const existing = styleIssues.find(
          (si) => si.filePath === item.location.filePath
        )

        if (existing) {
          existing.issues.push(item.message)
        } else {
          styleIssues.push({
            component: item.location.name || 'Unknown',
            filePath: item.location.filePath || '',
            issues: [item.message],
          })
        }
      }
    })
  })

  // 建立問題與建議
  const issues: Issue[] = []
  const recommendations: Recommendation[] = []

  styleIssues.forEach((styleIssue) => {
    const issue = createIssue(styleIssue)
    issues.push(issue)

    const recommendation = createRecommendation(issue)
    recommendations.push(recommendation)
  })

  // 計算評分
  const score = calculateDomainScore(
    [neoBrutalism, responsiveDesign, designTokens, dialogSystem],
    issues
  )

  return {
    domain: 'design',
    timestamp,
    score,
    checks: {
      neoBrutalism,
      responsiveDesign,
      designTokens,
      dialogSystem,
    },
    styleIssues,
    issues,
    recommendations,
  }
}

/**
 * Check 1: Neo-Brutalism 風格檢查
 */
async function checkNeoBrutalismStyle(rootDir: string): Promise<CheckResult> {
  const items: CheckItem[] = []

  // 搜尋所有 TSX 檔案
  const tsxFiles = await glob('**/*.tsx', {
    cwd: path.join(rootDir, 'app'),
    ignore: ['**/node_modules/**', '**/.next/**'],
  })

  const fs = await import('fs/promises')

  for (const file of tsxFiles) {
    const filePath = path.join(rootDir, 'app', file)
    const content = await fs.readFile(filePath, 'utf-8')

    // 檢查邊框樣式
    const hasBorder = /className="[^"]*border-[23]/.test(content)
    const hasResponsiveBorder = /className="[^"]*border-2\s+md:border-3/.test(
      content
    )

    // 檢查陰影樣式
    const hasShadow = /className="[^"]*shadow-neo/.test(content)
    const hasResponsiveShadow =
      /className="[^"]*shadow-neo-sm\s+md:shadow-neo/.test(content)

    // 檢查點擊效果
    const hasClickEffect =
      /className="[^"]*active:translate-.*active:shadow-none/.test(content)

    // 如果檔案包含 className 但不符合規範
    if (content.includes('className') && hasBorder) {
      if (!hasResponsiveBorder) {
        items.push({
          location: {
            type: 'file',
            filePath,
            name: path.basename(file),
          },
          status: 'warning',
          message: '邊框應使用響應式樣式（border-2 md:border-3）',
        })
      }

      if (hasShadow && !hasResponsiveShadow) {
        items.push({
          location: {
            type: 'file',
            filePath,
            name: path.basename(file),
          },
          status: 'warning',
          message: '陰影應使用響應式樣式（shadow-neo-sm md:shadow-neo）',
        })
      }

      if (!hasClickEffect && hasBorder) {
        items.push({
          location: {
            type: 'file',
            filePath,
            name: path.basename(file),
          },
          status: 'warning',
          message: '缺少點擊效果（active:translate-x-[2px] active:shadow-none）',
        })
      }
    }
  }

  const passed = items.filter((i) => i.status === 'fail').length === 0

  return {
    name: 'Neo-Brutalism 風格檢查',
    passed,
    details: `檢查了 ${tsxFiles.length} 個 TSX 檔案，發現 ${items.length} 個潛在問題`,
    items,
  }
}

/**
 * Check 2: 響應式設計檢查
 */
async function checkResponsiveDesign(rootDir: string): Promise<CheckResult> {
  const items: CheckItem[] = []

  // 搜尋所有 TSX 檔案
  const tsxFiles = await glob('**/*.tsx', {
    cwd: path.join(rootDir, 'app'),
    ignore: ['**/node_modules/**', '**/.next/**'],
  })

  const fs = await import('fs/promises')

  for (const file of tsxFiles) {
    const filePath = path.join(rootDir, 'app', file)
    const content = await fs.readFile(filePath, 'utf-8')

    // 檢查是否使用 Mobile-First 策略（基礎樣式 + md: 斷點）
    const hasMobileFirst =
      content.includes('md:') || content.includes('lg:') || content.includes('sm:')

    // 檢查是否使用固定寬度（應使用 w-full 或響應式寬度）
    const hasFixedWidth = /className="[^"]*w-\[.*px\]/.test(content)

    // 檢查觸控目標大小（按鈕、連結應 >= 44px）
    const hasSmallButton = /className="[^"]*h-[1-3]\s/.test(content)

    if (content.includes('className')) {
      if (hasFixedWidth) {
        items.push({
          location: {
            type: 'file',
            filePath,
            name: path.basename(file),
          },
          status: 'warning',
          message: '避免使用固定寬度（w-[XXpx]），應使用響應式寬度',
        })
      }

      if (hasSmallButton) {
        items.push({
          location: {
            type: 'file',
            filePath,
            name: path.basename(file),
          },
          status: 'warning',
          message: '觸控目標過小，應 >= 44px (WCAG 2.1 AA 標準)',
        })
      }
    }
  }

  const passed = items.filter((i) => i.status === 'fail').length === 0

  return {
    name: '響應式設計檢查',
    passed,
    details: `檢查了 ${tsxFiles.length} 個 TSX 檔案，發現 ${items.length} 個潛在問題`,
    items,
  }
}

/**
 * Check 3: 設計 Token 使用檢查
 */
async function checkDesignTokenUsage(rootDir: string): Promise<CheckResult> {
  const items: CheckItem[] = []

  // 搜尋所有 TSX 檔案
  const tsxFiles = await glob('**/*.tsx', {
    cwd: path.join(rootDir, 'app'),
    ignore: ['**/node_modules/**', '**/.next/**'],
  })

  const fs = await import('fs/promises')

  for (const file of tsxFiles) {
    const filePath = path.join(rootDir, 'app', file)
    const content = await fs.readFile(filePath, 'utf-8')

    // 檢查硬編碼顏色值（#RRGGBB）
    const hasHardcodedColor = /#[0-9A-Fa-f]{6}/.test(content)

    // 檢查硬編碼邊框寬度（3px、2px）
    const hasHardcodedBorder = /\d+px/.test(content) && content.includes('border')

    if (hasHardcodedColor) {
      items.push({
        location: {
          type: 'file',
          filePath,
          name: path.basename(file),
        },
        status: 'warning',
        message: '發現硬編碼顏色值，應使用 Tailwind 配色',
      })
    }

    if (hasHardcodedBorder) {
      items.push({
        location: {
          type: 'file',
          filePath,
          name: path.basename(file),
        },
        status: 'warning',
        message: '發現硬編碼邊框寬度，應使用 border-2/border-3 等 Tailwind 類別',
      })
    }
  }

  const passed = items.filter((i) => i.status === 'fail').length === 0

  return {
    name: '設計 Token 使用檢查',
    passed,
    details: `檢查了 ${tsxFiles.length} 個 TSX 檔案，發現 ${items.length} 個潛在問題`,
    items,
  }
}

/**
 * Check 4: 對話框系統檢查
 */
async function checkDialogSystemUsage(rootDir: string): Promise<CheckResult> {
  const items: CheckItem[] = []

  // 搜尋所有 TSX 和 TS 檔案
  const files = await glob('**/*.{tsx,ts}', {
    cwd: path.join(rootDir, 'app'),
    ignore: ['**/node_modules/**', '**/.next/**'],
  })

  const fs = await import('fs/promises')

  for (const file of files) {
    const filePath = path.join(rootDir, 'app', file)
    const content = await fs.readFile(filePath, 'utf-8')

    // 檢查是否使用原生對話框
    const hasWindowAlert = /window\.alert\(/.test(content)
    const hasWindowConfirm = /window\.confirm\(/.test(content)
    const hasWindowPrompt = /window\.prompt\(/.test(content)

    if (hasWindowAlert || hasWindowConfirm || hasWindowPrompt) {
      items.push({
        location: {
          type: 'file',
          filePath,
          name: path.basename(file),
        },
        status: 'fail',
        message:
          '使用原生對話框，應使用 useAlert/useConfirm/usePrompt hooks',
      })
    }
  }

  const passed = items.filter((i) => i.status === 'fail').length === 0

  return {
    name: '對話框系統檢查',
    passed,
    details: `檢查了 ${files.length} 個檔案，發現 ${items.filter((i) => i.status === 'fail').length} 個違規`,
    items,
  }
}

/**
 * 計算領域評分
 */
function calculateDomainScore(checks: CheckResult[], issues: Issue[]): DomainScore {
  const checksTotal = checks.length
  const checksPassed = checks.filter((c) => c.passed).length
  const checksFailed = checksTotal - checksPassed
  const passRate = checksTotal > 0 ? (checksPassed / checksTotal) * 100 : 0

  // 計算問題數量
  const critical = issues.filter((i) => i.severity === 'critical').length
  const high = issues.filter((i) => i.severity === 'high').length
  const medium = issues.filter((i) => i.severity === 'medium').length
  const low = issues.filter((i) => i.severity === 'low').length

  // 計算評分（基於通過率和問題嚴重度）
  let score = passRate
  score -= critical * 10
  score -= high * 5
  score -= medium * 2
  score -= low * 1
  score = Math.max(0, Math.min(100, score))

  const weight = 0.1 // 設計檢查權重 10%

  return {
    name: '設計系統一致性',
    score,
    weight,
    weightedScore: score * weight,
    checksTotal,
    checksPassed,
    checksFailed,
    passRate,
    issueCount: {
      critical,
      high,
      medium,
      low,
    },
    detailsFile: 'design.json',
  }
}

/**
 * 建立問題
 */
function createIssue(styleIssue: {
  component: string
  filePath: string
  issues: string[]
}): Issue {
  return {
    issueId: randomUUID(),
    reportId: '',
    category: 'design',
    severity: 'low',
    title: `設計規範問題：${styleIssue.component}`,
    description: styleIssue.issues.join('\n'),
    location: {
      type: 'file',
      filePath: styleIssue.filePath,
      name: styleIssue.component,
    },
    impact: '可能影響使用者體驗和品牌一致性',
    status: 'open',
    discoveredAt: new Date().toISOString(),
  }
}

/**
 * 建立修復建議
 */
function createRecommendation(issue: Issue): Recommendation {
  return {
    recommendationId: randomUUID(),
    issueId: issue.issueId,
    priority: 'p2',
    title: `修復設計規範問題：${issue.location.name}`,
    action: '參考專案憲章中的設計系統規範修正樣式',
    estimatedEffort: '10-30 分鐘',
    references: [
      {
        title: '專案憲章 - 設計系統一致性',
        url: 'file://d:/APP/vsale/CLAUDE.md#v-設計系統一致性',
        type: 'spec',
      },
      {
        title: '專案憲章 - 響應式設計規範',
        url: 'file://d:/APP/vsale/CLAUDE.md#vii-響應式設計規範',
        type: 'spec',
      },
    ],
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
}

/**
 * 主執行函式
 */
async function main() {
  const rootDir = process.cwd()
  const report = await checkDesign(rootDir)

  // 輸出報告
  console.log('\n=== 設計檢查報告 ===\n')
  console.log(`評分: ${report.score.score.toFixed(1)} / 100`)
  console.log(`通過率: ${report.score.passRate.toFixed(1)}%`)
  console.log(`樣式問題: ${report.styleIssues.length} 個元件`)

  // 輸出檢查結果
  console.log('\n檢查結果:')
  Object.values(report.checks).forEach((check) => {
    const status = check.passed ? '✅ 通過' : '⚠️  有問題'
    console.log(`  ${status} ${check.name}`)
    console.log(`      ${check.details}`)
  })

  // 儲存報告為 JSON
  const fs = await import('fs/promises')
  const outputPath = path.join(
    rootDir,
    'specs',
    '017-health-check',
    'reports',
    'design.json'
  )
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
