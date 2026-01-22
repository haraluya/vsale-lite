# Technical Research: 專案可移植性修復

**Feature**: 019-portability-fixes
**Created**: 2026-01-22
**Status**: Complete

---

## Research Summary

本文檔記錄專案可移植性修復功能的技術研究與決策過程。所有決策基於專案現有架構、技術棧和最佳實踐。

---

## Decision 1: 工具腳本語言選擇

### 決策
使用 **JavaScript (Node.js)** 作為所有自動化工具腳本的實作語言。

### 理由

#### 優勢
1. **零額外依賴**: 專案已使用 Node.js v22.x，無需安裝其他執行環境
2. **套件重用**: 可使用專案現有套件（`@supabase/supabase-js`, `dotenv`）
3. **跨平台**: Node.js 腳本可在 Windows、macOS、Linux 執行
4. **團隊熟悉度**: 開發團隊已精通 JavaScript/TypeScript
5. **生態系統**: npm 套件豐富，易於擴展

#### 劣勢
1. **不如 Shell 腳本簡潔**: 某些簡單操作（如檔案檢查）需要更多程式碼
2. **啟動時間**: 相比 Shell 腳本稍慢（但在秒級範圍內可接受）

### 替代方案考慮

#### Shell Script (Bash)
- ✅ 優點: 簡潔、啟動快、系統整合好
- ❌ 缺點: Windows 相容性差、難以使用 Supabase SDK
- **為何未採用**: 專案需支援 Windows 用戶，Shell 腳本需要 WSL

#### PowerShell
- ✅ 優點: Windows 原生支援、功能強大
- ❌ 缺點: macOS/Linux 需額外安裝、語法獨特
- **為何未採用**: 跨平台相容性不如 Node.js

#### Python
- ✅ 優點: 易讀、跨平台、豐富的函式庫
- ❌ 缺點: 需額外安裝 Python、Supabase SDK 需另外學習
- **為何未採用**: 增加專案依賴，團隊不熟悉 Python

### 最終結論
JavaScript (Node.js) 是最佳選擇，平衡了跨平台相容性、開發效率和團隊熟悉度。

---

## Decision 2: 環境變數範本設計

### 決策
使用 **單一 `.env.local.example` 檔案** 包含所有必要與可選環境變數，並附帶詳細註解。

### 理由

#### 優勢
1. **簡單直觀**: 新用戶只需複製一個檔案
2. **完整性**: 一次性提供所有環境變數資訊
3. **註解說明**: 每個變數都有取得方式說明
4. **版本控制**: 範本檔案可追蹤，確保最新

#### 設計細節
```env
# ================================================
# 主要 Supabase 配置（必填）
# ================================================
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# 如何取得：
# 1. 前往 https://supabase.com/dashboard
# 2. Settings → API → 複製 URL 和金鑰

# ================================================
# 可選變數（用於備份功能）
# ================================================
# DB_HOST=db.YOUR_PROJECT_REF.supabase.co
# ...
```

### 替代方案考慮

#### 多個範本檔案
- 例如: `.env.minimal.example`, `.env.full.example`
- ✅ 優點: 可分層級提供配置
- ❌ 缺點: 用戶容易混淆，維護成本高
- **為何未採用**: 單一範本更簡單明確

#### 互動式配置工具
- 例如: CLI 工具引導用戶輸入
- ✅ 優點: 更友善、減少錯誤
- ❌ 缺點: 開發成本高、增加複雜度
- **為何未採用**: 對於 11 個變數，手動編輯更直接

### 最終結論
單一範本檔案結合詳細註解是最簡單有效的方式。

---

## Decision 3: 環境檢查腳本設計

### 決策
實作為 **獨立的 JavaScript 腳本**，執行時載入 `.env.local` 並驗證所有變數。

### 理由

#### 設計目標
1. 在應用啟動前檢查配置
2. 提供明確的錯誤訊息
3. 執行快速（< 5 秒）
4. 不依賴 Next.js 或其他框架

#### 實作策略
```javascript
// 載入環境變數
require('dotenv').config({ path: '.env.local' });

// 檢查必要變數
const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

// 驗證格式
const urlPattern = /^https:\/\/[a-z]{20}\.supabase\.co$/;
```

### 驗證層級

| 層級 | 檢查內容 | 錯誤處理 |
|------|---------|---------|
| 1. 存在性 | 變數是否設定 | ❌ 阻斷，列出缺少變數 |
| 2. 格式 | URL、金鑰格式 | ⚠️ 警告，但不阻斷 |
| 3. 可選變數 | 提示可用功能 | ⚪ 資訊性顯示 |

### 替代方案考慮

#### 整合到 Next.js 啟動流程
- 在 `next.config.ts` 中檢查
- ✅ 優點: 自動執行
- ❌ 缺點: 錯誤訊息不清晰、難以除錯
- **為何未採用**: 獨立腳本更明確

#### 使用現成套件
- 例如: `dotenv-safe`, `envalid`
- ✅ 優點: 功能完整、經過驗證
- ❌ 缺點: 增加依賴、難以客製化錯誤訊息
- **為何未採用**: 簡單驗證不需外部套件

