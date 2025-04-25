// 首先导入并配置 Amplify
import { configureAmplify } from '/scripts/amplify-config.js';
// 确保 Amplify 在所有其他代码之前完成配置
configureAmplify();

// Import necessary modules using absolute paths and local references
import Header from '/modules/common/header.js';
import DifyAppUI from '../../common/dify-app-ui.js'; // Import the common UI class
import API from './api.js'; // Local API module (now decoupled from UI)
import { getCurrentUserSettings, getGlobalConfig } from '/scripts/services/storage.js';
import { t } from '/scripts/i18n.js';
import { marked } from 'marked'; // Keep marked dependency for DifyAppUI

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

    // ADDED: Store the UI instance
    ui: null,

    /**
     * 初始化应用
     */
    async init() {
        // console.log('[RA Index] RequirementAnalysisApp.init() started.'); // REMOVE LOG
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
            // MODIFIED: Instantiate DifyAppUI and initialize
            if (typeof DifyAppUI === 'function') {
                this.ui = new DifyAppUI({ t, marked });
                this.ui.initUserInterface({
                    // Provide specific IDs for this app's HTML
                    inputElementId: 'requirement-description', 
                    inputErrorElementId: 'requirement-error' 
                });
            } else {
                console.error("DifyAppUI class not loaded correctly.");
                // Show a generic error on the page if UI cannot be initialized
                document.body.innerHTML = '<p style="color:red; padding: 20px;">Error loading UI components. Please refresh.</p>'; 
                return;
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
                 this.ui.showError(errorMsg); // Use this.ui
                 return;
             }
            // Endpoint validation (using the specific key)
            if (!globalConfig || !globalConfig.apiEndpoints || !globalConfig.apiEndpoints[DIFY_APP_API_KEY_NAME]) {
                const errorMsg = t('requirementAnalysis.apiEndpointMissing', { 
                    default: `无法获取 ${DIFY_APP_API_KEY_NAME} API 地址，请联系管理员检查全局配置。`,
                    key: DIFY_APP_API_KEY_NAME
                });
                this.ui.showError(errorMsg); // Use this.ui
                return;
            }

            // 设置状态
            this.state.apiKey = userSettings.apiKeys[DIFY_APP_API_KEY_NAME];
            this.state.apiEndpoint = globalConfig.apiEndpoints[DIFY_APP_API_KEY_NAME]; // Use the specific endpoint
            this.state.currentUser = Header.currentUser;
            
            // 获取应用信息 (via local API module)
            this.fetchAppInformation();
            
            // console.log('[RA Index] Calling bindEvents()...'); // REMOVE LOG
            // 绑定事件 (handlers will call UI and API methods)
            this.bindEvents();

        } catch (error) {
            console.error("Error initializing Requirement Analysis App:", error);
            const initErrorMsg = t('requirementAnalysis.initError', { default: '初始化应用时出错，请刷新页面重试。' });
            // Try using this.ui.showError if available, otherwise fallback
            if (this.ui && typeof this.ui.showError === 'function') {
                this.ui.showError(initErrorMsg);
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
        
        // Define callbacks for API.fetchAppInfo
        const callbacks = {
            onLoading: () => this.ui.showLoading(),
            onError: (msg) => this.ui.showError(msg),
            onAppInfo: (info) => {
                if (info) {
                    this.state.appInfo = info;
                    this.ui.displayAppInfo(info);
                } else {
                    // Handle case where info might be null/undefined after error
                    this.ui.displayAppInfo({}); // Show default placeholders
                }
            }
        };

        try {
            // Call the local API module to fetch info, passing callbacks
            await API.fetchAppInfo(this.state.apiKey, this.state.apiEndpoint, callbacks);
            // No need to handle info directly here, callback does it
        } catch (error) {
            // Error should be handled within API.fetchAppInfo via callbacks
            console.error("[Index] Failed to fetch app info wrapper:", error);
            // Ensure UI is in a reasonable state if error escapes
             if (this.ui && this.ui.hideLoading) this.ui.hideLoading(); 
        }
    },
    
    /**
     * 绑定所有事件监听器
     */
    bindEvents() {
        // console.log('[RA Index] bindEvents() called.'); // REMOVE LOG
        const generateButton = document.getElementById('generate-button'); // CORRECT ID
        const promptInput = document.getElementById('requirement-description');
        const clearFormButton = document.getElementById('clear-form');
        const copyResultButton = document.getElementById('copy-result');
        const expandTextareaButton = document.getElementById('expand-textarea');
        const retryButton = document.getElementById('retry-connection'); // For API errors
        const toggleSystemInfoButton = document.getElementById('toggle-system-info');

        // --- Event Listeners --- 
        if (promptInput) {
            promptInput.addEventListener('input', () => {
                 // Use this.ui
                 if (this.ui && typeof this.ui.handleInput === 'function') {
                     this.ui.handleInput(promptInput.value);
                 } else {
                     const generateBtn = document.getElementById('generate-button');
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
            retryButton.addEventListener('click', () => {
                 this.ui.hideError(); // Use this.ui
                 this.fetchAppInformation(); 
            }); 
        }

        if (toggleSystemInfoButton) {
             // Use this.ui
             toggleSystemInfoButton.addEventListener('click', () => { if (this.ui) this.ui.toggleSystemInfo(); });
         }
    },
    
    /**
     * 处理生成请求
     */
    async handleGenerate(prompt) {
        // Validation
        if (!prompt) {
             // Use this.ui
             this.ui.showInputError('requirement', t('requirementAnalysis.error.requirementRequired', { default: '需求描述不能为空。' }));
             return;
         }
        if (prompt.length > 5000) { // Example length check
             // Use this.ui
              this.ui.showInputError('requirement', t('requirementAnalysis.error.requirementTooLong', { default: '需求描述不能超过5000字符。' }));
             return;
         }
        
        // Use this.ui
        this.ui.clearInputError('requirement');
        // UI state updates will be handled by callbacks now
        // REMOVED: UI.setRequestingState(); 
        this.state.isGenerating = true;
        this.state.currentConversationId = null; // Reset conversation for new generation
        this.state.currentMessageId = null; // Reset message ID

        // --- Define Callbacks for API.generateAnalysis --- 
        const callbacks = {
            onRequesting: () => this.ui.setRequestingState(),
            onGenerating: () => this.ui.setGeneratingState(),
            onStopping: () => this.ui.setStoppingState(), // Define even if stop handled separately
            onComplete: () => { // Called on success, error, or abort
                this.state.isGenerating = false;
                this.state.currentMessageId = null;
                this.ui.showGenerationCompleted();
                // ADDED: Render final markdown content
                this.ui.renderMarkdown(); 
            },
            onStats: (metadata) => this.ui.displayStats(metadata),
            onStreamChunk: (chunk) => this.ui.appendStreamContent(chunk),
            onSystemInfo: (data) => this.ui.displaySystemInfo(data),
            onStopMessage: () => this.ui.showStopMessage(),
            onErrorInResult: (msg) => this.ui.showErrorInResult(msg),
            onMessageIdReceived: (id) => { this.state.currentMessageId = id; },
            onConversationIdReceived: (id) => { this.state.currentConversationId = id; },
            // Added callbacks needed by the decoupled API
            onClearResult: () => this.ui.clearResultArea(),
            onShowResultContainer: () => this.ui.showResultContainer(),
        };
        // --- End Callbacks --- 

        try {
            // Call the local API module method, passing callbacks
            const result = await API.generateAnalysis(
                prompt,
                this.state.apiKey,
                this.state.apiEndpoint,
                this.state.currentUser,
                this.state.currentConversationId, // Pass null to start new
                callbacks // Pass the callbacks object
            );
            
            // Conversation ID is now updated via callback
            // if (result && result.conversationId) {
            //    this.state.currentConversationId = result.conversationId;
            // }

        } catch (error) {
            // Errors should be primarily handled via the onErrorInResult callback now.
            // This catch block is a fallback.
            console.error("[Index] Error during handleGenerate call (should have been handled by callback):", error);
            if (this.state.isGenerating) {
                 // Ensure state is reset if error wasn't handled by onComplete callback
                 callbacks.onComplete(); 
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
             // UI state updates handled by callbacks now
             // REMOVED: UI.setStoppingState(); 
             
             // --- Define Callbacks for API.stopGeneration --- 
             const callbacks = {
                 onStopping: () => this.ui.setStoppingState(),
                 onComplete: () => {
                     this.state.isGenerating = false;
                     this.state.currentMessageId = null;
                     this.ui.showGenerationCompleted();
                     // ADDED: Render markdown in case stream was aborted mid-render
                     this.ui.renderMarkdown(); 
                 },
                 onStopMessage: () => this.ui.showStopMessage(),
                 onError: (msg) => { 
                     // Decide how to show stop errors, maybe a toast?
                     console.error("Stop Generation Error:", msg);
                     this.ui.showToast(msg, 'error'); 
                 }
             };
             // --- End Callbacks --- 

             // Call the local API module method, passing callbacks
             await API.stopGeneration(
                 this.state.currentMessageId,
                 this.state.apiKey,
                 this.state.apiEndpoint,
                 this.state.currentUser,
                 callbacks // Pass callbacks
             );
             // API module's finally block or abort handler calls callbacks.onComplete
         } catch (error) {
             // Errors should be handled by onError callback now
             console.error("[Index] Error during stopGeneration call (should have been handled by callback):", error);
             // Ensure state reset as fallback
             if (this.state.isGenerating) {
                 callbacks.onComplete();
             }
         } 
    },
    
    /**
     * 清空表单
     */
    handleClearForm() {
        // Delegate to UI module
        if (this.ui && typeof this.ui.clearForm === 'function') {
            this.ui.clearForm();
        }
    },
    
    /**
     * 复制结果
     */
    handleCopyResult() {
        // Delegate to UI module
        if (this.ui && typeof this.ui.copyResult === 'function') {
            this.ui.copyResult();
        }
    },
    
    /**
     * 切换文本框放大/缩小
     */
    toggleTextareaExpand() {
        // Delegate to UI module
        if (this.ui && typeof this.ui.toggleTextareaExpand === 'function') {
            this.ui.toggleTextareaExpand();
        }
    }
};

// 在DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    RequirementAnalysisApp.init();
});

// 导出主应用对象 (可选, 但良好实践)
export default RequirementAnalysisApp;