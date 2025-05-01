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

            // Load API configuration by calling _loadApiConfig
            const configResult = await this._loadApiConfig();

            // Check if configuration loading was successful
            if (!configResult) {
                console.error(`[${this.constructor.name}] API 配置加载失败，终止初始化。`);
                // Error message should have been shown by _loadApiConfig
                return; 
            }

            // --- Assign configuration values HERE in init --- 
            console.log(`[${this.constructor.name}] 在 init 函数中进行赋值...`);
            this.state.apiEndpoint = configResult.endpoint; // Assign string URL
            this.state.apiKey = configResult.key;       // Assign string Key
            
            // Validate and assign type to difyMode
            if (configResult.type === 'chat' || configResult.type === 'workflow') {
                this.difyMode = configResult.type;
            } else {
                console.warn(`[${this.constructor.name}] 从配置获取的应用类型 '${configResult.type}' 无效，将默认使用 '${this.difyMode}'`);
                // Keep the default this.difyMode if type is invalid
            }
            
            // --- Log types and values AFTER assignment in init ---
            console.log(`[${this.constructor.name}] init 函数赋值后:`);
            console.log(`  this.state.apiEndpoint (类型: ${typeof this.state.apiEndpoint}):`, this.state.apiEndpoint);
            console.log(`  this.state.apiKey (类型: ${typeof this.state.apiKey}):`, this.state.apiKey ? this.state.apiKey.substring(0, 10) + '...' : '');
            console.log(`  this.difyMode (类型: ${typeof this.difyMode}):`, this.difyMode);
            // --- End logging ---

            // Fetch dynamic app info from Dify /info endpoint and display it
            try {
                const appInfoData = await this._fetchAppInformation(); // Call AFTER assignment
                if (appInfoData) {
                    this.ui.displayAppInfo(appInfoData); // Use the returned data to update UI
                } else {
                     console.warn(`[${this.constructor.name}] _fetchAppInformation did not return valid data.`);
                     // Optionally show a default or error state in UI if fetch succeeded but returned no data
                     this.ui.displayAppInfo(); // Display default placeholders
                 }
            } catch (error) {
                 console.error(`[${this.constructor.name}] Error during _fetchAppInformation or UI display:`, error);
                 // Show error in the UI. _fetchAppInformation might have already shown one, 
                 // but this catches errors in displayAppInfo too.
                 this.ui.showError(t(`${this.difyApiKeyName}.fetchInfoError`, {
                     default: `获取或显示应用信息时出错: ${error.message}`,
                     error: error.message
                 }));
                 // Display default title even on error
                 this.ui.displayAppInfo({ title: t(`${this.difyApiKeyName}.title`, { default: 'AI Application' }) });
            }

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

    /** Loads API key and endpoint from storage. Returns configuration object or null. */
    async _loadApiConfig() {
        console.log(`[${this.constructor.name}] 开始加载 ${this.difyApiKeyName} 应用的API配置`);
        let endpointLoaded = false;
        let keyLoaded = false;

        let apiEndpointUrl = null; // Temporary variable for endpoint URL string
        let apiType = null; // Temporary variable for application type string
        let apiKeyString = null; // Temporary variable for API key string

        // --- 1. 获取全局配置 (API Endpoint URL 和 Type) ---
        try {
            console.log(`[${this.constructor.name}] 正在获取全局配置...`);
            const globalConfigMap = await getGlobalConfig();

            if (!globalConfigMap || globalConfigMap.size === 0) {
                throw new Error("全局配置获取失败或为空");
            }

            const appConfig = globalConfigMap.get(this.difyApiKeyName);
            console.log(`[${this.constructor.name}] 查找到的 ${this.difyApiKeyName} 配置:`, appConfig);

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

            console.log(`[${this.constructor.name}] 临时变量 apiEndpointUrl (类型: ${typeof apiEndpointUrl}): ${apiEndpointUrl}`);
            console.log(`[${this.constructor.name}] 临时变量 apiType (类型: ${typeof apiType}): ${apiType}`);

            endpointLoaded = true;

        } catch (error) {
            console.error(`[${this.constructor.name}] 获取或处理全局配置时出错:`, error);
            this.ui?.showError(t(`${this.difyApiKeyName}.globalConfigError`, {
                default: `获取全局配置时出错: ${error.message}`,
                error: error.message
            }));
            return null; // Return null on error
        }

        // --- 2. 获取用户 API 密钥 --- 
        try {
            console.log(`[${this.constructor.name}] 正在获取用户API密钥...`);
            const userApiKeys = await getCurrentUserApiKeys();
            console.log(`[${this.constructor.name}] 获取到 ${userApiKeys.length} 个API密钥记录`);

            if (!Array.isArray(userApiKeys)) {
                 throw new Error("获取到的 API 密钥不是有效数组");
            }

            const apiKeyRecord = userApiKeys.find(key => 
                key && key.applicationID === this.difyApiKeyName
            );
             console.log(`[${this.constructor.name}] 查找到的 ${this.difyApiKeyName} API 密钥记录:`, apiKeyRecord);

            if (!apiKeyRecord) {
                 throw new Error(`未找到 ${this.difyApiKeyName} 的 API 密钥记录`);
            }
            if (typeof apiKeyRecord.apiKey !== 'string' || !apiKeyRecord.apiKey) {
                 throw new Error(`API 密钥记录中的 apiKey 无效或不是字符串: ${JSON.stringify(apiKeyRecord.apiKey)}`);
            }
            
            // Store in temporary variable first
            apiKeyString = apiKeyRecord.apiKey;
            console.log(`[${this.constructor.name}] 临时变量 apiKeyString (类型: ${typeof apiKeyString}): ${apiKeyString ? apiKeyString.substring(0, 10) + '...' : ''}`); // Log safely

            keyLoaded = true;

        } catch (error) {
            console.error(`[${this.constructor.name}] 获取或处理用户 API 密钥时出错:`, error);
            this.ui?.showError(t(`${this.difyApiKeyName}.apiKeyError`, {
                default: `获取API密钥时出错: ${error.message}`,
                error: error.message
            }));
            return null; // Return null on error
        }

        // --- 3. 验证并返回结果对象 --- 
        if (endpointLoaded && keyLoaded) {
             console.log(`[${this.constructor.name}] API配置加载完成，返回配置对象。`);
             // Return the fetched data as an object
             return {
                 endpoint: apiEndpointUrl,
                 key: apiKeyString,
                 type: apiType
             };
        } else {
            console.error(`[${this.constructor.name}] API 配置加载未能完成。endpointLoaded=${endpointLoaded}, keyLoaded=${keyLoaded}`);
            return null; // Return null if loading failed
        }
    }

    /** Fetches and displays application information from Dify /info endpoint. */
    async _fetchAppInformation() {
        if (typeof this.state.apiEndpoint !== 'string' || !this.state.apiEndpoint) {
            console.error(`[_fetchAppInformation] PREVENTING FETCH: apiEndpoint is not a valid string. Value:`, this.state.apiEndpoint);
            this.ui?.showError(t(`${this.difyApiKeyName}.apiEndpointInvalid`, {
                default: `API 地址无效 (${this.state.apiEndpoint})，无法获取应用信息。请检查配置。`,
                endpoint: String(this.state.apiEndpoint)
            }));
            return;
        }
        if (typeof this.state.apiKey !== 'string' || !this.state.apiKey) {
             console.error(`[_fetchAppInformation] PREVENTING FETCH: apiKey is not a valid string. Value:`, this.state.apiKey);
             this.ui?.showError(t(`${this.difyApiKeyName}.apiKeyInvalid`, {
                 default: `API 密钥无效，无法获取应用信息。请检查配置。`
             }));
            return;
        }

        const infoUrl = `${this.state.apiEndpoint}/info`;
        console.log(`[${this.constructor.name}] Fetching Dify app info from: ${infoUrl}`); // 添加日志

        try {
            const response = await fetch(infoUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.state.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`[${this.constructor.name}] Error fetching Dify app info. Status: ${response.status}`);
                // 尝试读取错误响应体
                let errorBody = '';
                try {
                    errorBody = await response.text(); // 读取文本而不是JSON
                    console.error(`[${this.constructor.name}] Error response body:`, errorBody);
                } catch (bodyError) {
                    console.error(`[${this.constructor.name}] Could not read error response body:`, bodyError);
                }
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody.substring(0, 100)}...`); // 截断过长的body
            }

            // 尝试解析 JSON
            const data = await response.json();
            console.log(`[${this.constructor.name}] 成功获取 Dify 应用信息:`, data);
            this.difyAppInfo = data; // 保存获取到的信息
            return data;

        } catch (error) {
            console.error(`[${this.constructor.name}] Error fetching Dify app info:`, error);

            // 检查是否为 SyntaxError，并尝试打印原始文本
            if (error instanceof SyntaxError && error.message.includes("Unexpected token '<'")) {
                console.warn(`[${this.constructor.name}] Response was not valid JSON. Attempting to read as text...`);
                // 尝试重新发起请求并读取文本 (注意：这会额外请求一次，但有助于调试)
                // 或者，如果能从原始 error 中获取 response 对象，会更高效，但 fetch API 的标准错误不直接包含它
                try {
                    const textResponse = await fetch(infoUrl, { // 再次 fetch
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${this.state.apiKey}` }
                    });
                    const responseText = await textResponse.text();
                    console.error(`[${this.constructor.name}] Received non-JSON response (HTML?):`, responseText);
                    // 抛出更具体的错误，说明收到了非JSON
                    throw new Error(`Received non-JSON response from ${infoUrl}. Body starts with: ${responseText.substring(0, 100)}...`);
                } catch (textFetchError) {
                    console.error(`[${this.constructor.name}] Failed to re-fetch or read response as text:`, textFetchError);
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
            console.error("Cannot generate: App not fully initialized or missing API config."); // Enhanced log
            this.ui?.showError(t(`${this.difyApiKeyName}.initError`, { default: '应用未完全初始化或缺少配置，无法生成。' })); // Enhanced message
            return;
        }

        const inputs = this._gatherAndValidateInputs();
        if (!inputs) {
            return; // Stop if validation fails
        }

        this.ui.setRequestingState(); // Use requesting state initially
        this.ui.clearResultArea();
        this.ui.showResultContainer();
        this.state.startTime = Date.now();

        try {
            // 使用从 _loadApiConfig 获取并设置的 apiEndpoint 和 difyMode
            this.difyClient = new DifyClient({
                baseUrl: this.state.apiEndpoint, 
                apiKey: this.state.apiKey,
                mode: this.difyMode // 使用动态设置的模式
            });
            console.log(`[${this.constructor.name}] DifyClient created with mode: ${this.difyMode} and endpoint: ${this.state.apiEndpoint}`);

            const payload = this._buildPayload(inputs);
            const baseCallbacks = this._getBaseCallbacks();
            const specificCallbacks = this._getSpecificCallbacks(); 
            const finalCallbacks = { ...baseCallbacks, ...specificCallbacks };

            // Add a callback to switch to generating state once stream starts (e.g., on first message or workflow started)
            const originalOnMessage = finalCallbacks.onMessage;
            const originalOnWorkflowStarted = finalCallbacks.onWorkflowStarted;
            let generatingStateSet = false;

            finalCallbacks.onMessage = (content, isFirstChunk) => {
                if (!generatingStateSet) {
                    this.ui.setGeneratingState();
                    generatingStateSet = true;
                }
                 if (originalOnMessage) originalOnMessage(content, isFirstChunk);
            };
             // Also trigger generating state when workflow starts (if applicable)
             finalCallbacks.onWorkflowStarted = (data) => {
                 if (!generatingStateSet) {
                     this.ui.setGeneratingState();
                     generatingStateSet = true;
                 }
                  if (originalOnWorkflowStarted) originalOnWorkflowStarted(data);
            };

            await this.difyClient.generateStream(payload, finalCallbacks);

        } catch (initError) {
            console.error(`[${this.constructor.name}] Error setting up or running generation:`, initError);
            this.ui.showGenerationCompleted(); // Ensure button reset
            this.ui.showErrorInResult(t(`${this.difyApiKeyName}.generationSetupError`, { default: '启动生成时出错:'}) + ` ${initError.message}`); // Show error in result area
            this.difyClient = null;
            this.state.isGenerating = false; // Ensure state is reset
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
            console.log(`[${this.constructor.name}] Workflow finished. Overwriting content with nodeOutputText.`);
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
}

export default BaseDifyApp; 