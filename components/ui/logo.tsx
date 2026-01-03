import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  variant?: 'full' | 'icon';
  className?: string;
  href?: string;
}

export function Logo({ variant = 'full', className = '', href = '/store' }: LogoProps) {
  const logoSrc = variant === 'full' ? '/logo.svg' : '/logo-icon.svg';
  const logoAlt = 'Vsale';
  const width = variant === 'full' ? 200 : 60;
  const height = 60;

  return (
    <Link href={href} className={`inline-block ${className}`}>
      <Image
        src={logoSrc}
        alt={logoAlt}
        width={width}
        height={height}
        priority
        className="h-auto w-auto"
      />
    </Link>
  );
}
