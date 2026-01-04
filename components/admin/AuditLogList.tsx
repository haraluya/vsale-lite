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
          className="rounded-none border-3 border-black bg-white p-4 shadow-neo hover:shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          <div className="flex items-start justify-between gap-4">
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

            <div className="text-right text-xs text-gray-500">
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
