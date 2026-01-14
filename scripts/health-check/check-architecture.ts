/**
 * 架構健康度檢查腳本
 *
 * 檢查專案的架構合規性，包含：
 * - 路由結構檢查（路由群組隔離、middleware 權限控制）
 * - Server Actions 模式檢查（'use server'、checkAuth()、Zod 驗證、revalidatePath()）
 * - Supabase Client 使用檢查（Server/Client 分離、使用場景正確）
 * - 模組依賴檢查（無循環依賴、職責清晰）
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import {
  createTsProject,
  hasUseServer,
  hasCheckAuth,
  hasZodValidation,
  hasRevalidatePath,
  hasActionResultReturnType,
  getExportedFunctions,
  getImports,
  hasImportFrom,
  getFunctionName,
  getFunctionLocation,
  hasTryCatch,
  isAsyncFunction,
} from './utils/ts-ast-helpers'
import type {
  ArchitectureReport,
  CheckResult,
  CheckItem,
  Issue,
  Recommendation,
  DomainScore,
  IssueLocation,
} from './types'

/**
 * 執行架構健康度檢查
 */
export async function checkArchitecture(
  rootDir: string,
  outputDir: string
): Promise<ArchitectureReport> {
  const timestamp = new Date().toISOString()

  console.log('🏗️  開始架構健康度檢查...')

  // 執行各項檢查
  const routeStructureResult = checkRouteStructure(rootDir)
  const middlewareResult = checkMiddleware(rootDir)
  const serverActionsResult = checkServerActionsPattern(rootDir)
  const supabaseClientResult = checkSupabaseClientUsage(rootDir)
  const moduleDependenciesResult = checkModuleDependencies(rootDir)

  // 收集所有檢查項目
  const allItems: CheckItem[] = [
    ...routeStructureResult.items,
    ...middlewareResult.items,
    ...serverActionsResult.items,
    ...supabaseClientResult.items,
    ...moduleDependenciesResult.items,
  ]

  // 計算評分
  const totalItems = allItems.length
  const passedItems = allItems.filter((item) => item.status === 'pass').length
  const failedItems = allItems.filter((item) => item.status === 'fail').length
  const passRate = totalItems > 0 ? (passedItems / totalItems) * 100 : 0
  const score = Math.round(passRate)

  // 產生問題清單
  const issues: Issue[] = []
  const recommendations: Recommendation[] = []

  allItems
    .filter((item) => item.status === 'fail')
    .forEach((item, index) => {
      const issueId = `arch-${Date.now()}-${index}`
      const issue: Issue = {
        issueId,
        reportId: timestamp,
        category: 'architecture',
        severity: determineSeverity(item),
        title: item.message,
        description: item.message,
        location: item.location,
        impact: '影響架構合規性與可維護性',
        status: 'open',
        discoveredAt: timestamp,
      }

      const recommendation: Recommendation = {
        recommendationId: `rec-${issueId}`,
        issueId,
        priority: determinePriority(item),
        title: `修復架構問題: ${item.message}`,
        action: generateFixAction(item),
        estimatedEffort: '1-2 小時',
        references: [
          {
            title: '專案憲章',
            url: 'd:\\APP\\vsale\\CLAUDE.md',
            type: 'documentation',
          },
        ],
        status: 'pending',
        createdAt: timestamp,
      }

      issues.push(issue)
      recommendations.push(recommendation)
    })

  // 計算領域評分
  const domainScore: DomainScore = {
    name: '架構健康度',
    score,
    weight: 0.15,
    weightedScore: score * 0.15,
    checksTotal: totalItems,
    checksPassed: passedItems,
    checksFailed: failedItems,
    passRate,
    issueCount: {
      critical: issues.filter((i) => i.severity === 'critical').length,
      high: issues.filter((i) => i.severity === 'high').length,
      medium: issues.filter((i) => i.severity === 'medium').length,
      low: issues.filter((i) => i.severity === 'low').length,
    },
    detailsFile: 'architecture.json',
  }

  const report: ArchitectureReport = {
    domain: 'architecture',
    timestamp,
    score: domainScore,
    checks: {
      routeStructure: routeStructureResult,
      serverActions: serverActionsResult,
      supabaseClientUsage: supabaseClientResult,
      moduleDependencies: moduleDependenciesResult,
    },
    issues,
    recommendations,
  }

  // 儲存報告
  const reportPath = path.join(outputDir, 'architecture.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')

  console.log(`✅ 架構健康度檢查完成 (評分: ${score}/100)`)
  console.log(`📄 報告已儲存: ${reportPath}`)

  return report
}

/**
 * Check 1: 路由結構檢查
 */
