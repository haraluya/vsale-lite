/**
 * 裝置/瀏覽器偵測 hook
 * 判斷使用者環境以提供對應的 PWA 安裝指引
 */

'use client'

import { useState, useEffect } from 'react'

export type DeviceType = 'ios-safari' | 'ios-other' | 'android-chrome' | 'android-other' | 'desktop-chrome' | 'desktop-edge' | 'desktop-other'

export interface DeviceInfo {
  type: DeviceType
  isIOS: boolean
  isAndroid: boolean
  isDesktop: boolean
  isSafari: boolean
  isChrome: boolean
  isEdge: boolean
  isStandalone: boolean
  browserName: string
  osName: string
}

export function useDeviceDetect(): DeviceInfo {
  const [info, setInfo] = useState<DeviceInfo>({
    type: 'desktop-other',
    isIOS: false,
    isAndroid: false,
    isDesktop: true,
    isSafari: false,
    isChrome: false,
    isEdge: false,
    isStandalone: false,
    browserName: '瀏覽器',
    osName: '桌面',
  })

  useEffect(() => {
    const ua = navigator.userAgent
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true

    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isAndroid = /Android/.test(ua)
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua)
    const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua)
    const isCriOS = /CriOS/.test(ua) // Chrome on iOS
    const isEdge = /Edge|Edg/.test(ua)
    const isDesktop = !isIOS && !isAndroid

    let type: DeviceType
    let browserName: string
    let osName: string

    if (isIOS) {
      osName = 'iOS'
      if (isSafari) {
        type = 'ios-safari'
        browserName = 'Safari'
      } else {
        type = 'ios-other'
        browserName = isCriOS ? 'Chrome' : '瀏覽器'
      }
    } else if (isAndroid) {
      osName = 'Android'
      if (isChrome) {
        type = 'android-chrome'
        browserName = 'Chrome'
      } else {
        type = 'android-other'
        browserName = '瀏覽器'
      }
    } else {
      osName = '桌面'
      if (isChrome) {
        type = 'desktop-chrome'
        browserName = 'Chrome'
      } else if (isEdge) {
        type = 'desktop-edge'
        browserName = 'Edge'
      } else {
        type = 'desktop-other'
        browserName = isSafari ? 'Safari' : '瀏覽器'
      }
    }

    setInfo({
      type,
      isIOS,
      isAndroid,
      isDesktop,
      isSafari,
      isChrome: isChrome || isCriOS,
      isEdge,
      isStandalone,
      browserName,
      osName,
    })
  }, [])

  return info
}
