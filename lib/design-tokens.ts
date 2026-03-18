/**
 * Vsale-lite 響應式設計 Token 系統
 * 統一定義所有設計變數,確保一致性
 */

export const designTokens = {
  container: {
    default: 'mx-auto max-w-7xl',
    narrow: 'mx-auto max-w-4xl',
    wide: 'mx-auto max-w-screen-2xl',
  },

  spacing: {
    page: {
      padding: 'p-4 md:p-6 lg:p-8',
      gap: 'space-y-4 md:space-y-6 lg:space-y-8',
    },
    card: {
      padding: 'p-4 md:p-6',
      gap: 'space-y-3 md:space-y-4',
    },
    grid: {
      gap: 'gap-4 md:gap-6',
    },
    section: {
      marginBottom: 'mb-4 md:mb-6 lg:mb-8',
    },
  },

  typography: {
    h1: 'text-2xl md:text-3xl lg:text-4xl font-bold',
    h2: 'text-xl md:text-2xl lg:text-3xl font-bold',
    h3: 'text-lg md:text-xl font-bold',
    body: {
      base: 'text-sm md:text-base',
      large: 'text-base md:text-lg',
    },
    caption: 'text-xs md:text-sm',
    label: 'text-xs md:text-sm font-medium',
  },

  neoBrutalism: {
    border: {
      mobile: 'border-2',
      desktop: 'md:border-3',
      full: 'border-2 md:border-3',
    },
    shadow: {
      mobile: 'shadow-neo-sm',
      desktop: 'md:shadow-neo',
      full: 'shadow-neo-sm md:shadow-neo',
    },
    active: 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
    hover: 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
  },

  button: {
    sm: 'px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm',
    md: 'px-4 py-2 text-sm md:px-6 md:py-3 md:text-base',
    lg: 'px-6 py-3 text-base md:px-8 md:py-4 md:text-lg',
  },

  input: {
    base: 'px-3 py-2 text-sm md:px-4 md:py-2.5 md:text-base',
  },

  adImage: {
    aspectRatio: 'aspect-[16/9]',
    standardSize: '1280 × 720',
    highQualitySize: '1920 × 1080',
    safeZone: '中央 80% 區域',
  },

  formSection: {
    variant: {
      default: 'bg-surface',
      primary: 'bg-primary-light border-primary',
      warning: 'bg-warning-bg border-warning-border',
      info: 'bg-info-bg border-info-border',
      success: 'bg-success-bg border-success-border',
      danger: 'bg-error-bg border-error-border',
    },
  },

  formGrid: {
    twoColumn: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    threeColumn: 'grid grid-cols-1 md:grid-cols-3 gap-4',
    fullWidth: 'col-span-1 md:col-span-2',
  },
} as const

export function getNeoBrutalismClasses(options?: {
  hover?: boolean
  active?: boolean
}) {
  const classes: string[] = [
    designTokens.neoBrutalism.border.full,
    designTokens.neoBrutalism.shadow.full,
  ]

  if (options?.hover) {
    classes.push(designTokens.neoBrutalism.hover as string)
  }

  if (options?.active) {
    classes.push(designTokens.neoBrutalism.active as string)
  }

  return classes.join(' ')
}

export function getPageContainerClasses(
  variant: 'default' | 'narrow' | 'wide' = 'default'
) {
  return [
    'min-h-screen bg-background',
    designTokens.spacing.page.padding,
    designTokens.container[variant],
    designTokens.spacing.page.gap,
  ].join(' ')
}

export type DesignTokens = typeof designTokens
