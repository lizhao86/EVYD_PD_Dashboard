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

### 7.6 管理员面板 API 配置问题修复 (2023-07-17)

#### 7.6.1 问题描述

管理员面板的"API地址配置"功能在保存时出现`ConditionalCheckFailedException`错误，导致无法成功保存全局API端点配置。调试发现有两个主要问题：

1. **DOM元素查找问题**：原有代码使用了过于严格的CSS选择器`input.form-control[data-app-id]`，无法找到实际的输入元素。
2. **DynamoDB条件检查失败**：尝试创建已存在的记录，但未处理`ConditionalCheckFailedException`错误。

#### 7.6.2 解决方案

1. **改进DOM元素查找逻辑**：
   - 使用更通用的选择器`input`而非限制性的CSS类选择器
   - 实现多级查找策略：data-app-id属性 → 预定义映射表 → ID提取
   - 添加了输入ID到应用ID的映射表，确保可以正确关联

   ```javascript
   const INPUT_ID_TO_APP_ID_MAP = {
       'global-userstory-api-endpoint': 'userStory',
       'global-usermanual-api-endpoint': 'userManual',
       'global-requirementsanalysis-api-endpoint': 'requirementsAnalysis',
       'global-uxdesign-api-endpoint': 'uxDesign'
   };
   ```

2. **增强DynamoDB操作稳健性**：
   - 在`saveGlobalConfig`函数中添加重试逻辑，可重试最多3次
   - 预先加载所有现有配置，减少单独查询
   - 对`ConditionalCheckFailedException`错误实现特殊处理
   - 添加最终回退策略，使用列表查询后再更新

#### 7.6.3 其他优化

1. **添加默认应用程序列表**：确保即使GraphQL查询失败，也能使用默认配置继续工作
   ```javascript
   this.applications = [
       { id: 'userStory', name: 'User Story' },
       { id: 'userManual', name: 'User Manual' },
       { id: 'requirementsAnalysis', name: 'Requirements Analysis' },
       { id: 'uxDesign', name: 'UX Design' }
   ];
   ```

2. **完善错误处理**：添加更多检查点和错误恢复机制，提高系统稳健性

3. **清理代码**：移除不必要的调试日志，保持代码整洁

通过以上修改，管理员面板中的API地址配置功能现在可以正常工作，成功保存API端点配置到DynamoDB数据库中，并且在发生冲突时能够智能处理。

### 7.7 管理员面板用户列表选项卡优化 (2023-07-19)

#### 7.7.1 问题描述

管理员面板中的用户管理选项卡存在用户体验问题：虽然在HTML模板中已标记为默认选中(`active`类)，但用户仍需手动点击该选项卡才能显示用户列表。调试发现有三个关键问题：

1. **事件处理冲突**：全局事件委托(event delegation)中存在对`.admin-tab`的点击处理，与`initAdminPanel`中的专门处理程序产生冲突。
2. **数据加载时机**：用户列表数据没有在面板初始化时自动加载，仅在手动点击选项卡后才加载。
3. **调试日志干扰**：添加的调试日志虽有助于问题诊断，但在生产环境中不必要。

#### 7.7.2 解决方案

1. **移除事件委托冲突**：
   - 修改了`initEventListeners`函数中对`.admin-tab`点击事件的处理，移除了可能导致冲突的代码，改为简单的`return`语句。
   - 确保只有`initAdminPanel`中的专门事件监听器处理选项卡切换。

   ```javascript
   // 管理员面板标签页切换
   if (event.target.matches('.admin-tab')) {
       // 完全移除这个事件委托处理，让initAdminPanel中的专门监听器来处理
       return; // 直接返回，不执行任何操作
   }
   ```

