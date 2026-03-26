# Usage Dashboard + CLI Ingest 统一设计

日期：2026-03-26

## 1. 背景

`tokens-burned` 当前包含：

- `cli/`：从多个 AI coding 工具解析本地使用数据并上传
- `web/`：Next.js + Prisma + better-auth 的 Web 应用骨架

当前 CLI 已能上传两类数据：

1. `buckets[]`：按 30 分钟聚合的 token 数据
2. `sessions[]`：会话级统计数据

但目前存在几个问题：

- CLI 与未来 Web 仪表盘的字段和统计口径还未完全统一
- `totalTokens` 口径不符合产品要求
- `reasoningOutputTokens` 仍是独立字段，不符合“并入输出”的展示口径
- 项目隐私模式只有“上传真实项目名 / 全部 unknown”，不支持匿名可区分项目
- Web 端还没有完整的登录、注册、API key 管理、ingest API、dashboard API、dashboard UI

本设计用于统一 CLI 与 Web 的数据契约、统计口径、认证方式和第一版产品范围。

## 2. 目标

第一版交付一个可用闭环：

1. 用户可通过邮箱 + 密码注册/登录 Web
2. 用户登录后可创建和管理多个 CLI API keys
3. CLI 使用某个 API key 同步 usage 数据
4. Web 仪表盘可查看：
   - 1 天 / 7 天 / 30 天 / 自定义时间范围
   - 总 token、输入 token、输出 token、缓存 token
   - 活跃时长、总时长
   - 会话数、消息数、用户输入条数
   - 按设备、工具、模型、项目的分析
5. 项目默认支持匿名可区分展示（hash）

## 3. 非目标

第一版明确不做：

- 会话列表与消息级明细
- 导出 CSV
- 忘记密码
- 邮箱验证
- OAuth 登录
- 自定义拖拽式 dashboard

但架构上要为后续 OAuth 和更细分析保留扩展空间。

## 4. 核心产品决策

### 4.1 登录与身份

- Web 用户通过 **邮箱 + 密码** 登录和注册
- Web 使用 **better-auth session cookie**
- CLI 不使用网页登录态，CLI 使用 **API key**
- 一个用户可以创建 **多个 API keys**
- API key 可命名、可停用、可删除

### 4.2 时间边界

- 仪表盘时间统计按 **账户统一时区** 计算
- 仪表盘 UI 显示当前账户时区

### 4.3 Dashboard 结构

采用 **方案 2：总览 + 分析分区**

- 顶部筛选栏
- 总览 KPI
- 趋势图
- 分析分区（Devices / Tools / Models / Projects）

### 4.4 项目隐私

默认项目模式为 **hashed**

- 可区分项目
- 不展示真实项目名
- Web 展示匿名标签，如 `Project ab12cd`

支持三种项目模式：

- `hashed`：上传匿名稳定项目标识
- `raw`：上传真实项目名
- `disabled`：完全关闭项目维度

### 4.5 Token 统计口径

统一口径如下：

- `inputTokens` = 非缓存输入 token
- `outputTokens` = 普通输出 token + reasoning output token
- `cachedTokens` = cached input token
- `totalTokens` = inputTokens + outputTokens + cachedTokens

换言之：

- reasoning 不再作为 dashboard 主口径单独展示
- total 必须包含 cache

## 5. 当前 CLI 可上传字段调研结果

### 5.1 Token bucket

当前 CLI 上传字段：

- `source`
- `model`
- `project`
- `bucketStart`
- `hostname`
- `inputTokens`
- `outputTokens`
- `cachedInputTokens`
- `reasoningOutputTokens`
- `totalTokens`

### 5.2 Session

当前 CLI 上传字段：

- `source`
- `project`
- `sessionHash`
- `hostname`
- `firstMessageAt`
- `lastMessageAt`
- `durationSeconds`
- `activeSeconds`
- `messageCount`
- `userMessageCount`
- `userPromptHours`

### 5.3 已具备的 dashboard 能力

在改造前，CLI 已能支撑：

- 时间范围统计
- token 统计
- 活跃/总时长统计
- 会话数/消息数/用户消息数统计
- 按设备（hostname）、工具（source）、模型（model）、项目（project）分析

但仍需改造字段和口径，避免 CLI 与 Web 不一致。

## 6. 统一数据契约

### 6.1 通用约束

- CLI 与 Web API 通过 `schemaVersion` 进行契约管理
- CLI 上传数据必须带设备信息
- 项目维度统一为 `projectKey` + 可选展示字段
- Dashboard 与 ingest 使用同一套统计口径

