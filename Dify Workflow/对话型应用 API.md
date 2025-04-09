# 对话型应用 API 文档

## 基础信息

### **基础 URL**

```
http://localhost/v1
```

### **鉴权**

所有 API 请求需在 `Authorization` HTTP Header 中包含 `API-Key`：

```http
Authorization: Bearer {API_KEY}
```

**注意**：强烈建议将 `API-Key` 存储在后端，避免泄露。

---

## 1. **发送对话消息**

### **POST** `/chat-messages`

**描述**：创建会话消息，支持会话持久化，可将之前的聊天记录作为上下文进行回答。

### 请求参数

| 参数名               | 类型          | 必填 | 描述                                                                    |
| -------------------- | ------------- | ---- | ----------------------------------------------------------------------- |
| `query`              | string        | 是   | 用户输入/提问内容                                                       |
| `inputs`             | object        | 否   | 自定义变量值，默认为 `{}`                                               |
| `response_mode`      | string        | 是   | 响应模式：`streaming`（流式，推荐）或 `blocking`（阻塞）                |
| `user`               | string        | 是   | 用户标识，需唯一，用于检索和统计                                        |
| `conversation_id`    | string        | 否   | 会话 ID，若需基于之前的聊天记录继续对话，需传入之前的 `conversation_id` |
| `files`              | array[object] | 否   | 上传的文件，支持图片类型 `image`                                        |
| `auto_generate_name` | bool          | 否   | 是否自动生成标题，默认 `true`                                           |

**文件字段说明**：

| 字段名            | 类型   | 描述                                                              |
| ----------------- | ------ | ----------------------------------------------------------------- |
| `type`            | string | 文件类型，目前仅支持 `image`                                      |
| `transfer_method` | string | 文件传递方式：`remote_url`（图片地址）或 `local_file`（上传文件） |
| `url`             | string | 图片地址，仅当 `transfer_method` 为 `remote_url` 时必填           |
| `upload_file_id`  | string | 上传文件 ID，仅当 `transfer_method` 为 `local_file` 时必填        |

### 示例请求

```bash
curl -X POST 'http://localhost/v1/chat-messages' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "inputs": {},
    "query": "What are the specs of the iPhone 13 Pro Max?",
    "response_mode": "streaming",
    "conversation_id": "",
    "user": "abc-123",
    "files": [
      {
        "type": "image",
        "transfer_method": "remote_url",
        "url": "https://cloud.dify.ai/logo/logo-site.png"
      }
    ]
}'
```

---

### 响应内容

#### 1. **阻塞模式（blocking）**

返回完整的结果，`Content-Type: application/json`。

| 参数名            | 类型   | 描述                               |
| ----------------- | ------ | ---------------------------------- |
| `message_id`      | string | 消息唯一 ID                        |
| `conversation_id` | string | 会话 ID                            |
| `mode`            | string | 固定为 `chat`                      |
| `answer`          | string | 完整回复内容                       |
| `metadata`        | object | 元数据，包括模型用量信息及引用资源 |
| `created_at`      | int    | 消息创建时间戳                     |

**示例响应**：

```json
{
    "event": "message",
    "message_id": "9da23599-e713-473b-982c-4328d4f5c78a",
    "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2",
    "mode": "chat",
    "answer": "iPhone 13 Pro Max specs are listed here:...",
    "metadata": {
        "usage": {
            "prompt_tokens": 1033,
            "completion_tokens": 128,
            "total_tokens": 1161,
            "total_price": "0.0012890",
            "currency": "USD"
        },
        "retriever_resources": [
            {
                "dataset_name": "iPhone",
                "document_name": "iPhone List",
                "content": "\"Model\",\"Release Date\",\"Display Size\",\"Resolution\",\"Processor\",\"RAM\",\"Storage\",\"Camera\",\"Battery\",\"Operating System\"\n\"iPhone 13 Pro Max\",\"September 24, 2021\",\"6.7 inch\",\"1284 x 2778\",\"Hexa-core (2x3.23 GHz Avalanche + 4x1.82 GHz Blizzard)\",\"6 GB\",\"128, 256, 512 GB, 1TB\",\"12 MP\",\"4352 mAh\",\"iOS 15\""
            }
        ]
    },
    "created_at": 1705407629
}
```

