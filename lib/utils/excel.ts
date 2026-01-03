import * as XLSX from 'xlsx';

/**
 * 產生帶有日期的 Excel 檔案名稱
 * @param baseName 基礎名稱（如「客戶資料」）
 * @returns 檔案名稱（如「客戶資料_20260104.xlsx」）
 */
export function generateExcelFileName(baseName: string): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `${baseName}_${date}.xlsx`;
}

/**
 * 驗證上傳的檔案是否為有效的 Excel 檔案
 * @param file 上傳的檔案
 * @returns 驗證結果
 */
export function validateExcelFile(file: File): { valid: boolean; error?: string } {
  // 驗證副檔名
  if (!file.name.endsWith('.xlsx')) {
    return { valid: false, error: '僅支援 .xlsx 格式' };
  }

  // 驗證 MIME type
  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  if (!validMimeTypes.includes(file.type)) {
    return { valid: false, error: '檔案格式不正確' };
  }

  // 驗證檔案大小 (最大 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: '檔案大小不可超過 5MB' };
  }

  return { valid: true };
}

/**
 * 將 JSON 資料轉換為 Excel Buffer
 * @param data JSON 資料陣列
 * @param sheetName 工作表名稱
 * @returns Excel Buffer
 */
export function jsonToExcelBuffer(data: any[], sheetName: string = 'Sheet1'): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 取得工作表範圍
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  // 遍歷所有儲存格，為手機號碼和密碼欄位設定文字格式
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];

      if (!cell) continue;

      // 取得欄位名稱（第一列）
      const headerCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
      const headerValue = headerCell?.v;

      // 如果是手機號碼或密碼欄位，強制設定為文字格式
      if (headerValue === '手機號碼' || headerValue === '密碼') {
        // 確保值為字串並加上前綴單引號強制文字格式
        if (cell.v !== undefined && cell.v !== null) {
          cell.t = 's'; // 設定儲存格類型為字串
          cell.v = String(cell.v); // 確保值為字串
          cell.z = '@'; // 設定數字格式為文字
        }
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // 產生 Excel Buffer (含 UTF-8 BOM)
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'buffer',
    bookSST: false,
  });

  return excelBuffer as Buffer;
}

/**
 * 解析 Excel 檔案為 JSON 資料
 * @param buffer Excel 檔案 Buffer
 * @param sheetIndex 工作表索引（預設 0）
 * @returns JSON 資料陣列
 */
export async function excelBufferToJson(buffer: ArrayBuffer, sheetIndex: number = 0): Promise<any[]> {
  const workbook = XLSX.read(buffer);
  const sheetName = workbook.SheetNames[sheetIndex];

  if (!sheetName) {
    throw new Error('工作表不存在');
  }

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  return data;
}

/**
 * 驗證 Excel 資料是否為空
 * @param data Excel 資料
 * @returns 是否為空
 */
export function isExcelDataEmpty(data: any[]): boolean {
  return !data || data.length === 0;
}

/**
 * 格式化匯入錯誤訊息
 * @param rowNumber 列號
 * @param field 欄位名稱
 * @param message 錯誤訊息
 * @returns 格式化的錯誤訊息
 */
export function formatImportError(rowNumber: number, field: string, message: string): string {
  return `第 ${rowNumber} 列: ${field} - ${message}`;
}
