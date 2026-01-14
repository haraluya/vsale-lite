/**
 * 資料庫安全與 Migration 檢查
 *
 * 檢查專案的資料庫安全設定、Migration 品質、備份策略等
 */

import path from 'path'
import type {
  SecurityReport,
  CheckResult,
  Issue,
  Recommendation,
  DomainScore,
} from './types'

/**
 * 執行安全檢查
 */
export async function checkSecurity(rootDir: string): Promise<SecurityReport> {
  const timestamp = new Date().toISOString()

  console.log('🔍 執行安全檢查...')

  // 執行各項檢查
  const rlsCheck = await checkRLSCoverage(rootDir)
  const migrationCheck = await checkMigrationQuality(rootDir)
  const backupCheck = await checkBackupSystem(rootDir)
  const indexCheck = await checkDatabaseIndexes(rootDir)

  const checks = {
    rlsCoverage: rlsCheck,
    migrationQuality: migrationCheck,
    backupSystem: backupCheck,
    databaseIndexes: indexCheck,
  }

  // 收集所有問題
  const issues: Issue[] = []
  const recommendations: Recommendation[] = []

  // 從各項檢查中提取問題和建議
  Object.values(checks).forEach((check) => {
    check.items.forEach((item) => {
      if (item.status === 'fail') {
        issues.push({
          id: `sec-${issues.length + 1}`,
          severity: item.severity || 'high',
          category: 'security',
          title: item.message,
          description: item.details || '',
          location: item.location,
          recommendation: `請參考 ${check.name} 的修復建議`,
          references: [],
        })
      }
    })
  })

  // 計算安全統計
  const stats = calculateSecurityStats(checks)

  // 計算評分
  const score = calculateDomainScore([
    checks.rlsCoverage,
    checks.migrationQuality,
    checks.backupSystem,
    checks.databaseIndexes,
  ])

  return {
    domain: 'security',
    timestamp,
    score,
    checks,
    stats,
    issues,
    recommendations,
  }
}

/**
 * 檢查 RLS Policies 完整性
 *
 * 驗證所有資料表都啟用 RLS 並設定適當的 Policy
 */
async function checkRLSCoverage(rootDir: string): Promise<CheckResult> {
  console.log('  檢查 RLS Policies 覆蓋率...')

  const fs = await import('fs/promises')
  const glob = (await import('glob')).glob

  // 讀取 Migration 檔案
  const migrationFiles = await glob('supabase/migrations/**/*.sql', { cwd: rootDir })

  const tables: string[] = []
  const rlsEnabledTables: string[] = []
  const tablesWithPolicies: string[] = []

  for (const file of migrationFiles) {
    const filePath = path.join(rootDir, file)
    const content = await fs.readFile(filePath, 'utf-8')

    // 提取資料表名稱
    const createTableMatches = content.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/gi)
    for (const match of createTableMatches) {
      const tableName = match[1]
      if (!tables.includes(tableName)) {
        tables.push(tableName)
      }
    }

    // 檢查 RLS 啟用
    const rlsMatches = content.matchAll(/ALTER TABLE\s+(\w+)\s+ENABLE ROW LEVEL SECURITY/gi)
    for (const match of rlsMatches) {
      const tableName = match[1]
      if (!rlsEnabledTables.includes(tableName)) {
        rlsEnabledTables.push(tableName)
      }
    }

    // 檢查 Policy 設定
    const policyMatches = content.matchAll(/CREATE POLICY\s+.*?\s+ON\s+(\w+)/gi)
    for (const match of policyMatches) {
      const tableName = match[1]
      if (!tablesWithPolicies.includes(tableName)) {
        tablesWithPolicies.push(tableName)
      }
    }
  }

  const items: CheckResult['items'] = []

  // 檢查未啟用 RLS 的資料表
  const tablesWithoutRLS = tables.filter((t) => !rlsEnabledTables.includes(t))
  if (tablesWithoutRLS.length > 0) {
    items.push({
      location: { type: 'file' as const, file: 'supabase/migrations/' },
      status: 'fail' as const,
      message: `${tablesWithoutRLS.length} 個資料表未啟用 RLS`,
      details: `未啟用 RLS 的資料表: ${tablesWithoutRLS.join(', ')}`,
      severity: 'high' as const,
    })
  }

  // 檢查未設定 Policy 的資料表
  const tablesWithoutPolicies = tables.filter((t) => !tablesWithPolicies.includes(t))
  if (tablesWithoutPolicies.length > 0) {
    items.push({
      location: { type: 'file' as const, file: 'supabase/migrations/' },
      status: 'warn' as const,
      message: `${tablesWithoutPolicies.length} 個資料表未設定 Policy`,
      details: `未設定 Policy 的資料表: ${tablesWithoutPolicies.join(', ')}`,
      severity: 'medium' as const,
    })
  }

  const passed = tablesWithoutRLS.length === 0

  return {
    name: 'RLS Policies 檢查',
    passed,
    details: `檢查 ${tables.length} 個資料表，${rlsEnabledTables.length} 個已啟用 RLS，${tablesWithPolicies.length} 個已設定 Policy`,
    items,
  }
}

