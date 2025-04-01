/**
 * EVYD产品经理AI工作台
 * 工具函数模块
 */

// 工具函数
const Utils = {
    /**
     * 显示表单消息
     * @param {string} elementId 消息元素ID
     * @param {string} message 消息内容
     * @param {string} type 消息类型 (error/success/warning/info)
     */
    showFormMessage(elementId, message, type) {
        const messageElement = document.getElementById(elementId);
        if (!messageElement) return;
        
        messageElement.textContent = message;
        messageElement.className = 'form-message ' + type;
    },
    
    /**
     * 处理API URL，避免重复/v1
     * @param {string} apiEndpoint API端点URL
     * @returns {string} 处理后的API基础URL
     */
    getApiBaseUrl(apiEndpoint) {
        if (!apiEndpoint) return '';
        return apiEndpoint.endsWith('/v1') ? apiEndpoint : `${apiEndpoint}/v1`;
    },
    
    /**
     * 生成UUID
     * @returns {string} UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    /**
     * 格式化日期
     * @param {string|Date} date 日期对象或日期字符串
     * @param {string} format 格式化模式 (默认: 'yyyy-MM-dd HH:mm:ss')
     * @returns {string} 格式化后的日期字符串
     */
    formatDate(date, format = 'yyyy-MM-dd HH:mm:ss') {
        const d = typeof date === 'string' ? new Date(date) : date;
        
        const replacements = {
            'yyyy': d.getFullYear(),
            'MM': String(d.getMonth() + 1).padStart(2, '0'),
            'dd': String(d.getDate()).padStart(2, '0'),
            'HH': String(d.getHours()).padStart(2, '0'),
            'mm': String(d.getMinutes()).padStart(2, '0'),
            'ss': String(d.getSeconds()).padStart(2, '0')
        };
        
        return format.replace(/yyyy|MM|dd|HH|mm|ss/g, match => replacements[match]);
    },
    
    /**
     * 防抖函数
     * @param {Function} func 要执行的函数
     * @param {number} wait 等待时间(ms)
     * @returns {Function} 防抖处理后的函数
     */
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    },
    
    /**
     * 节流函数
     * @param {Function} func 要执行的函数
     * @param {number} limit 时间限制(ms)
     * @returns {Function} 节流处理后的函数
     */
    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function(...args) {
            const context = this;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if (Date.now() - lastRan >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }
};

// 不再导出模块 