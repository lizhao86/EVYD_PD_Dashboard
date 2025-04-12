/**
 * UX界面设计主入口
 */

// Import necessary modules
import Header from '/modules/common/header.js';
import UI from './ui.js';
import API from './api.js';
import { getCurrentUserSettings, getGlobalConfig } from '/scripts/services/storage.js';
import { t } from '/scripts/i18n.js';

const UXDesignApp = {
    state: {
        apiKey: null,
        apiEndpoint: null,
        currentConversationId: null, // For potential future chat-like interaction
        currentMessageId: null
    },

    async init() {
        console.log('Initializing UX Design App (async)...');
        await Header.init();
        console.log("Header initialized. Current user:", Header.currentUser);

        if (!Header.currentUser) {
            console.log('User not logged in.');
            UI.showError(t('common.loginRequired', {default: '请先登录以使用此功能。'})); 
            return; 
        }

        try {
            const userSettings = Header.userSettings || await getCurrentUserSettings(); 
            const globalConfig = await getGlobalConfig();

            // Use optional chaining and nullish coalescing for safety
            this.state.apiKey = userSettings?.apiKeys?.uxDesign ?? null;
            this.state.apiEndpoint = globalConfig?.apiEndpoints?.uxDesign ?? null;

            if (!this.state.apiKey) {
                 UI.showError(t('uxDesign.apiKeyError', {default: '无法获取您的 UX Design API 密钥，请检查账号设置。'}), 'user-settings-modal');
                 return;
            }
             if (!this.state.apiEndpoint) {
                 UI.showError(t('uxDesign.apiEndpointError', {default: '无法获取 UX Design API 地址，请联系管理员检查全局配置。'}), 'admin-panel-modal');
                 return;
            }
            
            console.log("API Key and Endpoint loaded for UX Design.");

            UI.initUI(); // Initialize UI elements specific to this page
            await API.getAppInfo(this.state.apiKey, this.state.apiEndpoint); // Fetch Dify app info
            this.bindEvents();

        } catch (error) {
             console.error("Error fetching settings for UX Design app:", error);
             UI.showError(t('common.configLoadError', {default: '加载应用配置时出错，请稍后重试。'}));
        }
    },

    bindEvents() {
        console.log('Binding UX Design events...');
        
        // App specific events
        const retryButton = document.getElementById('retry-connection');
        if (retryButton) retryButton.addEventListener('click', () => {
            if (this.state.apiKey && this.state.apiEndpoint) {
                API.getAppInfo(this.state.apiKey, this.state.apiEndpoint);
            } else {
                console.error("Cannot retry connection, API config missing in state.");
            }
        });

        const requirementDesc = document.getElementById('requirement-description');
        if (requirementDesc) requirementDesc.addEventListener('input', this.updateCharCount.bind(this));

        const expandTextarea = document.getElementById('expand-textarea');
        if (expandTextarea) expandTextarea.addEventListener('click', this.toggleTextareaExpand.bind(this));

        const clearForm = document.getElementById('clear-form');
        if (clearForm) clearForm.addEventListener('click', this.handleClearForm.bind(this));
        
        const generateButton = document.getElementById('generate-prompt');
        if (generateButton) {
            console.log('[bindEvents UX] Found button #generate-prompt, attaching listener.');
            generateButton.addEventListener('click', this.handleGenerate.bind(this));
        } else {
            console.error('[bindEvents UX] Could not find button #generate-prompt!');
        }
        
        // Assuming stop button exists with this ID
        const stopGeneration = document.getElementById('stop-generation'); 
        if (stopGeneration) stopGeneration.addEventListener('click', this.handleStopGeneration.bind(this));
        
        const copyResult = document.getElementById('copy-result');
        if (copyResult) copyResult.addEventListener('click', this.handleCopyResult.bind(this));

        const toggleSystemInfoButton = document.getElementById('toggle-system-info');
        if (toggleSystemInfoButton) {
           toggleSystemInfoButton.addEventListener('click', () => {
                const systemInfoContent = document.getElementById('system-info-content');
                const isHidden = systemInfoContent.style.display === 'none';
                systemInfoContent.style.display = isHidden ? 'block' : 'none';
                toggleSystemInfoButton.classList.toggle('collapsed', !isHidden);
           });
        }
    },

    /**
     * Generate UX Prompt
     */
    async handleGenerate() {
        // --- ADD ENTRY LOG ---
        console.log("[Index UX] handleGenerate function called!");
        // --- END LOG ---
        const generateButton = document.getElementById('generate-prompt'); // <-- Check ID
        const action = generateButton?.getAttribute('data-action');

        if (action === 'stop') {
            // console.log('Stop button (via generate button) clicked, Message ID:', this.state.currentMessageId);
            this.handleStopGeneration();
            return;
        }

        const requirementDesc = document.getElementById('requirement-description').value;
        UI.clearInputError('requirement');
        if (!requirementDesc) {
             UI.showInputError('requirement', t('uxDesign.error.emptyRequirement', {default: '请填写需求描述'}));
                return;
            }
            
        if (!this.state.apiKey || !this.state.apiEndpoint || !Header.currentUser) {
             if (typeof UI !== 'undefined' && UI.showError) UI.showError(t('common.configLoadError', {default: 'API 配置或用户信息丢失，无法生成。'}));
             else alert(t('common.configLoadError', {default: 'API 配置或用户信息丢失，无法生成。'}));
                return;
            }
        
        // Reset IDs before starting
        this.state.currentMessageId = null;
        // Keep existing conversation ID if available
        // this.state.currentConversationId = this.state.currentConversationId || null;
        UI.showRequestingState();

        try {
            // Call API.generateUXPrompt. API will set messageId state during stream.
            // Await to know when complete and get final conversation ID.
            const result = await API.generateUXPrompt(requirementDesc, this.state.apiKey, this.state.apiEndpoint, Header.currentUser, this.state.currentConversationId);
            
            /* --- REMOVED OLD ID HANDLING ---
            // Store IDs AFTER await
            if (result) {
                this.state.currentConversationId = result.conversationId;
                this.state.currentMessageId = result.taskId; 
                console.log(\"[Index UX] Stored Task/Message ID for stopping:\", this.state.currentMessageId);\n            } else {
                 console.warn(\"[Index UX] API call did not return valid IDs.\");\n            }
            */
            // UI reset handled by API stream handler
        } catch (error) {
            console.error("Error caught in handleGenerate (UX Design):", error);
            // UI completion should be handled in API/stream handler
            // UI.showGenerationCompleted(); // Reset button on error - now redundant
        }
    },

    /**
     * Stop Generation (UX Design)
     */
    handleStopGeneration() {
        console.log("Handling stop generation request (UX Design)...");
        // Stop logic should now work correctly
        if (this.state.currentMessageId && this.state.apiKey && this.state.apiEndpoint && Header.currentUser) {
            API.stopGeneration(this.state.currentMessageId, this.state.apiKey, this.state.apiEndpoint, Header.currentUser);
            this.state.currentMessageId = null; // Clear ID after requesting stop
        } else {
            console.warn("Cannot stop, missing messageId or config/user. State was:", this.state);
            if (typeof UI !== 'undefined' && UI.showGenerationCompleted) UI.showGenerationCompleted(); 
        }
    },

    handleCopyResult() {
        // Similar copy logic as user-manual
        const markdownDiv = document.getElementById('result-content-markdown');
        let textToCopy = '';
        if (markdownDiv && markdownDiv.style.display !== 'none') {
            textToCopy = markdownDiv.innerText;
                } else {
            const resultContentEl = document.getElementById('result-content');
            if(resultContentEl) textToCopy = resultContentEl.textContent;
        }
        
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                 const copyButton = document.getElementById('copy-result');
                 const originalTitle = copyButton.title;
                 copyButton.title = t('common.copied', { default: '已复制!' });
                 copyButton.classList.add('copied-success');
                 setTimeout(() => {
                     copyButton.title = originalTitle;
                     copyButton.classList.remove('copied-success');
                 }, 2000);
             }).catch(err => {
                  console.error('Failed to copy text: ', err);
                  alert(t('common.copyFailed', { default: '复制失败'}));
              });
          } else {
              console.warn("No result content found to copy.");
          }
    },

    updateCharCount(event) {
        const textarea = event.target;
        const charCount = textarea.value.length;
        if (typeof UI !== 'undefined' && UI.updateCharCountDisplay) {
             UI.updateCharCountDisplay(charCount);
         } 
     },
    toggleTextareaExpand() {
         const textareaContainer = document.querySelector('.textarea-container');
         const textarea = document.getElementById('requirement-description');
         const charCounter = document.querySelector('.char-counter');
         if (textareaContainer?.classList.contains('textarea-expanded')) {
             this.shrinkTextarea(textareaContainer, textarea, charCounter);
         } else if(textareaContainer && textarea && charCounter) {
             this.expandTextarea(textareaContainer, textarea, charCounter);
         }
     },
     expandTextarea(container, textarea, charCounter) {
        // Reuse logic from user-manual
        const overlay = document.createElement('div');
        overlay.className = 'textarea-overlay';
        overlay.addEventListener('click', () => this.shrinkTextarea(container, textarea, charCounter));
        document.body.appendChild(overlay);
        this.originalParentElement = container.closest('.form-group');
        this.originalNextSibling = container.nextSibling;
        textarea.dataset.originalRows = textarea.rows;
        container.classList.add('textarea-expanded');
        document.body.appendChild(container);
        textarea.rows = 20;
        textarea.focus();
        const expandButton = document.getElementById('expand-textarea');
        if(expandButton) expandButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`;
        container.appendChild(charCounter);
     },
     shrinkTextarea(container, textarea, charCounter) {
         // Reuse logic from user-manual
        const overlay = document.querySelector('.textarea-overlay');
        if (overlay) overlay.remove();
        container.classList.remove('textarea-expanded');
        textarea.rows = textarea.dataset.originalRows || 6;
        if (this.originalParentElement) {
            if (container.parentNode) container.parentNode.removeChild(container);
            if (this.originalNextSibling) this.originalParentElement.insertBefore(container, this.originalNextSibling);
            else this.originalParentElement.appendChild(container);
            if (charCounter.parentNode) charCounter.parentNode.removeChild(charCounter);
            this.originalParentElement.appendChild(charCounter);
        }
         const expandButton = document.getElementById('expand-textarea');
         if(expandButton) expandButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7"/></svg>`;
     },
     handleClearForm() {
         const reqDesc = document.getElementById('requirement-description');
         if(reqDesc) reqDesc.value = '';
         if (typeof UI !== 'undefined' && UI.updateCharCountDisplay) {
            UI.updateCharCountDisplay(0);
         }
     },
};

document.addEventListener('DOMContentLoaded', () => {
    UXDesignApp.init();
});

// export default UXDesignApp; 

// --- ADD EXPORT ---
export default UXDesignApp; 