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
import { t } from '/scripts/i18n.js';
import { marked } from 'marked'; // Keep for DifyAppUI
import BaseDifyApp from '../../common/base-dify-app.js';

// Specific key for User Story API in settings
// const DIFY_APP_API_KEY_NAME = 'app-UlsWzEnFGmZVJhHZVOxImBws'; // No longer needed directly here

// Removed APP_ID_MAPPING as base class handles finding keys correctly

class UserStoryApp extends BaseDifyApp {
    constructor() {
        super();
        // Set the logical name used to find config and keys
        this.difyApiKeyName = 'userStory'; 
        // Removed this.actualApiKeyId
        // this.difyMode = 'workflow'; // Let base class set this from config
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
    
    // Removed overridden init() as the base class init should suffice now
    // async init() { ... }
    
    // Removed overridden _fetchAppInformation() as base class handles it
    // async _fetchAppInformation() { ... }
    
    // Removed overridden bindEvents() if base class + _bindSpecificEvents is enough
    // bindEvents() { ... }
    
    // Removed overridden handleGenerate() if base class is enough
    // async handleGenerate() { ... }
    
    // Removed overridden stopGeneration() if base class is enough
    // async stopGeneration() { ... }
    
    // Removed overridden handleCopyResult() if base class is enough
    // handleCopyResult() { ... }
    
    // Removed overridden handleClearForm() if base class is enough
    // handleClearForm() { ... }
    
    // Removed overridden toggleTextareaExpand() if base class is enough
    // toggleTextareaExpand() { ... }

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

    // REMOVED the overridden _loadApiConfig method
    // async _loadApiConfig() { ... }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    const app = new UserStoryApp();
    app.init();
}); 

// --- ADD EXPORT --- 
export default UserStoryApp; 