2. **增强初始化逻辑**：
   - 改进了`initAdminPanel`函数，确保在DOM加载后立即视觉上激活用户管理选项卡。
   - 添加了预加载机制，使用`setTimeout`异步加载用户列表数据，避免阻塞其他初始化过程。

   ```javascript
   // 预加载用户列表，确保在第一次打开面板时就能看到
   if (document.getElementById('users-table-body')) {
       // 在初始化过程中异步加载用户列表，避免阻塞其他初始化
       setTimeout(() => {
           this.loadUsersList();
       }, 0);
   }
   ```

3. **优化面板打开流程**：
   - 确保在打开面板时再次加载用户列表，保证数据为最新状态。
   - 同时精简了面板打开流程，移除了冗余的选项卡选择代码。

4. **清理调试日志**：
   - 从`loadUsersList`函数中移除了临时添加的所有调试日志，恢复代码的简洁性和可读性。

#### 7.7.3 效果

通过以上优化，管理员面板的用户体验得到显著改善：

- 用户打开管理员面板时，用户管理选项卡默认选中且内容自动加载，无需额外点击。
- 消除了日志污染，保持控制台整洁。
- 整体操作流程更加流畅，用户可以立即看到已加载的用户列表。

### 7.8 用户API密钥管理修复 (2023-07-20)

#### 7.8.1 问题描述

用户设置面板中的API密钥功能无法正常工作，控制台报错：

`header.js:1618 API Key container 'api-keys-settings-inputs' not found in modal.`

经调查，问题出现在两个关键函数中：
1. **`loadUserApiKeys`函数**：尝试查找不存在的DOM容器（`api-keys-settings-inputs`）
2. **`handleSaveApiKeys`函数**：尝试查询和保存不存在的DOM元素中的数据

原因是代码使用了旧版本的DOM结构假设，而当前HTML模板中已经有固定的输入字段ID，但代码却在试图动态生成这些字段。

#### 7.8.2 解决方案

1. **修改`loadUserApiKeys`函数**：
   - 改为使用正确的容器ID `api-keys-settings`
   - 创建应用ID到输入字段ID的映射表
   - 使用静态映射直接操作现有DOM元素，而非尝试动态生成

   ```javascript
   const APP_ID_TO_INPUT_ID_MAP = {
       'userStory': 'setting-userStory-key',
       'userManual': 'setting-userManual-key',
       'requirementsAnalysis': 'setting-requirementsAnalysis-key',
       'uxDesign': 'setting-uxDesign-key'
   };
   ```

2. **修改`handleSaveApiKeys`函数**：
   - 同样使用静态映射表直接访问每个输入字段
   - 逐个处理每个应用的API密钥输入
   - 保留现有的保存逻辑，但改变DOM元素定位方式

   ```javascript
   Object.entries(APP_ID_TO_INPUT_ID_MAP).forEach(([applicationID, inputId]) => {
       const input = document.getElementById(inputId);
       if (!input) return; // 如果输入字段不存在，跳过
       
       const apiKey = input.value.trim();
       const recordId = input.getAttribute('data-record-id');
       
       // 保存逻辑...
   });
   ```

#### 7.8.3 效果

通过这些修改，用户设置面板中的API密钥功能现在能够正常工作：
- 能正确加载现有API密钥到对应的输入字段
- 保存操作能正确收集用户输入的API密钥
- 避免了不必要的DOM操作和动态生成元素
- 使用现有HTML结构而非假设过时的结构

这些改进也符合整个应用程序逐步从旧的数据模型迁移到新的`UserApplicationApiKey`模型的大方向，保持了代码与UI的一致性。

#### 7.8.4 后续修复 (2023-07-21)

在实际测试中发现，虽然API密钥能正确显示，但保存操作会创建多个相同内容的记录，而不是更新现有记录。我们实施了以下修复：

1. **增加API密钥更新和删除功能**：
   - 在`storage.js`中添加`updateUserApiKey`函数，支持更新现有API密钥记录
   - 在`storage.js`中添加`deleteUserApiKey`函数，支持删除不再需要的API密钥记录
   - 这两个函数都包含版本冲突处理和重试机制

   ```javascript
   export async function updateUserApiKey(recordId, apiKey, version) {
       // 实现更新逻辑...
       // 包含版本冲突处理和重试
   }
   
   export async function deleteUserApiKey(recordId, version) {
       // 实现删除逻辑...
       // 包含版本冲突处理和重试
   }
   ```

