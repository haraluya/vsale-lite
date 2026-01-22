/**
 * 測試公開設定 API
 * 檢查前台 Logo 元件能否正確取得 Logo URL
 */

// 測試 API
async function testPublicSettingsAPI() {
  try {
    // 使用 localhost:3000（需要先啟動開發伺服器）
    const response = await fetch('http://localhost:3000/api/public-settings', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })

    if (!response.ok) {
      console.error('❌ API 回應失敗:', response.status, response.statusText)
      return
    }

    const data = await response.json()
    console.log('✅ API 回應成功:', JSON.stringify(data, null, 2))

    // 檢查 logo_url 設定
    const logoSetting = data.settings?.find(s => s.key === 'logo_url')
    if (!logoSetting) {
      console.error('❌ 找不到 logo_url 設定')
      return
    }

    console.log('\n📋 Logo URL 設定:')
    console.log('  Key:', logoSetting.key)
    console.log('  Value:', logoSetting.value)
    console.log('  Value Type:', logoSetting.value_type)

    if (!logoSetting.value || logoSetting.value.trim() === '') {
      console.log('\n⚠️ Logo URL 為空字串！')
      console.log('   前台將使用預設 Logo (/logo.svg)')
      console.log('   請在後台系統設定頁面上傳 Logo')
    } else {
      console.log('\n✅ Logo URL 已設定:', logoSetting.value)
    }
  } catch (error) {
    console.error('❌ 測試失敗:', error.message)
    console.log('\n💡 請確認:')
    console.log('   1. 開發伺服器是否正在執行（pnpm dev）')
    console.log('   2. API 路由是否存在（app/api/public-settings/route.ts）')
  }
}

testPublicSettingsAPI()
