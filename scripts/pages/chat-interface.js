// scripts/pages/chat-interface.js <-- New Filename

// 导入通用模块
import { configureAmplify } from '/scripts/amplify-config.js';
import Header from '../../modules/common/header.js';
import { getCurrentUserSettings } from '/scripts/services/storage.js';
import I18n, { t } from '../i18n.js'; // 保持默认导入
import { marked } from 'marked'; // Ensure marked is imported if not already global
// import UserManualNewApp from '../../modules/apps/user-manual-new/index.js';

// ---> MOVE IMPORTS FOR BASE CLASS AND UI HERE <--
// import BaseDifyApp from '../../modules/common/base-dify-app.js'; // REMOVE - Use BaseDifyChatApp
// import DifyAppUI from '../../modules/common/dify-app-ui.js'; // REMOVE - BaseDifyChatApp uses ChatUIManager

// --- NEW: Import BaseDifyChatApp ---
import BaseDifyChatApp from '../../modules/common/BaseDifyChatApp.js'; // Revert to relative path

// ---> MOVE CLASS DEFINITION TO TOP LEVEL <--
// --- Define the Specific Chat App Class ---
class UserManualChatApp extends BaseDifyChatApp {
    constructor() {
        super(); // Call BaseDifyChatApp constructor

        // *** IMPORTANT: Set the correct key name for this Dify app ***
        // This name MUST match the applicationID stored in DynamoDB global_config table
        // for the "AI 写 User Manual (新版)" Dify application.
        this.difyApiKeyName = 'userManual'; // CORRECTED based on screenshot

        // Ensure main input ID matches the HTML
        this.mainInputElementId = 'message-input';
        this.inputErrorElementId = 'message-input-error'; // Assuming an error element might be needed later near the input
        
        // console.log(`[UserManualChatApp] Instance created. Mode: ${this.difyMode}, KeyName: ${this.difyApiKeyName}`);
         // No need to instantiate UI here, BaseDifyChatApp constructor does it
    }
    
    // BaseDifyChatApp's init is likely sufficient, no need to override unless adding more init logic here
    // async init() {
    //     await super.init();
    //     console.log("[UserManualChatApp] Child init completed.");
    // }

    // Override: Gathers input from the chat input field.
    _gatherAndValidateInputs() {
        // console.log(`[UserManualChatApp] _gatherAndValidateInputs called.`); // <-- Log G1
        if (!this.ui || typeof this.ui.getInputText !== 'function') {
            console.error("[UserManualChatApp] ChatUIManager or getInputText not available.");
            return null;
        }
        const query = this.ui.getInputText().trim();
        // console.log(`[UserManualChatApp] Input value: "${query ? query.substring(0,30)+'...' : ''}"`); // <-- Log G2

        if (!query) { 
             // console.warn('[UserManualChatApp] No input provided.'); // <-- Log G4 (Error Case)
            // No need for toast on empty input in chat usually
            return null; 
        }
        
        // Optional: Add length validation if needed
        const charCountLimit = 4000; // Match the HTML placeholder/limit
        if (query.length > charCountLimit) { 
             // console.warn('[UserManualChatApp] Input too long.'); // <-- Log G5 (Error Case)
             this.ui?.showToast(t('chat.error.inputTooLong', { default: `输入超过 ${charCountLimit} 字符限制` }), 'warning');
             return null; 
        }

        // console.log(`[UserManualChatApp] Input validation passed.`); // <-- Log G3
        return { query: query };
    }

    // Override _getSpecificCallbacks if needed for this specific chat app
    // _getSpecificCallbacks() {
    //    return {
    //        // Add specific callbacks here
    //    };
    // }
}
// ---> END NEW CLASS DEFINITION <--

// --- REMOVE OLD Helper Functions (displayMessage, initializeInputArea etc.) --- 
// These functionalities are now handled by ChatUIManager and BaseDifyChatApp
/*
function displayMessage(text, sender, isThinking = false) {
    // ... (implementation removed)
}

function initializeInputArea(chatAppInstance) {
   // ... (implementation removed)
}

function initializeChatInterfaceInteractions() {
    // ... (implementation removed)
}
*/

// ---> MODIFY DOMContentLoaded Listener AGAIN for correct order <---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[DEBUG] DOMContentLoaded event fired.');
    let chatApp = null; // Use the specific app type

    try {
        // --- Standard Init Steps --- 
        console.log('[DEBUG] Configuring Amplify...');
        configureAmplify();
        console.log('[DEBUG] Amplify configured.');

        console.log('[DEBUG] Initializing I18n...');
        await I18n.init();
        console.log('[DEBUG] I18n initialized.');

        console.log('[DEBUG] Initializing Header...');
        await Header.init(); // Includes user check
        console.log('[DEBUG] Header initialized.');

        if (!Header.currentUser) {
            console.warn('[DEBUG] User not logged in after Header init. Stopping.');
            // Let BaseDifyChatApp's init handle showing the error message via _handleNotLoggedIn
        }
        console.log('[DEBUG] User checked. Current user:', Header.currentUser?.username);
        

        // --- Instantiate and Initialize the Specific Chat App --- 
        console.log('[DEBUG] Instantiating UserManualChatApp...');
        chatApp = new UserManualChatApp();
        console.log('[DEBUG] UserManualChatApp instantiated.');

        // ---> Initialize the Chat App instance <--- 
        // BaseDifyChatApp.init will now handle UI init, user check, config load, initial message, listeners
        console.log('[DEBUG] Initializing UserManualChatApp instance (this calls BaseDifyChatApp.init)...');
        await chatApp.init(); 
        console.log('[DEBUG] UserManualChatApp instance initialized.');

        // --- REMOVE OLD INITIALIZATION CALLS --- 
        // These are now handled internally by chatApp.init() and its base classes/UI manager


        console.log('[DEBUG] Page initialization sequence complete.');
        
    } catch (error) {
        console.error('[DEBUG] Error during DOMContentLoaded initialization:', error);
        // Display error in a more user-friendly way if possible
        const errorDiv = document.createElement('div');
        errorDiv.style = 'padding: 20px; text-align: center; color: red; background-color: #ffeeee; border: 1px solid red; border-radius: 5px; margin: 10px;';
        // Display the specific error message caught
        errorDiv.textContent = `页面初始化失败: ${error.message}`;
        const main = document.querySelector('main');
        if (main) {
            // Insert error at the very top of main content for visibility
            main.insertBefore(errorDiv, main.firstChild);
        } else {
            // Fallback if main isn't found
            document.body.insertAdjacentElement('afterbegin', errorDiv);
        }
         // Ensure UI is visible even on error
         document.documentElement.classList.remove('i18n-loading');
         document.body.style.display = 'block';
    } finally {
         console.log('[DEBUG] DOMContentLoaded finally block executing.');
         // Ensure UI is visible
         document.documentElement.classList.remove('i18n-loading');
         document.body.style.display = 'block'; // Make sure body is displayed
    }
}); 