### 最終結論
獨立腳本提供最大靈活性和最清晰的錯誤訊息。

---

## Decision 4: 資料庫初始化方式

### 決策
使用 **Supabase Admin API** 建立管理員帳號，而非直接操作 `auth.users` 表。

### 理由

#### 技術比較

| 方法 | 優點 | 缺點 |
|------|------|------|
| **Admin API** ✅ | 官方支援、自動處理密碼雜湊、觸發 Auth Hooks | 需要 Service Role Key |
| 直接 SQL INSERT | 完全控制 | 需手動雜湊密碼、繞過 Auth 系統 |
| Supabase CLI | 命令列友善 | 難以整合到 JavaScript 工具 |

#### 實作方式
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 使用 Admin API
const { data, error } = await supabase.auth.admin.createUser({
  email: adminEmail,
  password: adminPassword,
  email_confirm: true,
  user_metadata: { display_name: adminName }
});
```

### 安全考量
1. **Service Role Key 保護**: 僅在本機執行，不暴露於前端
2. **密碼強度**: 要求最少 8 字元
3. **冪等性**: 檢查管理員是否已存在

### 替代方案考慮

#### 使用 Supabase Magic Link
- 發送 Email 讓管理員設定密碼
- ✅ 優點: 更安全、符合 Auth 最佳實踐
- ❌ 缺點: 需配置 Email 服務、本機開發不適用
- **為何未採用**: 本機開發體驗差

#### 直接 SQL INSERT
```sql
INSERT INTO auth.users (email, encrypted_password, ...)
VALUES ('admin@example.com', crypt('password', gen_salt('bf')), ...);
```
- ✅ 優點: 完全控制
- ❌ 缺點: 繞過 Auth 系統、需手動維護
- **為何未採用**: Admin API 更安全可靠

### 最終結論
Supabase Admin API 是官方推薦且最安全的方式。

---

## Decision 5: 部署驗證策略

### 決策
實作為 **HTTP 端點測試腳本**，驗證前後台頁面和 API 可用性。

### 理由

#### 驗證範圍
| 測試項目 | URL | 預期結果 |
|---------|-----|---------|
| 前台登入 | `/login` | HTTP 200 |
| 後台登入 | `/admin/login` | HTTP 200 |
| 環境變數 | `/api/env-test` | JSON 包含環境變數 |
| 資料庫連線 | `/api/check-connection` | JSON success=true |

#### 實作方式
```javascript
const https = require('https');

function testEndpoint(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    }).on('error', reject);
  });
}
```

### 替代方案考慮

#### 使用 Playwright/Cypress
- E2E 測試框架
- ✅ 優點: 完整的瀏覽器測試、截圖
- ❌ 缺點: 安裝複雜、執行慢、過度設計
- **為何未採用**: 簡單驗證不需完整 E2E 框架

#### 使用 curl + jq
- Shell 腳本
- ✅ 優點: 簡單、快速
- ❌ 缺點: 跨平台相容性差
- **為何未採用**: 與 Decision 1 一致，選擇 JavaScript

### 最終結論
HTTP 端點測試足以驗證部署成功，無需完整 E2E 框架。

---

## Decision 6: 文檔結構設計

### 決策
建立 **單一主要部署指南** (`NEW_DEPLOYMENT_GUIDE.md`) 作為新用戶入口，輔以專題檢查清單和故障排除指南。

### 理由

#### 文檔架構
```
docs/
├── NEW_DEPLOYMENT_GUIDE.md       # 主要入口（8 個步驟）
├── ENV_VARIABLES_CHECKLIST.md   # 環境變數檢查清單
└── TROUBLESHOOTING.md            # 故障排除指南
```

#### 設計原則
1. **單一來源真相**: 避免多個文檔資訊不一致
2. **循序漸進**: 8 個步驟從 Fork 到驗證
3. **預估時間**: 每步驟提供預估時間（目標總和 < 2 小時）
4. **成功標準**: 每步驟明確定義完成標準
5. **常見問題**: 整合 FAQ 減少支援負擔

### 內容分層

| 文檔 | 目標受眾 | 深度 | 目的 |
|------|---------|------|------|
| **NEW_DEPLOYMENT_GUIDE** | 新用戶 | 完整 | 端到端部署指南 |
| **ENV_VARIABLES_CHECKLIST** | 所有用戶 | 參考 | 快速檢查環境變數 |
| **TROUBLESHOOTING** | 遇到問題的用戶 | 詳細 | 除錯與解決方案 |
| **README.md** | 首次訪客 | 概覽 | 專案介紹與快速開始 |

### 替代方案考慮

#### Wiki 或外部文檔平台
- 例如: GitBook, Notion
- ✅ 優點: 搜尋功能、版本控制、協作友善
- ❌ 缺點: 需額外維護、與程式碼分離
- **為何未採用**: Markdown 在 GitHub 中已足夠

#### 多層級文檔
- 例如: 快速開始、進階配置、API 參考
- ✅ 優點: 詳細分類
- ❌ 缺點: 用戶容易迷失、維護成本高
- **為何未採用**: 專案規模適合簡化文檔

### 最終結論
單一主要指南結合專題文檔，平衡了完整性和可維護性。

---

## Decision 7: 硬編碼移除策略

### 決策
採用 **動態提取專案 ID** 而非環境變數配置站點名稱。

### 理由

#### 實作比較

**方案 A: 動態提取**（採用）
```typescript
const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?.split('.')[0]
  ?.split('//')[1] || 'unknown';
