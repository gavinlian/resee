import { test, Page } from '@playwright/test'

const caughtErrors: string[] = []

test.describe('全局 Console 错误监控', () => {
  test('遍历核心页面并捕获 Console 报错', async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // 过滤 uni-app 框架自身初始化警告（不是业务错误）
        if (text.includes('uniCloud') || text.includes('HBuilderX')) return
        caughtErrors.push(`[Console Error]: ${text}`)
      }
    })

    page.on('pageerror', error => {
      caughtErrors.push(`[Page Error]: ${error.message}`)
    })

    // 初始化 uni mock
    await page.addInitScript(() => {
      const store: Record<string, any> = {
        current_family_id: 'family-001',
        ocr_raw_text: '第一章 始祖\n第一世 张三',
        user_id: 'test-user-001',
        ai_config: JSON.stringify({ provider: 'tongyi', model: 'qwen-vl-max', apiKey: 'test-key' }),
      }
      ;(window as any).uni = {
        setStorageSync: (k: string, v: any) => { store[k] = v },
        getStorageSync: (k: string) => store[k],
        clearStorage: () => { Object.keys(store).forEach(k => delete store[k]) },
        showToast: () => {},
        navigateTo: () => {},
        switchTab: () => {},
        setClipboardData: () => {},
        showModal: (opts: any) => { opts.success?.({ confirm: true }) },
        getCurrentPages: () => [],
        $page: { options: {} },
        chooseImage: (opts: any) => { opts.success?.({ tempFilePaths: ['https://example.com/test.jpg'] }) },
        login: (opts: any) => { opts.success?.() },
        getUserProfile: (opts: any) => { opts.success?.({ userInfo: { nickName: '测试用户', avatarUrl: '' } }) },
        getStorageSync: (k: string) => {
          if (k === 'user_id') return 'test-user-001'
          return store[k]
        },
      }
    })

    // mock 云端请求
    await page.route(/\/system\/service/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    })

    const routesToTest = [
      '/#/pages/index/index',
      '/#/pages/settings/index',
      '/#/pages/ocr/index',
    ]

    for (const route of routesToTest) {
      await page.goto(`http://localhost:8083${route}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
    }

    if (caughtErrors.length > 0) {
      console.error('\n🔥🔥🔥 抓到以下 Console 报错 🔥🔥🔥\n')
      caughtErrors.forEach(err => console.error(err))
      throw new Error(`发现 ${caughtErrors.length} 个 Console 错误！`)
    }
  })
})