/**
 * EVYD产品经理AI工作台 - 需求分析工具
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
        
        const apiKey = currentUser.apiKeys.requirementsAnalysis;
        if (!apiKey) {
            UI.showError('未配置API密钥，请联系管理员为您的账户配置需求分析工具的API密钥。');
            return;
        }
        
        const globalConfig = Config.getGlobalConfig();
        const apiEndpoint = globalConfig.apiEndpoints.requirementsAnalysis;
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
            const response = await fetch(infoUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API响应错误: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('应用信息:', data);
            
            // 更新UI显示应用信息
            UI.updateAppInfo(data);
            
            // 隐藏加载状态
            UI.hideLoading();
            
        } catch (error) {
            console.error('获取应用信息失败:', error);
            UI.showError(`获取应用信息失败: ${error.message}`);
            UI.hideLoading();
        }
    },
    
    /**
     * 分析需求
     * @param {string} requirementText 需求文本
     */
    async analyzeRequirements(requirementText) {
        // TODO: 实现需求分析API调用
        console.log('分析需求:', requirementText);
        
        // 模拟API调用，实际项目中需要替换为真实API
        UI.showLoading();
        
        setTimeout(() => {
            UI.hideLoading();
            UI.showMessage('需求分析功能正在开发中，敬请期待！', 'info');
        }, 1500);
    }
    
    // 其他API方法...
}; 