### 6.2 Device

新增设备概念：

- `deviceId`：CLI 本地生成并持久化的稳定设备 ID
- `hostname`：展示名

`hostname` 仅用于展示，去重与幂等以 `deviceId` 为主。

### 6.3 Bucket 契约

统一后的 bucket 字段：

- `source`
- `model`
- `projectKey`
- `projectLabel`
- `bucketStart`
- `deviceId`
- `hostname`
- `inputTokens`
- `outputTokens`
- `cachedTokens`
- `totalTokens`

说明：

- `projectKey`：真实项目经隐私策略处理后的稳定标识
- `projectLabel`：
  - `hashed` 模式为匿名标签
  - `raw` 模式为真实项目名
  - `disabled` 模式为固定值

### 6.4 Session 契约

统一后的 session 字段：

- `source`
- `projectKey`
- `projectLabel`
- `sessionHash`
- `deviceId`
- `hostname`
- `firstMessageAt`
- `lastMessageAt`
- `durationSeconds`
- `activeSeconds`
- `messageCount`
- `userMessageCount`

第一版不再上传 `userPromptHours` 到 UI 层做展示，但可保留为内部扩展字段；如保留，服务端应视为非核心统计字段。

口径要求：

- `messageCount` 表示 **规范化后的会话消息数**
- 只统计用户消息与助手消息
- 不把 `session_meta`、`turn_context`、`tool_use`、`tool_result` 等内部事件直接算作消息
- `userMessageCount` 仅统计用户输入消息数

### 6.5 Settings 契约

`GET /api/usage/settings` 返回：

- `schemaVersion`
- `projectMode`：`hashed | raw | disabled`
- `projectHashSalt`
- `timezone`

CLI 在每次 sync 前都应读取此接口，以保证上传策略与服务端一致。

## 7. CLI 改造设计

### 7.1 统一领域类型

修改 `cli/src/domain/types.ts`：

- 移除 bucket / session 对原始 `project` 的单字段依赖
- 新增：
  - `deviceId`
  - `projectKey`
  - `projectLabel`
- 将 bucket 字段改为：
  - `inputTokens`
  - `outputTokens`
  - `cachedTokens`
  - `totalTokens`

### 7.2 token 口径修正

修改所有 parser 和聚合逻辑：

- parsing 阶段将 `reasoningOutputTokens` 并入 `outputTokens`
- bucket 聚合时：
  - `totalTokens = inputTokens + outputTokens + cachedTokens`

这项改造适用于：

- Claude Code
- Codex
- GitHub Copilot CLI
- Gemini CLI
- OpenClaw
- OpenCode

### 7.2.1 会话事件规范化

修改 parser 输出给 `extractSessions()` 的事件定义，使其尽量表达真实对话消息，而不是原始日志事件：

- 只把用户 prompt 计为 `user`
- 只把模型回复计为 `assistant`
- 不把工具调用、工具结果、元数据事件直接计入 `messageCount`

这样才能让 dashboard 中的：

- `Messages`
- `User Messages`
- `Active Time`

具有稳定且符合直觉的含义。

### 7.3 项目匿名化

sync 流程中，在读取服务端 settings 后，根据 `projectMode` 处理项目：

- `hashed`
  - 使用本地项目原始标识 + `projectHashSalt` 生成稳定 hash
  - 生成 `projectKey`
  - 生成匿名 `projectLabel`，例如 `Project ab12cd`
- `raw`
  - `projectKey` 为真实项目的稳定规范化值
  - `projectLabel` 为真实项目名
- `disabled`
  - `projectKey = "unknown"`
  - `projectLabel = "Unknown Project"`

建议优先使用下列原始项目标识生成 hash：

1. git repository 标识（如果可得）
2. 项目根路径
3. 当前已有解析项目名

### 7.4 设备 ID

CLI config 增加：

- `deviceId`

若配置文件没有 `deviceId`：

- 首次生成随机稳定 ID
- 写回 `~/.tokens-burned/config.json`

### 7.5 sync 流程

更新后的 sync 流程：

1. 运行各 parser 收集 bucket/session
2. 读取本地 `deviceId`
3. 调用 `GET /api/usage/settings`
4. 统一项目隐私处理
5. 统一 token 口径
6. 按批次上传到 `POST /api/usage/ingest`

### 7.6 向后兼容

若 settings 获取失败，第一版不建议静默降级，以免 schema 或隐私策略不一致。

建议：

- 直接 fail fast
- 给出明确报错

