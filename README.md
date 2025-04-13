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
│   ├── amplify-config.js # Amplify配置统一初始化
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
├── vite.config.js     # Vite 配置文件
├── .env               # 开发环境变量配置
├── .env.production    # 生产环境变量配置
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
- **[2025-04-13]** **部署优化:** 简化CI/CD流程，移除Amplify后端同步步骤，直接构建并部署静态文件到S3。添加环境变量支持，根据环境自动使用正确的认证回调URL。
- **[2025-04-13]** **重大修复:** 成功从 AWS Amplify V6 迁移回 V5，解决了与 Vite 环境下 OAuth 重定向登录的兼容性问题。统一配置加载，确保所有页面正确初始化 Amplify。
- **[2025-04-12]** **重大重构:** 迁移认证至 AWS Cognito (Hosted UI)，存储至 DynamoDB (Amplify AppSync/GraphQL)，集成 Vite。
- **[2025-04-12]** **功能:** 实现用户语言偏好持久化存储到 DynamoDB。
- **[2025-04-13]** **修复与统一 (v1.6.2):** 
    - 解决了 User Story, User Manual, UX Design 应用无法停止生成、按钮状态反馈不清晰、输入验证提示不友好、国际化文本显示错误、统计/系统信息无法显示、Markdown渲染失败等多个Bug。
    - 确保应用正确使用从 DynamoDB 获取的云端配置与认证信息。
    - 统一了三个应用中处理状态、显示统计/系统信息、按钮ID、API流处理等逻辑的命名约定和代码实现。
- **[2025-04-13]** **代码优化:** 移除 `scripts/utils/helper.js` 中未使用的工具函数 (`generateUUID`, `formatDate`, `debounce`, `throttle`)，完成 `helper.js` 整合。

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
2.  克隆仓库: `git clone ...`
3.  进入项目目录: `cd EVYD_PD_Dashboard`
4.  安装前端依赖: `npm install`

### 项目运行 (本地开发)
1.  启动 Vite 开发服务器: `npm run dev`。
2.  在浏览器中打开 Vite 提示的 `http://localhost:xxxx` 地址。

### AWS后端配置
后端资源(Cognito, AppSync, DynamoDB等)已通过Amplify CLI配置完成，并且:
1. `aws-exports.js` 已包含在源代码仓库中
2. 前端代码设计为直接使用此配置文件连接后端资源
3. **新开发人员不需要运行 `amplify pull`**，项目开箱即用

### 前端部署
项目已配置GitHub Actions自动部署流程:
1. 向`main`分支推送代码时自动触发
2. 使用Vite构建项目(生产模式)
3. 将构建结果(`dist`目录)部署到AWS S3存储桶

### 环境变量配置
- 项目使用 `.env` (开发环境) 和 `.env.production` (生产环境) 文件配置环境特定参数
- 主要配置有:
  - `VITE_COGNITO_REDIRECT_SIGNIN` - Cognito登录成功后的重定向URL
  - `VITE_COGNITO_REDIRECT_SIGNOUT` - Cognito登出后的重定向URL
- 开发环境使用localhost URL，生产环境使用实际域名URL
- Amplify在运行时通过 `scripts/amplify-config.js` 读取这些环境变量

### 已解决问题 (Amplify V6 + Vite 登录)

**状态:** 已解决 ✅

**问题描述:**
在Vite环境下使用Amplify V6时，OAuth重定向登录功能失败，表现为点击登录按钮后无法跳转到Cognito托管登录页面。

**解决方案:**
1. **迁移到Amplify V5** - 使用aws-amplify@5.3.x，更稳定地支持OAuth流程
2. **统一配置加载** - 创建amplify-config.js统一处理配置初始化
3. **环境变量支持** - 添加环境变量处理，允许不同环境使用不同回调URL
4. **浏览器兼容性** - 添加全局变量兼容性脚本，解决'global is not defined'错误
5. **简化CI/CD** - 优化部署流程，移除对Amplify CLI的依赖

这些修改确保了应用在各种环境中都能正确处理认证流程。
