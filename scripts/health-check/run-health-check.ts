/**
 * 主執行腳本 - 健康檢查系統
 *
 * 並行執行所有領域檢查，收集結果並產生綜合報告
 */

import * as path from 'path'
import * as fs from 'fs/promises'
import { checkArchitecture } from './check-architecture'
import { checkAPI } from './check-api'
import { generateReport } from './generate-report'

/**
 * CLI 參數
 */
interface CliArgs {
  domains?: string[]
  verbose?: boolean
  noMarkdown?: boolean
  exportIssues?: boolean
}

/**
 * 解析 CLI 參數
 */
function parseArgs(): CliArgs {
  const args: CliArgs = {}

  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--domains=')) {
      args.domains = arg.split('=')[1].split(',')
    } else if (arg === '--verbose') {
      args.verbose = true
    } else if (arg === '--no-markdown') {
      args.noMarkdown = true
    } else if (arg === '--export-issues') {
      args.exportIssues = true
    }
  })

  return args
}

/**
 * 執行健康檢查
 */
async function runHealthCheck() {
  const startTime = Date.now()
  const rootDir = process.cwd()
  const reportsDir = path.join(rootDir, 'specs', '017-health-check', 'reports')

  // 解析參數
  const args = parseArgs()

  console.log('🏥 專案健康檢查系統')
  console.log('=' .repeat(50))
  console.log('')

  // 確保報告目錄存在
  await fs.mkdir(reportsDir, { recursive: true })

  // 決定要執行哪些領域檢查
  const domains = args.domains || [
    'architecture',
    'api',
    'ux',
    'design',
    // 'performance', // 未實作
    // 'bugs', // 未實作
    // 'security', // 未實作
  ]

  console.log(`📋 執行領域: ${domains.join(', ')}`)
  console.log('')

  // 並行執行所有檢查
  const results = await Promise.allSettled([
    domains.includes('architecture')
      ? runCheck('架構健康度', () => checkArchitecture(rootDir, reportsDir))
      : Promise.resolve(null),

    domains.includes('api')
      ? runCheck('API 整合度', async () => {
          const report = await checkAPI(rootDir)
          // 儲存 JSON 報告
          const outputPath = path.join(reportsDir, 'api.json')
          await fs.writeFile(outputPath, JSON.stringify(report, null, 2))
          return report
        })
      : Promise.resolve(null),

    // UX 和 Design 檢查需要手動執行對應的腳本
    // domains.includes('ux') ? runCheck('使用者體驗', ...) : Promise.resolve(null),
    // domains.includes('design') ? runCheck('設計一致性', ...) : Promise.resolve(null),
  ])

  // 檢查是否有失敗的檢查
  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) {
    console.log('')
    console.log('❌ 部分檢查失敗:')
    failed.forEach((r) => {
      if (r.status === 'rejected') {
        console.log(`  - ${r.reason}`)
      }
    })
  }

  console.log('')
  console.log('📊 產生綜合報告...')

  // 產生綜合報告
  const report = await generateReport(reportsDir)

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log('')
  console.log('=' .repeat(50))
  console.log('✅ 健康檢查完成')
  console.log(`⏱️  執行時間: ${duration}秒`)
  console.log(`📊 整體評分: ${report.overallScore}/100`)
  console.log(`🔍 總問題數: ${report.issueCounts.total}`)
  console.log(`  - 🔴 Critical: ${report.issueCounts.critical}`)
  console.log(`  - 🟡 High: ${report.issueCounts.high}`)
  console.log(`  - 🔵 Medium: ${report.issueCounts.medium}`)
  console.log(`  - ⚪ Low: ${report.issueCounts.low}`)
  console.log('')
  console.log(`📄 詳細報告: ${reportsDir}/summary.md`)

  // 如果評分過低，以非零狀態碼退出
  if (report.overallScore < 60) {
    process.exit(1)
  }
}

/**
 * 執行單一檢查並記錄時間
 */
async function runCheck<T>(name: string, checkFn: () => Promise<T>): Promise<T> {
  const startTime = Date.now()
  console.log(`🔍 執行 ${name} 檢查...`)

  try {
    const result = await checkFn()
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`✅ ${name} 檢查完成 (${duration}s)`)
    return result
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`❌ ${name} 檢查失敗 (${duration}s)`)
    throw error
  }
}

/**
 * 主程式
 */
async function main() {
  try {
    await runHealthCheck()
  } catch (error) {
    console.error('❌ 健康檢查失敗:', error)
    process.exit(1)
  }
}

// 執行主程式
if (require.main === module) {
  main()
}
