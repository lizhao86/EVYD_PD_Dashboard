/**
 * EVYD产品经理AI工作台 - User Manual生成器
 * 模块入口文件
 */

// 首先导入并配置 Amplify
import { configureAmplify } from '/scripts/amplify-config.js';

// 确保 Amplify 在所有其他代码之前完成配置
configureAmplify();

// Import necessary modules
import Header from '/modules/common/header.js';
import DifyAppUI from '../../common/dify-app-ui.js'; // Import common UI
import API from './api.js'; // API module specific to User Manual
import { getCurrentUserSettings, getGlobalConfig } from '/scripts/services/storage.js';
import { t } from '/scripts/i18n.js';
import { marked } from 'marked'; // Keep for DifyAppUI

// Specific key for User Manual API in settings
const DIFY_APP_API_KEY_NAME = 'userManual';

// 命名空间
const UserManualApp = {
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
            // Use this.ui
            this.ui.showError(t('userManual.notLoggedIn', { default: '请先登录以使用此功能。'}));
            return;
        }

        try {
            // Initialize UI elements
            // MODIFIED: Instantiate DifyAppUI
            if (typeof DifyAppUI === 'function') {
                this.ui = new DifyAppUI({ t, marked });
                this.ui.initUserInterface({
                    // Specify correct input/error IDs for user-manual.html
                    inputElementId: 'requirement-description', 
                    inputErrorElementId: 'requirement-error' 
                });
            } else {
                console.error("DifyAppUI class not loaded correctly for User Manual.");
                document.body.innerHTML = '<p style="color:red; padding: 20px;">Error loading UI components. Please refresh.</p>'; 
                return;
            }

            // 加载配置 - 使用与user-story相同的模式
            const userSettings = Header.userSettings || await getCurrentUserSettings();
            const globalConfig = await getGlobalConfig();
            
            if (!userSettings || !userSettings.apiKeys || !userSettings.apiKeys[DIFY_APP_API_KEY_NAME]) {
                const errorMsg = t('userManual.apiKeyMissingError', {
                    default: `未能找到 ${DIFY_APP_API_KEY_NAME} 的 API 密钥，请在管理员面板配置。`,
                    key: DIFY_APP_API_KEY_NAME
                });
                this.ui.showError(errorMsg); // Use this.ui
                return;
            }
            
            if (!globalConfig || !globalConfig.apiEndpoints || !globalConfig.apiEndpoints[DIFY_APP_API_KEY_NAME]) {
                const errorMsg = t('userManual.apiEndpointMissing', {
                    default: `未能获取 ${DIFY_APP_API_KEY_NAME} API 地址，请联系管理员检查全局配置。`,
                    key: DIFY_APP_API_KEY_NAME
                });
                 this.ui.showError(errorMsg); // Use this.ui
                 return;
             }
            
            // 设置API配置，支持fallback到dify
            this.state.apiKey = userSettings.apiKeys[DIFY_APP_API_KEY_NAME];
            this.state.apiEndpoint = globalConfig.apiEndpoints[DIFY_APP_API_KEY_NAME];
            this.state.currentUser = Header.currentUser;
            
            // 获取应用信息
            this.fetchAppInformation();
            
            // 绑定事件
            this.bindEvents();
        } catch (error) {
            console.error("Error initializing User Manual App:", error);
            const initErrorMsg = t('userManual.initError', { default: '初始化应用时出错，请刷新页面重试。' });
             // Use this.ui
             if (this.ui && typeof this.ui.showError === 'function') {
                 this.ui.showError(initErrorMsg);
             }
        }
    },
    
    async fetchAppInformation() {
        if (!this.state.apiKey || !this.state.apiEndpoint) return;

        // Define callbacks for API
        const callbacks = {
            onLoading: () => this.ui.showLoading(),
            onError: (msg) => this.ui.showError(msg),
            onAppInfo: (info) => {
                if (info) {
                    this.state.appInfo = info;
                    this.ui.displayAppInfo(info); 
                } else {
                    this.ui.displayAppInfo({});
                }
            }
        };

        try {
            await API.fetchAppInfo(this.state.apiKey, this.state.apiEndpoint, callbacks);
        } catch (error) {
            console.error("[Index UM] Failed to fetch app info wrapper:", error);
             if (this.ui && this.ui.hideLoading) this.ui.hideLoading();
        }
    },
    
    /**
     * 绑定所有事件
     */
    bindEvents() {
        // console.log('Binding User Manual events...');
        const generateButton = document.getElementById('generate-button');
        const promptInput = document.getElementById('requirement-description');

        if (promptInput) {
            promptInput.addEventListener('input', () => {
                // Use this.ui
                 if (this.ui && typeof this.ui.handleInput === 'function') {
                     this.ui.handleInput(promptInput.value);
                 } else {
                     const genBtn = document.getElementById('generate-button');
                     // 更新字数统计和按钮状态
                     this.ui.updateCharCountDisplay(promptInput.value.length);
                     // 获取当前按钮状态（生成或停止）
                     const currentAction = genBtn.getAttribute('data-action');
                     const isGenerateAction = currentAction === 'generate';
                     
                     // 如果UI有这个方法就调用，否则直接设置禁用状态
                     if (typeof this.ui.updateGenerateButtonState === 'function') {
                         this.ui.updateGenerateButtonState(promptInput.value.trim().length, isGenerateAction);
                     } else {
                         genBtn.disabled = promptInput.value.trim().length === 0 || 
                                            promptInput.value.length > 5000;
                     }
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

        // 其他可能的事件绑定
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
        
        // --- ADD binding for toggle system info --- 
        const toggleSystemInfoButton = document.getElementById('toggle-system-info');
        if (toggleSystemInfoButton) {
            // Use this.ui
            toggleSystemInfoButton.addEventListener('click', () => { if (this.ui) this.ui.toggleSystemInfo(); });
        }
        // --- END binding --- 
    },
    
    // --- ADD Central handleGenerate Function ---
    async handleGenerate() {
        const userStoryInput = document.getElementById('requirement-description');
        const userStory = userStoryInput.value.trim();

        if (!userStory) {
             // Use this.ui
             this.ui.showInputError('requirement', t('userManual.error.requirementRequired', { default: '用户故事描述不能为空。' }));
             return;
         }
        if (userStory.length > 5000) {
             // Use this.ui
              this.ui.showInputError('requirement', t('userManual.error.requirementTooLong', { default: '用户故事描述不能超过5000字符。' }));
             return;
         }

        // Use this.ui
        this.ui.clearInputError('requirement');
        // REMOVED: UI state updates handled by callbacks
        this.state.isGenerating = true;
        this.state.startTime = Date.now();
        this.state.currentConversationId = null; // Reset for new generation
        this.state.currentMessageId = null;

        // --- Define Callbacks for API.generateUserManual --- 
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
            const result = await API.generateUserManual(
                userStory,
                this.state.apiKey,
                this.state.apiEndpoint,
                this.state.currentUser,
                this.state.currentConversationId,
                callbacks // Pass callbacks
            );
             // Conversation ID updated via callback

        } catch (error) {
            // Errors handled by callbacks
             console.error("[Index UM] Error during handleGenerate call (should have been handled by callback):", error);
             if (this.state.isGenerating) {
                 callbacks.onComplete(); 
             }
        }
    },
    
    // --- ADD Central stopGeneration Function ---
    async stopGeneration() {
         // console.log("Handling stop generation request...");
         if (!this.state.isGenerating || !this.state.currentMessageId) {
             console.warn("Stop request ignored: Not generating or no message ID.");
             return;
         }
         try {
            // REMOVED: UI.setStoppingState();
            
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
                     console.error("Stop Generation Error (UM):", msg);
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
             console.error("[Index UM] Error during stopGeneration call (should have been handled by callback):", error);
             if (this.state.isGenerating) {
                 callbacks.onComplete();
             }
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
     * 清空表单
     */
    handleClearForm() {
        // Delegate to UI module
         if (this.ui && typeof this.ui.clearForm === 'function') {
             this.ui.clearForm();
         }
    },
    
    /**
     * 切换文本框放大状态
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
    UserManualApp.init();
}); 

// --- ADD EXPORT ---
export default UserManualApp; 