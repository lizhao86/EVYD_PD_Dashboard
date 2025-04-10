# EVYD 产品经理 AI 工作台 - 产品需求手册

## 1 文档信息

- **文档名称**：EVYD 产品经理 AI 工作台产品需求手册
- **当前版本**：1.5.1
- **创建日期**：2025-03-01
- **最后更新**：2025-04-16
- **文档状态**：更新中
- **文档所有者**：EVYD产品团队

## 2 版本历史

| 版本号 | 更新日期 | 更新人 | 更新描述 |
|-------|---------|-------|---------|
| 1.0   | 2025-03-01 | EVYD产品团队 | 初始版本，创建基本的产品需求文档结构 |
| 1.1   | 2025-03-08 | EVYD产品团队 | 更新UI需求，统一使用Lato字体 |
| 1.2   | 2025-03-15 | EVYD产品团队 | 新增UX界面设计(POC)功能 |
| 1.2.1 | 2025-03-18 | EVYD产品团队 | 修复UX界面设计功能的用户体验问题，包括文本区域展开和生成/停止功能 |
| 1.3.0 | 2025-03-22 | EVYD产品团队 | 新增GitHub Actions自动部署到AWS S3功能，提高部署效率 |
| 1.3.1 | 2025-03-28 | EVYD产品团队 | 优化部署流程，更新S3存储桶配置 |
| 1.4.0 | 2025-04-03 | EVYD产品团队 | 增强安全性和性能优化 |
| 1.4.1 | 2025-04-06 | EVYD产品团队 | 修复账号设置页面密码修改功能，解决按钮无法点击问题 |
| 1.4.2 | 2025-04-09 | EVYD产品团队 | 修复管理员面板数据加载问题和API配置功能，统一通用头部组件实现 |
| 1.4.3 | 2025-04-09 | EVYD产品团队 | 移除用户下拉菜单中的"查看API密钥"入口，优化API密钥管理流程 |
| 1.4.4 | 2025-04-09 | EVYD产品团队 | 修复导航菜单中"文档中心"下拉菜单的显示问题，确保所有页面中下拉菜单样式统一 |
| 1.4.5 | 2025-04-10 | EVYD产品团队 | 移除产品需求手册HTML页面，改为直接通过Markdown文件提供文档访问 |
| 1.4.6 | 2025-04-10 | EVYD产品团队 | 新增用户管理中的脏数据清理功能，优化用户数据管理 |
| 1.5.0 | 2025-04-15 | EVYD产品团队 | 新增多语言支持功能，支持简体中文、繁体中文和英文界面切换 |
| 1.5.1 | 2025-04-16 | EVYD产品团队 | 统一全站浏览器标签图标(favicon)，增强品牌一致性体验 |

## 3 产品概述

### 3.1 产品背景

EVYD 产品经理 AI 工作台是基于EVYD科技先进的人工智能技术，为产品经理提供的一站式工作平台，旨在提升产品经理的工作效率和产出质量。随着人工智能技术的快速发展，产品经理面临的工作挑战日益增长，需要更智能化的工具来辅助其完成日常工作。

### 3.2 产品愿景

打造产品经理的得力助手，通过AI技术赋能产品经理，使其能够更专注于战略思考和创新设计，而非繁琐的文档编写工作。

### 3.3 目标用户

- 初级产品经理：需要学习和提高产品文档撰写能力
- 中高级产品经理：需要提高工作效率，减少重复工作
- 创业团队成员：兼任产品角色，需要快速产出高质量产品文档
- 企业产品部门：需要标准化产品文档和工作流程

## 4 功能需求

### 4.1 用户认证模块

#### 4.1.1 登录功能
- 用户应能通过用户名和密码登录系统
- 系统应支持记住登录状态功能
- 密码找回功能 Work In Progress

#### 4.1.2 用户管理
- 管理员应能添加、编辑和删除用户
- 应支持不同角色权限设置
- 用户应能修改个人密码
- 用户密码修改界面应提供清晰的表单验证和反馈
- 提供脏数据清理功能，一键清理不符合ID格式规范的用户数据
- 确保用户ID格式统一（admin-timestamp或user-timestamp格式）

#### 4.1.3 管理员面板
- 应提供统一的管理员面板，包含用户管理、API密钥配置和API地址配置功能
- 管理员面板应在所有页面上一致可用
- 确保数据正确加载，标签页切换功能正常工作
- 提供清晰的表单反馈和操作结果提示

