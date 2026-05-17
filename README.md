# 族见族谱工具 - 项目说明

> 见家族，见自己。

基于 uni-app + Unicloud 的族谱工具，支持 OCR 扫描录入、AI 自动建谱、关系网图、导出。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | uni-app (Vue3 + Vite + TypeScript) | 跨端：H5/小程序/App |
| 云端 | Unicloud（Node.js Runtime + MongoDB） | 免费额度，快速上线 |
| AI | 通义千问/硅基流动（可切换） | OCR后解析+搜索 |

## 项目结构

```
uiapp/
├── src/                        — 前端源码（uni-app）
│   ├── pages/                  — 页面
│   │   ├── index/              — 首页（族谱列表）
│   │   ├── ocr/                — OCR 扫描录入
│   │   ├── ocr-review/        — AI 解析校正
│   │   ├── tree/              — 族谱树
│   │   ├── graph/             — 关系网图
│   │   ├── person/            — 成员详情
│   │   ├── search/            — AI 搜索
│   │   ├── export/            — 数据导出
│   │   ├── settings/          — 设置页
│   │   └── login/              — 登录页
│   ├── api/                    — AI 服务封装
│   │   ├── ai.ts              — AI 调用（含额度控制）
│   │   └── ai-config.ts       — AI 模型配置
│   ├── utils/                  — 工具函数
│   └── styles/                 — 品牌样式
│
├── uniCloud-aliyun/            — 云端（Unicloud）
│   ├── cloudfunctions/         — 云函数
│   │   ├── ai-ocr/            — OCR 文字识别
│   │   ├── ai-parse/          — AI 解析族谱
│   │   ├── ai-search/         — AI 搜索
│   │   ├── export-pdf/        — PDF 导出
│   │   ├── weixin-login/      — 微信登录
│   │   └── send-verify-code/  — 短信验证码
│   └── database/               — DB Schema
│       └── users.schema.json  — 用户表
│
├── e2e/                        — E2E 测试
│   └── catch-errors.spec.ts   — 全局 Console 报错监控
│
├── scripts/                     — 构建脚本
│   └── static-server.js       — H5 本地静态服务器
│
└── playwright.config.ts        — Playwright 配置
```

## 快速开始

```bash
# 安装依赖
npm install

# 开发（H5）
npm run dev

# 构建 H5
npm run build

# 小程序
npm run build:mp-weixin
```

## 本地 H5 测试

项目使用自定义静态服务器（`scripts/static-server.js`）在 `http://localhost:8083` 提供已构建的 H5 资源。

```bash
# 启动静态服务器（会自动找空闲端口）
node scripts/static-server.js

# 如果端口被占用，手动 kill 后重试
taskkill /F /PID <PID>
netstat -ano | findstr ":8083"
```

> 注意：H5 测试时 UniCloud 调用会被拦截并返回模拟数据，不会真的请求云端。

## Playwright E2E 测试

```bash
# 安装 Playwright 浏览器
npx playwright install

# 运行所有测试
npx playwright test

# 运行控制台错误监控测试
npx playwright test e2e/catch-errors.spec.ts

# 运行特定测试文件
npx playwright test tests/<文件名>.spec.ts

# 打开 Playwright 报告
npx playwright show-report
```

### 测试文件说明

| 文件 | 用途 |
|------|------|
| `e2e/catch-errors.spec.ts` | 全局 Console 报错监控，遍历所有核心页面 |
| `tests/` | 临时调试测试文件（可自行创建） |

### 调试技巧

- `page.evaluate(() => window.localStorage.clear())` — 清除浏览器缓存
- `page.route` — 拦截并 Mock 网络请求
- `page.addInitScript` — 注入全局 Mock（如 `uni.getStorageSync`）
- `await page.waitForEvent('filechooser')` — 等待文件选择对话框

## 云端部署

### 1. 云函数部署（通过 HBuilderX）

1. 下载并安装 [HBuilderX](https://www.dcloud.io/hbuilderx.html)
2. 用 HBuilderX 打开 `e:\resee\uiapp` 项目
3. 在左侧「uniCloud-aliyun」目录右键 → 「关联服务空间」
4. 对每个云函数右键 → 「上传部署」

### 2. 云函数列表

| 云函数 | 用途 |
|--------|------|
| `ai-ocr` | OCR 文字识别（支持百度/腾讯 OCR API） |
| `ai-parse` | AI 解析 OCR 文本为族谱数据结构 |
| `ai-search` | AI 自然语言搜索 |
| `export-pdf` | 导出族谱为 PDF |
| `weixin-login` | 微信一键登录 |
| `send-verify-code` | 发送手机验证码 |

### 3. 数据库初始化

在 HBuilderX 的「云数据库」面板中：
1. 新建 `users` 集合
2. 右键 → 「导入 schema」，选择 `uniCloud-aliyun/database/users.schema.json`

> 注意：其他数据表（person / family / source / ocr_record / relation / media）需按需求创建并导入对应的 schema 文件。

### 4. 微信小程序配置

在 `manifest.json` 中填写微信小程序 AppID：

```json
"mp-weixin": {
  "appid": "your-weixin-appid",  // 替换为你的小程序 AppID
  "setting": {
    "urlCheck": false
  }
}
```

## AI 额度说明

| 等级 | OCR/天 | 搜索/天 | 解析/天 |
|------|--------|---------|---------|
| 免费用户 | 5 次 | 20 次 | 10 次 |
| 会员 | 50 次 | 200 次 | 100 次 |
| VIP | 不限 | 不限 | 不限 |

额度记录在浏览器 `localStorage`，键名格式为 `ai_count_{type}_YYYY-MM-DD`。

## 页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | /pages/index/index | 族谱列表 |
| OCR录入 | /pages/ocr/index | 拍照→识别 |
| 校正页 | /pages/ocr-review/index | AI解析+校正 |
| 族谱树 | /pages/tree/index | 苏式/欧式/宝塔式 |
| 关系网图 | /pages/graph/index | 节点+边+置信度 |
| 成员详情 | /pages/person/index | 信息+关系+相册 |
| AI搜索 | /pages/search/index | 自然语言/关键词 |
| 导出 | /pages/export/index | JSON/PDF |
| 设置 | /pages/settings/index | AI模型+额度 |
| 登录 | /pages/login/index | 微信/手机号登录 |

## 设计系统

| 颜色 | 色值 | 用途 |
|------|------|------|
| 暖棕 | #8B6F47 | 主色，祖先/根节点 |
| 金棕 | #C9A961 | 辅色，分支节点 |
| 琥珀橙 | #D48C4A | 强调色，顶部节点 |
| 米白 | #F9F5F0 | 浅色背景 |
| 深棕灰 | #4A3F35 | 文字 |

## 数据模型

| 集合 | 说明 |
|------|------|
| person | 人员信息 |
| family | 族谱信息 |
| relation | 关系信息 |
| source | 资料来源 |
| ocr_record | OCR 记录 |
| media | 媒体文件 |
| users | 用户信息（登录） |

## License

MIT