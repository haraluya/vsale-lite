export function ShadowShowcase() {
  const shadows = [
    { label: '小陰影 (neo-sm)', variable: 'var(--shadow-neo-sm)' },
    { label: '標準陰影 (neo)', variable: 'var(--shadow-neo)' },
    { label: '大陰影 (neo-lg)', variable: 'var(--shadow-neo-lg)' },
    { label: 'Hover 陰影', variable: 'var(--theme-shadow-hover)' },
  ]

  return (
    <section>
      <h2
        className="text-lg mb-4"
        style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
      >
        陰影系統
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {shadows.map((shadow) => (
          <div
            key={shadow.label}
            className="flex flex-col items-center justify-center p-6 text-center"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `var(--theme-border-width, 2px) solid var(--color-border)`,
              borderRadius: 'var(--theme-radius, 0px)',
              boxShadow: shadow.variable,
            }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {shadow.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
