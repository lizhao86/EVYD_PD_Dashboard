/**
 * EVYD产品经理AI工作台 - User Story生成器
 * API交互模块
 */

// API交互模块
const API = {
    /**
     * 获取应用信息
     */
    async fetchAppInfo() {
        const currentUser = Auth.checkAuth();
        if (!currentUser) return;
        
        const apiKey = currentUser.apiKeys.userStory;
        if (!apiKey) {
            UI.showError('未配置API密钥，请联系管理员为您的账户配置User Story的API密钥。');
            return;
        }
        
        const globalConfig = Config.getGlobalConfig();
        const apiEndpoint = globalConfig.apiEndpoints.userStory;
        if (!apiEndpoint) {
            UI.showError('未配置API地址，请联系管理员配置全局API地址。');
            return;
        }
        
        // 显示加载状态
        UI.showLoading();
        
        // 处理API基础URL
        const baseUrl = Utils.getApiBaseUrl(apiEndpoint);
        const infoUrl = `${baseUrl}/info`;
        
        try {
            console.log(`尝试连接API: ${infoUrl}`);
            
            const response = await fetch(infoUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            
            if (!response.ok) {
                // 尝试读取错误详情
                let errorDetail = '';
                try {
                    const errorJson = await response.json();
                    errorDetail = JSON.stringify(errorJson, null, 2);
                } catch (e) {
                    try {
                        errorDetail = await response.text();
                    } catch (e2) {
                        errorDetail = '无法获取错误详情';
                    }
                }
                
                throw new Error(`请求失败: ${response.status} ${response.statusText}${errorDetail ? '\n错误详情: ' + errorDetail : ''}`);
            }
            
            const data = await response.json();
            console.log('获取的应用信息:', data);
            
            // 处理可能缺少的字段
            if (!data.name) {
                console.warn('应用信息缺少name字段，使用默认值');
                data.name = 'User Story 生成器';
            }
            
            UI.displayAppInfo(data);
        } catch (error) {
            console.error('API连接错误:', error, '请求URL:', infoUrl);
            
            let errorMessage = `无法连接到Dify API: ${error.message}`;
            
            // 提供更具体的错误建议
            if (error.message === 'Failed to fetch') {
                errorMessage = '无法连接到Dify API服务器，可能的原因：\n' +
                              '1. API地址格式不正确\n' +
                              '2. API服务器未运行或无法访问\n' +
                              '3. 网络连接问题或跨域限制\n\n' +
                              `当前请求地址: ${infoUrl}`;
            } else if (error.message.includes('401')) {
                errorMessage = 'API密钥认证失败，请确认您的API密钥正确并且有效';
            } else if (error.message.includes('404')) {
                errorMessage = `API路径不存在，请确认API地址是否正确配置\n当前请求地址: ${infoUrl}`;
            } else if (error.message.includes('400')) {
                errorMessage = `请求格式错误，请检查API地址和参数\n${error.message}`;
            }
            
            UI.showError(errorMessage);
            
            // 如果是认证错误或404错误，尝试显示表单
            if (error.message.includes('401') || error.message.includes('404')) {
                console.log('尝试跳过应用信息获取，直接显示表单');
                UI.displayAppInfo({
                    name: 'User Story 生成器（离线模式）',
                    description: '无法连接到Dify API，但您仍可以尝试使用该功能。',
                    tags: ['离线模式']
                });
            }
        }
    },
    
    /**
     * 生成User Story
     */
    async generateUserStory(platform, system, module, requirement) {
        // 清除之前的任务ID
        UserStoryApp.state.currentTaskId = null;
        
        const currentUser = Auth.checkAuth();
        if (!currentUser) return;
        
        const apiKey = currentUser.apiKeys.userStory;
        if (!apiKey) {
            alert('未配置API密钥，请联系管理员配置您的API密钥。');
            return;
        }
        
        const globalConfig = Config.getGlobalConfig();
        const apiEndpoint = globalConfig.apiEndpoints.userStory;
        
        // 处理API基础URL
        const baseUrl = Utils.getApiBaseUrl(apiEndpoint);
        const runUrl = `${baseUrl}/workflows/run`;
        
        // 显示结果区域和生成状态
        UI.showGenerationStarted();
        
        try {
            // 定义可能的输入格式
            const formatAttempts = [
                // 1. 首字母大写格式（Requirements复数形式）
                {
                    inputs: {
                        Platform: platform,
                        System: system,
                        Module: module,
                        Requirements: requirement
                    }
                },
                // 2. 首字母大写格式（单数形式）
                {
                    inputs: {
                        Platform: platform,
                        System: system,
                        Module: module,
                        Requirement: requirement
                    }
                },
                // 3. 全小写格式（复数形式）
                {
                    inputs: {
                        platform: platform,
                        system: system,
                        module: module,
                        requirements: requirement
                    }
                },
                // 4. 全小写格式（单数形式）
                {
                    inputs: {
                        platform: platform,
                        system: system,
                        module: module,
                        requirement: requirement
                    }
                },
                // 5. 下划线格式
                {
                    inputs: {
                        platform_name: platform,
                        system_name: system,
                        module_name: module,
                        requirements: requirement
                    }
                },
                // 6. 单一文本格式
                {
                    inputs: {
                        text: `平台：${platform}\n系统：${system}\n模块：${module}\n需求：${requirement}`
                    }
                },
                // 7. 数组格式
                {
                    inputs: {
                        Platform: platform,
                        System: system,
                        Module: module,
                        Requirements: [requirement]
                    }
                }
            ];
            
            // 尝试不同的输入格式
            let response = null;
            let errorDetail = '';
            
            for (let i = 0; i < formatAttempts.length; i++) {
                const attempt = formatAttempts[i];
                const requestData = {
                    ...attempt,
                    response_mode: "streaming",
                    user: currentUser.username
                };
                
                console.log(`尝试格式 ${i+1}:`, JSON.stringify(requestData, null, 2));
                
                try {
                    response = await fetch(runUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestData)
                    });
                    
                    // 如果请求成功，跳出循环
                    if (response.ok) {
                        console.log(`成功使用格式 ${i+1}`);
                        break;
                    }
                    
                    // 如果是400错误，读取错误信息
                    if (response.status === 400) {
                        try {
                            const errorJson = await response.json();
                            errorDetail = JSON.stringify(errorJson, null, 2);
                            console.log(`格式 ${i+1} 失败:`, errorDetail);
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                } catch (error) {
                    console.error(`尝试格式 ${i+1} 时出错:`, error);
                }
            }
            
            // 检查是否所有尝试都失败
            if (!response || !response.ok) {
                throw new Error(`所有请求格式都失败了\n最后一个错误: ${errorDetail || '无详细信息'}`);
            }
            
            // 处理流式响应
            await this.handleStreamResponse(response);
            
        } catch (error) {
            console.error('生成失败:', error);
            document.getElementById('result-content').innerHTML = 
                `<span style="color: red;">生成失败: ${error.message}</span>`;
            
            // 显示调试信息
            console.log('用户:', currentUser.username);
            console.log('API地址:', apiEndpoint);
            console.log('API Key前几位:', apiKey.substring(0, 8) + '...');
        } finally {
            // 如果生成失败或完成，清除任务ID
            if (!UserStoryApp.state.currentTaskId) {
                console.log('生成已完成，无需清除任务ID');
            } else {
                console.log('生成异常结束，清除任务ID:', UserStoryApp.state.currentTaskId);
                UserStoryApp.state.currentTaskId = null;
            }
            
            UI.showGenerationCompleted();
        }
    },
    
    /**
     * 处理流式响应
     */
    async handleStreamResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        let taskId = null;
        let workflowRunId = null;
        let systemInfo = {};
        let statsUpdated = false; // 标记统计数据是否已更新
        
        // 清空结果内容
        const resultContent = document.getElementById('result-content');
        resultContent.innerHTML = '';
        
        // 准备系统信息区域
        const systemInfoContainer = document.getElementById('system-info-container');
        const systemInfoContent = document.getElementById('system-info-content');
        systemInfoContainer.style.display = 'none';
        systemInfoContent.innerHTML = '';
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            console.log('接收的数据:', chunk);
            
            // 解析流式数据
            let lines = chunk.split('\n');
            
            for (let line of lines) {
                if (!line.trim()) continue;
                
                // 检查是否为SSE格式
                if (line.startsWith('data: ')) {
                    line = line.substring(6); // 移除'data: '前缀
                }
                
                try {
                    const data = JSON.parse(line);
                    console.log('解析的数据:', data);
                    
                    // 收集系统信息，包括任务ID和工作流运行ID
                    if (data.task_id && !taskId) {
                        taskId = data.task_id;
                        window.userStoryTaskId = taskId;
                        UserStoryApp.state.currentTaskId = taskId; // 保存到应用状态
                        systemInfo.task_id = taskId;
                        console.log('已捕获任务ID:', taskId);
                    } else if (data.id && !taskId) {
                        taskId = data.id;
                        window.userStoryTaskId = taskId;
                        UserStoryApp.state.currentTaskId = taskId; // 保存到应用状态
                        systemInfo.task_id = taskId;
                        console.log('已捕获任务ID(id字段):', taskId);
                    } else if (data.workflow_task_id && !taskId) {
                        taskId = data.workflow_task_id;
                        window.userStoryTaskId = taskId;
                        UserStoryApp.state.currentTaskId = taskId; // 保存到应用状态
                        systemInfo.task_id = taskId;
                        console.log('已捕获任务ID(workflow_task_id字段):', taskId);
                    }
                    
                    if (data.workflow_run_id && !workflowRunId) {
                        workflowRunId = data.workflow_run_id;
                        systemInfo.workflow_run_id = workflowRunId;
                        console.log('已捕获工作流ID:', workflowRunId);
                    }
                    
                    // 处理不同类型的事件
                    if (data.event) {
                        // 处理系统事件
                        systemInfo[data.event] = data.data || {};
                        
                        // 更新系统信息显示
                        systemInfoContainer.style.display = 'block';
                        systemInfoContent.textContent = JSON.stringify(systemInfo, null, 2);
                        
                        // 特别处理workflow_finished事件 - 这是最终结果
                        if (data.event === 'workflow_finished' && data.data) {
                            console.log('收到workflow_finished事件，详细数据:', data.data);
                            
                            // 尝试直接从data.data中提取统计信息
                            const directStats = {
                                elapsed_time: data.data.elapsed_time,
                                total_tokens: data.data.total_tokens,
                                total_steps: data.data.total_steps
                            };
                            console.log('直接从workflow_finished获取的统计数据:', directStats);
                            
                            // 如果有统计数据且还未更新过统计信息，可以直接显示
                            if (!statsUpdated && data.data.elapsed_time && data.data.total_tokens && data.data.total_steps) {
                                console.log('使用流数据中的统计信息更新UI');
                                UI.displayTaskStats(data.data);
                                statsUpdated = true; // 标记统计数据已更新
                            }
                            
                            if (data.data.outputs) {
                                // 显示最终输出结果
                                const finalOutputs = data.data.outputs;
                                if (Object.keys(finalOutputs).length > 0) {
                                    // 尝试从outputs中提取实际内容
                                    let actualOutput = '';
                                    
                                    // 检查是否存在文本或排版过的内容字段
                                    if (finalOutputs.text) {
                                        actualOutput = finalOutputs.text;
                                    } else if (finalOutputs.content) {
                                        actualOutput = finalOutputs.content;
                                    } else if (finalOutputs.result) {
                                        actualOutput = finalOutputs.result;
                                    } else if (finalOutputs.Reject) {
                                        // 显示拒绝信息
                                        actualOutput = finalOutputs.Reject;
                                    } else if (finalOutputs.User_Story) {
                                        actualOutput = finalOutputs.User_Story;
                                    } else {
                                        // 如果没有识别的字段，显示整个outputs对象
                                        actualOutput = JSON.stringify(finalOutputs, null, 2);
                                    }
                                    
                                    // 处理JSON格式的响应
                                    if (typeof actualOutput === 'string' && actualOutput.trim().startsWith('{') && actualOutput.trim().endsWith('}')) {
                                        try {
                                            const jsonObj = JSON.parse(actualOutput);
                                            // 如果是JSON对象，提取内容并处理
                                            for (const key in jsonObj) {
                                                if (jsonObj[key] && typeof jsonObj[key] === 'string') {
                                                    // 取出内容并替换\n为实际的换行
                                                    actualOutput = jsonObj[key].replace(/\\n/g, '\n');
                                                    break;
                                                }
                                            }
                                        } catch (e) {
                                            console.log('尝试解析JSON失败，保持原样:', e);
                                        }
                                    }
                                    
                                    // 尝试将结果内容渲染为markdown (如果存在)
                                    if (document.getElementById('result-content-markdown')) {
                                        const markdownDiv = document.getElementById('result-content-markdown');
                                        // 显示markdown格式的内容
                                        markdownDiv.innerHTML = this.convertMarkdownToHtml(actualOutput);
                                        markdownDiv.style.display = 'block';
                                        // 隐藏纯文本内容
                                        document.getElementById('result-content').style.display = 'none';
                                        result = actualOutput;
                                    } else {
                                        // 如果没有markdown容器，则使用普通文本显示
                                        resultContent.textContent = actualOutput;
                                        result = actualOutput;
                                    }
                                }
                            }
                        }
                        // 节点完成事件可能包含部分结果
                        else if (data.event === 'node_finished' && data.data && data.data.outputs) {
                            const nodeOutputs = data.data.outputs;
                            if (nodeOutputs.text) {
                                // 追加到结果中
                                result += nodeOutputs.text;
                                resultContent.textContent = result;
                                
                                // 如果存在markdown容器，也更新它
                                const markdownDiv = document.getElementById('result-content-markdown');
                                if (markdownDiv) {
                                    markdownDiv.innerHTML = this.convertMarkdownToHtml(result);
                                }
                            }
                        }
                    }
                    // 处理其他类型的消息
                    else if (data.event === 'message' && data.answer) {
                        result += data.answer;
                        resultContent.textContent = result;
                        
                        // 如果存在markdown容器，也更新它
                        const markdownDiv = document.getElementById('result-content-markdown');
                        if (markdownDiv) {
                            markdownDiv.innerHTML = this.convertMarkdownToHtml(result);
                        }
                    } 
                    else if (data.output && data.output.text) {
                        result += data.output.text;
                        resultContent.textContent = result;
                        
                        // 如果存在markdown容器，也更新它
                        const markdownDiv = document.getElementById('result-content-markdown');
                        if (markdownDiv) {
                            markdownDiv.innerHTML = this.convertMarkdownToHtml(result);
                        }
                    }
                    
                    // 自动滚动到底部
                    resultContent.scrollTop = resultContent.scrollHeight;
                    systemInfoContent.scrollTop = systemInfoContent.scrollHeight;
                } catch (e) {
                    console.error('解析数据失败:', line, e);
                }
            }
        }
        
        // 完成后，只有在未通过流更新统计数据时才获取任务详情
        if (taskId && !statsUpdated) {
            console.log('生成完成，统计数据未从流中获取，等待1秒后通过API获取...');
            setTimeout(() => {
                this.fetchTaskDetails(taskId);
            }, 1000);
        } else if (!taskId) {
            console.log('未获取到任务ID，无法获取统计信息');
        } else {
            console.log('统计数据已从流中更新，无需再次获取');
        }
    },
    
    /**
     * 停止生成
     */
    async stopGeneration(taskId) {
        const currentUser = Auth.checkAuth();
        if (!currentUser || !taskId) return;
        
        const apiKey = currentUser.apiKeys.userStory;
        const globalConfig = Config.getGlobalConfig();
        const apiEndpoint = globalConfig.apiEndpoints.userStory;
        
        // 处理API基础URL
        const baseUrl = Utils.getApiBaseUrl(apiEndpoint);
        const stopUrl = `${baseUrl}/workflows/tasks/${taskId}/stop`;
        
        try {
            console.log(`发送停止请求到: ${stopUrl}, taskId: ${taskId}`);
            
            const response = await fetch(stopUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user: currentUser.username })
            });
            
            if (!response.ok) {
                throw new Error(`请求失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('停止生成响应:', data);
            
            if (data.result === 'success') {
                // 添加停止提示
                document.getElementById('result-content').innerHTML += '<br><br><i>(已停止生成)</i>';
                
                // 更新UI状态为已完成
                UI.showGenerationCompleted();
                
                // 清除当前任务ID
                UserStoryApp.state.currentTaskId = null;
            }
        } catch (error) {
            console.error('停止生成失败:', error, '请求URL:', stopUrl);
            alert('停止生成失败: ' + error.message);
            
            // 即使失败也恢复UI状态
            UI.showGenerationCompleted();
        }
    },
    
    /**
     * 获取任务详情
     */
    async fetchTaskDetails(taskId) {
        const currentUser = Auth.checkAuth();
        if (!currentUser || !taskId) return;
        
        const apiKey = currentUser.apiKeys.userStory;
        const globalConfig = Config.getGlobalConfig();
        const apiEndpoint = globalConfig.apiEndpoints.userStory;
        
        // 处理API基础URL
        const baseUrl = Utils.getApiBaseUrl(apiEndpoint);
        
        // 官方API路径
        const detailsUrl = `${baseUrl}/workflows/run/${taskId}`;
        
        console.log(`获取任务详情，URL: ${detailsUrl}`);
        
        try {
            const response = await fetch(detailsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`请求失败: ${response.status} ${response.statusText}`);
            }
            
            const taskData = await response.json();
            console.log('获取到的原始任务数据:', taskData);
            console.log('统计数据:', {
                elapsed_time: taskData.elapsed_time,
                total_steps: taskData.total_steps,
                total_tokens: taskData.total_tokens
            });
            
            // 确保数据格式正确
            if (taskData.elapsed_time === undefined && taskData.data && taskData.data.elapsed_time) {
                console.log('从data字段中获取统计数据');
                taskData.elapsed_time = taskData.data.elapsed_time;
                taskData.total_steps = taskData.data.total_steps;
                taskData.total_tokens = taskData.data.total_tokens;
            }
            
            UI.displayTaskStats(taskData);
        } catch (error) {
            console.error('获取任务详情失败:', error.message);
            UI.showTaskStatsFailed();
        }
    },

    /**
     * 将Markdown文本转换为HTML
     */
    convertMarkdownToHtml(markdown) {
        if (!markdown) return '';
        
        // 基本的Markdown转HTML处理
        let html = markdown
            // 处理标题
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
            
            // 处理加粗和斜体
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            
            // 处理列表
            .replace(/^\s*\* (.*$)/gm, '<li>$1</li>')
            .replace(/^\s*- (.*$)/gm, '<li>$1</li>')
            .replace(/^\s*\d+\. (.*$)/gm, '<li>$1</li>')
            
            // 处理链接
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
            
            // 处理换行和段落
            .replace(/\n\n/g, '</p><p>')
            
            // 处理代码块
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // 包装在段落中
        html = '<p>' + html + '</p>';
        
        // 处理多个连续的li标签，添加ul包装
        html = html.replace(/<li>[\s\S]*?<\/li>(?=[\s\S]*?<li>|$)/g, function(match) {
            return '<ul>' + match + '</ul>';
        });
        
        return html;
    }
}; 