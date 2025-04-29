### 7.5 数据存储 (新增)

#### 7.5.1 `Conversations` 表 (DynamoDB)

为了支持聊天应用的对话历史管理功能（包括历史列表、置顶、重命名、删除等），新增一个专门的 DynamoDB 表 `Conversations` (Amplify 会自动添加环境后缀)。

- **目的**: 持久化存储用户与 AI 应用的对话会话元数据。**每一行代表一个独立的对话会话**。
- **与 `UserSettings` 表的关系**: 该表与 `UserSettings` 表独立，但都通过 `userId` 与用户关联。

**主键 (Primary Key):**

- **分区键 (Partition Key)**: `userId` (String)
    - **描述**: 用户的唯一标识 (如 Cognito `sub` ID)。用于将同一用户的所有对话聚合在一起。
- **排序键 (Sort Key)**: `conversationId` (String)
    - **描述**: Dify Chat API 返回的会话 ID (`conversation_id`)。在用户范围内唯一标识一个对话。

**核心属性 (Attributes):**

- `userId` (String): 分区键。
- `conversationId` (String): 排序键。
- `title` (String): 对话标题。
    - **来源**: 优先使用 Dify API (`POST /conversations/:conversation_id/name` 与 `auto_generate: true`) 获取的 AI 总结标题。支持用户后续手动重命名。
    - **用途**: 在侧边栏对话列表中显示。
- `createdAt` (AWSDateTime): 对话创建时间戳 (通常由 Amplify `@model` 自动管理)。
- `updatedAt` (AWSDateTime): 对话最后交互时间戳 (通常由 Amplify `@model` 自动管理)。
    - **用途**: 用于按最近活动排序对话列表。每次对话有新消息时应更新。
- `isPinned` (Int): 是否置顶。
    - **值**: `1` 表示置顶，`0` 表示未置顶 (使用 Int 方便索引)。
    - **用途**: 实现置顶功能。
- `appType` (String): 应用类型标识。
    - **值**: 例如 `'userManual'`, `'requirementAnalysis'` 等。
    - **用途**: 区分不同 AI 应用的对话，便于未来扩展。

**全局二级索引 (Global Secondary Index - GSI):**

- **索引名称**: `byUserSortedByUpdate` (或 Amplify 自动生成的类似名称)
- **GSI 分区键 (GSI PK)**: `userId` (String)
- **GSI 排序键 (GSI SK)**: `updatedAt` (AWSDateTime)
- **目的**: 支持高效查询某个用户的所有对话，并按最后更新时间倒序排列。
- **查询逻辑**:
    1. 使用此 GSI 查询指定 `userId` 的所有对话，按 `updatedAt` 降序排列。
    2. 在前端 JavaScript 中对查询结果进行二次处理，将 `isPinned` 为 `1` 的对话优先显示在列表顶部。

**备注**: 该表结构仅存储对话的元数据，不存储具体的聊天消息内容（为了简化实现和降低成本）。用户切换到历史对话时，将使用 `conversationId` 继续与 Dify API 交互。 