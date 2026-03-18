export function DemoSkeleton() {
  return (
    <section>
      <h2
        className="text-lg mb-4"
        style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
      >
        骨架屏
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="overflow-hidden"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `var(--theme-border-width, 2px) solid var(--color-border)`,
              borderRadius: 'var(--theme-radius, 0px)',
              boxShadow: 'var(--shadow-neo-sm)',
            }}
          >
            {/* 圖片骨架 */}
            <div className="aspect-square animate-shimmer" />
            {/* 內容骨架 */}
            <div className="p-3 space-y-2">
              <div
                className="h-3 w-16 animate-shimmer"
                style={{ borderRadius: 'var(--theme-radius-sm, 0px)' }}
              />
              <div
                className="h-4 w-full animate-shimmer"
                style={{ borderRadius: 'var(--theme-radius-sm, 0px)' }}
              />
              <div
                className="h-4 w-2/3 animate-shimmer"
                style={{ borderRadius: 'var(--theme-radius-sm, 0px)' }}
              />
              <div
                className="h-5 w-20 animate-shimmer"
                style={{ borderRadius: 'var(--theme-radius-sm, 0px)' }}
              />
              <div
                className="h-8 w-full animate-shimmer"
                style={{ borderRadius: 'var(--theme-radius-sm, 0px)' }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
