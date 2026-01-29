// =====================================================
// 條件驗證函式：組合優惠系統
// Feature: 021-combo-deals
// Created: 2026-01-29
// =====================================================

import type {
  ComboDeal,
  ComboDealWithDetails,
  SelectedProduct,
  ComboDealValidationResult,
  ComboMode,
} from '@/types/combo-deals';

// -----------------------------------------------------
// 組合條件驗證主函式
// -----------------------------------------------------

/**
 * 驗證客戶選擇的商品是否滿足組合優惠條件
 * @param selectedProducts - 選擇的商品列表
 * @param comboDeal - 組合優惠資料（含系列資訊）
 * @returns 驗證結果
 */
export function validateComboDealSelection(
  selectedProducts: SelectedProduct[],
  comboDeal: ComboDealWithDetails
): ComboDealValidationResult {
  // 檢查是否有選擇商品
  if (selectedProducts.length === 0) {
    return {
      valid: false,
      message: '請選擇商品以完成組合優惠',
    };
  }

  // 根據組合模式執行對應的驗證
  if (comboDeal.combo_mode === 'each') {
    return validateEachModeSelection(selectedProducts, comboDeal);
  } else {
    return validateMixMatchModeSelection(selectedProducts, comboDeal);
  }
}

// -----------------------------------------------------
// 各選模式驗證
// -----------------------------------------------------

/**
 * 驗證各選模式的商品選擇
 * 規則：每個系列必須恰好選擇 required_quantity 個商品
 * @param selectedProducts - 選擇的商品列表
 * @param comboDeal - 組合優惠資料
 * @returns 驗證結果
 */
export function validateEachModeSelection(
  selectedProducts: SelectedProduct[],
  comboDeal: ComboDealWithDetails
): ComboDealValidationResult {
  // 檢查每個系列的選擇數量
  for (const series of comboDeal.series) {
    const seriesProducts = selectedProducts.filter(p => p.series_id === series.series_id);
    const totalQuantity = seriesProducts.reduce((sum, p) => sum + p.quantity, 0);
    const requiredQuantity = series.required_quantity || 0;

    if (totalQuantity < requiredQuantity) {
      return {
        valid: false,
        message: `請從「${series.series_name}」選擇 ${requiredQuantity} 個商品（目前已選 ${totalQuantity} 個）`,
      };
    }

    if (totalQuantity > requiredQuantity) {
      return {
        valid: false,
        message: `「${series.series_name}」已超過數量限制（需要 ${requiredQuantity} 個，目前已選 ${totalQuantity} 個）`,
      };
    }
  }

  // 檢查是否有選擇不屬於任何系列的商品
  const validSeriesIds = comboDeal.series.map(s => s.series_id);
  const invalidProducts = selectedProducts.filter(p => !validSeriesIds.includes(p.series_id));
  if (invalidProducts.length > 0) {
    return {
      valid: false,
      message: '選擇的商品中包含不屬於此組合優惠的商品',
    };
  }

  return {
    valid: true,
  };
}

// -----------------------------------------------------
// 任選模式驗證
// -----------------------------------------------------

/**
 * 驗證任選模式的商品選擇
 * 規則：從所有系列中任選，總數量必須恰好等於 total_quantity
 * @param selectedProducts - 選擇的商品列表
 * @param comboDeal - 組合優惠資料
 * @returns 驗證結果
 */
export function validateMixMatchModeSelection(
  selectedProducts: SelectedProduct[],
  comboDeal: ComboDealWithDetails
): ComboDealValidationResult {
  const totalQuantity = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
  const requiredTotalQuantity = comboDeal.mix_match_total_quantity || 0;

  if (totalQuantity < requiredTotalQuantity) {
    return {
      valid: false,
      message: `請再選擇 ${requiredTotalQuantity - totalQuantity} 個商品以完成組合（需要 ${requiredTotalQuantity} 個）`,
    };
  }

  if (totalQuantity > requiredTotalQuantity) {
    return {
      valid: false,
      message: `已超過組合數量限制（需要 ${requiredTotalQuantity} 個，目前已選 ${totalQuantity} 個）`,
    };
  }

  // 檢查是否所有選擇的商品都屬於組合優惠的系列
  const validSeriesIds = comboDeal.series.map(s => s.series_id);
  const invalidProducts = selectedProducts.filter(p => !validSeriesIds.includes(p.series_id));
  if (invalidProducts.length > 0) {
    return {
      valid: false,
      message: '選擇的商品中包含不屬於此組合優惠的商品',
    };
  }

  return {
    valid: true,
  };
}

// -----------------------------------------------------
// 活動期間驗證
// -----------------------------------------------------

/**
 * 驗證組合優惠是否在有效期間內
 * @param comboDeal - 組合優惠資料
 * @param currentDate - 當前時間（選填，預設為 now）
 * @returns 驗證結果
 */
