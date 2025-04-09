# EVYD 产品经理 AI 工作台

基于EVYD科技先进的人工智能技术，为产品经理提供的一站式工作平台，提升工作效率和产出质量。

## 功能特点
- 工作流程管理
- 数据可视化
- 对话型应用接口
- AI驱动的产品开发工具
- 全局统一使用 Lato 字体

## 项目结构

```
/EVYD_PD_Dashboard/
├── assets/                  # 静态资源文件夹
│   ├── images/              # 图片资源
│   │   └── logo/            # 徽标相关图片
│   ├── fonts/               # 字体文件
│   └── icons/               # 图标资源
│
├── styles/                  # CSS样式文件
│   ├── common.css           # 通用样式
│   ├── user-story.css       # User Story生成器样式
│   ├── user-manual.css      # 用户手册生成器样式
│   ├── main.css             # 主样式文件
│   └── variables.css        # CSS变量
│
├── scripts/                 # JavaScript脚本文件
│   ├── core/                # 核心功能
│   │   ├── app.js           # 应用入口
│   │   └── config.js        # 全局配置
│   ├── utils/               # 工具函数
│   │   ├── helper.js        # 辅助函数
│   │   └── api.js           # API工具
│   └── services/            # 服务层
│       └── storage.js       # 存储服务
│
├── modules/                 # 功能模块
│   ├── auth/                # 用户认证模块
│   │   └── auth.js          # 用户认证功能
│   ├── admin/               # 管理员功能
│   │   └── admin.js         # 用户管理
│   ├── common/              # 通用组件
│   │   └── header.js        # 通用头部组件
│   └── apps/                # 应用功能模块
│       ├── user-story/      # User Story生成器
│       │   ├── index.js     # 入口文件
│       │   ├── api.js       # API交互
│       │   └── ui.js        # 界面处理
│       ├── user-manual/     # 用户手册生成器
│       ├── ux-design/       # UX界面设计(POC)
│       │   ├── index.js     # 入口文件
│       │   ├── api.js       # API交互
│       │   └── ui.js        # 界面处理
│       └── requirements/    # 需求分析工具
│
├── templates/               # HTML模板
│   └── pages/               # 页面模板
│       ├── Homepage.html    # 主页
│       ├── user-story.html  # User Story页面
│       ├── user-manual.html # User Manual页面
│       └── ux-design.html   # UX界面设计页面
│
├── docs/                    # 文档文件夹
│   └── Product_Requirements_Manual.md # 产品需求手册
├── .github/                 # GitHub相关配置
│   └── workflows/           # GitHub Actions工作流
│       └── deploy.yml       # 自动部署工作流配置
├── backup/                  # 备份文件夹
└── index.html               # 重定向入口（指向Homepage.html）
```

## 功能模块

1. **用户认证**：
   - 用户可通过用户名和密码登录系统
   - 系统支持记住登录状态功能
   - 密码找回功能（Work In Progress）

2. **用户管理**：
   - 管理员可以添加、编辑和删除用户
   - 支持不同角色权限设置
   - 用户可修改个人密码（支持表单验证和操作反馈）

3. **文档中心**：
   - **产品需求手册**：产品需求文档通过docs目录下的Markdown文件提供，可直接查看源文件
   - API文档（即将推出）
   - 使用教程（即将推出）

4. **API配置**：
   - 支持配置Dify API地址
   - API密钥仅由管理员统一配置，普通用户无需关注API密钥设置

5. **AI功能**：
   - **User Story生成器**：
     - 用户提供Platform、System、Module和需求描述后，AI自动生成完整用户故事
     - 仅支持Given-When-Then-And的叙述模式，契合EVYD工作环境
     - 提供输出内容的一键复制功能
     - 支持应急暂停正在生成的任务，节省Token
     - 完成输出后展示生成耗时、Token消耗和步骤次数
   
   - **用户手册生成器**：
     - 根据产品的需求描述自动生成用户手册文档
     - 支持用在EVYD的User Manual内容中
     - 提供输出内容的一键复制功能
     - 支持应急暂停正在生成的任务，节省Token
     - 完成输出后展示生成耗时、Token消耗和步骤次数
   
   - **UX界面设计(POC)**：
     - 根据需求描述和User Story生成Figma界面设计的AI提示词
     - 支持Markdown格式输出
     - 提供复制功能便于直接粘贴到Figma
     - 支持应急暂停生成任务
     - 文本区域支持全屏展开编辑
     - 生成按钮在生成过程中转变为带红色加载动画的停止按钮
   
   - **需求分析助手**：
     - 分析需求文档，识别关键点，提取功能列表，并提供优化建议

