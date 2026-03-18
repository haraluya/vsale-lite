/**
 * InstallGuideClient Component
 * PWA 安裝教學頁面 — 偵測裝置環境給予對應教學
 */

'use client'

import { useDeviceDetect } from '@/lib/hooks/use-device-detect'
import { usePwaInstall } from '@/lib/hooks/use-pwa-install'
import {
  Download,
  Share,
  MoreVertical,
  Plus,
  ArrowUp,
  Monitor,
  Smartphone,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

export function InstallGuideClient() {
  const device = useDeviceDetect()
  const { canInstall, install, isInstalled } = usePwaInstall()

  // 已安裝狀態
  if (device.isStandalone || isInstalled) {
    return (
      <div className={cn(designTokens.container.narrow, 'px-4 py-8')}>
        <div className="flex flex-col items-center text-center gap-4 py-12">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-xl font-bold">APP 已安裝</h1>
          <p className="text-text-secondary">
            您已經在使用 APP 模式了，享受更快速的瀏覽體驗吧！
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(designTokens.container.narrow, 'px-4 py-6')}>
      {/* 標題區 */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-theme bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Download className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-bold mb-2">安裝到主畫面</h1>
        <p className="text-sm text-text-secondary">
          將本站加入主畫面，像原生 APP 一樣快速開啟
        </p>
      </div>

      {/* 快速安裝按鈕（支援 beforeinstallprompt 的瀏覽器） */}
      {canInstall && (
        <div className="mb-8">
          <button
            onClick={install}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3.5 rounded-theme',
              'bg-primary text-text-inverse font-semibold text-base',
              'border-theme shadow-neo-sm',
              'transition-all duration-200',
              'hover:-translate-y-0.5 hover:shadow-theme-hover',
              'active:scale-[0.98]',
              'min-h-[48px]'
            )}
          >
            <Download className="h-5 w-5" />
            立即安裝
          </button>
          <p className="text-xs text-text-secondary text-center mt-2">
            點擊上方按鈕即可快速安裝
          </p>
        </div>
      )}

      {/* 偵測到的環境資訊 */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-theme-sm bg-info-bg border text-sm mb-6">
        {device.isDesktop ? (
          <Monitor className="h-4 w-4 text-info flex-shrink-0" />
        ) : (
          <Smartphone className="h-4 w-4 text-info flex-shrink-0" />
        )}
        <span className="text-text-secondary">
          偵測到您的裝置：<span className="font-medium text-foreground">{device.osName} · {device.browserName}</span>
        </span>
      </div>

      {/* 依環境顯示教學 */}
      {device.isIOS && device.isSafari && <IOSSafariGuide />}
      {device.isIOS && !device.isSafari && <IOSOtherGuide />}
      {device.isAndroid && device.isChrome && !canInstall && <AndroidChromeGuide />}
      {device.isAndroid && !device.isChrome && <AndroidOtherGuide />}
      {device.isDesktop && device.isChrome && !canInstall && <DesktopChromeGuide />}
      {device.isDesktop && device.isEdge && !canInstall && <DesktopEdgeGuide />}
      {device.isDesktop && !device.isChrome && !device.isEdge && <DesktopOtherGuide />}

      {/* 優點說明 */}
      <div className="mt-8 pt-6 border-t">
        <h2 className="font-semibold mb-4">安裝後的好處</h2>
        <div className="grid gap-3">
          {[
            { title: '快速啟動', desc: '從主畫面一鍵開啟，不需要開瀏覽器' },
            { title: '全螢幕體驗', desc: '隱藏瀏覽器工具列，更大的瀏覽空間' },
            { title: '離線瀏覽', desc: '部分功能在沒有網路時仍可使用' },
          ].map((item) => (
            <div
              key={item.title}
              className="flex gap-3 p-3 rounded-theme-sm border bg-surface"
            >
              <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ===== 各環境教學子元件 ===== */

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex gap-3 p-4 rounded-theme-sm border bg-surface">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-text-inverse flex items-center justify-center text-sm font-bold">
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <p className="font-semibold text-sm">{title}</p>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function IOSSafariGuide() {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-base">Safari 安裝步驟</h2>
      <StepCard
        step={1}
        icon={<Share className="h-4 w-4 text-info" />}
        title="點擊「分享」按鈕"
        description="在 Safari 底部工具列找到分享圖示（方框加上箭頭的圖示）"
      />
      <StepCard
        step={2}
        icon={<Plus className="h-4 w-4 text-info" />}
        title="選擇「加入主畫面」"
        description="在分享選單中向下捲動，找到並點擊「加入主畫面」選項"
      />
      <StepCard
        step={3}
        icon={<CheckCircle2 className="h-4 w-4 text-success" />}
        title="確認新增"
        description="點擊右上角的「新增」按鈕，APP 圖示就會出現在主畫面上"
      />
    </div>
  )
}

function IOSOtherGuide() {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-base">安裝步驟</h2>
      <div className="p-4 rounded-theme-sm border border-warning bg-warning/10">
        <p className="text-sm font-medium mb-1">需要使用 Safari 瀏覽器</p>
        <p className="text-sm text-text-secondary">
          iOS 裝置僅支援從 Safari 安裝到主畫面。請複製目前的網址，在 Safari 中開啟後按照指引操作。
        </p>
      </div>
      <StepCard
        step={1}
        icon={<ExternalLink className="h-4 w-4 text-info" />}
        title="開啟 Safari"
        description="複製網址列的連結，打開 Safari 瀏覽器並貼上網址"
      />
      <StepCard
        step={2}
        icon={<Share className="h-4 w-4 text-info" />}
        title="點擊「分享」按鈕"
        description="在 Safari 底部工具列找到分享圖示"
      />
      <StepCard
        step={3}
        icon={<Plus className="h-4 w-4 text-info" />}
        title="選擇「加入主畫面」"
        description="在分享選單中找到「加入主畫面」並點擊新增"
      />
    </div>
  )
}

function AndroidChromeGuide() {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-base">Chrome 安裝步驟</h2>
      <StepCard
        step={1}
        icon={<MoreVertical className="h-4 w-4 text-info" />}
        title="點擊「更多」選單"
        description="在 Chrome 右上角找到三個點的選單按鈕"
      />
      <StepCard
        step={2}
        icon={<Download className="h-4 w-4 text-info" />}
        title="選擇「安裝應用程式」"
        description="在選單中找到「安裝應用程式」或「新增至主畫面」選項"
      />
      <StepCard
        step={3}
        icon={<CheckCircle2 className="h-4 w-4 text-success" />}
        title="確認安裝"
        description="點擊「安裝」按鈕，APP 就會安裝到您的手機上"
      />
    </div>
  )
}

function AndroidOtherGuide() {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-base">安裝步驟</h2>
      <div className="p-4 rounded-theme-sm border border-info bg-info-bg">
        <p className="text-sm font-medium mb-1">建議使用 Chrome 瀏覽器</p>
        <p className="text-sm text-text-secondary">
          Chrome 提供最佳的安裝體驗。您也可以嘗試目前瀏覽器的選單尋找「新增至主畫面」選項。
        </p>
      </div>
      <StepCard
        step={1}
        icon={<MoreVertical className="h-4 w-4 text-info" />}
        title="開啟瀏覽器選單"
        description="找到瀏覽器的設定或更多選單"
      />
      <StepCard
        step={2}
        icon={<Plus className="h-4 w-4 text-info" />}
        title="選擇「新增至主畫面」"
        description="在選單中找到「新增至主畫面」或類似的選項"
      />
      <StepCard
        step={3}
        icon={<CheckCircle2 className="h-4 w-4 text-success" />}
        title="確認新增"
        description="確認後 APP 圖示就會出現在主畫面"
      />
    </div>
  )
}

function DesktopChromeGuide() {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-base">Chrome 桌面版安裝步驟</h2>
      <StepCard
        step={1}
        icon={<ArrowUp className="h-4 w-4 text-info" />}
        title="找到安裝圖示"
        description="在網址列右側找到安裝圖示（螢幕加下載箭頭），或點擊右上角三個點選單"
      />
      <StepCard
        step={2}
        icon={<Download className="h-4 w-4 text-info" />}
        title="選擇「安裝」"
        description="點擊安裝圖示，或在選單中選擇「安裝 Vsale...」"
      />
      <StepCard
        step={3}
        icon={<CheckCircle2 className="h-4 w-4 text-success" />}
        title="確認安裝"
        description="在彈窗中點擊「安裝」，APP 將出現在桌面和開始選單中"
      />
    </div>
  )
}

function DesktopEdgeGuide() {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-base">Edge 桌面版安裝步驟</h2>
      <StepCard
        step={1}
        icon={<MoreVertical className="h-4 w-4 text-info" />}
        title="點擊右上角選單"
        description="點擊 Edge 右上角的「...」更多選項按鈕"
      />
      <StepCard
        step={2}
        icon={<Download className="h-4 w-4 text-info" />}
        title="選擇「應用程式」→「安裝此網站」"
        description="在選單中找到「應用程式」子選單，點擊「將此網站安裝為應用程式」"
      />
      <StepCard
        step={3}
        icon={<CheckCircle2 className="h-4 w-4 text-success" />}
        title="確認安裝"
        description="點擊「安裝」即可完成"
      />
    </div>
  )
}

function DesktopOtherGuide() {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-base">安裝步驟</h2>
      <div className="p-4 rounded-theme-sm border border-info bg-info-bg">
        <p className="text-sm font-medium mb-1">建議使用 Chrome 或 Edge 瀏覽器</p>
        <p className="text-sm text-text-secondary">
          目前瀏覽器可能不支援直接安裝為 APP。請使用 Chrome 或 Edge 開啟此頁面以獲得最佳安裝體驗。
        </p>
      </div>
    </div>
  )
}
