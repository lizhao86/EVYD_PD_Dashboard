// 首先导入并配置 Amplify
import { configureAmplify } from '/scripts/amplify-config.js';
// 确保 Amplify 在所有其他代码之前完成配置
configureAmplify();

// Import necessary modules using absolute paths and local references
import Header from '/modules/common/header.js';
import UI from './ui.js'; // Local UI module
import API from './api.js'; // Local API module
import { getCurrentUserSettings, getGlobalConfig } from '/scripts/services/storage.js';
import { t } from '/scripts/i18n.js';
import { marked } from 'marked'; // Keep if needed by UI

// Specific key for Requirement Analysis API in settings
const DIFY_APP_API_KEY_NAME = 'requirementsAnalysis'; // Use this key to retrieve settings

// 命名空间
const RequirementAnalysisApp = {
    // 全局状态
    state: {
        apiKey: null,
        apiEndpoint: null,
        currentUser: null,
        appInfo: null,
        currentConversationId: null,
        currentMessageId: null, // Needed for stop functionality via API module
        isGenerating: false
    },

    /**
     * 初始化应用
     */
    async init() {
        try {
            // 首先等待Header初始化完成, header 会处理认证和用户设置加载
            await Header.init(); 

            // 检查用户登录状态 (Header.currentUser should be populated)
            if (!Header.currentUser) {
                // Redirect logic might be handled by header or main script, 
                // but we can show an error specific to this app page if needed.
                console.error('User not authenticated for Requirement Analysis App.');
                // Optionally, use UI module to show error if it's initialized
                // UI.showError(t('requirementAnalysis.notLoggedIn', { default: '请先登录以使用此功能。'}));
                // Or redirect
                window.location.href = '/index.html';
                return;
            }

            // 初始化UI (DOM element references, initial states)
            if (typeof UI.initUserInterface === 'function') {
                UI.initUserInterface();
            }

            // 加载和设置API配置
            // User settings should be available via Header.userSettings after Header.init()
            const userSettings = Header.userSettings || await getCurrentUserSettings(); 
            const globalConfig = await getGlobalConfig(); // Assuming global config is simple and can be fetched again
            
            // --- Key/Endpoint Validation --- 
            if (!userSettings || !userSettings.apiKeys || !userSettings.apiKeys[DIFY_APP_API_KEY_NAME]) {
                const errorMsg = t('requirementAnalysis.apiKeyMissingError', {
                     default: `未能找到 ${DIFY_APP_API_KEY_NAME} 的 API 密钥，请在管理员面板配置。`,
                     key: DIFY_APP_API_KEY_NAME
                 });
                UI.showError(errorMsg);
                return;
            }
            // Endpoint validation (using the specific key)
            if (!globalConfig || !globalConfig.apiEndpoints || !globalConfig.apiEndpoints[DIFY_APP_API_KEY_NAME]) {
                const errorMsg = t('requirementAnalysis.apiEndpointMissing', { 
                    default: `无法获取 ${DIFY_APP_API_KEY_NAME} API 地址，请联系管理员检查全局配置。`,
                    key: DIFY_APP_API_KEY_NAME
                });
                UI.showError(errorMsg);
                return;
            }

            // 设置状态
            this.state.apiKey = userSettings.apiKeys[DIFY_APP_API_KEY_NAME];
            this.state.apiEndpoint = globalConfig.apiEndpoints[DIFY_APP_API_KEY_NAME]; // Use the specific endpoint
            this.state.currentUser = Header.currentUser;
            
            // 获取应用信息 (via local API module)
            this.fetchAppInformation();
            
            // 绑定事件 (handlers will call UI and API methods)
            this.bindEvents();

        } catch (error) {
            console.error("Error initializing Requirement Analysis App:", error);
            const initErrorMsg = t('requirementAnalysis.initError', { default: '初始化应用时出错，请刷新页面重试。' });
            // Try using UI.showError if available, otherwise fallback
            if (typeof UI !== 'undefined' && UI.showError) {
                UI.showError(initErrorMsg);
            } else {
                alert(initErrorMsg); 
            }
        } finally {
             // Ensure content is visible after potential errors during init
             document.documentElement.classList.remove('i18n-loading'); 
             document.body.style.display = 'block';
        }
    },
    
    /**
     * 获取 Dify 应用信息
     */
    async fetchAppInformation() {
        if (!this.state.apiKey || !this.state.apiEndpoint) return; // Guard clause
        try {
            // Call the local API module to fetch info
            const info = await API.fetchAppInfo(this.state.apiKey, this.state.apiEndpoint);
            if (info) {
                this.state.appInfo = info;
                // UI responsibility to display info, possibly called from API.fetchAppInfo success
            }
        } catch (error) {
            // Error should be handled within API.fetchAppInfo or its UI calls
            console.error("[Index] Failed to fetch app info wrapper:", error);
        }
    },
    
    /**
     * 绑定所有事件监听器
     */
    bindEvents() {
        const generateButton = document.getElementById('generate-analysis');
        const stopButton = document.getElementById('stop-generation'); // Assumed ID for stop button
        const promptInput = document.getElementById('requirement-description');
        const clearFormButton = document.getElementById('clear-form');
        const copyResultButton = document.getElementById('copy-result');
        const expandTextareaButton = document.getElementById('expand-textarea');
        const retryButton = document.getElementById('retry-connection'); // For API errors
        const toggleSystemInfoButton = document.getElementById('toggle-system-info');

        // --- Event Listeners --- 
        if (promptInput) {
            promptInput.addEventListener('input', () => {
                if (typeof UI.handleInput === 'function') {
                     UI.handleInput(promptInput.value);
                } else {
                    // Basic fallback if UI module doesn't handle it
                    const generateBtn = document.getElementById('generate-analysis');
                    if(generateBtn) generateBtn.disabled = promptInput.value.trim().length === 0;
                }
            });
        }

        if (generateButton) {
            generateButton.addEventListener('click', async (e) => {
                e.preventDefault();
                const currentAction = generateButton.getAttribute('data-action');
                if (currentAction === 'stop' && this.state.isGenerating) {
                    await this.stopGeneration(); 
                } else if (currentAction === 'generate') {
                    await this.handleGenerate(promptInput.value.trim()); 
                }
            });
        }
        
        // Stop button (might be the same as generateButton when in stopping state)
        // Ensure we handle the stop action if a dedicated stop button exists
        if (stopButton && stopButton !== generateButton) {
            stopButton.addEventListener('click', async (e) => {
                 e.preventDefault();
                 if (this.state.isGenerating) {
                     await this.stopGeneration();
                 }
            });
        }        

        if (clearFormButton) {
            clearFormButton.addEventListener('click', this.handleClearForm.bind(this));
        }

        if (copyResultButton) {
            copyResultButton.addEventListener('click', this.handleCopyResult.bind(this));
        }

        if (expandTextareaButton) {
            expandTextareaButton.addEventListener('click', this.toggleTextareaExpand.bind(this));
        }

        if (retryButton) {
            // Retry loading app info if initial fetch failed
            retryButton.addEventListener('click', () => {
                 UI.hideError(); // Hide the error message
                 this.fetchAppInformation(); 
            }); 
        }

        if (toggleSystemInfoButton) {
            toggleSystemInfoButton.addEventListener('click', UI.toggleSystemInfo);
        }
    },
    
    /**
     * 处理生成请求
     */
    async handleGenerate(prompt) {
        // Validation
        if (!prompt) {
            UI.showInputError('requirement', t('requirementAnalysis.error.requirementRequired', { default: '需求描述不能为空。' }));
            return;
        }
        if (prompt.length > 5000) { // Example length check
             UI.showInputError('requirement', t('requirementAnalysis.error.requirementTooLong', { default: '需求描述不能超过5000字符。' }));
            return;
        }
        
        UI.clearInputError('requirement');
        UI.setRequestingState(); // Update UI to show loading/generating
        this.state.isGenerating = true;
        this.state.currentConversationId = null; // Reset conversation for new generation

        try {
            // Call the local API module method
            const result = await API.generateAnalysis(
                prompt,
                this.state.apiKey,
                this.state.apiEndpoint,
                this.state.currentUser,
                this.state.currentConversationId, // Pass null to start new
                // Callback for API module to update message ID
                (messageId) => { this.state.currentMessageId = messageId; }
            );
            
            // API.generateAnalysis is expected to handle the streaming response and UI updates.
            // It should set this.state.isGenerating = false upon completion or error.
             if (result && result.conversationId) {
                this.state.currentConversationId = result.conversationId;
             }
             // Completion state is set within API stream handler via UI call

        } catch (error) {
            // Error should be handled by API module and reflected in UI.
            console.error("[Index] Error during handleGenerate call:", error);
            this.state.isGenerating = false;
             // Ensure UI resets if error bubbles up unexpectedly
             if(typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                UI.showGenerationCompleted(); 
             }
        }
    },
    
    /**
     * 处理停止生成请求
     */
    async stopGeneration() {
         if (!this.state.isGenerating || !this.state.currentMessageId) {
             console.warn("Stop request ignored: Not generating or no message ID.");
             return;
         }
         try {
             UI.setStoppingState(); // Update UI to show stop attempt
             // Call the local API module method
             await API.stopGeneration(
                 this.state.currentMessageId,
                 this.state.apiKey,
                 this.state.apiEndpoint,
                 this.state.currentUser
             );
             // API/UI module handles showing the stop message/state.
         } catch (error) {
            // Error logged in API, UI should be updated there.
            console.error("[Index] Error during stopGeneration call:", error);
         } finally {
             // API module's stream handler or stopGeneration method should set isGenerating = false
             // and call UI.showGenerationCompleted()
             this.state.isGenerating = false; 
             this.state.currentMessageId = null;
             if(typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                UI.showGenerationCompleted(); // Ensure button resets just in case
             }
         }
    },
    
    /**
     * 清空表单
     */
    handleClearForm() {
        // Delegate to UI module
        if (typeof UI.clearForm === 'function') {
            UI.clearForm();
        }
    },
    
    /**
     * 复制结果
     */
    handleCopyResult() {
        // Delegate to UI module
        if (typeof UI.copyResult === 'function') {
            UI.copyResult();
        }
    },
    
    /**
     * 切换文本框放大/缩小
     */
    toggleTextareaExpand() {
        // Delegate to UI module
        if (typeof UI.toggleTextareaExpand === 'function') {
            UI.toggleTextareaExpand();
        }
    }
};

// 在DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    RequirementAnalysisApp.init();
});

// 导出主应用对象 (可选, 但良好实践)
export default RequirementAnalysisApp;