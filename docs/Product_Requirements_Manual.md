# EVYD 产品经理 AI 工作台 - 产品需求手册

## 1 文档信息

- **文档名称**：EVYD 产品经理 AI 工作台产品需求手册
- **当前版本**：1.6.10
- **创建日期**：2025-03-01
- **最后更新**：2025-04-15
- **文档状态**：更新中
- **文档所有者**：EVYD产品团队

## 2 版本历史

| 版本号 | 更新日期 | 更新人 | 更新描述 |
|-------|---------|-------|---------|
| 1.0   | 2025-03-01 | EVYD产品团队 | 初始版本，创建基本的产品需求文档结构 |
| 1.1   | 2025-03-08 | EVYD产品团队 | 更新UI需求，统一使用Verdana字体 |
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
| 1.5.0 | 2025-04-11 | EVYD产品团队 | 新增多语言支持功能，支持简体中文、繁体中文和英文界面切换 |
| 1.5.1 | 2025-04-11 | EVYD产品团队 | 统一全站浏览器标签图标(favicon)，增强品牌一致性体验 |
| 1.6.0 | 2025-04-12 | EVYD产品团队 | **重大重构**: 将认证迁移至 AWS Cognito (含 Hosted UI)，存储迁移至 DynamoDB (通过 Amplify AppSync & GraphQL API)。集成 Vite 构建工具。实现基于 Cognito Group 的首次登录角色同步。改进密码修改 UI 校验。 |
| 1.6.1 | 2025-04-12 | EVYD产品团队 | 实现用户语言偏好持久化存储到 DynamoDB UserSettings。 |
| 1.6.2 | 2025-04-13 | EVYD产品团队 | 修复三大AI应用(User Story, User Manual, UX Design)的多项交互Bug(停止生成、按钮状态、验证提示、国际化、结果显示等)，确保使用云端配置，并统一相关代码实现。 |
| 1.6.3 | 2025-04-13 | EVYD产品团队 | **技术稳定性优化**：从 AWS Amplify V6 迁移回 V5，解决了与 Vite 环境兼容性问题导致的 OAuth 登录失败。全面更新所有页面脚本，统一 Amplify 配置加载流程，确保认证服务在所有功能页面正常工作。 |
| 1.6.4 | 2025-04-13 | EVYD产品团队 | **部署与环境优化**：简化CI/CD流程，移除Amplify后端同步步骤，直接构建并部署静态文件到S3。添加环境变量支持，根据环境自动配置认证回调URL。优化代码，减少冗余。 |
| 1.6.5 | 2025-04-13 | EVYD产品团队 | **代码清理**: 移除 `scripts/utils/helper.js` 中未被使用的工具函数 (`generateUUID`, `formatDate`, `debounce`, `throttle`)，完成 `helper.js` 整合。 |
| 1.6.6 | 2025-04-13 | EVYD产品团队 | **代码清理 (续)**: 移除项目中所有JS文件中用于调试的 `console.log` 语句。 |
| 1.6.7 | 2025-04-14 | EVYD产品团队 | **UI改进与Bug修复**: 修复所有页面的favicon加载问题，确保统一的浏览器标签图标显示。统一三个AI应用的Markdown渲染功能，修复生成结果显示问题。解决API流处理和UI交互中的命名不一致问题，如"UI.setGeneratingState is not a function"错误。 |
| 1.6.8 | 2025-04-14 | EVYD产品团队 | **UI/UX优化与国际化改进**: 统一三个AI应用(User Story, User Manual, UX Design)的生成按钮文案，从"发送给AI"改为"发送给Dify"，提升品牌一致性。完善所有缺失的翻译键，标准化按钮状态文本（发送、处理中、生成中）。修复按钮状态流转BUG，确保生成过程中UI状态正确变化。 |
| 1.6.9 | 2025-04-15 | EVYD产品团队 | **国际化稳定性修复**: 修复语言切换后页面自动刷新功能，确保翻译完全应用。清理国际化及存储模块的冗余日志输出。 |
| 1.6.10 | 2025-04-15 | EVYD产品团队 | **国际化体验优化**: 解决页面加载时语言内容闪烁问题，通过在HTML加载早期添加CSS类隐藏内容，待翻译应用后再显示，确保流畅视觉体验。 |

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