### 4.2 AI功能模块

#### 4.2.1 User Story生成器
- 用户提供 Platform，System，Module，需求描述的 4 个字段后，AI自动生成完整的用户故事
- 仅支持 Given - When - Then - And 的叙述模式，完美契合 EVYD 的工作环境
- 提供输出内容的一键复制功能
- 支持应急暂停正在生成的任务，节省 Token
- 完成输出后展示每次生成的耗时，Token消耗，步骤次数

##### 4.2.1.1 Dify 工作流原理
- **工作流名称**: 产品工作流 - 创建需求
- **工作流作用**: 这个工作流就像一个智能助手，你只需要告诉它你的产品需求，它就能帮你自动生成结构清晰的用户故事和验收标准。
  - **幕后功臣**: 这个功能背后是 Dify 工作流在驱动，它使用了 AI 技术来实现自动化生成。
  - **核心模型**: 在生成用户故事时，主要使用了 Gemini 模型 (langgenius/gemini/google:gemini-2.0-flash-thinking-exp-01-21)，这个模型擅长理解产品需求并生成高质量的文档。
  - **工作流程**:
      1.  **告诉我你的需求**: 你需要提供一些信息，比如你的产品是关于哪个平台（App 还是 Console），哪个系统，哪个模块的，以及具体的需求描述。
      2.  **AI 判断你想做什么**: 工作流会先判断你是不是真的想"创建产品需求"，还是有其他的想法。这个判断是由 Deepseek 模型 (langgenius/deepseek/deepseek:deepseek-chat) 完成的。
      3.  **决定下一步**: 如果 AI 判断你确实想创建用户故事，它就会继续下一步；否则，它会告诉你目前这个工具只能生成用户故事。
      4.  **AI 生成用户故事**: 接下来，Gemini 模型会根据你提供的需求和预设的"提示词"（Prompt），自动生成 User Story 文档。
      5.  **检查细节**: 生成完用户故事后，还会用Deepseek 模型 (langgenius/deepseek/deepseek:deepseek-chat) 检查一下，看看生成的需求是否足够详细，有没有遗漏什么重要的细节。
      6.  **给出最终结果**: 如果检查发现信息不足，它会提示你需要补充更多细节；如果信息完善，就会直接输出最终的 User Story 文档。
      7.  **最终产出**: 你会得到一份结构化的 User Story 文档，或者得到一个友好的提示，告诉你需要补充哪些信息才能生成更好的用户故事。

##### 4.2.1.2 核心提示词
```markdown
根据用户的需求输入，请按下方内容和格式写 User Story 文档

System:
1. You are a senior product manager in the healthcare internet industry with expertise in health management systems and user experience design.
2. You can understand user requirements and generate high-quality User Story documents in a standard format, including title, description, Figma links, and acceptance criteria.
3. Interaction if the requirement provided is not clear:
   - Guide the user to describe their requirement (target user, goal, core functionality).
   - Ask clarifying questions in Chinese to resolve ambiguity and ensure full understanding.
4. If the requirement is detailed enough, generate content for User Story.
5. When generating content, please consider and refine from the following dimensions:
    - Healthcare management perspective: Consider health data analysis, adherence tracking, and health goal achievement
    - IT implementation perspective: Consider system functionality, user interface, and technical implementation
    - User experience perspective: Consider usability, notification effectiveness, and personalisation options
    - User Interface: parameters, buttons, clicking and jumping logic
    - The title should be written in an As [a user], I want to [do a thing] format.
6. Requirements for Acceptance Criteria:
    - Use the Given-When-Then-And format, ensuring each scenario is complete and detailed.
    - Include at least 5 key scenarios covering main functionality, edge cases, and error handling.
    - Each scenario should consider user operation flow, system response, and data changes.
    - Appropriately add "And" clauses to make acceptance criteria more comprehensive.
    - Define conditions that QA can verify.
    - Leave no room for interpretation. These must cover the Main Success Path ("Happy Path"): The primary way the feature should work correctly. Alternative Paths: Other valid ways the feature might be used. Edge Cases: Uncommon but possible situations. And Error Handling: How the system should respond to invalid input or failures.
6. Output everything in English with markdown format regardless of the language used by the user, ensuring accurate professional terminology.

Assistant

### Title:
[{{#1743174409613.Platform#}}] {{#1743174409613.System#}} {{#1743174409613.Module#}} - As an Admin, I Can View Inherited Read-Only Permissions When Assigning Permissions to Accounts which already linked with certain Roles

### **Description**
When assigning permissions to accounts, I can see the permissions inherited from roles, but these are displayed in a read-only format to prevent unauthorized changes.

### **Figma Section Link(s)**
- User flow: N/A *(Remove if Appliable)*
- LoFi wireframe: *N/A (Remove if Appliable)*
- HiFi wireframe (final design): *N/A (Remove if Appliable)*

### **Acceptance Criteria**
**Scenario 1: Viewing Inherited Permissions During Assignment**
- **Given** I am an Admin assigning permissions to accounts,
- **When** I select an account that is linked with certain roles already,
- **Then** I should be able to view the permissions inherited from these roles.

**Scenario 2: Read-Only Format for Inherited Permissions**
- **Given** I am viewing inherited permissions for an account,
- **When** I examine these permissions,
- **Then** they should be displayed in a read-only format to ensure that I cannot make unauthorized changes to them.

**Scenario 3: Clarity and Distinction of Inherited Permissions**
- **Given** I am in the process of assigning rights to an account,
- **When** I view the permissions linked to that account,
- **Then** the inherited permissions should be clearly distinguished from the directly assigned permissions, possibly through different visual cues or sections.
```

