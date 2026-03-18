'use client'

import dynamic from 'next/dynamic'

const OrderTrendChart = dynamic(
  () => import('@/components/admin/order-trend-chart').then(m => ({ default: m.OrderTrendChart })),
  {
    ssr: false,
    loading: () => <div className="w-full h-[300px] animate-shimmer border" />,
  }
)

interface LazyTrendChartProps {
  data: { date: string; orders: number; revenue: number }[]
}

export function LazyTrendChart({ data }: LazyTrendChartProps) {
  return <OrderTrendChart data={data} />
}
