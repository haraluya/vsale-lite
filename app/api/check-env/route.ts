/**
 * 環境變數檢查 API
 * 用於診斷 Vercel 生產環境是否正確設定 Cloudinary 環境變數
 */

import { NextResponse } from 'next/server'
import cloudinaryLoader from '@/lib/cloudinary-loader'

export const dynamic = 'force-dynamic'

export async function GET() {
  // 檢查環境變數
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  // 測試三個站點的路徑
  const testPaths = [
    'vsale/series/test-id',
    'vsale-site2/series/test-id',
    'vsale-site3/series/test-id',
  ]

  const testResults = testPaths.map(path => {
    try {
      const url = cloudinaryLoader({ src: path, width: 640, quality: 80 })
      return {
        path,
        url,
        success: url.includes('dq3e7q3aq'),
      }
    } catch (error) {
      return {
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }
    }
  })

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    cloudinaryCloudName: cloudName || 'NOT_SET',
    isConfigured: !!cloudName && cloudName === 'dq3e7q3aq',
    testResults,
  })
}
