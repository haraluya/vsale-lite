'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface LogoProps {
  variant?: 'full' | 'icon'
  className?: string
  href?: string
}

export function Logo({ variant = 'full', className = '', href = '/store' }: LogoProps) {
  // 根據 variant 選擇預設 Logo
  const defaultLogoUrl = variant === 'icon' ? '/logo-icon.svg' : '/logo.svg'
  const [logoUrl, setLogoUrl] = useState(defaultLogoUrl)

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
        // 根據 variant 選擇對應的設定鍵值
        const settingKey = variant === 'icon' ? 'logo_icon_url' : 'logo_url'
        const logoSetting = settings.find((s: any) => s.key === settingKey)
        // 僅當有有效的 URL 時才更新（非空字串且不是純空白）
        if (logoSetting?.value && typeof logoSetting.value === 'string' && logoSetting.value.trim()) {
          setLogoUrl(logoSetting.value)
        } else {
          // 如果設定為空，使用對應的預設 Logo
          setLogoUrl(defaultLogoUrl)
        }
      })
      .catch((err) => {
        console.error('Failed to load logo:', err)
        // 載入失敗時使用預設 Logo
        setLogoUrl(defaultLogoUrl)
      })
  }, [defaultLogoUrl, variant])

  const logoAlt = 'Vsale'
  const width = variant === 'full' ? 200 : 60
  const height = 60

  return (
    <Link href={href} className={`inline-block ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={logoAlt}
        width={width}
        height={height}
        style={{ width: `${width}px`, height: `${height}px`, display: 'block' }}
        className="object-contain"
      />
    </Link>
  )
}
