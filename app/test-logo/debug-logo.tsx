'use client'

/**
 * Logo 元件除錯版本
 * 顯示完整的載入流程與狀態
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface DebugLogoProps {
  variant?: 'full' | 'icon'
}

export function DebugLogo({ variant = 'full' }: DebugLogoProps) {
  const defaultLogoUrl = variant === 'icon' ? '/logo-icon.svg' : '/logo.svg'
  const [logoUrl, setLogoUrl] = useState(defaultLogoUrl)
  const [loading, setLoading] = useState(true)
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('[DebugLogo] 開始載入 Logo，variant:', variant)
    console.log('[DebugLogo] 預設 Logo URL:', defaultLogoUrl)

    setLoading(true)
    fetch('/api/public-settings', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
      .then((res) => {
        console.log('[DebugLogo] API 回應狀態:', res.status)
        return res.json()
      })
      .then((data) => {
        console.log('[DebugLogo] API 回應資料:', data)
        setApiResponse(data)

        const settings = data.settings || []
        const logoSetting = settings.find((s: any) => s.key === 'logo_url')
        console.log('[DebugLogo] 找到的 logo_url 設定:', logoSetting)

        if (logoSetting?.value && typeof logoSetting.value === 'string' && logoSetting.value.trim()) {
          console.log('[DebugLogo] 使用自訂 Logo:', logoSetting.value)
          setLogoUrl(logoSetting.value)
        } else {
          console.log('[DebugLogo] 使用預設 Logo:', defaultLogoUrl)
          setLogoUrl(defaultLogoUrl)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('[DebugLogo] API 呼叫失敗:', err)
        setError(err.message)
        setLogoUrl(defaultLogoUrl)
        setLoading(false)
      })
  }, [defaultLogoUrl, variant])

  const logoAlt = 'Vsale'
  const width = variant === 'full' ? 200 : 60
  const height = 60

  return (
    <div className="space-y-4">
      {/* Logo 圖片 */}
      <div className="rounded-none border-2 border-gray-300 bg-gray-50 p-4">
        <Link href="#" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={logoAlt}
            width={width}
            height={height}
            style={{ maxWidth: width, maxHeight: height }}
            className="h-auto w-auto object-contain"
            onError={(e) => {
              console.error('[DebugLogo] 圖片載入失敗:', logoUrl)
              setError('圖片載入失敗: ' + logoUrl)
            }}
            onLoad={() => {
              console.log('[DebugLogo] 圖片載入成功:', logoUrl)
            }}
          />
        </Link>
      </div>

      {/* 除錯資訊 */}
      <div className="rounded-none border-2 border-gray-300 bg-white p-4 text-xs font-mono">
        <div className="space-y-2">
          <div>
            <strong>Variant:</strong> {variant}
          </div>
          <div>
            <strong>預設 Logo URL:</strong> {defaultLogoUrl}
          </div>
          <div>
            <strong>當前 Logo URL:</strong> {logoUrl}
          </div>
          <div>
            <strong>載入狀態:</strong> {loading ? '載入中...' : '已完成'}
          </div>
          {error && (
            <div className="text-red-600">
              <strong>錯誤:</strong> {error}
            </div>
          )}
          {apiResponse && (
            <div>
              <strong>API 回應:</strong>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-100 p-2">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