## 8. Web 认证设计

### 8.1 认证方式

使用 **better-auth** 实现第一版认证：

- 邮箱 + 密码注册
- 邮箱 + 密码登录
- 登出

Web 登录状态通过 better-auth session cookie 持有。

### 8.2 为什么使用 better-auth

选择 better-auth 的原因：

- 当前已接入 Prisma adapter
- 可直接支撑最小邮箱密码认证
- 后续可平滑扩展 GitHub / Google OAuth
- 不需要重写 session 体系

### 8.3 OAuth 兼容性要求

后续新增 OAuth 时：

- 继续使用 better-auth
- 复用 `User` / `Session` / `Account` / `Verification`
- 在 `Account` 中增加 provider 记录
- 保持同一 `User` 主体

因此第一版邮箱密码实现不能堵死未来 OAuth 接入。

### 8.4 页面与保护路由

新增页面：

- `/login`
- `/register`
- `/usage`
- `/usage/setup`
- `/settings/keys`

规则：

- 未登录访问 `/usage`、`/usage/setup`、`/settings/keys` 时跳转 `/login`
- 已登录访问 `/login`、`/register` 时跳转 `/usage`

## 9. Web 数据模型设计

基于现有 Prisma schema，新增以下模型。

### 9.1 `ApiKey`

字段：

- `id`
- `userId`
- `name`
- `prefix`
- `keyHash`
- `status`
- `lastUsedAt`
- `createdAt`
- `updatedAt`

要求：

- 数据库不保存明文 key
- 明文 key 只在创建时显示一次
- `prefix` 用于 UI 展示和问题定位

### 9.2 `Device`

字段：

- `id`
- `userId`
- `deviceId`
- `hostname`
- `firstSeenAt`
- `lastSeenAt`
- `lastApiKeyId`
- `createdAt`
- `updatedAt`

唯一约束：

- `userId + deviceId`

### 9.3 `UsageBucket`

字段：

- `id`
- `userId`
- `apiKeyId`
- `deviceId`
- `source`
- `model`
- `projectKey`
- `projectLabel`
- `bucketStart`
- `inputTokens`
- `outputTokens`
- `cachedTokens`
- `totalTokens`
- `createdAt`
- `updatedAt`

唯一约束：

- `userId + deviceId + source + model + projectKey + bucketStart`

### 9.4 `UsageSession`

字段：

- `id`
- `userId`
- `apiKeyId`
- `deviceId`
- `source`
- `projectKey`
- `projectLabel`
- `sessionHash`
- `firstMessageAt`
- `lastMessageAt`
- `durationSeconds`
- `activeSeconds`
- `messageCount`
- `userMessageCount`
- `createdAt`
- `updatedAt`

唯一约束：

- `userId + deviceId + source + sessionHash`

### 9.5 `User`

沿用现有 better-auth 用户模型，必要时根据 better-auth email/password 要求补充字段，但不重构认证主线。

## 10. API 设计

### 10.1 `POST /api/usage/ingest`

认证：

- Bearer API key

请求体：

- `schemaVersion`
- `device`
  - `deviceId`
  - `hostname`
- `buckets[]`
- `sessions[]`

服务端逻辑：

1. 校验 API key
2. 解析对应 `userId` / `apiKeyId`
3. upsert 设备信息
4. upsert bucket
5. upsert session
6. 更新 `ApiKey.lastUsedAt`
7. 返回 ingest 结果

### 10.2 `GET /api/usage/settings`

认证：

- Bearer API key

返回：

- `schemaVersion`
- `projectMode`
- `projectHashSalt`
- `timezone`

### 10.3 `GET /api/usage/dashboard`

认证：

- Web session

query 参数：

- `from`
- `to`
- `apiKeyId?`
- `deviceId?`
- `source?`
- `model?`
- `projectKey?`

返回内容：

- `overview`
- `tokenTrend`
- `activityTrend`
- `devices`
- `tools`
- `models`
- `projects`
- `lastSyncedAt`

### 10.4 `GET /api/usage/filters`

认证：

- Web session

返回：

- keys
- devices
- tools
- models
- projects

### 10.5 API key 管理接口

#### `POST /api/usage/keys`

- 创建 key

#### `PATCH /api/usage/keys/:id`

- 重命名
- 启用 / 停用

#### `DELETE /api/usage/keys/:id`

- 删除 key

## 11. Dashboard UI 设计

### 11.1 页面结构

`/usage` 采用总览 + 分析分区结构。

#### 顶部

- 页面标题
- 账户时区
- 最近同步时间
- `Manage Keys` 入口

