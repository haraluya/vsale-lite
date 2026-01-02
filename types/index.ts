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
  is_protected?: boolean  // 🆕 Feature 003 Enhancement: 系統預設等級保護
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

// 當前使用者資訊 (Feature 003)
export type CurrentUser = {
  id: string
  phone: string | null
  email: string | null
  tier_id: string | null
  tier_name: string | null
  role: 'client' | 'admin'
  created_at: string
}

// ===================================
// 商品管理型別 (Feature 002 & 003)
// ===================================

// 商品分類
export type Category = {
  id: string
  name: string
  code: string  // 🆕 Feature 003: 分類代碼 (如 DRK, SNK)
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// 商品系列 (Feature 003)
export type Series = {
  id: string
  category_id: string | null
  name: string
  description: string | null
  image_url: string | null
  status: 'active' | 'inactive'
  sort_order: number
  created_at: string
  updated_at: string
}

// 商品
export type Product = {
  id: string
  code: string
  name: string
  series_id: string  // 🔄 Feature 003: 改為關聯系列 (取代 category_id)
  series_name?: string  // JOIN 查詢時包含
  description: string | null
  retail_price: number | null  // 🆕 Feature 003: 原價/建議售價
  stock: number
  stock_status: 'sufficient' | 'low' | 'out_of_stock'  // 🆕 Feature 003: 庫存狀態
  unit: string
  image_url: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

// 等級價格 (Feature 003)
export type TierPrice = {
  id: string
  tier_id: string
  product_id: string
  price: number
  created_at: string
  updated_at: string
}

// 商品含價格 (前台使用, Feature 003)
export type ProductWithPrice = Product & {
  user_price: number | null  // 當前用戶等級價格
}

// 等級含價格 (價格設定表格使用, Feature 003)
export type TierWithPrice = {
  tier_id: string
  tier_name: string
  tier_rank: number
  price: number | null
  price_id: string | null
}

// 商品含所有等級價格 (系列批量價格設定使用, Feature 003 Enhancement)
export type ProductWithAllTierPrices = Product & {
  tier_prices: {
    tier_id: string
    tier_name: string
    tier_rank: number
    price: number | null
    is_protected?: boolean  // 標記零售等級
  }[]
}

// 商品列表查詢參數
export type GetProductsParams = {
  search?: string         // 商品編號或名稱關鍵字
  series_id?: string      // 🔄 Feature 003: 改為系列篩選 (取代 category_id)
  status?: 'active' | 'inactive' | 'all'  // 狀態篩選 (Admin only)
  page?: number           // 頁碼 (預設 1)
  limit?: number          // 每頁筆數 (預設 20)
}

// 商品列表回應
export type GetProductsResponse = {
  products: Product[]
  total: number
  page: number
  limit: number
}