function checkRouteStructure(rootDir: string): CheckResult {
  const items: CheckItem[] = []
  const appDir = path.join(rootDir, 'app')

  // 檢查路由群組是否存在
  const routeGroups = ['(auth)', '(shop)', '(admin)']
  routeGroups.forEach((group) => {
    const groupPath = path.join(appDir, group)
    const exists = fs.existsSync(groupPath)

    items.push({
      location: {
        type: 'route',
        route: group,
        filePath: groupPath,
      },
      status: exists ? 'pass' : 'fail',
      message: exists
        ? `路由群組 ${group} 存在`
        : `缺少路由群組 ${group}`,
    })
  })

  // 檢查 middleware.ts 是否存在
  const middlewarePath = path.join(rootDir, 'middleware.ts')
  const middlewareExists = fs.existsSync(middlewarePath)

  items.push({
    location: {
      type: 'file',
      filePath: middlewarePath,
    },
    status: middlewareExists ? 'pass' : 'fail',
    message: middlewareExists
      ? 'middleware.ts 存在'
      : '缺少 middleware.ts 檔案',
  })

  const passed = items.every((item) => item.status === 'pass')

  return {
    name: '路由結構檢查',
    passed,
    details: `檢查路由群組隔離與 middleware 權限控制 (${items.filter((i) => i.status === 'pass').length}/${items.length} 通過)`,
    items,
  }
}

/**
 * Check 2: Middleware 權限檢查
 */
