'use client'

import { Loader2, ShoppingCart, Trash2 } from 'lucide-react'

function ThemedButton({
  variant = 'primary',
  size = 'default',
  disabled = false,
  loading = false,
  children,
}: {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline'
  size?: 'sm' | 'default' | 'lg'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
}) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold transition-all'

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const variantStyles = {
    primary: 'text-white',
    secondary: '',
    danger: 'text-white',
    outline: '',
  }

  const variantBg = {
    primary: 'var(--color-primary)',
    secondary: 'var(--color-surface)',
    danger: 'var(--color-error)',
    outline: 'transparent',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{
        backgroundColor: variantBg[variant],
        border: `var(--theme-border-width, 2px) solid ${variant === 'outline' ? 'var(--color-primary)' : variant === 'secondary' ? 'var(--color-border)' : variantBg[variant]}`,
        borderRadius: 'var(--theme-radius, 0px)',
        boxShadow: 'var(--shadow-neo-sm)',
        color: variant === 'secondary' ? 'var(--color-text-primary)' : variant === 'outline' ? 'var(--color-primary)' : 'var(--color-text-inverse)',
      }}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

export function DemoButtons() {
  return (
    <section>
      <h2
        className="text-lg mb-4"
        style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
      >
        按鈕系統
      </h2>
      <div className="space-y-4">
        {/* 變體展示 */}
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>變體</p>
          <div className="flex flex-wrap gap-3">
            <ThemedButton variant="primary">主要按鈕</ThemedButton>
            <ThemedButton variant="secondary">次要按鈕</ThemedButton>
            <ThemedButton variant="danger"><Trash2 className="h-4 w-4" />刪除</ThemedButton>
            <ThemedButton variant="outline">外框按鈕</ThemedButton>
          </div>
        </div>

        {/* 尺寸展示 */}
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>尺寸</p>
          <div className="flex flex-wrap items-center gap-3">
            <ThemedButton size="sm">小按鈕</ThemedButton>
            <ThemedButton size="default">預設按鈕</ThemedButton>
            <ThemedButton size="lg"><ShoppingCart className="h-4 w-4" />加入購物車</ThemedButton>
          </div>
        </div>

        {/* 狀態展示 */}
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>狀態</p>
          <div className="flex flex-wrap gap-3">
            <ThemedButton disabled>已停用</ThemedButton>
            <ThemedButton loading>載入中</ThemedButton>
          </div>
        </div>
      </div>
    </section>
  )
}
