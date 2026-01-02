import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // 提升至 5MB 以支援圖片上傳
    },
  },
}

export default nextConfig
