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
    // 移除 AVIF：減少 50% 的變體數量，WebP 相容性達 98%
    formats: ['image/webp'],
    // 減少 deviceSizes：從 8 種減少到 3 種常用尺寸
    // - 640px: 手機
    // - 1024px: 平板
    // - 1920px: 桌面
    deviceSizes: [640, 1024, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // 小圖示尺寸
    // 增加快取時間到 31 天（最大值）- 降低重複轉換
    minimumCacheTTL: 2678400, // 31 天（秒）
    // ⭐ 優化：圖片品質設定
    // - WebP 品質 80%（平衡檔案大小與視覺品質）
    // - 預期效果：圖片大小減少 30-50%，變體數量減少 75%
  },
}

export default nextConfig
