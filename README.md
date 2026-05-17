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
├── src/                        — 前端源码
│   ├── pages/                  — 页面
│   ├── api/                    — AI 服务
│   ├── utils/                  — 工具 + DB
│   └── styles/                 — 品牌样式
│
├── server/                     — 后端（云函数）
│   └── cloudfunctions/         — 云函数
│       ├── ai-ocr/             — OCR 识别
│       ├── ai-parse/           — AI 解析
│       ├── ai-search/          — AI 搜索
│       └── export-pdf/         — PDF 导出
│
├── docs/                       — 文档
│   ├── logo/                   — Logo 资源
│   ├── PRD/                    — 产品需求文档
│   └── design/                 — UI 设计稿
│
└── scripts/                    — 构建脚本
```

## 快速开始

```bash
# 安装依赖
npm install

# 开发
npm run dev

# 构建 H5
npm run build

# 小程序
npm run build:mp-weixin
```

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

## 设计系统

| 颜色 | 色值 | 用途 |
|------|------|------|
| 暖棕 | #8B6F47 | 主色，祖先/根节点 |
| 金棕 | #C9A961 | 辅色，分支节点 |
| 琥珀橙 | #D48C4A | 强调色，顶部节点 |
| 米白 | #F9F5F0 | 浅色背景 |
| 深棕灰 | #4A3F35 | 文字 |

## 数据模型（6张表）

person / family / source / ocr_record / relation / media

## License

MIT