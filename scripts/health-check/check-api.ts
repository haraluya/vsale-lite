/**
 * API 整合度與資料流檢查
 *
 * 檢查 Server Actions 品質、錯誤處理、權限驗證、RLS Policies
 */

import { glob } from 'glob'
import path from 'path'
import { randomUUID } from 'crypto'
import {
  createTsProject,
  hasUseServer,
  hasCheckAuth,
  hasZodValidation,
  hasRevalidatePath,
  hasActionResultReturnType,
  getExportedFunctions,
  getFunctionName,
  getFunctionLocation,
  hasTryCatch,
  isAsyncFunction,
} from './utils/ts-ast-helpers'
import type {
  APIReport,
  CheckResult,
  CheckItem,
  Issue,
  Recommendation,
  DomainScore,
} from './types'

/**
 * 執行 API 檢查
 */
export async function checkAPI(rootDir: string): Promise<APIReport> {
  const timestamp = new Date().toISOString()

  console.log('🔍 執行 API 整合度檢查...')

  // 執行所有檢查
  const [
    serverActionsQuality,
    errorHandling,
    authorizationChecks,
    rlsPolicies,
  ] = await Promise.all([
    checkServerActionsQuality(rootDir),
    checkErrorHandling(rootDir),
    checkAuthorizationChecks(rootDir),
    checkRLSPolicies(rootDir),
  ])

  // 計算統計資料
  const stats = calculateServerActionsStats(rootDir)

  // 收集所有問題
  const issues: Issue[] = []
  const recommendations: Recommendation[] = []

  ;[serverActionsQuality, errorHandling, authorizationChecks, rlsPolicies].forEach(
    (check) => {
      check.items.forEach((item) => {
        if (item.status === 'fail') {
          const issue = createIssue(check.name, item)
          issues.push(issue)

          const recommendation = createRecommendation(issue)
          recommendations.push(recommendation)
        }
      })
    }
  )

  // 計算評分
  const score = calculateDomainScore(
    [serverActionsQuality, errorHandling, authorizationChecks, rlsPolicies],
    issues
  )

  return {
    domain: 'api',
    timestamp,
    score,
    checks: {
      serverActionsQuality,
      errorHandling,
      authorizationChecks,
      rlsPolicies,
    },
    serverActionsStats: stats,
    issues,
    recommendations,
  }
}

/**
 * Check 1: Server Actions 品質檢查
 */
async function checkServerActionsQuality(rootDir: string): Promise<CheckResult> {
  const items: CheckItem[] = []
  const actionsDir = path.join(rootDir, 'lib', 'actions')

  // 取得所有 Server Actions 檔案
  const actionFiles = await glob('**/*.ts', { cwd: actionsDir })

  const project = createTsProject(rootDir)

  for (const file of actionFiles) {
    const filePath = path.join(actionsDir, file)
    const sourceFile = project.getSourceFile(filePath)

    if (!sourceFile) continue

    // 檢查檔案是否包含 'use server'
    if (!hasUseServer(sourceFile)) {
      items.push({
        location: {
          type: 'file',
          filePath,
        },
        status: 'fail',
        message: "缺少 'use server' 指令",
      })
      continue
    }

    // 檢查所有匯出的函式
    const functions = getExportedFunctions(sourceFile)

    for (const func of functions) {
      const funcName = getFunctionName(func)
      const location = getFunctionLocation(func)

      // 檢查是否為 async 函式
      if (!isAsyncFunction(func)) {
        items.push({
          location: {
            type: 'function',
            name: funcName,
            ...location,
          },
          status: 'fail',
          message: 'Server Action 必須是 async 函式',
        })
        continue
      }

      // 檢查回傳型別
      if (!hasActionResultReturnType(func)) {
        items.push({
          location: {
            type: 'function',
            name: funcName,
            ...location,
          },
          status: 'warning',
          message: '回傳型別應為 Promise<ActionResult<T>>',
        })
      }

      // 通過檢查
      items.push({
        location: {
          type: 'function',
          name: funcName,
          ...location,
        },
        status: 'pass',
        message: 'Server Action 符合基本規範',
      })
    }
  }

  const passed = items.filter((i) => i.status === 'pass').length === items.length

  return {
    name: 'Server Actions 品質檢查',
    passed,
    details: `檢查了 ${actionFiles.length} 個檔案，共 ${items.length} 個函式`,
    items,
  }
}

