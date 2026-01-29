// =====================================================
// 訂單快照序列化函式：組合優惠系統
// Feature: 021-combo-deals
// Created: 2026-01-29
// =====================================================

import type {
  ComboDeal,
  ComboDealWithDetails,
  ComboDealSnapshot,
  SelectedProduct,
} from '@/types/combo-deals';

// -----------------------------------------------------
// 快照建立主函式
// -----------------------------------------------------

/**
 * 建立組合優惠訂單快照（JSONB）
 * 包含完整的組合資訊、選擇的商品、價格計算結果
 * 即使組合優惠或商品被刪除，訂單仍可正確顯示
 *
 * @param comboDeal - 組合優惠資料（含系列和商品）
 * @param selectedProducts - 客戶選擇的商品列表
 * @param tierPrices - 商品等級價格映射表（product_id => price）
 * @param pricing - 價格計算結果（原價、折扣價、折扣金額）
 * @returns JSONB 快照物件
 */
export function createComboDealSnapshot(
  comboDeal: ComboDealWithDetails,
  selectedProducts: SelectedProduct[],
  tierPrices: Map<string, number>,
  pricing: {
    originalPrice: number;
    discountedPrice: number;
    discountAmount: number;
  }
): ComboDealSnapshot {
  // 建立系列快照（僅包含有選擇商品的系列）
  const seriesSnapshots = comboDeal.series
    .map(series => {
      // 篩選此系列的商品
      const seriesSelectedProducts = selectedProducts.filter(
        sp => sp.series_id === series.series_id
      );

      // 若此系列無選擇商品，跳過
      if (seriesSelectedProducts.length === 0) {
        return null;
      }

      // 建立商品快照
      const productSnapshots = seriesSelectedProducts.map(sp => {
        const product = series.products.find(p => p.product_id === sp.product_id);
        const unitPrice = tierPrices.get(sp.product_id) || 0;

        return {
          product_id: sp.product_id,
          product_name: product?.product_name || 'Unknown Product',
          product_code: product?.product_code,
          quantity: sp.quantity,
          unit_price: Math.round(unitPrice),
          subtotal: Math.round(unitPrice * sp.quantity),
        };
      });

      return {
        series_id: series.series_id,
        series_name: series.series_name,
        required_quantity: series.required_quantity,
        display_order: series.display_order,
        products: productSnapshots,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null); // 移除 null 值

  // 建立完整快照
  const snapshot: ComboDealSnapshot = {
    combo_deal_id: comboDeal.id,
    name: comboDeal.name,
    combo_mode: comboDeal.combo_mode,
    discount_type: comboDeal.discount_type,
    discount_value: comboDeal.discount_value,
    series: seriesSnapshots,
    mix_match_total_quantity: comboDeal.mix_match_total_quantity,
    original_price: Math.round(pricing.originalPrice),
    discounted_price: Math.round(pricing.discountedPrice),
    discount_amount: Math.round(pricing.discountAmount),
    snapshot_created_at: new Date().toISOString(),
  };

  return snapshot;
}

// -----------------------------------------------------
// 快照驗證
// -----------------------------------------------------

/**
 * 驗證快照的完整性和合理性
 * @param snapshot - 快照物件
 * @returns 是否有效
 */
export function validateSnapshot(snapshot: ComboDealSnapshot): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 必填欄位檢查
  if (!snapshot.combo_deal_id) {
    errors.push('缺少 combo_deal_id');
  }
  if (!snapshot.name || snapshot.name.trim().length === 0) {
    errors.push('缺少 name');
  }
  if (!snapshot.combo_mode) {
    errors.push('缺少 combo_mode');
  }
  if (!snapshot.discount_type) {
    errors.push('缺少 discount_type');
  }
  if (snapshot.discount_value == null || snapshot.discount_value <= 0) {
    errors.push('discount_value 無效');
  }

  // 系列檢查
  if (!snapshot.series || snapshot.series.length === 0) {
    errors.push('缺少 series');
  } else {
    snapshot.series.forEach((series, index) => {
      if (!series.series_id) {
        errors.push(`系列 ${index + 1} 缺少 series_id`);
      }
      if (!series.series_name) {
        errors.push(`系列 ${index + 1} 缺少 series_name`);
      }
      if (!series.products || series.products.length === 0) {
        errors.push(`系列 ${index + 1} 缺少 products`);
      } else {
        series.products.forEach((product, pIndex) => {
          if (!product.product_id) {
            errors.push(`系列 ${index + 1} 商品 ${pIndex + 1} 缺少 product_id`);
          }
          if (!product.product_name) {
            errors.push(`系列 ${index + 1} 商品 ${pIndex + 1} 缺少 product_name`);
          }
          if (product.quantity == null || product.quantity <= 0) {
            errors.push(`系列 ${index + 1} 商品 ${pIndex + 1} quantity 無效`);
          }
          if (product.unit_price == null || product.unit_price < 0) {
            errors.push(`系列 ${index + 1} 商品 ${pIndex + 1} unit_price 無效`);
          }
          if (product.subtotal == null || product.subtotal < 0) {
            errors.push(`系列 ${index + 1} 商品 ${pIndex + 1} subtotal 無效`);
          }
        });
      }
    });
  }

  // 價格檢查
  if (snapshot.original_price == null || snapshot.original_price < 0) {
    errors.push('original_price 無效');
  }
  if (snapshot.discounted_price == null || snapshot.discounted_price < 0) {
    errors.push('discounted_price 無效');
  }
  if (snapshot.discount_amount == null || snapshot.discount_amount < 0) {
    errors.push('discount_amount 無效');
  }

  // 價格邏輯檢查
  if (snapshot.discount_amount > snapshot.original_price) {
    errors.push('discount_amount 超過 original_price');
  }
  const expectedDiscountedPrice = snapshot.original_price - snapshot.discount_amount;
  if (Math.abs(snapshot.discounted_price - expectedDiscountedPrice) > 1) {
    errors.push('價格計算不一致');
  }

  // 任選模式檢查
  if (snapshot.combo_mode === 'mix_match') {
    if (snapshot.mix_match_total_quantity == null || snapshot.mix_match_total_quantity <= 0) {
      errors.push('任選模式缺少 mix_match_total_quantity');
    }
  }

  // snapshot_created_at 檢查
  if (!snapshot.snapshot_created_at) {
    errors.push('缺少 snapshot_created_at');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// -----------------------------------------------------
// 快照顯示格式化
// -----------------------------------------------------

/**
 * 格式化快照為前台顯示格式
 * @param snapshot - 快照物件
 * @returns 格式化的顯示資料
 */
export function formatSnapshotForDisplay(snapshot: ComboDealSnapshot): {
  name: string;
  mode: string;
  discount: string;
  seriesList: Array<{
    seriesName: string;
    products: Array<{
      name: string;
      quantity: number;
      price: string;
    }>;
  }>;
  pricing: {
    original: string;
    discounted: string;
    discount: string;
  };
} {
  return {
    name: snapshot.name,
    mode: snapshot.combo_mode === 'each' ? '各選組合' : '任選組合',
    discount:
      snapshot.discount_type === 'fixed'
        ? `省 $${snapshot.discount_value}`
        : `${snapshot.discount_value}% off`,
    seriesList: snapshot.series.map(series => ({
      seriesName: series.series_name,
      products: series.products.map(product => ({
        name: product.product_name,
        quantity: product.quantity,
        price: `$${product.unit_price}`,
      })),
    })),
    pricing: {
      original: `$${snapshot.original_price}`,
      discounted: `$${snapshot.discounted_price}`,
      discount: `$${snapshot.discount_amount}`,
    },
  };
}

// -----------------------------------------------------
// 快照工具函式
// -----------------------------------------------------

/**
 * 從快照中提取所有商品 ID
 * @param snapshot - 快照物件
 * @returns 商品 ID 陣列
 */
export function extractProductIdsFromSnapshot(snapshot: ComboDealSnapshot): string[] {
  const productIds: string[] = [];

  snapshot.series.forEach(series => {
    series.products.forEach(product => {
      productIds.push(product.product_id);
    });
  });

  return productIds;
}

/**
 * 計算快照中的總商品數量
 * @param snapshot - 快照物件
 * @returns 總數量
 */
export function getTotalQuantityFromSnapshot(snapshot: ComboDealSnapshot): number {
  return snapshot.series.reduce((total, series) => {
    return (
      total +
      series.products.reduce((seriesTotal, product) => {
        return seriesTotal + product.quantity;
      }, 0)
    );
  }, 0);
}

/**
 * 檢查快照是否包含特定商品
 * @param snapshot - 快照物件
 * @param productId - 商品 ID
 * @returns 是否包含
 */
export function snapshotContainsProduct(snapshot: ComboDealSnapshot, productId: string): boolean {
  return snapshot.series.some(series =>
    series.products.some(product => product.product_id === productId)
  );
}
