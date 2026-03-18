import { Home, Package, ShoppingCart, ClipboardList, User } from 'lucide-react'

const navItems = [
  { label: '首頁', icon: Home, active: true },
  { label: '商品', icon: Package },
  { label: '購物車', icon: ShoppingCart, badge: 3 },
  { label: '訂單', icon: ClipboardList },
  { label: '我的', icon: User },
]

export function DemoNav() {
  return (
    <section>
      <h2
        className="text-lg mb-4"
        style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
      >
        底部導覽列
      </h2>
      <div
        className="overflow-hidden"
        style={{
          border: `var(--theme-border-width, 2px) solid var(--color-border)`,
          borderRadius: 'var(--theme-radius, 0px)',
          boxShadow: 'var(--shadow-neo)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-2"
              >
                <div className="relative">
                  <Icon
                    className="h-5 w-5"
                    style={{
                      color: item.active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    }}
                  />
                  {item.badge && (
                    <span
                      className="absolute -right-2.5 -top-1.5 flex h-4 w-4 items-center justify-center text-[10px] font-bold"
                      style={{
                        backgroundColor: 'var(--color-error)',
                        color: 'var(--color-text-inverse)',
                        borderRadius: '9999px',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className="text-[10px]"
                  style={{
                    color: item.active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    fontWeight: item.active ? 700 : 400,
                  }}
                >
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
