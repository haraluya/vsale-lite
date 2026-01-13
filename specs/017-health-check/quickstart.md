# Vsale-lite 健康檢查系統 - 快速上手指南

**Feature Branch**: `017-health-check`
**最後更新**: 2026-01-13
**閱讀時間**: 15 分鐘

---

## 目錄

1. [快速開始](#快速開始)
2. [完整使用流程](#完整使用流程)
3. [報告解讀](#報告解讀)
4. [常見使用場景](#常見使用場景)
5. [疑難排解](#疑難排解)
6. [最佳實踐](#最佳實踐)

---

## 快速開始

在 5 分鐘內執行第一次健康檢查並查看報告。

### 1. 安裝依賴

```bash
# 安裝健康檢查所需的 npm 套件
pnpm add -D ts-morph glob @octokit/rest
```

### 2. 執行健康檢查

```bash
# 執行完整健康檢查（所有 7 個領域）
pnpm health-check

# 或使用 tsx 直接執行
tsx scripts/health-check/run-health-check.ts
```

**執行畫面範例**：
```text
🏥 Vsale-lite 健康檢查系統
========================================

📊 檢查進度：
  ✓ 架構檢查 (Architecture)       [完成] 3.5s
  ✓ API 整合度 (API Integration)  [完成] 5.2s
  ✓ 使用者體驗 (UX)               [完成] 2.8s
  ✓ 設計系統 (Design)             [完成] 4.1s
  ✓ 效能 (Performance)            [完成] 8.5s
  ✓ Bug 檢查 (Bugs)               [完成] 6.3s
  ✓ 安全性 (Security)             [完成] 3.2s

⏱️  總執行時間: 33.6 秒

========================================
📝 報告已儲存至：
  specs/017-health-check/reports/2026-01-13-160000/

整體健康度評分: 89 / 100 ✅
========================================
```

### 3. 查看報告

```bash
# 開啟 Markdown 報告（使用 VSCode 或瀏覽器）
code specs/017-health-check/reports/latest/summary.md

# 或查看 JSON 報告
cat specs/017-health-check/reports/latest/summary.json | jq .
```

**報告檔案結構**：
```text
specs/017-health-check/reports/2026-01-13-160000/
├── summary.md                    # 綜合健康檢查報告（人類易讀）
├── summary.json                  # 綜合健康檢查報告（機器可解析）
├── architecture.json             # 架構檢查詳細報告
├── api.json                      # API 檢查詳細報告
├── ux.json                       # UX 檢查詳細報告
├── design.json                   # 設計檢查詳細報告
├── performance.json              # 效能檢查詳細報告
├── bugs.json                     # Bug 檢查詳細報告
├── security.json                 # 安全檢查詳細報告
└── issues/
    ├── critical.md               # Critical 問題清單
    ├── high.md                   # High 問題清單
    ├── medium.md                 # Medium 問題清單
    └── low.md                    # Low 問題清單
```

---

## 完整使用流程

### 步驟 1: 執行特定領域檢查

如果您只想檢查特定領域（如架構或安全性），可使用 `--domains` 參數：

```bash
# 僅檢查架構與 API 整合度
pnpm health-check --domains architecture,api

# 僅檢查安全性
pnpm health-check --domains security

# 僅檢查效能
pnpm health-check --domains performance
```

**可用領域**：
- `architecture` - 架構健康度
- `api` - API 整合度
- `ux` - 使用者體驗
- `design` - 設計一致性
- `performance` - 效能表現
- `bugs` - Bug 檢查
- `security` - 資料安全

### 步驟 2: 查看詳細報告

#### 2.1 查看綜合報告摘要

開啟 `summary.md` 查看整體健康度評分和問題統計：

```markdown
# 健康檢查報告

**報告時間**: 2026-01-13 16:00:00
**整體健康度評分**: 89 / 100 ✅

## 各領域評分

| 領域 | 評分 | 權重 | 加權評分 | 狀態 |
|------|------|------|----------|------|
| 架構健康度 | 95 / 100 | 15% | 14.25 | ✅ 優秀 |
| API 整合度 | 92 / 100 | 15% | 13.80 | ✅ 優秀 |
| 使用者體驗 | 88 / 100 | 15% | 13.20 | ✅ 良好 |
| 設計一致性 | 90 / 100 | 10% | 9.00 | ✅ 優秀 |
| 效能表現 | 85 / 100 | 15% | 12.75 | ✅ 良好 |
| Bug 修復 | 80 / 100 | 15% | 12.00 | ⚠️ 需改進 |
| 資料安全 | 93 / 100 | 15% | 13.95 | ✅ 優秀 |

## 問題統計

| 嚴重程度 | 數量 | 狀態 |
|----------|------|------|
| Critical | 2 | 🔴 需立即處理 |
| High | 5 | 🟡 應盡快處理 |
| Medium | 12 | 🔵 可排程處理 |
| Low | 8 | ⚪ 優化建議 |
```

#### 2.2 查看特定領域的詳細報告

如果您想深入了解某個領域的問題，可查看對應的 JSON 檔案：

```bash
# 查看 API 檢查詳細報告
cat specs/017-health-check/reports/latest/api.json | jq .

# 查看效能檢查詳細報告
cat specs/017-health-check/reports/latest/performance.json | jq .
```

#### 2.3 查看分類問題清單

根據嚴重程度查看問題清單：

```bash
# 查看 Critical 問題（需立即處理）
cat specs/017-health-check/reports/latest/issues/critical.md

# 查看 High 問題（應盡快處理）
cat specs/017-health-check/reports/latest/issues/high.md
```

**Critical 問題清單範例**：
```markdown
# Critical 問題清單

## 1. [🔴 Critical] 缺少 RLS Policy 保護敏感資料表

**位置**: `supabase/migrations/20260107170000_rls_policies.sql`
**影響**: 客戶可能存取到其他客戶的訂單資料

**修復建議** (P0 - 必須立即修復):
1. 為 `orders` 表新增 RLS Policy，限制客戶僅能查看自己的訂單
2. 為 `order_items` 表新增 RLS Policy，限制客戶僅能查看自己訂單的明細

**預估工作量**: 1-2 小時

**參考資料**:
- [Supabase RLS 文件](https://supabase.com/docs/guides/auth/row-level-security)
- [專案 RLS 規範](../../docs/DATABASE_SAFETY_PROTOCOL.md)
```

### 步驟 3: 匯出為 GitHub Issues

將健康檢查報告中的問題自動匯出為 GitHub Issues，方便追蹤修復進度：

```bash
# 匯出所有問題為 GitHub Issues
pnpm health-check --export-issues

# 或僅匯出 Critical + High 問題
tsx scripts/health-check/export-to-github-issues.ts \
  --report specs/017-health-check/reports/latest/summary.json \
  --repo user/vsale \
  --token $GITHUB_TOKEN \
  --critical-only
```

**環境變數設定**：
```bash
# 設定 GitHub Token（需要 repo scope）
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**匯出結果**：
```text
✅ 已建立 Issue #42: [健康檢查] 缺少 RLS Policy 保護敏感資料表
✅ 已建立 Issue #43: [健康檢查] 部分 Server Actions 缺少權限驗證
✅ 已建立 Issue #44: [健康檢查] 效能：慢查詢需優化

總共建立 3 個 Issues（2 Critical + 1 High）
```

### 步驟 4: 追蹤修復進度

修復問題後，可再次執行健康檢查驗證是否已解決：

```bash
# 執行健康檢查
pnpm health-check

# 比較兩次報告的評分變化
jq '.overallScore' specs/017-health-check/reports/latest/summary.json
jq '.overallScore' specs/017-health-check/reports/2026-01-10-150000/summary.json
```

**評分變化追蹤範例**：
```bash
# 第一次健康檢查（2026-01-10）
$ jq '.overallScore' specs/017-health-check/reports/2026-01-10-150000/summary.json
82

# 第二次健康檢查（2026-01-13，修復 Critical 問題後）
$ jq '.overallScore' specs/017-health-check/reports/latest/summary.json
89

# 評分提升 +7 分 📈
```

---

## 報告解讀

### 如何閱讀 summary.md

健康檢查報告包含以下幾個主要部分：

#### 1. 整體健康度評分

整體健康度評分是 **0-100 分**，由 7 個領域的加權評分計算而得：

- **90-100 分** ✅ 優秀：系統狀態非常好，僅有少量低優先級問題
- **75-89 分** ✅ 良好：系統狀態良好，有部分需改進的地方
- **60-74 分** ⚠️ 尚可：系統存在一些中等優先級問題，需要排程修復
- **< 60 分** 🔴 需改進：系統存在多個高優先級問題，需立即關注

**權重分配**：
```text
架構健康度: 15%
API 整合度: 15%
使用者體驗: 15%
設計一致性: 10%
效能表現:   15%
Bug 修復:   15%
資料安全:   15%
-----------------
總計:       100%
```

#### 2. 各領域評分

每個領域的評分說明該領域的健康度：

- **架構健康度**：檢查路由結構、Server Actions 模式、Supabase Client 使用、模組依賴
- **API 整合度**：檢查 Server Actions 品質、錯誤處理、權限驗證、RLS Policies
- **使用者體驗**：檢查操作流程、錯誤提示、載入狀態
- **設計一致性**：檢查 Neo-Brutalism 風格、響應式設計、設計 Token 使用
- **效能表現**：檢查頁面載入時間、資料庫查詢效能、圖片優化
- **Bug 修復**：檢查邊界條件、資料一致性、並發操作、錯誤恢復
- **資料安全**：檢查 RLS Policies、Migration 品質、備份系統、索引

#### 3. 問題統計

問題依嚴重程度分為四類：

- **🔴 Critical**：嚴重影響系統穩定性或安全性，必須立即修復
  - 範例：缺少 RLS Policy、權限驗證漏洞、資料遺失風險

- **🟡 High**：明顯影響使用者體驗或效能，應盡快修復
  - 範例：慢查詢、載入時間過長、錯誤提示不清晰

- **🔵 Medium**：次要問題，但應在下個迭代修復
  - 範例：設計不一致、缺少載入狀態、邊界條件處理不當

- **⚪ Low**：優化建議，可排程處理
  - 範例：程式碼重複、缺少註解、效能可進一步優化

#### 4. 修復建議

每個問題都有對應的修復建議，包含：

- **優先級** (P0 / P1 / P2)
- **具體修復步驟**（Markdown 格式，支援程式碼區塊）
- **預估工作量**（如 "1-2 小時" / "1 天" / "1 週"）
- **參考資料**（官方文件、專案規範、範例程式碼）
- **修復範例程式碼**（如適用）

### 如何理解評分系統

評分系統基於以下公式：

```text
各領域評分 = (通過檢查數 / 總檢查數) × 100 - (問題加權扣分)

問題加權扣分：
- Critical 問題: 每個扣 5 分
- High 問題:     每個扣 2 分
- Medium 問題:   每個扣 1 分
- Low 問題:      每個扣 0.5 分

整體評分 = Σ (各領域評分 × 權重)
```

**範例計算**：

假設 API 整合度領域的檢查結果如下：
- 總檢查項目：4 項
- 通過檢查：4 項
- Critical 問題：1 個（扣 5 分）
- High 問題：2 個（扣 2×2 = 4 分）
- Medium 問題：3 個（扣 3×1 = 3 分）

```text
API 整合度評分 = (4/4 × 100) - (5 + 4 + 3) = 100 - 12 = 88 分
加權評分 = 88 × 0.15 = 13.20 分
```

### 如何優先處理問題

建議按照以下順序處理問題：

1. **🔴 Critical 問題（P0）** - 立即處理
   - 這些問題會直接影響系統安全性或穩定性
   - 建議在 24 小時內修復
   - 範例：權限漏洞、資料遺失風險

2. **🟡 High 問題（P1）** - 盡快處理
   - 這些問題會明顯影響使用者體驗或效能
   - 建議在 1 週內修復
   - 範例：慢查詢、載入時間過長

3. **🔵 Medium 問題（P2）** - 排程處理
   - 這些問題不會立即影響系統運作
   - 可在下個迭代或衝刺中處理
   - 範例：設計不一致、缺少載入狀態

4. **⚪ Low 問題（P2）** - 長期優化
   - 這些是優化建議，不影響核心功能
   - 可作為技術債清單，逐步改善
   - 範例：程式碼重複、效能可進一步優化

---

## 常見使用場景

### 場景 1: 首次健康檢查

當您第一次執行健康檢查時，可能會發現大量問題。不用擔心，這是正常的！

**建議流程**：

1. **執行完整健康檢查**
   ```bash
   pnpm health-check
   ```

2. **先處理 Critical 問題**
   ```bash
   # 查看 Critical 問題清單
   cat specs/017-health-check/reports/latest/issues/critical.md

   # 逐一修復（使用 Git 分支）
   git checkout -b fix/critical-issue-1
   # ... 修復 ...
   git commit -m "fix: 修復 RLS Policy 缺失問題"
   ```

3. **驗證修復結果**
   ```bash
   # 再次執行健康檢查
   pnpm health-check

   # 確認 Critical 問題已解決
   jq '.issueCounts.critical' specs/017-health-check/reports/latest/summary.json
   ```

4. **匯出 High 問題為 GitHub Issues**
   ```bash
   pnpm health-check --export-issues --critical-only
   ```

5. **排程 Medium/Low 問題**
   - 將 Medium/Low 問題加入產品待辦清單
   - 在後續迭代中逐步處理

### 場景 2: 定期健康檢查（每 2 週）

定期執行健康檢查可確保系統持續健康，及早發現問題。

**建議流程**：

1. **設定定期排程（使用 Cron 或 GitHub Actions）**
   ```bash
   # 每週一凌晨 2:00 執行健康檢查
   0 2 * * 1 cd /path/to/vsale && pnpm health-check
   ```

2. **自動發送報告摘要**
   ```bash
   # 使用 Email 或 Slack 通知
   pnpm health-check && node scripts/send-report-summary.js
   ```

3. **追蹤評分趨勢**
   ```bash
   # 比較本週與上週的評分
   jq '.overallScore' specs/017-health-check/reports/latest/summary.json
   jq '.overallScore' specs/017-health-check/reports/2026-01-06-020000/summary.json
   ```

4. **檢視新增問題**
   - 查看本週新增的問題
   - 確認是否為程式碼變更引入
   - 如是新功能引入的問題，排程修復

### 場景 3: PR 前檢查

在建立 Pull Request 前執行健康檢查，確保不引入新問題。

**建議流程**：

1. **在功能分支上執行健康檢查**
   ```bash
   git checkout feature/new-feature
   pnpm health-check
   ```

2. **比較與 master 分支的差異**
   ```bash
   # 切換到 master 分支執行健康檢查
   git checkout master
   pnpm health-check

   # 比較評分差異
   # 如果功能分支評分低於 master，表示引入了新問題
   ```

3. **修復新引入的問題**
   ```bash
   git checkout feature/new-feature
   # ... 修復問題 ...
   git commit -m "fix: 修復健康檢查發現的問題"
   ```

4. **在 PR 描述中附上健康檢查報告**
   ```markdown
   ## 健康檢查結果

   - 整體評分: 89 / 100 ✅
   - Critical 問題: 0
   - High 問題: 0
   - Medium 問題: 2（已排程修復）

   [完整報告](../specs/017-health-check/reports/2026-01-13-160000/summary.md)
   ```

### 場景 4: 修復後驗證

修復問題後，執行健康檢查驗證是否已正確解決。

**建議流程**：

1. **記錄修復前的問題**
   ```bash
   # 記錄問題 ID 和評分
   echo "Before Fix:"
   jq '.overallScore' specs/017-health-check/reports/latest/summary.json
   jq '.issueCounts' specs/017-health-check/reports/latest/summary.json
   ```

2. **修復問題**
   ```bash
   # ... 修復程式碼 ...
   git add .
   git commit -m "fix: 修復 RLS Policy 缺失問題"
   ```

3. **執行健康檢查驗證**
   ```bash
   pnpm health-check
   ```

4. **比較修復前後的差異**
   ```bash
   echo "After Fix:"
   jq '.overallScore' specs/017-health-check/reports/latest/summary.json
   jq '.issueCounts' specs/017-health-check/reports/latest/summary.json

   # 確認問題已解決
   # - Critical 問題數應減少
   # - 整體評分應提升
   ```

5. **更新 GitHub Issue 狀態**
   ```bash
   # 手動關閉對應的 GitHub Issue
   # 或使用 GitHub CLI
   gh issue close 42 --comment "已修復，健康檢查通過"
   ```

---

## 疑難排解

### 問題 1: 執行健康檢查時出現 "Cannot find module 'ts-morph'"

**原因**: 缺少必要的 npm 套件。

**解決方法**:
```bash
# 安裝缺少的套件
pnpm add -D ts-morph glob @octokit/rest

# 重新執行健康檢查
pnpm health-check
```

### 問題 2: 健康檢查執行時間過長（> 10 分鐘）

**原因**: 效能檢查（Lighthouse）可能耗時較長，特別是在網路環境不佳時。

**解決方法**:
```bash
# 跳過效能檢查
pnpm health-check --domains architecture,api,ux,design,bugs,security

# 或僅執行效能檢查（獨立運行）
pnpm health-check --domains performance
```

### 問題 3: 報告中出現 "File not found" 錯誤

**原因**: 檢查腳本嘗試讀取不存在的檔案（如 tsconfig.json）。

**解決方法**:
```bash
# 確認專案根目錄是否正確
pwd

# 確認 tsconfig.json 存在
ls -la tsconfig.json

# 如果在子目錄執行，請回到專案根目錄
cd /path/to/vsale
pnpm health-check
```

### 問題 4: Supabase 連線錯誤

**原因**: Supabase 環境變數未正確設定。

**解決方法**:
```bash
# 確認 .env.local 檔案存在並包含正確的 Supabase 金鑰
cat .env.local | grep SUPABASE

# 應包含以下環境變數：
# NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
# SUPABASE_SERVICE_ROLE_KEY=xxx

# 如果缺少，請從 Supabase Dashboard 複製金鑰
```

### 問題 5: GitHub Issues 匯出失敗

**原因**: GitHub Token 權限不足或已過期。

**解決方法**:
```bash
# 確認 GitHub Token 是否正確設定
echo $GITHUB_TOKEN

# 確認 Token 擁有 repo scope
# 前往 GitHub Settings > Developer settings > Personal access tokens
# 重新產生 Token 並賦予 repo scope

# 重新設定環境變數
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 重新匯出
pnpm health-check --export-issues
```

### 問題 6: 效能檢查顯示 "Lighthouse execution failed"

**原因**: Lighthouse 需要在本地建置並執行 Next.js 伺服器。

**解決方法**:
```bash
# 先建置專案
pnpm build

# 啟動生產伺服器（在背景執行）
pnpm start &

# 等待伺服器啟動（約 5-10 秒）
sleep 10

# 執行效能檢查
pnpm health-check --domains performance

# 完成後關閉伺服器
pkill -f "next start"
```

### 問題 7: 權限錯誤（Permission denied）

**原因**: 無法讀取或寫入檔案。

**解決方法**:
```bash
# 確認目錄權限
ls -la specs/017-health-check/

# 如果權限不足，修正權限
chmod -R u+w specs/017-health-check/

# 確認輸出目錄是否存在
mkdir -p specs/017-health-check/reports

# 重新執行健康檢查
pnpm health-check
```

---

## 最佳實踐

### 何時執行健康檢查

建議在以下時機執行健康檢查：

1. **每 2 週定期檢查**
   - 確保系統持續健康
   - 及早發現技術債累積
   - 追蹤評分趨勢

2. **合併重要功能後**
   - 確認新功能未引入問題
   - 驗證程式碼品質
   - 更新健康檢查基準線

3. **PR 建立前**
   - 確保不引入新問題
   - 提高程式碼審查效率
   - 減少 PR 往返次數

4. **Production 部署前**
   - 最後一道品質關卡
   - 確認所有 Critical 問題已修復
   - 驗證效能目標達成

5. **重構專案時**
   - 確保重構未破壞現有功能
   - 驗證架構改善效果
   - 追蹤重構進度

### 如何追蹤改進進度

#### 方法 1: 使用 Git 追蹤報告歷史

```bash
# 每次健康檢查後 commit 報告
pnpm health-check
git add specs/017-health-check/reports/
git commit -m "chore: 新增健康檢查報告 (2026-01-13)"

# 比較兩次報告的差異
git diff HEAD~1 specs/017-health-check/reports/latest/summary.json

# 查看評分變化趨勢
git log --oneline --all --grep="健康檢查報告" -- specs/017-health-check/reports/
```

#### 方法 2: 建立健康度追蹤表格

在專案 README 或 Wiki 中建立追蹤表格：

```markdown
## 健康檢查歷史

| 日期 | 整體評分 | Critical | High | Medium | Low | 備註 |
|------|----------|----------|------|--------|-----|------|
| 2026-01-13 | 89 | 0 | 2 | 5 | 8 | 修復 RLS Policy 問題 |
| 2026-01-10 | 82 | 2 | 5 | 12 | 8 | 首次檢查 |

**評分趨勢**: 📈 +7 分
```

#### 方法 3: 使用 GitHub Issues Milestone

```bash
# 建立 Milestone 追蹤健康檢查問題
gh milestone create "Health Check - 2026 Q1" \
  --description "2026 第一季健康檢查問題追蹤" \
  --due-date "2026-03-31"

# 匯出問題時自動關聯 Milestone
pnpm health-check --export-issues --milestone "Health Check - 2026 Q1"

# 查看 Milestone 完成度
gh milestone list
```

### 如何整合到開發流程

#### 整合 1: GitHub Actions 自動化

建立 `.github/workflows/health-check.yml`：

```yaml
name: Health Check
on:
  pull_request:
    branches: [master]
  schedule:
    - cron: '0 2 * * 1' # 每週一凌晨 2:00

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Run health check
        run: pnpm health-check

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: health-check-report
          path: specs/017-health-check/reports/latest/

      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs')
            const report = fs.readFileSync('specs/017-health-check/reports/latest/summary.md', 'utf-8')
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            })
```

#### 整合 2: Git Pre-commit Hook

在 `.husky/pre-commit` 中加入健康檢查：

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 僅在 master 分支或 release 分支執行健康檢查
BRANCH=$(git branch --show-current)

if [[ "$BRANCH" == "master" || "$BRANCH" =~ ^release/ ]]; then
  echo "🏥 執行健康檢查..."
  pnpm health-check --domains architecture,api,security

  # 如果有 Critical 問題，阻止 commit
  CRITICAL_COUNT=$(jq '.issueCounts.critical' specs/017-health-check/reports/latest/summary.json)

  if [ "$CRITICAL_COUNT" -gt 0 ]; then
    echo "❌ 發現 $CRITICAL_COUNT 個 Critical 問題，請先修復後再 commit"
    exit 1
  fi
fi
```

#### 整合 3: VSCode 任務

在 `.vscode/tasks.json` 中加入健康檢查任務：

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Health Check: Full",
      "type": "shell",
      "command": "pnpm health-check",
      "group": "test",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "Health Check: Architecture",
      "type": "shell",
      "command": "pnpm health-check --domains architecture",
      "group": "test"
    },
    {
      "label": "Health Check: Security",
      "type": "shell",
      "command": "pnpm health-check --domains security",
      "group": "test"
    }
  ]
}
```

在 VSCode 中按 `Ctrl+Shift+P`，輸入 `Tasks: Run Task`，選擇 `Health Check: Full` 即可執行。

### 評分目標與改進路線圖

#### 短期目標（1 個月內）

- [ ] 整體評分達到 85 分以上
- [ ] Critical 問題數 = 0
- [ ] High 問題數 <= 3
- [ ] 所有 Server Actions 包含權限檢查
- [ ] 所有資料表啟用 RLS Policy

#### 中期目標（3 個月內）

- [ ] 整體評分達到 90 分以上
- [ ] High 問題數 = 0
- [ ] Medium 問題數 <= 5
- [ ] 效能評分 >= 90
- [ ] 設計一致性評分 >= 95

#### 長期目標（6 個月內）

- [ ] 整體評分達到 95 分以上
- [ ] 所有領域評分 >= 90
- [ ] 自動化測試覆蓋率 >= 80%
- [ ] Lighthouse 所有頁面評分 >= 90
- [ ] 建立持續改進文化

---

## 相關文件

- [功能規格文件](./spec.md) - 完整的功能需求與驗收標準
- [技術研究報告](./research.md) - 工具選型與技術決策
- [資料模型](./data-model.md) - 報告資料結構定義
- [TypeScript 型別定義](./contracts/types.ts) - 型別系統
- [檢查腳本 API 合約](./contracts/check-scripts.md) - 腳本介面規範

---

## 取得協助

如果您在使用健康檢查系統時遇到問題：

1. **查看疑難排解章節** - 本文件包含常見問題的解決方法
2. **查看檢查腳本原始碼** - 位於 `scripts/health-check/`
3. **查看範例報告** - 位於 `specs/017-health-check/reports/`
4. **聯絡技術負責人** - 提供詳細的錯誤訊息和執行環境資訊

---

**最後更新**: 2026-01-13
**維護者**: Vsale 開發團隊
**版本**: 1.0.0
