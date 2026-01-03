import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        'neo': '4px 4px 0px 0px rgba(0,0,0,1)',
        'neo-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
        'neo-lg': '6px 6px 0px 0px rgba(0,0,0,1)',
      },
      borderWidth: {
        '3': '3px',
      },
      colors: {
        primary: {
          DEFAULT: '#8B5CF6',  // 紫色
          dark: '#7C3AED',
        },
        surface: '#FFFFFF',
        background: '#F3F4F6',
        // 品牌色彩系統 (006-ux-enhancement)
        brand: {
          primary: '#1E40AF',    // 深藍 (主色)
          secondary: '#F97316',  // 橘色 (輔色)
          success: '#22C55E',    // 綠色 (成功狀態)
          warning: '#EAB308',    // 黃色 (警告狀態)
          error: '#EF4444',      // 紅色 (錯誤狀態)
          info: '#3B82F6',       // 藍色 (資訊狀態)
        },
      },
    },
  },
  plugins: [],
}

export default config
