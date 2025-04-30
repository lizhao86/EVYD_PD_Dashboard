/**
 * Base class for Dify-powered AI applications in the EVYD Product Manager AI Workbench.
 * Handles common logic for initialization, UI interaction, API client setup, 
 * and stream processing via DifyClient.
 */
import Header from '/modules/common/header.js';
import DifyAppUI from './dify-app-ui.js'; 
import DifyClient from './dify-client.js'; 
import { getCurrentUserSettings, getGlobalConfig, getCurrentUserApiKeys } from '/scripts/services/storage.js';
import { t } from '/scripts/i18n.js';
import { marked } from 'marked';

class BaseDifyApp {
    // --- Configuration properties (to be set by subclasses) ---
    difyApiKeyName = ''; // e.g., 'userManual', 'userStory'
    difyMode = 'chat'; // 'chat' or 'workflow'
    mainInputElementId = 'requirement-description'; // Default main input ID
    inputErrorElementId = 'requirement-error'; // Default error element ID for main input
    
    // Optional: For apps with multiple inputs (like User Story)
    // inputElementIds = {}; // e.g., { requirements: 'requirement-description', platform: 'platform-name' }
    // inputErrorElementIds = {}; // e.g., { requirements: 'requirement-error', platform: 'platform-error' }

    // --- State ---
    state = {
        apiKey: null,
        apiEndpoint: null,
        currentUser: null,
        currentConversationId: null, // Used only in chat mode
        isGenerating: false, // Track generation state
        startTime: null // For timing generation
    };

    // --- Instances ---
    ui = null;
    difyClient = null;

    constructor() {
        // Basic initialization of UI/API client could happen here if needed,
        // but full init depends on async operations.
        this.ui = new DifyAppUI({ t, marked }); // Instantiate common UI
    }

    /**
     * Initializes the application.
     * Fetches configuration, sets up UI, binds events.
     */
    async init() {
        try {
            await Header.init();

            if (!Header.currentUser) {
                this._handleNotLoggedIn();
                return;
            }
            this.state.currentUser = Header.currentUser;

            // Initialize basic UI elements defined in DifyAppUI
            this.ui.initUserInterface({ 
                inputElementId: this.mainInputElementId, 
                inputErrorElementId: this.inputErrorElementId 
            });

            // Load API configuration
            const loaded = await this._loadApiConfig();
            if (!loaded) return; // Stop if config loading failed

            // Fetch dynamic app info from Dify /info endpoint
            await this._fetchAppInformation();

            // Bind common and potentially specific events
            this.bindEvents();
            this._bindSpecificEvents(); // Allow subclasses to add more bindings

            // Initial UI state update for main input
            const mainInput = document.getElementById(this.mainInputElementId);
            if (mainInput) {
                this.ui.handleInput(mainInput.value);
            }
            
        } catch (error) {
            // console.error(`Error initializing ${this.constructor.name}:`, error);
            const initErrorMsg = t(`${this.difyApiKeyName}.initError`, { default: '初始化应用时出错，请刷新页面重试。' });
             if (this.ui && typeof this.ui.showError === 'function') {
                 this.ui.showError(initErrorMsg);
             }
        } finally {
             // Ensure content is visible after potential i18n loading hide
             document.documentElement.classList.remove('i18n-loading'); 
             document.body.style.display = 'block';
        }
    }

    /** Handles the case where the user is not logged in during init. */
    _handleNotLoggedIn() {
        // console.error('User not authenticated for this application.');
        const errorMsg = t(`${this.difyApiKeyName}.notLoggedIn`, { default: '请先登录以使用此功能。'});
        if (this.ui) {
            this.ui.showError(errorMsg);
        } else {
            // Fallback if UI init failed before check
            document.body.innerHTML = `<p style="color:red; padding: 20px;">${errorMsg}</p>`;
        }
    }

