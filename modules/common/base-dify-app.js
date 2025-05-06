// 禁用调试日志
const DEBUG = false;

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
        startTime: null, // For timing generation
        appInfo: null // Added for app info storage
    };

    // --- Instances ---
    ui = null;
    difyClient = null;
    difyAppInfo = null; // Add property to store fetched info

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

            if (this.ui) {
                console.log(`[BaseDifyApp ${this.constructor.name}] Calling ui.initUserInterface...`);
                this.ui.initUserInterface({
                    inputElementId: this.mainInputElementId,
                    inputErrorElementId: this.inputErrorElementId
                });
                console.log(`[BaseDifyApp ${this.constructor.name}] ui.initUserInterface completed.`);
            } else {
                console.error(`[${this.constructor.name}] UI object not initialized before BaseDifyApp.init`);
            }

            const configResult = await this._loadApiConfig();
            if (!configResult) { return; }
            this.state.apiEndpoint = configResult.endpoint;
            this.state.apiKey = configResult.key;
            this.difyMode = (configResult.type === 'chat' || configResult.type === 'workflow') ? configResult.type : this.difyMode;

            if (this.state.apiKey && this.state.apiEndpoint && this.state.currentUser) {
                if (DEBUG) console.log(`[${this.constructor.name}] API Key and Endpoint found. Proceeding with initialization.`);
                await this._fetchAppInfo();

                if (this.ui) {
                    console.log(`[BaseDifyApp ${this.constructor.name}] Calling ui.displayAppInfo...`);
                    this.ui.displayAppInfo(this.state.appInfo);
                     console.log(`[BaseDifyApp ${this.constructor.name}] ui.displayAppInfo completed.`);
                } else {
                     console.error(`[${this.constructor.name}] UI object not available to display app info.`);
                }
            } else {
                 console.error(`[${this.constructor.name}] Missing API key, endpoint, or user during initialization.`);
                 this.ui?.showError(t(`${this.difyApiKeyName}.initError`, { default: '初始化应用时出错，请刷新页面重试。' }));
            }

            this.bindEvents();
            this._bindSpecificEvents();

            if (this.ui) {
                const mainInput = document.getElementById(this.mainInputElementId);
                 if (mainInput) {
                     this.ui.handleInput(mainInput.value);
                 } else {
                      console.warn(`[${this.constructor.name}] Main input element #${this.mainInputElementId} not found for initial handling.`);
                 }
            }

        } catch (error) {
             console.error(`Error initializing ${this.constructor.name}:`, error);
             this.ui?.showError(t(`${this.difyApiKeyName}.initError`, { default: '初始化应用时出错，请刷新页面重试。' }));
        } finally {
             this.state.isInitializing = false;
             if (DEBUG) console.log(`[${this.constructor.name}] Initialization process finished.`);
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

    /** Loads API key and endpoint from storage. Returns configuration object or null. */
    async _loadApiConfig() {
        // console.log(`[${this.constructor.name}] 开始加载 ${this.difyApiKeyName} 应用的API配置`);
        let endpointLoaded = false;
        let keyLoaded = false;

        let apiEndpointUrl = null; // Temporary variable for endpoint URL string
        let apiType = null; // Temporary variable for application type string
        let apiKeyString = null; // Temporary variable for API key string

        // --- 1. 获取全局配置 (API Endpoint URL 和 Type) ---
        try {
            // console.log(`[${this.constructor.name}] 正在获取全局配置...`);
            const globalConfigMap = await getGlobalConfig();

            if (!globalConfigMap || globalConfigMap.size === 0) {
                throw new Error("全局配置获取失败或为空");
            }

            const appConfig = globalConfigMap.get(this.difyApiKeyName);
            // console.log(`[${this.constructor.name}] 查找到的 ${this.difyApiKeyName} 配置:`, appConfig);

            if (!appConfig) {
                throw new Error(`未在全局配置中找到 ${this.difyApiKeyName} 的配置条目`);
            }
            if (typeof appConfig.value !== 'string' || !appConfig.value) {
                throw new Error(`配置中的 API 地址 (value) 无效或不是字符串: ${JSON.stringify(appConfig.value)}`);
            }
            if (typeof appConfig.type !== 'string' || !appConfig.type) {
                throw new Error(`配置中的应用类型 (type) 无效或不是字符串: ${JSON.stringify(appConfig.type)}`);
            }

            // Store in temporary variables first
            apiEndpointUrl = appConfig.value;
            apiType = appConfig.type;

            // console.log(`[${this.constructor.name}] 临时变量 apiEndpointUrl (类型: ${typeof apiEndpointUrl}): ${apiEndpointUrl}`);
            // console.log(`[${this.constructor.name}] 临时变量 apiType (类型: ${typeof apiType}): ${apiType}`);

            endpointLoaded = true;

        } catch (error) {
            // console.error(`[${this.constructor.name}] 获取或处理全局配置时出错:`, error);
            this.ui?.showError(t(`${this.difyApiKeyName}.globalConfigError`, {
                default: `获取全局配置时出错: ${error.message}`,
                error: error.message
            }));
            return null; // Return null on error
        }

        // --- 2. 获取用户 API 密钥 --- 
        try {
            // console.log(`[${this.constructor.name}] 正在获取用户API密钥...`);
            const userApiKeys = await getCurrentUserApiKeys();
            // console.log(`[${this.constructor.name}] 获取到 ${userApiKeys.length} 个API密钥记录`);

            if (!Array.isArray(userApiKeys)) {
                 throw new Error("获取到的 API 密钥不是有效数组");
            }

            const apiKeyRecord = userApiKeys.find(key => 
                key && key.applicationID === this.difyApiKeyName
            );
             // console.log(`[${this.constructor.name}] 查找到的 ${this.difyApiKeyName} API 密钥记录:`, apiKeyRecord);

            if (!apiKeyRecord) {
                 throw new Error(`未找到 ${this.difyApiKeyName} 的 API 密钥记录`);
            }
            if (typeof apiKeyRecord.apiKey !== 'string' || !apiKeyRecord.apiKey) {
                 throw new Error(`API 密钥记录中的 apiKey 无效或不是字符串: ${JSON.stringify(apiKeyRecord.apiKey)}`);
            }
            
            // Store in temporary variable first
            apiKeyString = apiKeyRecord.apiKey;
            // console.log(`[${this.constructor.name}] 临时变量 apiKeyString (类型: ${typeof apiKeyString}): ${apiKeyString ? apiKeyString.substring(0, 10) + '...' : ''}`); // Log safely

            keyLoaded = true;

        } catch (error) {
            // console.error(`[${this.constructor.name}] 获取或处理用户 API 密钥时出错:`, error);
            this.ui?.showError(t(`${this.difyApiKeyName}.apiKeyError`, {
                default: `获取API密钥时出错: ${error.message}`,
                error: error.message
            }));
            return null; // Return null on error
        }

        // --- 3. 验证并返回结果对象 --- 
        if (endpointLoaded && keyLoaded) {
             // console.log(`[${this.constructor.name}] API配置加载完成，返回配置对象。`);
             // Return the fetched data as an object
             return {
                 endpoint: apiEndpointUrl,
                 key: apiKeyString,
                 type: apiType
             };
        } else {
            // console.error(`[${this.constructor.name}] API 配置加载未能完成。endpointLoaded=${endpointLoaded}, keyLoaded=${keyLoaded}`);
            return null; // Return null if loading failed
        }
    }

    /** Fetches and displays application information from Dify /info endpoint. */
    async _fetchAppInformation() {
        if (typeof this.state.apiEndpoint !== 'string' || !this.state.apiEndpoint) {
            // console.error(`[_fetchAppInformation] PREVENTING FETCH: apiEndpoint is not a valid string. Value:`, this.state.apiEndpoint);
            this.ui?.showError(t(`${this.difyApiKeyName}.apiEndpointInvalid`, {
                default: `API 地址无效 (${this.state.apiEndpoint})，无法获取应用信息。请检查配置。`,
                endpoint: String(this.state.apiEndpoint)
            }));
            return;
        }
        if (typeof this.state.apiKey !== 'string' || !this.state.apiKey) {
             // console.error(`[_fetchAppInformation] PREVENTING FETCH: apiKey is not a valid string. Value:`, this.state.apiKey);
             this.ui?.showError(t(`${this.difyApiKeyName}.apiKeyInvalid`, {
                 default: `API 密钥无效，无法获取应用信息。请检查配置。`
             }));
            return;
        }

        const infoUrl = `${this.state.apiEndpoint}/info`;
        // console.log(`[${this.constructor.name}] Fetching Dify app info from: ${infoUrl}`); // 添加日志

        try {
            const response = await fetch(infoUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.state.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                // console.error(`[${this.constructor.name}] Error fetching Dify app info. Status: ${response.status}`);
                // 尝试读取错误响应体
                let errorBody = '';
                try {
                    errorBody = await response.text(); // 读取文本而不是JSON
                    // console.error(`[${this.constructor.name}] Error response body:`, errorBody);
                } catch (bodyError) {
                    // console.error(`[${this.constructor.name}] Could not read error response body:`, bodyError);
                }
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody.substring(0, 100)}...`); // 截断过长的body
            }

            // 尝试解析 JSON
            const data = await response.json();
            // console.log(`[${this.constructor.name}] 成功获取 Dify 应用信息:`, data);
            this.difyAppInfo = data; // 保存获取到的信息
            return data;

        } catch (error) {
            // console.error(`[${this.constructor.name}] Error fetching Dify app info:`, error);

            // 检查是否为 SyntaxError，并尝试打印原始文本
            if (error instanceof SyntaxError && error.message.includes("Unexpected token '<'")) {
                // console.warn(`[${this.constructor.name}] Response was not valid JSON. Attempting to read as text...`);
                // 尝试重新发起请求并读取文本 (注意：这会额外请求一次，但有助于调试)
                // 或者，如果能从原始 error 中获取 response 对象，会更高效，但 fetch API 的标准错误不直接包含它
                try {
                    const textResponse = await fetch(infoUrl, { // 再次 fetch
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${this.state.apiKey}` }
                    });
                    const responseText = await textResponse.text();
                    // console.error(`[${this.constructor.name}] Received non-JSON response (HTML?):`, responseText);
                    // 抛出更具体的错误，说明收到了非JSON
                    throw new Error(`Received non-JSON response from ${infoUrl}. Body starts with: ${responseText.substring(0, 100)}...`);
                } catch (textFetchError) {
                    // console.error(`[${this.constructor.name}] Failed to re-fetch or read response as text:`, textFetchError);
                    // 重新抛出原始错误
                    throw error;
                }
            } else {
                 // 重新抛出其他类型的错误
                throw error;
            }
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
            generateButton.addEventListener('click', () => {
                if (!this.state.isGenerating && !generateButton.disabled) {
                    this.handleGenerate();
                } else {
                     console.log("[BaseDifyApp] Generate button clicked but ignored (generating or disabled).");
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
        console.log(`[BaseDifyApp ${this.constructor.name}] handleGenerate called.`); // Log 1

        if (!this.ui || !this.state.apiKey || !this.state.apiEndpoint || !this.state.currentUser) {
            console.error(`[BaseDifyApp ${this.constructor.name}] Cannot generate: App not fully initialized or missing config. State:`, this.state);
            this.ui?.showError(t(`${this.difyApiKeyName}.initError`, { default: '应用未完全初始化或缺少配置，无法生成。' }));
            return;
        }

        console.log(`[BaseDifyApp ${this.constructor.name}] Calling _gatherAndValidateInputs...`); // Log 3
        const inputs = this._gatherAndValidateInputs(); // Always gather inputs from DOM via subclass method
        console.log(`[BaseDifyApp ${this.constructor.name}] _gatherAndValidateInputs returned:`, inputs); // Log 4
        if (!inputs) {
             console.log(`[BaseDifyApp ${this.constructor.name}] Validation failed or no inputs, exiting handleGenerate.`); // Log 5
            this.ui?.showGenerationCompleted(); // Reset button if validation fails
            this.state.isGenerating = false;
            return; // Stop if validation fails
        }

        console.log(`[BaseDifyApp ${this.constructor.name}] Setting requesting state...`); // Log 6
        this.ui.setRequestingState();
        this.ui.clearResultArea();
        this.ui.showResultContainer();
        this.state.startTime = Date.now();
        this.state.isGenerating = true;

        let finalCallbacks = null;

        try {
            console.log(`[BaseDifyApp ${this.constructor.name}] Creating DifyClient... Mode: ${this.difyMode}, Endpoint: ${this.state.apiEndpoint}`); // Log 7
            this.difyClient = new DifyClient({
                baseUrl: this.state.apiEndpoint,
                apiKey: this.state.apiKey,
                mode: this.difyMode
            });
            console.log(`[BaseDifyApp ${this.constructor.name}] DifyClient created.`); // Log 8

            console.log(`[BaseDifyApp ${this.constructor.name}] Building payload...`); // Log 9
            const payload = this._buildPayload(inputs); // Use gathered inputs
             if (!payload) {
                 console.error(`[BaseDifyApp ${this.constructor.name}] Payload is null, aborting generateStream call.`); // Log 10
                 throw new Error("Failed to build payload.");
             }
             console.log(`[BaseDifyApp ${this.constructor.name}] Payload built.`); // Log 11

            console.log(`[BaseDifyApp ${this.constructor.name}] Getting callbacks...`); // Log 12
            const baseCallbacks = this._getBaseCallbacks();
            const specificCallbacks = this._getSpecificCallbacks();
            finalCallbacks = { ...baseCallbacks, ...specificCallbacks };
            console.log(`[BaseDifyApp ${this.constructor.name}] Callbacks prepared.`); // Log 13

            let generatingStateSet = false;
            const originalOnMessage = finalCallbacks.onMessage;
            const originalOnWorkflowStarted = finalCallbacks.onWorkflowStarted;
            const originalOnNodeStarted = finalCallbacks.onNodeStarted; 
            const originalOnThought = finalCallbacks.onThought;

            const setGeneratingUI = () => {
                if (!generatingStateSet) {
                    console.log(`[BaseDifyApp ${this.constructor.name}] Setting generating UI state.`); // <-- Log 14
                    this.ui.setGeneratingState();
                    generatingStateSet = true;
                }
            };

            finalCallbacks.onMessage = (content, isFirstChunk) => {
                setGeneratingUI(); // Set generating state on first message
                console.log(`[BaseDifyApp Callback] onMessage called. isFirstChunk: ${isFirstChunk}`); // <-- Log 15
                if (originalOnMessage) originalOnMessage(content, isFirstChunk);
            };
             // Add logging for other key callbacks too
             finalCallbacks.onComplete = (metadata) => {
                 console.log(`[BaseDifyApp Callback] onComplete called.`); // <-- Log 18
                 if (baseCallbacks.onComplete) baseCallbacks.onComplete(metadata); // Call original base if needed
             };
              finalCallbacks.onError = (error) => {
                 console.error(`[BaseDifyApp Callback] onError called with:`, error); // <-- Log 19 (Log the error)
                 if (baseCallbacks.onError) baseCallbacks.onError(error); // Call original base if needed
             };
             finalCallbacks.onWorkflowStarted = (data) => {
                 setGeneratingUI(); // Set generating state on workflow start
                 console.log(`[BaseDifyApp Callback] onWorkflowStarted called.`); // <-- Log 16
                 if (originalOnWorkflowStarted) originalOnWorkflowStarted(data);
             };
              finalCallbacks.onNodeStarted = (data) => { // Add handler for node start
                 setGeneratingUI(); // Also set generating state on first node start
                 console.log(`[BaseDifyApp Callback] onNodeStarted called.`); // <-- Log 17
                 if (originalOnNodeStarted) originalOnNodeStarted(data);
              };
              finalCallbacks.onThought = (data) => {
                  console.log(`[BaseDifyApp Callback] onThought called.`); // <-- Log 17.5
                  if (originalOnThought) originalOnThought(data);
              };

            console.log(`[BaseDifyApp ${this.constructor.name}] Calling difyClient.generateStream...`); // Log 20
            await this.difyClient.generateStream(payload, finalCallbacks);
            console.log(`[BaseDifyApp ${this.constructor.name}] generateStream promise resolved (or finished).`); // Log 21

        } catch (error) {
            console.error(`[BaseDifyApp ${this.constructor.name}] Error in handleGenerate try block:`, error);
            if (finalCallbacks && finalCallbacks.onError) {
                  finalCallbacks.onError(error);
             } else {
                 console.error(`[BaseDifyApp ${this.constructor.name}] Fallback error handling in catch block.`);
                 this.ui?.showGenerationCompleted();
                 this.ui?.showErrorInResult(t(`${this.difyApiKeyName}.generationSetupError`, { default: '启动生成时出错:'}) + ` ${error.message}`);
                 this.difyClient = null;
                 this.state.isGenerating = false;
             }
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

        // --- ADDED LOGIC for Workflow Final Output Override ---
        // If in workflow mode and nodeOutputText exists (from node_finished event),
        // use it to overwrite any previously streamed content.
        if (this.difyMode === 'workflow' && metadata.nodeOutputText && typeof this.ui.setStreamContent === 'function') {
            // console.log(`[${this.constructor.name}] Workflow finished. Overwriting content with nodeOutputText.`);
            this.ui.setStreamContent(metadata.nodeOutputText); // Use the new UI method
        }
        // --- END ADDED LOGIC ---

        this.ui.renderMarkdown(); // Render final content (either streamed or overwritten)
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

    // --- NEW: Fetch App Info ---
    /**
     * Fetches application metadata (name, description, tags) from the Dify /info endpoint.
     * Stores the result in this.state.appInfo.
     * @private
     */
    async _fetchAppInfo() {
        if (!this.state.apiKey || !this.state.apiEndpoint) {
            console.warn(`[${this.constructor.name}] Cannot fetch app info: missing API key or endpoint.`);
            return;
        }

        const infoUrl = `${this.state.apiEndpoint}/info`; // 使用完整API基础URL
         if (DEBUG) console.log(`[${this.constructor.name}] Fetching app info from ${infoUrl}...`);

        try {
            const response = await fetch(infoUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.state.apiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                 // Try to get error details from response body
                 let errorBody = `HTTP error! status: ${response.status}`;
                 try {
                      const errorJson = await response.json();
                      errorBody = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
                 } catch (e) { /* ignore parsing error */ }
                 throw new Error(errorBody);
            }

            const appInfo = await response.json();
            if (DEBUG) console.log(`[${this.constructor.name}] Fetched App Info:`, appInfo);

            // Store fetched info in state
            this.state.appInfo = {
                name: appInfo.name || '',
                description: appInfo.description || '',
                tags: appInfo.tags || []
            };

        } catch (error) {
            console.error(`[${this.constructor.name}] Error fetching app info from /info endpoint:`, error);
            // Set default/empty info on error? Or show error? For now, just log.
            this.state.appInfo = { name: '', description: '', tags: [] }; // Set empty state on error
             this.ui?.showToast(t('common.error.fetchAppInfoFailed', { default: '获取应用信息失败' }), 'error');
        }
    }
    // --- END NEW ---

    /**
     * Initializes the User Interface manager.
     * Separated to allow calling after fetching necessary data.
     * @private
     */
    _initUserInterface() {
        if (!this.ui) {
            console.error(`[${this.constructor.name}] UI manager not instantiated.`);
            return;
        }
        try {
            if (typeof this.ui.initUserInterface === 'function') {
                this.ui.initUserInterface(); // Cache DOM elements
            }
             // ---> MOVE displayAppInfo call here, after fetching <---
             if (this.state.appInfo && typeof this.ui.displayAppInfo === 'function') {
                 if (DEBUG) console.log(`[${this.constructor.name}] Displaying fetched app info via UI manager.`);
                 this.ui.displayAppInfo(this.state.appInfo);
             } else if (DEBUG) {
                 console.log(`[${this.constructor.name}] Skipping displayAppInfo: App info not fetched or UI method missing.`);
             }
             // ---> END MOVE <---
        } catch (error) {
             console.error(`[${this.constructor.name}] Error initializing UI:`, error);
        }
    }
}

export default BaseDifyApp; 