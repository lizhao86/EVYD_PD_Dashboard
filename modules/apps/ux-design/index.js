// 首先导入并配置 Amplify
import { configureAmplify } from '/scripts/amplify-config.js';
// 确保 Amplify 在所有其他代码之前完成配置
configureAmplify();

/**
 * EVYD产品经理AI工作台 - UX 界面设计(POC)
 * 模块入口文件 - 使用 BaseDifyApp
 */
import BaseDifyApp from '../../common/base-dify-app.js';
import { t } from '/scripts/i18n.js';

class UXDesignApp extends BaseDifyApp {
    constructor() {
        super();
        this.difyApiKeyName = 'uxDesign';
        this.difyMode = 'chat';
        // mainInputElementId and inputErrorElementId use defaults from BaseDifyApp
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
            this.ui.showInputError(errorElementId, t('uxDesign.error.requirementRequired', { default: '需求描述不能为空。' }));
            return null;
         }

        const maxLength = 5000; // Example max length
        if (value.length > maxLength) {
            this.ui.showInputError(errorElementId, t('uxDesign.error.requirementTooLong', {
                default: `需求描述不能超过 ${maxLength} 字符。`,
                maxLength: maxLength
            }));
            return null;
         }

        return { requirement: value }; // Use a descriptive key
    }

    /**
     * Builds the payload for the Dify Chat API.
     * @param {object} inputs - The validated input object from _gatherAndValidateInputs.
     * @returns {object} The payload object.
     */
    _buildPayload(inputs) {
        return {
            query: inputs.requirement,
            user: this.state.currentUser.username || 'unknown-user',
            response_mode: 'streaming',
            conversation_id: this.state.currentConversationId || undefined,
            inputs: {} // Include empty inputs object
        };
                 }

    // No specific events or callbacks needed for UX Design beyond base class
}

// Initialize the app after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new UXDesignApp();
    app.init();
}); 

export default UXDesignApp; 