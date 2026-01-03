/**
 * AnnouncementCarousel Component
 * Feature: 007-system-enhancement (US4 - 廣告輪播系統)
 *
 * 前台首頁廣告輪播元件
 * - 自動播放（每 5 秒切換）
 * - 左右箭頭手動切換
 * - 指示器顯示當前位置
 * - 點擊跳轉功能
 * - Neo-Brutalism 設計風格
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Announcement } from '@/types'

interface AnnouncementCarouselProps {
  announcements: Announcement[]
}

export function AnnouncementCarousel({ announcements }: AnnouncementCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // 自動播放（每 5 秒切換）
  useEffect(() => {
    if (!announcements || announcements.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [announcements])

  // 上一張
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length)
  }

  // 下一張
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length)
  }

  // 跳轉至指定索引
  const handleIndicatorClick = (index: number) => {
    setCurrentIndex(index)
  }

  // 如果沒有廣告，不顯示元件
  if (!announcements || announcements.length === 0) {
    return null
  }

  const current = announcements[currentIndex]

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-none border-3 border-black bg-gray-100 shadow-neo">
      {/* 廣告圖片 */}
      {current.link_url ? (
        <Link href={current.link_url} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
          <Image
            src={current.image_url}
            alt={current.title}
            fill
            className="object-cover"
            priority
          />
        </Link>
      ) : (
        <Image
          src={current.image_url}
          alt={current.title}
          fill
          className="object-cover"
          priority
        />
      )}

      {/* 左右箭頭（僅在有多張廣告時顯示） */}
      {announcements.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-none border-2 border-black bg-white p-2 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[calc(-50%+2px)] hover:shadow-none"
            aria-label="上一張"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-none border-2 border-black bg-white p-2 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[calc(-50%+2px)] hover:shadow-none"
            aria-label="下一張"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* 指示器（僅在有多張廣告時顯示） */}
      {announcements.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {announcements.map((_, index) => (
            <button
              key={index}
              onClick={() => handleIndicatorClick(index)}
              className={`h-3 w-3 rounded-full border-2 border-black transition-colors ${
                index === currentIndex ? 'bg-black' : 'bg-white'
              }`}
              aria-label={`跳轉至第 ${index + 1} 張廣告`}
            />
          ))}
        </div>
      )}

      {/* 廣告標題（左上角） */}
      <div className="absolute left-4 top-4 rounded-none border-2 border-black bg-white px-4 py-2 shadow-neo">
        <p className="text-sm font-bold">{current.title}</p>
      </div>
    </div>
  )
}