### 4.1 用户认证模块 (已迁移至 AWS Cognito)

#### 4.1.1 登录/注册/登出功能 (Hosted UI)
- **登录/注册:** 用户通过 AWS Cognito 托管 UI (Hosted UI) 进行登录和注册，不再使用应用内自建表单。
    - 点击应用内"登录"按钮应重定向到 Cognito Hosted UI。
    - 支持用户名/密码认证。
    - 注册流程由 Cognito 处理（包括可能的邮箱/短信验证）。
- **登出:** 点击应用内"登出"按钮应触发 Cognito 全局登出流程，并重定向回应用指定的注销 URL。
- **会话管理:** 用户会话由 AWS Amplify 库自动管理（基于 Cognito 返回的 Tokens）。
- **认证库版本:** 项目使用 AWS Amplify V5 (aws-amplify@5.3.x)，因其在 Vite 环境下更加稳定，尤其是处理 OAuth 重定向流程。
- **环境适配:** 通过环境变量配置不同环境的重定向URL，自动根据开发/生产环境使用正确的认证回调地址。
- **首次登录处理:**
    - 新用户（或 DynamoDB 中无记录的用户）首次登录成功后，系统应检查其 Cognito 用户组。
    - 如果用户属于 `admin` 组，应在 DynamoDB 的 `UserSettings` 表中自动创建记录，并将 `role` 设置为 `admin`。
    - 否则，自动创建记录并将 `role` 设置为 `user`。
- **(已移除)** 不再支持"记住登录状态"复选框，会话持久性由 Cognito 和 Amplify 处理。
- **(待实现)** 密码找回流程也应通过 Cognito Hosted UI 处理 (需要配置 App Client 和用户池设置)。

#### 4.1.2 用户管理 (部分迁移至 Cognito)
- **用户创建/删除:** 主要的用户生命周期管理（创建、删除、禁用、确认）应通过 **AWS Cognito 控制台**或 **Cognito API** (需要后端或 CLI) 进行，不再通过应用内管理员面板直接操作。
- **(已移除/待调整)** 管理员面板中的添加/编辑/删除用户功能已临时禁用，需要重新设计以调用 Cognito API。
- **角色分配:** 用户在应用程序中的角色 (`admin` vs `user`) 由 DynamoDB `UserSettings` 表中的 `role` 字段决定。管理员身份主要通过加入 Cognito 的 `admin` 用户组来初始确定。
- **密码修改:** 用户应能通过应用内的"账号设置"修改自己的密码。
    - 调用 Amplify Auth 的 `changePassword` API。
    - 前端提供实时的密码策略校验反馈（长度、字符类型）。
    - 最终策略由 Cognito 后端强制执行。
- **(已移除)** 不再需要应用内"清理脏数据"功能，用户管理由 Cognito 负责。

#### 4.1.3 管理员面板
- 应提供统一的管理员面板。
- **(功能调整)** "用户管理"标签页功能暂时受限，提示管理员使用 Cognito 控制台。
- **(保留)** "API 地址配置"标签页允许管理员修改存储在 DynamoDB `GlobalConfig` 表中的全局 API Endpoints。
- **(待调整)** "API Key 配置"标签页功能暂时受限，为其他用户配置 API Key 需要更安全的后端实现。
- 管理员面板链接仅对 `UserSettings.role` 为 `admin` 的用户可见。

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

### 4.3 API配置模块 (已迁移至 DynamoDB)

