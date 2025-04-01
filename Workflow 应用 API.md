# API 文档整理

## 0. **Authentication**
Dify Service API 使用 API-Key 进行鉴权。 强烈建议开发者把 API-Key 放在后端存储，而非分享或者放在客户端存储，以免 API-Key 泄露，导致财产损失。 所有 API 请求都应在 Authorization HTTP Header 中包含您的 API-Key，如下所示：

Code
  Authorization: Bearer {API_KEY}


## 1. **获取应用参数**

### **GET** `/parameters`

**描述**：用于进入页面时，获取功能开关、输入参数名称、类型及默认值等。

**响应内容**：

| 参数名              | 类型              | 描述                                                                 |
|---------------------|-------------------|----------------------------------------------------------------------|
| user_input_form     | array[object]    | 用户输入表单配置                                                    |
| text-input          | object           | 文本输入控件                                                        |
| label               | string           | 控件展示标签名                                                      |
| variable            | string           | 控件 ID                                                             |
| required            | bool             | 是否必填                                                            |
| default             | string           | 默认值                                                              |
| paragraph           | object           | 段落文本输入控件                                                    |
| select              | object           | 下拉控件                                                            |
| options             | array[string]    | 下拉选项值                                                          |
| file_upload         | object           | 文件上传控件                                                        |
| image               | object           | 图片上传设置，支持 `png`, `jpg`, `jpeg`, `webp`, `gif`              |
| enabled             | bool             | 是否启用                                                            |
| number_limits       | int              | 图片数量限制，默认 3                                                |
| transfer_methods    | array[string]    | 文件传递方式：`remote_url`, `local_file`                            |
| system_parameters   | object           | 系统参数                                                            |
| file_size_limit     | int              | 文档上传大小限制（MB）                                              |
| image_file_size_limit | int            | 图片文件上传大小限制（MB）                                          |
| audio_file_size_limit | int            | 音频文件上传大小限制（MB）                                          |
| video_file_size_limit | int            | 视频文件上传大小限制（MB）                                          |

---

## 2. **执行 Workflow**

### **POST** `/workflows/run`

**描述**：执行已发布的 Workflow。

**请求参数**：

| 参数名         | 类型      | 必填 | 描述                                                                 |
|----------------|-----------|------|----------------------------------------------------------------------|
| inputs         | object    | 是   | 传入 App 定义的变量值，支持文件列表类型                              |
| response_mode  | string    | 是   | 响应模式：`streaming`（推荐）或 `blocking`                           |
| user           | string    | 是   | 用户标识，需保证唯一                                                 |

**文件列表类型变量说明**：

| 参数名           | 类型    | 描述                                                                 |
|------------------|---------|----------------------------------------------------------------------|
| type             | string  | 文件类型：`document`, `image`, `audio`, `video`, `custom`           |
| transfer_method  | string  | 文件传递方式：`remote_url` 或 `local_file`                          |
| url              | string  | 文件地址，仅当 `transfer_method` 为 `remote_url` 时必填             |
| upload_file_id   | string  | 上传文件 ID，仅当 `transfer_method` 为 `local_file` 时必填          |

``` Request
curl -X POST 'http://localhost/v1/workflows/run' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "inputs": {},
    "response_mode": "streaming",
    "user": "abc-123"
}'
```

``` Example: file array as an input variable
{
  "inputs": {
    "{variable_name}": 
    [
      {
      "transfer_method": "local_file",
      "upload_file_id": "{upload_file_id}",
      "type": "{document_type}"
      }
    ]
  }
}
```

**响应内容**：

1. **阻塞模式（blocking）**  
返回完整结果，`Content-Type: application/json`。  

| 参数名         | 类型      | 描述                                                                 |
|----------------|-----------|----------------------------------------------------------------------|
| workflow_run_id | string   | Workflow 执行 ID                                                    |
| task_id        | string    | 任务 ID                                                             |
| data           | object    | 包含详细内容，如状态、输入输出、耗时等                               |

```Blocking Mode Response
{
    "workflow_run_id": "djflajgkldjgd",
    "task_id": "9da23599-e713-473b-982c-4328d4f5c78a",
    "data": {
        "id": "fdlsjfjejkghjda",
        "workflow_id": "fldjaslkfjlsda",
        "status": "succeeded",
        "outputs": {
          "text": "Nice to meet you."
        },
        "error": null,
        "elapsed_time": 0.875,
        "total_tokens": 3562,
        "total_steps": 8,
        "created_at": 1705407629,
        "finished_at": 1727807631
    }
}
```


2. **流式模式（streaming）**  
返回流式数据块，`Content-Type: text/event-stream`。  
每块数据以 `data:` 开头，块之间以 `\n\n` 分隔。  

| 事件类型         | 描述                                                                 |
|------------------|----------------------------------------------------------------------|
| `workflow_started` | Workflow 开始执行                                                 |
| `node_started`     | 节点开始执行                                                     |
| `node_finished`    | 节点执行结束                                                     |
| `workflow_finished` | Workflow 执行结束                                               |
| `tts_message`      | TTS 音频流事件                                                   |
| `tts_message_end`  | TTS 音频流结束事件                                               |
| `ping`             | 每 10 秒发送一次，保持连接存活                                    |

