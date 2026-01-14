/**
 * 健康檢查報告產生器
 *
 * 整合所有領域檢查報告，產生綜合健康檢查報告 (Markdown + JSON)
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import {
  HealthCheckReport,
  ArchitectureReport,
  APIReport,
  UXReport,
  DesignReport,
  Issue,
  Recommendation,
  DomainScore,
} from './types'

/**
 * 產生綜合健康檢查報告
 */
export async function generateReport(
  reportsDir: string
): Promise<HealthCheckReport> {
  const timestamp = new Date().toISOString()

  console.log('📊 開始產生綜合健康檢查報告...')

  // 載入所有領域報告
  const architecture = await loadReport<ArchitectureReport>(
    reportsDir,
    'architecture.json'
  )
  const api = await loadReport<APIReport>(reportsDir, 'api.json')
  const ux = await loadReport<UXReport>(reportsDir, 'ux.json')
  const design = await loadReport<DesignReport>(reportsDir, 'design.json')

  // 收集所有問題和建議
  const allIssues: Issue[] = [
    ...(architecture?.issues || []),
    ...(api?.issues || []),
    ...(ux?.issues || []),
    ...(design?.issues || []),
  ]

  const allRecommendations: Recommendation[] = [
    ...(architecture?.recommendations || []),
    ...(api?.recommendations || []),
    ...(ux?.recommendations || []),
    ...(design?.recommendations || []),
  ]

  // 計算問題數量統計
  const issueCounts = {
    total: allIssues.length,
    critical: allIssues.filter((i) => i.severity === 'critical').length,
    high: allIssues.filter((i) => i.severity === 'high').length,
    medium: allIssues.filter((i) => i.severity === 'medium').length,
    low: allIssues.filter((i) => i.severity === 'low').length,
  }

  // 計算整體評分
  const scores = {
    architecture: architecture?.score || createDefaultScore('architecture'),
    api: api?.score || createDefaultScore('api'),
    ux: ux?.score || createDefaultScore('ux'),
    design: design?.score || createDefaultScore('design'),
    performance: createDefaultScore('performance'), // 未實作
    bugs: createDefaultScore('bugs'), // 未實作
    security: createDefaultScore('security'), // 未實作
  }

  const overallScore = calculateOverallScore(scores)

  // 建立健康檢查報告
  const report: HealthCheckReport = {
    reportId: timestamp.replace(/[:.]/g, '-'),
    timestamp,
    branch: await getCurrentBranch(),
    commit: await getCurrentCommit(),
    overallScore,
    scores,
    issueCounts,
    issues: allIssues,
    recommendations: allRecommendations,
    execution: {
      duration: 0, // 將由 run-health-check.ts 填入
      checksRun: Object.keys(scores).length,
      checksPassed: Object.values(scores).filter((s) => s.score >= 75).length,
      checksFailed: Object.values(scores).filter((s) => s.score < 75).length,
    },
  }

  // 儲存 JSON 報告
  const jsonPath = path.join(reportsDir, 'summary.json')
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`✅ JSON 報告已儲存: ${jsonPath}`)

  // 產生 Markdown 報告
  const markdown = generateMarkdownReport(report)
  const mdPath = path.join(reportsDir, 'summary.md')
  await fs.writeFile(mdPath, markdown, 'utf-8')
  console.log(`✅ Markdown 報告已儲存: ${mdPath}`)

  // 產生問題清單檔案
  await generateIssueFiles(reportsDir, allIssues)

  return report
}

/**
 * 載入領域報告
 */
