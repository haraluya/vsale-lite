// =====================================================
// 價格計算函式：組合優惠系統
// Feature: 021-combo-deals
// Created: 2026-01-29
// =====================================================

import type {
  ComboDeal,
  SelectedProduct,
  ComboDealPricing,
  ComboMode,
  DiscountType,
} from '@/types/combo-deals';

// -----------------------------------------------------
// 價格計算主函式
// -----------------------------------------------------

/**
 * 計算組合優惠的價格（使用價格映射表）
 * @param selectedProducts - 選擇的商品列表（含數量）
 * @param tierPrices - 商品等級價格映射表（product_id => price）
 * @param comboDeal - 組合優惠資料
 * @returns 價格計算結果
 */
export function calculateComboDealPrice(
  selectedProducts: SelectedProduct[],
  tierPrices: Map<string, number>,
  comboDeal: Pick<ComboDeal, 'discount_type' | 'discount_value'>
): ComboDealPricing;

/**
 * 計算組合優惠的價格（商品已包含價格）
 * @param selectedProducts - 選擇的商品列表（含數量、等級價格、零售價）
 * @param discountType - 折扣類型
 * @param discountValue - 折扣值
 * @returns 價格計算結果（含會員折扣明細）
 */
export function calculateComboDealPrice(
  selectedProducts: Array<{
    quantity: number;
    unit_price: number;
    retail_price?: number; // 🆕 零售價（選填，用於計算會員折扣）
  }>,
  discountType: DiscountType,
  discountValue: number
): ComboDealPricing;

/**
 * 計算組合優惠的價格（實作）
 */
export function calculateComboDealPrice(
  selectedProducts: any[],
  secondParam: any,
  thirdParam?: any
): ComboDealPricing {
  let tierPrice: number;
  let retailPrice: number;
  let discountType: DiscountType;
  let discountValue: number;

  // 判斷呼叫方式
  if (secondParam instanceof Map) {
    // 使用價格映射表
    const tierPrices = secondParam as Map<string, number>;
    const comboDeal = thirdParam as Pick<ComboDeal, 'discount_type' | 'discount_value'>;

    tierPrice = selectedProducts.reduce((sum, product) => {
      const price = tierPrices.get(product.product_id) || 0;
      return sum + price * product.quantity;
    }, 0);

    // 零售價（若未提供則等於等級價格）
    retailPrice = selectedProducts.reduce((sum, product) => {
      const price = product.retail_price || tierPrices.get(product.product_id) || 0;
      return sum + price * product.quantity;
    }, 0);

    discountType = comboDeal.discount_type;
    discountValue = comboDeal.discount_value;
  } else {
    // 商品已包含價格
    tierPrice = selectedProducts.reduce((sum, product) => {
      return sum + product.unit_price * product.quantity;
    }, 0);

    // 🆕 計算零售價（若有提供）
    retailPrice = selectedProducts.reduce((sum, product) => {
      const price = product.retail_price || product.unit_price;
      return sum + price * product.quantity;
    }, 0);

    discountType = secondParam as DiscountType;
    discountValue = thirdParam as number;
  }

  // 計算會員折扣
  const memberDiscount = retailPrice - tierPrice;

  // 套用組合優惠折扣
  const { discountedPrice, discountAmount } = applyDiscount(
    tierPrice,
    discountType,
    discountValue
  );

  return {
    // 🆕 完整價格結構
    retailPrice: Math.round(retailPrice),
    memberDiscount: Math.round(memberDiscount),
    tierPrice: Math.round(tierPrice),
    comboDealDiscount: Math.round(discountAmount),
    finalPrice: Math.round(discountedPrice),

    // 🔧 向後相容欄位
    originalPrice: Math.round(tierPrice),
    discountedPrice: Math.round(discountedPrice),
    discountAmount: Math.round(discountAmount),
  };
}

/**
 * 計算組合優惠價格（各選模式）
 * 此函式為向後相容，實際使用 calculateComboDealPrice
 */
export function calculateEachModePricing(
  selectedProducts: SelectedProduct[],
  tierPrices: Map<string, number>,
  discountType: DiscountType,
  discountValue: number
): ComboDealPricing {
  return calculateComboDealPrice(selectedProducts, tierPrices, {
    discount_type: discountType,
    discount_value: discountValue,
  });
}

