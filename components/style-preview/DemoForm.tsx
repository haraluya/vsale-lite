export function DemoForm() {
  return (
    <section>
      <h2
        className="text-lg mb-4"
        style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
      >
        表單元件
      </h2>
      <div
        className="p-4 space-y-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: `var(--theme-border-width, 2px) solid var(--color-border)`,
          borderRadius: 'var(--theme-radius, 0px)',
          boxShadow: 'var(--shadow-neo)',
        }}
      >
        {/* Input */}
        <div>
          <label
            className="block text-sm mb-1.5"
            style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
          >
            商品名稱
          </label>
          <input
            type="text"
            placeholder="請輸入商品名稱"
            className="w-full px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `var(--theme-border-width, 2px) solid var(--color-border)`,
              borderRadius: 'var(--theme-radius-sm, 0px)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Textarea */}
        <div>
          <label
            className="block text-sm mb-1.5"
            style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
          >
            商品描述
          </label>
          <textarea
            placeholder="請輸入商品描述..."
            rows={3}
            className="w-full px-3 py-2 text-sm outline-none resize-none"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `var(--theme-border-width, 2px) solid var(--color-border)`,
              borderRadius: 'var(--theme-radius-sm, 0px)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="demo-active"
            defaultChecked
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          <label
            htmlFor="demo-active"
            className="text-sm"
            style={{ color: 'var(--color-text-primary)' }}
          >
            商品上架
          </label>
        </div>

        {/* Select */}
        <div>
          <label
            className="block text-sm mb-1.5"
            style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
          >
            商品分類
          </label>
          <select
            className="w-full px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `var(--theme-border-width, 2px) solid var(--color-border)`,
              borderRadius: 'var(--theme-radius-sm, 0px)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option>請選擇分類</option>
            <option>咖啡豆</option>
            <option>茶品</option>
            <option>器材</option>
          </select>
        </div>

        {/* Error state */}
        <div>
          <label
            className="block text-sm mb-1.5"
            style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
          >
            價格
          </label>
          <input
            type="text"
            defaultValue="-100"
            className="w-full px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-error-bg)',
              border: `var(--theme-border-width, 2px) solid var(--color-error-border)`,
              borderRadius: 'var(--theme-radius-sm, 0px)',
              color: 'var(--color-text-primary)',
            }}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
            價格必須大於 0
          </p>
        </div>
      </div>
    </section>
  )
}
