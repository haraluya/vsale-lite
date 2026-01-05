import { z } from 'zod'

// 設定單一商品價格
export const setTierPriceSchema = z.object({
  product_id: z.string().uuid("商品 ID 格式錯誤"),
  tier_id: z.string().uuid("等級 ID 格式錯誤"),
  price: z.number().min(0, "價格不可為負數").nullable()
})

// 批量設定價格
export const batchSetTierPricesSchema = z.object({
  prices: z.array(
    z.object({
      product_id: z.string().uuid(),
      tier_id: z.string().uuid(),
      price: z.number().min(0).nullable()
    })
  ).min(1, "至少需要設定一個價格")
})

export type SetTierPriceInput = z.infer<typeof setTierPriceSchema>
export type BatchSetTierPricesInput = z.infer<typeof batchSetTierPricesSchema>
