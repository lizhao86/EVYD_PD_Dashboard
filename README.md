# EVYD 产品经理 AI 工作台

基于EVYD科技先进的人工智能技术和 AWS 云服务，为产品经理提供的一站式工作平台，提升工作效率和产出质量。

## 功能特点
- **云端存储:** 用户设置和配置存储在 AWS DynamoDB。
- **安全认证:** 用户认证由 AWS Cognito (含托管 UI) 处理。
- **API驱动:** 通过 AWS AppSync GraphQL API 与后端交互。
- 工作流程管理
- 数据可视化
- 对话型应用接口
- AI驱动的产品开发工具
- 多语言界面支持（简体中文、繁体中文和英文）
- 统一的浏览器标签图标(favicon)，提升品牌一致性

## 项目结构 (简化概览)

```
/EVYD_PD_Dashboard/
├── amplify/           # Amplify 后端配置 (由 Amplify CLI 管理)
├── assets/            # 静态资源 (图片, 字体, 图标)
├── styles/            # CSS 样式
├── scripts/           # JavaScript 脚本 (核心, 工具, 服务, 页面初始化)
├── locales/           # 语言文件
├── modules/           # 功能模块 (认证, 管理员, 通用组件, 各 AI 应用)
├── templates/         # HTML 页面模板
├── docs/              # 文档
├── node_modules/      # npm 依赖 (本地)
├── src/               # Amplify 生成的前端配置和代码
│   ├── aws-exports.js # Amplify 配置
│   └── graphql/       # GraphQL 操作 (queries, mutations)
├── .github/           # GitHub Actions 工作流
├── .gitignore         # Git 忽略配置
├── index.html         # 应用入口 HTML
├── package.json       # 项目和依赖配置
├── vite.config.js     # (可选) Vite 配置文件
└── README.md          # 项目说明
```

## 功能模块 (当前状态)

1. **用户认证 (AWS Cognito + Hosted UI)**：
   - 通过 Cognito Hosted UI 进行登录、注册、登出。
   - Amplify Auth 库处理会话和令牌。
   - 支持用户修改密码 (应用内)。
   - 首次登录自动基于 Cognito 组同步应用角色到 DynamoDB。
   - *待办:* 密码找回流程。

2. **用户管理 (部分迁移)**：
   - 主要用户生命周期管理需通过 Cognito 控制台。
   - 应用内管理员面板用户管理功能**临时禁用**。
   - 用户角色管理通过 DynamoDB `UserSettings` 表。

3. **文档中心**：
   - 产品需求手册 (Markdown)。
   - *待办:* API 文档, 使用教程。

4. **API 配置 (DynamoDB)**：
   - 全局 API 地址由管理员通过面板配置 (存储在 DynamoDB `GlobalConfig`)。
   - *待办:* 用户个人 API Key 的查看/编辑功能。
   - *待办:* 管理员为其他用户配置 API Key 的功能。

5. **多语言支持**：
   - 支持简体中文/繁体中文/英语言切换。
   - 语言偏好持久化存储到 DynamoDB `UserSettings` (登录用户)。

6. **AI 功能**：
   - User Story 生成器 (基于 Dify Workflow)。
   - 用户手册生成器 (基于 Dify Agent)。
   - UX 界面设计 (POC, 基于 Dify API)。
   - *待办:* 需求分析助手。

## 非功能特性
- **构建:** 使用 Vite。
- **安全:** 依赖 AWS Cognito 和 Amplify 的安全机制。
- **可用性:** 响应式设计。
- **可扩展性:** 模块化设计。

## 最近更新 (重点)
- **[2025-04-13]** **重大修复:** 成功从 AWS Amplify V6 迁移回 V5，解决了与 Vite 环境下 OAuth 重定向登录的兼容性问题。统一配置加载，确保所有页面正确初始化 Amplify。
- **[2025-04-12]** **重大重构:** 迁移认证至 AWS Cognito (Hosted UI)，存储至 DynamoDB (Amplify AppSync/GraphQL)，集成 Vite。
- **[2025-04-12]** **功能:** 实现用户语言偏好持久化存储到 DynamoDB。
- **[2025-04-13]** **修复与统一 (v1.6.2):** 
    - 解决了 User Story, User Manual, UX Design 应用无法停止生成、按钮状态反馈不清晰、输入验证提示不友好、国际化文本显示错误、统计/系统信息无法显示、Markdown渲染失败等多个Bug。
    - 确保应用正确使用从 DynamoDB 获取的云端配置与认证信息。
    - 统一了三个应用中处理状态、显示统计/系统信息、按钮ID、API流处理等逻辑的命名约定和代码实现。

## 字体使用
项目使用以下字体设置：
- **英文界面**：Google Fonts提供的Lato字体，包含以下字重：
  - Light (300)
  - Regular (400)
  - Medium (500)
  - Semi-Bold (600)
  - Bold (700)
