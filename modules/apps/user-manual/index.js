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
import { marked } from 'marked';
import Header from '/modules/common/header.js';
import { getCurrentUserApiKeys, getGlobalConfig } from '/scripts/services/storage.js';

class UserManualApp extends BaseDifyApp {
    constructor() {
        super();
        this.difyApiKeyName = 'userManual';
        this.actualApiKeyId = 'app-gZTVzLMWfXxPgDGySxwF'; // 从映射表中获取的实际ID
        this.difyMode = 'workflow';
        this.mainInputElementId = 'requirement-description';
        this.inputErrorElementId = 'requirement-error';
    }

    /**
     * 覆盖父类的_loadApiConfig方法，使用更直接的方式获取API配置
     */
    async _loadApiConfig() {
        console.log(`[UserManualApp] 使用直接方法获取API配置...`);
        
        try {
            // 尝试获取GlobalConfig
            const globalConfig = await getGlobalConfig();
            console.log(`获取到的全局配置:`, globalConfig);
            
            // 在这里我们可以直接访问Map中的API端点值
            let apiEndpoint = null;
            
            if (globalConfig instanceof Map) {
                for (const [key, value] of globalConfig.entries()) {
                    console.log(`检查配置键: ${key} => ${value}`);
                    // 尝试所有可能的键名
                    if (key === this.difyApiKeyName || 
                        key === this.actualApiKeyId || 
                        key.includes('manual') || 
                        key.includes('Manual')) {
                        apiEndpoint = value;
                        console.log(`找到匹配的API端点 ${key}: ${apiEndpoint}`);
                        break;
                    }
                }
            } else if (typeof globalConfig === 'object') {
                for (const key in globalConfig) {
                    console.log(`检查配置键: ${key} => ${globalConfig[key]}`);
                    // 尝试所有可能的键名
                    if (key === this.difyApiKeyName || 
                        key === this.actualApiKeyId || 
                        key.includes('manual') || 
                        key.includes('Manual')) {
                        apiEndpoint = globalConfig[key];
                        console.log(`找到匹配的API端点 ${key}: ${apiEndpoint}`);
                        break;
                    }
                }
            }
            
            if (!apiEndpoint) {
                console.error(`未找到API端点配置，显示所有可用的键:`);
                if (globalConfig instanceof Map) {
                    console.log([...globalConfig.keys()]);
                } else if (typeof globalConfig === 'object') {
                    console.log(Object.keys(globalConfig));
                }
                throw new Error(`未找到 ${this.difyApiKeyName} 的API端点配置`);
            }
            
            // 设置API端点
            this.state.apiEndpoint = apiEndpoint;
            console.log(`成功设置API端点: ${this.state.apiEndpoint}`);
            
            // 直接获取API密钥记录
            const apiKeys = await getCurrentUserApiKeys();
            console.log(`获取到 ${apiKeys.length} 个API密钥记录:`, 
                        apiKeys.map(k => ({id: k.id, appId: k.applicationID})));
            
            // 非常宽松地查找匹配
            let apiKeyRecord = null;
            
            // 1. 尝试精确匹配actualApiKeyId
            apiKeyRecord = apiKeys.find(key => key.applicationID === this.actualApiKeyId);
            
            // 2. 尝试精确匹配difyApiKeyName
            if (!apiKeyRecord) {
                apiKeyRecord = apiKeys.find(key => key.applicationID === this.difyApiKeyName);
            }
            
            // 3. 非常宽松的匹配 - 包含"manual"的任何记录
            if (!apiKeyRecord) {
                apiKeyRecord = apiKeys.find(key => 
                    key.applicationID && 
                    (key.applicationID.toLowerCase().includes('manual') || 
                     key.applicationID.toLowerCase().includes('gztv')));
            }
            
            // 4. 如果还是找不到，使用第一个记录（作为最后的手段）
            if (!apiKeyRecord && apiKeys.length > 0) {
                apiKeyRecord = apiKeys[0];
                console.log(`未找到精确匹配，使用第一个API密钥记录: ${apiKeyRecord.applicationID}`);
            }
            
            if (!apiKeyRecord) {
                throw new Error(`未找到有效的API密钥记录`);
            }
            
            // 设置API密钥
            this.state.apiKey = apiKeyRecord.apiKey;
            console.log(`成功设置API密钥，来自记录: ${apiKeyRecord.applicationID}`);
            
            return true;
            
        } catch (error) {
            console.error(`[UserManualApp] 加载API配置时出错:`, error);
            if (this.ui) {
                this.ui.showError(`加载API配置时出错: ${error.message}`);
            }
            return false;
        }
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