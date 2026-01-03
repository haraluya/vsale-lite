# API Contract: Excel 匯入/匯出 API

**Feature**: US7 - 客戶資料批次匯入/匯出 Excel
**版本**: 1.0.0
**最後更新**: 2026-01-04

---

## Server Action 1: `exportClients`

### 功能描述
將當前篩選的客戶資料匯出為 Excel 檔案 (.xlsx)，包含 UTF-8 BOM 確保繁體中文正確顯示。

---

### 簽名

```typescript
async function exportClients(
  filters?: ClientExportFilters
): Promise<ActionResult<ExportResult>>
```

---

### 請求參數

#### `filters` (optional)
- **型別**: `ClientExportFilters`
- **說明**: 篩選條件，未提供則匯出所有客戶

```typescript
interface ClientExportFilters {
  tier_id?: string;      // 篩選特定會員等級
  search?: string;       // 搜尋手機號碼或姓名
  created_after?: string; // 篩選建立日期之後的客戶 (ISO 8601)
}
```

---

### 回傳格式

#### 成功回應

```typescript
{
  success: true,
  data: ExportResult
}
```

**ExportResult 型別**:
```typescript
interface ExportResult {
  file_name: string;     // 檔案名稱，如 "客戶資料_20260104.xlsx"
  file_buffer: Buffer;   // Excel 檔案 Buffer (用於下載)
  row_count: number;     // 匯出筆數
  columns: string[];     // 欄位名稱
}
```

---

### Excel 檔案格式

#### 工作表名稱
`客戶列表`

#### 欄位定義

| 欄位名稱 | Excel 欄位 | 資料型別 | 範例 |
|---------|-----------|---------|------|
| 手機號碼 | A | TEXT | 0912345678 |
| 姓名 | B | TEXT | 王小明 |
| 會員等級 | C | TEXT | 批發 |
| 建立時間 | D | DATE | 2026-01-04 |

#### 範例檔案內容

| 手機號碼 | 姓名 | 會員等級 | 建立時間 |
|---------|------|---------|---------|
| 0912345678 | 王小明 | 批發 | 2026-01-04 |
| 0923456789 | 李小華 | VIP | 2026-01-03 |
| 0934567890 | 陳小美 | 零售 | 2026-01-02 |

---

### 實作範例

```typescript
// lib/actions/clients.ts
'use server';
import * as XLSX from 'xlsx';

export async function exportClients(filters?: ClientExportFilters) {
  // 1. 驗證權限 (僅管理員可匯出)
  const { user } = await checkAuth();
  if (user.role !== 'admin') {
    return { success: false, message: '無權限執行此操作' };
  }

  // 2. 查詢客戶資料
  const supabase = await createClient();
  let query = supabase
    .from('profiles')
    .select(`
      phone,
      name,
      tier:tiers(name),
      created_at
    `)
    .order('created_at', { ascending: false });

  // 套用篩選條件
  if (filters?.tier_id) {
    query = query.eq('tier_id', filters.tier_id);
  }
  if (filters?.search) {
    query = query.or(`phone.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
  }
  if (filters?.created_after) {
    query = query.gte('created_at', filters.created_after);
  }

  const { data: clients, error } = await query;

  if (error) {
    return { success: false, message: '查詢客戶資料失敗' };
  }

  // 3. 轉換為 Excel 格式
  const excelData = clients.map(c => ({
    '手機號碼': c.phone,
    '姓名': c.name,
    '會員等級': c.tier.name,
    '建立時間': new Date(c.created_at).toLocaleDateString('zh-TW')
  }));

  // 4. 產生 Excel 檔案
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '客戶列表');

  // 5. 加入 UTF-8 BOM (確保 Excel 正確顯示中文)
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'buffer',
    bookSST: false
  });

  // 6. 產生檔案名稱
  const fileName = `客戶資料_${new Date().toISOString().split('T')[0]}.xlsx`;

  return {
    success: true,
    data: {
      file_name: fileName,
      file_buffer: excelBuffer,
      row_count: clients.length,
      columns: ['手機號碼', '姓名', '會員等級', '建立時間']
    }
  };
}
```

---

## Server Action 2: `importClients`

### 功能描述
從上傳的 Excel 檔案批次匯入客戶資料，支援驗證與試算模式。

---

### 簽名

```typescript
async function importClients(
  file: File,
  options?: ImportOptions
): Promise<ActionResult<ImportResult>>
```

---

### 請求參數

#### `file` (required)
- **型別**: `File`
- **約束**:
  - 格式: `.xlsx`
  - 大小: < 5MB
  - MIME type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

#### `options` (optional)
- **型別**: `ImportOptions`

```typescript
interface ImportOptions {
  dry_run?: boolean;      // 試算模式 (僅驗證不寫入)，預設 false
  skip_errors?: boolean;  // 跳過錯誤資料，預設 false
}
```

---

### 回傳格式

#### 成功回應

```typescript
{
  success: true,
  data: ImportResult
}
```

**ImportResult 型別**:
```typescript
interface ImportResult {
  total_rows: number;       // 總筆數
  success_count: number;    // 成功筆數
  error_count: number;      // 錯誤筆數
  errors: ImportError[];    // 錯誤明細
  dry_run: boolean;         // 是否為試算模式
}