- **(已移除)** 不再有独立的 API 配置模块文件 (`config.js`)。
- **全局 API 地址:** 由管理员通过管理员面板配置，存储在 DynamoDB 的 `GlobalConfig` 表中 (需要管理员首次保存以创建记录)。应用通过 `storage.js` 中的 `getGlobalConfig` 函数获取。
- **用户 API 密钥:**
    - **(待实现)** 需要为登录用户提供查看/编辑**自己** API Keys 的界面（例如在账号设置中）。
    - **(待调整)** 管理员为**其他用户**配置 API Keys 的功能需要重新设计和实现。
    - API Keys 存储在 DynamoDB 的 `UserSettings` 表中，与用户 ID 关联。
- **安全性:** API Keys 存储在后端数据库，不再暴露于前端 `localStorage`。

### 4.4 多语言支持

#### 4.4.1 语言选择功能
- 在页面头部提供语言切换功能
- 支持简体中文、繁体中文和英文三种语言
- **(已更新)** 语言偏好保存到云端用户设置 (DynamoDB `UserSettings`), 并回退到本地存储以优化未登录体验。切换语言后页面会自动刷新以确保翻译完全应用。

#### 4.4.2 字体与排版
- 为不同语言提供适合的字体设置
- 简体中文和繁体中文使用微软雅黑字体
- 英文使用Verdana字体
- 根据语言自动调整行高和文本间距

#### 4.4.3 界面适配
- 所有用户界面元素支持多语言
- 根据选定语言动态切换界面文本
- 保持一致的视觉体验和布局

#### 4.4.4 国际化架构
- **(已更新)** 国际化模块 (`i18n.js`) 已整合到 ES Module 系统。
- **(已更新)** 初始化时优先同步读取本地存储语言，异步获取用户云端设置，并在HTML加载早期添加CSS类隐藏主要内容，防止未翻译内容闪烁。
- **(已更新)** 切换语言时会将偏好保存到用户设置 (如果已登录)。
- 采用本地化JSON文件存储翻译内容，通过动态加载script标签实现按需加载。

## 5 非功能需求

### 5.1 性能需求

- 页面加载时间不超过3秒
- 暂不支持一次性处理多个并发

### 5.2 安全需求

- **认证:** 由 AWS Cognito 处理，支持标准安全实践 (如 MFA - 如果配置)。
- **密码:** 不在应用程序数据库中存储密码哈希，由 Cognito 安全管理。
- **令牌:** 使用 Cognito 签发的 JWT (ID Token, Access Token, Refresh Token) 进行会话管理和 API 授权。
- **API 授权:** AppSync GraphQL API 通过 Cognito 用户池进行授权。`UserSettings` 表通过 `@auth` 规则保护。`GlobalConfig` 表通过 `@auth` 规则限制写入权限给 `admin` 组。
- **API Keys:** 存储在后端数据库，通过用户所有权保护。

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
- **构建工具:** 使用 Vite 进行开发和构建。

## 6 用户界面需求

### 6.1 总体设计

- 采用现代简洁的界面风格
- 使用清晰的导航结构
- 保持界面一致性
- 全站统一使用 Verdana 字体，提供一致的视觉体验
- 全站统一使用EVYD黑色Logomark作为浏览器标签图标(favicon)，增强品牌一致性

### 6.2 字体规范

- 多语言字体支持：
  - 英文：Verdana（系统自带字体）
  - 中文（简体和繁体）：微软雅黑（Microsoft YaHei）
- 标题使用粗体字重
- 正文使用常规字重
- 强调文字使用粗体字重
- 使用系统字体作为备选方案

### 6.3 主要界面

- **(已移除)** 登录界面 (由 Cognito Hosted UI 替代)
- **(保留/修改)** 控制台/仪表板 (根据登录状态显示)
- User Story生成器
- 用户手册生成器
- UX界面设计(POC)
- 需求分析工具 Work In Progress
- **(修改)** 用户管理界面 (管理员功能受限)
- **(修改)** 设置界面 (包含修改密码，未来可加 API Key 和语言偏好)
- **(修改)** 管理员面板 (用户管理功能受限)
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

