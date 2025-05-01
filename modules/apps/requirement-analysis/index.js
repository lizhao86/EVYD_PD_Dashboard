// 首先导入并配置 Amplify
import { configureAmplify } from '/scripts/amplify-config.js';
// 确保 Amplify 在所有其他代码之前完成配置
configureAmplify();

import BaseDifyApp from '../../common/base-dify-app.js';
import { t } from '/scripts/i18n.js';

class RequirementAnalysisApp extends BaseDifyApp {
    constructor() {
        super();
        this.difyApiKeyName = 'requirementsAnalysis';
        this.mainInputElementId = 'requirement-description';
        this.inputErrorElementId = 'requirement-error';
    }

    /**
     * Gathers input from the main textarea and validates it.
     * @returns {object | null} Object with { requirement: string } or null if invalid.
     */
    _gatherAndValidateInputs() {
        const inputElement = document.getElementById(this.mainInputElementId);
        const value = inputElement ? inputElement.value.trim() : '';
        const errorElementId = this.inputErrorElementId;

        this.ui.clearInputError(errorElementId);

        if (!value) {
            this.ui.showInputError(errorElementId, t('requirementAnalysis.error.requirementRequired', { default: '需求描述不能为空。' }));
            return null;
        }

        const maxLength = 5000; // Define max length
        if (value.length > maxLength) {
            this.ui.showInputError(errorElementId, t('requirementAnalysis.error.requirementTooLong', {
                default: `需求描述不能超过 ${maxLength} 字符。`,
                maxLength: maxLength
            }));
            return null;
        }

        return { requirement: value }; // Return validated input
    }

    /**
     * Builds the payload for the Dify Chat API.
     * @param {object} inputs - Validated input object from _gatherAndValidateInputs.
     * @returns {object} The payload object.
     */
    _buildPayload(inputs) {
        return {
            query: inputs.requirement,
            user: this.state.currentUser.username || 'unknown-user',
            response_mode: 'streaming',
            conversation_id: this.state.currentConversationId || undefined,
            inputs: {} // Ensure empty inputs object is present
        };
    }

    // No specific events or callbacks needed beyond base class
    
    /**
     * 绑定所有事件，包括重试连接按钮
     * 覆盖BaseDifyApp中的方法
     */
    bindEvents() {
        // 先调用父类的绑定方法
        super.bindEvents();
        
        // 绑定重试连接按钮
        const retryConnectionButton = document.getElementById('retry-connection');
        if (retryConnectionButton) {
            retryConnectionButton.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // 显示加载状态
                if (this.ui) this.ui.showLoading();
                
                // 尝试重新加载API配置
                try {
                    // 重新加载API配置
                    const success = await this._loadApiConfig();
                    
                    if (success) {
                        // 如果成功，尝试获取应用信息
                        await this._fetchAppInformation();
                    }
                
                } catch (error) {
                    if (this.ui) {
                        this.ui.hideLoading();
                        this.ui.showError(`重试连接时出错: ${error.message}`);
                    }
                }
            });
        } else {
            // console.warn("未找到重试连接按钮元素");
        }
    }
}

// Initialize the app after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new RequirementAnalysisApp();
    app.init();
});

export default RequirementAnalysisApp;