---

#### 2. **流式模式（streaming）**

返回流式数据块，`Content-Type: text/event-stream`。  
每个数据块以 `data:` 开头，块之间以 `\n\n` 分隔。

**流式块结构**：

| 事件类型          | 描述                                       |
| ----------------- | ------------------------------------------ |
| `message`         | LLM 返回文本块事件                         |
| `message_end`     | 消息结束事件，流式返回结束                 |
| `error`           | 流式输出过程中出现的异常                   |
| `tts_message`     | 语音合成输出事件，返回 Base64 编码的音频块 |
| `tts_message_end` | 语音合成结束事件                           |

**示例响应**：

```streaming
data: {"event": "message", "answer": "iPhone 13 Pro Max specs are listed here:...", "created_at": 1705407629}\n\n
data: {"event": "message_end", "metadata": {"usage": {"total_tokens": 1161, "total_price": "0.0012890"}}}\n\n
```

---

### 错误响应

| 状态码 | 错误码                        | 描述               |
| ------ | ----------------------------- | ------------------ |
| 404    | `conversation_not_found`      | 对话不存在         |
| 400    | `invalid_param`               | 参数异常           |
| 400    | `app_unavailable`             | App 配置不可用     |
| 400    | `provider_not_initialize`     | 无可用模型凭据配置 |
| 400    | `provider_quota_exceeded`     | 模型调用额度不足   |
| 400    | `model_currently_not_support` | 当前模型不可用     |
| 400    | `completion_request_error`    | 文本生成失败       |
| 500    | `internal_server_error`       | 服务内部异常       |

## 2. **上传文件**

### **POST** `/files/upload`

**描述**：上传图片文件（支持 png, jpg, jpeg, webp, gif 格式），并在发送消息时使用，可实现图文多模态理解。

### 请求参数

| 参数名 | 类型   | 必填 | 描述                                           |
| ------ | ------ | ---- | ---------------------------------------------- |
| `file` | file   | 是   | 要上传的文件                                   |
| `user` | string | 是   | 用户标识，需与发送消息接口中的 `user` 保持一致 |

**注意**：该接口需使用 `multipart/form-data` 格式。

### 示例请求

```bash
curl -X POST 'http://localhost/v1/files/upload' \
--header 'Authorization: Bearer {api_key}' \
--form 'file=@localfile;type=image/[png|jpeg|jpg|webp|gif]' \
--form 'user=abc-123'
```

### 响应内容

| 参数名       | 类型      | 描述             |
| ------------ | --------- | ---------------- |
| `id`         | uuid      | 文件唯一 ID      |
| `name`       | string    | 文件名           |
| `size`       | int       | 文件大小（字节） |
| `extension`  | string    | 文件后缀         |
| `mime_type`  | string    | 文件 MIME 类型   |
| `created_by` | uuid      | 上传人 ID        |
| `created_at` | timestamp | 上传时间         |

**示例响应**：

```json
{
  "id": "72fa9618-8f89-4a37-9b33-7e1178a24a67",
  "name": "example.png",
  "size": 1024,
  "extension": "png",
  "mime_type": "image/png",
  "created_by": 123,
  "created_at": 1577836800
}
```

### 错误响应

| 状态码 | 错误码                  | 描述                 |
| ------ | ----------------------- | -------------------- |
| 400    | `no_file_uploaded`      | 必须提供文件         |
| 400    | `too_many_files`        | 仅支持上传一个文件   |
| 400    | `unsupported_preview`   | 文件不支持预览       |
| 400    | `unsupported_estimate`  | 文件不支持估算       |
| 413    | `file_too_large`        | 文件太大             |
| 415    | `unsupported_file_type` | 不支持的文件类型     |
| 503    | `s3_connection_failed`  | 无法连接到 S3 服务   |
| 503    | `s3_permission_denied`  | 无权限上传文件到 S3  |
| 503    | `s3_file_too_large`     | 文件超出 S3 大小限制 |