- **(修改)** 用户管理: 显示提示信息，引导使用 Cognito 控制台。
- **(保留)** API 地址配置: 调用 `saveGlobalConfig` 更新 DynamoDB。
- **(修改)** API 密钥配置: 功能受限，提示待开发。
- 标签页切换：点击顶部标签切换不同功能区域，保持当前内容状态

### 6.6 语言切换交互

- 语言选择器：
  - 位于页面顶部导航栏用户信息左侧
  - 显示当前语言名称和下拉图标
  - 点击后显示支持的语言列表
- 语言切换过程：
  - **(已更新)** 选择语言后将偏好保存到云端用户设置 (如果已登录) 和 localStorage。
  - **(已更新)** 保存成功后，页面会自动刷新应用新语言。
  - **(已更新)** 页面初始化时通过CSS隐藏内容防止语言闪烁，待翻译加载应用后恢复显示。
  - 保持用户登录状态和当前页面位置。

### 6.7 浏览器标签图标(Favicon)

- 全站统一使用EVYD黑色Logomark作为浏览器标签图标(favicon)
- 在所有页面中保持一致的标签图标
- 图标通过通用头部组件动态设置，确保在不同路径的页面中均能正确加载
- 当用户保存书签或将网站添加至收藏夹时，保持一致的图标显示
- 图标文件应使用优化的PNG格式，保证在不同浏览器中的一致性

## 7 系统架构

### 7.1 前端架构

- **框架/库:** Vanilla JavaScript, 使用 ES 模块。
- **构建:** 使用 Vite 进行依赖管理、开发服务和生产构建。
- **后端交互:** 通过 **AWS Amplify V5** 库与 AWS 服务交互。
    - **认证:** 使用 `aws-amplify` 中的 `Auth` 服务对接 Cognito 用户池和 Hosted UI。
    - **API:** 使用 `aws-amplify` 中的 API、graphqlOperation 对接 AppSync。
    - **配置管理:** 基于 `scripts/amplify-config.js` 统一初始化 Amplify，并支持环境变量覆盖。
- **环境变量:** 使用 `.env` 和 `.env.production` 文件配置环境特定参数（如登录回调URL）。
- **(已移除)** 不再依赖本地存储进行核心数据持久化。

### 7.2 国际化架构

- **(已更新)** 语言偏好与用户设置关联，存储在 DynamoDB。
- **(保留)** 基于JSON格式的翻译文件。
- **(保留)** 语言切换机制不依赖后端服务（指翻译文件本身）。
- **(保留)** 静态部署，支持无服务器环境。

### 7.3 外部依赖

- **AWS Services:**
    - **Cognito:** 用户池、身份池(可选)、托管 UI。
    - **DynamoDB:** 存储 `UserSettings` 和 `GlobalConfig`。
    - **AppSync:** 提供 GraphQL API 端点。
- **JS库依赖:**
    - **AWS Amplify V5:** 提供 AWS 服务集成，特别是认证和 GraphQL 支持。
    - **Marked:** 用于 Markdown 渲染。
- Dify API
- Google Fonts
- 图标库

### 7.4 部署架构

- **前端构建:** 使用 `npm run build` (Vite) 生成优化后的静态文件。
- **构建模式:** 生产环境构建使用 `--mode production` 参数，启用生产环境变量。
- **托管:** 静态文件托管在 AWS S3 (或其他静态托管服务)。
- **CI/CD:** GitHub Actions 自动构建并同步到 S3，无需访问 Amplify 后端。
    - `aws-exports.js` 已包含在项目源码中，避免依赖 Amplify CLI。
    - 构建过程自动使用生产环境的回调URL。
- **后端:** Amplify 管理的 Cognito, DynamoDB, AppSync 等资源保持不变。

## 8 发布计划

### 8.1 里程碑

