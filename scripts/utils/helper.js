/**
 * EVYD产品经理AI工作台
 * 工具函数模块
 */

// 移除 Utils 对象包裹，直接导出函数

/**
 * 显示表单消息
 * @param {string} elementId 消息元素ID
 * @param {string} message 消息内容
 * @param {string} type 消息类型 (error/success/warning/info)
 */
export function showFormMessage(elementId, message, type) {
    const messageElement = document.getElementById(elementId);
    if (!messageElement) return;
    
    messageElement.textContent = message;
    messageElement.className = 'form-message ' + type;
}

/**
 * 处理API URL，避免重复/v1
 * @param {string} apiEndpoint API端点URL
 * @returns {string} 处理后的API基础URL
 */
export function getApiBaseUrl(apiEndpoint) {
    if (!apiEndpoint) return '';
    return apiEndpoint.endsWith('/v1') ? apiEndpoint : `${apiEndpoint}/v1`;
}

// 移除Utils对象和旧的导出注释 