    /** Loads API key and endpoint from storage. Returns true if successful. */
    async _loadApiConfig() {
        // console.log(`[${this.constructor.name}] 开始加载 ${this.difyApiKeyName} 应用的API配置`);
        
        // 1. 获取全局配置中的API端点
        let globalConfig;
        try {
            // console.log(`正在获取全局配置...`);
            globalConfig = await getGlobalConfig();
            // console.log(`获取到的全局配置类型:`, typeof globalConfig, 
                      // globalConfig instanceof Map ? "Map对象" : "普通对象");
            
            if (!globalConfig) {
                // console.error(`全局配置获取失败，返回为空`);
                this.ui.showError(t(`${this.difyApiKeyName}.globalConfigMissing`, {
                    default: `系统全局配置缺失，请联系管理员检查设置。`,
                }));
                return false;
            }
            
            // 检查API端点配置 - 处理Map或普通对象
            let apiEndpoint = null;
            
            if (globalConfig instanceof Map) {
                apiEndpoint = globalConfig.get(this.difyApiKeyName);
                // console.log(`从Map获取API端点尝试 ${this.difyApiKeyName}: ${apiEndpoint || '未找到'}`);
                
                // 如果未找到，尝试不区分大小写匹配
                if (!apiEndpoint) {
                    for (const [key, value] of globalConfig.entries()) {
                        if (key.toLowerCase() === this.difyApiKeyName.toLowerCase()) {
                            apiEndpoint = value;
                            // console.log(`通过不区分大小写匹配找到API端点 ${key}: ${apiEndpoint}`);
                            break;
                        }
                    }
                }
            } else {
                // 处理普通对象
                apiEndpoint = globalConfig[this.difyApiKeyName];
                // console.log(`从对象获取API端点尝试 ${this.difyApiKeyName}: ${apiEndpoint || '未找到'}`);
                
                // 如果未找到，尝试不区分大小写匹配
                if (!apiEndpoint) {
                    for (const key in globalConfig) {
                        if (key.toLowerCase() === this.difyApiKeyName.toLowerCase()) {
                            apiEndpoint = globalConfig[key];
                            // console.log(`通过不区分大小写匹配找到API端点 ${key}: ${apiEndpoint}`);
                            break;
                        }
                    }
                }
            }
            
            if (!apiEndpoint) {
                console.error(`未找到 ${this.difyApiKeyName} 的API端点配置`);
                // console.log(`可用的配置键:`, 
                          // globalConfig instanceof Map 
                          // ? Array.from(globalConfig.keys()) 
                          // : Object.keys(globalConfig));
                
                this.ui.showError(t(`${this.difyApiKeyName}.apiEndpointMissing`, {
                    default: `未能获取 ${this.difyApiKeyName} API 地址，请联系管理员检查全局配置。`,
                    key: this.difyApiKeyName
                }));
                return false;
            }
            
            this.state.apiEndpoint = apiEndpoint;
            // console.log(`成功获取API端点: ${this.state.apiEndpoint}`);
            
        } catch (error) {
            // console.error(`获取全局配置时出错:`, error);
            this.ui.showError(t(`${this.difyApiKeyName}.globalConfigError`, {
                default: `获取全局配置时出错: ${error.message}`,
                error: error.message
            }));
            return false;
        }
        
        // 2. 直接从getCurrentUserApiKeys获取API密钥
        try {
            // console.log(`正在获取用户API密钥...`);
            const apiKeys = await getCurrentUserApiKeys();
            // console.log(`获取到 ${apiKeys.length} 个API密钥记录`);
            
            if (apiKeys.length === 0) {
                // console.error(`未找到任何API密钥记录`);
                this.ui.showError(t(`${this.difyApiKeyName}.noApiKeysFound`, {
                    default: `未找到任何API密钥记录，请在设置中配置。`,
                }));
                return false;
            }
            
            // 输出所有应用ID，帮助调试
            const availableAppIds = apiKeys.map(key => key.applicationID).join(', ');
            // console.log(`可用的应用ID: ${availableAppIds || '无'}`);
            
            // 更灵活地查找匹配的API密钥记录
            let apiKeyRecord = null;
            
            // 1. 精确匹配
            apiKeyRecord = apiKeys.find(key => key.applicationID === this.difyApiKeyName);
            
            // 2. 大小写不敏感匹配
            if (!apiKeyRecord) {
                apiKeyRecord = apiKeys.find(key => 
                    key.applicationID && 
                    key.applicationID.toLowerCase() === this.difyApiKeyName.toLowerCase());
                
                // if (apiKeyRecord) {
                //     console.log(`通过大小写不敏感匹配找到API密钥: ${apiKeyRecord.applicationID}`);
                // }
            }
            
            // 3. 部分包含匹配（针对截图中显示的ID格式）
            if (!apiKeyRecord) {
                for (const record of apiKeys) {
                    // 检查ID是否包含特定前缀/后缀，这是根据截图中的格式判断
                    // 例如: "app-UlsWzEnFGmZVJhHZVOxImBws" 可能是对应 "userStory"
                    // 这是启发式匹配，可能需要根据实际情况调整
                    if (record.applicationID && 
                        (record.applicationID.includes('Story') || 
                         record.applicationID.includes('story'))) {
                        apiKeyRecord = record;
                        // console.log(`通过内容匹配找到userStory的API密钥: ${record.applicationID}`);
                        break;
                    }
                }
            }
            
            // 如果匹配失败，但有其他应用的密钥，使用第一个或最匹配的作为替代（仅用于测试）
            if (!apiKeyRecord && apiKeys.length > 0) {
                if (this.difyApiKeyName === 'userStory' && apiKeys.some(k => k.applicationID === 'userStory')) {
                    apiKeyRecord = apiKeys.find(k => k.applicationID === 'userStory');
                    // console.log(`使用备选applicationID匹配: ${apiKeyRecord.applicationID}`);
                } else {
                    apiKeyRecord = apiKeys[0]; // 使用第一个记录
                    // console.log(`未找到匹配记录，使用第一个API密钥作为替代: ${apiKeyRecord.applicationID}`);
                }
            }
            
            if (!apiKeyRecord) {
                console.error(`未找到 ${this.difyApiKeyName} 的API密钥记录`);
                this.ui.showError(t(`${this.difyApiKeyName}.apiKeyMissingError`, {
                    default: `未能找到 ${this.difyApiKeyName} 的 API 密钥，请在个人设置中配置。`,
                    key: this.difyApiKeyName
                }));
                return false;
            }
            
            this.state.apiKey = apiKeyRecord.apiKey;
            // console.log(`成功获取API密钥: ${apiKeyRecord.applicationID}应用的密钥(已隐藏前几位)`);
            
        } catch (error) {
            // console.error(`获取用户API密钥时出错:`, error);
            this.ui.showError(t(`${this.difyApiKeyName}.apiKeyError`, {
                default: `获取API密钥时出错: ${error.message}`,
                error: error.message
            }));
            return false;
        }
        
        // console.log(`[${this.constructor.name}] API配置加载完成，端点和密钥均已获取`);
        return true;
    }

