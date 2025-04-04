# EVYD 产品经理 AI 工作台

基于EVYD科技先进的人工智能技术，为产品经理提供的一站式工作平台，提升工作效率和产出质量。

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
│   └── apps/                # 应用功能模块
│       ├── user-story/      # User Story生成器
│       │   ├── index.js     # 入口文件
│       │   ├── api.js       # API交互
│       │   └── ui.js        # 界面处理
│       ├── user-manual/     # 用户手册生成器
│       └── requirements/    # 需求分析工具（Work In Progress）
│
├── templates/               # HTML模板
│   └── pages/               # 页面模板
│       ├── index.html       # 主页
│       └── user-story.html  # User Story页面
│
├── docs/                    # 文档文件夹
│   └── Product_Requirements_Manual.md # 产品需求手册
│
├── backup/                  # 备份文件夹
├── index.html               # 重定向入口
├── user-story.html          # User Story重定向入口
└── README.md                # 项目说明
```

## 功能模块

1. **用户认证**：
   - 用户可通过用户名和密码登录系统
   - 系统支持记住登录状态功能
   - 密码找回功能（Work In Progress）

2. **用户管理**：
   - 管理员可以添加、编辑和删除用户
   - 支持不同角色权限设置
   - 用户可修改个人密码

3. **API配置**：
   - 支持配置Dify API地址
   - 支持在应用级别配置个人密钥

4. **AI功能**：
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
   
   - **需求分析助手**：需求待定（Work In Progress）

## 非功能特性

- **性能**：页面加载时间不超过3秒，暂不支持一次性处理多个并发
- **安全**：用户密码加密存储，API密钥安全管理，用户数据隔离
- **可用性**：直观的用户界面，响应式设计，支持不同设备
- **可扩展性**：支持新功能模块的快速集成

## 最近更新

### User Story生成器增强功能

- **Markdown渲染**：新增对Markdown格式的支持，生成结果将以格式化的方式展示，包括标题、列表、加粗和斜体等
- **JSON解析**：自动识别并解析JSON格式的响应，提取内容并处理换行符
- **响应式UI**：根据内容类型自动切换显示模式，提供更好的阅读体验

这些改进使产品经理能够获得结构清晰、易于阅读的User Story文档，便于直接复制使用或进一步编辑。

## 开发指南

### 添加新功能

1. 在 `modules/apps/` 目录下创建新模块文件夹
2. 创建 `index.js`、`api.js` 和 `ui.js` 文件
3. 在 `templates/pages/` 中添加对应的HTML模板
4. 在 `styles/` 中添加对应的CSS样式文件
5. 更新主页添加新功能入口

### 项目运行

本项目是纯前端项目，可以直接通过浏览器打开 `index.html` 文件运行，也可以使用简单的HTTP服务器：

```bash
# 使用Python启动简单HTTP服务器
python -m http.server

# 使用Node.js启动HTTP服务器
npx serve
```

默认管理员账户：
- 用户名：admin
- 密码：admin 