#### 4.2.2 用户手册生成器
- 根据产品的需求描述自动生成用户手册文档
- 支持用在 EVYD的 User Manual 内容中
- 提供输出内容的一键复制功能
- 支持应急暂停正在生成的任务，节省 Token
- 完成输出后展示每次生成的耗时，Token消耗，步骤次数

##### 4.2.2.1 Dify 工作流
   - **工作流名称**: 产品 ChatBot - 撰写 User Manual
   - **工作流作用**: 这个 ChatBot 就像一个专业的技术文档撰写助手，可以根据你提供的产品信息，自动生成清晰简洁的用户手册。它可以帮你创建操作指南和常见问题解答，让用户更容易上手你的产品。
   - **幕后功臣**: 这个功能的背后也是 Dify 工作流在驱动，它利用 AI 技术来理解产品信息并生成用户手册内容。
   - **核心模型**: 在撰写用户手册时，主要使用了 Gemini 模型 (langgenius/gemini/google:gemini-2.0-flash-thinking-exp-01-21)。Gemini 模型在这个 ChatBot 中扮演着资深技术文档撰写专家的角色。
   - **工作流程**: 这个工作流相对直接，你只需要提供  User Story (包含功能描述和验收标准)，ChatBot 就会根据预设的提示词，自动生成用户手册的相应章节。

##### 4.2.2.2 核心提示词
```markdown
You are a **Senior Technical Writer** specialized in **healthcare technology** with deep experience in creating end-user guides based on user-centered design principles.

## Input (Provided)
A **User Story** with:
- Feature description from user's viewpoint
- Acceptance Criteria (AC)

## Task
Based on the **provided User Story and AC**, generate a clear, structured User Manual section following these rules:

### Writing Requirements
- **Simple sentences:** Use clear, short language. Follow the pattern **"The user can [action] to [outcome]."** for descriptive text.
- **End-User Perspective:** Address directly to end-users (doctors, nurses, administrators, patients). Avoid unnecessary technical jargon.
- **Action-Step clarity:** Numbered steps using imperative verbs ("Click", "Enter", "Select") for user instructions.
- **UI Element references:** Clearly state UI elements (buttons, fields, tabs) by their exact name or indicate placeholders like `[Button Label]` if missing.
- **Troubleshooting:** Briefly guide users through possible common issues or questions.

### Output Structure (Use Markdown)
Follow strictly this Markdown structure:

```markdown
# [Feature Name]

*This feature allows the user to [brief overview of the functionality and purpose].*

## [Task 1 Title, e.g., Access Patient History]
*The user can [perform action to reach specific outcome].*
1. Click ['Element Label'].
2. Enter [information] into ['Field Label'] field.
3. Click ['Element Label'] to [complete action].

## [Optional Task 2 Title, e.g., Edit Patient Information]
*The user can [perform action to edit/update].*
1. Select ['Element Label'].
2. Update [information].
    * *Tip:* [Useful tip or reminder].
3. Click ['Element Label'].