interface ImportError {
  row_number: number;       // 錯誤列號 (從 2 開始，第 1 列為標題)
  field: string;            // 錯誤欄位
  value: any;               // 錯誤值
  message: string;          // 錯誤訊息
}
```

#### 失敗回應

```typescript
{
  success: false,
  message: string,
  errors?: ImportError[]
}
```

---

### Excel 檔案格式要求

#### 必要欄位

| 欄位名稱 | 驗證規則 | 範例 |
|---------|---------|------|
| 手機號碼 | 必填，格式 `09\d{8}` | 0912345678 |
| 姓名 | 必填，2-50 字元 | 王小明 |
| 會員等級 | 必填，必須存在於資料庫 | 批發 |
| 密碼 | 選填，至少 6 字元 | 123456 |

#### 範例範本檔案

```
| 手機號碼 | 姓名 | 會員等級 | 密碼 |
|---------|------|---------|------|
| 0912345678 | 王小明 | 批發 | 123456 |
| 0923456789 | 李小華 | VIP | abc123 |
```

---

### 實作範例

```typescript
// lib/actions/clients.ts
export async function importClients(file: File, options?: ImportOptions) {
  // 1. 驗證權限
  const { user } = await checkAuth();
  if (user.role !== 'admin') {
    return { success: false, message: '無權限執行此操作' };
  }

  // 2. 驗證檔案格式與大小
  if (!file.name.endsWith('.xlsx')) {
    return { success: false, message: '僅支援 .xlsx 格式' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, message: '檔案大小不可超過 5MB' };
  }

  // 3. 解析 Excel 檔案
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(worksheet);

  if (rawData.length === 0) {
    return { success: false, message: 'Excel 檔案為空' };
  }
  if (rawData.length > 1000) {
    return { success: false, message: '單次匯入最多 1000 筆資料' };
  }

  // 4. 驗證資料格式
  const errors: ImportError[] = [];
  const validClients = [];

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const rowNumber = i + 2; // Excel 第 1 列為標題

    try {
      // 驗證手機號碼
      if (!row['手機號碼'] || !/^09\d{8}$/.test(row['手機號碼'])) {
        errors.push({
          row_number: rowNumber,
          field: '手機號碼',
          value: row['手機號碼'],
          message: '手機號碼格式錯誤 (需為 09xxxxxxxx)'
        });
        continue;
      }

      // 驗證姓名
      if (!row['姓名'] || row['姓名'].length < 2 || row['姓名'].length > 50) {
        errors.push({
          row_number: rowNumber,
          field: '姓名',
          value: row['姓名'],
          message: '姓名長度需為 2-50 字元'
        });
        continue;
      }

      // 驗證會員等級 (查詢資料庫)
      const tier = await getTierByName(row['會員等級']);
      if (!tier) {
        errors.push({
          row_number: rowNumber,
          field: '會員等級',
          value: row['會員等級'],
          message: '會員等級不存在'
        });
        continue;
      }

      // 驗證密碼 (選填)
      if (row['密碼'] && row['密碼'].length < 6) {
        errors.push({
          row_number: rowNumber,
          field: '密碼',
          value: row['密碼'],
          message: '密碼至少 6 個字元'
        });
        continue;
      }

      validClients.push({
        phone: row['手機號碼'],
        name: row['姓名'],
        tier_id: tier.id,
        password: row['密碼'] || row['手機號碼'].slice(-6) // 預設密碼為手機後 6 碼
      });
    } catch (error) {
      errors.push({
        row_number: rowNumber,
        field: '未知',
        value: null,
        message: error.message
      });
    }
  }

  // 5. 試算模式 (不寫入)
  if (options?.dry_run) {
    return {
      success: true,
      data: {
        total_rows: rawData.length,
        success_count: validClients.length,
        error_count: errors.length,
        errors,
        dry_run: true
      }
    };
  }

  // 6. 批次寫入資料庫
  let successCount = 0;
  for (const client of validClients) {
    try {
      await createClient(client);
      successCount++;
    } catch (error) {
      errors.push({
        row_number: 0,
        field: 'database',
        value: client.phone,
        message: `寫入失敗: ${error.message}`
      });
    }
  }

  return {
    success: true,
    data: {
      total_rows: rawData.length,
      success_count: successCount,
      error_count: errors.length,
      errors,
      dry_run: false
    }
  };
}
```

---

### 錯誤處理

| 錯誤類型 | 訊息範例 |
|---------|---------|
| 檔案格式錯誤 | "僅支援 .xlsx 格式" |
| 檔案過大 | "檔案大小不可超過 5MB" |
| 手機格式錯誤 | "第 3 列: 手機號碼格式錯誤" |
| 會員等級不存在 | "第 5 列: 會員等級 '高級批發' 不存在" |
| 重複手機號碼 | "第 7 列: 手機號碼已存在" |

---

### 測試案例

```typescript
describe('importClients', () => {
  it('應成功匯入有效資料', async () => {
    const file = createMockExcelFile([
      { 手機號碼: '0912345678', 姓名: '王小明', 會員等級: '批發', 密碼: '123456' }
    ]);
    const result = await importClients(file);
    expect(result.success).toBe(true);
    expect(result.data.success_count).toBe(1);
  });

  it('應驗證手機號碼格式', async () => {
    const file = createMockExcelFile([
      { 手機號碼: '123', 姓名: '王小明', 會員等級: '批發' }
    ]);
    const result = await importClients(file);
    expect(result.data.error_count).toBe(1);
    expect(result.data.errors[0].message).toContain('手機號碼格式錯誤');
  });

  it('應支援試算模式', async () => {
    const file = createMockExcelFile([...]);
    const result = await importClients(file, { dry_run: true });
    expect(result.data.dry_run).toBe(true);
    // 驗證資料庫無寫入
  });
});
```

---

## Server Action 3: `downloadClientTemplate`

### 功能描述
下載客戶匯入範本 Excel 檔案。

---

### 簽名

```typescript
async function downloadClientTemplate(): Promise<ActionResult<ExportResult>>
```

---

### 實作範例

```typescript
export async function downloadClientTemplate() {
  const templateData = [
    { 手機號碼: '0912345678', 姓名: '範例姓名', 會員等級: '批發', 密碼: '123456' }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '客戶列表');

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'buffer'
  });

  return {
    success: true,
    data: {
      file_name: '客戶匯入範本.xlsx',
      file_buffer: excelBuffer,
      row_count: 1,
      columns: ['手機號碼', '姓名', '會員等級', '密碼']
    }
  };
}
```

---

**文件版本**: 1.0.0
**建立日期**: 2026-01-04
