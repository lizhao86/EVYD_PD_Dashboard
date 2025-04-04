/**
 * EVYD产品经理AI工作台 - User Manual生成器
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
        
        const apiKey = currentUser.apiKeys.userManual;
        if (!apiKey) {
            UI.showError('未配置API密钥，请联系管理员为您的账户配置User Manual的API密钥。');
            return;
        }
        
        const globalConfig = Config.getGlobalConfig();
        const apiEndpoint = globalConfig.apiEndpoints.userManual;
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
                data.name = 'User Manual 生成器';
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
                    name: 'User Manual 生成器（离线模式）',
                    description: '无法连接到Dify API，但您仍可以尝试使用该功能。',
                    tags: ['离线模式']
                });
            }
        }
    },
    
    /**
     * 生成User Manual
     */
    async generateUserManual(requirement) {
        // 清除之前的任务ID
        UserManualApp.state.currentMessageId = null;
        UserManualApp.state.currentConversationId = null;
        
        const currentUser = Auth.checkAuth();
        if (!currentUser) return;
        
        const apiKey = currentUser.apiKeys.userManual;
        if (!apiKey) {
            alert('未配置API密钥，请联系管理员配置您的API密钥。');
            return;
        }
        
        const globalConfig = Config.getGlobalConfig();
        const apiEndpoint = globalConfig.apiEndpoints.userManual;
        
        // 处理API基础URL
        const baseUrl = Utils.getApiBaseUrl(apiEndpoint);
        const chatUrl = `${baseUrl}/chat-messages`;
        
        // 显示结果区域和生成状态
        UI.showGenerationStarted();
        
        try {
            // 准备请求数据
            const requestData = {
                query: requirement,
                inputs: {},
                response_mode: "streaming",
                conversation_id: "",
                user: currentUser.username,
                files: [],
                auto_generate_name: true
            };
            
            console.log('发送的数据:', requestData);
            
            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
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
            if (!UserManualApp.state.currentMessageId) {
                console.log('生成已完成，无需清除任务ID');
            } else {
                console.log('生成异常结束，清除任务ID:', UserManualApp.state.currentMessageId);
                UserManualApp.state.currentMessageId = null;
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
        let messageId = null;
        let conversationId = null;
        let usageInfo = {};
        let startTime = Date.now();
        
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
            let lines = chunk.split('\n\n');
            
            for (let line of lines) {
                if (!line.trim()) continue;
                
                // 检查是否为SSE格式
                if (line.startsWith('data: ')) {
                    line = line.substring(6); // 移除'data: '前缀
                }
                
                try {
                    const data = JSON.parse(line);
                    console.log('解析的数据:', data);
                    
                    // 收集消息ID和会话ID
                    if (data.message_id && !messageId) {
                        messageId = data.message_id;
                        UserManualApp.state.currentMessageId = messageId;
                        console.log('已捕获消息ID:', messageId);
                    }
                    
                    if (data.conversation_id && !conversationId) {
                        conversationId = data.conversation_id;
                        UserManualApp.state.currentConversationId = conversationId;
                        console.log('已捕获会话ID:', conversationId);
                    }
                    
                    // 处理不同类型的事件
                    if (data.event === 'message') {
                        // 处理文本消息
                        result += data.answer || '';
                        resultContent.textContent = result;
                        
                        // 如果存在markdown容器，也更新它
                        const markdownDiv = document.getElementById('result-content-markdown');
                        if (markdownDiv) {
                            markdownDiv.innerHTML = this.convertMarkdownToHtml(result);
                            markdownDiv.style.display = 'block';
                            resultContent.style.display = 'none';
                        }
                    } else if (data.event === 'message_end') {
                        // 处理消息结束事件
                        console.log('消息结束，元数据:', data.metadata);
                        
                        if (data.metadata && data.metadata.usage) {
                            usageInfo = data.metadata.usage;
                            console.log('使用统计:', usageInfo);
                            
                            // 显示系统信息
                            systemInfoContainer.style.display = 'block';
                            systemInfoContent.textContent = JSON.stringify(data.metadata, null, 2);
                            
                            // 计算耗时和显示统计信息
                            const endTime = Date.now();
                            const elapsedTime = (endTime - startTime) / 1000; // 转换为秒
                            
                            UI.displayStats({
                                elapsed_time: elapsedTime,
                                total_tokens: usageInfo.total_tokens || 0,
                                total_steps: 1 // 对话型应用不计步骤，默认为1
                            });
                        }
                    } else if (data.event === 'error') {
                        // 处理错误事件
                        console.error('流式输出错误:', data);
                        resultContent.innerHTML += `<br><span style="color: red;">错误: ${data.error || '未知错误'}</span>`;
                    }
                    
                    // 自动滚动到底部
                    resultContent.scrollTop = resultContent.scrollHeight;
                    systemInfoContent.scrollTop = systemInfoContent.scrollHeight;
                } catch (e) {
                    console.error('解析数据失败:', line, e);
                }
            }
        }
    },
    
    /**
     * 停止生成
     */
    async stopGeneration(messageId) {
        const currentUser = Auth.checkAuth();
        if (!currentUser || !messageId) return;
        
        const apiKey = currentUser.apiKeys.userManual;
        const globalConfig = Config.getGlobalConfig();
        const apiEndpoint = globalConfig.apiEndpoints.userManual;
        
        // 处理API基础URL
        const baseUrl = Utils.getApiBaseUrl(apiEndpoint);
        const stopUrl = `${baseUrl}/chat-messages/${messageId}/stop`;
        
        try {
            console.log(`发送停止请求到: ${stopUrl}, messageId: ${messageId}`);
            
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
                UserManualApp.state.currentMessageId = null;
            }
        } catch (error) {
            console.error('停止生成失败:', error, '请求URL:', stopUrl);
            alert('停止生成失败: ' + error.message);
            
            // 即使失败也恢复UI状态
            UI.showGenerationCompleted();
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