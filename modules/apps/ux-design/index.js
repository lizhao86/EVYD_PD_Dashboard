/**
 * EVYD产品经理AI工作台 - UX 界面设计(POC)
 * 模块入口文件
 */

// 首先导入并配置 Amplify
import { configureAmplify } from '/scripts/amplify-config.js';

// 确保 Amplify 在所有其他代码之前完成配置
configureAmplify();

// Import necessary modules
import Header from '/modules/common/header.js';
// REMOVED: import UI from './ui.js';
import DifyAppUI from '../../common/dify-app-ui.js'; // Import common UI
import API from './api.js'; // API module specific to UX Design
import { getCurrentUserSettings, getGlobalConfig } from '/scripts/services/storage.js';
import { t } from '/scripts/i18n.js';
import { marked } from 'marked'; // Keep for DifyAppUI

// Specific key for UX Design API in settings
const DIFY_APP_API_KEY_NAME = 'uxDesign';

// 命名空间
const UXDesignApp = {
    // 全局状态
    state: {
        apiKey: null,
        apiEndpoint: null,
        currentUser: null,
        appInfo: null,
        currentConversationId: null, // Store conversation ID for continuous chat
        currentMessageId: null, // Store message ID for stopping
        isGenerating: false,
        startTime: null
    },
    
    // ADDED: Store UI instance
    ui: null,
    
    /**
     * 初始化应用
     */
    async init() {
        // 首先等待Header初始化
        await Header.init();
        
        // 检查用户登录状态
        if (!Header.currentUser) {
             // MODIFIED: Use this.ui if available, otherwise fallback
             if (this.ui) {
                 this.ui.showError(t('uxDesign.notLoggedIn', { default: '请先登录以使用此功能。' }));
             } else {
                 // Fallback if UI hasn't initialized yet
                 const errorContainer = document.getElementById('app-info-error');
                 const errorMessageEl = document.getElementById('error-message');
                 if (errorContainer && errorMessageEl) {
                     errorMessageEl.textContent = t('uxDesign.notLoggedIn', { default: '请先登录以使用此功能。' });
                     errorContainer.style.display = 'block';
                     document.getElementById('app-info-loading').style.display = 'none';
                 }
             }
            return;
        }

        try {
            // Initialize UI elements
            // MODIFIED: Instantiate DifyAppUI
            if (typeof DifyAppUI === 'function') {
                this.ui = new DifyAppUI({ t, marked });
                 this.ui.initUserInterface({
                     // Specify correct input/error IDs for ux-design.html
                     inputElementId: 'requirement-description', 
                     inputErrorElementId: 'requirement-error' 
                 });
            } else {
                console.error("DifyAppUI class not loaded correctly for UX Design.");
                document.body.innerHTML = '<p style="color:red; padding: 20px;">Error loading UI components. Please refresh.</p>'; 
                return;
            }

            // 加载配置
            const userSettings = Header.userSettings || await getCurrentUserSettings();
            const globalConfig = await getGlobalConfig();
            
             if (!userSettings || !userSettings.apiKeys || !userSettings.apiKeys[DIFY_APP_API_KEY_NAME]) {
                const errorMsg = t('uxDesign.apiKeyMissingError', {
                    default: `未能找到 ${DIFY_APP_API_KEY_NAME} 的 API 密钥，请在管理员面板配置。`,
                    key: DIFY_APP_API_KEY_NAME
                });
                this.ui.showError(errorMsg); // Use this.ui
                return;
            }
            
            if (!globalConfig || !globalConfig.apiEndpoints || !globalConfig.apiEndpoints[DIFY_APP_API_KEY_NAME]) {
                const errorMsg = t('uxDesign.apiEndpointMissing', {
                    default: `未能获取 ${DIFY_APP_API_KEY_NAME} API 地址，请联系管理员检查全局配置。`,
                    key: DIFY_APP_API_KEY_NAME
                });
                 this.ui.showError(errorMsg); // Use this.ui
                 return;
             }
            
            // 设置API配置
            this.state.apiKey = userSettings.apiKeys[DIFY_APP_API_KEY_NAME];
            this.state.apiEndpoint = globalConfig.apiEndpoints[DIFY_APP_API_KEY_NAME];
            this.state.currentUser = Header.currentUser;
            
            // 获取应用信息
            this.fetchAppInformation();
            
            // 绑定事件
            this.bindEvents();
            
            // Initial UI state update (e.g., char count)
             const promptInput = document.getElementById('requirement-description');
             if (promptInput && this.ui) {
                 this.ui.handleInput(promptInput.value); // Update initial count/button state
             }
            
        } catch (error) {
            console.error("Error initializing UX Design App:", error);
            const initErrorMsg = t('uxDesign.initError', { default: '初始化应用时出错，请刷新页面重试。' });
             // Use this.ui
             if (this.ui && typeof this.ui.showError === 'function') {
                 this.ui.showError(initErrorMsg);
             }
        }
    },
    
    async fetchAppInformation() {
        if (!this.state.apiKey || !this.state.apiEndpoint) return;

        // --- Define Callbacks for API.fetchAppInfo --- 
        const callbacks = {
            onLoading: () => {
                // console.log("[Index UX] Callback: onLoading");
                if (this.ui) this.ui.showLoading();
            },
            onError: (msg) => {
                // console.log("[Index UX] Callback: onError");
                if (this.ui) this.ui.showError(msg);
            },
            onAppInfo: (info) => {
                // console.log("[Index UX] Callback: onAppInfo", info);
                if (info) {
                    this.state.appInfo = info;
                    if (this.ui) this.ui.displayAppInfo(info); 
                } else {
                    if (this.ui) this.ui.displayAppInfo({}); // Show empty/default info
                }
            }
        };
        // --- End Callbacks --- 

        try {
            await API.fetchAppInfo(this.state.apiKey, this.state.apiEndpoint, callbacks); // Pass callbacks
        } catch (error) {
            // Errors should be handled by the onError callback
            console.error("[Index UX] Failed to fetch app info wrapper (should have been handled by callback):", error);
             if (this.ui && this.ui.hideLoading) this.ui.hideLoading(); // Ensure loading is hidden on unexpected errors
        }
    },
    
    /**
     * 绑定所有事件
     */
    bindEvents() {
        // console.log('Binding UX Design events...');
        const generateButton = document.getElementById('generate-button');
        const promptInput = document.getElementById('requirement-description');
        const retryButton = document.getElementById('retry-connection'); // Add retry button binding

        if (promptInput) {
            promptInput.addEventListener('input', () => {
                 // MODIFIED: Use this.ui.handleInput
                 if (this.ui && typeof this.ui.handleInput === 'function') {
                     this.ui.handleInput(promptInput.value);
                 } else {
                     // Fallback if UI not ready (should not happen in normal flow)
                     console.warn("UI.handleInput not available during input event.")
                 }
            });
        }

        if (generateButton) {
            generateButton.addEventListener('click', async (e) => {
                e.preventDefault();
                const currentAction = generateButton.getAttribute('data-action');
                
                if (currentAction === 'stop') {
                    await this.stopGeneration(); 
                } else {
                    await this.handleGenerate(); 
                }
            });
        }
        
        // ADDED: Retry button event
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                this.fetchAppInformation(); // Re-fetch app info on click
            });
        }

        // Other standard UI bindings
        const clearFormButton = document.getElementById('clear-form');
        if (clearFormButton) {
            clearFormButton.addEventListener('click', this.handleClearForm.bind(this));
        }

        const copyResultButton = document.getElementById('copy-result');
        if (copyResultButton) {
            copyResultButton.addEventListener('click', this.handleCopyResult.bind(this));
        }

        const expandTextareaButton = document.getElementById('expand-textarea');
        if (expandTextareaButton) {
            expandTextareaButton.addEventListener('click', this.toggleTextareaExpand.bind(this));
        }
        
        const toggleSystemInfoButton = document.getElementById('toggle-system-info');
        if (toggleSystemInfoButton) {
            // MODIFIED: Use this.ui
            toggleSystemInfoButton.addEventListener('click', () => { if (this.ui) this.ui.toggleSystemInfo(); });
        }
    },
    
    // --- ADD Central handleGenerate Function --- 
    async handleGenerate() {
        const requirementInput = document.getElementById('requirement-description');
        const requirement = requirementInput.value.trim();

        if (!requirement) {
             // MODIFIED: Use this.ui for error
             this.ui.showInputError('requirement', t('uxDesign.error.requirementRequired', { default: '需求描述不能为空。' }));
             return;
         }
        if (requirement.length > 5000) {
              // MODIFIED: Use this.ui for error
              this.ui.showInputError('requirement', t('uxDesign.error.requirementTooLong', { default: '需求描述不能超过5000字符。' }));
             return;
         }

        // MODIFIED: Use this.ui
        this.ui.clearInputError('requirement');
        // REMOVED: Direct UI state updates, handled by callbacks
        this.state.isGenerating = true;
        this.state.startTime = Date.now();
        // Keep conversation ID if exists for potential continuous chat
        // this.state.currentConversationId = null; 
        this.state.currentMessageId = null;

        // --- Define Callbacks for API.generatePrompt --- 
        const callbacks = {
            onRequesting: () => this.ui.setRequestingState(),
            onGenerating: () => this.ui.setGeneratingState(),
            onStopping: () => this.ui.setStoppingState(),
            onComplete: () => {
                this.state.isGenerating = false;
                this.state.currentMessageId = null;
                this.state.startTime = null;
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
            onClearResult: () => this.ui.clearResultArea(),
            onShowResultContainer: () => this.ui.showResultContainer(),
        };
        // --- End Callbacks --- 

        try {
            const result = await API.generatePrompt( // Use correct API method name
                requirement,
                this.state.apiKey,
                this.state.apiEndpoint,
                this.state.currentUser,
                this.state.currentConversationId,
                callbacks // Pass callbacks
            );
             // Conversation ID updated via callback

        } catch (error) {
            // Errors handled by callbacks
             console.error("[Index UX] Error during handleGenerate call (should have been handled by callback):", error);
             if (this.state.isGenerating) {
                 // Ensure UI is reset if an unexpected error occurs outside the API
                 callbacks.onComplete(); 
             }
        }
    },
    
    // --- ADD Central stopGeneration Function --- 
    async stopGeneration() {
         // console.log("Handling stop generation request (UX)...");
         if (!this.state.isGenerating || !this.state.currentMessageId) {
             console.warn("Stop request ignored (UX): Not generating or no message ID.");
             return;
         }
         try {
            // REMOVED: Direct UI state update
            
             // --- Define Callbacks for API.stopGeneration --- 
             const callbacks = {
                 onStopping: () => this.ui.setStoppingState(),
                 onComplete: () => {
                     this.state.isGenerating = false;
                     this.state.currentMessageId = null;
                     this.state.startTime = null;
                     this.ui.showGenerationCompleted();
                      // ADDED: Render markdown on stop
                     this.ui.renderMarkdown();
                 },
                 onStopMessage: () => this.ui.showStopMessage(),
                 onError: (msg) => { 
                     console.error("Stop Generation Error (UX):", msg);
                     this.ui.showToast(msg, 'error'); 
                 }
             };
             // --- End Callbacks --- 

            await API.stopGeneration(
                this.state.currentMessageId,
                this.state.apiKey,
                this.state.apiEndpoint,
                this.state.currentUser,
                callbacks // Pass callbacks
            );
        } catch (error) {
            // Errors handled by callbacks
             console.error("[Index UX] Error during stopGeneration call (should have been handled by callback):", error);
             if (this.state.isGenerating) {
                  // Ensure UI is reset if an unexpected error occurs outside the API
                 callbacks.onComplete();
             }
        }
    },
    
    /**
     * 复制结果
     */
    handleCopyResult() {
        // MODIFIED: Delegate to this.ui
        if (this.ui && typeof this.ui.copyResult === 'function') {
            this.ui.copyResult();
        }
    },
    
    /**
     * 清空表单
     */
    handleClearForm() {
         // MODIFIED: Delegate to this.ui
         if (this.ui && typeof this.ui.clearForm === 'function') {
             this.ui.clearForm();
         }
    },
    
    /**
     * 切换文本框放大状态
     */
    toggleTextareaExpand() {
        // MODIFIED: Delegate to this.ui
        if (this.ui && typeof this.ui.toggleTextareaExpand === 'function') {
            this.ui.toggleTextareaExpand();
        }
    }
};

// 在DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    UXDesignApp.init();
}); 

// --- ADD EXPORT --- 
export default UXDesignApp; 