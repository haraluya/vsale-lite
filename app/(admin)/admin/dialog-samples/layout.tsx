// 強制動態渲染，避免預渲染時 workUnitAsyncStorage 未初始化錯誤
export const dynamic = 'force-dynamic'

export default function DialogSamplesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