---

## 3. **停止响应**

### **POST** `/chat-messages/:task_id/stop`

**描述**：停止流式模式下的响应。

### 请求参数

| 参数名    | 类型   | 必填 | 描述                                           |
| --------- | ------ | ---- | ---------------------------------------------- |
| `task_id` | string | 是   | 任务 ID，可通过流式返回的 Chunk 获取           |
| `user`    | string | 是   | 用户标识，需与发送消息接口中的 `user` 保持一致 |

### 示例请求

```bash
curl -X POST 'http://localhost/v1/chat-messages/:task_id/stop' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{ "user": "abc-123" }'
```

### 响应内容

| 参数名   | 类型   | 描述               |
| -------- | ------ | ------------------ |
| `result` | string | 固定返回 `success` |

**示例响应**：

```json
{
  "result": "success"
}
```

---

## 4. **消息反馈**

### **POST** `/messages/:message_id/feedbacks`

**描述**：对消息进行反馈（点赞、点踩、撤销）。

### 请求参数

| 参数名       | 类型   | 必填 | 描述                                     |
| ------------ | ------ | ---- | ---------------------------------------- |
| `message_id` | string | 是   | 消息 ID                                  |
| `rating`     | string | 是   | 点赞 `like`，点踩 `dislike`，撤销 `null` |
| `user`       | string | 是   | 用户标识，需唯一                         |
| `content`    | string | 否   | 消息反馈的具体信息                       |

### 示例请求

```bash
curl -X POST 'http://localhost/v1/messages/:message_id/feedbacks' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "rating": "like",
    "user": "abc-123",
    "content": "message feedback information"
}'
```

### 响应内容

| 参数名   | 类型   | 描述               |
| -------- | ------ | ------------------ |
| `result` | string | 固定返回 `success` |

**示例响应**：

```json
{
  "result": "success"
}
```

---

## 5. **获取建议问题列表**

### **GET** `/messages/{message_id}/suggested`

**描述**：获取下一轮建议问题列表。

### 请求参数

| 参数名       | 类型   | 必填 | 描述             |
| ------------ | ------ | ---- | ---------------- |
| `message_id` | string | 是   | 消息 ID          |
| `user`       | string | 是   | 用户标识，需唯一 |

### 示例请求

```bash
curl -X GET 'http://localhost/v1/messages/{message_id}/suggested?user=abc-123' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json'
```

### 响应内容

| 参数名   | 类型   | 描述               |
| -------- | ------ | ------------------ |
| `result` | string | 固定返回 `success` |
| `data`   | array  | 建议问题列表       |

**示例响应**：

```json
{
  "result": "success",
  "data": [
    "a",
    "b",
    "c"
  ]
}
```

---

## 6. **获取会话历史消息**

### **GET** `/messages`

**描述**：滚动加载形式返回历史聊天记录，第一页返回最新 `limit` 条。

### 请求参数

| 参数名            | 类型   | 必填 | 描述                                   |
| ----------------- | ------ | ---- | -------------------------------------- |
| `conversation_id` | string | 是   | 会话 ID                                |
| `user`            | string | 是   | 用户标识，需唯一                       |
| `first_id`        | string | 否   | 当前页第一条聊天记录的 ID，默认 `null` |
| `limit`           | int    | 否   | 一次请求返回条数，默认 20 条           |

### 示例请求

```bash
curl -X GET 'http://localhost/v1/messages?user=abc-123&conversation_id=' \
--header 'Authorization: Bearer {api_key}'
```

### 响应内容

| 参数名     | 类型          | 描述                                         |
| ---------- | ------------- | -------------------------------------------- |
| `limit`    | int           | 返回条数                                     |
| `has_more` | bool          | 是否存在下一页                               |
| `data`     | array[object] | 消息列表，包括消息内容、反馈信息、文件信息等 |

**示例响应**：

