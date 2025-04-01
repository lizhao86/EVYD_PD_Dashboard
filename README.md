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
│   └── variables.css        # CSS变量（待添加）
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
│       ├── user-manual/     # 用户手册生成器（待添加）
│       └── requirements/    # 需求分析工具（待添加）
│
├── templates/               # HTML模板
│   └── pages/               # 页面模板
│       ├── index.html       # 主页
│       └── user-story.html  # User Story页面
│
├── backup/                  # 备份文件夹
├── index.html               # 重定向入口
├── user-story.html          # User Story重定向入口
└── README.md                # 项目说明
```

## 功能模块

1. **用户认证**：支持登录、注销和密码修改
2. **用户管理**：管理员可以添加、编辑和删除用户
3. **API配置**：配置Dify API地址和密钥
4. **AI功能**：
   - User Story生成器：基于简单描述生成结构化用户故事
   - 用户手册生成器：自动创建产品用户手册（规划中）
   - 需求分析助手：分析需求文档，提取关键点（规划中）

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