'use client'

import { AuditLog } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { ActionTypeBadge } from './ActionTypeBadge'

interface AuditLogListProps {
  logs: AuditLog[]
}

export function AuditLogList({ logs }: AuditLogListProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-none border-3 border-gray-300 bg-gray-50 p-12 text-center">
        <p className="text-lg font-bold text-gray-500">尚無操作記錄</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="rounded-none border-2 md:border-3 border-black bg-white p-3 md:p-4 shadow-neo-sm md:shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          {/* 手機版：垂直堆疊布局 */}
          <div className="flex flex-col gap-3 md:hidden">
            {/* 頂部：操作類型與時間 */}
            <div className="flex items-center justify-between">
              <ActionTypeBadge actionType={log.action_type} />
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(log.created_at), {
                  addSuffix: true,
                  locale: zhTW,
                })}
              </span>
            </div>

            {/* 目標資訊 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-700">
                {log.target_type}
              </span>
              <span className="text-xs text-gray-500">#{log.target_id.slice(0, 8)}</span>
            </div>

            {/* 操作者 */}
            <p className="text-sm text-gray-600">
              <span className="font-bold">{log.actor_display_name || '未知'}</span>
              {' '}執行操作
            </p>

            {/* 變更內容 */}
            {log.old_values && log.new_values && (
              <div className="text-xs bg-gray-50 p-2 rounded-none border-2 border-gray-300">
                <p className="font-bold mb-1">變更內容：</p>
                {Object.keys(log.new_values).map((key) => (
                  <p key={key} className="break-all">
                    <span className="font-bold">{key}:</span>{' '}
                    <span className="text-gray-600">{JSON.stringify(log.old_values?.[key])}</span>
                    {' → '}
                    <span className="text-gray-900">{JSON.stringify(log.new_values?.[key])}</span>
                  </p>
                ))}
              </div>
            )}

            {/* 備註 */}
            {log.notes && (
              <p className="text-xs text-gray-500 italic">備註：{log.notes}</p>
            )}
          </div>

          {/* 桌面版：原本的橫向布局 */}
          <div className="hidden md:flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <ActionTypeBadge actionType={log.action_type} />
                <span className="text-sm font-bold text-gray-700">
                  {log.target_type}
                </span>
                <span className="text-sm text-gray-500">#{log.target_id.slice(0, 8)}</span>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-bold">{log.actor_display_name || '未知'}</span>
                  {' '}執行操作
                </p>

                {log.old_values && log.new_values && (
                  <div className="text-xs bg-gray-50 p-2 rounded border border-gray-200 mt-2">
                    <p className="font-bold mb-1">變更內容：</p>
                    {Object.keys(log.new_values).map((key) => (
                      <p key={key}>
                        {key}: {JSON.stringify(log.old_values?.[key])} → {JSON.stringify(log.new_values?.[key])}
                      </p>
                    ))}
                  </div>
                )}

                {log.notes && (
                  <p className="text-xs text-gray-500 italic">備註：{log.notes}</p>
                )}
              </div>
            </div>

            <div className="text-right text-xs text-gray-500 whitespace-nowrap">
              {formatDistanceToNow(new Date(log.created_at), {
                addSuffix: true,
                locale: zhTW,
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