2. **改进`handleSaveApiKeys`函数**：
   - 根据记录ID是否存在，判断应执行创建、更新还是删除操作
   - 当API密钥已存在时，调用`updateUserApiKey`而非尝试创建新记录
   - 当API密钥输入被清空时，删除该记录而非保留空值
   - 添加更详细的日志，便于调试和追踪操作结果

   ```javascript
   if (recordId && recordId !== 'null' && recordId !== '') {
       // 更新现有记录
       console.log(`Updating existing API key for application ${applicationID}`);
       const updatePromise = updateUserApiKey(recordId, apiKey)
           .then(result => {
               if(result) successCount++;
               else errors.push(`Failed to update key for App ID ${applicationID}`);
           });
       savePromises.push(updatePromise);
   } else {
       // 创建新记录
       // ...
   }
   ```

3. **修复导入问题**：
   - 确保`header.js`正确导入`updateUserApiKey`和`deleteUserApiKey`函数
   - 移除错误的导入假设（从`auth.js`导入不存在的函数）

通过以上改进，API密钥管理现在能完全正常工作，支持创建、更新和删除操作，避免了重复记录问题，提高了数据完整性。

#### 7.8.5 数据加载问题修复 (2023-07-22)

测试发现虽然数据能成功保存到数据库（DynamoDB）中，但无法正确加载显示。检查数据库显示每个应用ID存在多条相同内容的记录，但前端只显示空白。

1. **修复数据读取逻辑**：
   - 在`getCurrentUserApiKeys`函数中添加排序和去重逻辑
   - 确保每个应用ID只返回最新的一条记录

   ```javascript
   // 排序：最新的记录优先
   items.sort((a, b) => {
       const dateA = new Date(a.updatedAt);
       const dateB = new Date(b.updatedAt);
       return dateB - dateA;
   });
   
   // 去重：每个应用只保留最新的一条记录
   const appKeyMap = new Map();
   for (const item of items) {
       if (!appKeyMap.has(item.applicationID)) {
           appKeyMap.set(item.applicationID, item);
       }
   }
   
   // 转换回数组
   items = Array.from(appKeyMap.values());
   ```

2. **增强调试和日志**：
   - 在`loadUserApiKeys`、`loadCurrentUserApiKeysInternal`和`loadApplications`函数中添加详细的日志
   - 跟踪数据流，确保从服务器获取的数据正确传递到UI

   ```javascript
   console.log(`从服务器获取到 ${keys.length} 个API密钥记录:`, keys);
   console.log(`设置应用 ${appId} 的API密钥: ${currentKey ? '已设置' : '未设置'}`);
   ```

3. **优化前端显示逻辑**：
   - 确保即使有多条记录也能正确显示最新的API密钥值
   - 增强错误处理，防止因数据异常导致UI渲染失败

这些改进确保了API密钥管理功能的完整性，解决了数据存储和读取之间的不一致问题，提高了用户体验。系统现在能够正确保存、读取并显示用户的API密钥设置。 

### 7.9 管理员面板用户列表调试与优化 (2025-04-30)

#### 7.9.1 问题描述

管理员面板中的用户列表功能遇到了显示问题，打开用户管理选项卡时无法正确显示预期的用户数据。通过浏览器控制台没有明显错误，但用户列表未能正确加载。问题主要出现在权限验证和数据获取阶段，但由于缺乏足够的调试信息，难以确定具体原因。

#### 7.9.2 实施的调试改进

为了解决这个问题，我们对`loadUsersList`函数进行了全面增强，添加了详细的调试日志：

1. **用户对象结构详细记录**：
   ```javascript
   console.log("===> 当前用户对象键:", Object.keys(currentUser));
   ```

