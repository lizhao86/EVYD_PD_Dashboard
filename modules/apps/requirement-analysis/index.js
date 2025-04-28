// 首先导入并配置 Amplify
import { configureAmplify } from '/scripts/amplify-config.js';
// 确保 Amplify 在所有其他代码之前完成配置
configureAmplify();

// Import necessary modules using absolute paths and local references
import Header from '/modules/common/header.js';
import DifyAppUI from '../../common/dify-app-ui.js'; // Import the common UI class
import DifyClient from '../../common/dify-client.js'; // ADDED: Import the common client
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
        currentConversationId: null,
        isGenerating: false,
        startTime: null
    },

    // ADDED: Store the UI instance
    ui: null,
    // ADDED: Store DifyClient instance
    difyClient: null,

    /**
     * 初始化应用
     */
    async init() {
        try {
            // 首先等待Header初始化完成
            await Header.init(); 

            // 检查用户登录状态
            if (!Header.currentUser) {
                console.error('User not authenticated for Requirement Analysis App.');
                 if (!this.ui && typeof DifyAppUI === 'function') {
                     this.ui = new DifyAppUI({ t, marked });
                     this.ui.initUserInterface({ inputElementId: 'requirement-description', inputErrorElementId: 'requirement-error' });
                 }
                 if (this.ui) {
                     this.ui.showError(t('requirementAnalysis.notLoggedIn', { default: '请先登录以使用此功能。'}));
                 } else {
                     document.body.innerHTML = `<p style="color:red; padding: 20px;">${t('requirementAnalysis.notLoggedIn', { default: '请先登录以使用此功能。'})}</p>`;
                 }
                return;
            }

            // 初始化UI
            if (typeof DifyAppUI === 'function') {
                this.ui = new DifyAppUI({ t, marked });
                this.ui.initUserInterface({
                    inputElementId: 'requirement-description', 
                    inputErrorElementId: 'requirement-error' 
                });
            } else {
                console.error("DifyAppUI class not loaded correctly.");
                document.body.innerHTML = '<p style="color:red; padding: 20px;">Error loading UI components. Please refresh.</p>'; 
                return;
            }

            // 加载和设置API配置
            const userSettings = Header.userSettings || await getCurrentUserSettings(); 
            const globalConfig = await getGlobalConfig();
            
            // --- Key/Endpoint Validation --- 
            if (!userSettings || !userSettings.apiKeys || !userSettings.apiKeys[DIFY_APP_API_KEY_NAME]) {
                const errorMsg = t('requirementAnalysis.apiKeyMissingError', {
                     default: `未能找到 ${DIFY_APP_API_KEY_NAME} 的 API 密钥，请在管理员面板配置。`,
                     key: DIFY_APP_API_KEY_NAME
                 });
                 this.ui.showError(errorMsg);
                 return;
             }
            if (!globalConfig || !globalConfig.apiEndpoints || !globalConfig.apiEndpoints[DIFY_APP_API_KEY_NAME]) {
                const errorMsg = t('requirementAnalysis.apiEndpointMissing', { 
                    default: `无法获取 ${DIFY_APP_API_KEY_NAME} API 地址，请联系管理员检查全局配置。`,
                    key: DIFY_APP_API_KEY_NAME
                });
                this.ui.showError(errorMsg);
                return;
            }

            // 设置状态
            this.state.apiKey = userSettings.apiKeys[DIFY_APP_API_KEY_NAME];
            this.state.apiEndpoint = globalConfig.apiEndpoints[DIFY_APP_API_KEY_NAME];
            this.state.currentUser = Header.currentUser;
            
            // ADDED: Call the restored method to fetch dynamic info
            await this._fetchAppInformation();
            
            // 绑定事件
            this.bindEvents();

            // Initial UI state update
            const promptInput = document.getElementById('requirement-description');
            if (promptInput && this.ui) {
                this.ui.handleInput(promptInput.value);
            }

        } catch (error) {
            console.error("Error initializing Requirement Analysis App:", error);
            const initErrorMsg = t('requirementAnalysis.initError', { default: '初始化应用时出错，请刷新页面重试。' });
            if (this.ui && typeof this.ui.showError === 'function') {
                this.ui.showError(initErrorMsg);
            } else {
                alert(initErrorMsg); 
            }
        } finally {
             document.documentElement.classList.remove('i18n-loading'); 
             document.body.style.display = 'block';
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
            console.error("[RequirementAnalysisApp] Error fetching Dify app info:", error);
            const errorMsg = t('reqAnalysis.connectionError', { default: '无法连接到 Dify API'});
            this.ui.showError(`${errorMsg}: ${error.message}`); // Show error in UI
            // Optionally display default info even on error
            // this.ui.displayAppInfo({ name: t('reqAnalysis.title', { default: 'Requirement Analysis Assistant' }) });
        }
    },
    
    /**
     * 绑定所有事件监听器
     */
    bindEvents() {
        const generateButton = document.getElementById('generate-button');
        const promptInput = document.getElementById('requirement-description');
        const clearFormButton = document.getElementById('clear-form');
        const copyResultButton = document.getElementById('copy-result');
        const expandTextareaButton = document.getElementById('expand-textarea');
        const toggleSystemInfoButton = document.getElementById('toggle-system-info');

        // --- Event Listeners --- 
        if (promptInput && this.ui) {
            promptInput.addEventListener('input', () => {
                     this.ui.handleInput(promptInput.value);
            });
        }

        if (generateButton) {
            generateButton.addEventListener('click', async (e) => {
                e.preventDefault();
                // CORRECTED: Read button state directly
                const currentAction = generateButton.getAttribute('data-action') || 'generate';
                if (currentAction === 'stop') {
                    await this.stopGeneration(); 
                } else if (currentAction === 'generate') {
                    // Pass value directly instead of re-fetching?
                    const requirement = promptInput ? promptInput.value : '';
                    await this.handleGenerate(requirement.trim());
                }
            });
        }
        
        if (clearFormButton) {
            clearFormButton.addEventListener('click', this.handleClearForm.bind(this));
        }

        if (copyResultButton) {
             copyResultButton.addEventListener('click', () => { if(this.ui) this.ui.copyResult(); });
        }

        if (expandTextareaButton) {
            expandTextareaButton.addEventListener('click', this.toggleTextareaExpand.bind(this));
        }

        if (toggleSystemInfoButton && this.ui) {
             toggleSystemInfoButton.addEventListener('click', () => { this.ui.toggleSystemInfo(); });
         }
    },
    
    /**
     * 处理生成请求
     */
    async handleGenerate(prompt) {
        console.log("[ReqAnalysisApp] handleGenerate called.");
        if (!this.ui || !this.state.apiKey || !this.state.apiEndpoint || !this.state.currentUser) {
            console.error("Cannot generate: App not fully initialized.");
            this.ui?.showError(t('requirementAnalysis.initError', { default: '应用未完全初始化，无法生成。' }));
            return;
        }

        // --- Input Validation ---
        const inputId = 'requirement-description';
        const maxLength = 5000; // Assuming same limit

        this.ui.clearInputError(inputId);

        if (!prompt || prompt.trim().length === 0) {
            this.ui.showInputError(inputId, t('requirementAnalysis.error.requirementRequired', { default: '需求描述不能为空。' }));
             return;
         }
        if (prompt.length > maxLength) {
            this.ui.showInputError(inputId, t('requirementAnalysis.error.requirementTooLong', {
                default: `需求描述不能超过 ${maxLength} 字符。`,
                maxLength: maxLength
            }));
             return;
         }
        // --- End Validation ---

        // Set UI state
        this.ui.setGeneratingState();
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
                mode: 'chat' // Confirmed Chat mode
            });

            const payload = {
                query: prompt,
                user: user,
                conversation_id: conversationId || undefined,
                inputs: {} // Chat mode
            };

            // Define callbacks
            const callbacks = {
                onMessage: (content, isFirstChunk) => {
                    this.ui.appendStreamContent(content);
                },
                onComplete: (metadata) => {
                    console.log("[ReqAnalysisApp] Generation complete. Metadata:", metadata);
                    this.state.currentConversationId = metadata.conversation_id;
                this.ui.showGenerationCompleted();
                    this.ui.displaySystemInfo(metadata);
                    this.ui.displayStats(metadata);
                    this.ui.renderMarkdown();
                    this.difyClient = null;
                },
                onError: (error) => {
                    if (error.name === 'AbortError') {
                        console.log("[ReqAnalysisApp] Generation aborted by user.");
                        this.ui.showToast(t('requirementAnalysis.generationStoppedByUser', { default: '生成已由用户停止。' }), 'info');
                    } else {
                        console.error("[ReqAnalysisApp] Generation error:", error);
                        this.ui.showError(t('requirementAnalysis.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
                    }
                    this.ui.showGenerationCompleted(); // Ensure button reset
                    this.difyClient = null;
                },
                // Optional detailed logs
                onThought: (thought) => console.log("[ReqAnalysisApp] Agent thought:", thought),
                // Workflow specific callbacks - Log warnings if received in chat mode
                 onWorkflowStarted: (data) => console.warn("[ReqAnalysisApp] Received workflow_started in chat mode:", data),
                 onWorkflowCompleted: (data) => console.warn("[ReqAnalysisApp] Received workflow_finished in chat mode:", data),
                 onNodeStarted: (data) => console.warn("[ReqAnalysisApp] Received node_started in chat mode:", data),
                 onNodeCompleted: (data) => console.warn("[ReqAnalysisApp] Received node_finished in chat mode:", data),
            };

            await this.difyClient.generateStream(payload, callbacks);

        } catch (initError) {
            console.error("[ReqAnalysisApp] Error setting up generation:", initError);
            this.ui.showGenerationCompleted(); // Ensure button reset
            this.ui.showError(t('requirementAnalysis.generationSetupError', { default: '启动生成时出错:'}) + ` ${initError.message}`);
            this.difyClient = null;
        }
    },
    
    /**
     * 处理停止生成请求
     */
    async stopGeneration() {
        console.log("[ReqAnalysisApp] Attempting to stop generation...");
        if (this.difyClient) {
            this.difyClient.stopGeneration();
        } else {
            console.warn("[ReqAnalysisApp] No active DifyClient instance to stop.");
            if (this.ui) this.ui.showGenerationCompleted();
         } 
    },
    
    /**
     * 清空表单和结果
     */
    handleClearForm() {
        if (this.ui && typeof this.ui.clearForm === 'function' && typeof this.ui.clearResultArea === 'function') {
            this.ui.clearForm();
            this.ui.clearResultArea();
            this.state.currentConversationId = null;
            console.log("[ReqAnalysisApp] Form and results cleared.");
        }
    },
    
    /**
     * 复制结果到剪贴板
     */
    handleCopyResult() {
        if (this.ui && typeof this.ui.copyResult === 'function') {
            this.ui.copyResult();
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

// 初始化应用入口
document.addEventListener('DOMContentLoaded', () => {
    RequirementAnalysisApp.init();
});

export default RequirementAnalysisApp; // Optional: export if needed elsewhere