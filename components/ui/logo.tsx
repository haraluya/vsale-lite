'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface LogoProps {
  variant?: 'full' | 'icon'
  className?: string
  href?: string
}

export function Logo({ variant = 'full', className = '', href = '/store' }: LogoProps) {
  const [logoUrl, setLogoUrl] = useState('/logo.svg')
  const [imageKey, setImageKey] = useState(Date.now())

  useEffect(() => {
    // 從 API 讀取 Logo URL（禁用快取）
    fetch('/api/public-settings', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const settings = data.settings || []
        const logoSetting = settings.find((s: any) => s.key === 'logo_url')
        // 僅當有有效的 URL 時才更新（非空字串且不是純空白）
        if (logoSetting?.value && typeof logoSetting.value === 'string' && logoSetting.value.trim()) {
          // 加上時間戳來強制重新載入圖片
          const urlWithTimestamp = logoSetting.value.includes('?')
            ? `${logoSetting.value}&t=${Date.now()}`
            : `${logoSetting.value}?t=${Date.now()}`
          setLogoUrl(urlWithTimestamp)
          setImageKey(Date.now())
        }
        // 如果 logo_url 為空，保持使用預設的 /logo.svg（不做任何更新）
      })
      .catch((err) => {
        console.error('Failed to load logo:', err)
        // 載入失敗時也保持使用預設 Logo
      })
  }, [])

  const logoAlt = 'Vsale'
  const width = variant === 'full' ? 200 : 60
  const height = 60

  return (
    <Link href={href} className={`inline-block ${className}`}>
      <Image
        key={imageKey}
        src={logoUrl}
        alt={logoAlt}
        width={width}
        height={height}
        priority
        className="h-auto w-auto"
        unoptimized={logoUrl.startsWith('http')}
      />
    </Link>
  )
}