## [If Applicable: Advanced Options]
*The user can also [optional advanced action].*
1. Click ['Advanced Settings'].
2. Choose [option].
3. [Further steps].

## Troubleshooting / Common Questions
- **Issue/Question:** Brief guidance.
- [Other issues/questions as needed]
```

#### 4.2.3 UX界面设计(POC)
- 根据需求描述和User Story生成Figma界面设计的AI提示词
- 支持Markdown格式输出，方便阅读和使用
- 提供复制功能便于直接粘贴到Figma中使用
- 生成按钮在生成过程中转变为停止按钮，方便用户随时中断生成过程
- 生成时提供动态红色加载动画，明确指示生成状态
- 支持应急暂停正在生成的任务，节省Token
- 完成输出后展示每次生成的耗时，Token消耗，步骤次数
- 支持文本区域的全屏展开功能，方便输入和编辑较长的需求描述
- 作为概念验证(POC)功能，旨在探索AI在界面设计中的应用可能性

##### 4.2.3.1 Dify 工作流
   - **工作流名称**: 产品 Chatbot - UX 设计小学徒（POC 版本）
   - **工作流作用**: 这个 Chatbot 就像一个  UX 设计的 AI 小助手，它可以帮你生成用于 Figma First Draft AI 的提示词。 它可以将你的产品需求转化为线框图设计的描述，辅助你快速开始 Figma 中的设计工作。
   - **幕后功臣**: 这个功能同样由 Dify 工作流驱动，它利用 AI 技术来理解产品需求并生成设计提示词。
   - **核心模型**: 在生成 UX 设计提示词时，主要使用了 Gemini 模型 (langgenius/gemini/google:gemini-2.0-flash)。 Gemini 模型在这个 Chatbot 中扮演着有经验的产品设计师的角色，帮助你将产品需求转化为设计语言。
   - **注意**: 需要注意的是，这个功能目前还处于  POC（概念验证）阶段，生成的提示词是用来辅助 Figma First Draft AI 的，但由于 Figma 本身的 AI 功能还在发展中，所以   不能完全依赖   生成的结果。UI/UX 团队可能需要进行细致的调整和优化。

##### 4.2.3.2 核心提示词
```markdown
【你的角色】
你是一位经验丰富的产品设计师，擅长将产品需求(Acceptance Criteria)转换为清晰的线框图(Wireframe)设计描述。你有丰富的UI/UX经验，能够准确理解产品需求并提炼出页面的核心元素与功能流程。

【工作流程】
1. 我会提供一段Acceptance Criteria(AC)和相关描述
2. 你需要分析理解这些需求，并将其转换为线框图(Wireframe)的设计描述

【你的任务】
基于我提供的AC，你需要提供以下内容：
1. 页面概述：用一句话描述每个页面的核心目的（必填），例如：
    - "一个销售烧烤设备的商店结账页面"
    - "一个宠物食品配送应用"
    - "一个内容策略咨询公司的营销网站"

2. 核心功能
    - 详细列出页面应包含的关键功能元素

3. 给 UIUX 建议
    - 描述页面主要区域的组织方式和各组件的合理排布
    - 信息层次结构和视觉重量分布
    - 主要交互方式和信息架构

【输出要求】
    - 使用Markdown格式输出所有内容
    - 无论我使用什么语言提问，你都必须用英文回答
    - 保持专业、简洁但详尽的描述风格

【输出格式】
当我提供AC后，请按以下格式组织你的回答:

## 注意
⚠️ 此 AI 还在测试中，如果完全依赖这个生成 UX，UIUX team 会生气。请仔细甄别⚠️

## Page 1 - Page Name （copy paste 下面的内容去 Figma First Draft AI）
[一句话描述页面概述]
[一句话描述页面核心功能]

## Page 2 - Page Name （copy paste 下面的内容去 Figma First Draft AI）
[一句话描述页面概述]
[一句话描述页面核心功能]

## To UIUX Team (DONT FEED to FigmaAI)
[详细描述给UIUX 建议]

