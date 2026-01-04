import Image from 'next/image'
import Link from 'next/link'
import { getPublicSettings } from '@/lib/actions/system'

interface LogoProps {
  variant?: 'full' | 'icon'
  className?: string
  href?: string
}

export async function Logo({ variant = 'full', className = '', href = '/store' }: LogoProps) {
  // 從資料庫讀取 Logo URL
  const settingsResult = await getPublicSettings()
  const settings = settingsResult.success ? settingsResult.data : []

  const logoUrlSetting = settings?.find((s) => s.key === 'logo_url')?.value
  const logoUrl = typeof logoUrlSetting === 'string' && logoUrlSetting ? logoUrlSetting : '/logo.svg'

  const logoAlt = 'Vsale'
  const width = variant === 'full' ? 200 : 60
  const height = 60

  return (
    <Link href={href} className={`inline-block ${className}`}>
      <Image src={logoUrl} alt={logoAlt} width={width} height={height} priority className="h-auto w-auto" />
    </Link>
  )
}