function checkMiddleware(rootDir: string): CheckResult {
  const items: CheckItem[] = []
  const middlewarePath = path.join(rootDir, 'middleware.ts')

  if (!fs.existsSync(middlewarePath)) {
    items.push({
      location: {
        type: 'file',
        filePath: middlewarePath,
      },
      status: 'fail',
      message: 'middleware.ts 檔案不存在',
    })

    return {
      name: 'Middleware 權限檢查',
      passed: false,
      details: 'middleware.ts 檔案不存在',
      items,
    }
  }

  const content = fs.readFileSync(middlewarePath, 'utf-8')

  // 檢查是否包含路由保護邏輯
  const hasAdminRoute = /\/admin/.test(content)
  const hasShopRoute = /\/store/.test(content)
  const hasAuthCheck = /role\s*===?\s*['"]admin['"]/.test(content)

  items.push({
    location: {
      type: 'file',
      filePath: middlewarePath,
    },
    status: hasAdminRoute ? 'pass' : 'fail',
    message: hasAdminRoute
      ? 'Middleware 包含 /admin 路由保護'
      : 'Middleware 缺少 /admin 路由保護',
  })

  items.push({
    location: {
      type: 'file',
      filePath: middlewarePath,
    },
    status: hasShopRoute ? 'pass' : 'fail',
    message: hasShopRoute
      ? 'Middleware 包含 /store 路由保護'
      : 'Middleware 缺少 /store 路由保護',
  })

  items.push({
    location: {
      type: 'file',
      filePath: middlewarePath,
    },
    status: hasAuthCheck ? 'pass' : 'fail',
    message: hasAuthCheck
      ? 'Middleware 包含角色檢查邏輯'
      : 'Middleware 缺少角色檢查邏輯',
  })

  const passed = items.every((item) => item.status === 'pass')

  return {
    name: 'Middleware 權限檢查',
    passed,
    details: `檢查 middleware.ts 權限控制邏輯 (${items.filter((i) => i.status === 'pass').length}/${items.length} 通過)`,
    items,
  }
}

/**
 * Check 3: Server Actions 模式檢查
 */
function checkServerActionsPattern(rootDir: string): CheckResult {
  const items: CheckItem[] = []
  const actionsDir = path.join(rootDir, 'lib', 'actions')

  // 找出所有 Server Actions 檔案
  const actionFiles = glob.sync('**/*.ts', {
    cwd: actionsDir,
    absolute: true,
    ignore: ['**/*.test.ts', '**/*.spec.ts'],
  })

  const project = createTsProject(rootDir)

  actionFiles.forEach((filePath) => {
    const sourceFile = project.getSourceFile(filePath)
    if (!sourceFile) return

    // 檢查是否包含 'use server' 指令
    const hasUseServerDirective = hasUseServer(sourceFile)

    items.push({
      location: {
        type: 'file',
        filePath,
      },
      status: hasUseServerDirective ? 'pass' : 'fail',
      message: hasUseServerDirective
        ? `${path.basename(filePath)} 包含 'use server' 指令`
        : `${path.basename(filePath)} 缺少 'use server' 指令`,
    })

    // 檢查每個匯出函式
    const functions = getExportedFunctions(sourceFile)

    functions.forEach((func) => {
      const funcName = getFunctionName(func)
      const funcLocation = getFunctionLocation(func)

      // 檢查是否為 create/update/delete 函式（需要 checkAuth）
      const needsAuth = /^(create|update|delete|remove)/.test(funcName)

      if (needsAuth) {
        const hasAuth = hasCheckAuth(func)
        items.push({
          location: {
            type: 'function',
            filePath: funcLocation.filePath,
            lineStart: funcLocation.lineStart,
            lineEnd: funcLocation.lineEnd,
            name: funcName,
          },
          status: hasAuth ? 'pass' : 'fail',
          message: hasAuth
            ? `${funcName}() 包含 checkAuth() 呼叫`
            : `${funcName}() 缺少 checkAuth() 呼叫`,
        })
      }

      // 檢查是否使用 Zod 驗證
      const hasValidation = hasZodValidation(func)
      items.push({
        location: {
          type: 'function',
          filePath: funcLocation.filePath,
          lineStart: funcLocation.lineStart,
          lineEnd: funcLocation.lineEnd,
          name: funcName,
        },
        status: hasValidation ? 'pass' : 'warning',
        message: hasValidation
          ? `${funcName}() 使用 Zod 驗證`
          : `${funcName}() 建議使用 Zod 驗證輸入`,
      })

      // 檢查回傳型別是否為 ActionResult<T>
      const hasCorrectReturnType = hasActionResultReturnType(func)
      items.push({
        location: {
          type: 'function',
          filePath: funcLocation.filePath,
          lineStart: funcLocation.lineStart,
          lineEnd: funcLocation.lineEnd,
          name: funcName,
        },
        status: hasCorrectReturnType ? 'pass' : 'fail',
        message: hasCorrectReturnType
          ? `${funcName}() 回傳型別為 ActionResult<T>`
          : `${funcName}() 回傳型別應為 ActionResult<T>`,
      })
    })
  })

  const passed = items.filter((i) => i.status === 'fail').length === 0

  return {
    name: 'Server Actions 模式檢查',
    passed,
    details: `檢查 Server Actions 必要步驟 (${items.filter((i) => i.status === 'pass').length}/${items.length} 通過)`,
    items,
  }
}

/**
 * Check 4: Supabase Client 使用檢查
 */
function checkSupabaseClientUsage(rootDir: string): CheckResult {
  const items: CheckItem[] = []

  // 檢查 lib/supabase/server.ts 和 client.ts 是否存在
  const serverPath = path.join(rootDir, 'lib', 'supabase', 'server.ts')
  const clientPath = path.join(rootDir, 'lib', 'supabase', 'client.ts')

  const serverExists = fs.existsSync(serverPath)
  const clientExists = fs.existsSync(clientPath)

  items.push({
    location: {
      type: 'file',
      filePath: serverPath,
    },
    status: serverExists ? 'pass' : 'fail',
    message: serverExists
      ? 'lib/supabase/server.ts 存在'
      : '缺少 lib/supabase/server.ts 檔案',
  })

  items.push({
    location: {
      type: 'file',
      filePath: clientPath,
    },
    status: clientExists ? 'pass' : 'fail',
    message: clientExists
      ? 'lib/supabase/client.ts 存在'
      : '缺少 lib/supabase/client.ts 檔案',
  })

  // 檢查 Server Actions 是否使用 lib/supabase/server.ts
  const actionsDir = path.join(rootDir, 'lib', 'actions')
  const actionFiles = glob.sync('**/*.ts', {
    cwd: actionsDir,
    absolute: true,
    ignore: ['**/*.test.ts', '**/*.spec.ts'],
  })

  const project = createTsProject(rootDir)

  actionFiles.forEach((filePath) => {
    const sourceFile = project.getSourceFile(filePath)
    if (!sourceFile) return

    const hasServerImport = hasImportFrom(sourceFile, 'lib/supabase/server')
    const hasClientImport = hasImportFrom(sourceFile, 'lib/supabase/client')

    items.push({
      location: {
        type: 'file',
        filePath,
      },
      status: hasServerImport && !hasClientImport ? 'pass' : 'fail',
      message:
        hasServerImport && !hasClientImport
          ? `${path.basename(filePath)} 正確使用 lib/supabase/server`
          : hasClientImport
            ? `${path.basename(filePath)} 不應使用 lib/supabase/client（應使用 lib/supabase/server）`
            : `${path.basename(filePath)} 缺少 Supabase import`,
    })
  })

  const passed = items.filter((i) => i.status === 'fail').length === 0

  return {
    name: 'Supabase Client 使用檢查',
    passed,
    details: `檢查 Supabase Client 使用是否正確分離 (${items.filter((i) => i.status === 'pass').length}/${items.length} 通過)`,
    items,
  }
}

/**
 * Check 5: 模組依賴檢查
 */
function checkModuleDependencies(rootDir: string): CheckResult {
  const items: CheckItem[] = []

  // 簡化版：僅檢查 lib/actions 與 lib/validations 的依賴關係
  const actionsDir = path.join(rootDir, 'lib', 'actions')
  const validationsDir = path.join(rootDir, 'lib', 'validations')

  const project = createTsProject(rootDir)

  const actionFiles = glob.sync('**/*.ts', {
    cwd: actionsDir,
    absolute: true,
    ignore: ['**/*.test.ts', '**/*.spec.ts', '**/helpers.ts'],
  })

  actionFiles.forEach((filePath) => {
    const sourceFile = project.getSourceFile(filePath)
    if (!sourceFile) return

    // 檢查是否匯入 validations
    const imports = getImports(sourceFile)
    const hasValidationImport = imports.some((imp) =>
      imp.from.includes('lib/validations')
    )

    items.push({
      location: {
        type: 'file',
        filePath,
      },
      status: hasValidationImport ? 'pass' : 'warning',
      message: hasValidationImport
        ? `${path.basename(filePath)} 正確使用 lib/validations`
        : `${path.basename(filePath)} 建議使用 lib/validations 驗證輸入`,
    })
  })

  // 檢查循環依賴（簡化版）
  // TODO: 實作完整的循環依賴檢測（使用 DFS 演算法）

  const passed = items.filter((i) => i.status === 'fail').length === 0

  return {
    name: '模組依賴檢查',
    passed,
    details: `檢查模組依賴關係 (${items.filter((i) => i.status === 'pass').length}/${items.length} 通過)`,
    items,
  }
}

/**
 * 決定問題的嚴重程度
 */
function determineSeverity(item: CheckItem): 'critical' | 'high' | 'medium' | 'low' {
  // 缺少 'use server' 或 checkAuth() 為 high
  if (
    item.message.includes("缺少 'use server'") ||
    item.message.includes('缺少 checkAuth()')
  ) {
    return 'high'
  }

  // 缺少路由群組或 middleware 為 critical
  if (
    item.message.includes('缺少路由群組') ||
    item.message.includes('缺少 middleware.ts')
  ) {
    return 'critical'
  }

  // 缺少 Supabase Client 分離為 high
  if (item.message.includes('不應使用 lib/supabase/client')) {
    return 'high'
  }

  // 其他為 medium
  return 'medium'
}

/**
 * 決定修復建議的優先級
 */
function determinePriority(item: CheckItem): 'p0' | 'p1' | 'p2' {
  const severity = determineSeverity(item)

  if (severity === 'critical') return 'p0'
  if (severity === 'high') return 'p1'
  return 'p2'
}

/**
 * 產生修復建議
 */
function generateFixAction(item: CheckItem): string {
  if (item.message.includes("缺少 'use server'")) {
    return "在檔案開頭加入 'use server' 指令"
  }

  if (item.message.includes('缺少 checkAuth()')) {
    return "在函式開頭呼叫 checkAuth('admin') 或 checkAuth('client')"
  }

  if (item.message.includes('缺少路由群組')) {
    return '建立對應的路由群組目錄'
  }

  if (item.message.includes('缺少 middleware.ts')) {
    return '建立 middleware.ts 檔案並實作路由保護邏輯'
  }

  if (item.message.includes('不應使用 lib/supabase/client')) {
    return '將 import 改為 lib/supabase/server'
  }

  return '請依照專案憲章修正'
}

/**
 * 主執行腳本
 */
async function main() {
  const rootDir = path.resolve(__dirname, '../..')
  const outputDir = path.join(rootDir, 'specs/017-health-check/reports')

  // 確保輸出目錄存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const report = await checkArchitecture(rootDir, outputDir)

  console.log('\n📊 架構健康度檢查結果:')
  console.log(`  評分: ${report.score.score}/100`)
  console.log(`  通過率: ${report.score.passRate.toFixed(1)}%`)
  console.log(`  問題數量: ${report.issues.length}`)
  console.log(
    `    - Critical: ${report.score.issueCount.critical}`
  )
  console.log(`    - High: ${report.score.issueCount.high}`)
  console.log(`    - Medium: ${report.score.issueCount.medium}`)
  console.log(`    - Low: ${report.score.issueCount.low}`)

  process.exit(report.issues.length > 0 ? 1 : 0)
}

// 執行主腳本
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ 架構檢查失敗:', error)
    process.exit(1)
  })
}
