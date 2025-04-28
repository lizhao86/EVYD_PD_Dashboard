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
import DifyClient from '../../common/dify-client.js'; // ADDED: Import the common client
import { getCurrentUserSettings, getGlobalConfig } from '/scripts/services/storage.js';
import { t } from '/scripts/i18n.js';
import { marked } from 'marked'; // Keep for DifyAppUI
import BaseDifyApp from '../../common/base-dify-app.js';

// Specific key for User Story API in settings
const DIFY_APP_API_KEY_NAME = 'userStory';

class UserStoryApp extends BaseDifyApp {
    constructor() {
        super();
        this.difyApiKeyName = 'userStory';
        this.difyMode = 'workflow';
        this.mainInputElementId = 'requirement-description'; // Keep for consistency
        this.inputErrorElementId = 'requirement-error';

        // Define all input elements for this specific app
        this.inputElementIds = {
            platform: 'platform-name',
            system: 'system-name',
            module: 'module-name',
            requirements: 'requirement-description'
        };
        this.inputErrorElementIds = {
            platform: 'platform-error',
            system: 'system-error',
            module: 'module-error',
            requirements: 'requirement-error'
        };
    }
    
    /**
     * 初始化应用
     */
    async init() {
        // 首先等待Header初始化
        await Header.init();
        
        // 检查用户登录状态
        if (!Header.currentUser) {
             // Initialize minimal UI to show error
             if (!this.ui && typeof DifyAppUI === 'function') {
                 this.ui = new DifyAppUI({ t, marked });
                 this.ui.initUserInterface({ inputElementId: 'requirement-description', inputErrorElementId: 'requirement-error' });
             }
             if (this.ui) {
                 this.ui.showError(t('userStory.notLoggedIn', { default: '请先登录以使用此功能。' }));
             } else {
                 document.body.innerHTML = `<p style="color:red; padding: 20px;">${t('userStory.notLoggedIn', { default: '请先登录以使用此功能。'})}</p>`;
             }
            return;
        }

        try {
            // Initialize UI elements
            if (typeof DifyAppUI === 'function') {
                this.ui = new DifyAppUI({ t, marked });
                 this.ui.initUserInterface({
                     // Only provide main textarea for char count etc.
                     inputElementId: 'requirement-description', 
                     inputErrorElementId: 'requirement-error' 
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
                this.ui.showError(errorMsg);
                return;
            }
            
            if (!globalConfig || !globalConfig.apiEndpoints || !globalConfig.apiEndpoints[DIFY_APP_API_KEY_NAME]) {
                const errorMsg = t('userStory.apiEndpointMissing', {
                    default: `未能获取 ${DIFY_APP_API_KEY_NAME} API 地址，请联系管理员检查全局配置。`,
                    key: DIFY_APP_API_KEY_NAME
                });
                 this.ui.showError(errorMsg);
                 return;
             }
            
            // 设置API配置
            this.state.apiKey = userSettings.apiKeys[DIFY_APP_API_KEY_NAME];
            this.state.apiEndpoint = globalConfig.apiEndpoints[DIFY_APP_API_KEY_NAME];
            this.state.currentUser = Header.currentUser;
            
            // ADDED: Fetch dynamic app information
            await this._fetchAppInformation();
            
            // 绑定事件
            this.bindEvents();
            
            // Initial UI state update for main textarea
             const requirementInput = document.getElementById('requirement-description');
             if (requirementInput && this.ui) {
                 this.ui.handleInput(requirementInput.value);
             }
            
        } catch (error) {
            console.error("Error initializing User Story App:", error);
            const initErrorMsg = t('userStory.initError', { default: '初始化应用时出错，请刷新页面重试。' });
             if (this.ui && typeof this.ui.showError === 'function') {
                 this.ui.showError(initErrorMsg);
             }
        }
    }
    
    // ADDED: Fetch dynamic app information
    async _fetchAppInformation() {
        if (!this.state.apiKey || !this.state.apiEndpoint) return;
        if (!this.ui) return; // Ensure UI is initialized

        this.ui.showLoading();
        const infoUrl = `${this.state.apiEndpoint}/info`;

        try {
            const response = await fetch(infoUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${this.state.apiKey}` }
            });

            this.ui.hideLoading();

            if (!response.ok) {
                let errorDetail = '';
                try { errorDetail = JSON.stringify(await response.json()); } catch { errorDetail = await response.text(); }
                throw new Error(`Request failed: ${response.status} ${response.statusText}. Details: ${errorDetail}`);
            }

            const data = await response.json();
            this.ui.displayAppInfo(data);

        } catch (error) {
            console.error("[UserStoryApp] Error fetching Dify app info:", error);
            const errorMsg = t('userStory.connectionError', { default: '无法连接到 Dify API'});
            this.ui.showError(`${errorMsg}: ${error.message}`);
        }
    }
    
    /**
     * 绑定所有事件
     */
    bindEvents() {
        const generateButton = document.getElementById('generate-button');
        // REMOVED: Retry button binding
        const clearFormButton = document.getElementById('clear-form');
        const copyResultButton = document.getElementById('copy-result');
        const expandTextareaButton = document.getElementById('expand-textarea');
        const toggleSystemInfoButton = document.getElementById('toggle-system-info');

        // Input fields
        const platformInput = document.getElementById('platform-name');
        const systemInput = document.getElementById('system-name');
        const moduleInput = document.getElementById('module-name');
        const requirementInput = document.getElementById('requirement-description');

        // --- Bind Main Textarea Input for char count --- 
        if (requirementInput && this.ui) {
            requirementInput.addEventListener('input', () => {
                this.ui.handleInput(requirementInput.value); // Update char count/button state
                this.ui.clearInputError('requirement-error'); // Clear its specific error on input
            });
        }
        
        // --- Bind Extra Input Fields to Clear Errors --- 
        const setupInputListener = (inputElement, errorElementId) => {
            if (inputElement && this.ui) {
                inputElement.addEventListener('input', () => {
                    this.ui.clearInputError(errorElementId);
                });
            }
        };
        setupInputListener(platformInput, 'platform-error');
        setupInputListener(systemInput, 'system-error');
        setupInputListener(moduleInput, 'module-error');
        // --- End Extra Input Bindings --- 

        // --- Bind Generate/Stop Button --- 
        if (generateButton) {
            generateButton.addEventListener('click', async (e) => {
                e.preventDefault();
                const currentAction = generateButton.getAttribute('data-action') || 'generate';
                
                if (currentAction === 'stop') {
                    await this.stopGeneration(); 
                } else {
                    await this.handleGenerate(); 
                }
            });
        }
        
        // --- Bind Other Buttons --- 
        if (clearFormButton) {
            clearFormButton.addEventListener('click', this.handleClearForm.bind(this));
        }
        if (copyResultButton) {
            copyResultButton.addEventListener('click', this.handleCopyResult.bind(this));
        }
        if (expandTextareaButton) {
            expandTextareaButton.addEventListener('click', this.toggleTextareaExpand.bind(this));
        }
        if (toggleSystemInfoButton && this.ui) {
            toggleSystemInfoButton.addEventListener('click', () => this.ui.toggleSystemInfo());
        }
    }
    
    /**
     * 处理生成请求 (Workflow Mode)
     */
    async handleGenerate() {
        // console.log("[UserStoryApp] handleGenerate called (Workflow)."); // Removed
        if (!this.ui || !this.state.apiKey || !this.state.apiEndpoint || !this.state.currentUser) {
            console.error("Cannot generate: App not fully initialized.");
            this.ui?.showError(t('userStory.initError', { default: '应用未完全初始化，无法生成。' }));
            return;
        }

        // --- Input Gathering and Validation ---
        const inputs = {
            Platform: document.getElementById('platform-name')?.value?.trim(),
            System: document.getElementById('system-name')?.value?.trim(),
            Module: document.getElementById('module-name')?.value?.trim(),
            Requirements: document.getElementById('requirement-description')?.value?.trim()
        };

        let isValid = true;
        const requiredFields = {
            'platform-name': { value: inputs.Platform, errorId: 'platform-error', msgKey: 'userStory.error.platformRequired' },
            'system-name': { value: inputs.System, errorId: 'system-error', msgKey: 'userStory.error.systemRequired' },
            'module-name': { value: inputs.Module, errorId: 'module-error', msgKey: 'userStory.error.moduleRequired' },
            'requirement-description': { value: inputs.Requirements, errorId: 'requirement-error', msgKey: 'userStory.error.requirementRequired' }
        };

        // Clear all errors first
        Object.values(requiredFields).forEach(field => this.ui.clearInputError(field.errorId));

        // Validate required fields
        for (const [inputId, field] of Object.entries(requiredFields)) {
            if (!field.value) {
            isValid = false;
                this.ui.showInputError(field.errorId, t(field.msgKey, { default: '此字段不能为空。' }));
            }
        }

        // Validate length for requirement description
        const reqDescMaxLength = 5000;
        if (inputs.Requirements && inputs.Requirements.length > reqDescMaxLength) {
             isValid = false;
             this.ui.showInputError('requirement-error', t('userStory.error.requirementTooLong', {
                 default: `需求描述不能超过 ${reqDescMaxLength} 字符。`,
                 maxLength: reqDescMaxLength
             }));
         }

        if (!isValid) {
            // console.log("[UserStoryApp] Validation failed."); // Removed
            return; // Stop if validation fails
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

        try {
            this.difyClient = new DifyClient({
                baseUrl: apiEndpoint,
                apiKey: apiKey,
                mode: 'workflow' // Explicitly set workflow mode
            });

            const payload = {
                inputs: inputs, // Use the gathered inputs object
                user: user,
                response_mode: 'streaming'
                // No conversation_id or query in workflow mode
            };

            const callbacks = {
                onMessage: (content, isFirstChunk) => {
                    // Workflow mode might send agent_message or just text in node_finished
                    // DifyClient should normalize this to just call onMessage with the text
                    // ADDED: Check if UI is available
                    if (!this.ui) return;
                    // MODIFIED: Use isFirstChunk logic correctly
                    if (isFirstChunk) {
                        this.ui.setResultContent(content); // Overwrite with the first chunk
                    } else {
                        this.ui.appendStreamContent(content); // Append subsequent chunks
                    }
                },
                onComplete: (metadata) => {
                    // console.log("[UserStoryApp] Workflow complete. Metadata:", metadata); // Removed
                    // ADDED: Check if UI is available
                    if (!this.ui) {
                        this.difyClient = null;
                        return;
                    }
                    this.ui.showGenerationCompleted();
                    this.ui.displaySystemInfo(metadata); // Display final workflow metadata

                    // --- Fallback Logic --- 
                    // Check if the result area is still empty after stream completion
                    // and if there's fallback text from node outputs in metadata.
                    // MODIFIED: Check the rendered markdown element directly
                    const renderedResultElement = this.ui.elements.resultMarkdown;
                    const currentResultIsEmpty = !renderedResultElement || !renderedResultElement.innerHTML.trim();

                    if (currentResultIsEmpty && metadata && metadata.nodeOutputText) {
                        // console.log("[UserStoryApp] Using fallback text from node output:", metadata.nodeOutputText); // Removed
                        // MODIFIED: Set raw content and then render
                        if (this.ui.elements.resultContent) {
                            this.ui.elements.resultContent.innerHTML = metadata.nodeOutputText; // Put fallback into raw content
                            this.ui.renderMarkdown(); // Render it
                        } else {
                            console.error("[UserStoryApp] Cannot set fallback text: resultContent element missing.");
                            // As a last resort, try putting directly into markdown area if it exists
                            if (renderedResultElement) {
                                renderedResultElement.innerHTML = `<p>${metadata.nodeOutputText.replace(/\n/g, '<br>')}</p>`; // Basic formatting
                                renderedResultElement.style.display = 'block';
                            }
                        }
                    } else {
                         // If result is not empty, ensure markdown is rendered finally
                         this.ui.renderMarkdown(); 
                    }
                    // --- End Fallback Logic ---

                    // Check if metadata and usage data are valid before displaying stats
                    if (metadata && metadata.usage && (metadata.usage.total_tokens || metadata.usage.completion_tokens || metadata.usage.prompt_tokens)) {
                        this.ui.displayStats(metadata);
                    } else {
                        console.warn('[UserStoryApp] Metadata or usage data is missing/incomplete. Skipping stats display.', metadata);
                         // Optionally display a user-friendly message if stats are missing
                         // this.ui.displayMessage("Statistics are currently unavailable.", "warning");
                    }
                    this.difyClient = null;
                },
                onError: (error) => {
                    // ADDED: Check if UI is available
                    if (!this.ui) {
                        this.difyClient = null;
                        return;
                    }
                    if (error.name === 'AbortError') {
                        // console.log("[UserStoryApp] Workflow aborted by user."); // Removed
                        this.ui.showToast(t('userStory.generationStoppedByUser', { default: '生成已由用户停止。' }), 'info');
                    } else {
                        console.error("[UserStoryApp] Workflow error:", error);
                        this.ui.showError(t('userStory.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
                    }
                    this.ui.showGenerationCompleted(); // Ensure button reset
                    this.difyClient = null;
                },
                // --- Workflow Specific Callbacks --- 
                onWorkflowStarted: (data) => {
                    // console.log('[UserStoryApp] Workflow started:', data); // Removed
                    if (this.ui) this.ui.displaySystemInfo(data); // Show initial workflow info
                },
                onNodeStarted: (data) => {
                    // console.log('[UserStoryApp] Node started:', data?.data?.title); // Removed
                     // Optionally update UI to show current node
                     // this.ui.updateNodeStatus(data?.data?.title, 'running'); 
                    if (this.ui) this.ui.displaySystemInfo(data); // Append node info
                },
                onNodeCompleted: (data) => {
                    // console.log('[UserStoryApp] Node finished:', data?.data?.title); // Removed
                    // Optionally update UI
                    // this.ui.updateNodeStatus(data?.data?.title, 'completed');
                    if (this.ui) this.ui.displaySystemInfo(data); // Append node info
                    // Text from node output is handled by onMessage via DifyClient OR fallback in onComplete
                },
                 onWorkflowCompleted: (data) => {
                     // console.log('[UserStoryApp] Workflow finished event received:', data); // Removed
                     // Final metadata usually comes with onComplete
                 },
                 onThought: (thought) => {
                    // Agent thoughts might appear in workflow too
                    // console.log("[UserStoryApp] Agent thought:", thought); // Removed
                    // if (this.ui) this.ui.displaySystemInfo({ thought: thought });
                 }
            };

            await this.difyClient.generateStream(payload, callbacks);

        } catch (initError) {
            console.error("[UserStoryApp] Error setting up generation:", initError);
            this.ui.showGenerationCompleted(); // Ensure button reset
            this.ui.showError(t('userStory.generationSetupError', { default: '启动生成时出错:'}) + ` ${initError.message}`);
            this.difyClient = null;
        }
    }
    
    /**
     * 处理停止生成请求 (Workflow)
     */
    async stopGeneration() {
        // console.log("[UserStoryApp] Attempting to stop generation (Workflow)..."); // Removed
        if (this.difyClient) {
            this.difyClient.stopGeneration();
            // UI state reset is handled by the onError callback catching AbortError
        } else {
            // console.warn("[UserStoryApp] No active DifyClient instance to stop."); // Removed
            if (this.ui) this.ui.showGenerationCompleted();
        }
    }
    
    /**
     * 复制结果
     */
    handleCopyResult() {
        if (this.ui && typeof this.ui.copyResult === 'function') {
            this.ui.copyResult();
        }
    }
    
    /**
     * 清空表单和结果
     */
    handleClearForm() {
         if (this.ui && typeof this.ui.clearForm === 'function' && typeof this.ui.clearResultArea === 'function') {
             this.ui.clearForm(); // Should clear all inputs based on DifyAppUI implementation
             this.ui.clearResultArea();
             // No conversation ID to clear for workflow
             // console.log("[UserStoryApp] Form and results cleared."); // Removed
         }
    }
    
    /**
     * 切换文本区域展开/收起
     */
    toggleTextareaExpand() {
        if (this.ui && typeof this.ui.toggleTextareaExpand === 'function') {
            this.ui.toggleTextareaExpand();
        }
    }

    /**
     * Binds additional input listeners for platform, system, and module fields.
     */
    _bindSpecificEvents() {
        const platformInput = document.getElementById(this.inputElementIds.platform);
        const systemInput = document.getElementById(this.inputElementIds.system);
        const moduleInput = document.getElementById(this.inputElementIds.module);

        const setupInputListener = (inputElement, errorElementId) => {
            if (inputElement) {
                inputElement.addEventListener('input', () => {
                    this.ui.clearInputError(errorElementId);
                });
            }
        };

        setupInputListener(platformInput, this.inputErrorElementIds.platform);
        setupInputListener(systemInput, this.inputErrorElementIds.system);
        setupInputListener(moduleInput, this.inputErrorElementIds.module);
        // The main requirement input listener is already handled by the base class bindEvents
    }

    /**
     * Gathers and validates inputs from all four fields.
     * @returns {object | null} Object with validated inputs or null if validation fails.
     */
    _gatherAndValidateInputs() {
        const inputs = {};
        let isValid = true;

        // Clear previous errors
        Object.values(this.inputErrorElementIds).forEach(id => this.ui.clearInputError(id));

        // Get and validate each input
        const fieldsToValidate = [
            { key: 'Platform', elementId: this.inputElementIds.platform, errorId: this.inputErrorElementIds.platform, msgKey: 'userStory.error.platformRequired' },
            { key: 'System', elementId: this.inputElementIds.system, errorId: this.inputErrorElementIds.system, msgKey: 'userStory.error.systemRequired' },
            { key: 'Module', elementId: this.inputElementIds.module, errorId: this.inputErrorElementIds.module, msgKey: 'userStory.error.moduleRequired' },
            { key: 'Requirements', elementId: this.inputElementIds.requirements, errorId: this.inputErrorElementIds.requirements, msgKey: 'userStory.error.requirementRequired' }
        ];

        for (const field of fieldsToValidate) {
            const inputElement = document.getElementById(field.elementId);
            const value = inputElement ? inputElement.value.trim() : '';
            inputs[field.key] = value; // Store the value regardless

            if (!value) {
                isValid = false;
                this.ui.showInputError(field.errorId, t(field.msgKey, { default: '此字段不能为空。' }));
            }
        }

        // Additional validation for requirements length
        const reqDescMaxLength = 5000;
        if (inputs.Requirements && inputs.Requirements.length > reqDescMaxLength) {
             isValid = false;
             this.ui.showInputError(this.inputErrorElementIds.requirements, t('userStory.error.requirementTooLong', {
                 default: `需求描述不能超过 ${reqDescMaxLength} 字符。`,
                 maxLength: reqDescMaxLength
             }));
         }

        return isValid ? inputs : null;
    }

    /**
     * Builds the payload for the Dify Workflow API.
     * @param {object} inputs - Validated input object from _gatherAndValidateInputs.
     * @returns {object} The payload object.
     */
    _buildPayload(inputs) {
        return {
            inputs: inputs, // Pass the validated inputs object directly
            user: this.state.currentUser.username || 'unknown-user',
            response_mode: 'streaming'
            // No conversation_id needed for workflow mode
        };
    }

    /**
     * Provides workflow-specific callbacks.
     * @returns {object} Object containing workflow event handlers.
     */
    _getSpecificCallbacks() {
        return {
            onWorkflowStarted: (data) => {
                this.ui.displaySystemInfo(data); // Show initial workflow info
            },
            onNodeStarted: (data) => {
                this.ui.displaySystemInfo(data); // Append node info
            },
            onNodeCompleted: (data) => {
                this.ui.displaySystemInfo(data); // Append node info
                // Text output is handled by base onMessage callback via DifyClient
            },
             onWorkflowCompleted: (data) => {
                 // Final metadata is handled by base _handleCompletion
             },
             onThought: (thought) => {
                // Optionally display thoughts if needed: this.ui.displaySystemInfo({ thought: thought });
             }
        };
    }
    
    // Override _handleCompletion if needed (e.g., workflow doesn't use conversation_id)
    // Currently, the base _handleCompletion is sufficient as it checks difyMode.
    // _handleCompletion(metadata) { super._handleCompletion(metadata); /* Add specific logic */ }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    const app = new UserStoryApp();
    app.init();
}); 

// --- ADD EXPORT --- 
export default UserStoryApp; 