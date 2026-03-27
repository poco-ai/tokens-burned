# tokens-burned

一个 pnpm monorepo，用来统一采集本地 AI coding CLI 的 usage 数据，并在 Web 仪表盘里查看每天的 token 消耗、会话活跃度和多维度分析。

## Workspace

```txt
.
├── cli/                     # Commander CLI：解析本地 usage 数据并上传
├── web/                     # Next.js + Prisma + better-auth Web 应用
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 快速部署 (Docker)

### 一键启动

```bash
# 克隆仓库
git clone https://github.com/poco-ai/tokens-burned.git
cd tokens-burned

# 运行启动脚本
chmod +x start.sh
./start.sh
```

启动脚本会自动：
1. 从 `.env.example` 创建 `.env` 文件
2. 使用 `openssl` 生成安全的 `BETTER_AUTH_SECRET`
3. 启动 Docker Compose 服务

### 手动配置

1. 复制环境变量文件：

```bash
cp .env.example .env
```

2. 编辑 `.env`，生成密钥：

```bash
# 生成安全密钥
openssl rand -base64 32

# 编辑 .env 文件，填入生成的密钥
```

3. 启动服务：

```bash
docker compose up -d
```

### Docker 常用命令

```bash
# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 更新镜像
docker compose pull && docker compose up -d

# 停止并删除数据卷
docker compose down -v
```

### 环境变量说明

| 变量 | 说明 | 示例 |
|------|------|------|
| `BETTER_AUTH_SECRET` | 认证密钥，使用 `openssl rand -base64 32` 生成 | - |
| `BETTER_AUTH_URL` | 应用对外访问的 URL | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://postgres:postgres@db:5432/tokens_burned` |
| `POSTGRES_USER` | PostgreSQL 用户名 (docker-compose) | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL 密码 (docker-compose) | `postgres` |
| `POSTGRES_DB` | PostgreSQL 数据库名 (docker-compose) | `tokens_burned` |

## 本地开发

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动 Web

```bash
pnpm dev:web
```

### 3. 启动 CLI

```bash
pnpm dev:cli -- --help
```

## Web 环境变量 (本地开发)

在 `web/.env` 中配置：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tokens_burned
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3000
```

可选：

```bash
SHADOW_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tokens_burned_shadow
```

## 使用流程

### Web 端

1. 打开 `http://localhost:3000/register` 注册账号
2. 登录后进入 `http://localhost:3000/usage`
3. 点击右上角 `Settings` 创建一个 CLI API key
4. 在同一个 `Settings` 弹窗里设置时区和项目模式

### CLI 端

初始化：

```bash
pnpm --filter ./cli dev -- init
```

按照提示输入：

- Web 服务地址，例如 `http://localhost:3000`
- 刚刚创建的 API key

然后执行同步：

```bash
pnpm --filter ./cli dev -- sync
```

同步完成后，打开：

```txt
http://localhost:3000/usage
```

## 已实现能力

### Web

- 邮箱 + 密码注册 / 登录（better-auth）
- `/usage` 总览页
  - 1 天 / 7 天 / 30 天 / 自定义区间
  - 总 token、输入、输出、reasoning、缓存
  - 活跃时长、总时长、会话数、消息数、用户消息数
  - 设备 / 工具 / 模型 / 项目分组分析
  - 统一设置弹窗（时区、主题、语言、项目模式、公开主页）
  - 多 API key 管理（创建、重命名、启用 / 停用、删除）

### CLI

- 解析多种本地 AI CLI usage 数据
- 每个用户可配置多个 Web API key 中的任意一个
- 上传统一后的 bucket / session 数据
- 口径统一：
  - `outputTokens` 包含 reasoning
  - `reasoningTokens` 仍单独保留
  - `totalTokens = inputTokens + outputTokens + cachedTokens`
- 项目默认按 hash 匿名上传

## 常用命令

```bash
pnpm dev:web
pnpm dev:cli -- --help
pnpm build
pnpm check
pnpm --filter ./web test
pnpm --filter ./cli test
```
