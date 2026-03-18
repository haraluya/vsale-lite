import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '3mb', // 提升至 3MB 以支援圖片上傳
    },
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },
  images: {
    // ✅ 使用自定義 Cloudinary loader（Next.js 15 已移除內建 loader）
    loaderFile: './lib/cloudinary-loader.ts',

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

export default withSerwist(nextConfig)