```Streaming Mode Response
  data: {"event": "workflow_started", "task_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "workflow_run_id": "5ad498-f0c7-4085-b384-88cbe6290", "data": {"id": "5ad498-f0c7-4085-b384-88cbe6290", "workflow_id": "dfjasklfjdslag", "sequence_number": 1, "created_at": 1679586595}}
  data: {"event": "node_started", "task_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "workflow_run_id": "5ad498-f0c7-4085-b384-88cbe6290", "data": {"id": "5ad498-f0c7-4085-b384-88cbe6290", "node_id": "dfjasklfjdslag", "node_type": "start", "title": "Start", "index": 0, "predecessor_node_id": "fdljewklfklgejlglsd", "inputs": {}, "created_at": 1679586595}}
  data: {"event": "node_finished", "task_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "workflow_run_id": "5ad498-f0c7-4085-b384-88cbe6290", "data": {"id": "5ad498-f0c7-4085-b384-88cbe6290", "node_id": "dfjasklfjdslag", "node_type": "start", "title": "Start", "index": 0, "predecessor_node_id": "fdljewklfklgejlglsd", "inputs": {}, "outputs": {}, "status": "succeeded", "elapsed_time": 0.324, "execution_metadata": {"total_tokens": 63127864, "total_price": 2.378, "currency": "USD"},  "created_at": 1679586595}}
  data: {"event": "workflow_finished", "task_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "workflow_run_id": "5ad498-f0c7-4085-b384-88cbe6290", "data": {"id": "5ad498-f0c7-4085-b384-88cbe6290", "workflow_id": "dfjasklfjdslag", "outputs": {}, "status": "succeeded", "elapsed_time": 0.324, "total_tokens": 63127864, "total_steps": "1", "created_at": 1679586595, "finished_at": 1679976595}}
  data: {"event": "tts_message", "conversation_id": "23dd85f3-1a41-4ea0-b7a9-062734ccfaf9", "message_id": "a8bdc41c-13b2-4c18-bfd9-054b9803038c", "created_at": 1721205487, "task_id": "3bf8a0bb-e73b-4690-9e66-4e429bad8ee7", "audio": "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"}
  data: {"event": "tts_message_end", "conversation_id": "23dd85f3-1a41-4ea0-b7a9-062734ccfaf9", "message_id": "a8bdc41c-13b2-4c18-bfd9-054b9803038c", "created_at": 1721205487, "task_id": "3bf8a0bb-e73b-4690-9e66-4e429bad8ee7", "audio": ""}
```

---

## 3. **获取 Workflow 执行情况**

### **GET** `/workflows/run/:workflow_id`

**描述**：根据 Workflow 执行 ID 获取执行详情。

**请求参数**：

| 参数名         | 类型      | 必填 | 描述                                                                 |
|----------------|-----------|------|----------------------------------------------------------------------|
| workflow_id    | string    | 是   | Workflow 执行 ID，可在流式返回中获取                                 |

**响应内容**：

| 参数名         | 类型      | 描述                                                                 |
|----------------|-----------|----------------------------------------------------------------------|
| id             | string    | Workflow 执行 ID                                                    |
| workflow_id    | string    | 关联 Workflow ID                                                    |
| status         | string    | 执行状态：`running` / `succeeded` / `failed` / `stopped`            |
| inputs         | json      | 任务输入内容                                                        |
| outputs        | json      | 任务输出内容                                                        |
| error          | string    | 错误原因                                                            |
| total_steps    | int       | 任务执行总步数                                                      |
| total_tokens   | int       | 任务执行总 tokens                                                   |
| created_at     | timestamp | 任务开始时间                                                        |
| finished_at    | timestamp | 任务结束时间                                                        |
| elapsed_time   | float     | 耗时（秒）                                                          |


```Request Example
Request
GET
/workflows/run/:workflow_id
curl -X GET 'http://localhost/v1/workflows/run/:workflow_id' \
-H 'Authorization: Bearer {api_key}' \
-H 'Content-Type: application/json'
```

```Response Example
Response
{
    "id": "b1ad3277-089e-42c6-9dff-6820d94fbc76",
    "workflow_id": "19eff89f-ec03-4f75-b0fc-897e7effea02",
    "status": "succeeded",
    "inputs": "{\"sys.files\": [], \"sys.user_id\": \"abc-123\"}",
    "outputs": null,
    "error": null,
    "total_steps": 3,
    "total_tokens": 0,
    "created_at": "Thu, 18 Jul 2024 03:17:40 -0000",
    "finished_at": "Thu, 18 Jul 2024 03:18:10 -0000",
    "elapsed_time": 30.098514399956912
}
```

---

## 4. **停止 Workflow 响应**

### **POST** `/workflows/tasks/:task_id/stop`