| 里程碑 | 计划日期 | 主要交付内容 |
|-------|---------|------------|
| Alpha版本 | / | / |
| UI优化版本 | 2025-03-08 | 统一全站字体为Verdana，提升用户体验一致性 |
| UX界面设计(POC) | 2025-03-15 | 新增Figma界面设计提示词生成功能 |
| Bug修复版本 | 2025-03-18 | 修复UX界面设计文本区域展开和生成/停止功能，统一用户体验 |
| 自动部署版本 | 2025-03-22 | 新增GitHub Actions自动部署到AWS S3的功能，实现代码推送自动同步 |
| 安全加固版本 | 2025-04-03 | 增强安全性和性能优化 |
| 功能修复版本 | 2025-04-06 | 修复账号设置页面密码修改功能，确保用户可以正常更新密码 |
| 管理面板优化版本 | 2025-04-09 | 修复管理员面板数据加载和API配置功能，统一通用头部组件实现 |
| 多语言支持版本 | 2025-04-11 | 添加多语言支持，支持简体中文、繁体中文和英文界面切换 |
| Amplify V5迁移 | 2025-04-13 | 从Amplify V6迁移到V5，解决登录兼容性问题，优化配置加载 |
| CI/CD优化版本 | 2025-04-13 | 简化部署流程，添加环境变量支持，确保跨环境一致性 |
| 功能扩展计划 | TBD | 计划新增高级数据分析功能 |

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
- **AWS 服务依赖:** 应用功能现在强依赖于 AWS Cognito, DynamoDB, AppSync 等服务的可用性和正确配置。
- **网络延迟:** 与 AWS 服务的网络通信延迟可能影响用户体验。
- 需要有效的 AWS 账户和正确配置的 Amplify 后端环境。
- 离线环境下无法进行认证和数据同步。
- **浏览器兼容性:** 依赖于现代浏览器支持ES modules和Promise等特性，不兼容IE11及更早版本。

## 10 附录

### 10.1 术语表

| 术语 | 定义 |
|-----|-----|
| User Story | 从终端用户角度描述软件功能的简短描述 |
| API | 应用程序编程接口，允许不同软件应用之间的交互 |
| Dify | 一种AI应用开发平台 |
| Verdana | 由微软公司设计的无衬线字体，项目中使用的主要字体 |
| POC | Proof of Concept(概念验证)，用于验证某个想法或概念的可行性 |
| Figma | 一款基于浏览器的协作式界面设计工具 |
| GitHub Actions | GitHub提供的持续集成和持续部署(CI/CD)服务 |
| AWS S3 | Amazon Web Services提供的对象存储服务，可用于托管静态网站 |
| i18n | Internationalization（国际化）的缩写，指支持多语言的软件设计与开发 |
| **AWS Amplify V5** | AWS 提供的工具和服务库（版本5），用于构建和部署云支持的 Web 和移动应用程序 |
| **Cognito** | AWS 的身份管理服务，提供用户注册、登录、访问控制功能。 |
| **User Pool** | Cognito 中的用户目录，管理用户账户和身份验证。 |
| **Hosted UI** | Cognito 提供的可定制的、托管的登录/注册界面。 |
| **App Client** | Cognito 用户池中的应用程序配置，定义了应用如何与用户池交互。 |
| **DynamoDB** | AWS 的 NoSQL 键值和文档数据库。 |
| **AppSync** | AWS 的托管 GraphQL 服务，简化了应用程序与数据源（如 DynamoDB）的交互。 |
| **GraphQL** | 一种用于 API 的查询语言和运行时。 |
| **Vite** | 一种现代前端构建工具和开发服务器。 |
| **IAM** | AWS Identity and Access Management，用于管理对 AWS 资源的访问权限。 |
| **OAuth** | 开放授权协议，允许第三方应用访问用户资源而无需共享凭证。|

### 10.2 参考资料

- Dify API文档
- 产品经理工作指南
- AI内容生成最佳实践
- Google Fonts Verdana字体文档 
- Figma API与设计系统文档 
- GitHub Actions工作流文档
- AWS S3静态网站托管文档 
- [AWS Amplify V5 文档](https://docs.amplify.aws/) - 官方参考文档
- [Vite 环境变量指南](https://vitejs.dev/guide/env-and-mode.html) - 环境变量配置参考 