- **中文界面**（简体和繁体）：微软雅黑（Microsoft YaHei）

## 开发指南

### 环境设置
1.  安装 [Node.js](https://nodejs.org/) (包含 npm)。
2.  安装 [AWS CLI](https://aws.amazon.com/cli/) 并配置好 AWS 凭证。
3.  安装 [Amplify CLI](https://docs.amplify.aws/cli/start/install/): `npm install -g @aws-amplify/cli`。
4.  配置 Amplify CLI: `amplify configure`。
5.  克隆仓库: `git clone ...`
6.  进入项目目录: `cd EVYD_PD_Dashboard`
7.  安装前端依赖: `npm install`
8.  **拉取 Amplify 后端环境:** `amplify pull` (根据提示操作，可能需要选择对应的 App 和环境)。

### 项目运行 (本地开发)
1.  启动 Vite 开发服务器: `npm run dev`。
2.  在浏览器中打开 Vite 提示的 `http://localhost:xxxx` 地址。

### 后端部署/更新
- 修改 Amplify 后端配置 (如 `schema.graphql`) 后，运行 `amplify push` 来部署更改到云端。

### 前端部署 (手动示例，CI/CD 更佳)
1.  构建生产版本: `npm run build` (会在 `dist` 目录生成静态文件)。
2.  将 `dist` 目录的内容上传到你的静态托管服务 (如 AWS S3)。

### CI/CD (GitHub Actions)
- 当前配置 (`.github/workflows/deploy.yml`) 直接将**源代码**同步到 S3，这**不再适用**于需要构建步骤 (Vite) 和 Amplify 后端 的项目。
- **需要更新 `deploy.yml`:**
    - 添加 Node.js 环境设置。
    - 添加 `npm install` 步骤。
    - 添加 Amplify CLI 设置和 `amplify pull` 步骤。
    - 添加 `npm run build` 步骤。
    - 修改 `aws s3 sync` 命令，使其同步构建产物 (`dist` 目录) 而不是源代码，并配置正确的 S3 目标路径。
    - **(重要)** 需要在 GitHub Secrets 中添加 Amplify 部署所需的 AWS 凭证 (或配置 Amplify Hosting)。

### 环境变量配置
- 项目使用 `.env` (开发环境) 和 `.env.production` (生产环境) 文件配置环境特定参数
- 主要配置有:
  - `VITE_COGNITO_REDIRECT_SIGNIN` - Cognito登录成功后的重定向URL
  - `VITE_COGNITO_REDIRECT_SIGNOUT` - Cognito登出后的重定向URL
- Vite自动处理带有`VITE_`前缀的环境变量

### 待办/注意事项
- **环境变量:** 为生产环境配置 Cognito 回调/注销 URL 等。
- **Cognito 用户管理:** 主要通过 AWS 控制台进行。
- **首次全局配置:** 管理员需要登录并保存一次 API 地址配置。

## 已解决问题 (Amplify V6 + Vite 登录)

**状态:** 已解决 ✅

**问题描述:**
在尝试为项目引入环境变量（用于区分开发环境和生产环境的 Cognito 回调 URL）并调整 Amplify V6 配置加载方式后，通过 Cognito Hosted UI 进行登录的功能 (`signInWithRedirect`) 持续失败。

**症状:**
- 点击登录按钮后，无法跳转到 Cognito 托管登录页面 (`login.auth.ap-southeast-1.amazoncognito.com`)。
- 前端 JavaScript 抛出错误，通常是 `AuthUserPoolException: Auth UserPool not configured.` 或 `OAuthNotConfigureException: oauth param not configured.`。
- **令人困惑的是：** 通过 `console.log(Amplify.getConfig())` 在 `signInWithRedirect` 调用前检查，运行时配置**看起来是正确的**，包含了所有必需的 `Auth.Cognito` 和 `Auth.Cognito.loginWith.oauth` 参数。

**解决方案:**
由于 Amplify V6 在 Vite 环境下有兼容性问题，我们回退到了 Amplify V5，具体改动包括：

1. **修改 package.json** - 将 AWS Amplify 依赖设置为 V5 版本 (5.3.x)
2. **更新 API 调用** - 将所有 V6 风格的模块化导入 (`aws-amplify/auth`) 改为 V5 风格 (`aws-amplify`)
3. **统一配置** - 创建了 `scripts/amplify-config.js` 确保所有页面正确初始化 Amplify
4. **兼容性脚本** - 添加了浏览器全局变量兼容性脚本，解决 `global is not defined` 错误
5. **Vite 配置** - 修改 `vite.config.js`，添加 `define` 选项支持 Amplify V5

这些修改成功解决了登录问题，现在所有功能（登录、登出、保存API密钥、修改密码等）均正常工作。
