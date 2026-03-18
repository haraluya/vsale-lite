'use client'

import { useState } from 'react'
import { X, AlertTriangle, CheckCircle } from 'lucide-react'

export function DemoDialog() {
  const [showAlert, setShowAlert] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <section>
      <h2
        className="text-lg mb-4"
        style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
      >
        對話框
      </h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowAlert(true)}
          className="px-4 py-2 text-sm font-semibold transition-all"
          style={{
            backgroundColor: 'var(--color-success)',
            color: 'var(--color-text-inverse)',
            border: `var(--theme-border-width, 2px) solid var(--color-success)`,
            borderRadius: 'var(--theme-radius-sm, 0px)',
            boxShadow: 'var(--shadow-neo-sm)',
          }}
        >
          成功通知
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 text-sm font-semibold transition-all"
          style={{
            backgroundColor: 'var(--color-error)',
            color: 'var(--color-text-inverse)',
            border: `var(--theme-border-width, 2px) solid var(--color-error)`,
            borderRadius: 'var(--theme-radius-sm, 0px)',
            boxShadow: 'var(--shadow-neo-sm)',
          }}
        >
          確認刪除
        </button>
      </div>

      {/* 成功 Alert */}
      {showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div
            className="w-full max-w-sm p-6 space-y-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `var(--theme-border-width, 2px) solid var(--color-border)`,
              borderRadius: 'var(--theme-radius, 0px)',
              boxShadow: 'var(--shadow-neo-lg)',
            }}
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 shrink-0" style={{ color: 'var(--color-success)' }} />
              <div className="flex-1">
                <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>操作成功</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  商品已成功加入購物車
                </p>
              </div>
              <button onClick={() => setShowAlert(false)} style={{ color: 'var(--color-text-muted)' }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => setShowAlert(false)}
              className="w-full py-2 text-sm font-semibold"
              style={{
                backgroundColor: 'var(--color-success)',
                color: 'var(--color-text-inverse)',
                borderRadius: 'var(--theme-radius-sm, 0px)',
                border: `var(--theme-border-width, 2px) solid var(--color-success)`,
              }}
            >
              確認
            </button>
          </div>
        </div>
      )}

      {/* 確認 Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div
            className="w-full max-w-sm p-6 space-y-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `var(--theme-border-width, 2px) solid var(--color-border)`,
              borderRadius: 'var(--theme-radius, 0px)',
              boxShadow: 'var(--shadow-neo-lg)',
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0" style={{ color: 'var(--color-error)' }} />
              <div className="flex-1">
                <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>確認刪除</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  確定要刪除此商品嗎？此操作無法復原。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--theme-radius-sm, 0px)',
                  border: `var(--theme-border-width, 2px) solid var(--color-border)`,
                }}
              >
                取消
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--color-error)',
                  color: 'var(--color-text-inverse)',
                  borderRadius: 'var(--theme-radius-sm, 0px)',
                  border: `var(--theme-border-width, 2px) solid var(--color-error)`,
                }}
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