#### 全局筛选栏

- `1D / 7D / 30D / Custom`
- API key 筛选
- 设备筛选
- 工具筛选
- 模型筛选
- 项目筛选
- Reset filters

#### 总览 KPI

展示 9 个核心指标：

- Total Tokens
- Input Tokens
- Output Tokens
- Cached Tokens
- Active Time
- Total Time
- Sessions
- Messages
- User Messages

#### 趋势图

- `Token Trend`
  - 1D 按小时
  - 7D / 30D / custom 按天
- `Activity Trend`
  - active time
  - total time
  - sessions
  - user messages

#### 分析分区

使用 tabs：

- Devices
- Tools
- Models
- Projects

每个 tab 展示：

- 占比图
- 排行表格

统一表格列：

- Name
- Total Tokens
- Input
- Output
- Cache
- Active Time
- Sessions
- Messages
- User Messages
- Share

### 11.2 `/usage/setup`

用途：

- 引导用户创建 key
- 展示 CLI 配置命令和说明
- 展示最近同步状态

### 11.3 `/settings/keys`

用途：

- 查看所有 API keys
- 新建 key
- 重命名
- 停用 / 启用
- 删除

### 11.4 空态

当用户还没有任何 usage 数据时，`/usage` 应显示空态：

- 说明当前还没有同步数据
- 引导用户：
  1. 创建 API key
  2. 在 CLI 中运行 `tokens-burned init`
  3. 完成首次 sync

## 12. 查询与聚合口径

### 12.1 时间粒度

- `1D`：按小时聚合
- `7D / 30D / custom`：按天聚合

### 12.2 时间计算

所有 dashboard 时间边界使用 **账户统一时区**。

### 12.3 KPI 口径

- `Total Tokens = sum(totalTokens)`
- `Input Tokens = sum(inputTokens)`
- `Output Tokens = sum(outputTokens)`
- `Cached Tokens = sum(cachedTokens)`
- `Active Time = sum(activeSeconds)`
- `Total Time = sum(durationSeconds)`
- `Sessions = count(distinct session)`
- `Messages = sum(messageCount)`
- `User Messages = sum(userMessageCount)`

### 12.4 对比周期

KPI 卡片中的环比使用“上一段等长时间区间”。

## 13. 幂等与去重

由于 CLI 会重复上传历史数据，服务端必须保证 ingest 幂等。

### bucket 去重键

- `userId`
- `deviceId`
- `source`
- `model`
- `projectKey`
- `bucketStart`

### session 去重键

- `userId`
- `deviceId`
- `source`
- `sessionHash`

建议使用 upsert 而不是 append。

## 14. 异常处理

### 14.1 CLI

- key 无效或被停用：提示重新配置
- settings 获取失败：第一版直接失败
- schemaVersion 不支持：提示升级 CLI
- 批量上传部分成功：保留 partial success 提示

### 14.2 Web/API

- disabled key 调 ingest：返回 401/403
- 非法 payload：返回 400
- schemaVersion 不匹配：返回 409
- 无数据 dashboard：返回空态

## 15. 验证方案

### 15.1 CLI

至少验证：

- `tokens-burned init`
- `tokens-burned sync`
- `tokens-burned status`

重点验证：

- total 是否包含 cache
- output 是否已包含 reasoning
- project 是否已变为 hash label/key
- deviceId 是否稳定

### 15.2 Web

至少验证：

- 注册 / 登录 / 登出
- 受保护路由跳转
- API key 管理
- dashboard 筛选联动
- 1D / 7D / 30D / custom 正常展示
- 设备 / 工具 / 模型 / 项目 tab 正常

### 15.3 端到端

完整链路：

1. 用户注册并登录
2. 创建 API key
3. CLI 配置 API key
4. CLI 首次 sync
5. dashboard 展示正确

## 16. 实施顺序

建议按以下顺序实现：

1. better-auth 邮箱密码认证落地
2. Prisma schema 增加 API key / device / usage 表
3. `GET /api/usage/settings` + `POST /api/usage/ingest`
4. CLI 统一字段、项目 hash、设备 ID、token 口径
5. `GET /api/usage/dashboard` + `GET /api/usage/filters`
6. `/usage` 仪表盘 UI
7. `/usage/setup` 与 `/settings/keys`

## 17. 后续扩展

后续可在本设计基础上继续扩展：

- GitHub / Google OAuth
- 忘记密码
- 会话级列表
- 消息级明细
- CSV 导出
- 自定义 dashboard
