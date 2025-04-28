/**
 * Base class for Dify-powered AI applications in the EVYD Product Manager AI Workbench.
 * Handles common logic for initialization, UI interaction, API client setup, 
 * and stream processing via DifyClient.
 */
import Header from '/modules/common/header.js';
import DifyAppUI from './dify-app-ui.js'; 
import DifyClient from './dify-client.js'; 
import { getCurrentUserSettings, getGlobalConfig } from '/scripts/services/storage.js';
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
            console.error(`Error initializing ${this.constructor.name}:`, error);
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
        console.error('User not authenticated for this application.');
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
        const userSettings = Header.userSettings || await getCurrentUserSettings();
        const globalConfig = await getGlobalConfig();

        if (!userSettings || !userSettings.apiKeys || !userSettings.apiKeys[this.difyApiKeyName]) {
            const errorMsg = t(`${this.difyApiKeyName}.apiKeyMissingError`, {
                default: `未能找到 ${this.difyApiKeyName} 的 API 密钥，请在管理员面板配置。`,
                key: this.difyApiKeyName
            });
            this.ui.showError(errorMsg);
            return false;
        }
            
        if (!globalConfig || !globalConfig.apiEndpoints || !globalConfig.apiEndpoints[this.difyApiKeyName]) {
            const errorMsg = t(`${this.difyApiKeyName}.apiEndpointMissing`, {
                default: `未能获取 ${this.difyApiKeyName} API 地址，请联系管理员检查全局配置。`,
                key: this.difyApiKeyName
            });
            this.ui.showError(errorMsg);
            return false;
        }

        this.state.apiKey = userSettings.apiKeys[this.difyApiKeyName];
        this.state.apiEndpoint = globalConfig.apiEndpoints[this.difyApiKeyName];
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
            console.error(`[${this.constructor.name}] Error fetching Dify app info:`, error);
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
            console.error("Cannot generate: App not fully initialized.");
            this.ui?.showError(t(`${this.difyApiKeyName}.initError`, { default: '应用未完全初始化，无法生成。' }));
            return;
        }

        const inputs = this._gatherAndValidateInputs();
        if (!inputs) {
            console.log(`[${this.constructor.name}] Input validation failed.`);
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
            console.error(`[${this.constructor.name}] Error setting up generation:`, initError);
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
           console.warn(`[${this.constructor.name}] Metadata or usage data is missing/incomplete. Skipping stats display.`, metadata);
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
            console.error(`[${this.constructor.name}] Dify API Error:`, error);
            this.ui.showError(t('common.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
        }
        this.ui.showGenerationCompleted(); // Ensure button/UI reset
        this.difyClient = null; // Clean up client instance
        this.state.isGenerating = false;
    }
}

export default BaseDifyApp; 