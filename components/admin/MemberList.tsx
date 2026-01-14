'use client'

import { AdminProfile } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Edit, Trash2, KeyRound } from 'lucide-react'
import Link from 'next/link'

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
      <div className="rounded-none border-2 md:border-3 border-gray-300 bg-gray-50 p-12 text-center">
        <p className="text-lg font-bold text-gray-500">尚無成員帳號</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 桌面版表格 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full rounded-none border-2 md:border-3 border-black bg-white shadow-neo">
          <thead className="border-b-2 md:border-b-3 border-black bg-yellow-400">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-black uppercase tracking-wider">
                帳號
              </th>
              <th className="px-6 py-4 text-left text-sm font-black uppercase tracking-wider">
                暱稱
              </th>
              <th className="px-6 py-4 text-left text-sm font-black uppercase tracking-wider">
                建立時間
              </th>
              <th className="px-6 py-4 text-right text-sm font-black uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-3 divide-black">
            {admins.map((admin) => (
              <tr
                key={admin.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">
                      {admin.username}
                    </span>
                    {admin.id === currentUserId && (
                      <span className="inline-flex items-center rounded-none border-2 border-blue-600 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
                        目前帳號
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">
                    {admin.display_name || '-'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">
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
                      className="inline-flex items-center gap-1 rounded-none border-2 border-black bg-white px-3 py-2 text-sm font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                      <Edit className="h-4 w-4" />
                      編輯
                    </Link>
                    <button
                      onClick={() => onResetPassword(admin.id, admin.username)}
                      className="inline-flex items-center gap-1 rounded-none border-2 border-black bg-orange-400 px-3 py-2 text-sm font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                      <KeyRound className="h-4 w-4" />
                      重設密碼
                    </button>
                    {admin.id !== currentUserId && (
                      <button
                        onClick={() => onDelete(admin.id, admin.username)}
                        className="inline-flex items-center gap-1 rounded-none border-2 border-black bg-red-400 px-3 py-2 text-sm font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
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
      <div className="md:hidden space-y-4">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="rounded-none border-2 md:border-3 border-black bg-white p-4 shadow-neo"
          >
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-black">{admin.username}</span>
                {admin.id === currentUserId && (
                  <span className="inline-flex items-center rounded-none border-2 border-blue-600 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
                    目前帳號
                  </span>
                )}
              </div>
              {admin.display_name && (
                <p className="text-sm text-gray-700 mb-1">{admin.display_name}</p>
              )}
              <p className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(admin.created_at), {
                  addSuffix: true,
                  locale: zhTW,
                })}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href={`/admin/system/members/${admin.id}`}
                className="inline-flex items-center justify-center gap-1 rounded-none border-2 border-black bg-white px-3 py-2 text-sm font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <Edit className="h-4 w-4" />
                編輯
              </Link>
              <button
                onClick={() => onResetPassword(admin.id, admin.username)}
                className="inline-flex items-center justify-center gap-1 rounded-none border-2 border-black bg-orange-400 px-3 py-2 text-sm font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <KeyRound className="h-4 w-4" />
                重設密碼
              </button>
              {admin.id !== currentUserId && (
                <button
                  onClick={() => onDelete(admin.id, admin.username)}
                  className="inline-flex items-center justify-center gap-1 rounded-none border-2 border-black bg-red-400 px-3 py-2 text-sm font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
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
