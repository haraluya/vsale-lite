/**
 * 報告格式化工具
 *
 * 提供 Markdown 表格、清單、程式碼區塊等格式化函式
 */

import type {
  Issue,
  IssueSeverity,
  Recommendation,
  DomainScore,
} from '../types'

/**
 * 格式化 Markdown 表格
 */
export function formatMarkdownTable(
  headers: string[],
  rows: string[][]
): string {
  const lines: string[] = []

  // 表頭
  lines.push(`| ${headers.join(' | ')} |`)

  // 分隔線
  lines.push(`|${headers.map(() => '---').join('|')}|`)

  // 內容
  rows.forEach((row) => {
    lines.push(`| ${row.join(' | ')} |`)
  })

  return lines.join('\n')
}

/**
 * 格式化問題清單（依嚴重程度分組）
 */
export function formatIssueList(issues: Issue[]): string {
  const lines: string[] = []

  // 依嚴重程度分組
  const grouped: Record<IssueSeverity, Issue[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  }

  issues.forEach((issue) => {
    grouped[issue.severity].push(issue)
  })

  // 依序輸出（Critical → High → Medium → Low）
  const severities: IssueSeverity[] = ['critical', 'high', 'medium', 'low']

  severities.forEach((severity) => {
    const items = grouped[severity]
    if (items.length === 0) return

    lines.push(`\n### ${getSeverityLabel(severity)} (${items.length} 項)\n`)

    items.forEach((issue, index) => {
      lines.push(formatIssue(issue, index + 1))
      lines.push('')
    })
  })

  return lines.join('\n')
}

/**
 * 格式化單一問題
 */
export function formatIssue(issue: Issue, index: number): string {
  const lines: string[] = []

  // 標題
  lines.push(`#### ${index}. [${getSeverityEmoji(issue.severity)}] ${issue.title}`)
  lines.push('')

  // 位置
  if (issue.location.filePath) {
    const location = formatLocation(issue.location)
    lines.push(`**位置**: ${location}`)
  }

  // 描述
  if (issue.description) {
    lines.push(`**描述**: ${issue.description}`)
  }

  // 影響
  if (issue.impact) {
    lines.push(`**影響**: ${issue.impact}`)
  }

  // 修復建議
  if (issue.recommendation) {
    lines.push('')
    lines.push(formatRecommendation(issue.recommendation))
  }

  return lines.join('\n')
}

/**
 * 格式化修復建議
 */
export function formatRecommendation(rec: Recommendation): string {
  const lines: string[] = []

  lines.push(`**修復建議** (${getPriorityLabel(rec.priority)}):`)
  lines.push(rec.action)
  lines.push(`**預估工作量**: ${rec.estimatedEffort}`)

  // 範例程式碼
  if (rec.exampleCode) {
    lines.push('')
    lines.push('**範例程式碼**:')
    lines.push('```typescript')
    lines.push(rec.exampleCode)
    lines.push('```')
  }

  // 參考資料
  if (rec.references.length > 0) {
    lines.push('')
    lines.push('**參考資料**:')
    rec.references.forEach((ref) => {
      lines.push(`- [${ref.title}](${ref.url})`)
    })
  }

  return lines.join('\n')
}

/**
 * 格式化位置資訊
 */
function formatLocation(location: Issue['location']): string {
  if (location.filePath) {
    let loc = `\`${location.filePath}\``

    if (location.lineStart) {
      if (location.lineEnd && location.lineEnd !== location.lineStart) {
        loc += `:${location.lineStart}-${location.lineEnd}`
      } else {
        loc += `:${location.lineStart}`
      }
    }

    return loc
  }

  if (location.name) {
    return `\`${location.name}\``
  }

  if (location.route) {
    return `路由: \`${location.route}\``
  }

  if (location.table) {
    return `資料表: \`${location.table}\``
  }

  return '未知位置'
}

/**
 * 格式化領域評分表格
 */
export function formatDomainScoreTable(scores: Record<string, DomainScore>): string {
  const headers = ['領域', '評分', '權重', '加權評分', '狀態']
  const rows: string[][] = []

  Object.values(scores).forEach((score) => {
    rows.push([
      score.name,
      `${score.score} / 100`,
      `${Math.round(score.weight * 100)}%`,
      score.weightedScore.toFixed(2),
      getScoreStatus(score.score),
    ])
  })

  return formatMarkdownTable(headers, rows)
}

/**
 * 格式化程式碼區塊
 */
export function formatCodeBlock(code: string, language = 'typescript'): string {
  return `\`\`\`${language}\n${code}\n\`\`\``
}

/**
 * 取得嚴重程度標籤
 */
function getSeverityLabel(severity: IssueSeverity): string {
  switch (severity) {
    case 'critical':
      return '🔴 Critical'
    case 'high':
      return '🟡 High'
    case 'medium':
      return '🔵 Medium'
    case 'low':
      return '⚪ Low'
  }
}

/**
 * 取得嚴重程度表情符號
 */
function getSeverityEmoji(severity: IssueSeverity): string {
  switch (severity) {
    case 'critical':
      return '🔴 Critical'
    case 'high':
      return '🟡 High'
    case 'medium':
      return '🔵 Medium'
    case 'low':
      return '⚪ Low'
  }
}

/**
 * 取得優先級標籤
 */
function getPriorityLabel(priority: Recommendation['priority']): string {
  switch (priority) {
    case 'p0':
      return 'P0 - 必須立即修復'
    case 'p1':
      return 'P1 - 應盡快修復'
    case 'p2':
      return 'P2 - 可排程修復'
  }
}

/**
 * 取得評分狀態
 */
function getScoreStatus(score: number): string {
  if (score >= 90) return '✅ 優秀'
  if (score >= 75) return '✅ 良好'
  if (score >= 60) return '⚠️ 尚可'
  return '🔴 需改進'
}

/**
 * 格式化執行時間
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)} 秒`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  return `${minutes} 分 ${remainingSeconds} 秒`
}

/**
 * 格式化日期時間
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
