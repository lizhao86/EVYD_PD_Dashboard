/**
 * UX 界面设计API相关功能
 */

// 全局变量
let currentController = null; // 当前的AbortController，用于停止流
let startTime = 0; // 开始时间
let totalTokens = 0; // 总Token数
let totalSteps = 0; // 总步骤数
let taskId = null; // 当前任务ID

/**
 * 获取UX设计应用信息
 * @returns {Promise<Object>} 应用信息
 */
async function getAppInfo() {
    try {
        // 获取API地址和密钥
        const apiBaseUrl = await getApiBaseUrl('uxDesign');
        const apiKey = await getApiKey('uxDesign');
        
        if (!apiBaseUrl || !apiKey) {
            throw new Error('API地址或密钥未配置，请在管理面板中配置。');
        }
        
        const response = await fetch(`${apiBaseUrl}/info`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('获取应用信息失败:', error);
        throw error;
    }
}

/**
 * 获取应用参数
 * @returns {Promise<Object>} 应用参数
 */
async function getAppParameters() {
    try {
        // 获取API地址和密钥
        const apiBaseUrl = await getApiBaseUrl('uxDesign');
        const apiKey = await getApiKey('uxDesign');
        
        if (!apiBaseUrl || !apiKey) {
            throw new Error('API地址或密钥未配置，请在管理面板中配置。');
        }
        
        const response = await fetch(`${apiBaseUrl}/parameters`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('获取应用参数失败:', error);
        throw error;
    }
}

/**
 * 生成UX界面设计提示词
 * @param {string} requirementDescription - 需求描述
 * @returns {Promise<void>}
 */
async function generateDesignPrompt(requirementDescription) {
    try {
        // 重置计数器
        startTime = Date.now();
        totalTokens = 0;
        totalSteps = 0;
        
        // 获取API地址和密钥
        const apiBaseUrl = await getApiBaseUrl('uxDesign');
        const apiKey = await getApiKey('uxDesign');
        
        if (!apiBaseUrl || !apiKey) {
            throw new Error('API地址或密钥未配置，请在管理面板中配置。');
        }
        
        // 获取用户信息
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('用户未登录，请先登录。');
        }
        
        // 创建AbortController用于停止流
        currentController = new AbortController();
        const signal = currentController.signal;
        
        // 准备请求数据
        const requestData = {
            query: requirementDescription,
            user: user.username,
            inputs: {},
            response_mode: 'streaming',
            conversation_id: '',
            auto_generate_name: true
        };
        
        // 发送请求
        const response = await fetch(`${apiBaseUrl}/chat-messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData),
            signal: signal
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API请求失败: ${errorData.message || response.statusText}`);
        }
        
        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // 处理接收到的数据块
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    try {
                        const json = JSON.parse(data);
                        handleStreamEvent(json);
                        
                        if (json.event === 'message') {
                            fullContent += json.answer || '';
                            // 提取任务ID，用于停止生成
                            if (json.task_id && !taskId) {
                                taskId = json.task_id;
                            }
                        } else if (json.event === 'message_end') {
                            // 处理流结束事件
                            if (json.metadata && json.metadata.usage) {
                                totalTokens = json.metadata.usage.total_tokens || 0;
                            }
                            // 计算耗时
                            const elapsedTime = Math.round((Date.now() - startTime) / 1000);
                            
                            // 更新统计信息
                            window.UXDesignUI.updateStats({
                                elapsedTime,
                                totalSteps,
                                totalTokens
                            });
                            
                            // 重置生成按钮
                            const generateButton = document.getElementById('generate-manual');
                            if (generateButton) {
                                window.UXDesignUI.resetGenerateButton(generateButton);
                            }
                            
                            // 显示为Markdown
                            window.UXDesignUI.updateResultContent(fullContent, true);
                        }
                    } catch (e) {
                        console.error('处理事件数据失败:', e);
                    }
                }
            }
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('操作已取消');
        } else {
            console.error('生成失败:', error);
            window.UXDesignUI.showError(error.message);
            
            // 重置生成按钮
            const generateButton = document.getElementById('generate-manual');
            if (generateButton) {
                window.UXDesignUI.resetGenerateButton(generateButton);
            }
        }
    } finally {
        currentController = null;
        taskId = null;
    }
}

/**
 * 处理流事件
 * @param {Object} event - 事件对象
 */
function handleStreamEvent(event) {
    if (event.event === 'message') {
        // 更新聊天内容
        if (event.answer) {
            window.UXDesignUI.appendStreamContent(event.answer);
        }
        totalSteps++;
    } else if (event.event === 'error') {
        console.error('流错误:', event.error);
        window.UXDesignUI.showError(event.error);
    }
}

/**
 * 停止生成流
 */
async function stopStream() {
    if (currentController) {
        currentController.abort();
    }
    
    if (taskId) {
        try {
            // 获取API地址和密钥
            const apiBaseUrl = await getApiBaseUrl('uxDesign');
            const apiKey = await getApiKey('uxDesign');
            
            if (!apiBaseUrl || !apiKey) {
                throw new Error('API地址或密钥未配置');
            }
            
            // 获取用户信息
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('用户未登录');
            }
            
            // 发送停止请求
            const response = await fetch(`${apiBaseUrl}/chat-messages/${taskId}/stop`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user: user.username })
            });
            
            if (!response.ok) {
                throw new Error('停止生成失败');
            }
        } catch (error) {
            console.error('停止生成失败:', error);
        }
    }
}

/**
 * 获取API地址
 * @param {string} type - API类型
 * @returns {Promise<string>} API地址
 */
async function getApiBaseUrl(type) {
    return Storage.getGlobalConfig().apiEndpoints[type] || '';
}

/**
 * 获取API密钥
 * @param {string} type - API类型
 * @returns {Promise<string>} API密钥
 */
async function getApiKey(type) {
    const currentUser = await getCurrentUser();
    return currentUser ? (currentUser.apiKeys[type] || '') : '';
}

/**
 * 获取当前登录用户
 * @returns {Promise<Object>} 用户信息
 */
async function getCurrentUser() {
    return Auth.checkAuth();
}

// 导出API函数
window.UXDesignAPI = {
    getAppInfo,
    getAppParameters,
    generateDesignPrompt,
    stopStream
}; 