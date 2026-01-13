/**
 * 健康檢查系統 - TypeScript 型別定義
 *
 * 本檔案定義健康檢查系統的所有 TypeScript 型別。
 * 這些型別用於檢查腳本和報告產生器。
 */

// ============================================================
// Core Entities
// ============================================================

/**
 * 健康檢查報告
 */
export interface HealthCheckReport {
  // 基本資訊
  reportId: string
  timestamp: string
  branch: string
  commit: string

  // 整體評分
  overallScore: number
  previousScore?: number
  scoreChange?: number

  // 各領域評分
  scores: {
    architecture: DomainScore
    api: DomainScore
    ux: DomainScore
    design: DomainScore
    performance: DomainScore
    bugs: DomainScore
    security: DomainScore
  }

  // 問題統計
  issueCounts: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
  }

  // 問題清單
  issues: Issue[]

  // 修復建議
  recommendations: Recommendation[]

  // 執行資訊
  execution: {
    duration: number
    checksRun: number
    checksPassed: number
    checksFailed: number
  }
}

/**
 * 領域評分
 */
export interface DomainScore {
  name: string
  score: number
  weight: number
  weightedScore: number

  checksTotal: number
  checksPassed: number
  checksFailed: number
  passRate: number

  issueCount: {
    critical: number
    high: number
    medium: number
    low: number
  }

  detailsFile: string
}

/**
 * 問題
 */
export interface Issue {
  issueId: string
  reportId: string

  category: IssueCategory
  severity: IssueSeverity

  title: string
  description: string

  location: IssueLocation

  impact: string

  status: IssueStatus

  recommendation?: Recommendation

  discoveredAt: string
  fixedAt?: string
}

export type IssueCategory =
  | 'architecture'
  | 'api'
  | 'ux'
  | 'design'
  | 'performance'
  | 'bugs'
  | 'security'

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low'

export type IssueStatus = 'open' | 'fixed' | 'acknowledged' | 'wont_fix'

/**
 * 問題位置
 */
export interface IssueLocation {
  type: 'file' | 'component' | 'function' | 'route' | 'database'

  filePath?: string
  lineStart?: number
  lineEnd?: number
  columnStart?: number
  columnEnd?: number

  name?: string

  route?: string

  table?: string
  column?: string
  policy?: string

  link?: string
}

/**
 * 修復建議
 */
export interface Recommendation {
  recommendationId: string
  issueId: string

  priority: RecommendationPriority

  title: string
  action: string

  estimatedEffort: string

  references: Reference[]

  exampleCode?: string

  status: RecommendationStatus

  createdAt: string
  completedAt?: string
}

export type RecommendationPriority = 'p0' | 'p1' | 'p2'

export type RecommendationStatus =
  | 'pending'
  | 'in_progress'
  | 'done'
  | 'skipped'

/**
 * 參考資料
 */
export interface Reference {
  title: string
  url: string
  type: ReferenceType
}

export type ReferenceType =
  | 'documentation'
  | 'guide'
  | 'example'
  | 'discussion'
  | 'issue'
  | 'spec'

// ============================================================
// Domain Reports
// ============================================================

/**
 * 檢查結果
 */
export interface CheckResult {
  name: string
  passed: boolean
  details: string
  items: CheckItem[]
}

/**
 * 檢查項目
 */
export interface CheckItem {
  location: IssueLocation
  status: 'pass' | 'fail' | 'warning'
  message: string
}

/**
 * 架構檢查報告
 */
export interface ArchitectureReport {
  domain: 'architecture'
  timestamp: string
  score: DomainScore

  checks: {
    routeStructure: CheckResult
    serverActions: CheckResult
    supabaseClientUsage: CheckResult
    moduleDependencies: CheckResult
  }

  issues: Issue[]
  recommendations: Recommendation[]
}

/**
 * API 檢查報告
 */
export interface APIReport {
  domain: 'api'
  timestamp: string
  score: DomainScore

  checks: {
    serverActionsQuality: CheckResult
    errorHandling: CheckResult
    authorizationChecks: CheckResult
    rlsPolicies: CheckResult
  }

  serverActionsStats: {
    total: number
    withUseServer: number
    withCheckAuth: number
    withZodValidation: number
    withRevalidatePath: number
    withCorrectReturnType: number
  }

  issues: Issue[]
  recommendations: Recommendation[]
}

/**
 * 使用者體驗檢查報告
 */
export interface UXReport {
  domain: 'ux'
  timestamp: string
  score: DomainScore

  checks: {
    frontendFlows: CheckResult
    adminFlows: CheckResult
    errorMessages: CheckResult
    loadingStates: CheckResult
  }

  flows: {
    name: string
    steps: number
    passed: boolean
    issues: string[]
  }[]

