import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // 提升至 5MB 以支援圖片上傳
    },
  },
  images: {
    // ✅ 啟用 Cloudinary loader（圖片已遷移到 Cloudinary）
    loader: 'cloudinary',
    path: 'https://res.cloudinary.com/dq3e7q3aq/image/upload/',

    // 支援 Cloudinary 與 Supabase 圖片
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],

    // 保留小圖示尺寸配置
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

export default nextConfig