```json
{
  "limit": 20,
  "has_more": false,
  "data": [
    {
      "id": "a076a87f-31e5-48dc-b452-0061adbbc922",
      "conversation_id": "cd78daf6-f9e4-4463-9ff2-54257230a0ce",
      "query": "iphone 13 pro",
      "answer": "The iPhone 13 Pro, released on September 24, 2021...",
      "created_at": 1705569239
    }
  ]
}

```

## 7. **获取应用基本信息**

### **GET** `/info`

**描述**：获取应用的基本信息，包括名称、描述和标签。

### 响应内容

| 参数名        | 类型          | 描述         |
| ------------- | ------------- | ------------ |
| `name`        | string        | 应用名称     |
| `description` | string        | 应用描述     |
| `tags`        | array[string] | 应用标签列表 |

### 示例请求

```bash
curl -X GET 'http://localhost/v1/info' \
-H 'Authorization: Bearer {api_key}'
```

### 示例响应

```json
{
  "name": "My App",
  "description": "This is my app.",
  "tags": [
    "tag1",
    "tag2"
  ]
}
```

---

## 8. **获取应用参数**

### **GET** `/parameters`

**描述**：获取应用的功能开关、输入参数名称、类型及默认值等配置。

### 响应内容

| 参数名                                     | 类型          | 描述                                                 |
| ------------------------------------------ | ------------- | ---------------------------------------------------- |
| `opening_statement`                        | string        | 开场白                                               |
| `suggested_questions`                      | array[string] | 开场推荐问题列表                                     |
| `suggested_questions_after_answer.enabled` | bool          | 是否启用回答后推荐问题                               |
| `speech_to_text.enabled`                   | bool          | 是否启用语音转文本功能                               |
| `retriever_resource.enabled`               | bool          | 是否启用引用和归属功能                               |
| `annotation_reply.enabled`                 | bool          | 是否启用标记回复功能                                 |
| `user_input_form`                          | array[object] | 用户输入表单配置，包括文本输入、段落输入、下拉控件等 |
| `file_upload.image`                        | object        | 图片上传配置，包括数量限制、传递方式等               |
| `system_parameters`                        | object        | 系统参数，包括文件大小限制等                         |

### 示例请求

```bash
curl -X GET 'http://localhost/v1/parameters' \
--header 'Authorization: Bearer {api_key}'
```

### 示例响应

```json
{
  "introduction": "nice to meet you",
  "user_input_form": [
    {
      "text-input": {
        "label": "a",
        "variable": "a",
        "required": true,
        "max_length": 48,
        "default": ""
      }
    }
  ],
  "file_upload": {
    "image": {
      "enabled": true,
      "number_limits": 3,
      "transfer_methods": [
        "remote_url",
        "local_file"
      ]
    }
  },
  "system_parameters": {
      "file_size_limit": 15,
      "image_file_size_limit": 10,
      "audio_file_size_limit": 50,
      "video_file_size_limit": 100
  }
}
```

---

## 9. **获取应用 Meta 信息**

### **GET** `/meta`

**描述**：获取工具的图标信息。

### 响应内容

| 参数名          | 类型             | 描述                                             |
| --------------- | ---------------- | ------------------------------------------------ |
| `tool_icons`    | object[string]   | 工具图标信息，每个工具对应一个图标               |
| `工具名称.icon` | object 或 string | 图标信息，可能是 URL 或包含背景色和 emoji 的对象 |

### 示例请求

```bash
curl -X GET 'http://localhost/v1/meta' \
-H 'Authorization: Bearer {api_key}'
```

### 示例响应

```json
{
  "tool_icons": {
      "dalle2": "https://cloud.dify.ai/console/api/workspaces/current/tool-provider/builtin/dalle/icon",
      "api_tool": {
          "background": "#252525",
          "content": "😁"
      }
  }
}
```

## 10. **删除会话**

### **DELETE** `/conversations/:conversation_id`

**描述**：删除指定的会话。

### 请求路径参数

| 参数名            | 类型   | 描述    |
| ----------------- | ------ | ------- |
| `conversation_id` | string | 会话 ID |

