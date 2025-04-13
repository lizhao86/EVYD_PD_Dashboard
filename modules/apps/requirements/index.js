/**
 * EVYD产品经理AI工作台 - 需求分析工具
 * 模块入口文件
 */

// 命名空间
const RequirementsApp = {
    config: { // Default config, will be overwritten
        apiKey: null,
        apiEndpoint: null
    },
    currentUser: null, // Store user info
    appInfo: null, // Store app info from Dify

    // 全局状态
    state: {
        currentMessageId: null,
        currentConversationId: null
    },
    
    // 功能模块
    core: {},
    
    /**
     * 初始化应用
     */
    async init() {
        // console.log('初始化需求分析工具应用...');
        UI.init(); // Initialize UI elements first
        
        // Try to get header info first to check login status
        if (window.Header && Header.currentUser) {
            this.currentUser = Header.currentUser;
            // console.log('当前用户:', this.currentUser);
            
            // Load user settings or global config for API keys/endpoints
            // This part needs to be implemented based on how config is stored
            // Example: Load global config if available
            if (Header.userSettings && Header.userSettings.apiEndpoints && Header.userSettings.apiEndpoints.dify) {
                 this.config.apiKey = Header.userSettings.apiKeys?.dify || null;
                 this.config.apiEndpoint = Header.userSettings.apiEndpoints.dify || null;
            } else {
                 console.warn("User settings or Dify endpoint not found in header, API calls might fail.");
                 // Maybe load global config as fallback?
            }

            // console.log('用户已登录，获取应用信息');
            this.fetchAppInformation(); // Fetch app info after getting config
            this.bindEvents(); // Bind events only if logged in
        } else {
            // console.log('用户未登录，显示登录框');
            // Handle logged-out state (e.g., show login prompt or disable functionality)
            UI.showLoginPrompt(); 
        }
    },
    
    fetchAppInformation() {
        // Placeholder: Implement fetching app info from Dify API
        // using this.config.apiKey and this.config.apiEndpoint
        API.getAppInfo(this.config.apiKey, this.config.apiEndpoint)
            .then(info => {
                if (info) {
                    this.appInfo = info;
                    UI.updateAppInfo(info);
                }
            });
    },
    
    /**
     * 绑定事件处理器
     */
    bindEvents() {
        // console.log('绑定需求分析工具事件...');
        const analyzeButton = document.getElementById('analyze-requirements');
        if (analyzeButton) {
            analyzeButton.addEventListener('click', () => {
                this.handleAnalyze();
            });
        }
        // Add other event listeners as needed
    },
    
    /**
     * 处理需求分析
     */
    handleAnalyze() {
        // console.log('处理需求分析...');
        const requirementText = document.getElementById('requirement-text').value;
        if (!requirementText.trim()) {
            UI.showMessage('error', '请输入需求文本。');
            return;
        }

        UI.showLoadingState();
        // Placeholder: Call Dify API to analyze requirements
        API.analyzeRequirements(requirementText, this.config.apiKey, this.config.apiEndpoint, this.currentUser)
            .then(result => {
                UI.hideLoadingState();
                if (result) {
                    // Display the result
                    UI.displayResult(result);
                } else {
                    // Show error message if API call failed
                    UI.showMessage('error', '需求分析失败，请稍后重试。');
                }
            });
    }
    
    // 其他方法...
};

// Initialize the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    RequirementsApp.init();
});

export default RequirementsApp; 