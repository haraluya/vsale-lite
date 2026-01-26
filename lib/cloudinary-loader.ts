/**
 * Cloudinary 自定義 Image Loader
 * 用於 Next.js 15 (內建 loader 選項已移除)
 *
 * 轉換 Cloudinary public_id → 完整 CDN URL
 * 範例：vsale/home-blocks/xxx → https://res.cloudinary.com/dq3e7q3aq/image/upload/w_640,f_auto,q_auto/vsale/home-blocks/xxx
 */

export interface CloudinaryLoaderParams {
  src: string
  width: number
  quality?: number
}

export default function cloudinaryLoader({ src, width, quality }: CloudinaryLoaderParams): string {
  // 如果已經是完整 URL，直接返回
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src
  }

  // Cloudinary Cloud Name
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dq3e7q3aq'

  // 建構優化參數
  const params = [
    `w_${width}`, // 響應式寬度
    'f_auto', // 自動格式選擇（WebP/AVIF）
    `q_${quality || 'auto'}`, // 品質自動優化
  ]

  // 建構完整 URL
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`
  const transformations = params.join(',')

  return `${baseUrl}/${transformations}/${src}`
}
