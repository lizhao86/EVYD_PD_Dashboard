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
│   └── ...
├── public/
│   └── locales/       # 语言文件 (唯一来源)
├── modules/           # 功能模块 (认证, 管理员, 通用组件, 各 AI 应用)
│   ├── common/        # 通用模块 (Header, UI, API Client 等)
│   │   ├── header.js
│   │   ├── dify-app-ui.js  # 通用 AI 应用 UI 逻辑
│   │   ├── dify-client.js  # 通用 Dify API 交互客户端
│   │   └── ...
│   ├── apps/          # 各个 AI 应用模块
│   │   ├── user-story/
│   │   │   └── index.js  # 应用主逻辑 (已重构)
│   │   ├── user-manual/
│   │   │   └── index.js  # 应用主逻辑 (已重构)
│   │   ├── ux-design/
│   │   │   └── index.js  # 应用主逻辑 (已重构)
│   │   └── requirement-analysis/
│   │       └── index.js  # 应用主逻辑 (已重构)
│   └── ...
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
   - 应用内管理员面板用户管理功能**临时禁用** (近期已进行稳定性优化，但核心功能仍依赖 Cognito)。
   - 用户角色管理通过 DynamoDB `UserSettings` 表。

3. **文档中心**：
   - 产品需求手册 (Markdown)。
   - *待办:* API 文档, 使用教程。

4. **API 配置 (DynamoDB)**：
   - 全局 API 地址由管理员通过面板配置 (存储在 DynamoDB `GlobalConfig`)。
   - *待办:* 用户个人 API Key 的查看/编辑功能。
   - *待办:* 管理员为其他用户配置 API Key 的功能。
   - (已修复 AI 应用层对 API 密钥的匹配逻辑)

5. **多语言支持**：
   - 支持简体中文/繁体中文/英语言切换。
   - 语言偏好持久化存储到 DynamoDB `UserSettings` (登录用户)。
   - 翻译文件位于 `/public/locales` 目录。

6. **AI 功能**：
   - User Story 生成器 (基于 Dify Workflow, 已修复重试连接功能)。
   - 用户手册生成器 (基于 Dify Agent, 已优化交互)。
   - UX 界面设计 (POC, 基于 Dify API)。
   - 需求分析助手 (基于 Dify ChatBot, 已修复模块导入错误)。
   - (已修复各应用连接 Dify API 的密钥匹配逻辑)

## 非功能特性
- **构建:** 使用 Vite。
- **安全:** 依赖 AWS Cognito 和 Amplify 的安全机制。
- **可用性:** 响应式设计。
- **可扩展性:** 模块化设计。

