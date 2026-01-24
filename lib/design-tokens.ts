/**
 * Vsale-lite 響應式設計 Token 系統
 * 統一定義所有設計變數,確保一致性
 *
 * @see docs/design-tokens.md - 使用文件 (待建立)
 * @see specs/005-responsive-ui/research.md - 設計決策理由
 */

export const designTokens = {
  /**
   * 容器寬度
   */
  container: {
    default: 'mx-auto max-w-7xl',        // 一般頁面 (1280px)
    narrow: 'mx-auto max-w-4xl',         // 表單頁面 (896px)
    wide: 'mx-auto max-w-screen-2xl',    // 儀表板 (1536px,僅特殊情況)
  },

  /**
   * 間距系統
   */
  spacing: {
    page: {
      padding: 'p-4 md:p-6 lg:p-8',                     // 頁面外層
      gap: 'space-y-4 md:space-y-6 lg:space-y-8',      // 垂直區塊間距
    },
    card: {
      padding: 'p-4 md:p-6',                           // 卡片內距
      gap: 'space-y-3 md:space-y-4',                   // 卡片內元素間距
    },
    grid: {
      gap: 'gap-4 md:gap-6',                           // Grid 列間距
    },
    section: {
      marginBottom: 'mb-4 md:mb-6 lg:mb-8',            // 區塊下方間距
    },
  },

  /**
   * 文字尺寸階梯
   */
  typography: {
    h1: 'text-2xl md:text-3xl lg:text-4xl font-bold',  // 頁面主標題
    h2: 'text-xl md:text-2xl lg:text-3xl font-bold',   // 區塊標題
    h3: 'text-lg md:text-xl font-bold',                // 次標題
    body: {
      base: 'text-sm md:text-base',                    // 正文
      large: 'text-base md:text-lg',                   // 大正文
    },
    caption: 'text-xs md:text-sm',                     // 輔助文字
    label: 'text-xs md:text-sm font-medium',           // 表單標籤
  },

  /**
   * Neo-Brutalism 響應式
   */
  neoBrutalism: {
    border: {
      mobile: 'border-2',                              // 手機版
      desktop: 'md:border-3',                          // 桌面版
      full: 'border-2 md:border-3',                    // 完整 (手機+桌面)
    },
    shadow: {
      mobile: 'shadow-neo-sm',                         // 2px 陰影
      desktop: 'md:shadow-neo',                        // 4px 陰影
      full: 'shadow-neo-sm md:shadow-neo',             // 完整 (手機+桌面)
    },
    active: 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
    hover: 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
  },

  /**
   * 按鈕尺寸
   */
  button: {
    sm: 'px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm',
    md: 'px-4 py-2 text-sm md:px-6 md:py-3 md:text-base',
    lg: 'px-6 py-3 text-base md:px-8 md:py-4 md:text-lg',
  },

  /**
   * 輸入框尺寸
   */
  input: {
    base: 'px-3 py-2 text-sm md:px-4 md:py-2.5 md:text-base',
  },

  /**
   * 廣告圖片規格
   */
  adImage: {
    aspectRatio: 'aspect-[16/9]',          // 16:9 比例
    standardSize: '1280 × 720',            // 標準尺寸 (px)
    highQualitySize: '1920 × 1080',        // 高畫質尺寸 (px)
    safeZone: '中央 80% 區域',              // 安全區域提示
  },
} as const

/**
 * 工具函式: 組合 Neo-Brutalism 完整樣式
 */
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

/**
 * 工具函式: 組合頁面容器樣式
 */
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

/**
 * TypeScript 型別輔助: 提取 Token 值的型別
 */
export type DesignTokens = typeof designTokens
