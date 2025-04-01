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
        
        // 清空结果内容
        const resultContent = document.getElementById('result-content');
        resultContent.innerHTML = '';
        
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
                    
                    // 处理任务ID
                    if (data.task_id && !taskId) {
                        taskId = data.task_id;
                        // 使用全局作用域
                        window.userStoryTaskId = taskId;
                        console.log('已捕获任务ID:', taskId);
                    } else if (data.id && !taskId) {
                        taskId = data.id;
                        window.userStoryTaskId = taskId;
                        console.log('已捕获任务ID(id字段):', taskId);
                    } else if (data.workflow_task_id && !taskId) {
                        taskId = data.workflow_task_id;
                        window.userStoryTaskId = taskId;
                        console.log('已捕获任务ID(workflow_task_id字段):', taskId);
                    }
                    
                    // 处理不同类型的响应
                    if (data.event === 'message' && data.answer) {
                        result += data.answer;
                        resultContent.textContent = result;
                    } 
                    else if (data.output && data.output.text) {
                        result += data.output.text;
                        resultContent.textContent = result;
                    }
                    else if (data.event === 'node_finished' && data.data && data.data.outputs) {
                        const outputText = data.data.outputs.text || JSON.stringify(data.data.outputs);
                        if (outputText) {
                            result += outputText;
                            resultContent.textContent = result;
                        }
                    }
                    
                    // 自动滚动到底部
                    resultContent.scrollTop = resultContent.scrollHeight;
                } catch (e) {
                    console.error('解析数据失败:', line, e);
                }
            }
        }
        
        // 完成后获取任务详情
        if (taskId) {
            console.log('生成完成，等待1秒后获取统计信息...');
            setTimeout(() => {
                this.fetchTaskDetails(taskId);
            }, 1000);
        } else {
            console.log('未获取到任务ID，无法获取统计信息');
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
            if (data.result === 'success') {
                // 添加停止提示
                document.getElementById('result-content').innerHTML += '<br><br><i>(已停止生成)</i>';
            }
        } catch (error) {
            console.error('停止生成失败:', error, '请求URL:', stopUrl);
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
            console.log('获取到的任务详情:', taskData);
            
            UI.displayTaskStats(taskData);
        } catch (error) {
            console.error('获取任务详情失败:', error.message);
            UI.showTaskStatsFailed();
        }
    }
}; 