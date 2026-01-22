# Quick Start: 專案可移植性修復

**Feature**: 019-portability-fixes
**Last Updated**: 2026-01-22

快速參考指南，提供開發者實施此功能所需的關鍵資訊。

---

## 📋 檔案清單

### 需建立的檔案（7 個）

| 檔案 | 優先級 | 用途 | Task |
|------|--------|------|------|
| `.env.local.example` | P0 | 環境變數範本 | 1.1 |
| `scripts/check-environment.js` | P0 | 環境檢查工具 | 2.1 |
| `scripts/init-database.js` | P0 | 資料庫初始化工具 | 2.2 |
| `scripts/verify-deployment.js` | P1 | 部署驗證工具 | 2.3 |
| `docs/NEW_DEPLOYMENT_GUIDE.md` | P0 | 新用戶部署指南 | 3.1 |
| `docs/ENV_VARIABLES_CHECKLIST.md` | P1 | 環境變數檢查清單 | 3.2 |
| `docs/TROUBLESHOOTING.md` | P1 | 故障排除指南 | 4.2 |

### 需修改的檔案（9 個）

| 檔案 | 修改內容 | Task |
|------|---------|------|
| `vercel.json` | 移除 `env` 區塊（第 7-10 行） | 1.2 |
| `app/api/env-test/route.ts` | 重構站點偵測邏輯（第 22-23 行） | 1.3 |
| `app/api/check-connection/route.ts` | 移除硬編碼檢查（第 29-30 行） | 1.3 |
| `import-data.ps1` | 使用環境變數（第 8 行） | 1.4 |
| `restore-backup.js` | 移除硬編碼專案 ID（第 33 行） | 1.4 |
| `supabase/seed.sql` | 新增存在性檢查 | 4.1 |
| `README.md` | 更新快速開始章節 | 3.3 |
| `DEPLOYMENT.md` | 標記為舊版或替換 | 3.4 |
| `package.json` | 新增 3 個腳本指令 | 2.1-2.3 |

---

## 🚀 快速指令

### 開發工作流程

```bash
# 1. 確保在正確分支
git checkout 019-portability-fixes

# 2. 開始實施 Phase 1
# 按 plan.md 中的 Task 順序執行

# 3. 測試本機開發
pnpm dev

# 4. 執行檢查
pnpm type-check
pnpm lint

# 5. 提交變更
git add .
git commit -m "feat: 完成 Task X.X - [描述]

[詳細變更內容]

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### 驗證指令

```bash
# 環境變數檢查
pnpm check-env

# 資料庫初始化
pnpm init-db

# 部署驗證
pnpm verify-deploy https://test-url.vercel.app

