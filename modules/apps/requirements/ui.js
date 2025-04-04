/**
 * EVYD产品经理AI工作台 - 需求分析工具
 * UI交互模块
 */

// UI交互模块
const UI = {
    /**
     * 初始化用户界面
     */
    initUserInterface() {
        console.log('初始化需求分析工具界面...');
        
        // 初始化编辑器或其他UI组件
        
        // 初始化用户设置面板
        this.initUserSettingsPanel();
    },
    
    /**
     * 初始化用户设置面板
     */
    initUserSettingsPanel() {
        console.log('初始化用户设置面板...');
        
        const currentUser = Auth.checkAuth();
        if (!currentUser) return;
        
        // 设置API密钥
        const userStoryKey = document.getElementById('userStory-api-key');
        const userManualKey = document.getElementById('userManual-api-key');
        const requirementsAnalysisKey = document.getElementById('requirementsAnalysis-api-key');
        
        if (userStoryKey) {
            userStoryKey.value = currentUser.apiKeys.userStory || '';
        }
        
        if (userManualKey) {
            userManualKey.value = currentUser.apiKeys.userManual || '';
        }
        
        if (requirementsAnalysisKey) {
            requirementsAnalysisKey.value = currentUser.apiKeys.requirementsAnalysis || '';
        }
    },
    
    /**
     * 显示加载状态
     */
    showLoading() {
        console.log('显示加载状态...');
        
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    },
    
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        console.log('隐藏加载状态...');
        
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    },
    
    /**
     * 显示错误信息
     * @param {string} message 错误信息
     */
    showError(message) {
        console.error('错误:', message);
        
        this.showMessage(message, 'error');
    },
    
    /**
     * 显示消息
     * @param {string} message 消息内容
     * @param {string} type 消息类型 (success, error, info, warning)
     */
    showMessage(message, type = 'info') {
        console.log(`显示${type}消息:`, message);
        
        const messageContainer = document.getElementById('message-container');
        if (!messageContainer) {
            console.error('找不到消息容器');
            alert(message); // 降级处理
            return;
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${type}`;
        messageElement.textContent = message;
        
        // 添加关闭按钮
        const closeButton = document.createElement('span');
        closeButton.className = 'message-close';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = function() {
            messageContainer.removeChild(messageElement);
        };
        
        messageElement.appendChild(closeButton);
        messageContainer.appendChild(messageElement);
        
        // 5秒后自动关闭
        setTimeout(() => {
            if (messageElement.parentNode === messageContainer) {
                messageContainer.removeChild(messageElement);
            }
        }, 5000);
    },
    
    /**
     * 更新应用信息
     * @param {Object} data 应用信息数据
     */
    updateAppInfo(data) {
        console.log('更新应用信息:', data);
        
        const appName = document.getElementById('app-name');
        const appDescription = document.getElementById('app-description');
        
        if (appName && data.name) {
            appName.textContent = data.name;
        }
        
        if (appDescription && data.description) {
            appDescription.textContent = data.description;
        }
    }
    
    // 其他UI方法...
}; 