/**
 * 檢查 Migration 品質
 *
 * 驗證 Migration 檔案是否符合最佳實踐
 */
async function checkMigrationQuality(rootDir: string): Promise<CheckResult> {
  console.log('  檢查 Migration 品質...')

  const fs = await import('fs/promises')
  const glob = (await import('glob')).glob

  const migrationFiles = await glob('supabase/migrations/**/*.sql', { cwd: rootDir })

  const items: CheckResult['items'] = []

  // 檢查危險操作（DROP TABLE, TRUNCATE）
  for (const file of migrationFiles) {
    const filePath = path.join(rootDir, file)
    const content = await fs.readFile(filePath, 'utf-8')

    // 檢查 DROP TABLE
    if (content.match(/DROP TABLE/i)) {
      items.push({
        location: { type: 'file' as const, file },
        status: 'fail' as const,
        message: 'Migration 包含 DROP TABLE 操作',
        details: 'DROP TABLE 是破壞性操作，建議使用 ALTER TABLE RENAME 代替',
        severity: 'critical' as const,
      })
    }

    // 檢查 TRUNCATE
    if (content.match(/TRUNCATE/i)) {
      items.push({
        location: { type: 'file' as const, file },
        status: 'fail' as const,
        message: 'Migration 包含 TRUNCATE 操作',
        details: 'TRUNCATE 會清空資料，確保這是有意為之',
        severity: 'high' as const,
      })
    }

    // 檢查是否有 COMMENT
    const hasComment = content.match(/COMMENT ON/i)
    if (!hasComment && content.length > 200) {
      items.push({
        location: { type: 'file' as const, file },
        status: 'warn' as const,
        message: 'Migration 缺少 COMMENT 註解',
        details: '建議為資料表、欄位添加 COMMENT 以提升可維護性',
        severity: 'low' as const,
      })
    }

    // 檢查是否有備份提示
    const hasBackupReminder = content.match(/-- BACKUP REQUIRED/i)
    if ((content.match(/ALTER TABLE.*DROP COLUMN/i) || content.match(/DROP TABLE/i)) && !hasBackupReminder) {
      items.push({
        location: { type: 'file' as const, file },
        status: 'warn' as const,
        message: 'Migration 包含破壞性操作但未標註備份提醒',
        details: '建議在 Migration 檔案開頭加上 -- BACKUP REQUIRED 提醒',
        severity: 'medium' as const,
      })
    }
  }

  const passed = items.filter((i) => i.status === 'fail').length === 0

  return {
    name: 'Migration 品質檢查',
    passed,
    details: `檢查 ${migrationFiles.length} 個 Migration 檔案`,
    items,
  }
}

/**
 * 檢查備份系統
 *
 * 驗證專案是否有完善的備份策略
 */
async function checkBackupSystem(rootDir: string): Promise<CheckResult> {
  console.log('  檢查備份系統...')

  const fs = await import('fs/promises')

  const items: CheckResult['items'] = []

  // 檢查是否有備份相關檔案
  const backupDocsExist = await fs
    .access(path.join(rootDir, 'docs', 'BACKUP_RESTORE_CHEATSHEET.md'))
    .then(() => true)
    .catch(() => false)

  if (backupDocsExist) {
    items.push({
      location: { type: 'file' as const, file: 'docs/BACKUP_RESTORE_CHEATSHEET.md' },
      status: 'pass' as const,
      message: '備份文件存在',
      severity: 'low' as const,
    })
  } else {
    items.push({
      location: { type: 'file' as const, file: 'docs/' },
      status: 'warn' as const,
      message: '缺少備份文件',
      details: '建議建立 BACKUP_RESTORE_CHEATSHEET.md 文件說明備份流程',
      severity: 'medium' as const,
    })
  }

  // 檢查是否有備份 Server Action
  const backupActionExists = await fs
    .access(path.join(rootDir, 'lib', 'actions', 'backup.ts'))
    .then(() => true)
    .catch(() => false)

  if (backupActionExists) {
    items.push({
      location: { type: 'file' as const, file: 'lib/actions/backup.ts' },
      status: 'pass' as const,
      message: '備份 Server Action 已實作',
      severity: 'low' as const,
    })
  } else {
    items.push({
      location: { type: 'file' as const, file: 'lib/actions/' },
      status: 'warn' as const,
      message: '缺少備份 Server Action',
      details: '建議實作自動化備份功能',
      severity: 'medium' as const,
    })
  }

  // 檢查 .gitignore 是否排除備份檔案
  const gitignoreExists = await fs
    .access(path.join(rootDir, '.gitignore'))
    .then(() => true)
    .catch(() => false)

  if (gitignoreExists) {
    const gitignoreContent = await fs.readFile(path.join(rootDir, '.gitignore'), 'utf-8')
    if (gitignoreContent.includes('*.sql') || gitignoreContent.includes('backups/')) {
      items.push({
        location: { type: 'file' as const, file: '.gitignore' },
        status: 'pass' as const,
        message: '.gitignore 已排除備份檔案',
        severity: 'low' as const,
      })
    } else {
      items.push({
        location: { type: 'file' as const, file: '.gitignore' },
        status: 'warn' as const,
        message: '.gitignore 未排除備份檔案',
        details: '建議在 .gitignore 加入 *.sql 和 backups/ 規則',
        severity: 'low' as const,
      })
    }
  }

  const passed = items.filter((i) => i.status === 'fail').length === 0

  return {
    name: '備份系統檢查',
    passed,
    details: '檢查備份系統完整性',
    items,
  }
}

