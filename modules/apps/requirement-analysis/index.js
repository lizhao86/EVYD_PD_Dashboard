// 首先导入并配置 Amplify
import { configureAmplify } from '/scripts/amplify-config.js';
// 确保 Amplify 在所有其他代码之前完成配置
configureAmplify();

import BaseDifyApp from '../../common/base-dify-app.js';
import { t } from '/scripts/i18n.js';
import { getGlobalConfig, getCurrentUserApiKeys, getCurrentUserSettings } from '/scripts/services/storage.js';

class RequirementAnalysisApp extends BaseDifyApp {
    constructor() {
        super();
        this.difyApiKeyName = 'requirementsAnalysis';
        this.actualApiKeyId = 'app-Bc2Ac6RWr4xVKCPh8g5G'; // 从映射表中获取的实际ID
        this.difyMode = 'workflow';
        this.mainInputElementId = 'requirement-description';
        this.inputErrorElementId = 'requirement-error';
    }

    /**
     * 覆盖父类的_loadApiConfig方法，使用更直接的方式获取API配置
     */
    async _loadApiConfig() {
        // console.log(`[RequirementAnalysisApp] 使用直接方法获取API配置...`);
        // console.log(`当前difyApiKeyName: ${this.difyApiKeyName}, actualApiKeyId: ${this.actualApiKeyId}`);
        
        try {
            // 尝试获取GlobalConfig
            const globalConfig = await getGlobalConfig();
            // console.log(`获取到的全局配置:`, globalConfig);
            
            // 在这里我们可以直接访问Map中的API端点值
            let apiEndpoint = null;
            
            if (globalConfig instanceof Map) {
                // console.log("globalConfig是Map类型，包含以下键:");
                // [...globalConfig.keys()].forEach(key => console.log(`- ${key}`));
                
                for (const [key, value] of globalConfig.entries()) {
                    // console.log(`检查配置键: ${key} => ${value}`);
                    // 尝试所有可能的键名
                    if (key === this.difyApiKeyName || 
                        key === this.actualApiKeyId || 
                        key.includes('requirement') || 
                        key.includes('Requirement') ||
                        key.includes('Bc2A')) {
                        apiEndpoint = value;
                        // console.log(`找到匹配的API端点 ${key}: ${apiEndpoint}`);
                        break;
                    }
                }
            } else if (typeof globalConfig === 'object') {
                // console.log("globalConfig是对象类型，包含以下键:");
                // Object.keys(globalConfig).forEach(key => console.log(`- ${key}`));
                
                for (const key in globalConfig) {
                    // console.log(`检查配置键: ${key} => ${globalConfig[key]}`);
                    // 尝试所有可能的键名
                    if (key === this.difyApiKeyName || 
                        key === this.actualApiKeyId || 
                        key.includes('requirement') || 
                        key.includes('Requirement') ||
                        key.includes('Bc2A')) {
                        apiEndpoint = globalConfig[key];
                        // console.log(`找到匹配的API端点 ${key}: ${apiEndpoint}`);
                        break;
                    }
                }
            }
            
            // 如果没有找到端点，但globalConfig是对象而不是Map，尝试创建一个端点
            if (!apiEndpoint && typeof globalConfig === 'object') {
                // console.log("未找到端点，尝试使用默认API端点");
                // 默认的Dify端点，可以根据需要修改
                apiEndpoint = "https://api.dify.ai/v1";
                
                // 如果globalConfig没有apiEndpoints属性，创建一个
                if (!globalConfig.apiEndpoints) {
                    globalConfig.apiEndpoints = {};
                }
                
                // 将端点存储到globalConfig中
                globalConfig.apiEndpoints[this.difyApiKeyName] = apiEndpoint;
                // console.log(`已在globalConfig中创建API端点: ${this.difyApiKeyName} => ${apiEndpoint}`);
                
                // 注意：此处没有真正保存到数据库，只是内存中的设置
            }
            
            if (!apiEndpoint) {
                // console.error(`未找到API端点配置，显示所有可用的键:`);
                // if (globalConfig instanceof Map) {
                //     console.log([...globalConfig.keys()]);
                // } else if (typeof globalConfig === 'object') {
                //     console.log(Object.keys(globalConfig));
                // }
                throw new Error(`未找到 ${this.difyApiKeyName} 的API端点配置`);
            }
            
            // 设置API端点
            this.state.apiEndpoint = apiEndpoint;
            // console.log(`成功设置API端点: ${this.state.apiEndpoint}`);
            
            // 直接获取API密钥记录
            const apiKeys = await getCurrentUserApiKeys();
            
            // 输出更详细的API密钥记录信息
            // console.log(`获取到 ${apiKeys.length} 个API密钥记录:`); 
            // apiKeys.forEach((key, index) => {
            //     console.log(`API密钥 #${index+1}:`);
            //     console.log(`- applicationID: ${key.applicationID}`);
            //     console.log(`- ID: ${key.id}`);
            //     console.log(`- 拥有者: ${key.owner}`);
            //     const maskedKey = key.apiKey ? 
            //         key.apiKey.substring(0, 4) + '*'.repeat(key.apiKey.length - 8) + 
            //         key.apiKey.substring(key.apiKey.length - 4) : "无API密钥";
            //     console.log(`- API密钥(部分隐藏): ${maskedKey}`);
            // });
            
            // 非常宽松地查找匹配
            let apiKeyRecord = null;
            
            // 1. 尝试精确匹配actualApiKeyId
            apiKeyRecord = apiKeys.find(key => key.applicationID === this.actualApiKeyId);
            // if (apiKeyRecord) {
            //     console.log(`通过actualApiKeyId "${this.actualApiKeyId}" 找到精确匹配`);
            // }
            
            // 2. 尝试精确匹配difyApiKeyName
            if (!apiKeyRecord) {
                apiKeyRecord = apiKeys.find(key => key.applicationID === this.difyApiKeyName);
                // if (apiKeyRecord) {
                //     console.log(`通过difyApiKeyName "${this.difyApiKeyName}" 找到精确匹配`);
                // }
            }
            
            // 3. 非常宽松的匹配 - 包含特定关键词的任何记录
            if (!apiKeyRecord) {
                apiKeyRecord = apiKeys.find(key => 
                    key.applicationID && 
                    (key.applicationID.toLowerCase().includes('requirement') || 
                     key.applicationID.toLowerCase().includes('bc2a')));
                
                // if (apiKeyRecord) {
                //     console.log(`通过宽松匹配找到API密钥记录: ${apiKeyRecord.applicationID}`);
                // }
            }
            
            // 4. 如果还是找不到，使用第一个记录（作为最后的手段）
            if (!apiKeyRecord && apiKeys.length > 0) {
                apiKeyRecord = apiKeys[0];
                // console.log(`未找到精确匹配，使用第一个API密钥记录 ${apiKeyRecord.applicationID} 作为替代`);
            }
            
            // 如果完全找不到API密钥记录，尝试构造一个模拟记录
            if (!apiKeyRecord) {
                // console.log("未找到任何API密钥记录，尝试获取用户设置以手动创建一个");
                // 尝试获取用户设置
                const userSettings = await getCurrentUserSettings();
                
                if (userSettings) {
                    // 确保apiKeys存在
                    if (!userSettings.apiKeys) {
                        userSettings.apiKeys = {};
                    }
                    
                    // 检查是否有任何API密钥
                    const apiKeyExists = Object.keys(userSettings.apiKeys).length > 0;
                    
                    if (apiKeyExists) {
                        // 使用第一个可用的API密钥
                        const firstKey = Object.keys(userSettings.apiKeys)[0];
                        const firstValue = userSettings.apiKeys[firstKey];
                        
                        // console.log(`找到用户设置中的API密钥: ${firstKey}`);
                        
                        // 创建一个模拟记录
                        apiKeyRecord = {
                            applicationID: this.difyApiKeyName,
                            apiKey: firstValue,
                            id: 'manual-created'
                        };
                        
                        // console.log(`成功创建模拟API密钥记录: ${this.difyApiKeyName}`);
                    // } else {
                        // console.error("用户设置中没有任何API密钥");
                    }
                // } else {
                    // console.error("未能获取用户设置");
                }
            }
            
            if (!apiKeyRecord) {
                // console.error("经过所有尝试后，仍未找到或创建有效的API密钥记录");
                throw new Error(`未找到有效的API密钥记录，请在管理员面板配置`);
            }
            
            // 设置API密钥
            this.state.apiKey = apiKeyRecord.apiKey;
            // console.log(`成功设置API密钥，来自记录: ${apiKeyRecord.applicationID}`);
            
            // 添加到用户设置中
            try {
                const userSettings = await getCurrentUserSettings();
                if (userSettings) {
                    if (!userSettings.apiKeys) {
                        userSettings.apiKeys = {};
                    }
                    // 将获取到的API密钥保存到对应键名下
                    userSettings.apiKeys[this.difyApiKeyName] = apiKeyRecord.apiKey;
                    // console.log(`已将API密钥添加到用户设置: ${this.difyApiKeyName}`);
                    
                    // 注意：没有实际保存回数据库，只是内存中的修改
                }
            } catch (settingsError) {
                // console.error("添加API密钥到用户设置时出错:", settingsError);
                // 不影响整体流程，可以继续
            }
            
            return true;
            
        } catch (error) {
            // console.error(`[RequirementAnalysisApp] 加载API配置时出错:`, error);
            if (this.ui) {
                this.ui.showError(`加载API配置时出错: ${error.message}`);
            }
            return false;
        }
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
                // console.log("重试连接按钮被点击");
                
                // 显示加载状态
                if (this.ui) this.ui.showLoading();
                
                // 尝试重新加载API配置
                try {
                    // console.log("开始重新加载API配置...");
                    // console.log("当前difyApiKeyName:", this.difyApiKeyName);
                    // console.log("当前actualApiKeyId:", this.actualApiKeyId);
                    
                    // 重新加载API配置
                    const success = await this._loadApiConfig();
                    // console.log("API配置重新加载结果:", success ? "成功" : "失败");
                    
                    if (success) {
                        // 如果成功，尝试获取应用信息
                        await this._fetchAppInformation();
                    }
                
                } catch (error) {
                    // console.error("重试连接时出错:", error);
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