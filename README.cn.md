# Terminal Theme Next.js

基于 **Next.js 15** 的复古终端风博客主题，支持 **MDX**，命令行式视觉。本项目将经典的 Hugo Terminal 主题体验带到 React 生态，并加入现代工程实践。

> 英文说明见 [README.md](./README.md)

![Terminal Theme Preview](./public/terminal-preview.svg)

## ✨ 功能特性

- 🖥️ **终端风格界面** — 复古命令行观感，可自定义配色
- 📝 **MDX 支持** — 用 MDX 写作，可嵌入 React 组件
- 🎨 **语法高亮** — 多语言代码块
- 📱 **响应式布局** — 适配桌面、平板与手机
- ⚡ **性能** — Next.js 15 + React 19
- 🔍 **SEO** — 合理的 meta 与结构化内容
- 🌙 **终端配色变量** — 灵感来自经典终端模拟器
- 🪄 **Magic Canvas** — 登录用户可在 `/canvas` 上绘制草图、通过 fal.ai 做图生图风格转换，并将结果及元数据保存到 Convex
- 🎮 **AI Game Creator** — 在 `/game` 使用 OpenAI Agents SDK 生成浏览器小游戏，流式展示可见的 Agent 进度，用 fal.ai 生成介绍图，并将分析 Markdown 与独立 HTML 发布到 Convex storage
- 🖼️ **Gallery 与账号系统** — Gallery 浏览 / 上传流程，以及 Convex 驱动的登录、注册、个人资料与密码重置
- 🚀 **现代技术栈** — TypeScript、Tailwind CSS 等
- 🧪 **单元测试** — [Jest](https://jestjs.io/) + [Testing Library](https://testing-library.com/)，覆盖率与 Markdown 报告（见 [测试](#测试)）

更完整的技术说明见 [TECH.md](./TECH.md)。

## 🏗️ 项目结构

```
terminal-theme-nextjs/
├── content/
│   └── posts/                 # MDX 博文
│       ├── hello_world.mdx
│       └── showcase.mdx
├── public/
│   ├── fonts/                 # Fira Code 字体
│   └── *.svg                  # 静态资源与图标
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── about/             # 关于页
│   │   ├── api/games/         # OpenAI Agents 游戏生成与介绍图代理
│   │   ├── api/magic-canvas/  # fal.ai 图像生成与下载代理
│   │   ├── canvas/            # Magic Canvas 绘图与风格转换页
│   │   ├── game/              # AI Game Creator 页面
│   │   ├── gallery/           # Gallery 页面
│   │   ├── posts/             # 动态文章路由
│   │   ├── profile/           # 账号资料页
│   │   ├── sign/              # 登录与密码重置
│   │   ├── signup/            # 注册页
│   │   ├── tags/              # 按标签筛选
│   │   ├── globals.css        # 全局样式与终端主题
│   │   ├── layout.tsx         # 根布局
│   │   └── page.tsx           # 首页
│   ├── components/            # 可复用组件
│   │   ├── CodeBlock.tsx      # 语法高亮代码块
│   │   ├── Header.tsx         # 终端风导航
│   │   ├── Footer.tsx         # 页脚
│   │   ├── MagicCanvas.tsx    # 草图画布、生成 UI、预览与下载
│   │   ├── game/              # AI Game Creator 聊天、卡片、预览与提交 UI
│   │   ├── MDXContent.tsx     # MDX 渲染
│   │   ├── PostCard.tsx       # 文章卡片
│   │   └── *.tsx              # 其他 UI
│   └── lib/                   # 工具、提示词与类型
│       ├── gameCreator/       # Agents 工作流与内置 html-minigame skill
│       ├── posts.ts           # 文章读取等
│       └── types.ts           # TypeScript 类型
├── .github/
│   ├── workflows/jest-pr.yml  # GitHub Actions：面向 main 的 PR 跑 Jest + 覆盖率
│   └── scripts/run-jest-for-pr.sh  # CI：按 PR diff 跑关联测试（或整仓套件）
├── tests/                     # 单元测试（*.test.ts / *.test.tsx）
├── test_reports/              # Jest 生成的报告（已 gitignore）
├── jest.config.js             # Jest 配置（next/jest）
├── jest.setup.ts              # Jest + Testing Library
├── jest.env.js                # 测试环境（如日期 TZ）
├── jest.markdownReporter.cjs  # 自定义 Markdown + 覆盖率汇总
├── mdx-components.tsx         # 全局 MDX 组件映射
├── next.config.ts             # Next.js 配置
└── package.json               # 依赖与脚本
```

## 🛠️ 技术栈

### 核心框架

- **[Next.js 15](https://nextjs.org/)** — App Router
- **[React 19](https://react.dev/)** — React 最新大版本
- **[TypeScript](https://www.typescriptlang.org/)** — 类型安全

### 内容与样式

- **[MDX](https://mdxjs.com/)** — Markdown + React
- **[next-mdx-remote](https://github.com/hashicorp/next-mdx-remote)** — 服务端 MDX 渲染
- **[Tailwind CSS 4](https://tailwindcss.com/)** — 工具类 CSS
- **[Fira Code](https://github.com/tonsky/FiraCode)** — 等宽字体与连字

### 内容处理

- **[gray-matter](https://github.com/jonschlinkert/gray-matter)** — Front matter 解析
- **[remark](https://remark.js.org/)** — Markdown 处理
- **[rehype](https://rehype.js.org/)** — HTML 处理
- **[rehype-highlight](https://github.com/rehypejs/rehype-highlight)** — 语法高亮

### 工具库

- **[OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)** — AI Game Creator 用于规划、生成独立 HTML 游戏并做验证
- **[@fal-ai/client](https://fal.ai/)** — Magic Canvas 使用的 fal.ai 图像生成客户端
- **[date-fns](https://date-fns.org/)** — 日期处理
- **[reading-time](https://github.com/ngryman/reading-time)** — 阅读时长估算
- **[lucide-react](https://lucide.dev/)** — 图标
- **[clsx](https://github.com/lukeed/clsx)** — 条件 class

## 🚀 快速开始

### 环境要求

- 推荐 Node.js 22+。AI Game Creator 使用的 OpenAI Agents SDK 官方目标运行环境是 Node.js 22 或更新版本。
- npm、yarn、pnpm 或 bun

### 安装与运行

1. **克隆仓库**

   ```bash
   git clone https://github.com/CharryLee0426/terminal-theme-nextjs.git
   cd terminal-theme-nextjs
   ```

2. **安装依赖**

   ```bash
   npm install
   # 或
   yarn install
   # 或
   pnpm install
   ```

3. **启动开发服务器**

   ```bash
   npm run dev
   # 或
   yarn dev
   # 或
   pnpm dev
   ```

4. **在浏览器中打开** [http://localhost:3000](http://localhost:3000)

### Magic Canvas 配置

`/canvas` 页面仅登录后可用。未登录访问者会看到登录引导，而不是绘图编辑器。登录用户可以在空白白板上绘制草图，选择风格（`No` 或 `Anime`），输入额外提示词，并将画布图像提交给 fal.ai。浏览器只会调用本地 Next.js 路由 `src/app/api/magic-canvas/route.ts`；fal 凭据保留在服务端。

本地开发时，在 `.env.local` 中加入以下变量之一；生产部署时也需要在 Next.js 托管平台设置：

```bash
FAL_KEY=your-fal-key
# 或
FAL_API_KEY=your-fal-key
```

该 API 使用 `fal-ai/bytedance/seedream/v4.5/edit`，在可用时会把队列 / 日志状态流式返回给加载动画，并通过同源代理下载生成图，避免浏览器跳转到远程图片地址。

生成成功后，客户端会通过已认证的 Convex mutation 将生成图保存到 Convex storage。每条记录都绑定当前用户，并保存：

- 用户 id
- 创建时间
- 选择的风格
- 使用的模型名
- 额外提示词
- 生成图的 Convex storage id

生产环境使用前，请先部署 Convex schema / functions：

```bash
npx convex deploy
```

### AI Game Creator 配置

`/game` 页面允许用户描述一个浏览器小游戏，进入类似 ChatGPT 的对话页，并调用服务端路由 `src/app/api/games/generate/route.ts`。该路由会读取仓库内置的 `html-minigame` skill：`src/lib/gameCreator/html-minigame/SKILL.md`，并运行 OpenAI Agents SDK 工作流：

- planner agent：生成 `<slug>_analysis.md`
- builder agent：生成独立的 `<slug>.html`
- verifier agent：返回 `PASS` / `FAIL` 验证结果

客户端会以 `stream: true` 请求 NDJSON 流式响应，并展示规划、构建、验证、封面生成以及简洁 `visibleProcess` 摘要等可见进度。不会暴露隐藏 chain-of-thought。

HTML 生成完成后，同一路由会使用 fal.ai 生成游戏介绍图。若未配置 fal 凭据，本地开发会退回到生成 SVG 占位图，方便继续联调流程。用户可以在 iframe 弹窗中预览游戏，在聊天中继续要求修改，下载任一生成文件，并将最终 Markdown、HTML 与介绍图提交到 Convex storage。

对于编辑提示词，客户端会把当前草稿 HTML 与游戏元数据（`gameName`、`slug`、文件名、分析 Markdown）一起发送给服务端。Agent 会基于这些上下文保留现有游戏身份，并按用户要求修改，而不是重新开始生成。

本地开发时，在 `.env.local` 中加入以下变量；生产部署时也需要在 Next.js 托管平台设置：

```bash
OPENAI_API_KEY=your-openai-api-key
OPENAI_GAME_MODEL=gpt-4.1-mini # 可选；默认 gpt-4.1-mini
FAL_KEY=your-fal-key           # 或 FAL_API_KEY
```

已发布游戏记录存储在 Convex 的 `games` 表中。每条记录会指向三个 Convex storage 对象，并保存元数据：

- 生成的分析 Markdown 文件
- 生成的 HTML 文件
- 游戏介绍图
- slug 与生成文件名
- 游戏名称
- 原始提示词
- 创建时间
- 点赞数

生产环境使用游戏发布前，请先部署 Convex schema / functions：

```bash
npx convex deploy
```

<a id="测试"></a>

## 🧪 测试

单元测试使用 **[Jest](https://jestjs.io/)**、**[next/jest](https://nextjs.org/docs/app/building-your-application/testing/jest)** 与 **[Testing Library](https://testing-library.com/)**。用例放在 **`tests/`** 目录，文件名为 `*.test.ts` 或 `*.test.tsx`（通过 `@/` 别名引用 `src` 下的代码）。Canvas 相关测试覆盖 Magic Canvas React 组件、登录门禁、Convex 保存流程与 `/api/magic-canvas` 路由，并会 mock fal 与 Convex 调用。AI Game Creator 相关测试覆盖 `/api/games/generate` 的 JSON 与 NDJSON 流式协议，以及前端流解析和进度 UI。

```bash
npm test            # 运行全部测试；对 src/**/*.{ts,tsx} 收集覆盖率
npm run test:watch  # 监听模式（配置相同）
```

每次运行会在 **`test_reports/`** 下生成产物（该目录 **不提交到 Git**）：

| 输出 | 说明 |
|------|------|
| `jest-report-<时间戳>.md` | 测试结果 Markdown，含 **`src` 逐文件覆盖率** |
| `test_reports/coverage/` | Istanbul：`index.html`、`lcov.info`、`coverage-summary.json` |

### CI（GitHub Actions）

针对 **`main`** 分支发起或更新 **Pull Request** 时，会运行 **Jest (PR)** 工作流（`.github/workflows/jest-pr.yml`）。若 PR **仅**修改 Markdown / MDX（`**/*.md`、`**/*.mdx`），则 **不会触发** 该工作流。

对包含代码或其它文件的 PR，CI 会对比 PR 的 base 与 head 提交：

- **关联测试** — `src/`、`tests/` 下的改动会执行 **`jest --findRelatedTests`** 并收集覆盖率，相当于只跑与本次 diff 相关的用例。
- **整仓套件** — 若改动触及 Jest / Next / 工具链根配置（例如 `jest.config.js`、`jest.setup.ts`、`package.json`、`package-lock.json`、`tsconfig.json`、`next.config.*`），则执行 **`npm test`**，确保配置变更仍能通过全量测试。

运行成功后会将 **`test_reports/`** 上传为工作流 **Artifact**（Markdown 报告与 HTML/LCOV 覆盖率），并把最新的 **`jest-report-*.md`** 追加到 GitHub Actions 的 **Job Summary**，便于在网页上快速查看。

还会在 PR 上发布一条 **可更新的置顶评论**（`jest-ci-report`）：每次推送会更新同一条评论，内容与报告一致（超长会截断并提示下载 Artifact）。**来自 fork 的 PR** 在安全策略下令牌权限受限，发表评论可能失败并已设置 `continue-on-error`；完整报告仍以 Artifact 与工作流日志为准。

## 📝 撰写内容

### 新建文章

在 `content/posts/` 下创建 MDX 文件，例如：

```markdown
---
title: "Your Post Title"
date: "2024-01-15"
description: "A brief description of your post"
tags: ["nextjs", "react", "terminal"]
---

# Your Content Here

You can use **markdown** and React components!

```javascript
console.log("Hello, Terminal!");
```

<Callout type="info">
  This is a custom React component in MDX!
</Callout>
```

### 可用组件

- `<CodeBlock>` — 带复制等能力的代码块
- `<Callout>` — 信息 / 警告 / 错误提示框
- `<CustomImage>` — 图片与说明
- `<YouTubeEmbed>` — 嵌入 YouTube

## 🎨 自定义

### 配色

主题使用 CSS 变量，可在 `src/app/globals.css` 中修改：

```css
:root {
  --accent: #ffa86a;           /* 主强调色 */
  --background: #1d1e20;       /* 背景 */
  --color: #c9c9c9;            /* 正文色 */
  --border-color: rgba(255, 255, 255, 0.1); /* 边框 */
  
  /* 终端色 */
  --terminal-green: #00ff41;
  --terminal-blue: #66d9ef;
  --terminal-yellow: #e6db74;
  /* ... 更多变量 */
}
```

### 添加自定义组件

1. 在 `src/components/` 中编写组件  
2. 在 `mdx-components.tsx` 中导出映射  
3. 在 MDX 正文中使用  

### 修改布局

- **顶栏**：`src/components/Header.tsx`  
- **页脚**：`src/components/Footer.tsx`  
- **全局布局**：`src/app/layout.tsx`  

<a id="convex-auth-and-jwt-keys-dev-and-production"></a>

## Convex 身份验证与 JWT 密钥（开发与生产）

项目使用 **[Convex](https://www.convex.dev/)** 与 **[@convex-dev/auth](https://labs.convex.dev/auth)**（密码登录）。登录成功后，Convex 会签发使用 **RS256** 签名的 **会话 JWT**。密钥对必须配置在 **Convex 部署的环境变量**中，而**不能**只放在 Vercel 或本地 `.env.local` 里。

### 必需的 Convex 变量

| 变量 | 作用 |
|------|------|
| `JWT_PRIVATE_KEY` | PKCS #8 PEM **私钥**，用于 **签发** JWT（务必保密）。 |
| `JWKS` | JSON Web Key Set，包含用于 **校验** 令牌的 **公钥** 材料。 |

若缺少 `JWT_PRIVATE_KEY`，登录会出现类似 `Missing environment variable JWT_PRIVATE_KEY` 的错误。

**不要**在 Convex Cloud 上自行设置 `CONVEX_SITE_URL`：它是部署的**内置**值（你的 `*.convex.site` 地址），JWT 的 `iss` 等声明依赖它。

官方文档：[Convex Auth — manual setup](https://labs.convex.dev/auth/setup/manual)。

### 本地开发

1. 将仓库关联到 Convex 项目（首次执行 `npx convex dev`）。  
2. 生成密钥对并写入**当前链接的部署**（由 `.env.local` 中的 `CONVEX_DEPLOYMENT` 等决定）：

   ```bash
   npm run convex:apply-auth-keys
   ```

   上述命令会执行 `scripts/generate-convex-auth-keys.mjs --apply`，通过 `npx convex env set … --from-file` 设置 `JWT_PRIVATE_KEY` 与 `JWKS`（含空格的 PEM 不能作为单个 shell 参数直接传入）。

3. 若只想**打印**变量值（例如粘贴到 Dashboard），可运行：

   ```bash
   npm run convex:generate-auth-keys
   ```

4. 修改 Convex 环境变量后，请重启 `npx convex dev`。

本地 `dev` 与 `start` 脚本会设置 `NODE_OPTIONS=--dns-result-order=ipv4first`。这可以避免某些网络环境下 Next.js auth middleware 将 `auth:signIn` / `auth:signOut` 代理到 Convex Cloud 时出现 Node/undici 连接超时。

### 生产环境

Convex 的 **开发** 与 **生产** 是不同部署，必须在 **生产部署** 上也配置 **`JWT_PRIVATE_KEY` 和 `JWKS`**。可以复制开发环境密钥，但更推荐为生产使用**独立密钥对**并做好**轮换**规划。

**方式 A — Convex Dashboard（最简单）**

1. 打开 [Convex Dashboard](https://dashboard.convex.dev) → 选中项目 → 选择 **Production** 部署。  
2. 进入 **Settings → Environment variables**。  
3. 本地执行 `npm run convex:generate-auth-keys`，将输出的：  
   - `JWT_PRIVATE_KEY` — 私钥整段（单行或多行 PEM，Dashboard 一般均支持）；  
   - `JWKS` — `JWKS=` 后的 JSON 原样粘贴。  

**方式 B — Convex CLI 指定生产**

在本地生成 PEM / JSON 文件（**勿提交到 Git**），然后：

```bash
npx convex env set --prod JWT_PRIVATE_KEY --from-file ./jwt-private.pem
npx convex env set --prod JWKS --from-file ./jwks.json
```

若使用命名部署，可将 `--prod` 换成 `--deployment <名称>`。

### Vercel（或其他 Next.js 托管）

在宿主平台配置面向浏览器的 **公开** Convex 地址（可参考 `.env.local`）：

- `NEXT_PUBLIC_CONVEX_URL` — 例如 `https://<deployment>.convex.cloud`  
- `NEXT_PUBLIC_CONVEX_SITE_URL` — 例如 `https://<deployment>.convex.site`  

生产构建应使用 **生产环境** Convex 的 URL。JWT 私钥与 `JWKS` **只**放在 Convex，**不要**做成 `NEXT_PUBLIC_*`。

### 轮换密钥

重新生成并覆盖 `JWT_PRIVATE_KEY` / `JWKS` 会使**已有会话失效**，用户需重新登录，请提前规划。

<a id="cloudflare-turnstile-forgot-password"></a>

## Cloudflare Turnstile（忘记密码）

登录页（`/sign`）提供 **忘记密码** 流程，通过 [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) 做人机验证；服务端在 Convex 的 `passwordReset:resetPasswordWithCaptcha`（`convex/passwordReset.ts`）中校验 token。

### 两个变量、两套环境

| 变量 | 配置位置 | 作用 |
|------|----------|------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Next.js（`.env.local`、Vercel 等） | 在浏览器中加载 Turnstile 组件 |
| `TURNSTILE_SECRET_KEY` | **Convex**（各部署：dev / prod 分别设置） | 重置密码时在服务端验证 token |

`.env.local` **只**给 Next.js 用，**不会**传给 Convex；`TURNSTILE_SECRET_KEY` 必须在 [Convex Dashboard](https://dashboard.convex.dev) 里对**实际连接的前端所使用**的部署设置（**Settings → Environment variables**），或用下文 CLI。若 Convex 上未配置，会报错 `Password reset is not configured.`

### 在 Cloudflare 创建 Turnstile 站点

1. 打开 [Cloudflare 控制台](https://dash.cloudflare.com/) → **Turnstile** → **Add widget**。  
2. 选择与域名匹配的模式（本地开发可加入 `localhost`；生产使用你的正式域名）。  
3. 将 **Site key** 写入 Next.js 的 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`。  
4. 将 **Secret key** 写入 Convex 的 `TURNSTILE_SECRET_KEY`（与 Site key 为同一小组件）。  

生产与开发若使用不同小组件或域名，需分别配置。

### 本地开发使用测试密钥

快速联调可使用 Cloudflare 文档中的 [Turnstile 测试密钥](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)（成对的假 site / secret，验证恒通过）。将**测试 site key** 放在 `.env.local` 的 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`，将**配对的测试 secret** 设到**当前 `npx convex dev` 所链接的 Convex 开发部署**的 `TURNSTILE_SECRET_KEY`。

### 用 CLI 设置 Convex 中的 Secret

对当前 `npx convex dev` 所链接的部署（一般为 dev）：

```bash
npx convex env set TURNSTILE_SECRET_KEY "你的-secret"
```

生产环境：

```bash
npx convex env set --prod TURNSTILE_SECRET_KEY "你的-secret"
```

修改 Convex 环境变量后，若本机在跑 `npx convex dev`，请重启该进程。

## 🚀 部署到 Vercel

### 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/CharryLee0426/terminal-theme-nextjs)

### 手动部署

1. **推送到 GitHub**

   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **连接 Vercel**

   - 打开 [vercel.com](https://vercel.com)  
   - 导入 GitHub 仓库  
   - 构建选项一般可自动识别  
   - 部署  

3. **环境变量**

   - 为 **生产** Convex 部署配置 `NEXT_PUBLIC_CONVEX_URL` 与 `NEXT_PUBLIC_CONVEX_SITE_URL`（详见上文 [Convex 身份验证与 JWT](#convex-auth-and-jwt-keys-dev-and-production)）。  
   - 在 Convex **生产** 部署上设置 `JWT_PRIVATE_KEY` 与 `JWKS`（同上），并执行 `npx convex deploy` 部署最新 Convex schema / functions，确保 Magic Canvas 可以写入 `canvasImages`，AI Game Creator 可以写入 `games`。  
   - **忘记密码**：在 Vercel 配置 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`，在 Convex **生产** 部署配置 `TURNSTILE_SECRET_KEY`（详见 [Cloudflare Turnstile](#cloudflare-turnstile-forgot-password)）。  
   - **Magic Canvas**：在 Next.js 托管平台配置 `FAL_KEY` 或 `FAL_API_KEY`。该值必须保留在服务端，不能加 `NEXT_PUBLIC_` 前缀。  
   - **AI Game Creator**：在 Next.js 托管平台配置 `OPENAI_API_KEY`。可选配置 `OPENAI_GAME_MODEL` 来指定 Agents SDK 工作流使用的模型。该值必须保留在服务端，不能加 `NEXT_PUBLIC_` 前缀。  
   - 修改环境变量后重新部署。  

### 构建说明

- **Framework**：Next.js  
- **Build Command**：`npm run build`  
- **Output Directory**：`.next`  
- **Install Command**：`npm install`  

## 📚 延伸阅读

### 架构说明

- [TECH.md](./TECH.md) — 技术栈、目录结构、内容管线、身份验证与测试说明

### Next.js

- [Next.js 文档](https://nextjs.org/docs)  
- [Learn Next.js](https://nextjs.org/learn)  

### MDX

- [MDX 文档](https://mdxjs.com/)  
- [next-mdx-remote](https://github.com/hashicorp/next-mdx-remote)  

## 🤝 参与贡献

欢迎提交 Pull Request。较大改动请先开 Issue 讨论。

1. Fork 本仓库  
2. 新建分支（`git checkout -b feature/AmazingFeature`）  
3. 提交修改（`git commit -m 'Add some AmazingFeature'`）  
4. 推送分支（`git push origin feature/AmazingFeature`）  
5. 发起 Pull Request  

## 📄 许可证

本项目基于 MIT 许可证，详见 [LICENSE](LICENSE)。

## 🙏 致谢

- **[panr/hugo-theme-terminal](https://github.com/panr/hugo-theme-terminal)** — 原版 Hugo Terminal 主题，感谢 [panr](https://github.com/panr)。  
- **[Terminal.css](https://panr.github.io/terminal-css/)** — 配色方案工具  
- 所有为本项目提供依赖与灵感的开源社区  

---

<div align="center">

**[🌟 Star this repo](https://github.com/CharryLee0426/terminal-theme-nextjs)** • **[🐛 Report Bug](https://github.com/CharryLee0426/terminal-theme-nextjs/issues)** • **[💡 Request Feature](https://github.com/CharryLee0426/terminal-theme-nextjs/issues)**

Made with ❤️ by [CharryLee](https://github.com/CharryLee0426)


</div>
