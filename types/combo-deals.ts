// =====================================================
// TypeScript Types: 組合優惠系統
// Feature: 021-combo-deals
// Created: 2026-01-29
// =====================================================

// -----------------------------------------------------
// Enums
// -----------------------------------------------------

export type ComboMode = 'each' | 'mix_match';
export type DiscountType = 'fixed' | 'percentage';
export type ComboDealStatus = 'active' | 'inactive' | 'ended';

// -----------------------------------------------------
// Database Entities
// -----------------------------------------------------

export interface ComboDeal {
  id: string;
  name: string;
  poster_url: string;
  combo_mode: ComboMode;
  discount_type: DiscountType;
  discount_value: number;
  start_date: string; // ISO 8601
  end_date: string; // ISO 8601
  status: ComboDealStatus;
  display_order: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ComboDealSeries {
  id: string;
  combo_deal_id: string;
  series_id: string;
  required_quantity: number | null; // NULL for mix_match mode
  display_order: number;
}

export interface ComboDealTier {
  id: string;
  combo_deal_id: string;
  tier_id: string;
}

export interface ComboDealMixMatchConfig {
  combo_deal_id: string;
  total_quantity: number;
}

export interface OrderComboDealItem {
  id: string;
  order_id: string;
  combo_deal_id: string | null; // NULL if combo deal deleted
  combo_deal_snapshot: ComboDealSnapshot;
  product_ids: string[];
  original_price: number;
  discounted_price: number;
  discount_amount: number;
  created_at: string;
}

export interface CouponComboRestriction {
  id: string;
  coupon_id: string;
  combo_deal_id: string | null; // NULL = all combo deals
}

// -----------------------------------------------------
// Composite Types (with relations)
// -----------------------------------------------------

export interface ComboDealWithDetails extends ComboDeal {
  series: Array<{
    series_id: string;
    series_name: string;
    required_quantity: number | null;
    display_order: number;
    products: Array<{
      product_id: string;
      product_name: string;
      product_code?: string;
      product_image?: string;
      tier_price: number;
      retail_price: number; // 🆕 零售價（顯示會員折扣力度）
      stock: number;
      stock_status: 'sufficient' | 'low' | 'out_of_stock'; // 🆕 庫存狀態標籤
    }>;
  }>;
  tiers: Array<{
    tier_id: string;
    tier_name: string;
  }>;
  mix_match_total_quantity?: number;
}

// -----------------------------------------------------
// JSONB Snapshot Type (stored in orders)
// -----------------------------------------------------

export interface ComboDealSnapshot {
  combo_deal_id: string;
  name: string;
  combo_mode: ComboMode;
  discount_type: DiscountType;
  discount_value: number;
  series: Array<{
    series_id: string;
    series_name: string;
    required_quantity: number | null;
    display_order: number;
    products: Array<{
      product_id: string;
      product_name: string;
      product_code?: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
  }>;
  mix_match_total_quantity?: number;
  original_price: number;
  discounted_price: number;
  discount_amount: number;
  snapshot_created_at: string; // ISO 8601
}

// -----------------------------------------------------
// Client-Side Types
// -----------------------------------------------------

export interface ComboDealCardData {
  id: string;
  name: string;
  poster_url: string;
  combo_mode: ComboMode;
  discount_type: DiscountType;
  discount_value: number;
  start_date: string;
  end_date: string;
  display_order: number | null;
}

export interface SelectedProduct {
  product_id: string;
  series_id: string;
  quantity: number;
}

export interface ComboDealPricing {
  // 🆕 完整價格結構（顯示會員折扣力度）
  retailPrice: number;        // 零售價總計
  memberDiscount: number;     // 會員折扣金額
  tierPrice: number;          // 等級價格總計
  comboDealDiscount: number;  // 組合優惠折扣金額
  finalPrice: number;         // 最終價格

  // 🔧 向後相容欄位（避免破壞現有代碼）
  originalPrice: number;      // = tierPrice
  discountedPrice: number;    // = finalPrice
  discountAmount: number;     // = comboDealDiscount
}

export interface ComboDealValidationResult {
  valid: boolean;
  message?: string;
}

// -----------------------------------------------------
// Form Types
// -----------------------------------------------------

export interface ComboDealFormSeries {
  series_id: string;
  required_quantity?: number; // Optional for mix_match mode
  display_order: number;
}

export interface ComboDealFormData {
  name: string;
  poster_url: string;
  combo_mode: ComboMode;
  discount_type: DiscountType;
  discount_value: number;
  start_date: Date;
  end_date: Date;
  series: ComboDealFormSeries[];
  tier_ids: string[];
  mix_match_total_quantity?: number; // Required for mix_match mode
  display_order?: number; // 全域顯示順位（選填）
}

// -----------------------------------------------------
// Server Action Result Types
// -----------------------------------------------------

export interface CreateComboDealResult {
  success: boolean;
  data?: {
    id: string;
    name: string;
  };
  error?: string;
}

export interface UpdateComboDealResult {
  success: boolean;
  data?: {
    id: string;
  };
  error?: string;
}

export interface DeleteComboDealResult {
  success: boolean;
  hasOrders?: boolean;
  orderCount?: number;
  error?: string;
}

// -----------------------------------------------------
// List & Filter Types
// -----------------------------------------------------

export interface ComboDealListFilters {
  status?: ComboDealStatus;
  tier_id?: string;
  search?: string;
}

export interface ComboDealListItem {
  id: string;
  name: string;
  poster_url: string;
  combo_mode: ComboMode;
  discount_type: DiscountType;
  discount_value: number;
  start_date: string;
  end_date: string;
  status: ComboDealStatus;
  series_count: number;
  tier_names: string;
  created_by_name?: string;
}