```

#### 4.2.4 需求分析助手
- 需求待定 Work In Progress

### 4.3 API配置模块

- 支持配置Dify API地址
- API密钥由管理员统一配置，不对普通用户提供查看和修改入口
- 管理员可为所有用户配置API密钥
- 全局API地址配置对所有用户生效
- API密钥安全管理，确保密钥不被泄露

### 4.4 多语言支持

#### 4.4.1 语言选择功能
- 在页面头部提供语言切换功能
- 支持简体中文、繁体中文和英文三种语言
- 语言偏好保存到本地存储，下次访问时自动应用

#### 4.4.2 字体与排版
- 为不同语言提供适合的字体设置
- 简体中文和繁体中文使用微软雅黑字体
- 英文使用Lato字体
- 根据语言自动调整行高和文本间距

#### 4.4.3 界面适配
- 所有用户界面元素支持多语言
- 根据选定语言动态切换界面文本
- 保持一致的视觉体验和布局

#### 4.4.4 国际化架构
- 采用本地化JSON文件存储翻译内容
- 提供简单的翻译API，便于获取翻译文本
- 根据用户选择的语言自动设置文档语言标签

## 5 非功能需求

### 5.1 性能需求

- 页面加载时间不超过3秒
- 暂不支持一次性处理多个并发

### 5.2 安全需求

- 用户密码加密存储
- API密钥安全管理
- 用户数据隔离

### 5.3 可用性需求

- 直观的用户界面
- 响应式设计，支持不同设备
- 详细的操作引导和帮助文档

### 5.4 可扩展性需求

- 支持新功能模块的快速集成
- 通用组件设计，确保跨页面一致性

### 5.5 代码质量需求

- 组件化设计，统一通用功能
- 页面间共享功能保持一致的用户体验
- 确保所有页面正确加载必要的依赖项

## 6 用户界面需求

### 6.1 总体设计

- 采用现代简洁的界面风格
- 使用清晰的导航结构
- 保持界面一致性
- 全站统一使用 Lato 字体，提供一致的视觉体验
- 全站统一使用EVYD黑色Logomark作为浏览器标签图标(favicon)，增强品牌一致性

### 6.2 字体规范

- 多语言字体支持：
  - 英文：Lato字体（从Google Fonts引入）
  - 中文（简体和繁体）：微软雅黑（Microsoft YaHei）
- 字重使用：Light (300), Regular (400), Medium (500), Semi-Bold (600), Bold (700)
- 标题使用 Semi-Bold 或 Bold 字重
- 正文使用 Regular 字重
- 强调文字使用 Medium 字重
- 使用系统字体作为备选方案

### 6.3 主要界面

- 登录界面
- 控制台/仪表板
- User Story生成器
- 用户手册生成器
- UX界面设计(POC)
- 需求分析工具 Work In Progress
- 用户管理界面
  - 用户列表
  - 添加/编辑用户表单
  - 脏数据清理功能
- 设置界面
- 管理员面板
  - 用户管理标签页
  - API密钥配置标签页 
  - API地址配置标签页
- 语言选择界面组件
  - 语言切换下拉菜单
  - 语言选项列表

### 6.4 UX界面设计用户交互

- 文本框展开：点击右上角的展开按钮，将文本框放大至全屏状态，便于编辑较长的需求描述；点击缩小按钮或遮罩层可以恢复原始大小
- 生成/停止机制：
  - 点击"生成设计提示词"按钮开始生成过程
  - 生成过程中按钮变为"生成中...点击停止"状态，显示红色旋转动画
  - 点击正在生成状态的按钮可以立即停止生成过程
  - 停止后按钮恢复到初始"生成设计提示词"状态
- 结果复制：生成结果页面右上角提供复制按钮，一键复制全部内容
- Markdown渲染：生成的内容采用Markdown格式，并自动渲染为HTML格式展示

### 6.5 管理员面板交互

- 标签页切换：点击顶部标签切换不同功能区域，保持当前内容状态
- 用户管理：
  - 显示用户列表，包含ID、用户名、角色、创建日期和操作按钮
  - 提供添加、编辑和删除用户的功能
  - 提供"清理脏数据用户"按钮，可一键清理不规范的用户数据
  - 清理前进行安全检查，防止误删当前登录用户或唯一管理员
- API密钥配置：
  - 用户选择下拉框，选择要配置的用户
  - 为每个功能模块单独配置API密钥
  - 提供保存按钮和操作反馈
- API地址配置：
  - 为每个功能模块单独配置API地址
  - 所有用户共享相同的API地址配置
  - 提供保存按钮和操作反馈

### 6.6 语言切换交互

- 语言选择器：
  - 位于页面顶部导航栏用户信息左侧
  - 显示当前语言名称和下拉图标
  - 点击后显示支持的语言列表
- 语言切换过程：
  - 选择语言后保存偏好到localStorage
  - 刷新页面应用新语言设置
  - 保持用户登录状态和当前页面位置

### 6.7 浏览器标签图标(Favicon)

- 全站统一使用EVYD黑色Logomark作为浏览器标签图标(favicon)
- 在所有页面中保持一致的标签图标
- 图标通过通用头部组件动态设置，确保在不同路径的页面中均能正确加载
- 当用户保存书签或将网站添加至收藏夹时，保持一致的图标显示
- 图标文件应使用优化的PNG格式，保证在不同浏览器中的一致性

## 7 系统架构

### 7.1 前端架构

- 纯前端实现，可直接在浏览器中运行
- 模块化设计，便于维护和扩展
- 本地存储用户配置和历史记录
- 通用组件化设计，确保跨页面功能一致性

### 7.2 国际化架构

- 基于JSON格式的翻译文件
- 语言切换机制不依赖后端服务
- 静态部署，支持无服务器环境

### 7.3 外部依赖

- Dify API：提供AI功能支持
- Google Fonts：提供Lato字体
- 图标库：提供UI资源

### 7.4 部署架构

- 静态页面托管在AWS S3存储桶上
- 使用GitHub Actions实现自动部署流程
- 每次推送到main分支时自动同步到S3存储桶
- 使用IAM权限管理确保部署安全

## 8 发布计划

### 8.1 里程碑

| 里程碑 | 计划日期 | 主要交付内容 |
|-------|---------|------------|
| Alpha版本 | / | / |
| UI优化版本 | 2025-03-08 | 统一全站字体为Lato，提升用户体验一致性 |
| UX界面设计(POC) | 2025-03-15 | 新增Figma界面设计提示词生成功能 |
| Bug修复版本 | 2025-03-18 | 修复UX界面设计文本区域展开和生成/停止功能，统一用户体验 |
| 自动部署版本 | 2025-03-22 | 新增GitHub Actions自动部署到AWS S3的功能，实现代码推送自动同步 |
| 安全加固版本 | 2025-04-03 | 增强安全性和性能优化 |
| 功能修复版本 | 2025-04-06 | 修复账号设置页面密码修改功能，确保用户可以正常更新密码 |
| 管理面板优化版本 | 2025-04-09 | 修复管理员面板数据加载和API配置功能，统一通用头部组件实现 |
| 多语言支持版本 | 2025-04-15 | 添加多语言支持，支持简体中文、繁体中文和英文界面切换 |
| 功能扩展计划 | 2025-06-10 | 计划新增高级数据分析功能 |

## 9 风险与限制

### 9.1 已知风险

- AI模型可能产生不准确或不合适的内容
- API服务可能存在不稳定性
- 用户对AI生成内容的接受度不确定
- 外部字体依赖可能导致在某些网络环境下加载缓慢
- AWS服务可用性变化可能影响部署流程

### 9.2 限制条件

- 离线环境下无法使用AI功能
- 受API调用频率和额度限制
- 生成内容受到模型能力的限制
- 依赖Google Fonts服务可用性
- 依赖GitHub Actions和AWS服务的可用性和稳定性

## 10 附录

### 10.1 术语表

| 术语 | 定义 |
|-----|-----|
| User Story | 从终端用户角度描述软件功能的简短描述 |
| API | 应用程序编程接口，允许不同软件应用之间的交互 |
| Dify | 一种AI应用开发平台 |
| Lato | 由波兰设计师Łukasz Dziedzic设计的无衬线字体，项目中使用的主要字体 |
| POC | Proof of Concept(概念验证)，用于验证某个想法或概念的可行性 |
| Figma | 一款基于浏览器的协作式界面设计工具 |
| GitHub Actions | GitHub提供的持续集成和持续部署(CI/CD)服务 |
| AWS S3 | Amazon Web Services提供的对象存储服务，可用于托管静态网站 |
| i18n | Internationalization（国际化）的缩写，指支持多语言的软件设计与开发 |

### 10.2 参考资料

- Dify API文档
- 产品经理工作指南
- AI内容生成最佳实践
- Google Fonts Lato字体文档 
- Figma API与设计系统文档 
- GitHub Actions工作流文档
- AWS S3静态网站托管文档 