## 最近更新 (重点)
- **[2025-05-01]** **功能交互修复**: 修复了 User Story 页面的"重试连接"按钮功能，解决了 Requirement Analysis 模块的 `getGlobalConfig` 导入错误，并统一了各应用的重试逻辑。
- **[2025-05-01]** **AI 应用连接修复**: 改进了各 AI 应用模块连接 Dify API 的逻辑，通过多级匹配策略确保能正确加载和使用 API 密钥。
- **[2025-04-30]** **管理员面板稳定性优化**: 添加详细日志，修复权限验证不一致、数据获取和会话逻辑问题，增强了用户列表加载的稳定性。
- **[2025-04-29]** **用户手册交互优化**: 修复了用户手册生成器(`user-manual-new`)的核心交互问题。通过调整CSS和JS，确保了消息操作按钮（复制、重试、反馈）的右下角精确定位及分隔线显示。同时，优化了"重新生成"功能的JS逻辑，确保能正确移除当前AI回复并基于上一条用户提问可靠地触发Dify API调用，提升了应用的稳定性和用户体验。
- **[2025-04-28]** **JS模块化重构 (API客户端-Part 2 完成)**: 将通用 Dify API 客户端 (`dify-client.js`) 集成到 UX Design, Requirement Analysis, User Story 应用的 `index.js` 中，并删除它们各自独立的 `api.js` 文件。恢复动态加载应用信息功能。修复通用客户端处理Workflow元数据(usage, elapsed_time, total_steps)的Bug。
- **[2025-04-26]** **JS模块化重构 (API客户端-Part 1)**: 创建通用 Dify API 客户端 (`dify-client.js`)。成功将此客户端集成到用户手册生成器 (`user-manual/index.js`)，并删除其独立的 `api.js`。
- **[2025-04-25]** **流处理修复**: 修复 User Story 生成器 (`user-story/index.js`) 与 Dify Workflow API 交互中的流处理错误，优化 SSE 事件解析逻辑。
- **[2025-04-24]** **UI层标准化重构**: 重构四个AI应用的 `index.js` 以使用通用的UI模块 (`DifyAppUI`)，移除冗余的UI处理代码，统一UI交互逻辑。删除废弃的 `ui.js` 文件。
- **[2025-04-23]** **代码标准化**: 统一四个AI应用(需求分析,用户手册,用户故事,UX设计)的JS代码，包括统一主要按钮ID、移除独立停止按钮、统一系统信息切换和CSS类名使用，提升代码一致性和可维护性。
- **[2025-04-22]** **国际化与代码清理**: 修复翻译文件加载路径问题，删除冗余的 `/locales` 目录，统一使用 `/public/locales`。删除未使用的旧版 `modules/apps/requirements/` 目录及其内容。
- **[2025-04-15]** **国际化体验优化**: 解决页面加载时语言内容闪烁问题，通过在HTML加载早期添加CSS类隐藏内容，待翻译应用后再显示，确保流畅视觉体验。
- **[2025-04-15]** **国际化稳定性修复**: 修复语言切换后页面自动刷新功能，确保翻译完全应用。清理国际化及存储模块的冗余日志输出。
- **[2025-04-14]** **UI/UX优化与国际化改进**: 统一三个AI应用(User Story, User Manual, UX Design)的生成按钮文案，从"发送给AI"改为"发送给Dify"，提升品牌一致性。完善所有缺失的翻译键，标准化按钮状态文本（发送、处理中、生成中）。修复按钮状态流转BUG，确保生成过程中UI状态正确变化。
- **[2025-04-13]** **代码清理 (续)**: 移除项目中所有JS文件中用于调试的 `console.log` 语句。
- **[2025-04-13]** **代码清理**: 移除 `scripts/utils/helper.js` 中未被使用的工具函数 (`generateUUID`, `formatDate`, `debounce`, `throttle`)，完成 `helper.js` 整合。
- **[2025-04-13]** **部署与环境优化**：简化CI/CD流程，移除Amplify后端同步步骤，直接构建并部署静态文件到S3。添加环境变量支持，根据环境自动配置认证回调URL。优化代码，减少冗余。
- **[2025-04-13]** **技术稳定性优化**：从 AWS Amplify V6 迁移回 V5，解决了与 Vite 环境兼容性问题导致的 OAuth 登录失败。全面更新所有页面脚本，统一 Amplify 配置加载流程，确保认证服务在所有功能页面正常工作。
- **[2025-04-13]** 修复三大AI应用(User Story, User Manual, UX Design)的多项交互Bug(停止生成、按钮状态、验证提示、国际化、结果显示等)，确保使用云端配置，并统一相关代码实现。
- **[2025-04-12]** 实现用户语言偏好持久化存储到 DynamoDB UserSettings。
- **[2025-05-02]** **聊天界面UI修复**: 修复 `user-manual-new` 聊天界面输入框在输入时消失的Bug，通过覆盖基类 `bindEvents` 阻止冲突，确保输入交互稳定。
- **[2025-05-02]** **工作流结果显示修复**: 优化 Dify 工作流结果显示逻辑，通过在完成时使用 `setStreamContent` 覆盖结果，解决内容重复或缺失问题，确保最终输出准确显示。

## 字体使用
项目使用以下字体设置：
- **英文界面**：Verdana，系统自带无衬线字体
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
