// ===================================
// 通用型別定義
// ===================================

// Server Action 回應格式
export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; errors?: Record<string, string[]>; message: string }

// 認證上下文
export type AuthContext = {
  userId: string
  role: 'client' | 'admin'
  tierId?: string  // 僅客戶有
}

// ===================================
// 資料庫實體型別
// ===================================

// 會員等級
export type Tier = {
  id: string
  name: string
  rank: number
  created_at: string
  updated_at: string
}

// 使用者 Profile
export type Profile = {
  id: string
  phone: string | null
  email: string | null
  role: 'client' | 'admin'
  tier_id: string | null
  created_at: string
  display_name: string | null
  notes: string | null
}

// 客戶 (含等級資訊)
export type Client = {
  id: string
  phone: string
  display_name?: string | null
  role: 'client' | 'admin'
  tier_id: string | null
  tier_name?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

// ===================================
// API 查詢參數型別
// ===================================

// 客戶列表查詢參數
export type GetClientsParams = {
  search?: string       // 手機號碼關鍵字
  tier_id?: string      // 等級篩選
  limit?: number        // 每頁筆數 (預設 20)
  offset?: number       // 偏移量 (預設 0)
}

// 客戶列表回應
export type GetClientsResponse = {
  data: Client[]
  total: number
}
