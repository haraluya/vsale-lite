const mockOrders = [
  { id: '#2024001', customer: '張小明', total: 3280, status: '已出貨', date: '2026-03-15' },
  { id: '#2024002', customer: '李美玲', total: 1560, status: '待處理', date: '2026-03-16' },
  { id: '#2024003', customer: '王大華', total: 5420, status: '已完成', date: '2026-03-17' },
  { id: '#2024004', customer: '陳志偉', total: 890, status: '已取消', date: '2026-03-18' },
]

const statusStyles: Record<string, { bg: string; text: string }> = {
  '已出貨': { bg: 'var(--color-info-bg)', text: 'var(--color-info)' },
  '待處理': { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)' },
  '已完成': { bg: 'var(--color-success-bg)', text: 'var(--color-success)' },
  '已取消': { bg: 'var(--color-error-bg)', text: 'var(--color-error)' },
}

export function DemoTable() {
  return (
    <section>
      <h2
        className="text-lg mb-4"
        style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
      >
        表格 / 卡片視圖
      </h2>

      {/* 桌面表格 */}
      <div
        className="hidden sm:block overflow-hidden"
        style={{
          border: `var(--theme-border-width, 2px) solid var(--color-border)`,
          borderRadius: 'var(--theme-radius, 0px)',
          boxShadow: 'var(--shadow-neo)',
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
              {['訂單編號', '客戶', '金額', '狀態', '日期'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left"
                  style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-secondary)', borderBottom: `var(--theme-border-width, 2px) solid var(--color-border)` }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockOrders.map((order, i) => (
              <tr
                key={order.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderBottom: i < mockOrders.length - 1 ? `1px solid var(--color-border)` : undefined,
                }}
              >
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{order.id}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)' }}>{order.customer}</td>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>${order.total.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: statusStyles[order.status]?.bg,
                      color: statusStyles[order.status]?.text,
                      borderRadius: 'var(--theme-radius-sm, 0px)',
                    }}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{order.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 手機卡片視圖 */}
      <div className="sm:hidden space-y-3">
        {mockOrders.map((order) => (
          <div
            key={order.id}
            className="p-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `var(--theme-border-width, 2px) solid var(--color-border)`,
              borderRadius: 'var(--theme-radius, 0px)',
              boxShadow: 'var(--shadow-neo-sm)',
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{order.id}</span>
              <span
                className="px-2 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: statusStyles[order.status]?.bg,
                  color: statusStyles[order.status]?.text,
                  borderRadius: 'var(--theme-radius-sm, 0px)',
                }}
              >
                {order.status}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--color-text-secondary)' }}>{order.customer}</span>
              <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>${order.total.toLocaleString()}</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{order.date}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
