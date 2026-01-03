# 文檔目錄

## PostgreSQL 最佳實踐研究

### 日期範圍查詢優化 (2026-01-03 新增)

此系列文檔提供 PostgreSQL 中高效處理日期範圍查詢的完整指南，專為 Vsale-lite 訂單報表系統設計。

#### 核心文檔

1. **RESEARCH-SUMMARY.md** (本文件導覽)
   - 快速概覽所有研究成果
   - 核心發現與建議摘要
   - Phase 8 實施計畫
   - 每個文檔的快速查找指南

2. **postgresql-date-range-optimization.md** (詳細研究，~800 行)
   - **第 1 部分**: PostgreSQL 日期函數分析 (`NOW()`, `INTERVAL`, `date_trunc()` 對比)
   - **第 2 部分**: 索引策略 (B-tree vs BRIN，複合索引，部分索引)
   - **第 3 部分**: 快取策略 (Redis，Next.js cache，物化檢視表)
   - **第 4 部分**: SQL 查詢範例 (7 類場景，26 個具體查詢)
   - **第 5 部分**: Vsale-lite 實施建議 (Phase 8 任務分解)
   - **附錄 A-B**: SQL 範本庫與參考資源

3. **report-queries-reference.sql** (可直接運行的 SQL，~400 行)
   - 8 類查詢範例 (基礎、日報表、週報表、月報表、分層分析、庫存分析、時間序列、效能測試)
   - 每個查詢包含預期執行時間
   - 可複製到 Supabase Studio SQL Editor 直接執行
   - 包含快速參考與使用指南

#### 實施指南

**specs/004-cart-and-orders/performance-optimization.md** (實施步驟，~300 行)
- **Task 1**: 新增複合索引 (15 分鐘)
- **Task 2**: 建立報表 Server Actions (45 分鐘)
- **Task 3**: PostgreSQL 報表函數 (30 分鐘)
- **Task 4**: 報表 UI 頁面 (60 分鐘)
- 效能基準與快取策略
- 監控與完成檢查清單

---

## 快速開始

### 1. 理解研究成果 (5 分鐘)
閱讀 `RESEARCH-SUMMARY.md` 的「核心發現與建議」部分

### 2. 學習最佳實踐 (30 分鐘)
參考 `postgresql-date-range-optimization.md`:
- 第 1 部分：日期函數選擇
- 第 2 部分：索引設計
- 第 3 部分：快取策略

### 3. 運行查詢範例 (15 分鐘)
1. 開啟 Supabase Studio (http://127.0.0.1:54323)
2. 進入 SQL Editor
3. 複製 `report-queries-reference.sql` 中的查詢
4. 修改時間參數並執行

### 4. 實施 Phase 8 (3-4 小時)
按 `specs/004-cart-and-orders/performance-optimization.md` 的 Task 1-7 依序實施

---

## 核心建議速查

### 日期函數
```sql
-- ✅ 使用 INTERVAL（最快）
WHERE created_at >= NOW() - INTERVAL '7 days'

-- ✅ 時間分組使用 date_trunc()
GROUP BY date_trunc('day', created_at)

-- ✅ 時區轉換
SELECT created_at AT TIME ZONE 'Asia/Taipei'
```

### 索引
```sql
-- 已存在
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 推薦新增 (Phase 8)
CREATE INDEX idx_orders_user_id_created_at ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status_created_at ON orders(status, created_at DESC);
```

### 快取
```typescript
// 應用層快取：5-15 分鐘 TTL
const stats = await cacheGet('reports:daily:2026-01-03')
if (!stats) {
  stats = await getDailyReport()
  await cacheSet('reports:daily:2026-01-03', stats, 600)
}

// 訂單變更時失效快取
await invalidateReportCaches()
```

### 效能預期
| 查詢類型 | 現況 | 優化後 | 目標 |
|---------|------|--------|------|
| 客戶 7 天訂單 | 30-50ms | 20-30ms | < 50ms ✓ |
| 30 天統計 | 150-200ms | 80-100ms | < 100ms ✓ |
| 月報表 | 200-300ms | 150-200ms | < 300ms ✓ |
| 帶快取 | - | 5-50ms | < 50ms ✓ |

---

## 文檔結構圖

```
docs/
├── README.md (本文件)
├── RESEARCH-SUMMARY.md (總結 & 快速參考)
├── postgresql-date-range-optimization.md (詳細研究)
└── report-queries-reference.sql (可運行的 SQL)

specs/004-cart-and-orders/
└── performance-optimization.md (Phase 8 實施指南)
```

---

## 使用提示

### 搜尋特定主題

| 主題 | 位置 |
|------|------|
| 日期函數對比表 | postgresql-date-range-optimization.md § 1.1 |
| INTERVAL vs date_trunc() | postgresql-date-range-optimization.md § 1.2-1.3 |
| 索引推薦方案 | postgresql-date-range-optimization.md § 2.3 |
| 快取層架構 | performance-optimization.md 或 postgresql-date-range-optimization.md § 3.1 |
| 週報表 SQL | report-queries-reference.sql § 3 |
| 實施 Task 清單 | performance-optimization.md § Phase 8 實施計畫 |

### 文件大小參考
- `RESEARCH-SUMMARY.md`: ~400 行 (快速概覽)
- `postgresql-date-range-optimization.md`: ~800 行 (詳細參考)
- `report-queries-reference.sql`: ~400 行 (可運行範例)
- `performance-optimization.md`: ~300 行 (實施指南)
- **總計**: ~1,900 行研究文檔

### 編輯與維護
所有文檔使用 Markdown 或 SQL 格式，便於版本控制。
建議在以下時點重新審視：
- Phase 9 開始時
- 訂單數據量超過 100,000 筆時
- 報表查詢時間超過效能目標時

---

## 相關檔案與指令

### 本地 Supabase
```bash
# 啟動本地 Supabase (Docker)
supabase start

# 重置資料庫並執行 Migrations
supabase db reset

# SQL 查詢
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres
```

### 效能測試
```sql
-- 執行 EXPLAIN ANALYZE 查看執行計畫
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM orders
WHERE user_id = 'xxx'
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 20;
```

### Git 提交本研究
```bash
git add docs/ specs/
git commit -m "docs: 新增 PostgreSQL 日期範圍查詢最佳實踐研究"
```

---

**文檔完成日期**: 2026-01-03
**適用版本**: Vsale-lite Phase 8+
**維護者**: Claude Code

---

有任何問題或需要補充，請查閱各份文檔的相應章節。
