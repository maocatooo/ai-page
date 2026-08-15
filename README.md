# aipage — OpenAI 聊天助手（Cloudflare Workers 部署）

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/maocatooo/ai-page)

> 点上面的按钮即可把本项目一键部署到你自己的 Cloudflare 账号（仓库需公开）。

单文件聊天前端（`public/index.html`）+ 边缘代理（`worker.js`），一个项目直接部署到
Cloudflare 的 **Workers & Pages**，无需服务器。

- 静态页面由 Workers Assets 托管
- `/proxy?target=<URL编码后的真实接口地址>` 由 Worker 转发并补 CORS 头，
  流式透传响应体，SSE 打字机效果正常

## 目录结构

```
aipage/
├── public/
│   └── index.html   # 聊天页面（静态资源）
├── worker.js        # Worker：/proxy 代理 + 静态资源兜底
├── wrangler.jsonc   # Cloudflare 配置
└── package.json
```

## 本地开发

```bash
npm install
npm run dev          # 等价于 npx wrangler dev，打开 http://localhost:8787
```

## 部署到 Cloudflare

方式一：命令行（推荐）

```bash
npx wrangler login   # 首次登录
npm run deploy       # 等价于 npx wrangler deploy
```

部署完成后访问 `https://aipage.<你的子域>.workers.dev`。

方式二：Dashboard 网页

1. 打开 Cloudflare Dashboard → **Workers & Pages** → **Create**（创建）
2. 选择 **Import a repository**（连接 Git 仓库），或直接上传本项目
3. 构建命令留空（无需构建），部署目录为项目根目录（读取 `wrangler.jsonc`）

方式三：一键部署按钮

点击 README 顶部的 **Deploy to Cloudflare** 按钮，授权登录后 Cloudflare 会自动
克隆仓库、创建 Worker 并部署，全程网页操作不需要本地环境。前提：

- 仓库托管在 GitHub / GitLab 且**公开**
- `wrangler.jsonc` 在仓库根目录（本项目已满足）

## 使用

页面左侧配置 API Base URL（如 `https://api.openai.com/v1`）、API Key、模型，
保持「启用代理」勾选（默认代理前缀 `/proxy`，即同域 Worker），即可开始聊天。
对话历史保存在浏览器 localStorage 中。
