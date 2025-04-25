/**
 * EVYD产品经理AI工作台 - User Story生成器
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
import API from './api.js'; // API module specific to User Story
import { getCurrentUserSettings, getGlobalConfig } from '/scripts/services/storage.js';
import { t } from '/scripts/i18n.js';
import { marked } from 'marked'; // Keep for DifyAppUI

// Specific key for User Story API in settings
const DIFY_APP_API_KEY_NAME = 'userStory';

// 命名空间
const UserStoryApp = {
    // 全局状态
    state: {
        apiKey: null,
        apiEndpoint: null,
        currentUser: null,
        appInfo: null,
        currentConversationId: null, // Store conversation ID for continuous chat
        currentMessageId: null, // Store message ID for stopping
        isGenerating: false,
        startTime: null,
        // REMOVED: abortGeneration: false, // Removed, handled by AbortController in API
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
                 this.ui.showError(t('userStory.notLoggedIn', { default: '请先登录以使用此功能。' }));
             } else {
                 // Fallback if UI hasn't initialized yet
                 const errorContainer = document.getElementById('app-info-error');
                 const errorMessageEl = document.getElementById('error-message');
                 if (errorContainer && errorMessageEl) {
                     errorMessageEl.textContent = t('userStory.notLoggedIn', { default: '请先登录以使用此功能。' });
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
                     // Specify correct input/error IDs for the main textarea
                     inputElementId: 'requirement-description', 
                     inputErrorElementId: 'requirement-error' 
                     // Error handling for other inputs will be done manually
                 });
            } else {
                console.error("DifyAppUI class not loaded correctly for User Story.");
                document.body.innerHTML = '<p style="color:red; padding: 20px;">Error loading UI components. Please refresh.</p>'; 
                return;
            }

            // 加载配置
            const userSettings = Header.userSettings || await getCurrentUserSettings();
            const globalConfig = await getGlobalConfig();
            
             if (!userSettings || !userSettings.apiKeys || !userSettings.apiKeys[DIFY_APP_API_KEY_NAME]) {
                const errorMsg = t('userStory.apiKeyMissingError', {
                    default: `未能找到 ${DIFY_APP_API_KEY_NAME} 的 API 密钥，请在管理员面板配置。`,
                    key: DIFY_APP_API_KEY_NAME
                });
                this.ui.showError(errorMsg); // Use this.ui
                return;
            }
            
            if (!globalConfig || !globalConfig.apiEndpoints || !globalConfig.apiEndpoints[DIFY_APP_API_KEY_NAME]) {
                const errorMsg = t('userStory.apiEndpointMissing', {
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
            
            // Initial UI state update for main textarea
             const requirementInput = document.getElementById('requirement-description');
             if (requirementInput && this.ui) {
                 this.ui.handleInput(requirementInput.value); // Update initial count/button state
             }
            
        } catch (error) {
            console.error("Error initializing User Story App:", error);
            const initErrorMsg = t('userStory.initError', { default: '初始化应用时出错，请刷新页面重试。' });
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
                if (this.ui) this.ui.showLoading();
            },
            onError: (msg) => {
                if (this.ui) this.ui.showError(msg);
            },
            onAppInfo: (info) => {
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
            console.error("[Index US] Failed to fetch app info wrapper (should have been handled by callback):", error);
             if (this.ui && this.ui.hideLoading) this.ui.hideLoading(); // Ensure loading is hidden on unexpected errors
        }
    },
    
    /**
     * 绑定所有事件
     */
    bindEvents() {
        const generateButton = document.getElementById('generate-button');
        const retryButton = document.getElementById('retry-connection');
        const clearFormButton = document.getElementById('clear-form');
        const copyResultButton = document.getElementById('copy-result');
        const expandTextareaButton = document.getElementById('expand-textarea');
        const toggleSystemInfoButton = document.getElementById('toggle-system-info');

        // Input fields
        const platformInput = document.getElementById('platform-name');
        const systemInput = document.getElementById('system-name');
        const moduleInput = document.getElementById('module-name');
        const requirementInput = document.getElementById('requirement-description');

        // --- Bind Main Textarea Input --- 
        if (requirementInput) {
            requirementInput.addEventListener('input', () => {
                 // MODIFIED: Use this.ui.handleInput for char count and button state
                 if (this.ui) {
                      this.ui.handleInput(requirementInput.value);
                      this.ui.clearInputError('requirement'); // Clear specific error on input
                 }
            });
        }
        
        // --- Bind Extra Input Fields to Clear Errors --- 
        const setupInputListener = (inputId) => {
            const inputElement = document.getElementById(inputId);
            if (inputElement && this.ui) {
                inputElement.addEventListener('input', () => {
                    this.ui.clearInputError(inputId);
                });
            }
        };
        setupInputListener('platform-name');
        setupInputListener('system-name');
        setupInputListener('module-name');
        // --- End Extra Input Bindings --- 

        // --- Bind Generate/Stop Button --- 
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
        
        // --- Bind Retry Button --- 
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                this.fetchAppInformation(); 
            });
        }

        // --- Bind Other Buttons (delegating to UI) --- 
        if (clearFormButton) {
            clearFormButton.addEventListener('click', this.handleClearForm.bind(this));
        }
        if (copyResultButton) {
            copyResultButton.addEventListener('click', this.handleCopyResult.bind(this));
        }
        if (expandTextareaButton) {
            expandTextareaButton.addEventListener('click', this.toggleTextareaExpand.bind(this));
        }
        if (toggleSystemInfoButton) {
            toggleSystemInfoButton.addEventListener('click', () => { if (this.ui) this.ui.toggleSystemInfo(); });
        }
    },
    
    // --- ADD Central handleGenerate Function --- 
    async handleGenerate() {
        // Get all input values
        const platformInput = document.getElementById('platform-name');
        const systemInput = document.getElementById('system-name');
        const moduleInput = document.getElementById('module-name');
        const requirementInput = document.getElementById('requirement-description');

        const platformName = platformInput.value.trim();
        const systemName = systemInput.value.trim();
        const moduleName = moduleInput.value.trim();
        const requirementDescription = requirementInput.value.trim();
        
        // Validation
        let isValid = true;
        // Clear previous errors
        this.ui.clearInputError('platform-name');
        this.ui.clearInputError('system-name');
        this.ui.clearInputError('module-name');
        this.ui.clearInputError('requirement-description'); // Use hyphenated ID

        if (!platformName) {
            this.ui.showInputError('platform-name', t('userStory.error.platformRequired', { default: '平台名称不能为空。' }));
            isValid = false;
        }
        if (!systemName) {
            this.ui.showInputError('system-name', t('userStory.error.systemRequired', { default: '系统名称不能为空。' }));
            isValid = false;
        }
        if (!moduleName) {
            this.ui.showInputError('module-name', t('userStory.error.moduleRequired', { default: '模块名称不能为空。' }));
            isValid = false;
        }
        if (!requirementDescription) {
            this.ui.showInputError('requirement-description', t('userStory.error.requirementRequired', { default: '需求描述不能为空。' }));
            isValid = false;
        }
        if (requirementDescription.length > 5000) {
             this.ui.showInputError('requirement-description', t('userStory.error.requirementTooLong', { default: '需求描述不能超过5000字符。' }));
             isValid = false;
         }

        if (!isValid) return;

        // Update state and prepare for API call
        this.state.isGenerating = true;
        this.state.startTime = Date.now();
        this.state.currentMessageId = null;
        // Do NOT reset conversationId here to allow follow-up messages

        // --- Define Callbacks for API.generateUserStory --- 
        const callbacks = {
            onRequesting: () => this.ui.setRequestingState(),
            onGenerating: () => this.ui.setGeneratingState(),
            onStopping: () => this.ui.setStoppingState(),
            onComplete: () => {
                this.state.isGenerating = false;
                this.state.currentMessageId = null;
                this.state.startTime = null;
                this.ui.showGenerationCompleted();
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
            const result = await API.generateUserStory(
                platformName,
                systemName,
                moduleName,
                requirementDescription,
                this.state.apiKey,
                this.state.apiEndpoint,
                this.state.currentUser,
                this.state.currentConversationId,
                callbacks // Pass callbacks
            );
             // Conversation ID updated via callback

        } catch (error) {
            // Errors handled by callbacks
             console.error("[Index US] Error during handleGenerate call (should have been handled by callback):", error);
             if (this.state.isGenerating) {
                 callbacks.onComplete(); 
             }
        }
    },
    
    // --- ADD Central stopGeneration Function --- 
    async stopGeneration() {
         if (!this.state.isGenerating || !this.state.currentMessageId) {
             console.warn("Stop request ignored (US): Not generating or no message ID.");
             return;
         }
         try {
             // --- Define Callbacks for API.stopGeneration --- 
             const callbacks = {
                 onStopping: () => this.ui.setStoppingState(),
                 onComplete: () => {
                     this.state.isGenerating = false;
                     this.state.currentMessageId = null;
                     this.state.startTime = null;
                     this.ui.showGenerationCompleted();
                     this.ui.renderMarkdown(); // Render markdown on stop
                 },
                 onStopMessage: () => this.ui.showStopMessage(),
                 onError: (msg) => { 
                     console.error("Stop Generation Error (US):", msg);
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
             console.error("[Index US] Error during stopGeneration call (should have been handled by callback):", error);
             if (this.state.isGenerating) {
                 callbacks.onComplete();
             }
        }
    },
    
    /**
     * 复制结果
     */
    handleCopyResult() {
        // MODIFIED: Delegate to this.ui
        if (this.ui) {
            this.ui.copyResult();
        }
    },
    
    /**
     * 清空表单 (Modified to clear all fields)
     */
    handleClearForm() {
         if (this.ui) {
             // Call the UI clearForm which handles the main textarea and result area
             this.ui.clearForm();
             
             // Manually clear the extra input fields
             const platformInput = document.getElementById('platform-name');
             const systemInput = document.getElementById('system-name');
             const moduleInput = document.getElementById('module-name');
             if (platformInput) platformInput.value = '';
             if (systemInput) systemInput.value = '';
             if (moduleInput) moduleInput.value = '';
             
             // Clear any errors associated with these fields
             this.ui.clearInputError('platform-name');
             this.ui.clearInputError('system-name');
             this.ui.clearInputError('module-name');
         }
    },
    
    /**
     * 切换文本框放大状态
     */
    toggleTextareaExpand() {
        // MODIFIED: Delegate to this.ui
        if (this.ui) {
            this.ui.toggleTextareaExpand();
        }
    }
};

// 在DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    UserStoryApp.init();
}); 

// --- ADD EXPORT --- 
export default UserStoryApp; 