export function validateComboDealPeriod(
  comboDeal: Pick<ComboDeal, 'start_date' | 'end_date' | 'status'>,
  currentDate: Date = new Date()
): ComboDealValidationResult {
  // 檢查狀態
  if (comboDeal.status !== 'active') {
    return {
      valid: false,
      message: '此組合優惠目前無法使用',
    };
  }

  const startDate = new Date(comboDeal.start_date);
  const endDate = new Date(comboDeal.end_date);

  // 檢查是否在活動期間內
  if (currentDate < startDate) {
    return {
      valid: false,
      message: `活動尚未開始（開始時間：${startDate.toLocaleDateString('zh-TW')}）`,
    };
  }

  if (currentDate > endDate) {
    return {
      valid: false,
      message: `活動已結束（結束時間：${endDate.toLocaleDateString('zh-TW')}）`,
    };
  }

  return {
    valid: true,
  };
}

// -----------------------------------------------------
// 商品可用性驗證
// -----------------------------------------------------

/**
 * 驗證選擇的商品是否都存在於組合優惠中
 * @param selectedProducts - 選擇的商品列表
 * @param comboDeal - 組合優惠資料
 * @returns 驗證結果
 */
export function validateProductsAvailability(
  selectedProducts: SelectedProduct[],
  comboDeal: ComboDealWithDetails
): ComboDealValidationResult {
  // 建立組合優惠中所有可用商品的 ID 集合
  const availableProductIds = new Set<string>();
  comboDeal.series.forEach(series => {
    series.products.forEach(product => {
      availableProductIds.add(product.product_id);
    });
  });

  // 檢查所有選擇的商品是否都可用
  for (const selectedProduct of selectedProducts) {
    if (!availableProductIds.has(selectedProduct.product_id)) {
      return {
        valid: false,
        message: '選擇的商品中包含不可用的商品',
      };
    }
  }

  return {
    valid: true,
  };
}

// -----------------------------------------------------
// 完整驗證（所有條件）
// -----------------------------------------------------

/**
 * 執行完整驗證（組合條件 + 活動期間 + 商品可用性）
 * @param selectedProducts - 選擇的商品列表
 * @param comboDeal - 組合優惠資料
 * @param currentDate - 當前時間（選填）
 * @returns 驗證結果
 */
export function validateFullComboDeal(
  selectedProducts: SelectedProduct[],
  comboDeal: ComboDealWithDetails,
  currentDate?: Date
): ComboDealValidationResult {
  // 1. 驗證活動期間
  const periodValidation = validateComboDealPeriod(comboDeal, currentDate);
  if (!periodValidation.valid) {
    return periodValidation;
  }

  // 2. 驗證商品可用性
  const availabilityValidation = validateProductsAvailability(selectedProducts, comboDeal);
  if (!availabilityValidation.valid) {
    return availabilityValidation;
  }

  // 3. 驗證組合條件
  return validateComboDealSelection(selectedProducts, comboDeal);
}

// -----------------------------------------------------
// 輔助函式
// -----------------------------------------------------

/**
 * 計算系列的已選數量
 * @param selectedProducts - 選擇的商品列表
 * @param seriesId - 系列 ID
 * @returns 已選數量
 */
export function getSeriesSelectedQuantity(
  selectedProducts: SelectedProduct[],
  seriesId: string
): number {
  return selectedProducts
    .filter(p => p.series_id === seriesId)
    .reduce((sum, p) => sum + p.quantity, 0);
}

/**
 * 計算總已選數量
 * @param selectedProducts - 選擇的商品列表
 * @returns 總已選數量
 */
export function getTotalSelectedQuantity(selectedProducts: SelectedProduct[]): number {
  return selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
}

/**
 * 檢查是否可以新增更多商品
 * @param selectedProducts - 選擇的商品列表
 * @param comboDeal - 組合優惠資料
 * @param seriesId - 系列 ID（各選模式使用）
 * @returns 是否可新增
 */
export function canAddMore(
  selectedProducts: SelectedProduct[],
  comboDeal: ComboDealWithDetails,
  seriesId?: string
): boolean {
  if (comboDeal.combo_mode === 'each' && seriesId) {
    // 各選模式：檢查該系列是否已達上限
    const series = comboDeal.series.find(s => s.series_id === seriesId);
    if (!series) return false;

    const currentQuantity = getSeriesSelectedQuantity(selectedProducts, seriesId);
    return currentQuantity < (series.required_quantity || 0);
  } else if (comboDeal.combo_mode === 'mix_match') {
    // 任選模式：檢查總數量是否已達上限
    const totalQuantity = getTotalSelectedQuantity(selectedProducts);
    return totalQuantity < (comboDeal.mix_match_total_quantity || 0);
  }

  return false;
}
