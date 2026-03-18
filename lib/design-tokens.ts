/**
 * Vsale-lite 響應式設計 Token 系統
 * Clean Commerce 主題 — 使用 CSS 變數實現多主題相容
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
    h1: 'text-2xl md:text-3xl lg:text-4xl font-semibold',
    h2: 'text-xl md:text-2xl lg:text-3xl font-semibold',
    h3: 'text-lg md:text-xl font-semibold',
    body: {
      base: 'text-sm md:text-base',
      large: 'text-base md:text-lg',
    },
    caption: 'text-xs md:text-sm',
    label: 'text-xs md:text-sm font-medium',
  },

  /** 主題感知樣式 — 透過 CSS 變數驅動，自動適應當前主題 */
  cleanCommerce: {
    border: {
      base: 'border-theme',
      full: 'border-theme',
    },
    shadow: {
      base: 'shadow-neo-sm',
      full: 'shadow-neo-sm',
    },
    radius: {
      base: 'rounded-theme',
      sm: 'rounded-theme-sm',
      lg: 'rounded-theme-lg',
    },
    hover: 'hover:-translate-y-0.5 hover:shadow-neo-lg transition-all duration-200',
    active: 'active:scale-[0.98] active:shadow-neo-sm transition-all duration-150',
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

/**
 * 取得主題感知的基礎樣式類別
 * 透過 CSS 變數自動適應當前主題（Clean Commerce / Neo-Brutalism / 等）
 */
export function getThemeClasses(options?: {
  hover?: boolean
  active?: boolean
}) {
  const classes: string[] = [
    designTokens.cleanCommerce.border.full,
    designTokens.cleanCommerce.shadow.full,
    designTokens.cleanCommerce.radius.base,
  ]

  if (options?.hover) {
    classes.push(designTokens.cleanCommerce.hover)
  }

  if (options?.active) {
    classes.push(designTokens.cleanCommerce.active)
  }

  return classes.join(' ')
}

/** @deprecated 使用 getThemeClasses 替代 */
export function getNeoBrutalismClasses(options?: {
  hover?: boolean
  active?: boolean
}) {
  return getThemeClasses(options)
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
