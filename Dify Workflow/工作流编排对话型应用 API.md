# 工作流编排对话型应用 API 文档

## 基础信息

### **基础 URL**

```
http://localhost/v1
```

*注意：请将 `http://localhost/v1` 替换为您的 Dify 服务实际部署地址。*

### **鉴权**

所有 API 请求需在 `Authorization` HTTP Header 中包含 `API-Key`：

```http
Authorization: Bearer {API_KEY}
```

**注意**：强烈建议将 `API-Key` 存储在后端，避免泄露。

---

## 1. **发送对话消息 (触发 Workflow)**

### **POST** `/chat-messages`

**描述**：创建会话消息。如果该 Dify 应用后台是基于 Workflow 构建的，此接口调用会触发相应的 Workflow 执行。通过不同的 `response_mode` 控制响应方式。

### 请求参数

| 参数名               | 类型          | 必填 | 描述                                                                                                                                |
| -------------------- | ------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `query`              | string        | 是   | 用户输入/提问内容。通常作为 Workflow 的启动输入之一。                                                                                |
| `inputs`             | object        | 否   | 传入 Workflow 定义的其他变量值。如果 Workflow 定义了除 `query` 外的变量，需在此提供。默认为 `{}`。                               |
| `response_mode`      | string        | 是   | 响应模式：`streaming`（流式，推荐用于观察 Workflow 执行过程）或 `blocking`（阻塞，直接返回最终结果）。                               |
| `user`               | string        | 是   | 用户标识，需保证唯一，用于识别发起请求的用户和统计。                                                                                |
| `conversation_id`    | string        | 否   | 会话 ID。如果 Workflow 需要访问对话历史或维护会话状态，必须传入之前的 `conversation_id`。                                             |
| `files`              | array[object] | 否   | 上传的文件列表，用于 Workflow 中需要文件输入的节点。结构参考[文件参数说明](#文件参数说明)。                                         |
| `auto_generate_name` | bool          | 否   | （选填）是否自动为新会话生成标题，默认 `true`。                                                                                       |

#### 文件参数说明 (`files` 数组中的对象)

| 字段名            | 类型   | 描述                                                                                             |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `type`            | string | 文件类型，例如：`image`, `document` (支持 TXT, MD, PDF, DOCX 等), `audio`, `video`, `custom`。 |
| `transfer_method` | string | 文件传递方式：`remote_url`（文件地址）或 `local_file`（已上传文件）。                              |
| `url`             | string | 文件地址，仅当 `transfer_method` 为 `remote_url` 时必填。                                          |
| `upload_file_id`  | string | 已上传文件的 ID，仅当 `transfer_method` 为 `local_file` 时必填。详情见[文件上传](#2-文件上传-复用)。    |

### 示例请求 (Streaming 模式)

```bash
curl -X POST 'http://localhost/v1/chat-messages' \\
--header 'Authorization: Bearer YOUR_API_KEY' \\
--header 'Content-Type: application/json' \\
--data-raw '{
    "inputs": {
        "workflow_var_1": "some_value" 
    },
    "query": "Execute the workflow with this query.",
    "response_mode": "streaming", 
    "user": "user-789",
    "conversation_id": "conv-ghi-123"
}'
```

---

### 响应内容

#### 1. 流式模式 (`streaming`)

返回 Server-Sent Events (SSE) 流，`Content-Type: text/event-stream`。每个事件块以 `data:` 开头，以 `\n\n` 分隔。
**此模式下可以观察到 Workflow 的详细执行步骤。**

**主要事件类型:**

*   `message`: LLM 生成的文本块（如果 Workflow 包含 LLM 输出）。
    *   `task_id` (string): 任务 ID。
    *   `message_id` (string): 消息 ID。
    *   `conversation_id` (string): 会话 ID。
    *   `answer` (string): 文本块内容。
    *   `created_at` (int): 时间戳。
*   `message_end`: 整个消息响应结束。
    *   `task_id` (string): 任务 ID。
    *   `message_id` (string): 消息 ID。
    *   `conversation_id` (string): 会话 ID。
    *   `metadata` (object): 包含 `usage` (用量) 和 `retriever_resources` (引用) 等元数据。
*   **`workflow_started`**: Workflow 开始执行。
    *   `task_id` (string): 任务 ID。
    *   `workflow_run_id` (string): Workflow 执行 ID。
    *   `data` (object): 包含 `id` (同 workflow_run_id), `workflow_id`, `sequence_number`, `created_at` 等。
*   **`node_started`**: Workflow 中的某个节点开始执行。
    *   `task_id` (string): 任务 ID。
    *   `workflow_run_id` (string): Workflow 执行 ID。
    *   `data` (object): 包含 `id` (节点执行 ID), `node_id`, `node_type`, `title`, `index`, `inputs`, `created_at` 等。
*   **`node_finished`**: 某个节点执行结束。
    *   `task_id` (string): 任务 ID。
    *   `workflow_run_id` (string): Workflow 执行 ID。
    *   `data` (object): 包含 `id` (节点执行 ID), `node_id`, `index`, `inputs`, `outputs` (节点输出), `status` (`succeeded`/`failed`), `error`, `elapsed_time`, `execution_metadata` (如 token 用量), `created_at` 等。
*   **`workflow_finished`**: 整个 Workflow 执行结束。
    *   `task_id` (string): 任务 ID。
    *   `workflow_run_id` (string): Workflow 执行 ID。
    *   `data` (object): 包含 `id` (同 workflow_run_id), `workflow_id`, `status` (`succeeded`/`failed`), `outputs` (最终输出), `error`, `elapsed_time`, `total_tokens`, `total_steps`, `created_at`, `finished_at` 等。
*   `error`: 流处理过程中发生错误。
    *   `task_id` (string): 任务 ID。
    *   `status` (int): HTTP 状态码。
    *   `code` (string): 错误码。
    *   `message` (string): 错误消息。
*   `ping`: (约每 10 秒) 用于保持连接。

**示例响应 (Streaming 模式)**: 
*具体事件顺序和内容取决于 Workflow 设计*

```streaming
data: {"event": "workflow_started", "task_id": "task-abc", "workflow_run_id": "run-123", "data": {"id": "run-123", ...}}

data: {"event": "node_started", "task_id": "task-abc", "workflow_run_id": "run-123", "data": {"id": "node-exec-1", "node_id": "start_node", ...}}

data: {"event": "node_finished", "task_id": "task-abc", "workflow_run_id": "run-123", "data": {"id": "node-exec-1", "status": "succeeded", ...}}

data: {"event": "node_started", "task_id": "task-abc", "workflow_run_id": "run-123", "data": {"id": "node-exec-2", "node_id": "llm_node", ...}}

data: {"event": "message", "task_id": "task-abc", "message_id": "msg-def", "answer": "Workflow output part 1...", ...}

data: {"event": "message", "task_id": "task-abc", "message_id": "msg-def", "answer": "Workflow output part 2.", ...}

data: {"event": "node_finished", "task_id": "task-abc", "workflow_run_id": "run-123", "data": {"id": "node-exec-2", "status": "succeeded", "outputs": {"text": "..."}, ...}}

data: {"event": "workflow_finished", "task_id": "task-abc", "workflow_run_id": "run-123", "data": {"id": "run-123", "status": "succeeded", "outputs": {"text": "..."}, ...}}

data: {"event": "message_end", "task_id": "task-abc", "message_id": "msg-def", "metadata": {"usage": {...}}}

```

#### 2. 阻塞模式 (`blocking`)

返回完整的最终结果，`Content-Type: application/json`。
**此模式下不包含 Workflow 的中间步骤信息，只返回最终的对话应答（如果 Workflow 设计为生成应答）。**

**响应结构:**

| 参数名            | 类型          | 描述                                                       |
| ----------------- | ------------- | ---------------------------------------------------------- |
| `event`           | string        | 事件类型，固定为 `message`。                               |
| `task_id`         | string        | 任务 ID。                                                  |
| `id`              | string        | 唯一 ID (同 message_id)。                                  |
| `message_id`      | string        | 消息唯一 ID。                                              |
| `conversation_id` | string        | 会话 ID。                                                  |
| `mode`            | string        | App 模式，固定为 `chat`。                                  |
| `answer`          | string        | Workflow 执行后的最终回复内容（如果 Workflow 有文本输出）。 |
| `metadata`        | object        | 包含 `usage` (用量) 和 `retriever_resources` (引用) 等元数据。 |
| `created_at`      | int           | 消息创建时间戳。                                           |

**示例响应 (Blocking 模式)**:

```json
{
    "event": "message",
    "task_id": "task-xyz", 
    "id": "msg-12345",
    "message_id": "msg-12345",
    "conversation_id": "conv-lmn-456",
    "mode": "chat",
    "answer": "This is the final result generated by the workflow.",
    "metadata": {
        "usage": {
            "total_tokens": 1250,
            "total_price": "0.0015000",
            "currency": "USD",
            "latency": 8.5
        },
        "retriever_resources": []
    },
    "created_at": 1711902000
}

```

---

### 错误响应

除了标准的 HTTP 状态码（如 400, 401, 404, 500）外，Dify 可能在响应体中返回具体的错误信息。流式模式下错误也可能以 `error` 事件形式出现。

| 状态码 | 错误码 (示例)                | 描述                       |
| ------ | ----------------------------- | -------------------------- |
| 400    | `invalid_param`               | 请求参数无效。             |
| 400    | `app_unavailable`             | 应用配置不可用。           |
| 400    | `provider_not_initialize`     | 无可用模型凭据。           |
| 400    | `provider_quota_exceeded`     | 模型调用额度不足。         |
| 400    | `completion_request_error`    | 文本生成失败（或 Workflow 失败）。 |
| 404    | `conversation_not_found`      | 对话不存在。               |
| 500    | `internal_server_error`       | 服务器内部错误。           |

**通用错误响应格式示例 (Blocking)**：

```json
{
  "code": "invalid_parameter",
  "message": "Missing required input variable 'workflow_var_1'.",
  "status": 400
}
```

---

## 2. **文件上传** (复用)

如果 Workflow 需要处理文件，需要先通过文件上传接口将文件上传到 Dify，获取 `upload_file_id`，然后在调用 `/chat-messages` 时通过 `files` 参数传入。

文件上传接口为 `POST /files/upload`，请参考 [Workflow 应用 API 文档](Workflow%20应用%20API.md#5-文件上传) 或 [对话型应用 API 文档](对话型应用%20API.md#2-上传文件) 中的详细说明。

---

## 3. **停止响应** (仅限 Streaming 模式)

### **POST** `/chat-messages/:task_id/stop`

**描述**：停止正在进行的流式响应。

**路径参数:**

*   `task_id` (string): 要停止的任务 ID，从流式响应的事件中获取。

**请求体参数:**

*   `user` (string): 用户标识，必须与发起 `/chat-messages` 请求时的 `user` 一致。

**响应:**

```json
{
  "result": "success"
}
```

---

## 4. **获取对话变量**

### **GET** `/conversations/:conversation_id/variables`

**描述**：从指定的对话中检索由 Workflow 或对话过程产生的变量。此端点对于提取对话过程中捕获的结构化数据非常有用。

**路径参数:**

| 参数名            | 类型   | 描述                  |
| ----------------- | ------ | --------------------- |
| `conversation_id` | string | 要从中检索变量的对话 ID。 |

**查询参数:**

| 参数名   | 类型   | 描述                                                               |
| -------- | ------ | ------------------------------------------------------------------ |
| `user`   | string | 用户标识符，必须与创建对话时使用的 `user` 一致。                   |
| `last_id`| string | (选填) 当前页最后一条变量记录的 ID，用于分页。默认 `null`。            |
| `limit`  | int    | (选填) 一次请求返回多少条记录，默认 20，最大 100，最小 1。           |

**响应内容:**

| 参数名     | 类型          | 描述                                         |
| ---------- | ------------- | -------------------------------------------- |
| `limit`    | int           | 每页返回的条目数。                           |
| `has_more` | bool          | 是否还有更多数据可供获取。                     |
| `data`     | array[object] | 变量列表，每个对象包含以下字段：               |
| `id`       | string        | 变量的唯一 ID。                              |
| `name`     | string        | 变量的名称。                                 |
| `value_type`| string        | 变量的数据类型 (例如: `string`, `number`, `json`)。 |
| `value`    | any           | 变量的实际值。                               |
| `description`| string        | (可选) 变量的描述信息。                       |
| `created_at`| int           | 变量创建时的时间戳。                         |
| `updated_at`| int           | 变量最后更新时的时间戳。                     |

**错误响应:**

| 状态码 | 错误码 (示例)            | 描述         |
| ------ | ------------------------ | ------------ |
| 404    | `conversation_not_exists`| 对话不存在。 |

**示例请求:**

```bash
curl -X GET 'http://localhost/v1/conversations/conv-lmn-456/variables?user=user-789' \
--header 'Authorization: Bearer YOUR_API_KEY'
```

**示例请求 (带变量名过滤 - *注意：原始文档中此过滤方式可能为前端处理逻辑，API本身是否支持待验证*)**:

```bash
# 注意：查询参数 'variable_name' 是否为后端支持需要验证
curl -X GET 'http://localhost/v1/conversations/conv-lmn-456/variables?user=user-789&variable_name=customer_name' \
--header 'Authorization: Bearer YOUR_API_KEY'
```

**示例响应:**

```json
{
  "limit": 20,
  "has_more": false,
  "data": [
    {
      "id": "variable-uuid-1",
      "name": "customer_name",
      "value_type": "string",
      "value": "John Doe",
      "description": "客户名称（从对话中提取）",
      "created_at": 1650000000,
      "updated_at": 1650000000
    },
    {
      "id": "variable-uuid-2",
      "name": "order_details",
      "value_type": "json",
      "value": {"product":"Widget","quantity":5,"price":19.99},
      "description": "客户的订单详情",
      "created_at": 1650000000,
      "updated_at": 1650000000
    }
  ]
}
```

*注意：此文档侧重于通过 `/chat-messages`

---

## 5. **消息反馈**

### **POST** `/messages/:message_id/feedbacks`

**描述**：对指定的消息进行反馈（点赞、点踩、撤销）。

**路径参数:**

| 参数名       | 类型   | 描述    |
| ------------ | ------ | ------- |
| `message_id` | string | 消息 ID |

**请求体参数:**

| 参数名    | 类型   | 必填 | 描述                                     |
| --------- | ------ | ---- | ---------------------------------------- |
| `rating`  | string | 是   | 点赞 `like`，点踩 `dislike`，撤销 `null` |
| `user`    | string | 是   | 用户标识，需与创建消息时一致。           |
| `content` | string | 否   | (可选) 反馈的具体信息。                  |

**响应:**

```json
{
  "result": "success"
}
```

**示例请求:**

```bash
curl -X POST 'http://localhost/v1/messages/msg-12345/feedbacks' \
--header 'Authorization: Bearer YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
    "rating": "like",
    "user": "user-789",
    "content": "This answer was very helpful!"
}'
```

---

## 6. **获取建议问题列表**

### **GET** `/messages/{message_id}/suggested`

**描述**：获取指定消息后的下一轮建议问题列表（如果应用配置了此功能）。

**路径参数:**

| 参数名       | 类型   | 描述    |
| ------------ | ------ | ------- |
| `message_id` | string | 消息 ID |

**查询参数:**

| 参数名 | 类型   | 描述                         |
| ------ | ------ | ---------------------------- |
| `user` | string | 用户标识，需与创建消息时一致。 |

**响应:**

```json
{
  "result": "success",
  "data": [
    "Tell me more about topic A.",
    "What is related to topic B?",
    "Explain topic C further."
  ]
}
```

**示例请求:**

```bash
curl -X GET 'http://localhost/v1/messages/msg-12345/suggested?user=user-789' \
--header 'Authorization: Bearer YOUR_API_KEY'
```

---

## 7. **获取会话历史消息**

### **GET** `/messages`

**描述**：滚动加载形式返回指定会话的历史聊天记录，默认返回最新 20 条。

**查询参数:**

| 参数名            | 类型   | 必填 | 描述                                                       |
| ----------------- | ------ | ---- | ---------------------------------------------------------- |
| `conversation_id` | string | 是   | 要查询的会话 ID。                                          |
| `user`            | string | 是   | 用户标识，需与创建会话时一致。                             |
| `first_id`        | string | 否   | (用于分页) 当前页第一条消息的 ID。用于获取更早的消息。默认 `null`。 |
| `limit`           | int    | 否   | 一次请求返回多少条记录，默认 20，最大 100。                  |

**响应内容:**

| 参数名     | 类型          | 描述                                                         |
| ---------- | ------------- | ------------------------------------------------------------ |
| `limit`    | int           | 本次返回的条数。                                             |
| `has_more` | bool          | 是否还有更早的消息可以获取。                                   |
| `data`     | array[object] | 消息列表，每个对象包含消息详情：                             |
| `id`       | string        | 消息 ID。                                                    |
| `conversation_id`| string        | 所属会话 ID。                                                |
| `inputs`   | object        | 发送该消息时的 `inputs` 参数 (如果 /chat-messages 调用时传入)。 |
| `query`    | string        | 用户发送的消息内容（用户轮）。                               |
| `answer`   | string        | AI 回复的消息内容（助手轮）。                                 |
| `message_files`| array[object] | 消息中包含的文件列表（结构同文件参数说明）。                   |
| `feedback` | object        | 消息的反馈信息 (`rating`, `content`)，如果用户反馈过。         |
| `retriever_resources`| array[object]| (助手轮) 引用和归属分段列表。                              |
| `created_at`| int           | 消息创建时间戳。                                             |

**示例请求:**

```bash
curl -X GET 'http://localhost/v1/messages?user=user-789&conversation_id=conv-ghi-123&limit=10' \
--header 'Authorization: Bearer YOUR_API_KEY'
```

**示例响应:**

```json
{
  "limit": 10,
  "has_more": true,
  "data": [
    {
      "id": "msg-abc-789",
      "conversation_id": "conv-ghi-123",
      "inputs": {},
      "query": "What was the previous topic?",
      "answer": "We were discussing topic B.",
      "message_files": [],
      "feedback": null,
      "retriever_resources": [],
      "created_at": 1711902500
    },
    {
      "id": "msg-def-456",
      "conversation_id": "conv-ghi-123",
       "inputs": {},
      "query": "Tell me about topic B.",
      "answer": "Topic B is about...",
      "message_files": [],
      "feedback": {"rating": "like", "content": "Good explanation"},
      "retriever_resources": [],
      "created_at": 1711902400
    }
    // ... more messages
  ]
}
```

---

## 8. **获取会话列表**

### **GET** `/conversations`

**描述**：获取指定用户的会话列表，默认按更新时间倒序返回最近 20 条。

**查询参数:**

| 参数名    | 类型   | 必填 | 描述                                                                       |
| --------- | ------ | ---- | -------------------------------------------------------------------------- |
| `user`    | string | 是   | 要查询的用户标识。                                                           |
| `last_id` | string | 否   | (用于分页) 当前页最后一条会话记录的 ID。用于获取更早的会话。默认 `null`。    |
| `limit`   | int    | 否   | 一次请求返回多少条记录，默认 20，最大 100。                                  |
| `sort_by` | string | 否   | 排序字段和方式，可选值：`created_at`, `-created_at`, `updated_at`, `-updated_at` (默认)。 |

**响应内容:**

| 参数名     | 类型          | 描述                                       |
| ---------- | ------------- | ------------------------------------------ |
| `limit`    | int           | 本次返回的条数。                             |
| `has_more` | bool          | 是否还有更早的会话可以获取。                 |
| `data`     | array[object] | 会话列表，每个对象包含会话基本信息：       |
| `id`       | string        | 会话 ID。                                  |
| `name`     | string        | 会话名称 (可能由 AI 自动生成或用户重命名)。 |
| `inputs`   | object        | 创建会话时可能传入的初始 `inputs` 参数。   |
| `status`   | string        | 会话状态 (例如: `normal`)。                |
| `introduction` | string    | (可选) 会话的开场白。                      |
| `created_at`| int           | 会话创建时间戳。                           |
| `updated_at`| int           | 会话最后更新时间戳。                       |

**示例请求:**

```bash
curl -X GET 'http://localhost/v1/conversations?user=user-789&limit=5' \
--header 'Authorization: Bearer YOUR_API_KEY'
```

**示例响应:**

```json
{
  "limit": 5,
  "has_more": true,
  "data": [
    {
      "id": "conv-jkl-012",
      "name": "Workflow Discussion",
      "inputs": {},
      "status": "normal",
      "introduction": "Hello! How can I help with your workflow?",
      "created_at": 1711903000,
      "updated_at": 1711903500
    },
    {
      "id": "conv-ghi-123",
      "name": "Topic B Details",
      "inputs": {},
      "status": "normal",
      "introduction": "",
      "created_at": 1711902300,
      "updated_at": 1711902550
    }
    // ... more conversations
  ]
}
```

---

## 9. **删除会话**

### **DELETE** `/conversations/:conversation_id`

**描述**：删除指定的会话及其所有消息。

**路径参数:**

| 参数名            | 类型   | 描述      |
| ----------------- | ------ | --------- |
| `conversation_id` | string | 要删除的会话 ID。 |

**请求体参数:**

| 参数名 | 类型   | 必填 | 描述                         |
| ------ | ------ | ---- | ---------------------------- |
| `user` | string | 是   | 用户标识，需与创建会话时一致。 |

**响应:**

```json
{
  "result": "success"
}
```

**示例请求:**

```bash
curl -X DELETE 'http://localhost/v1/conversations/conv-jkl-012' \
--header 'Authorization: Bearer YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
  "user": "user-789"
}'
```

---

## 10. **会话重命名**

### **POST** `/conversations/:conversation_id/name`

**描述**：对指定的会话进行重命名。

**路径参数:**

| 参数名            | 类型   | 描述      |
| ----------------- | ------ | --------- |
| `conversation_id` | string | 要重命名的会话 ID。 |

**请求体参数:**

| 参数名          | 类型   | 必填 | 描述                                                                 |
| --------------- | ------ | ---- | -------------------------------------------------------------------- |
| `name`          | string | 否   | 新的会话名称。如果 `auto_generate` 为 `true`，此参数可不传。           |
| `auto_generate` | bool   | 否   | 是否自动生成标题（基于会话内容）。默认为 `false`。                   |
| `user`          | string | 是   | 用户标识，需与创建会话时一致。                                       |

**响应:** (返回更新后的会话信息)

| 参数名         | 类型   | 描述         |
| -------------- | ------ | ------------ |
| `id`           | string | 会话 ID      |
| `name`         | string | 新的会话名称 |
| `inputs`       | object | 输入参数     |
| `status`       | string | 会话状态     |
| `introduction` | string | 开场白       |
| `created_at`   | int    | 创建时间戳   |
| `updated_at`   | int    | 更新时间戳   |

**示例请求 (自动生成):**

```bash
curl -X POST 'http://localhost/v1/conversations/conv-ghi-123/name' \
--header 'Authorization: Bearer YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
  "auto_generate": true,
  "user": "user-789"
}'
```

**示例响应 (自动生成后):**

```json
{
  "id": "conv-ghi-123",
  "name": "Discussion about Topic B",
  "inputs": {},
  "status": "normal",
  "introduction": "",
  "created_at": 1711902300,
  "updated_at": 1711904000
}
```

---

## 11. **语音转文字**

### **POST** `/audio-to-text`

**描述**：将语音文件转换为文字。

**请求体参数 (`multipart/form-data`):**

| 参数名 | 类型   | 必填 | 描述                                                                                     |
| ------ | ------ | ---- | ---------------------------------------------------------------------------------------- |
| `file` | file   | 是   | 语音文件。支持格式：`mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, `webm`。大小限制见系统参数。 |
| `user` | string | 是   | 用户标识。                                                                               |

**响应:**

```json
{
  "text": "Converted text from audio."
}
```

**示例请求:**

```bash
curl -X POST 'http://localhost/v1/audio-to-text' \
--header 'Authorization: Bearer YOUR_API_KEY' \
--form 'file=@"path/to/your/audio.mp3";type=audio/mpeg' \
--form 'user=user-789'
```

---

## 12. **文字转语音**

### **POST** `/text-to-audio`

**描述**：将文字内容转换为语音文件。

**请求体参数 (`application/json`):**

| 参数名       | 类型   | 必填 | 描述                                                                      |
| ------------ | ------ | ---- | ------------------------------------------------------------------------- |
| `message_id` | string | 否   | (优先) Dify 生成的文本消息 ID。如果提供，将使用该消息的 `answer` 生成语音。 |
| `text`       | string | 否   | 要转换为语音的文本内容。如果未提供 `message_id`，则必须提供此项。           |
| `user`       | string | 是   | 用户标识。                                                                  |

**响应:**

*   **响应头:** `Content-Type: audio/wav` (或其他配置的音频格式)
*   **响应体:** 音频文件的二进制数据。

**示例请求:**

```bash
# 将响应保存为 audio.wav 文件
curl -o audio.wav -X POST 'http://localhost/v1/text-to-audio' \
--header 'Authorization: Bearer YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
    "text": "Hello, this is a test.",
    "user": "user-789"
}'
```

---

## 13. **获取应用基本信息**

### **GET** `/info`

**描述**：获取应用的基本信息，如名称、描述、标签等。

**响应内容:**

| 参数名        | 类型          | 描述         |
| ------------- | ------------- | ------------ |
| `name`        | string        | 应用名称。   |
| `description` | string        | 应用描述。   |
| `tags`        | array[string] | 应用标签列表。 |

**示例请求:**

```bash
curl -X GET 'http://localhost/v1/info' \
--header 'Authorization: Bearer YOUR_API_KEY'
```

**示例响应:**

```json
{
  "name": "My Workflow App",
  "description": "An application demonstrating workflow integration.",
  "tags": [
    "workflow",
    "demo"
  ]
}
```

---

## 14. **获取应用参数**

### **GET** `/parameters`

**描述**：获取应用的配置参数，如开场白、用户输入表单、文件上传设置、系统限制等。

**响应内容:** (结构较复杂，具体字段取决于应用配置)

*   `opening_statement` (string): 开场白。
*   `suggested_questions` (array[string]): 开场建议问题。
*   `suggested_questions_after_answer` (object): 回答后建议问题的配置 (`enabled`)。
*   `speech_to_text` (object): 语音转文本配置 (`enabled`)。
*   `retriever_resource` (object): 引用和归属配置 (`enabled`)。
*   `annotation_reply` (object): 标记回复配置 (`enabled`)。
*   `user_input_form` (array[object]): 用户输入表单配置 (包含 `text-input`, `paragraph`, `select` 等控件定义)。
    *   `label` (string): 控件标签。
    *   `variable` (string): 对应变量名。
    *   `required` (bool): 是否必填。
    *   `default` (string): 默认值。
    *   `options` (array[string]): (下拉框) 选项。
*   `file_upload` (object): 文件上传配置 (按类型如 `image`, `document` 分组)。
    *   `enabled` (bool): 是否启用该类型文件上传。
    *   `number_limits` (int): 数量限制。
    *   `transfer_methods` (array[string]): 支持的传递方式 (`remote_url`, `local_file`)。
*   `system_parameters` (object): 系统参数。
    *   `file_size_limit` (int): 文档大小限制 (MB)。
    *   `image_file_size_limit` (int): 图片大小限制 (MB)。
    *   `audio_file_size_limit` (int): 音频大小限制 (MB)。
    *   `video_file_size_limit` (int): 视频大小限制 (MB)。

**示例请求:**

```bash
curl -X GET 'http://localhost/v1/parameters' \
--header 'Authorization: Bearer YOUR_API_KEY'
```

**示例响应 (部分):**

```json
{
  "opening_statement": "Welcome! What can I help you process today?",
  "user_input_form": [
    {
      "text-input": {
        "label": "Your Name",
        "variable": "user_name",
        "required": false,
        "max_length": 50,
        "default": ""
      }
    }
  ],
  "file_upload": {
    "image": {
      "enabled": true,
      "number_limits": 1,
      "transfer_methods": ["local_file"]
    }
  },
  "system_parameters": {
      "image_file_size_limit": 10
      // ... other limits
  }
}
```

---

## 15. **获取应用 Meta 信息**

### **GET** `/meta`

**描述**：获取应用的元信息，通常包含应用中使用的工具图标等。

**响应内容:**

*   `tool_icons` (object): 工具图标信息的键值对。
    *   `[tool_name]` (string | object): 工具名称作为键。
        *   值可能是图标的 URL (string)。
        *   值也可能是包含 `background` (背景色) 和 `content` (emoji 或字符) 的对象 (object)。

**示例请求:**

```bash
curl -X GET 'http://localhost/v1/meta' \
--header 'Authorization: Bearer YOUR_API_KEY'
```

**示例响应:**

```json
{
  "tool_icons": {
      "dalle3": "https://example.com/icons/dalle3.png",
      "internal_tool": {
          "background": "#ABCDEF",
          "content": "⚙️"
      }
  }
}
```

---

## 16. **获取标注列表**

### **GET** `/apps/annotations`

**描述**：获取应用中已创建的标注（问答对）。用于管理和审查标注数据。

**查询参数:**

| 参数名 | 类型   | 描述                 |
| ------ | ------ | -------------------- |
| `page` | int    | 页码，从 1 开始。    |
| `limit`| int    | 每页返回的数量，默认 20。 |

**响应内容:**

| 参数名     | 类型          | 描述                           |
| ---------- | ------------- | ------------------------------ |
| `limit`    | int           | 每页数量。                     |
| `page`     | int           | 当前页码。                     |
| `total`    | int           | 总标注数量。                   |
| `has_more` | bool          | 是否还有下一页。               |
| `data`     | array[object] | 标注列表，每个对象包含：       |
| `id`       | string        | 标注 ID。                      |
| `question` | string        | 标注的问题。                   |
| `answer`   | string        | 标注的答案。                   |
| `hit_count`| int           | (可能) 命中次数。              |
| `created_at`| int           | 创建时间戳。                   |

**示例请求:**

```bash
curl -X GET 'http://localhost/v1/apps/annotations?page=1&limit=10' \
--header 'Authorization: Bearer YOUR_API_KEY'
```

**示例响应:**

```json
{
  "data": [
    {
      "id": "anno-abc-123",
      "question": "How to reset password?",
      "answer": "Go to Settings > Account > Reset Password.",
      "hit_count": 5,
      "created_at": 1711905000
    }
    // ... more annotations
  ],
  "has_more": true,
  "limit": 10,
  "total": 55,
  "page": 1
}
```

---

## 17. **创建标注**

### **POST** `/apps/annotations`

**描述**：在应用中创建一个新的标注（问答对）。

**请求体参数 (`application/json`):**

| 参数名     | 类型   | 必填 | 描述       |
| ---------- | ------ | ---- | ---------- |
| `question` | string | 是   | 标注的问题。 |
| `answer`   | string | 是   | 标注的答案。 |

**响应:** (返回创建的标注信息)

| 参数名     | 类型   | 描述         |
| ---------- | ------ | ------------ |
| `id`       | string | 新标注的 ID。 |
| `question` | string | 问题。       |
| `answer`   | string | 答案。       |
| `hit_count`| int    | 命中次数 (初始为 0)。 |
| `created_at`| int    | 创建时间戳。 |

**示例请求:**

```bash
curl -X POST 'http://localhost/v1/apps/annotations' \
--header 'Authorization: Bearer YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
  "question": "What are the support hours?",
  "answer": "Support is available 9 AM to 5 PM on weekdays."
}'
```

**示例响应:**

```json
{
  "id": "anno-def-456",
  "question": "What are the support hours?",
  "answer": "Support is available 9 AM to 5 PM on weekdays.",
  "hit_count": 0,
  "created_at": 1711905500
}
```

---

## 18. **更新标注**

### **PUT** `/apps/annotations/{annotation_id}`

**描述**：更新应用中指定 ID 的标注。

**路径参数:**

| 参数名        | 类型   | 描述        |
| ------------- | ------ | ----------- |
| `annotation_id` | string | 要更新的标注 ID。 |

**请求体参数 (`application/json`):**

| 参数名     | 类型   | 必填 | 描述           |
| ---------- | ------ | ---- | -------------- |
| `question` | string | 是   | 更新后的问题。 |
| `answer`   | string | 是   | 更新后的答案。 |

**响应:** (返回更新后的标注信息，结构同创建标注)

**示例请求:**

```bash
curl -X PUT 'http://localhost/v1/apps/annotations/anno-def-456' \
--header 'Authorization: Bearer YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
  "question": "What are the weekend support hours?",
  "answer": "Weekend support is currently not available."
}'
```

---

## 19. **删除标注**

### **DELETE** `/apps/annotations/{annotation_id}`

**描述**：删除应用中指定 ID 的标注。

**路径参数:**

| 参数名        | 类型   | 描述        |
| ------------- | ------ | ----------- |
| `annotation_id` | string | 要删除的标注 ID。 |

**响应:**

```json
{
  "result": "success"
}
```

**示例请求:**

```bash
curl -X DELETE 'http://localhost/v1/apps/annotations/anno-def-456' \
--header 'Authorization: Bearer YOUR_API_KEY'
```

---

## 20. **标注回复初始设置**

### **POST** `/apps/annotation-reply/{action}`

**描述**：启用或禁用基于标注的自动回复功能，并进行相关设置（如嵌入模型、相似度阈值）。这是一个**异步**操作。

**路径参数:**

| 参数名 | 类型   | 描述                             |
| ------ | ------ | -------------------------------- |
| `action` | string | 动作，必须是 `enable` 或 `disable`。 |

**请求体参数 (`application/json`):** (仅在 `action` 为 `enable` 时需要)

| 参数名                    | 类型   | 必填 | 描述                                                                 |
| ------------------------- | ------ | ---- | -------------------------------------------------------------------- |
| `embedding_provider_name` | string | 是   | 用于相似度计算的嵌入模型提供商名称 (需在 Dify 系统中配置好)。         |
| `embedding_model_name`    | string | 是   | 指定的嵌入模型名称。                                                   |
| `score_threshold`         | number | 是   | 相似度阈值 (0 到 1 之间)。只有当用户问题与标注问题的相似度大于此值时才自动回复。 |

**响应:** (异步任务信息)

| 参数名     | 类型   | 描述                           |
| ---------- | ------ | ------------------------------ |
| `job_id`   | string | 异步任务的 ID。                 |
| `job_status` | string | 任务状态 (通常初始为 `waiting`)。 |

**示例请求 (启用):**

```bash
curl -X POST 'http://localhost/v1/apps/annotation-reply/enable' \
--header 'Authorization: Bearer YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
  "score_threshold": 0.85,
  "embedding_provider_name": "openai",
  "embedding_model_name": "text-embedding-ada-002"
}'
```

**示例响应:**

```json
{
  "job_id": "job-xyz-789",
  "job_status": "waiting"
}
```

---

## 21. **查询标注回复设置任务状态**

### **GET** `/apps/annotation-reply/{action}/status/{job_id}`

**描述**：查询标注回复设置异步任务的执行状态。

**路径参数:**

| 参数名 | 类型   | 描述                                       |
| ------ | ------ | ------------------------------------------ |
| `action` | string | 必须与触发任务时的 `action` (`enable`/`disable`) 一致。 |
| `job_id` | string | 要查询状态的任务 ID。                      |

**响应:**

| 参数名     | 类型   | 描述                                 |
| ---------- | ------ | ------------------------------------ |
| `job_id`   | string | 任务 ID。                            |
| `job_status` | string | 任务状态 (`waiting`, `processing`, `succeeded`, `failed`)。 |
| `error_msg`| string | 如果任务失败，包含错误信息。         |

**示例请求:**

```bash
curl -X GET 'http://localhost/v1/apps/annotation-reply/enable/status/job-xyz-789' \
--header 'Authorization: Bearer YOUR_API_KEY'
```

**示例响应 (成功):**

```json
{
  "job_id": "job-xyz-789",
  "job_status": "succeeded",
  "error_msg": ""
}
```