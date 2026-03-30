![tokenarena](assets/banner.png)


[![Docker Image](https://img.shields.io/docker/pulls/poco-ai/tokenarena?logo=docker)](https://hub.docker.com/r/pocoai/tokenarena) [![pnpm](https://img.shields.io/badge/pnpm-monorepo-blue?logo=pnpm)](https://pnpm.io/) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/poco-ai/tokenarena/pulls) [![License](https://img.shields.io/github/license/poco-ai/tokenarena)](LICENSE)

**你每天烧了多少 token？** 用 Cursor、Claude Code、Copilot 这些工具写代码很爽，但你有没有好奇过：

- 每天到底花了多少 token？
- 哪个项目最费 token？
- 输入、输出、reasoning、缓存的比例是多少？
- 一天里什么时候最活跃？

tokens-arena 是一个开源的 AI 编码助手用量追踪平台。它能自动采集本地 AI coding CLI 的使用数据，让你在简洁的 Web 仪表盘中一目了然地看到每天的 token 消耗、会话活跃度和多维度分析。

tokens-arena 帮你回答这些问题。

## 功能概览

- **Usage 总览** — 按 1 天 / 7 天 / 30 天 / 自定义区间查看 token 用量
- **多维度分析** — 按设备、工具、模型、项目分组查看数据
- **详细指标** — 总 token、输入、输出、reasoning、缓存命中、活跃时长、会话数、消息数
- **多工具支持** — 支持采集多种本地 AI CLI 的 usage 数据
- **隐私优先** — 项目名称默认按 hash 匿名上传，你自行决定是否公开
- **多语言 & 深色模式** — 支持中英文切换和主题切换
- **Docker 一键部署** — 几行命令即可跑起来

## 使用流程

1. **注册账号** — 打开 Web 页面注册并登录
2. **创建 API Key** — 在 Settings 中生成 CLI 用的 API key
3. **下载**
    ```shell
    npm install -g @poco-ai/tokenarena
    ```
4. **初始化 CLI** — 运行 `tokenarena init`，输入服务地址和 API key
5. **同步数据** — 运行 `tokenarena sync`，数据会上传到 Web 端
6. **开启持续同步（跨平台）** — 运行 `tokenarena daemon`，保持 CLI 进程运行即可定时同步
7. **查看分析** — 打开 `/usage` 页面查看你的 token 用量分析

### CLI 持续同步

CLI 提供 `daemon` 命令，启动后会常驻运行并按固定间隔自动执行同步。

```bash
# 开启持续同步（默认 5 分钟）
pnpm --filter ./cli dev -- daemon

# 指定同步间隔（毫秒）
pnpm --filter ./cli dev -- daemon --interval 600000

# 停止
# Ctrl+C
```

持续同步模式会：

- 默认每 5 分钟执行一次 `tokenarena sync`
- 将运行状态写入 `~/.tokenarena/runtime/status.json`
- 适用于 macOS、Linux、Windows，也可以配合 tmux、screen、systemd、launchd 等外部进程管理器使用

## 本地部署

### Docker 部署（推荐）

```bash
git clone https://github.com/poco-ai/tokenarena.git
cd tokenarena
chmod +x start.sh
./start.sh
```

```powershell
git clone https://github.com/poco-ai/tokenarena.git
cd tokenarena
.\start.ps1
# or: .\start.cmd
```

启动脚本会自动创建配置文件、生成安全密钥并启动所有服务。

> 使用 `docker compose` / `./start.sh` 时，请修改仓库根目录的 `.env`。
> 此时 `DATABASE_URL` 的主机名应为 `db`，不要写 `localhost`。

### 本地开发

```bash
pnpm install
pnpm dev:web    # 启动 Web 仪表盘
pnpm dev:cli    # 启动 CLI 工具
pnpm migrate    # 迁移数据库
pnpm --filter ./cli dev -- init
node cli/dist/index.js init # 测试初始化 CLI
```

本地开发需要 PostgreSQL，Web 端环境变量配置在 `web/.env`：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/token_arena
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3000
AUTH_MODE=self-hosted
```

Docker Compose 启动时，根目录 `.env` 里的 `DATABASE_URL` 应使用 `db` 作为主机名，例如：

```bash
DATABASE_URL=postgresql://postgres:postgres@db:5432/tokens_burned
```

### Windows 换行与提交说明

仓库根目录的 `.gitattributes` 已统一约束换行符，避免 Windows 下因为 `CRLF` / `LF` 差异导致 `Biome`、`Husky` 或 Git diff 异常：

- `*.ts`、`*.tsx`、`*.js`、`*.json`、`*.yml`、`*.md`、`*.css`、`*.sh` 等源码与配置文件统一使用 `LF`
- `*.ps1`、`*.cmd`、`*.bat` 保持 Windows 友好的 `CRLF`

如果你在 Windows 上提交代码时看到类似 `Formatter would have printed...`、`Found X errors`、`husky - pre-commit script failed` 之类的提示，通常先运行下面的命令即可：

```bash
pnpm run format:cli
pnpm run format:web
pnpm run lint:cli
pnpm run lint:web
```

如果是旧工作区在 `.gitattributes` 生效前检出的文件导致换行不一致，可以额外执行一次：

```bash
git add --renormalize .
```

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `BETTER_AUTH_SECRET` | 认证密钥 | `openssl rand -base64 32` 生成 |
| `BETTER_AUTH_URL` | 应用对外访问 URL | `http://localhost:3000` |
| `AUTH_MODE` | 认证模式（`self-hosted` / `production`） | `self-hosted` |
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://postgres:postgres@db:5432/token_arena` |
| `POSTGRES_USER` | PostgreSQL 用户名 | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL 密码 | `postgres` |
| `POSTGRES_DB` | PostgreSQL 数据库名 | `token_arena` |

当 `AUTH_MODE=production` 时，还需要按需配置以下 OAuth 变量：

- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `LINUXDO_CLIENT_ID` / `LINUXDO_CLIENT_SECRET`
- `WATCHA_CLIENT_ID` / `WATCHA_CLIENT_SECRET`

### Docker 常用命令

```bash
docker compose logs -f          # 查看日志
docker compose down              # 停止服务
docker compose pull && docker compose up -d  # 更新并重启
docker compose down -v           # 停止并删除数据
```

## 技术栈

| 层 | 技术 |
|----|------|
| CLI | TypeScript, Commander |
| Web | Next.js (App Router), React, shadcn/ui |
| 数据库 | PostgreSQL, Prisma |
| 认证 | better-auth |
| 构建 | pnpm monorepo |
| 部署 | Docker Compose |

## License

MIT
