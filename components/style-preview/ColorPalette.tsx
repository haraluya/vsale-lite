interface ColorSwatchProps {
  label: string
  cssVar: string
}

function ColorSwatch({ label, cssVar }: ColorSwatchProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="h-14 w-14"
        style={{
          backgroundColor: `var(${cssVar})`,
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
        }}
      />
      <span className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
    </div>
  )
}

export function ColorPalette() {
  const colors: ColorSwatchProps[] = [
    { label: '主色', cssVar: '--color-primary' },
    { label: '主色深', cssVar: '--color-primary-dark' },
    { label: '主色淺', cssVar: '--color-primary-light' },
    { label: '成功', cssVar: '--color-success' },
    { label: '警告', cssVar: '--color-warning' },
    { label: '錯誤', cssVar: '--color-error' },
    { label: '資訊', cssVar: '--color-info' },
    { label: '表面', cssVar: '--color-surface' },
    { label: '背景', cssVar: '--color-surface-secondary' },
    { label: '邊框', cssVar: '--color-border' },
    { label: '文字', cssVar: '--color-text-primary' },
    { label: '次要文字', cssVar: '--color-text-secondary' },
  ]

  return (
    <section>
      <h2
        className="text-lg mb-4"
        style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
      >
        色彩系統
      </h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
        {colors.map((color) => (
          <ColorSwatch key={color.cssVar} {...color} />
        ))}
      </div>
    </section>
  )
}