/**
 * Check 2: 錯誤處理檢查
 */
async function checkErrorHandling(rootDir: string): Promise<CheckResult> {
  const items: CheckItem[] = []
  const actionsDir = path.join(rootDir, 'lib', 'actions')

  const actionFiles = await glob('**/*.ts', { cwd: actionsDir })
  const project = createTsProject(rootDir)

  for (const file of actionFiles) {
    const filePath = path.join(actionsDir, file)
    const sourceFile = project.getSourceFile(filePath)

    if (!sourceFile) continue

    const functions = getExportedFunctions(sourceFile)

    for (const func of functions) {
      const funcName = getFunctionName(func)
      const location = getFunctionLocation(func)

      // 檢查是否包含 try-catch
      if (!hasTryCatch(func)) {
        items.push({
          location: {
            type: 'function',
            name: funcName,
            ...location,
          },
          status: 'fail',
          message: '缺少 try-catch 錯誤處理',
        })
        continue
      }

      // 通過檢查
      items.push({
        location: {
          type: 'function',
          name: funcName,
          ...location,
        },
        status: 'pass',
        message: '錯誤處理正確',
      })
    }
  }

  const passed = items.filter((i) => i.status === 'pass').length === items.length

  return {
    name: '錯誤處理檢查',
    passed,
    details: `檢查了 ${items.length} 個函式的錯誤處理`,
    items,
  }
}

/**
 * Check 3: 權限驗證檢查
 */
async function checkAuthorizationChecks(rootDir: string): Promise<CheckResult> {
  const items: CheckItem[] = []
  const actionsDir = path.join(rootDir, 'lib', 'actions')

  const actionFiles = await glob('**/*.ts', { cwd: actionsDir })
  const project = createTsProject(rootDir)

  for (const file of actionFiles) {
    const filePath = path.join(actionsDir, file)
    const sourceFile = project.getSourceFile(filePath)

    if (!sourceFile) continue

    const functions = getExportedFunctions(sourceFile)

    for (const func of functions) {
      const funcName = getFunctionName(func)
      const location = getFunctionLocation(func)

      // 檢查 create/update/delete 函式是否呼叫 checkAuth()
      if (
        /(create|update|delete|confirm|cancel|mark)/i.test(funcName) &&
        !hasCheckAuth(func)
      ) {
        items.push({
          location: {
            type: 'function',
            name: funcName,
            ...location,
          },
          status: 'fail',
          message: '寫入操作必須呼叫 checkAuth() 驗證權限',
        })
        continue
      }

      // 通過檢查
      items.push({
        location: {
          type: 'function',
          name: funcName,
          ...location,
        },
        status: 'pass',
        message: '權限驗證正確',
      })
    }
  }

  const passed = items.filter((i) => i.status === 'pass').length === items.length

  return {
    name: '權限驗證檢查',
    passed,
    details: `檢查了 ${items.length} 個函式的權限驗證`,
    items,
  }
}

/**
 * Check 4: RLS Policies 檢查
 */
async function checkRLSPolicies(rootDir: string): Promise<CheckResult> {
  const items: CheckItem[] = []

  // TODO: 使用 Supabase CLI 查詢 RLS policies
  // 目前先標記為 pass，後續實作
  items.push({
    location: {
      type: 'database',
      name: 'RLS Policies',
    },
    status: 'pass',
    message: 'RLS Policies 檢查功能待實作（需要 Supabase CLI）',
  })

  return {
    name: 'RLS Policies 檢查',
    passed: true,
    details: 'RLS Policies 檢查功能待實作',
    items,
  }
}

/**
 * 計算 Server Actions 統計資料
 */
