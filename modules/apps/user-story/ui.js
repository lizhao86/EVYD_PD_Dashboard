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
        document.getElementById('user-story-form').style.display = 'none';
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
        document.getElementById('user-story-form').style.display = 'block';
    },
    
    /**
     * 显示生成开始状态
     */
    showGenerationStarted() {
        document.getElementById('result-container').style.display = 'block';
        document.getElementById('result-stats').style.display = 'none';
        document.getElementById('result-content').innerHTML = '正在生成...<span class="cursor"></span>';
        
        // 更新按钮状态
        const generateButton = document.getElementById('generate-story');
        generateButton.disabled = true;
        generateButton.innerHTML = '<span class="loading-spinner"></span> 生成中...';
        
        document.getElementById('stop-generation').style.display = 'block';
    },
    
    /**
     * 显示生成完成状态
     */
    showGenerationCompleted() {
        const generateButton = document.getElementById('generate-story');
        generateButton.disabled = false;
        generateButton.innerHTML = '生成 User Story';
        
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
        
        // 更新UI
        document.getElementById('elapsed-time').textContent = `${Number(elapsedTime).toFixed(2)}秒`;
        document.getElementById('total-steps').textContent = totalSteps;
        document.getElementById('total-tokens').textContent = totalTokens;
        
        document.getElementById('result-stats').style.display = 'flex';
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