export function DemoBadges() {
  const badges = [
    { label: '熱銷', bgVar: '--color-tag-hot-bg', borderVar: '--color-tag-hot-border', textVar: '--color-tag-hot-text' },
    { label: '新品', bgVar: '--color-tag-new-bg', borderVar: '--color-tag-new-border', textVar: '--color-tag-new-text' },
    { label: '限量', bgVar: '--color-tag-limited-bg', borderVar: '--color-tag-limited-border', textVar: '--color-tag-limited-text' },
    { label: '特價', bgVar: '--color-tag-sale-bg', borderVar: '--color-tag-sale-border', textVar: '--color-tag-sale-text' },
  ]

  const statusBadges = [
    { label: '成功', bg: 'var(--color-success-bg)', text: 'var(--color-success)', border: 'var(--color-success-border)' },
    { label: '警告', bg: 'var(--color-warning-bg)', text: 'var(--color-warning)', border: 'var(--color-warning-border)' },
    { label: '錯誤', bg: 'var(--color-error-bg)', text: 'var(--color-error)', border: 'var(--color-error-border)' },
    { label: '資訊', bg: 'var(--color-info-bg)', text: 'var(--color-info)', border: 'var(--color-info-border)' },
  ]

  return (
    <section>
      <h2
        className="text-lg mb-4"
        style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
      >
        標籤 / Badge
      </h2>
      <div className="space-y-3">
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>商品標籤</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge.label}
                className="px-3 py-1 text-xs font-bold"
                style={{
                  backgroundColor: `var(${badge.bgVar})`,
                  border: `1px solid var(${badge.borderVar})`,
                  color: `var(${badge.textVar})`,
                  borderRadius: 'var(--theme-radius-sm, 0px)',
                }}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>狀態標籤</p>
          <div className="flex flex-wrap gap-2">
            {statusBadges.map((badge) => (
              <span
                key={badge.label}
                className="px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: badge.bg,
                  border: `1px solid ${badge.border}`,
                  color: badge.text,
                  borderRadius: 'var(--theme-radius-sm, 0px)',
                }}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
