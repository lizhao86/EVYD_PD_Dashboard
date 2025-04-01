/**
 * EVYD产品经理AI工作台
 * 全局配置模块
 */

// 全局配置模块
const Config = {
    /**
     * 获取全局配置
     * @returns {Object} 配置对象
     */
    getGlobalConfig() {
        console.log('获取全局配置...');
        const config = Storage.getGlobalConfig();
        console.log('从Storage获取的配置:', config);
        
        // 确保apiEndpoints属性存在
        if (!config.apiEndpoints) {
            console.log('apiEndpoints属性不存在，初始化默认值');
            config.apiEndpoints = {
                userStory: 'https://api.dify.ai/v1',
                userManual: 'https://api.dify.ai/v1',
                requirementsAnalysis: 'https://api.dify.ai/v1'
            };
            this.saveGlobalConfig(config);
        }
        
        return config;
    },
    
    /**
     * 保存全局配置
     * @param {Object} config 配置对象
     */
    saveGlobalConfig(config) {
        Storage.saveGlobalConfig(config);
    },
    
    /**
     * 更新API端点配置
     * @param {string} key 端点类型
     * @param {string} url 端点URL
     */
    updateApiEndpoint(key, url) {
        const config = this.getGlobalConfig();
        if (!config.apiEndpoints) {
            config.apiEndpoints = {};
        }
        config.apiEndpoints[key] = url;
        this.saveGlobalConfig(config);
    }
}; 