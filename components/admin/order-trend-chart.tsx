'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

/**
 * 訂單趨勢圖表元件 (T076)
 * Feature: 006-ux-enhancement / US10
 * T082 - 實作近 7 日訂單趨勢圖表
 */

interface OrderTrendData {
  date: string // YYYY-MM-DD
  orders: number
  revenue: number
}

interface OrderTrendChartProps {
  data: OrderTrendData[]
}

export function OrderTrendChart({ data }: OrderTrendChartProps) {
  // 格式化日期顯示 (MM/DD)
  const formattedData = data.map((item) => ({
    ...item,
    dateDisplay: formatDate(item.date),
  }))

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          {/* 格線 */}
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />

          {/* X 軸 - 日期 */}
          <XAxis
            dataKey="dateDisplay"
            stroke="var(--color-chart-text)"
            style={{
              fontSize: '12px',
              fontFamily: 'inherit',
            }}
          />

          {/* Y 軸 - 訂單數 */}
          <YAxis
            yAxisId="left"
            stroke="var(--color-info)"
            style={{
              fontSize: '12px',
              fontFamily: 'inherit',
            }}
            label={{ value: '訂單數', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
          />

          {/* Y 軸 - 營收 */}
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="var(--color-success)"
            style={{
              fontSize: '12px',
              fontFamily: 'inherit',
            }}
            label={{ value: '營收 (元)', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
          />

          {/* 提示框 */}
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '3px solid black',
              borderRadius: 0,
              boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
              fontSize: '14px',
            }}
            formatter={(value: number | undefined, name: string | undefined) => {
              const val = value ?? 0
              const fieldName = name ?? ''
              if (fieldName === 'orders') {
                return [val, '訂單數']
              }
              return [`$${val.toLocaleString()}`, '營收']
            }}
            labelFormatter={(label) => `日期: ${label}`}
          />

          {/* 圖例 */}
          <Legend
            wrapperStyle={{
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
            formatter={(value) => {
              if (value === 'orders') return '訂單數'
              if (value === 'revenue') return '營收'
              return value
            }}
          />

          {/* 訂單數折線 (藍色) */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="orders"
            stroke="var(--color-info)"
            strokeWidth={3}
            dot={{ fill: 'var(--color-info)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />

          {/* 營收折線 (綠色) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-success)"
            strokeWidth={3}
            dot={{ fill: 'var(--color-success)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * 格式化日期顯示 (YYYY-MM-DD -> MM/DD)
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}
