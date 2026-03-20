'use client'

import { AdminProfile } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Edit, Trash2, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { designTokens, getThemeClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface MemberListProps {
  admins: AdminProfile[]
  currentUserId: string
  onDelete: (adminId: string, username: string) => void
  onResetPassword: (adminId: string, username: string) => void
}

export function MemberList({
  admins,
  currentUserId,
  onDelete,
  onResetPassword,
}: MemberListProps) {
  if (admins.length === 0) {
    return (
      <div className={cn("rounded-theme-sm border-border bg-surface-secondary p-12 text-center", designTokens.cleanCommerce.border.full)}>
        <p className={cn("font-bold text-muted", designTokens.typography.h3)}>尚無成員帳號</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 桌面版表格 */}
      <div className="hidden lg:block overflow-x-auto">
        <table className={cn("w-full rounded-theme-sm bg-surface", getThemeClasses())}>
          <thead className="border-b bg-yellow-400">
            <tr>
              <th className={cn("px-6 py-4 text-left font-black uppercase tracking-wider", designTokens.typography.body.base)}>
                帳號
              </th>
              <th className={cn("px-6 py-4 text-left font-black uppercase tracking-wider", designTokens.typography.body.base)}>
                暱稱
              </th>
              <th className={cn("px-6 py-4 text-left font-black uppercase tracking-wider", designTokens.typography.body.base)}>
                建立時間
              </th>
              <th className={cn("px-6 py-4 text-right font-black uppercase tracking-wider", designTokens.typography.body.base)}>
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-3 divide-black">
            {admins.map((admin) => (
              <tr
                key={admin.id}
                className="hover:bg-surface-secondary transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">
                      {admin.username}
                    </span>
                    {admin.id === currentUserId && (
                      <span className="inline-flex items-center rounded-theme-sm border border-blue-600 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
                        目前帳號
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-text-secondary">
                    {admin.display_name || '-'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-muted">
                    {formatDistanceToNow(new Date(admin.created_at), {
                      addSuffix: true,
                      locale: zhTW,
                    })}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/system/members/${admin.id}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-theme-sm bg-surface font-bold transition-all",
                        designTokens.cleanCommerce.border.full,
                        designTokens.cleanCommerce.shadow.base,
                        designTokens.cleanCommerce.hover,
                        designTokens.button.sm
                      )}
                    >
                      <Edit className="h-4 w-4" />
                      編輯
                    </Link>
                    <button
                      onClick={() => onResetPassword(admin.id, admin.username)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-theme-sm bg-orange-400 font-bold transition-all",
                        designTokens.cleanCommerce.border.full,
                        designTokens.cleanCommerce.shadow.base,
                        designTokens.cleanCommerce.hover,
                        designTokens.button.sm
                      )}
                    >
                      <KeyRound className="h-4 w-4" />
                      重設密碼
                    </button>
                    {admin.id !== currentUserId && (
                      <button
                        onClick={() => onDelete(admin.id, admin.username)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-theme-sm bg-red-400 font-bold transition-all",
                          designTokens.cleanCommerce.border.full,
                          designTokens.cleanCommerce.shadow.base,
                          designTokens.cleanCommerce.hover,
                          designTokens.button.sm
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                        刪除
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 手機版卡片 */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className={cn(
              "rounded-theme-sm bg-surface",
              getThemeClasses(),
              designTokens.spacing.card.padding
            )}
          >
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className={designTokens.typography.h3}>{admin.username}</span>
                {admin.id === currentUserId && (
                  <span className="inline-flex items-center rounded-theme-sm border border-blue-600 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
                    目前帳號
                  </span>
                )}
              </div>
              {admin.display_name && (
                <p className={cn("text-text-secondary mb-1", designTokens.typography.caption)}>{admin.display_name}</p>
              )}
              <p className={cn("text-muted", designTokens.typography.caption)}>
                {formatDistanceToNow(new Date(admin.created_at), {
                  addSuffix: true,
                  locale: zhTW,
                })}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href={`/admin/system/members/${admin.id}`}
                className={cn(
                  "inline-flex items-center justify-center gap-1 bg-surface font-bold transition-all",
                  getThemeClasses({ active: true }),
                  designTokens.button.md
                )}
              >
                <Edit className="h-4 w-4" />
                編輯
              </Link>
              <button
                onClick={() => onResetPassword(admin.id, admin.username)}
                className={cn(
                  "inline-flex items-center justify-center gap-1 bg-orange-400 font-bold transition-all",
                  getThemeClasses({ active: true }),
                  designTokens.button.md
                )}
              >
                <KeyRound className="h-4 w-4" />
                重設密碼
              </button>
              {admin.id !== currentUserId && (
                <button
                  onClick={() => onDelete(admin.id, admin.username)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1 bg-red-400 font-bold transition-all",
                    getThemeClasses({ active: true }),
                    designTokens.button.md
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                  刪除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
