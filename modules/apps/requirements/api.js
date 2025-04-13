/**
 * EVYD产品经理AI工作台 - 需求分析工具
 * API交互模块
 */

// API交互模块
const API = {
    /**
     * 获取应用信息
     * @param {string} apiKey 
     * @param {string} apiEndpoint 
     */
    async getAppInfo(apiKey, apiEndpoint) {
        if (!apiKey || !apiEndpoint) {
            console.error("Missing API Key or Endpoint for getAppInfo");
            // UI.showError('缺少必要配置，无法获取应用信息。'); // Assuming UI module handles this
            return null;
        }
        const baseUrl = Utils.getApiBaseUrl(apiEndpoint);
        const infoUrl = `${baseUrl}/info`; // Adjust if Dify has a different info endpoint

        try {
            const response = await fetch(infoUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!response.ok) throw new Error(`Request failed: ${response.status}`);
            const data = await response.json();
            // console.log('应用信息:', data);
            return data;
        } catch (error) {
            console.error('获取应用信息失败:', error);
            // UI.showError(`获取应用信息失败: ${error.message}`);
            return null;
        }
    },

    /**
     * 分析需求文本
     * @param {string} requirementText 
     * @param {string} apiKey 
     * @param {string} apiEndpoint 
     * @param {object} user 
     */
    async analyzeRequirements(requirementText, apiKey, apiEndpoint, user) {
        if (!apiKey || !apiEndpoint || !user || !requirementText) {
            console.error("Missing parameters for analyzeRequirements");
            // UI.showError('缺少必要参数，无法分析需求。');
            return null;
        }
        const baseUrl = Utils.getApiBaseUrl(apiEndpoint);
        // Determine the correct Dify endpoint (Workflow run? Chat?)
        // Let's assume it's a workflow for now:
        const runUrl = `${baseUrl}/workflows/run`; 

        try {
            // Prepare the request data based on the workflow's expected inputs
            const requestData = {
                inputs: {
                    "requirement_text": requirementText // Adjust input name if needed
                },
                response_mode: "blocking", // Or "streaming" if needed
                user: user.username
            };
            // console.log('分析需求:', requirementText);
            const response = await fetch(runUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            if (!response.ok) throw new Error(`Request failed: ${response.status}`);
            const result = await response.json();
            // Potentially process the result further if needed
            return result;
        } catch (error) {
            console.error('需求分析 API 调用失败:', error);
            // UI.showError(`需求分析失败: ${error.message}`);
            return null;
        }
    }
};

export default API; 