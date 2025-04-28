// 首先导入并配置 Amplify
import { configureAmplify } from '/scripts/amplify-config.js';
// 确保 Amplify 在所有其他代码之前完成配置
configureAmplify();

/**
 * EVYD产品经理AI工作台 - User Manual生成器
 * 模块入口文件 - 使用 BaseDifyApp
 */
import BaseDifyApp from '../../common/base-dify-app.js';
import { t } from '/scripts/i18n.js'; // Keep t for translations

class UserManualApp extends BaseDifyApp {
    constructor() {
        super();
        this.difyApiKeyName = 'userManual';
        this.difyMode = 'chat'; // User Manual uses chat mode
        // Main input ID and error ID are defaults from BaseDifyApp
             }
            
    /**
     * Gathers input from the main textarea and validates it.
     * @returns {object | null} Object with { userStory: string } or null if invalid.
     */
    _gatherAndValidateInputs() {
        const inputElement = document.getElementById(this.mainInputElementId);
        const value = inputElement ? inputElement.value.trim() : '';
        const errorElementId = this.inputErrorElementId;

        this.ui.clearInputError(errorElementId);

        if (!value) {
            this.ui.showInputError(errorElementId, t('userManual.error.requirementRequired', { default: '需求描述不能为空。' }));
            return null;
         }

        const maxLength = 5000; // Example max length
        if (value.length > maxLength) {
            this.ui.showInputError(errorElementId, t('userManual.error.requirementTooLong', {
                default: `需求描述不能超过 ${maxLength} 字符。`,
                maxLength: maxLength
            }));
            return null;
         }

        return { userStory: value }; // Use a descriptive key for the input
    }

    /**
     * Builds the payload for the Dify Chat API.
     * @param {object} inputs - The validated input object from _gatherAndValidateInputs.
     * @returns {object} The payload object.
     */
    _buildPayload(inputs) {
        return {
            query: inputs.userStory, // Use the validated input
            user: this.state.currentUser.username || 'unknown-user',
            response_mode: 'streaming',
            conversation_id: this.state.currentConversationId || undefined, // Include conversation_id if available
            inputs: {} // Add empty inputs object as required by Dify
        };
         }
    
    // No specific events or callbacks needed for User Manual beyond base class
    // _bindSpecificEvents() { ... }
    // _getSpecificCallbacks() { ... }
        }

// Initialize the app after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new UserManualApp();
    app.init(); 
}); 

export default UserManualApp; 