# 檢查硬編碼（應無結果）
git grep "qwovavytryvgchcowjof" -- '*.ts' '*.js'
git grep "Devape-BM69"
```

---

## 📦 Phase 概覽

### Phase 1: P0 問題修復（2.5 小時）

**目標**: 移除硬編碼、建立環境變數範本

**Tasks**:
1. Task 1.1: 建立 `.env.local.example` (30 分鐘)
2. Task 1.2: 移除 `vercel.json` 硬編碼 (15 分鐘)
3. Task 1.3: 重構站點偵測邏輯 (45 分鐘)
4. Task 1.4: 修正敏感腳本 (30 分鐘)
5. Task 1.5: 強化 `.gitignore` (15 分鐘)

**完成標準**:
- [ ] 執行 `git grep "qwovavytryvgchcowjof" -- '*.ts' '*.js'` 無結果
- [ ] `.env.local.example` 包含所有 11 個變數
- [ ] `vercel.json` 無 `env` 區塊
- [ ] 本機測試通過

---

### Phase 2: 自動化工具（3.5 小時）

**目標**: 建立環境檢查、資料庫初始化、部署驗證工具

**Tasks**:
1. Task 2.1: 環境檢查腳本 (1 小時)
2. Task 2.2: 資料庫初始化腳本 (1.5 小時)
3. Task 2.3: 部署驗證腳本 (1 小時)

**完成標準**:
- [ ] `pnpm check-env` 可執行並驗證環境變數
- [ ] `pnpm init-db` 可建立管理員帳號
- [ ] `pnpm verify-deploy <URL>` 可驗證部署

---

### Phase 3: 文檔更新（4 小時）

**目標**: 建立新用戶部署指南與檢查清單

**Tasks**:
1. Task 3.1: 新用戶部署指南 (2 小時)
2. Task 3.2: 環境變數檢查清單 (30 分鐘)
3. Task 3.3: 更新 README.md (1 小時)
4. Task 3.4: 更新 DEPLOYMENT.md (30 分鐘)

**完成標準**:
- [ ] `docs/NEW_DEPLOYMENT_GUIDE.md` 包含 8 個步驟
- [ ] `README.md` 連結到新部署指南
- [ ] 所有文檔使用繁體中文

---

### Phase 4: P1/P2 修復（1.5 小時）

**目標**: 參數化種子資料、建立故障排除指南

**Tasks**:
1. Task 4.1: 參數化種子資料 (30 分鐘)
2. Task 4.2: 建立故障排除指南 (1 小時)

**完成標準**:
- [ ] `seed.sql` 執行兩次不會建立重複帳號
- [ ] `docs/TROUBLESHOOTING.md` 列出至少 5 個常見問題

---

## 🔍 關鍵程式碼片段

### 環境變數範本結構

```env
# ================================================
# 主要 Supabase 配置（必填）
# ================================================
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# 如何取得：
# 1. 前往 https://supabase.com/dashboard
# 2. Settings → API → 複製 URL 和金鑰

# ================================================
# 可選變數（用於備份功能）
# ================================================
# DB_HOST=db.YOUR_PROJECT_REF.supabase.co
# DB_PASSWORD=your_db_password
# ...
```

---

### 站點偵測邏輯（修改前後）

**修改前** (`app/api/env-test/route.ts`):
```typescript
detection: {
  isMainSite: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('qwovavytryvgchcowjof') || false,
  isSite2: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('rdyvmgomjdglflrcfijs') || false,
}
```

**修改後**:
```typescript
detection: {
  projectRef: process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0]?.split('//')[1] || 'unknown',
  hasMainSiteConfig: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  hasSite2Config: !!(process.env.NEXT_PUBLIC_SUPABASE_URL_SITE2 && process.env.SUPABASE_SERVICE_ROLE_KEY_SITE2),
}
```

---

### 環境檢查腳本核心邏輯

```javascript
require('dotenv').config({ path: '.env.local' });

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

REQUIRED_VARS.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ❌ ${varName}: 未設定`);
    hasErrors = true;
  } else {
    console.log(`  ✅ ${varName}: ${value.substring(0, 20)}...`);
  }
});

if (hasErrors) {
  console.log('\n💡 提示：複製 .env.local.example 為 .env.local 並填入您的 Supabase 憑證');
  process.exit(1);
}
```

---

### 資料庫初始化核心邏輯

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 建立管理員
const { data, error } = await supabase.auth.admin.createUser({
  email: adminEmail,
  password: adminPassword,
  email_confirm: true,
  user_metadata: { display_name: adminName }
});

// 插入到 profiles 表
await supabase.from('profiles').insert({
  id: data.user.id,
  email: adminEmail,
  role: 'admin',
  display_name: adminName
});
```

---

### 種子資料冪等性檢查

```sql
DO $$
BEGIN
    -- 檢查是否已存在管理員
    IF EXISTS (SELECT 1 FROM profiles WHERE role = 'admin') THEN
        RAISE NOTICE '⏭️  管理員帳號已存在，跳過建立';
        RETURN;
    END IF;

    -- 建立管理員邏輯...
END $$;
```

---

## ✅ 驗收標準速查

### Phase 1 完成檢查

```bash
# 1. 環境變數範本存在
test -f .env.local.example && echo "✅ 範本存在" || echo "❌ 範本缺失"

