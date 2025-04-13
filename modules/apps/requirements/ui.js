/**
 * EVYD产品经理AI工作台 - 需求分析工具
 * UI交互模块
 */

// UI交互模块
const UI = {
    /**
     * 初始化界面元素
     */
    init() {
        // 获取DOM元素引用等
        this.requirementInput = document.getElementById('requirement-text');
        this.resultArea = document.getElementById('result-area');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.messageArea = document.getElementById('message-area');
        this.appInfoContainer = document.getElementById('app-info');
        this.analyzeButton = document.getElementById('analyze-requirements');
        
        // 初始化用户设置面板（如果需要）
        this.initSettingsPanel();
        // ... 其他初始化逻辑
    },
    
    /**
     * 初始化用户设置面板
     */
    initSettingsPanel() {
        // 例如：绑定保存按钮事件等
        // const saveSettingsButton = document.getElementById('save-settings');
        // if (saveSettingsButton) {
        //     saveSettingsButton.addEventListener('click', () => {
        //         // 保存设置逻辑
        //     });
        // }
    },
    
    /**
     * 显示加载状态
     */
    showLoadingState() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'block';
        }
        if (this.analyzeButton) {
            this.analyzeButton.disabled = true;
        }
    },
    
    /**
     * 隐藏加载状态
     */
    hideLoadingState() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
        if (this.analyzeButton) {
            this.analyzeButton.disabled = false;
        }
    },
    
    /**
     * 显示消息
     * @param {string} type 消息类型 ('success', 'error', 'info')
     * @param {string} message 消息内容
     */
    showMessage(type, message) {
        if (this.messageArea) {
            this.messageArea.textContent = message;
            this.messageArea.className = `message message-${type}`; // Set class for styling
            this.messageArea.style.display = 'block';
            // Optionally hide after a delay
            setTimeout(() => {
                this.messageArea.style.display = 'none';
            }, 5000); 
        }
    },
    
    /**
     * 显示分析结果
     * @param {any} result API返回的分析结果
     */
    displayResult(result) {
        if (this.resultArea) {
            // Clear previous result
            this.resultArea.innerHTML = '';
            // Format and display the result (this depends on the API response structure)
            const pre = document.createElement('pre');
            pre.textContent = JSON.stringify(result, null, 2);
            this.resultArea.appendChild(pre);
            this.resultArea.style.display = 'block';
        }
    },
    
    /**
     * 更新应用信息显示
     * @param {object} data 应用信息对象
     */
    updateAppInfo(data) {
        if (this.appInfoContainer) {
            // Update name, description, tags etc.
            const nameEl = this.appInfoContainer.querySelector('#app-name');
            const descEl = this.appInfoContainer.querySelector('#app-description');
            // ... update other elements ...
            if(nameEl) nameEl.textContent = data.name || '需求分析工具';
            if(descEl) descEl.textContent = data.description || '智能分析产品需求文本';
            // Show the container
            this.appInfoContainer.style.display = 'block';
        }
    },
    
    /**
    * 显示登录提示
    */
    showLoginPrompt() {
        // Hide the main form/content
        const appForm = document.getElementById('app-form');
        if (appForm) appForm.style.display = 'none';
        // Show a login message or redirect
        const loginPrompt = document.getElementById('login-prompt'); // Assuming an element exists
        if (loginPrompt) {
            loginPrompt.style.display = 'block';
            // You might want to add a link/button to the login page here
        } else {
            // Fallback if the prompt element doesn't exist
            this.showMessage('info', '请先登录以使用此功能。');
        }
    }
};

export default UI; 