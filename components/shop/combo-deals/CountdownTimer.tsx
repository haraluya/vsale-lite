/**
 * CountdownTimer Component (活動倒數計時器)
 * Feature: 021-combo-deals (Phase 5 - User Story 2)
 *
 * 顯示組合優惠剩餘時間，自動更新
 */

'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface CountdownTimerProps {
  endDate: string
}

export function CountdownTimer({ endDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const end = new Date(endDate).getTime()
      const difference = end - now

      if (difference <= 0) {
        return null
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      )
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      return { days, hours, minutes, seconds }
    }

    // 初始化倒數
    setTimeLeft(calculateTimeLeft())

    // 每秒更新倒數
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft()
      setTimeLeft(newTimeLeft)

      // 若活動已結束，停止計時器
      if (!newTimeLeft) {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [endDate])

  // 載入中或活動已結束
  if (!timeLeft) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Clock className="w-4 h-4" />
        <span>活動已結束</span>
      </div>
    )
  }

  // 顯示格式：
  // - 若剩餘 >= 2 天：顯示「剩餘 X 天 Y 小時」
  // - 若剩餘 < 2 天：顯示「剩餘 X 時 Y 分 Z 秒」
  const displayText =
    timeLeft.days >= 2
      ? `剩餘 ${timeLeft.days} 天 ${timeLeft.hours} 小時`
      : timeLeft.days >= 1
        ? `剩餘 ${timeLeft.days} 天 ${timeLeft.hours} 小時 ${timeLeft.minutes} 分`
        : `剩餘 ${timeLeft.hours} 時 ${timeLeft.minutes} 分 ${timeLeft.seconds} 秒`

  // 若剩餘時間 < 24 小時，使用紅色警示
  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 24

  return (
    <div
      className={`flex items-center gap-2 text-sm font-semibold ${
        isUrgent ? 'text-error' : 'text-foreground'
      }`}
    >
      <Clock className="w-4 h-4" />
      <span>{displayText}</span>
    </div>
  )
}