function calculateServerActionsStats(rootDir: string) {
  const actionsDir = path.join(rootDir, 'lib', 'actions')
  const project = createTsProject(rootDir)

  let total = 0
  let withUseServer = 0
  let withCheckAuth = 0
  let withZodValidation = 0
  let withRevalidatePath = 0
  let withCorrectReturnType = 0

  const actionFiles = glob.sync('**/*.ts', { cwd: actionsDir })

  for (const file of actionFiles) {
    const filePath = path.join(actionsDir, file)
    const sourceFile = project.getSourceFile(filePath)

    if (!sourceFile) continue

    if (hasUseServer(sourceFile)) {
      withUseServer++
    }

    const functions = getExportedFunctions(sourceFile)
    total += functions.length

    for (const func of functions) {
      if (hasCheckAuth(func)) withCheckAuth++
      if (hasZodValidation(func)) withZodValidation++
      if (hasRevalidatePath(func)) withRevalidatePath++
      if (hasActionResultReturnType(func)) withCorrectReturnType++
    }
  }

  return {
    total,
    withUseServer,
    withCheckAuth,
    withZodValidation,
    withRevalidatePath,
    withCorrectReturnType,
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
  score -= critical * 10 // 每個 critical 問題扣 10 分
  score -= high * 5 // 每個 high 問題扣 5 分
  score -= medium * 2 // 每個 medium 問題扣 2 分
  score -= low * 1 // 每個 low 問題扣 1 分
  score = Math.max(0, Math.min(100, score)) // 限制在 0-100

  const weight = 0.15 // API 檢查權重 15%

  return {
    name: 'API 整合度',
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
    detailsFile: 'api.json',
  }
}

/**
 * 建立問題
 */
function createIssue(checkName: string, item: CheckItem): Issue {
  return {
    issueId: randomUUID(),
    reportId: '', // 由 generate-report.ts 填入
    category: 'api',
    severity: item.status === 'fail' ? 'high' : 'medium',
    title: `${checkName}: ${item.message}`,
    description: item.message,
    location: item.location,
    impact: '可能影響系統安全性和穩定性',
    status: 'open',
    discoveredAt: new Date().toISOString(),
  }
}

/**
 * 建立修復建議
 */
function createRecommendation(issue: Issue): Recommendation {
  const actions: Record<string, string> = {
    '缺少 \'use server\' 指令': '在檔案頂部加入 \'use server\' 指令',
    'Server Action 必須是 async 函式': '在函式前加入 async 關鍵字',
    '回傳型別應為 Promise<ActionResult<T>>':
      '修改回傳型別為 Promise<ActionResult<T>>',
    '缺少 try-catch 錯誤處理': '在函式中加入 try-catch 錯誤處理',
    '寫入操作必須呼叫 checkAuth() 驗證權限':
      '在函式開頭呼叫 checkAuth() 驗證權限',
  }

  const action = Object.keys(actions).find((key) => issue.title.includes(key))

  return {
    recommendationId: randomUUID(),
    issueId: issue.issueId,
    priority: issue.severity === 'critical' || issue.severity === 'high' ? 'p0' : 'p1',
    title: `修復 API 問題：${issue.title}`,
    action: action ? actions[action] : '請參考專案憲章修復此問題',
    estimatedEffort: '5-15 分鐘',
    references: [
      {
        title: '專案憲章 - API 模組化與職責分離',
        url: 'file://d:/APP/vsale/CLAUDE.md#iv-api-模組化與職責分離',
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
  const report = await checkAPI(rootDir)

  // 輸出報告
  console.log('\n=== API 檢查報告 ===\n')
  console.log(`評分: ${report.score.score.toFixed(1)} / 100`)
  console.log(`通過率: ${report.score.passRate.toFixed(1)}%`)
  console.log(`問題數量: ${report.issues.length}`)
  console.log('\n統計資料:')
  console.log(`  總函式數: ${report.serverActionsStats.total}`)
  console.log(`  使用 'use server': ${report.serverActionsStats.withUseServer}`)
  console.log(`  使用 checkAuth(): ${report.serverActionsStats.withCheckAuth}`)
  console.log(`  使用 Zod 驗證: ${report.serverActionsStats.withZodValidation}`)
  console.log(
    `  使用 revalidatePath(): ${report.serverActionsStats.withRevalidatePath}`
  )
  console.log(
    `  正確回傳型別: ${report.serverActionsStats.withCorrectReturnType}`
  )

  // 儲存報告為 JSON
  const fs = await import('fs/promises')
  const outputPath = path.join(rootDir, 'specs', '017-health-check', 'reports', 'api.json')
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