/**
 * 檢查資料庫索引
 *
 * 驗證是否為關鍵查詢欄位建立索引
 */
async function checkDatabaseIndexes(rootDir: string): Promise<CheckResult> {
  console.log('  檢查資料庫索引...')

  const fs = await import('fs/promises')
  const glob = (await import('glob')).glob

  const migrationFiles = await glob('supabase/migrations/**/*.sql', { cwd: rootDir })

  const indexes: string[] = []

  for (const file of migrationFiles) {
    const filePath = path.join(rootDir, file)
    const content = await fs.readFile(filePath, 'utf-8')

    // 提取索引
    const indexMatches = content.matchAll(/CREATE (?:UNIQUE )?INDEX\s+(\w+)/gi)
    for (const match of indexMatches) {
      indexes.push(match[1])
    }
  }

  const items: CheckResult['items'] = [
    {
      location: { type: 'file' as const, file: 'supabase/migrations/' },
      status: 'pass' as const,
      message: `已建立 ${indexes.length} 個索引`,
      details: '索引可加速查詢效能，建議為常用查詢欄位（如外鍵、狀態欄位、時間戳等）建立索引',
      severity: 'low' as const,
    },
  ]

  // 建議檢查的常見索引
  const recommendedIndexes = [
    'profiles.user_id',
    'products.category_id',
    'products.series_id',
    'tier_prices.tier_id',
    'tier_prices.product_id',
    'orders.user_id',
    'orders.status',
    'order_items.order_id',
    'order_items.product_id',
  ]

  items.push({
    location: { type: 'file' as const, file: 'supabase/migrations/' },
    status: 'info' as const,
    message: '建議檢查以下欄位是否需要索引',
    details: recommendedIndexes.join(', '),
    severity: 'low' as const,
  })

  return {
    name: '資料庫索引檢查',
    passed: true,
    details: `已建立 ${indexes.length} 個索引`,
    items,
  }
}

/**
 * 計算安全統計
 */
function calculateSecurityStats(checks: Record<string, CheckResult>) {
  return {
    rlsCoverage: '待計算',
    migrationsCount: '待計算',
    backupSystemEnabled: '待計算',
    indexesCount: '待計算',
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

  // 安全檢查評分
  const score = Math.round(passRate)

  const weight = 0.2 // 安全檢查權重 20%

  return {
    name: '安全性',
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
    detailsFile: 'security.json',
  }
}

/**
 * 主執行函式
 */
async function main() {
  const rootDir = process.cwd()
  const report = await checkSecurity(rootDir)

  // 輸出報告
  console.log('\n=== 安全檢查報告 ===\n')
  console.log(`評分: ${report.score.score.toFixed(1)} / 100`)
  console.log(`檢查項目: ${report.score.checksTotal}`)
  console.log(`通過項目: ${report.score.checksPassed}`)
  console.log(`失敗項目: ${report.score.checksFailed}`)
  console.log(`通過率: ${report.score.passRate.toFixed(1)}%`)

  // 輸出問題
  if (report.issues.length > 0) {
    console.log(`\n發現 ${report.issues.length} 個安全問題`)
    report.issues.slice(0, 5).forEach((issue, index) => {
      console.log(`\n${index + 1}. [${issue.severity}] ${issue.title}`)
      console.log(`   位置: ${issue.location.file || 'N/A'}`)
    })
  }

  // 儲存報告為 JSON
  const fs = await import('fs/promises')
  const outputPath = path.join(rootDir, 'specs', '017-health-check', 'reports', 'security.json')
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
