/**
 * GitHub API 輔助函式
 *
 * 使用 @octokit/rest 與 GitHub API 互動
 */

import { Octokit } from '@octokit/rest'
import type { Issue, IssueSeverity } from '../types'

/**
 * 建立 GitHub API 客戶端
 */
export function createGitHubClient(token: string): Octokit {
  return new Octokit({
    auth: token,
  })
}

/**
 * 建立 GitHub Issue
 */
export async function createIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  issue: Issue,
  milestone?: string
): Promise<void> {
  try {
    // 取得或建立 Milestone
    let milestoneNumber: number | undefined

    if (milestone) {
      milestoneNumber = await ensureMilestone(octokit, owner, repo, milestone)
    }

    // 建立 Issue
    await octokit.issues.create({
      owner,
      repo,
      title: `[${getSeverityLabel(issue.severity)}] ${issue.title}`,
      body: formatIssueBody(issue),
      labels: [
        'health-check',
        getSeverityLabel(issue.severity).toLowerCase(),
        issue.category,
      ],
      milestone: milestoneNumber,
    })

    console.log(`✅ 已建立 Issue: ${issue.title}`)
  } catch (error) {
    console.error(`❌ 建立 Issue 失敗: ${issue.title}`, error)
    throw error
  }
}

/**
 * 確保 Milestone 存在（不存在則建立）
 */
export async function ensureMilestone(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string
): Promise<number> {
  try {
    // 檢查 Milestone 是否存在
    const { data: milestones } = await octokit.issues.listMilestones({
      owner,
      repo,
      state: 'open',
    })

    const existing = milestones.find((m) => m.title === title)

    if (existing) {
      return existing.number
    }

    // 不存在，建立新 Milestone
    const { data: newMilestone } = await octokit.issues.createMilestone({
      owner,
      repo,
      title,
      description: `健康檢查系統 - ${title}`,
    })

    console.log(`✅ 已建立 Milestone: ${title}`)

    return newMilestone.number
  } catch (error) {
    console.error(`❌ 建立 Milestone 失敗: ${title}`, error)
    throw error
  }
}

/**
 * 格式化 Issue 內容（Markdown）
 */
function formatIssueBody(issue: Issue): string {
  const lines: string[] = []

  // 標題區塊
  lines.push(`### [${getSeverityLabel(issue.severity)}] ${issue.title}`)
  lines.push('')

  // 基本資訊
  lines.push(`**領域**: ${getCategoryLabel(issue.category)}`)

  if (issue.location.filePath) {
    lines.push(`**位置**: \`${issue.location.filePath}\``)

    if (issue.location.lineStart) {
      lines.push(`**行號**: ${issue.location.lineStart}${issue.location.lineEnd ? `-${issue.location.lineEnd}` : ''}`)
    }
  }

  lines.push(`**發現時間**: ${issue.discoveredAt}`)
  lines.push('')

  // 問題描述
  lines.push('#### 問題描述')
  lines.push('')
  lines.push(issue.description)
  lines.push('')

  // 影響範圍
  if (issue.impact) {
    lines.push('#### 影響範圍')
    lines.push('')
    lines.push(issue.impact)
    lines.push('')
  }

  // 修復建議
  if (issue.recommendation) {
    lines.push('#### 修復建議')
    lines.push('')
    lines.push(`**優先級**: ${getPriorityLabel(issue.recommendation.priority)}`)
    lines.push('')
    lines.push(issue.recommendation.action)
    lines.push('')
    lines.push(`**預估工作量**: ${issue.recommendation.estimatedEffort}`)
    lines.push('')

    // 範例程式碼
    if (issue.recommendation.exampleCode) {
      lines.push('**範例程式碼**:')
      lines.push('```typescript')
      lines.push(issue.recommendation.exampleCode)
      lines.push('```')
      lines.push('')
    }

    // 參考資料
    if (issue.recommendation.references.length > 0) {
      lines.push('#### 參考資料')
      lines.push('')
      issue.recommendation.references.forEach((ref) => {
        lines.push(`- [${ref.title}](${ref.url})`)
      })
      lines.push('')
    }
  }

  // 健康檢查報告資訊
  lines.push('---')
  lines.push('')
  lines.push('#### 健康檢查報告')
  lines.push('')
  lines.push(`- **報告 ID**: \`${issue.reportId}\``)
  lines.push(`- **問題 ID**: \`${issue.issueId}\``)

  return lines.join('\n')
}

/**
 * 取得嚴重程度標籤
 */
function getSeverityLabel(severity: IssueSeverity): string {
  switch (severity) {
    case 'critical':
      return 'Critical'
    case 'high':
      return 'High'
    case 'medium':
      return 'Medium'
    case 'low':
      return 'Low'
  }
}

/**
 * 取得類別標籤
 */
function getCategoryLabel(category: Issue['category']): string {
  const labels: Record<Issue['category'], string> = {
    architecture: '架構',
    api: 'API',
    ux: '使用者體驗',
    design: '設計',
    performance: '效能',
    bugs: 'Bug',
    security: '安全',
  }

  return labels[category]
}

/**
 * 取得優先級標籤
 */
function getPriorityLabel(priority: 'p0' | 'p1' | 'p2'): string {
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
 * 批次建立 GitHub Issues
 */
export async function createIssues(
  octokit: Octokit,
  owner: string,
  repo: string,
  issues: Issue[],
  milestone?: string,
  severityFilter?: IssueSeverity[]
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  // 篩選嚴重程度
  const filteredIssues = severityFilter
    ? issues.filter((issue) => severityFilter.includes(issue.severity))
    : issues

  console.log(`\n準備建立 ${filteredIssues.length} 個 GitHub Issues...`)

  for (const issue of filteredIssues) {
    try {
      await createIssue(octokit, owner, repo, issue, milestone)
      success++

      // 避免觸發 Rate Limit（每秒最多 1 個請求）
      await delay(1000)
    } catch (error) {
      failed++
    }
  }

  console.log(`\n✅ 成功: ${success} 個`)
  console.log(`❌ 失敗: ${failed} 個`)

  return { success, failed }
}

/**
 * 延遲函式（用於避免 Rate Limit）
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 從環境變數取得 GitHub Token
 */
export function getGitHubToken(): string {
  const token = process.env.GITHUB_TOKEN

  if (!token) {
    throw new Error(
      '請設定 GITHUB_TOKEN 環境變數（GitHub Personal Access Token）'
    )
  }

  return token
}

/**
 * 從 Git 遠端 URL 解析 owner 和 repo
 */
export async function parseGitHubRepo(): Promise<{
  owner: string
  repo: string
} | null> {
  try {
    const { execSync } = await import('child_process')

    // 取得遠端 URL
    const remoteUrl = execSync('git remote get-url origin', {
      encoding: 'utf-8',
    }).trim()

    // 解析 URL（支援 HTTPS 和 SSH）
    const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/)

    if (!match) {
      return null
    }

    return {
      owner: match[1],
      repo: match[2],
    }
  } catch {
    return null
  }
}