/**
 * 計算組合優惠價格（任選模式）
 * 此函式為向後相容，實際使用 calculateComboDealPrice
 */
export function calculateMixMatchModePricing(
  selectedProducts: SelectedProduct[],
  tierPrices: Map<string, number>,
  discountType: DiscountType,
  discountValue: number
): ComboDealPricing {
  return calculateComboDealPrice(selectedProducts, tierPrices, {
    discount_type: discountType,
    discount_value: discountValue,
  });
}

// -----------------------------------------------------
// 折扣計算輔助函式
// -----------------------------------------------------

/**
 * 套用折扣（固定折價或百分比折扣）
 * @param originalPrice - 原價
 * @param discountType - 折扣類型
 * @param discountValue - 折扣值
 * @returns 折扣後價格和折扣金額
 */
export function applyDiscount(
  originalPrice: number,
  discountType: DiscountType,
  discountValue: number
): { discountedPrice: number; discountAmount: number } {
  let discountedPrice: number;
  let discountAmount: number;

  if (discountType === 'fixed') {
    // 固定折價
    discountAmount = Math.min(discountValue, originalPrice); // 折扣不得超過原價
    discountedPrice = Math.max(0, originalPrice - discountValue);
  } else {
    // 百分比折扣（discountValue 是折扣百分比，例如 20 表示 20% off）
    discountAmount = (originalPrice * discountValue) / 100;
    discountedPrice = originalPrice - discountAmount;
  }

  return {
    discountedPrice: Math.max(0, discountedPrice), // 確保不為負數
    discountAmount: Math.max(0, discountAmount),
  };
}

// -----------------------------------------------------
// 優惠券疊加計算
// -----------------------------------------------------

/**
 * 計算優惠券疊加後的最終價格
 * 計算順序：組合優惠折扣 → 優惠券折扣
 * @param comboDealPrice - 組合優惠折扣後價格
 * @param couponDiscountType - 優惠券折扣類型
 * @param couponDiscountValue - 優惠券折扣值
 * @returns 最終價格和優惠券折扣金額
 */
export function applyCouponToComboDealprice(
  comboDealPrice: number,
  couponDiscountType: DiscountType,
  couponDiscountValue: number
): { finalPrice: number; couponDiscountAmount: number } {
  const { discountedPrice, discountAmount } = applyDiscount(
    comboDealPrice,
    couponDiscountType,
    couponDiscountValue
  );

  return {
    finalPrice: Math.round(discountedPrice),
    couponDiscountAmount: Math.round(discountAmount),
  };
}

// -----------------------------------------------------
// 價格計算驗證
// -----------------------------------------------------

/**
 * 驗證價格計算結果的合理性
 * @param pricing - 價格計算結果
 * @returns 是否合理
 */
export function validatePricing(pricing: ComboDealPricing): boolean {
  // 基本驗證
  if (pricing.originalPrice < 0 || pricing.discountedPrice < 0 || pricing.discountAmount < 0) {
    return false;
  }

  // 折扣金額不應超過原價
  if (pricing.discountAmount > pricing.originalPrice) {
    return false;
  }

  // 折扣後價格應等於原價減折扣金額
  const expectedDiscountedPrice = pricing.originalPrice - pricing.discountAmount;
  if (Math.abs(pricing.discountedPrice - expectedDiscountedPrice) > 0.01) {
    return false;
  }

  return true;
}

// -----------------------------------------------------
// 格式化顯示
// -----------------------------------------------------

/**
 * 格式化折扣顯示文字
 * @param discountType - 折扣類型
 * @param discountValue - 折扣值
 * @returns 格式化文字
 */
export function formatDiscountLabel(discountType: DiscountType, discountValue: number): string {
  if (discountType === 'fixed') {
    return `省 $${Math.round(discountValue)}`;
  } else {
    // 將百分比轉換為折扣（例如 20% off = 8折）
    const discountPercent = Math.round(discountValue);
    const discountRate = (100 - discountPercent) / 10;
    return `${discountRate} 折`;
  }
}

/**
 * 格式化價格顯示
 * @param price - 價格
 * @returns 格式化文字
 */
export function formatPrice(price: number): string {
  return `$${Math.round(price).toLocaleString('zh-TW')}`;
}