2. **安全版本的用户信息日志**：
   ```javascript
   const safeUserInfo = {
       username: currentUser.username,
       attributes: currentUser.attributes ? Object.keys(currentUser.attributes).reduce((obj, key) => {
           // 过滤掉敏感信息
           if (!['password', 'email_verified', 'phone_number_verified'].includes(key)) {
               obj[key] = currentUser.attributes[key];
           }
           return obj;
       }, {}) : "无属性",
       signInUserSession: {
           accessToken: {
               jwtToken: "已隐藏",
               payload: currentUser.signInUserSession?.accessToken?.payload || "无载荷"
           },
           // 其他会话信息...
       }
   };
   ```

3. **Cognito会话状态详细日志**：
   ```javascript
   const session = await Auth.currentSession();
   console.log("===> Cognito会话状态:", {
       isValid: session.isValid() || "无法确定",
       accessTokenExpiration: new Date(session.getAccessToken().getExpiration() * 1000).toLocaleString(),
       hasAccessToken: !!session.getAccessToken(),
       hasIdToken: !!session.getIdToken(),
       accessTokenScopes: session.getAccessToken().getJwtToken().split('.')[1] ? 
           JSON.parse(atob(session.getAccessToken().getJwtToken().split('.')[1])).scope || "无范围" : 
           "无法解析"
   });
   ```

4. **用户组权限检查详细日志**：
   ```javascript
   console.log("===> 开始执行checkAdminGroup函数");
   const session = await Auth.currentSession();
   console.log("===> 获取到会话对象，尝试获取访问令牌");
   const accessToken = session.getAccessToken();
   console.log("===> 获取到访问令牌，尝试获取payload");
   const payload = accessToken.payload;
   console.log("===> 访问令牌的payload:", payload);
   console.log("===> 检查cognito:groups属性:", payload['cognito:groups']);
   ```

5. **错误处理增强**：
   ```javascript
   console.error("错误详情:", JSON.stringify({
       message: error.message,
       stack: error.stack,
       name: error.name,
       code: error.code
   }));
   ```

#### 7.9.3 问题原因与修复

通过这些详细日志，我们确定了几个关键问题：

1. **权限验证不一致**：用户在数据库中被标记为`admin`角色，但在Cognito用户池中没有被添加到`Admin`组。
2. **用户设置数据获取逻辑**：当用户没有设置时错误处理不完整，导致显示中断。
3. **会话验证逻辑**：没有正确处理会话无效或过期的情况。

针对这些问题，我们实施了以下修复：

1. **增强权限验证**：
   ```javascript
   if (!userSettings) {
       console.error("===> 无法获取用户设置，使用默认角色 'user'");
   } else if (userSettings.role !== 'admin') {
       console.error(`===> 用户角色不是管理员，当前角色: ${userSettings.role}`);
       // 显示错误消息...
   } else {
       console.log(`===> 确认用户具有管理员角色: ${userSettings.role}`);
   }
   ```

2. **改进错误处理**：
   ```javascript
   try {
       // 获取用户设置...
   } catch (settingsError) {
       console.error("===> 获取用户设置时出错:", settingsError);
       console.log("===> 错误详情:", JSON.stringify({
           message: settingsError.message,
           name: settingsError.name
       }));
   }
   ```

3. **会话状态检查**：添加了对Cognito会话状态的详细检查和日志记录，帮助识别会话问题。

#### 7.9.4 结果与未来改进

通过这些调试增强和修复，我们成功解决了用户列表加载问题：

1. **提高了可观察性**：详细的日志使问题定位更加精确。
2. **改进了错误恢复**：即使某些步骤失败，也能继续处理并提供有用的反馈。
3. **权限检查更加健壮**：同时检查数据库角色和Cognito组权限，确保安全性。

未来改进计划：
- 实现管理员查看所有用户的功能，而不仅限于当前登录用户
- 优化权限模型，确保数据库角色和Cognito组权限保持一致
- 在生产环境中移除或精简详细调试日志，仅保留必要的错误处理日志 