```
- ✅ 優點: 無需額外環境變數、自動適應任何專案
- ❌ 缺點: 依賴 URL 格式不變

**方案 B: 環境變數**
```typescript
const siteLabel = process.env.SITE_LABEL || 'Unknown Site';
```
- ✅ 優點: 更靈活、可自訂名稱
- ❌ 缺點: 需新增環境變數、增加配置複雜度

#### 為何選擇方案 A
1. **零配置**: 新用戶不需額外設定
2. **自動適應**: 適用於任何 Supabase 專案
3. **可預測**: Supabase URL 格式穩定

#### 回退機制
如果 URL 格式變更，可輕易切換到方案 B：
```typescript
const projectRef = process.env.SITE_LABEL ||
  extractProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
  'unknown';
```

### 最終結論
動態提取是最簡單且最通用的方式。

---

## Decision 8: 向後相容性保證

### 決策
**不修改任何資料庫結構、業務邏輯或 UI 元件**，僅處理配置與工具。

### 理由

#### 核心約束
專案可移植性修復是基礎設施改進，不應影響現有功能。

#### 保護機制
| 層級 | 保護措施 |
|------|---------|
| **資料庫** | 不修改 Migration 檔案、不新增表或欄位 |
| **API** | 保持端點功能不變、僅移除硬編碼 |
| **前端** | 不修改 UI 元件、不改變使用者體驗 |
| **部署** | 現有環境變數保持有效 |

#### 驗證策略
```bash
# 切換到新分支後執行所有關鍵功能測試
pnpm dev

# 測試清單
- [ ] 前台登入
- [ ] 商品瀏覽
- [ ] 加入購物車
- [ ] 建立訂單
- [ ] 後台登入
- [ ] 管理商品
- [ ] 查看訂單
```

### 風險緩解
如果意外破壞功能：
1. 使用 Git 快速回滾
2. Vercel Dashboard 回滾部署
3. 恢復環境變數（如有變更）

### 最終結論
嚴格遵守「不破壞現有功能」原則，所有修改都經過相容性驗證。

---

## Best Practices Applied

### 1. 環境變數命名
遵循 Next.js 規範：
- `NEXT_PUBLIC_*`: 暴露於客戶端（URL, ANON_KEY）
- 其他: 僅限伺服器端（SERVICE_ROLE_KEY, DB_PASSWORD）

### 2. 錯誤訊息設計
- **清晰**: 明確指出問題
- **可執行**: 提供解決步驟
- **繁體中文**: 符合專案語言要求

範例:
```
❌ 錯誤：環境變數 NEXT_PUBLIC_SUPABASE_URL 未設定

解決方式:
1. 複製 .env.local.example 為 .env.local
2. 填入您的 Supabase 專案 URL
3. 再次執行 pnpm check-env
```

### 3. 腳本冪等性
所有工具腳本設計為可重複執行：
- 環境檢查: 可多次執行
- 資料庫初始化: 檢查是否已存在管理員
- 部署驗證: 無副作用

### 4. 文檔寫作原則
- **循序漸進**: 從簡單到複雜
- **預估時間**: 幫助用戶規劃
- **成功標準**: 明確定義完成
- **視覺輔助**: 使用 Emoji、表格、程式碼區塊

### 5. 版本控制最佳實踐
- **小步提交**: 每個 Task 獨立 commit
- **清晰訊息**: 使用 `feat:`, `fix:`, `docs:` 前綴
- **Co-Author**: 標記 Claude Code 協作

---

## Research Conclusion

所有技術決策都經過深入研究，基於以下原則：

1. **簡單優於複雜**: 優先選擇簡單直接的方案
2. **重用優於新建**: 使用專案現有工具鏈
3. **跨平台優於特定**: 確保 Windows/macOS/Linux 相容
4. **用戶體驗優先**: 所有決策以降低新用戶進入門檻為目標
5. **向後相容**: 不破壞現有功能

**準備進入實施階段**。所有技術路徑已明確，無未解決的問題。

---

## References

### 官方文檔
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

### 相關專案文檔
- [專案憲章](../../CLAUDE.md#核心憲章原則)
- [部署指南（現有）](../../DEPLOYMENT.md)
- [功能規格](spec.md)
- [實施計畫](plan.md)

### 工具與套件
- [@supabase/supabase-js](https://www.npmjs.com/package/@supabase/supabase-js)
- [dotenv](https://www.npmjs.com/package/dotenv)
- [Node.js readline](https://nodejs.org/api/readline.html)
- [Node.js https](https://nodejs.org/api/https.html)