# 2. vercel.json 無硬編碼
! grep -q '"env"' vercel.json && echo "✅ vercel.json 已清理" || echo "❌ 仍有 env 區塊"

# 3. 無硬編碼專案 ID（程式碼中）
! git grep "qwovavytryvgchcowjof" -- '*.ts' '*.js' && echo "✅ 無硬編碼" || echo "❌ 仍有硬編碼"

# 4. 無硬編碼密碼
! git grep "Devape-BM69" && ! git grep "4Og37Vy1GzQJFq6K" && echo "✅ 無敏感信息" || echo "❌ 仍有敏感信息"
```

### Phase 2 完成檢查

```bash
# 1. 腳本檔案存在
test -f scripts/check-environment.js && echo "✅ 環境檢查腳本存在"
test -f scripts/init-database.js && echo "✅ 初始化腳本存在"
test -f scripts/verify-deployment.js && echo "✅ 驗證腳本存在"

# 2. package.json 包含指令
grep -q "check-env" package.json && echo "✅ check-env 指令已新增"
grep -q "init-db" package.json && echo "✅ init-db 指令已新增"
grep -q "verify-deploy" package.json && echo "✅ verify-deploy 指令已新增"

# 3. 執行測試
pnpm check-env
pnpm init-db
```

### Phase 3 完成檢查

```bash
# 1. 文檔存在
test -f docs/NEW_DEPLOYMENT_GUIDE.md && echo "✅ 部署指南存在"
test -f docs/ENV_VARIABLES_CHECKLIST.md && echo "✅ 檢查清單存在"

# 2. README 已更新
grep -q "NEW_DEPLOYMENT_GUIDE.md" README.md && echo "✅ README 已連結新指南"

# 3. 無硬編碼（文檔除外）
! grep "qwovavytryvgchcowjof" README.md && echo "✅ README 已清理"
```

### Phase 4 完成檢查

```bash
# 1. 種子資料冪等性
supabase db seed
supabase db seed  # 應顯示「管理員帳號已存在，跳過建立」

# 2. 故障排除指南
test -f docs/TROUBLESHOOTING.md && echo "✅ 故障排除指南存在"
grep -q "環境變數遺漏" docs/TROUBLESHOOTING.md && echo "✅ 包含常見問題"
```

---

## 🔧 常見問題

### Q: 如何測試環境檢查腳本？

```bash
# 1. 備份現有 .env.local
cp .env.local .env.local.backup

# 2. 刪除測試
rm .env.local
pnpm check-env  # 應顯示錯誤

# 3. 建立不完整配置
echo "NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co" > .env.local
pnpm check-env  # 應列出缺少的變數

# 4. 恢復
cp .env.local.backup .env.local
```

---

### Q: 如何驗證向後相容性？

```bash
# 1. 在主分支測試所有功能
git checkout master
pnpm dev
# 測試登入、商品瀏覽、訂單等

# 2. 切換到功能分支
git checkout 019-portability-fixes
pnpm dev
# 重複相同測試

# 3. 比較結果
# 應完全一致，無功能破壞
```

---

### Q: 如何快速回滾？

```bash
# 本機回滾
git log --oneline -5  # 查看最近 5 個 commit
git checkout <stable-commit-hash>

# Vercel 回滾
# 前往 Dashboard → Deployments → Promote to Production
```

---

## 📚 相關文件

| 文件 | 用途 |
|------|------|
| [spec.md](spec.md) | 功能規格 |
| [plan.md](plan.md) | 詳細實施計畫 |
| [research.md](research.md) | 技術研究與決策 |
| [checklists/requirements.md](checklists/requirements.md) | 需求檢查清單 |

---

## 🎯 成功指標

完成後應達成：

- ✅ 0 個硬編碼專案 ID（程式碼中）
- ✅ 3 個自動化工具可用
- ✅ 新用戶部署時間 < 2 小時
- ✅ 部署成功率 > 90%（基於 UAT 測試）
- ✅ 向後相容性 100%

---

**準備開始？** 執行 `git checkout 019-portability-fixes` 並開始 Phase 1 Task 1.1！