    /** Fetches and displays application information from Dify /info endpoint. */
    async _fetchAppInformation() {
        if (!this.state.apiKey || !this.state.apiEndpoint) return;

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
            // console.error(`[${this.constructor.name}] Error fetching Dify app info:`, error);
            const errorMsgKey = `${this.difyApiKeyName}.connectionError`;
            const defaultErrorMsg = '无法连接到 Dify API';
            const errorMsg = t(errorMsgKey, { default: defaultErrorMsg });
            this.ui.showError(`${errorMsg}: ${error.message}`);
            // Display a default title if fetch fails
            this.ui.displayAppInfo({ title: t(`${this.difyApiKeyName}.title`, { default: 'AI Application' }) });
        }
    }

    /** Binds common event listeners. */
    bindEvents() {
        const generateButton = document.getElementById('generate-button');
        const mainInput = document.getElementById(this.mainInputElementId);
        const clearFormButton = document.getElementById('clear-form');
        const copyResultButton = document.getElementById('copy-result');
        const expandTextareaButton = document.getElementById('expand-textarea');
        const toggleSystemInfoButton = document.getElementById('toggle-system-info');

        // Main input listener
        if (mainInput) {
            mainInput.addEventListener('input', () => {
                this.ui.handleInput(mainInput.value);
                this.ui.clearInputError(this.inputErrorElementId); // Clear main error on input
            });
        }

        // Generate/Stop button listener
        if (generateButton) {
            generateButton.addEventListener('click', async (e) => {
                e.preventDefault();
                const currentAction = generateButton.getAttribute('data-action') || 'generate';
                if (currentAction === 'stop') {
                    await this.stopGeneration();
                } else if (currentAction === 'generate') {
                    await this.handleGenerate();
                }
            });
        }

        // Other common buttons
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
            toggleSystemInfoButton.addEventListener('click', () => this.ui.toggleSystemInfo());
        }
    }

    /** Placeholder for subclasses to bind additional specific event listeners. */
    _bindSpecificEvents() {
        // Subclasses can override this to bind listeners to additional input fields etc.
    }

    /**
     * Handles the generation request.
     * Orchestrates input validation, API client setup, payload building, and stream handling.
     */
    async handleGenerate() {
        if (!this.ui || !this.state.apiKey || !this.state.apiEndpoint || !this.state.currentUser) {
            // console.error("Cannot generate: App not fully initialized.");
            this.ui?.showError(t(`${this.difyApiKeyName}.initError`, { default: '应用未完全初始化，无法生成。' }));
            return;
        }

        const inputs = this._gatherAndValidateInputs();
        if (!inputs) {
            // console.log(`[${this.constructor.name}] Input validation failed.`);
            return; // Stop if validation fails
        }

        this.ui.setGeneratingState();
        this.ui.clearResultArea();
        this.ui.showResultContainer();
        this.state.startTime = Date.now();

        try {
            this.difyClient = new DifyClient({
                baseUrl: this.state.apiEndpoint,
                apiKey: this.state.apiKey,
                mode: this.difyMode
            });

            const payload = this._buildPayload(inputs);
            const baseCallbacks = this._getBaseCallbacks();
            const specificCallbacks = this._getSpecificCallbacks(); // Allow subclasses to add/override
            const finalCallbacks = { ...baseCallbacks, ...specificCallbacks };

            await this.difyClient.generateStream(payload, finalCallbacks);

        } catch (initError) {
            // console.error(`[${this.constructor.name}] Error setting up generation:`, initError);
            this.ui.showGenerationCompleted(); // Ensure button reset
            this.ui.showError(t(`${this.difyApiKeyName}.generationSetupError`, { default: '启动生成时出错:'}) + ` ${initError.message}`);
            this.difyClient = null;
        }
    }

    /** Stops the current Dify generation stream. */
    async stopGeneration() {
        if (this.difyClient) {
            this.difyClient.stopGeneration();
            // UI reset is handled by onError callback catching AbortError
        } else {
            // console.warn(`[${this.constructor.name}] No active DifyClient instance to stop.`); // Keep warn if needed
            if (this.ui) this.ui.showGenerationCompleted();
        }
    }

    /** Handles copying the result text. */
    handleCopyResult() {
        if (this.ui) {
            this.ui.copyResult();
        }
    }

    /** Handles clearing the form inputs and result area. */
    handleClearForm() {
        if (this.ui) {
            this.ui.clearForm(); // DifyAppUI should handle clearing registered inputs
            this.ui.clearResultArea();
            this.state.currentConversationId = null; // Reset conversation for chat apps
        }
    }

    /** Toggles the expansion state of the main textarea. */
    toggleTextareaExpand() {
        if (this.ui) {
            this.ui.toggleTextareaExpand(this.mainInputElementId); // Pass the ID
        }
    }
    
    // --- Abstract/Template Methods (to be implemented by subclasses) ---

    /**
     * Gathers input values from the DOM and performs validation specific to the application.
     * @returns {object | null} An object containing the validated input values, or null if validation fails.
     * Should display error messages using this.ui.showInputError() if validation fails.
     */
    _gatherAndValidateInputs() {
        throw new Error('Subclasses must implement _gatherAndValidateInputs()');
        // Example for single input:
        // const inputElement = document.getElementById(this.mainInputElementId);
        // const value = inputElement ? inputElement.value.trim() : '';
        // if (!value) {
        //     this.ui.showInputError(this.inputErrorElementId, t('common.error.inputRequired'));
        //     return null;
        // }
        // // Add length validation etc.
        // return { mainInput: value }; 
    }

    /**
     * Builds the payload object required by the Dify API (chat or workflow).
     * @param {object} inputs - The validated input values returned by _gatherAndValidateInputs().
     * @returns {object} The payload object for the DifyClient.generateStream call.
     */
    _buildPayload(inputs) {
        throw new Error('Subclasses must implement _buildPayload()');
        // Example for chat:
        // return {
        //     query: inputs.mainInput,
        //     user: this.state.currentUser.username || 'unknown-user',
        //     response_mode: 'streaming',
        //     conversation_id: this.state.currentConversationId || undefined
        // };
        // Example for workflow:
        // return {
        //     inputs: { ...inputs }, // Map validated inputs to Dify workflow input names
        //     user: this.state.currentUser.username || 'unknown-user',
        //     response_mode: 'streaming'
        // };
    }
    
    /**
     * Returns the base callback functions for DifyClient.
     * @returns {object} An object containing onMessage, onComplete, onError handlers.
     */
    _getBaseCallbacks() {
        return {
            onMessage: (content, isFirstChunk) => {
                this.ui.appendStreamContent(content);
            },
            onComplete: (metadata) => {
                this._handleCompletion(metadata);
            },
            onError: (error) => {
                this._handleError(error);
            }
        };
    }

    /** 
     * Placeholder for subclasses to provide additional or override callbacks 
     * (e.g., onWorkflowStarted, onNodeCompleted).
     * @returns {object} An object containing specific callbacks.
     */
    _getSpecificCallbacks() {
        // Subclasses override to provide e.g., workflow callbacks
        return {}; 
    }

    /**
     * Handles the completion of the Dify stream.
     * Updates UI state, displays stats, and handles conversation ID for chat apps.
     * @param {object} metadata - The final metadata object from DifyClient.
     */
    _handleCompletion(metadata) {
        this.ui.showGenerationCompleted();
        this.ui.displaySystemInfo(metadata); 

        // Handle stats display
        if (metadata && metadata.usage && (metadata.usage.total_tokens !== undefined || metadata.usage.completion_tokens !== undefined)) {
           this.ui.displayStats(metadata);
        } else {
           // console.warn(`[${this.constructor.name}] Metadata or usage data is missing/incomplete. Skipping stats display.`, metadata);
           // Optionally display a message if stats are unavailable
           // this.ui.displayMessage(t('common.statsUnavailable'), 'warning'); 
        }
        
        // Update conversation ID for chat mode
        if (this.difyMode === 'chat' && metadata.conversation_id) {
            this.state.currentConversationId = metadata.conversation_id;
        }

        this.ui.renderMarkdown(); // Render final accumulated content
        this.difyClient = null; // Clean up client instance
        this.state.isGenerating = false;
    }

    /**
     * Handles errors during the Dify stream.
     * Displays appropriate messages and resets UI state.
     * @param {Error} error - The error object.
     */
    _handleError(error) {
        if (error.name === 'AbortError') {
            this.ui.showToast(t('common.generationStoppedByUser', { default: '生成已由用户停止。' }), 'info');
        } else {
            // console.error(`[${this.constructor.name}] Dify API Error:`, error);
            this.ui.showError(t('common.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
        }
        this.ui.showGenerationCompleted(); // Ensure button/UI reset
        this.difyClient = null; // Clean up client instance
        this.state.isGenerating = false;
    }
}

export default BaseDifyApp; 