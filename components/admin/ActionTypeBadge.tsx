import { AuditActionType } from '@/types'

const ACTION_TYPE_CONFIG: Record<
  AuditActionType,
  { label: string; color: string }
> = {
  created: { label: '建立', color: 'bg-green-400 border-green-600 text-green-900' },
  updated: { label: '更新', color: 'bg-blue-400 border-blue-600 text-blue-900' },
  deleted: { label: '刪除', color: 'bg-red-400 border-red-600 text-red-900' },
  stock_adjusted: { label: '庫存調整', color: 'bg-orange-400 border-orange-600 text-orange-900' },
  comment_added: { label: '留言', color: 'bg-yellow-400 border-yellow-600 text-yellow-900' },
}

interface ActionTypeBadgeProps {
  actionType: AuditActionType
}

export function ActionTypeBadge({ actionType }: ActionTypeBadgeProps) {
  const config = ACTION_TYPE_CONFIG[actionType]

  return (
    <span
      className={`inline-flex items-center rounded-none border-2 px-2 py-1 text-xs font-black uppercase ${config.color}`}
    >
      {config.label}
    </span>
  )
}
