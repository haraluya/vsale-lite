/**
 * Lighthouse CI 設定檔
 *
 * 用於效能檢查 (US5 - Performance)
 */

module.exports = {
  ci: {
    collect: {
      // 使用 Next.js 預設的建置目錄
      staticDistDir: '.next',
      // 或者指定要測試的 URL（需要先啟動 dev server）
      // url: ['http://localhost:4000', 'http://localhost:4000/store'],
      numberOfRuns: 3, // 執行 3 次取平均值
    },
    assert: {
      // 效能預算
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }], // Performance >= 90
        'categories:accessibility': ['warn', { minScore: 0.9 }], // Accessibility >= 90
        'categories:best-practices': ['warn', { minScore: 0.9 }], // Best Practices >= 90
        'categories:seo': ['warn', { minScore: 0.9 }], // SEO >= 90
        // Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }], // FCP < 1.8s
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }], // LCP < 2.5s
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }], // CLS < 0.1
        'total-blocking-time': ['warn', { maxNumericValue: 200 }], // TBT < 200ms
      },
    },
    upload: {
      // 將報告儲存到本地
      target: 'filesystem',
      outputDir: './specs/017-health-check/reports/lighthouse',
    },
  },
}
