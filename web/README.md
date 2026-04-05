# tokenarena web

Next.js 16 App Router Web 应用，负责：

- 用户注册 / 登录
- better-auth session 管理
- CLI API key 管理
- usage 数据 ingest
- `/usage` 仪表盘展示

## 必需环境变量

在 `web/.env` 中配置：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/token_arena
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3000
GA_SECRET=G-XXXXXXXXXX
AUTH_MODE=self-hosted
```

`GA_SECRET` 用于注入 Google Analytics 4（`gtag`）脚本；未配置时不会注入。

可选：

```bash
SHADOW_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/token_arena_shadow
```

当 `AUTH_MODE=production` 时，还需要按需配置 OAuth 提供商环境变量：

```bash
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINUXDO_CLIENT_ID=
LINUXDO_CLIENT_SECRET=
WATCHA_CLIENT_ID=
WATCHA_CLIENT_SECRET=
```

## 本地运行

```bash
pnpm install
pnpm --filter ./web dev
```

默认访问：

- `http://localhost:3000/register`
- `http://localhost:3000/login`
- `http://localhost:3000/usage`

## 典型联调流程

1. 注册一个新账号
2. 登录后在 `/usage` 右上角打开 `Settings`
3. 在设置弹窗里创建一个 CLI API key，并设置账户时区与项目模式
4. 在仓库根目录执行：

```bash
pnpm --filter ./cli dev -- init
pnpm --filter ./cli dev -- sync
```

5. 回到 `/usage` 查看统计和分组分析

## 校验命令

```bash
pnpm --filter ./web lint
pnpm --filter ./web test
pnpm --filter ./web build
pnpm --filter ./web exec prisma validate
```