**描述**：停止流式模式下的 Workflow 响应。

**请求参数**：

| 参数名         | 类型      | 必填 | 描述                                                                 |
|----------------|-----------|------|----------------------------------------------------------------------|
| task_id        | string    | 是   | 任务 ID，可在流式返回中获取                                          |
| user           | string    | 是   | 用户标识，需与发送消息接口中的用户标识一致                           |

**响应内容**：

| 参数名         | 类型      | 描述                                                                 |
|----------------|-----------|----------------------------------------------------------------------|
| result         | string    | 固定返回 `"success"`                                                 |

```Request Example
Request
POST
/workflows/tasks/:task_id/stop
curl -X POST 'http://localhost/v1/workflows/tasks/:task_id/stop' \
-H 'Authorization: Bearer {api_key}' \
-H 'Content-Type: application/json' \
--data-raw '{"user": "abc-123"}'
```

```Response Example
Response
{
  "result": "success"
}
```

---

## 5. **文件上传**

### **POST** `/files/upload`

**描述**：上传文件以供工作流程使用。

**请求参数**（`multipart/form-data` 格式）：

| 参数名         | 类型      | 描述                                                                 |
|----------------|-----------|----------------------------------------------------------------------|
| file           | file      | 要上传的文件                                                        |
| user           | string    | 用户标识，需与发送消息接口中的用户标识一致                           |

**响应内容**：

| 参数名         | 类型      | 描述                                                                 |
|----------------|-----------|----------------------------------------------------------------------|
| id             | uuid      | 文件 ID                                                             |
| name           | string    | 文件名                                                              |
| size           | int       | 文件大小（字节）                                                    |
| extension      | string    | 文件后缀                                                            |
| mime_type      | string    | 文件 MIME 类型                                                      |
| created_by     | uuid      | 上传人 ID                                                           |
| created_at     | timestamp | 上传时间                                                            |


```Request
POST
/files/upload
curl -X POST 'http://localhost/v1/files/upload' \
--header 'Authorization: Bearer {api_key}' \
--form 'file=@localfile;type=image/[png|jpeg|jpg|webp|gif] \
--form 'user=abc-123'
```
```Response
{
  "id": "72fa9618-8f89-4a37-9b33-7e1178a24a67",
  "name": "example.png",
  "size": 1024,
  "extension": "png",
  "mime_type": "image/png",
  "created_by": 123,
  "created_at": 1577836800,
}
```

---

## 6. **获取 Workflow 日志**

### **GET** `/workflows/logs`

**描述**：倒序返回 Workflow 执行日志。

**查询参数**：

| 参数名         | 类型      | 描述                                                                 |
|----------------|-----------|----------------------------------------------------------------------|
| keyword        | string    | 关键字                                                              |
| status         | string    | 执行状态：`succeeded` / `failed` / `stopped`                        |
| page           | int       | 当前页码，默认 1                                                    |
| limit          | int       | 每页条数，默认 20                                                   |

**响应内容**：

| 参数名         | 类型      | 描述                                                                 |
|----------------|-----------|----------------------------------------------------------------------|
| page           | int       | 当前页码                                                            |
| limit          | int       | 每页条数                                                            |
| total          | int       | 总条数                                                              |
| has_more       | bool      | 是否还有更多数据                                                    |
| data           | array     | 当前页码的数据                                                      |


```Request
GET
/workflows/logs
curl -X GET 'http://localhost/v1/workflows/logs'\
 --header 'Authorization: Bearer {api_key}'
```

```Response Example
Response
{
    "page": 1,
    "limit": 1,
    "total": 7,
    "has_more": true,
    "data": [
        {
            "id": "e41b93f1-7ca2-40fd-b3a8-999aeb499cc0",
            "workflow_run": {
                "id": "c0640fc8-03ef-4481-a96c-8a13b732a36e",
                "version": "2024-08-01 12:17:09.771832",
                "status": "succeeded",
                "error": null,
                "elapsed_time": 1.3588523610014818,
                "total_tokens": 0,
                "total_steps": 3,
                "created_at": 1726139643,
                "finished_at": 1726139644
            },
            "created_from": "service-api",
            "created_by_role": "end_user",
            "created_by_account": null,
            "created_by_end_user": {
                "id": "7f7d9117-dd9d-441d-8970-87e5e7e687a3",
                "type": "service_api",
                "is_anonymous": false,
                "session_id": "abc-123"
            },
            "created_at": 1726139644
        }
    ]
}
```

---

## 7. **获取应用基本信息**

### **GET** `/info`

**描述**：获取应用的基本信息。

**响应内容**：

| 参数名         | 类型      | 描述                                                                 |
|----------------|-----------|----------------------------------------------------------------------|
| name           | string    | 应用名称                                                            |
| description    | string    | 应用描述                                                            |
| tags           | array     | 应用标签                                                            |

```Request
GET
/info
curl -X GET 'http://localhost/v1/info' \
-H 'Authorization: Bearer {api_key}'
```

```Response
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