## 非功能特性

- **性能**：页面加载时间不超过3秒，暂不支持一次性处理多个并发
- **安全**：用户密码加密存储，API密钥安全管理，用户数据隔离
- **可用性**：直观的用户界面，响应式设计，支持不同设备
- **可扩展性**：支持新功能模块的快速集成

## 最近更新

- 调整产品需求手册访问方式：
  - 移除了产品需求手册HTML页面
  - 现在通过直接查看docs/Product_Requirements_Manual.md文件访问产品需求文档
- 修复导航菜单显示问题：
  - 解决了"文档中心"下拉菜单在不同页面中样式不一致的问题
  - 统一了下拉菜单的外观和行为，确保所有页面中下拉菜单都正确地显示在其父菜单项下方
  - 保持与主页一致的白色背景和独立浮动层效果
- 优化API密钥管理流程：
  - 移除普通用户查看API密钥的入口
  - 简化用户界面，减少不必要的功能入口
  - 将API密钥的管理职责完全归属于管理员
- 修复管理员面板功能问题：
  - 解决了管理员面板数据无法加载的问题
  - 修复了API Key配置和API地址配置标签页点击无效的问题
  - 统一了通用头部组件实现，确保所有页面都能正常使用管理员功能
  - 确保所有页面都正确引入config.js配置文件，支持API地址管理
- 修复账号设置页面中修改密码功能：
  - 解决了更新密码和取消按钮无法点击的问题
  - 增加了对当前密码的验证和新密码确认功能
  - 添加了表单验证和错误信息提示
  - 优化了操作成功后的反馈和模态框自动关闭
- 新增GitHub Actions自动部署功能：
  - 配置了自动化部署流程，每次推送到main分支时自动部署到AWS S3
  - 排除了不必要文件(.git、.github等)的部署，优化部署效率
  - 使用IAM权限管理确保部署安全
- 新增产品需求手册页面，提供完整的产品需求文档访问
- 优化导航菜单，增加下拉菜单功能，提升用户体验
- 修复UX界面设计(POC)功能的用户体验问题：
  - 优化文本区域展开功能，实现与其他模块一致的全屏展开体验
  - 改进生成/停止逻辑，现在生成按钮会在生成过程中变为带红色加载动画的停止按钮
  - 统一了模块间的交互行为，提供一致的用户体验
- 新增UX界面设计(POC)功能，帮助产品经理快速生成Figma界面设计提示词
- **Markdown渲染**：对Markdown格式的支持，生成结果将以格式化的方式展示
- 将全站字体统一为 Lato，提供更一致的用户体验
- 优化所有页面的字体加载
- 完善文档

## 字体使用
项目使用 Google Fonts 提供的 Lato 字体，包含以下字重：
- Light (300)
- Regular (400)
- Medium (500)
- Semi-Bold (600)
- Bold (700)

## 开发指南

### 添加新功能

1. 在 `modules/apps/` 目录下创建新模块文件夹
2. 创建 `index.js`、`api.js` 和 `ui.js` 文件
3. 在 `templates/pages/` 中添加对应的HTML模板
4. 在 `styles/` 中添加对应的CSS样式文件
5. 更新主页添加新功能入口

### 项目运行

本项目是纯前端项目，可以直接通过浏览器打开 `index.html` 文件运行（会重定向到Homepage.html），也可以使用简单的HTTP服务器：

```bash
# 使用Python启动简单HTTP服务器
python -m http.server

# 使用Node.js启动HTTP服务器
npx serve
```

默认管理员账户：
- 用户名：admin
- 密码：admin 

### 部署流程

本项目使用GitHub Actions自动部署到AWS S3：

1. 每次推送到`main`分支时，会自动触发部署工作流
2. 工作流会将项目文件同步到AWS S3存储桶
3. 部署排除了开发相关文件(.git、.github目录等)

部署前需要在GitHub仓库的Settings > Secrets中设置以下密钥：
- `AWS_ACCESS_KEY_ID`：AWS访问密钥ID
- `AWS_SECRET_ACCESS_KEY`：AWS秘密访问密钥

AWS IAM用户需要有对应S3存储桶的写入权限。 