  issues: Issue[]
  recommendations: Recommendation[]
}

/**
 * 設計系統檢查報告
 */
export interface DesignReport {
  domain: 'design'
  timestamp: string
  score: DomainScore

  checks: {
    neoBrutalism: CheckResult
    responsiveDesign: CheckResult
    designTokens: CheckResult
    dialogSystem: CheckResult
  }

  styleIssues: {
    component: string
    filePath: string
    issues: string[]
  }[]

  issues: Issue[]
  recommendations: Recommendation[]
}

/**
 * 效能檢查報告
 */
export interface PerformanceReport {
  domain: 'performance'
  timestamp: string
  score: DomainScore

  lighthouse: {
    performance: number
    accessibility: number
    bestPractices: number
    seo: number
    pwa: number

    metrics: {
      firstContentfulPaint: number
      largestContentfulPaint: number
      totalBlockingTime: number
      cumulativeLayoutShift: number
      speedIndex: number
      timeToInteractive: number
    }

    budgets: {
      name: string
      budget: number
      actual: number
      passed: boolean
    }[]
  }

  webVitals: {
    route: string
    lcp: number
    fid: number
    cls: number
    ttfb: number
    fcp: number
  }[]

  databaseQueries: {
    query: string
    p50: number
    p95: number
    p99: number
    passed: boolean
  }[]

  issues: Issue[]
  recommendations: Recommendation[]
}

/**
 * Bug 檢查報告
 */
export interface BugsReport {
  domain: 'bugs'
  timestamp: string
  score: DomainScore

  checks: {
    boundaryConditions: CheckResult
    dataConsistency: CheckResult
    concurrency: CheckResult
    errorRecovery: CheckResult
  }

  testCases: {
    name: string
    passed: boolean
    details: string
  }[]

  issues: Issue[]
  recommendations: Recommendation[]
}

/**
 * 安全性檢查報告
 */
export interface SecurityReport {
  domain: 'security'
  timestamp: string
  score: DomainScore

  checks: {
    rlsPolicies: CheckResult
    migrationQuality: CheckResult
    backupSystem: CheckResult
    indexes: CheckResult
  }

  rlsStats: {
    totalTables: number
    tablesWithRLS: number
    tablesWithoutRLS: string[]
    totalPolicies: number
  }

  migrationStats: {
    totalMigrations: number
    safeMigrations: number
    riskyMigrations: number
    riskyFiles: string[]
  }

  backupStatus: {
    automated: boolean
    lastBackup: string
    backupCount: number
    cloudStorage: boolean
  }

  issues: Issue[]
  recommendations: Recommendation[]
}

// ============================================================
// Check Scripts Input/Output
// ============================================================

/**
 * 檢查腳本選項
 */
export interface CheckOptions {
  /** 專案根目錄 */
  rootDir: string

  /** 輸出目錄 */
  outputDir: string

  /** 是否詳細輸出 */
  verbose?: boolean

  /** 是否產生 JSON 報告 */
  generateJson?: boolean

  /** 是否產生 Markdown 報告 */
  generateMarkdown?: boolean
}

/**
 * 檢查腳本結果
 */
export interface CheckScriptResult<T> {
  /** 是否成功 */
  success: boolean

  /** 領域報告 */
  report: T

  /** 錯誤訊息（如失敗） */
  error?: string

  /** 執行時間（秒） */
  duration: number
}

// ============================================================
// Utility Types
// ============================================================

/**
 * 評分等級
 */
export type ScoreGrade = 'excellent' | 'good' | 'fair' | 'poor'

/**
 * 根據評分取得等級
 */
export function getScoreGrade(score: number): ScoreGrade {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 60) return 'fair'
  return 'poor'
}

/**
 * 根據等級取得表情符號
 */
export function getScoreEmoji(score: number): string {
  const grade = getScoreGrade(score)
  switch (grade) {
    case 'excellent':
      return '✅ 優秀'
    case 'good':
      return '✅ 良好'
    case 'fair':
      return '⚠️ 尚可'
    case 'poor':
      return '🔴 需改進'
  }
}

/**
 * 根據嚴重程度取得表情符號
 */
export function getSeverityEmoji(severity: IssueSeverity): string {
  switch (severity) {
    case 'critical':
      return '🔴'
    case 'high':
      return '🟡'
    case 'medium':
      return '🔵'
    case 'low':
      return '⚪'
  }
}

/**
 * 根據優先級取得標籤
 */
export function getPriorityLabel(priority: RecommendationPriority): string {
  switch (priority) {
    case 'p0':
      return '必須立即修復'
    case 'p1':
      return '應盡快修復'
    case 'p2':
      return '可排程修復'
  }
}
