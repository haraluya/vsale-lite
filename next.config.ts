import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // 提升至 5MB 以支援圖片上傳
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // ⭐ 優化：圖片格式優化（WebP 自動轉換）
    formats: ['image/webp', 'image/avif'], // 優先使用 WebP 與 AVIF 格式
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // 響應式圖片尺寸
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // 小圖示尺寸
    minimumCacheTTL: 60, // 快取時間（秒）
    // ⭐ 優化：圖片品質設定
    // - WebP 品質 80%（平衡檔案大小與視覺品質）
    // - 預期效果：圖片大小減少 30-50%
  },
}

export default nextConfig
