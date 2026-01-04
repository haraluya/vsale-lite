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

  useEffect(() => {
    // 從 API 讀取 Logo URL
    fetch('/api/public-settings')
      .then((res) => res.json())
      .then((data) => {
        const settings = data.settings || []
        const logoSetting = settings.find((s: any) => s.key === 'logo_url')
        if (logoSetting?.value && typeof logoSetting.value === 'string') {
          setLogoUrl(logoSetting.value)
        }
      })
      .catch((err) => {
        console.error('Failed to load logo:', err)
      })
  }, [])

  const logoAlt = 'Vsale'
  const width = variant === 'full' ? 200 : 60
  const height = 60

  return (
    <Link href={href} className={`inline-block ${className}`}>
      <Image
        src={logoUrl}
        alt={logoAlt}
        width={width}
        height={height}
        priority
        className="h-auto w-auto"
      />
    </Link>
  )
}
