import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // 等級標籤循環色系統 (Neo-Brutalism 風格 - 鮮豔飽和)
    'bg-blue-300',
    'bg-purple-300',
    'bg-green-300',
    'bg-yellow-300',
    'bg-pink-300',
    'bg-orange-300',
  ],
  theme: {
    extend: {
      boxShadow: {
        'neo': 'var(--shadow-neo)',
        'neo-sm': 'var(--shadow-neo-sm)',
        'neo-lg': 'var(--shadow-neo-lg)',
      },
      borderWidth: {
        '3': '3px',
      },
      colors: {
        surface: 'var(--color-surface)',
        'surface-secondary': 'var(--color-surface-secondary)',
        'surface-elevated': 'var(--color-surface-elevated)',
        background: 'var(--color-surface-secondary)',
        foreground: 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)',
        'text-inverse': 'var(--color-text-inverse)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
          light: 'var(--color-primary-light)',
        },
        border: 'var(--color-border)',
        success: {
          DEFAULT: 'var(--color-success)',
          bg: 'var(--color-success-bg)',
          border: 'var(--color-success-border)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          bg: 'var(--color-warning-bg)',
          border: 'var(--color-warning-border)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          bg: 'var(--color-error-bg)',
          border: 'var(--color-error-border)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          bg: 'var(--color-info-bg)',
          border: 'var(--color-info-border)',
        },
        // 品牌色彩系統 (006-ux-enhancement)
        brand: {
          primary: '#1E40AF',
          secondary: '#F97316',
          success: '#22C55E',
          warning: '#EAB308',
          error: '#EF4444',
          info: '#3B82F6',
        },
      },
    },
  },
  plugins: [],
}

export default config
