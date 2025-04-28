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
import DifyClient from '../../common/dify-client.js'; // ADDED: Import the common client
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
        currentConversationId: null, // Store conversation ID for continuous chat
        isGenerating: false,
        startTime: null
    },
    
    // ADDED: Store UI instance
    ui: null,
    
    // ADDED: Store DifyClient instance
    difyClient: null,
    
    /**
     * 初始化应用
     */
    async init() {
        // 首先等待Header初始化
        await Header.init();
        
        // 检查用户登录状态
        if (!Header.currentUser) {
            // Create a temporary UI instance just to show the error if needed
            if (!this.ui && typeof DifyAppUI === 'function') {
                 this.ui = new DifyAppUI({ t, marked });
                 // Basic init to allow showError
                 this.ui.initUserInterface({ inputElementId: 'requirement-description', inputErrorElementId: 'requirement-error' });
            }
            if (this.ui) {
            this.ui.showError(t('userManual.notLoggedIn', { default: '请先登录以使用此功能。'}));
            } else {
                 // Fallback if UI couldn't be initialized
                 document.body.innerHTML = `<p style="color:red; padding: 20px;">${t('userManual.notLoggedIn', { default: '请先登录以使用此功能。'})}</p>`;
            }
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
            
            // ADDED: Call the restored method to fetch dynamic info
            await this._fetchAppInformation(); 
            
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
    
    /**
     * 绑定所有事件
     */
    bindEvents() {
        // console.log('Binding User Manual events...');
        const generateButton = document.getElementById('generate-button');
        const promptInput = document.getElementById('requirement-description');

        if (promptInput && this.ui) { // Check if ui is initialized
            promptInput.addEventListener('input', () => {
                this.ui.handleInput(promptInput.value); // DifyAppUI handles char count and button state
            });
            // Trigger initial state update
            this.ui.handleInput(promptInput.value);
        } else if (!this.ui) {
             console.warn("UI not initialized, cannot bind input event properly.");
        }

        if (generateButton) {
            generateButton.addEventListener('click', async (e) => {
                e.preventDefault();
                // Use ui instance to get current action state
                const currentAction = generateButton.getAttribute('data-action') || 'generate';

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
        if (toggleSystemInfoButton && this.ui) { // Check ui is initialized
            toggleSystemInfoButton.addEventListener('click', () => this.ui.toggleSystemInfo());
        }
        // --- END binding --- 
    },
    
    /**
     * 处理生成请求
     */
    async handleGenerate() {
        // console.log("[UserManualApp] handleGenerate called."); // Log entry
        if (!this.ui || !this.state.apiKey || !this.state.apiEndpoint || !this.state.currentUser) {
            console.error("Cannot generate: App not fully initialized.");
            this.ui?.showError(t('userManual.initError', { default: '应用未完全初始化，无法生成。' }));
            return;
        }

        // 验证输入 (RESTORED: Perform validation here instead of ui.validateInputs)
        const userStoryInput = document.getElementById('requirement-description');
        const userStory = userStoryInput ? userStoryInput.value : '';
        const inputId = 'requirement-description';
        const maxLength = 5000; // Example max length
        // console.log(`[UserManualApp] Validating input: length=${userStory.length}`); // Log input length

        // CORRECT: Get value directly from the input element
        this.ui.clearInputError(inputId); // Clear previous error first
        // console.log(`[UserManualApp] Cleared input error for #${inputId}.`); // Log after clear

        if (!userStory || userStory.trim().length === 0) {
            // console.log("[UserManualApp] Validation failed: Input is empty."); // Log validation failure
            this.ui.showInputError(inputId, t('userManual.error.requirementRequired', { default: '用户故事描述不能为空。' }));
            // console.log(`[UserManualApp] Called showInputError for empty input.`); // Log after show error
            return; // Stop generation
         }
        if (userStory.length > maxLength) {
            // console.log(`[UserManualApp] Validation failed: Input too long (${userStory.length} > ${maxLength}).`); // Log validation failure
            this.ui.showInputError(inputId, t('userManual.error.requirementTooLong', {
                default: `用户故事描述不能超过 ${maxLength} 字符。`,
                maxLength: maxLength
            }));
            // console.log(`[UserManualApp] Called showInputError for long input.`); // Log after show error
            return; // Stop generation
        }
        // console.log("[UserManualApp] Validation passed."); // Log validation success
        // --- End Validation ---

        // 设置UI为生成中状态
        this.ui.setGeneratingState(true);
        this.ui.clearResultArea(); // CORRECTED: Use the method name from original callbacks
        this.ui.showResultContainer();

        // 准备 DifyClient 调用
        const apiKey = this.state.apiKey;
        const apiEndpoint = this.state.apiEndpoint;
        const user = this.state.currentUser.username || 'unknown-user'; // Get username
        const conversationId = this.state.currentConversationId; // Get stored conversation ID

        try {
            // Instantiate the client for this request
            this.difyClient = new DifyClient({
                baseUrl: apiEndpoint,
                apiKey: apiKey,
                mode: 'chat' // Explicitly set mode for User Manual
            });

            const payload = {
                query: userStory,
                user: user,
                conversation_id: conversationId || undefined, // Pass undefined if null/empty
                inputs: {} // Chat mode typically doesn't need structured inputs here
            };

            // Define callbacks that interact with the UI
            const callbacks = {
                onMessage: (content, isFirstChunk) => {
                    // Assuming ui has a method to append streamed content
                    this.ui.appendStreamContent(content);
                },
                onComplete: (metadata) => {
                    console.log("[UserManualApp] Generation complete. Metadata:", metadata);
                    this.state.currentConversationId = metadata.conversation_id; // Update conversation ID
                    this.ui.showGenerationCompleted(); // CORRECTED: Use the method designed to reset the button after completion
                    this.ui.displaySystemInfo(metadata); // CORRECTED based on original callbacks
                    this.ui.displayStats(metadata); // ADDED: Call displayStats as well
                    this.ui.renderMarkdown(); // ADDED: Render the final markdown content
                    this.difyClient = null; // Clean up client instance
                },
                onError: (error) => {
                    // console.error("[UserManualApp] Generation error:", error); // Log all errors
                     this.ui.setGeneratingState(false);
                    if (error.name === 'AbortError') {
                        // Don't log AbortError as a critical error, just show the toast
                        console.log("[UserManualApp] Generation aborted by user."); // Optional: Log as info
                        this.ui.showToast(t('userManual.generationStoppedByUser', { default: '生成已由用户停止。' }), 'info');
                    } else {
                        // Log other unexpected errors
                        console.error("[UserManualApp] Generation error:", error);
                         this.ui.showError(t('userManual.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
                    }
                    this.ui.showGenerationCompleted(); // ADDED: Ensure button state is reset on ALL errors
                    this.difyClient = null; // Clean up client instance
                },
                 // Optional callbacks for other events (can be ignored or log)
                 onThought: (thought) => console.log("[UserManualApp] Agent thought:", thought),
                 // Workflow specific callbacks - should not be called in chat mode
                 onWorkflowStarted: (data) => console.warn("[UserManualApp] Received workflow_started in chat mode:", data),
                 onWorkflowCompleted: (data) => console.warn("[UserManualApp] Received workflow_finished in chat mode:", data),
                 onNodeStarted: (data) => console.warn("[UserManualApp] Received node_started in chat mode:", data),
                 onNodeCompleted: (data) => console.warn("[UserManualApp] Received node_finished in chat mode:", data),
            };

            // Start the generation
            await this.difyClient.generateStream(payload, callbacks);

        } catch (initError) {
            // Error during DifyClient instantiation or pre-request setup
            console.error("[UserManualApp] Error setting up generation:", initError);
            this.ui.setGeneratingState(false);
            this.ui.showError(t('userManual.generationSetupError', { default: '启动生成时出错:'}) + ` ${initError.message}`);
            this.difyClient = null;
        }
    },
    
    /**
     * 处理停止生成请求
     */
    async stopGeneration() {
        console.log("[UserManualApp] Attempting to stop generation...");
        if (this.difyClient) {
            this.difyClient.stopGeneration();
            // UI state (button text, disabling) should be handled by the onError callback (catching AbortError)
        } else {
            console.warn("[UserManualApp] No active DifyClient instance to stop.");
             // If stop was clicked without an active client, ensure UI is reset
             if(this.ui) this.ui.setGeneratingState(false);
        }
    },
    
    /**
     * 复制结果到剪贴板
     */
    handleCopyResult() {
        if (this.ui && typeof this.ui.copyResultToClipboard === 'function') {
            this.ui.copyResultToClipboard();
        }
    },
    
    /**
     * 清空表单和结果
     */
    handleClearForm() {
        if (this.ui && typeof this.ui.clearForm === 'function' && typeof this.ui.clearResult === 'function') {
             this.ui.clearForm();
            this.ui.clearResult();
            this.state.currentConversationId = null; // Reset conversation on clear
            console.log("[UserManualApp] Form and results cleared.");
         }
    },
    
    /**
     * 切换文本区域展开/收起
     */
    toggleTextareaExpand() {
        if (this.ui && typeof this.ui.toggleTextareaExpand === 'function') {
            this.ui.toggleTextareaExpand();
        }
    },

    // REMOVED: fetchAppInformation function
    // ADDED: Restored fetchAppInformation logic as a private method
    async _fetchAppInformation() {
        if (!this.state.apiKey || !this.state.apiEndpoint) return;

        // Define callbacks inline or use UI methods directly
        this.ui.showLoading(); // Show loading state
        const infoUrl = `${this.state.apiEndpoint}/info`;

        try {
            const response = await fetch(infoUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${this.state.apiKey}` }
            });

            this.ui.hideLoading(); // Hide loading state regardless of outcome

            if (!response.ok) {
                let errorDetail = '';
                try { errorDetail = JSON.stringify(await response.json()); } catch { errorDetail = await response.text(); }
                throw new Error(`Request failed: ${response.status} ${response.statusText}. Details: ${errorDetail}`);
            }

            const data = await response.json();
            this.ui.displayAppInfo(data); // Display fetched info

        } catch (error) {
            console.error("[UserManualApp] Error fetching Dify app info:", error);
            const errorMsg = t('userManual.connectionError', { default: '无法连接到 Dify API'});
            this.ui.showError(`${errorMsg}: ${error.message}`); // Show error in UI
            // Optionally display default info even on error
            // this.ui.displayAppInfo({ name: t('userManual.title', { default: 'User Manual Generator' }) });
        }
    }
};

// 在DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    UserManualApp.init();
}); 

// --- ADD EXPORT ---
export default UserManualApp; 