async function loadReport<T>(
  reportsDir: string,
  filename: string
): Promise<T | null> {
  try {
    const filePath = path.join(reportsDir, filename)
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch (error) {
    console.warn(`⚠️  無法載入報告: ${filename}`)
    return null
  }
}

/**
 * 建立預設評分（未實作的領域）
 */
function createDefaultScore(name: string): DomainScore {
  return {
    name: name === 'architecture' ? '架構健康度' :
           name === 'api' ? 'API 整合度' :
           name === 'ux' ? '使用者體驗' :
           name === 'design' ? '設計一致性' :
           name === 'performance' ? '效能表現' :
           name === 'bugs' ? 'Bug 檢查' :
           '安全性',
    score: 0,
    weight: 0.15,
    weightedScore: 0,
    checksTotal: 0,
    checksPassed: 0,
    checksFailed: 0,
    passRate: 0,
    issueCount: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    detailsFile: `${name}.json`,
  }
}

/**
 * 計算整體評分
 */
function calculateOverallScore(scores: Record<string, DomainScore>): number {
  let totalWeightedScore = 0

  Object.values(scores).forEach((score) => {
    totalWeightedScore += score.weightedScore
  })

  return Math.round(totalWeightedScore)
}

/**
 * 產生 Markdown 報告
 */
function generateMarkdownReport(report: HealthCheckReport): string {
  const date = new Date(report.timestamp).toLocaleString('zh-TW')

  const lines: string[] = []

  // 標題
  lines.push('# 專案健康檢查報告')
  lines.push('')
  lines.push(`**產生時間**: ${date}`)
  lines.push(`**分支**: ${report.branch}`)
  lines.push(`**Commit**: ${report.commit}`)
  lines.push('')

  // 整體評分
  const scoreEmoji = getScoreEmoji(report.overallScore)
  lines.push('## 整體評分')
  lines.push('')
  lines.push(`**${report.overallScore} / 100** ${scoreEmoji}`)
  lines.push('')

  // 各領域評分
  lines.push('## 各領域評分')
  lines.push('')
  lines.push('| 領域 | 評分 | 狀態 | 通過率 | 問題數 |')
  lines.push('|------|------|------|--------|--------|')

  Object.values(report.scores).forEach((score) => {
    const emoji = getScoreEmoji(score.score)
    const passRate = `${score.passRate.toFixed(1)}%`
    const issues = score.issueCount.critical + score.issueCount.high + score.issueCount.medium + score.issueCount.low

    lines.push(`| ${score.name} | ${score.score} | ${emoji} | ${passRate} | ${issues} |`)
  })

  lines.push('')

  // 問題統計
  lines.push('## 問題統計')
  lines.push('')
  lines.push(`- **總問題數**: ${report.issueCounts.total}`)
  lines.push(`  - 🔴 Critical: ${report.issueCounts.critical}`)
  lines.push(`  - 🟡 High: ${report.issueCounts.high}`)
  lines.push(`  - 🔵 Medium: ${report.issueCounts.medium}`)
  lines.push(`  - ⚪ Low: ${report.issueCounts.low}`)
  lines.push('')

  // Critical 問題清單
  const criticalIssues = report.issues.filter((i) => i.severity === 'critical')
  if (criticalIssues.length > 0) {
    lines.push('## 🔴 Critical 問題')
    lines.push('')
    criticalIssues.forEach((issue, index) => {
      lines.push(`### ${index + 1}. ${issue.title}`)
      lines.push('')
      lines.push(`**類別**: ${issue.category}`)
      lines.push(`**位置**: ${formatLocation(issue.location)}`)
      lines.push(`**影響**: ${issue.impact}`)
      lines.push('')

      const rec = report.recommendations.find((r) => r.issueId === issue.issueId)
      if (rec) {
        lines.push(`**修復建議**: ${rec.action}`)
        lines.push(`**預估工時**: ${rec.estimatedEffort}`)
        lines.push('')
      }
    })
  }

  // High 問題清單
  const highIssues = report.issues.filter((i) => i.severity === 'high')
  if (highIssues.length > 0) {
    lines.push('## 🟡 High 問題')
    lines.push('')
    highIssues.slice(0, 10).forEach((issue, index) => {
      lines.push(`### ${index + 1}. ${issue.title}`)
      lines.push('')
      lines.push(`**類別**: ${issue.category}`)
      lines.push(`**位置**: ${formatLocation(issue.location)}`)
      lines.push('')
    })

    if (highIssues.length > 10) {
      lines.push(`...以及其他 ${highIssues.length - 10} 個 High 問題（詳見 issues/high.md）`)
      lines.push('')
    }
  }

  // 修復優先級建議
  lines.push('## 修復優先級建議')
  lines.push('')
  lines.push('1. **立即修復** (P0): Critical 問題')
  lines.push('2. **盡快修復** (P1): High 問題')
  lines.push('3. **排程修復** (P2): Medium 與 Low 問題')
  lines.push('')

  // 詳細報告連結
  lines.push('## 詳細報告')
  lines.push('')
  lines.push('- [架構健康度檢查](./architecture.json)')
  lines.push('- [API 整合度檢查](./api.json)')
  lines.push('- [使用者體驗檢查](./ux.json)')
  lines.push('- [設計系統一致性檢查](./design.json)')
  lines.push('')

  lines.push('---')
  lines.push('')
  lines.push('*此報告由健康檢查系統自動產生*')

  return lines.join('\n')
}

/**
 * 產生問題清單檔案
 */
async function generateIssueFiles(reportsDir: string, issues: Issue[]) {
  const issuesDir = path.join(reportsDir, 'issues')
  await fs.mkdir(issuesDir, { recursive: true })

  // 依嚴重程度分類
  const critical = issues.filter((i) => i.severity === 'critical')
  const high = issues.filter((i) => i.severity === 'high')
  const medium = issues.filter((i) => i.severity === 'medium')
  const low = issues.filter((i) => i.severity === 'low')

  // 產生各嚴重程度的 Markdown 檔案
  await writeIssueFile(issuesDir, 'critical.md', '🔴 Critical 問題', critical)
  await writeIssueFile(issuesDir, 'high.md', '🟡 High 問題', high)
  await writeIssueFile(issuesDir, 'medium.md', '🔵 Medium 問題', medium)
  await writeIssueFile(issuesDir, 'low.md', '⚪ Low 問題', low)

  console.log(`✅ 問題清單已儲存至: ${issuesDir}`)
}

/**
 * 寫入問題檔案
 */
async function writeIssueFile(
  dir: string,
  filename: string,
  title: string,
  issues: Issue[]
) {
  const lines: string[] = []

  lines.push(`# ${title}`)
  lines.push('')
  lines.push(`**總數**: ${issues.length}`)
  lines.push('')

  issues.forEach((issue, index) => {
    lines.push(`## ${index + 1}. ${issue.title}`)
    lines.push('')
    lines.push(`**類別**: ${issue.category}`)
    lines.push(`**位置**: ${formatLocation(issue.location)}`)
    lines.push(`**影響**: ${issue.impact}`)
    lines.push(`**狀態**: ${issue.status}`)
    lines.push('')
  })

  const filePath = path.join(dir, filename)
  await fs.writeFile(filePath, lines.join('\n'), 'utf-8')
}

/**
 * 格式化問題位置
 */
function formatLocation(location: any): string {
  if (location.filePath) {
    const basename = path.basename(location.filePath)
    if (location.lineStart) {
      return `${basename}:${location.lineStart}`
    }
    return basename
  }

  if (location.route) {
    return `路由: ${location.route}`
  }

  if (location.table) {
    return `資料表: ${location.table}`
  }

  return '未知位置'
}

/**
 * 取得評分表情符號
 */
function getScoreEmoji(score: number): string {
  if (score >= 90) return '✅ 優秀'
  if (score >= 75) return '✅ 良好'
  if (score >= 60) return '⚠️ 尚可'
  return '🔴 需改進'
}

/**
 * 取得當前分支
 */
async function getCurrentBranch(): Promise<string> {
  try {
    const { execSync } = await import('child_process')
    return execSync('git branch --show-current', { encoding: 'utf-8' }).trim()
  } catch {
    return 'unknown'
  }
}

/**
 * 取得當前 commit
 */
async function getCurrentCommit(): Promise<string> {
  try {
    const { execSync } = await import('child_process')
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'unknown'
  }
}

/**
 * 主執行函式
 */
async function main() {
  const rootDir = process.cwd()
  const reportsDir = path.join(rootDir, 'specs', '017-health-check', 'reports')

  const report = await generateReport(reportsDir)

  console.log('\n📊 綜合健康檢查報告')
  console.log(`  整體評分: ${report.overallScore}/100`)
  console.log(`  總問題數: ${report.issueCounts.total}`)
  console.log(`    - Critical: ${report.issueCounts.critical}`)
  console.log(`    - High: ${report.issueCounts.high}`)
  console.log(`    - Medium: ${report.issueCounts.medium}`)
  console.log(`    - Low: ${report.issueCounts.low}`)
}

// 如果直接執行此腳本
if (require.main === module) {
  main().catch((error) => {
    console.error('執行失敗:', error)
    process.exit(1)
  })
}
