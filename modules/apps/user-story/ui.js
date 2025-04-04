/**
 * EVYD产品经理AI工作台 - User Story生成器
 * UI交互模块
 */

// 引用不再需要import

// UI交互模块
const UI = {
    /**
     * 初始化用户界面
     */
    initUserInterface() {
        const currentUser = Auth.checkAuth();
        
        if (currentUser) {
            // 用户已登录
            document.getElementById('login-button').style.display = 'none';
            document.getElementById('user-info').style.display = 'flex';
            document.getElementById('username-display').textContent = currentUser.username;
            
            // 管理员特权
            if (currentUser.role === 'admin') {
                document.getElementById('admin-panel-link').style.display = 'block';
            } else {
                document.getElementById('admin-panel-link').style.display = 'none';
            }
        } else {
            // 用户未登录
            document.getElementById('login-button').style.display = 'block';
            document.getElementById('user-info').style.display = 'none';
            document.getElementById('admin-panel-link').style.display = 'none';
        }
    },
    
    /**
     * 显示加载状态
     */
    showLoading() {
        document.getElementById('app-info-loading').style.display = 'flex';
        document.getElementById('app-info-error').style.display = 'none';
        document.getElementById('app-info').style.display = 'none';
        document.getElementById('app-form').style.display = 'none';
    },
    
    /**
     * 显示错误信息
     */
    showError(message) {
        document.getElementById('app-info-loading').style.display = 'none';
        document.getElementById('app-info-error').style.display = 'flex';
        document.getElementById('error-message').textContent = message;
    },
    
    /**
     * 显示应用信息
     */
    displayAppInfo(appInfo) {
        // 隐藏加载状态
        document.getElementById('app-info-loading').style.display = 'none';
        
        // 显示应用信息
        document.getElementById('app-info').style.display = 'block';
        document.getElementById('app-name').textContent = appInfo.name || '未命名应用';
        document.getElementById('app-description').textContent = appInfo.description || '无描述';
        
        // 显示标签
        const tagsContainer = document.getElementById('app-tags');
        tagsContainer.innerHTML = '';
        
        if (appInfo.tags && appInfo.tags.length > 0) {
            appInfo.tags.forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.className = 'app-tag';
                tagEl.textContent = tag;
                tagsContainer.appendChild(tagEl);
            });
        }
        
        // 显示表单
        document.getElementById('app-form').style.display = 'block';
    },
    
    /**
     * 显示生成开始状态
     */
    showGenerationStarted() {
        document.getElementById('result-container').style.display = 'block';
        document.getElementById('result-stats').style.display = 'none';
        
        // 初始化两个内容显示区域
        document.getElementById('result-content').innerHTML = '正在生成...<span class="cursor"></span>';
        document.getElementById('result-content').style.display = 'block';
        
        // 隐藏Markdown内容区域
        if (document.getElementById('result-content-markdown')) {
            document.getElementById('result-content-markdown').style.display = 'none';
            document.getElementById('result-content-markdown').innerHTML = '';
        }
        
        // 隐藏系统信息区域，待有数据时再显示
        document.getElementById('system-info-container').style.display = 'none';
        document.getElementById('system-info-content').innerHTML = '';
        
        // 更新按钮状态 - 将生成按钮变为带进度条的停止按钮（保持蓝色背景）
        const generateButton = document.getElementById('generate-story');
        generateButton.disabled = false;
        
        // 使用更明显的红色加载动画
        generateButton.innerHTML = '<div class="loading-circle-container"><div class="loading-circle" style="border-color: #ff3333; border-top-color: transparent;"></div></div> 生成中...点击停止';
        generateButton.setAttribute('data-action', 'stop');
        // 保持使用primary样式，确保文字可见
        
        // 隐藏原有的停止生成按钮
        document.getElementById('stop-generation').style.display = 'none';
    },
    
    /**
     * 显示生成完成状态
     */
    showGenerationCompleted() {
        const generateButton = document.getElementById('generate-story');
        generateButton.disabled = false;
        generateButton.innerHTML = '生成 User Story';
        generateButton.setAttribute('data-action', 'generate');
        // 确保恢复为原来的样式
        generateButton.classList.remove('btn-danger', 'btn-secondary');
        generateButton.classList.add('btn-primary');
        
        // 隐藏停止按钮
        document.getElementById('stop-generation').style.display = 'none';
    },
    
    /**
     * 显示任务统计数据
     */
    displayTaskStats(taskData) {
        console.log('解析任务统计数据:', taskData);
        
        // 获取数据
        const elapsedTime = taskData.elapsed_time || 0;
        const totalSteps = taskData.total_steps || 0;
        const totalTokens = taskData.total_tokens || 0;
        
        console.log('准备显示的统计数据:', {
            elapsedTime,
            totalSteps,
            totalTokens
        });
        
        // 检查DOM元素是否存在
        const elapsedTimeElement = document.getElementById('elapsed-time');
        const totalStepsElement = document.getElementById('total-steps');
        const totalTokensElement = document.getElementById('total-tokens');
        
        if (!elapsedTimeElement || !totalStepsElement || !totalTokensElement) {
            console.error('统计数据DOM元素不存在');
            return;
        }
        
        // 更新UI
        elapsedTimeElement.textContent = `${Number(elapsedTime).toFixed(2)}秒`;
        totalStepsElement.textContent = totalSteps;
        totalTokensElement.textContent = totalTokens;
        
        // 确保统计区域可见
        const statsContainer = document.getElementById('result-stats');
        if (statsContainer) {
            console.log('显示统计区域');
            statsContainer.style.display = 'flex';
        } else {
            console.error('找不到统计区域元素');
        }
    },
    
    /**
     * 显示任务统计获取失败
     */
    showTaskStatsFailed() {
        const statsContainer = document.getElementById('result-stats');
        statsContainer.style.display = 'flex';
        document.getElementById('elapsed-time').textContent = '获取失败';
        document.getElementById('total-steps').textContent = '获取失败';
        document.getElementById('total-tokens').textContent = '获取失败';
    },
    
    /**
     * 加载用户资料
     */
    loadUserProfile() {
        const currentUser = Auth.checkAuth();
        if (!currentUser) return;
        
        document.getElementById('profile-username').value = currentUser.username;
        document.getElementById('profile-role').value = currentUser.role === 'admin' ? '管理员' : '普通用户';
        
        // 格式化日期
        const createdDate = new Date(currentUser.created);
        const formattedDate = createdDate.toLocaleDateString('zh-CN', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        document.getElementById('profile-created').value = formattedDate;
    },
    
    /**
     * 加载用户API密钥
     */
    loadUserApiKeys() {
        const currentUser = Auth.checkAuth();
        if (!currentUser) return;
        
        document.getElementById('userStory-api-key').value = currentUser.apiKeys.userStory || '';
        document.getElementById('userManual-api-key').value = currentUser.apiKeys.userManual || '';
        document.getElementById('requirementsAnalysis-api-key').value = currentUser.apiKeys.requirementsAnalysis || '';
    },
    
    /**
     * 显示表单消息
     * @param {string} elementId 消息元素ID
     * @param {string} message 消息内容
     * @param {string} type 消息类型 (error/success/warning/info)
     */
    showFormMessage(elementId, message, type) {
        const messageElement = document.getElementById(elementId);
        if (!messageElement) {
            console.error(`找不到消息元素: ${elementId}`);
            return;
        }
        
        messageElement.textContent = message;
        messageElement.className = 'form-message ' + type;
    }
};

// 不再导出模块 