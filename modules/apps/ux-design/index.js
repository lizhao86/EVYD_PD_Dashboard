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
// REMOVED: import API from './api.js'; // API module specific to UX Design
import DifyClient from '../../common/dify-client.js'; // ADDED: Import the common client
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
        // REMOVED: appInfo: null,
        currentConversationId: null, // Store conversation ID for continuous chat
        // REMOVED: currentMessageId: null,
        isGenerating: false, // This state might be redundant if ui handles button state
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
             // MODIFIED: Use this.ui if available, otherwise fallback
             if (!this.ui && typeof DifyAppUI === 'function') {
                 this.ui = new DifyAppUI({ t, marked });
                 this.ui.initUserInterface({ inputElementId: 'requirement-description', inputErrorElementId: 'requirement-error' });
             }
             if (this.ui) {
                 this.ui.showError(t('uxDesign.notLoggedIn', { default: '请先登录以使用此功能。' }));
             } else {
                 // Fallback if UI hasn't initialized yet
                 document.body.innerHTML = `<p style="color:red; padding: 20px;">${t('uxDesign.notLoggedIn', { default: '请先登录以使用此功能。'})}</p>`;
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
            
            // REMOVED: Set static app info
            // this.ui.displayAppInfo({
            //     name: t('uxDesign.title', { default: 'UX Design Concept Generator' }),
            //     description: t('uxDesign.description', { default: 'Generate UX design concepts based on input requirements.' })
            // });
            // ADDED: Call the restored method to fetch dynamic info
            await this._fetchAppInformation();
            
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
    
    // ADDED: Restored fetchAppInformation logic as a private method
    async _fetchAppInformation() {
        if (!this.state.apiKey || !this.state.apiEndpoint) return;

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
            console.error("[UXDesignApp] Error fetching Dify app info:", error);
            const errorMsg = t('uxDesign.connectionError', { default: '无法连接到 Dify API'});
            this.ui.showError(`${errorMsg}: ${error.message}`); // Show error in UI
            // Optionally display default info even on error
            // this.ui.displayAppInfo({ name: t('uxDesign.title', { default: 'UX Design Concept Generator' }) });
        }
    },
    
    /**
     * 绑定所有事件
     */
    bindEvents() {
        // console.log('Binding UX Design events...');
        const generateButton = document.getElementById('generate-button');
        const promptInput = document.getElementById('requirement-description');
        // REMOVED: retryButton logic, as fetchAppInfo is removed.

        if (promptInput && this.ui) { // Ensure ui exists
            promptInput.addEventListener('input', () => {
                     this.ui.handleInput(promptInput.value);
            });
        } else if (!this.ui) {
            console.warn("UI not initialized, cannot bind input event.");
        }

        if (generateButton) {
            generateButton.addEventListener('click', async (e) => {
                e.preventDefault();
                // CORRECTED: Read state directly from button attribute
                const currentAction = generateButton.getAttribute('data-action') || 'generate';
                
                if (currentAction === 'stop') {
                    await this.stopGeneration(); 
                } else {
                    await this.handleGenerate(); 
                }
            });
        }

        // Other standard UI bindings
        const clearFormButton = document.getElementById('clear-form');
        if (clearFormButton) {
            clearFormButton.addEventListener('click', this.handleClearForm.bind(this));
        }

        const copyResultButton = document.getElementById('copy-result');
        if (copyResultButton) {
            // CORRECTED: Call ui.copyResult()
            copyResultButton.addEventListener('click', () => { if(this.ui) this.ui.copyResult(); });
        }

        const expandTextareaButton = document.getElementById('expand-textarea');
        if (expandTextareaButton) {
            expandTextareaButton.addEventListener('click', this.toggleTextareaExpand.bind(this));
        }
        
        const toggleSystemInfoButton = document.getElementById('toggle-system-info');
        if (toggleSystemInfoButton && this.ui) {
            toggleSystemInfoButton.addEventListener('click', () => this.ui.toggleSystemInfo());
        }
    },
    
    /**
     * 处理生成请求
     */
    async handleGenerate() {
        console.log("[UXDesignApp] handleGenerate called."); // Keep one log for entry
        if (!this.ui || !this.state.apiKey || !this.state.apiEndpoint || !this.state.currentUser) {
            console.error("Cannot generate: App not fully initialized.");
            this.ui?.showError(t('uxDesign.initError', { default: '应用未完全初始化，无法生成。' }));
            return;
        }

        // --- Input Validation ---
        const requirementInput = document.getElementById('requirement-description');
        const requirement = requirementInput ? requirementInput.value : '';
        const inputId = 'requirement-description';
        const maxLength = 5000;

        this.ui.clearInputError(inputId); // Clear previous error first

        if (!requirement || requirement.trim().length === 0) {
            this.ui.showInputError(inputId, t('uxDesign.error.requirementRequired', { default: '需求描述不能为空。' }));
            return; // Stop generation
         }
        if (requirement.length > maxLength) {
            this.ui.showInputError(inputId, t('uxDesign.error.requirementTooLong', {
                default: `需求描述不能超过 ${maxLength} 字符。`,
                maxLength: maxLength
            }));
            return; // Stop generation
        }
        // --- End Validation ---

        // Set UI state
        this.ui.setGeneratingState(); // Use the new method
        this.ui.clearResultArea();
        this.ui.showResultContainer();

        // Prepare DifyClient call
        const apiKey = this.state.apiKey;
        const apiEndpoint = this.state.apiEndpoint;
        const user = this.state.currentUser.username || 'unknown-user';
        const conversationId = this.state.currentConversationId;

        try {
            this.difyClient = new DifyClient({
                baseUrl: apiEndpoint,
                apiKey: apiKey,
                mode: 'chat' // UX Design is a Chatbot
            });

            const payload = {
                query: requirement,
                user: user,
                conversation_id: conversationId || undefined,
                inputs: {} // Chat mode
            };

            const callbacks = {
                onMessage: (content, isFirstChunk) => {
                    this.ui.appendStreamContent(content);
                },
                onComplete: (metadata) => {
                    console.log("[UXDesignApp] Generation complete. Metadata:", metadata);
                    this.state.currentConversationId = metadata.conversation_id;
                this.ui.showGenerationCompleted();
                    this.ui.displaySystemInfo(metadata);
                    this.ui.displayStats(metadata);
                    this.ui.renderMarkdown();
                    this.difyClient = null;
                },
                onError: (error) => {
                    if (error.name === 'AbortError') {
                        console.log("[UXDesignApp] Generation aborted by user.");
                        this.ui.showToast(t('uxDesign.generationStoppedByUser', { default: '生成已由用户停止。' }), 'info');
                    } else {
                        console.error("[UXDesignApp] Generation error:", error);
                        this.ui.showError(t('uxDesign.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
                    }
                    this.ui.showGenerationCompleted(); // Ensure button reset on error
                    this.difyClient = null;
                },
                // Optional detailed logs
                onThought: (thought) => console.log("[UXDesignApp] Agent thought:", thought),
                onWorkflowStarted: (data) => console.warn("[UXDesignApp] Received workflow_started in chat mode:", data),
                // ... other optional workflow callbacks
            };

            await this.difyClient.generateStream(payload, callbacks);

        } catch (initError) {
            console.error("[UXDesignApp] Error setting up generation:", initError);
            this.ui.showGenerationCompleted(); // Ensure button reset if init fails
            this.ui.showError(t('uxDesign.generationSetupError', { default: '启动生成时出错:'}) + ` ${initError.message}`);
            this.difyClient = null;
        }
    },
    
    /**
     * 处理停止生成请求
     */
    async stopGeneration() {
        console.log("[UXDesignApp] Attempting to stop generation...");
        if (this.difyClient) {
            this.difyClient.stopGeneration();
            // UI state reset is handled by the onError callback catching AbortError
        } else {
            console.warn("[UXDesignApp] No active DifyClient instance to stop.");
            if (this.ui) this.ui.showGenerationCompleted(); // Reset UI if stop is clicked erroneously
        }
    },
    
    /**
     * 复制结果
     * CORRECTED: Call ui.copyResult()
     */
    handleCopyResult() {
        if (this.ui && typeof this.ui.copyResult === 'function') {
            this.ui.copyResult();
        }
    },
    
    /**
     * 清空表单和结果
     */
    handleClearForm() {
         if (this.ui && typeof this.ui.clearForm === 'function' && typeof this.ui.clearResultArea === 'function') {
             this.ui.clearForm();
             this.ui.clearResultArea(); // Use correct method name
             this.state.currentConversationId = null;
             console.log("[UXDesignApp] Form and results cleared.");
         }
    },
    
    /**
     * 切换文本区域展开/收起
     */
    toggleTextareaExpand() {
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