### 请求体参数

| 参数名 | 类型   | 描述                         |
| ------ | ------ | ---------------------------- |
| `user` | string | 用户标识，需保证在应用内唯一 |

### 响应内容

| 参数名   | 类型   | 描述               |
| -------- | ------ | ------------------ |
| `result` | string | 固定返回 `success` |

### 示例请求

```bash
curl -X DELETE 'http://localhost/v1/conversations/:conversation_id' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
 "user": "abc-123"
}'
```

### 示例响应

```json
{
  "result": "success"
}
```

---

## 11. **会话重命名**

### **POST** `/conversations/:conversation_id/name`

**描述**：对指定会话进行重命名。

### 请求路径参数

| 参数名            | 类型   | 描述    |
| ----------------- | ------ | ------- |
| `conversation_id` | string | 会话 ID |

### 请求体参数

| 参数名          | 类型   | 描述                                                  |
| --------------- | ------ | ----------------------------------------------------- |
| `name`          | string | （选填）会话名称，若 `auto_generate` 为 `true` 可不传 |
| `auto_generate` | bool   | （选填）是否自动生成标题，默认值为 `false`            |
| `user`          | string | 用户标识，需保证在应用内唯一                          |

### 响应内容

| 参数名         | 类型      | 描述         |
| -------------- | --------- | ------------ |
| `id`           | string    | 会话 ID      |
| `name`         | string    | 会话名称     |
| `inputs`       | object    | 用户输入参数 |
| `status`       | string    | 会话状态     |
| `introduction` | string    | 开场白       |
| `created_at`   | timestamp | 会话创建时间 |
| `updated_at`   | timestamp | 会话更新时间 |

### 示例请求

```bash
curl -X POST 'http://localhost/v1/conversations/:conversation_id/name' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
 "name": "",
 "auto_generate": true,
 "user": "abc-123"
}'
```

### 示例响应

```json
{
  "id": "34d511d5-56de-4f16-a997-57b379508443",
  "name": "hello",
  "inputs": {},
  "status": "normal",
  "introduction": "",
  "created_at": 1732731141,
  "updated_at": 1732734510
}
```

---

## 12. **语音转文字**

### **POST** `/audio-to-text`

**描述**：将语音文件转换为文字。

### 请求体参数

| 参数名 | 类型   | 描述                                                                                       |
| ------ | ------ | ------------------------------------------------------------------------------------------ |
| `file` | file   | 语音文件，支持格式：`mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, `webm`，文件大小限制：15MB |
| `user` | string | 用户标识，需保证在应用内唯一                                                               |

### 响应内容

| 参数名 | 类型   | 描述             |
| ------ | ------ | ---------------- |
| `text` | string | 转换后的文字内容 |

### 示例请求

```bash
curl -X POST 'http://localhost/v1/audio-to-text' \
--header 'Authorization: Bearer {api_key}' \
--form 'file=@localfile;type=audio/[mp3|mp4|mpeg|mpga|m4a|wav|webm]'
```

### 示例响应

```json
{
  "text": "hello"
}
```

---

## 13. **文字转语音**

### **POST** `/text-to-audio`

**描述**：将文字内容转换为语音。

### 请求体参数

| 参数名       | 类型   | 描述                                                       |
| ------------ | ------ | ---------------------------------------------------------- |
| `message_id` | string | （选填）Dify 生成的文本消息 ID，优先使用该字段生成语音     |
| `text`       | string | （选填）语音生成内容，若未传 `message_id` 则使用该字段内容 |
| `user`       | string | 用户标识，需保证在应用内唯一                               |

### 响应头

| 参数名         | 类型   | 描述                 |
| -------------- | ------ | -------------------- |
| `Content-Type` | string | 固定返回 `audio/wav` |

### 示例请求

```bash
curl --location --request POST 'http://localhost/v1/text-to-audio' \
--header 'Authorization: Bearer {api_key}' \
--form 'text=你好Dify;user=abc-123;message_id=5ad4cb98-f0c7-4085-b384-88c403be6290'
```
