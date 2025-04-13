/**
 * UX界面设计主入口
 */

// 首先导入并配置 Amplify
import { configureAmplify } from '/scripts/amplify-config.js';

// 确保 Amplify 在所有其他代码之前完成配置
configureAmplify();

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
        currentUser: null,
        appInfo: null,
        currentConversationId: null,
        currentMessageId: null,
        isGenerating: false
    },

    async init() {
        // 首先等待Header初始化
        await Header.init();
        
        // 检查用户登录状态
        if (!Header.currentUser) {
            UI.showError(t('uxDesign.notLoggedIn', { default: '请先登录以使用此功能。'}));
            return;
        }

        try {
            // 初始化UI
            if (typeof UI.initUI === 'function') {
                UI.initUI();
            }

            // 加载配置 - 使用与user-story相同的模式
            const userSettings = Header.userSettings || await getCurrentUserSettings();
            const globalConfig = await getGlobalConfig();
            
            if (!userSettings || !userSettings.apiKeys || 
                (!userSettings.apiKeys.uxDesign && !userSettings.apiKeys.dify)) {
                UI.showError(t('uxDesign.apiKeyMissing', { default: '无法获取您的 UX Design API 密钥，请检查账号设置。'}));
                return;
            }
            
            if (!globalConfig || !globalConfig.apiEndpoints || 
                (!globalConfig.apiEndpoints.uxDesign && !globalConfig.apiEndpoints.dify)) {
                UI.showError(t('uxDesign.apiEndpointMissing', { default: '无法获取 UX Design API 地址，请联系管理员检查全局配置。'}));
                return;
            }
            
            // 设置API配置，支持fallback到dify
            this.state.apiKey = userSettings.apiKeys.uxDesign || userSettings.apiKeys.dify;
            this.state.apiEndpoint = globalConfig.apiEndpoints.uxDesign || globalConfig.apiEndpoints.dify;
            this.state.currentUser = Header.currentUser;
            
            // 获取应用信息
            this.fetchAppInformation();
            
            // 绑定事件
            this.bindEvents();
        } catch (error) {
            console.error("Error initializing UX Design App:", error);
            UI.showError(t('uxDesign.initError', { default: '初始化应用时出错，请刷新页面重试。'}));
        }
    },

    async fetchAppInformation() {
        if (!this.state.apiKey || !this.state.apiEndpoint) return;
        try {
            const info = await API.getAppInfo(this.state.apiKey, this.state.apiEndpoint);
            if (info) this.state.appInfo = info;
        } catch (error) { /* Handled in API/UI */ }
    },

    bindEvents() {
        const generateButton = document.getElementById('generate-prompt');
        const promptInput = document.getElementById('requirement-description');

        if (promptInput) {
            promptInput.addEventListener('input', () => {
                UI.updateCharCountDisplay(promptInput.value.length);
                const currentAction = generateButton.getAttribute('data-action');
                const isGenerateAction = currentAction === 'generate';
                
                // 如果UI有这个方法就调用，否则直接设置禁用状态
                if (typeof UI.updateGenerateButtonState === 'function') {
                    UI.updateGenerateButtonState(promptInput.value.trim().length, isGenerateAction);
                } else {
                    generateButton.disabled = promptInput.value.trim().length === 0 || 
                                               promptInput.value.length > 5000;
                }
            });
        }

        if (generateButton) {
            generateButton.addEventListener('click', async (e) => {
                e.preventDefault();
                const currentAction = generateButton.getAttribute('data-action');

                if (currentAction === 'stop') {
                    await this.stopGeneration();
                } else {
                    await this.handleGenerate(promptInput.value.trim());
                }
            });
        }
        
        // 其他可能的事件绑定
        const clearFormButton = document.getElementById('clear-form');
        if (clearFormButton) {
            clearFormButton.addEventListener('click', this.handleClearForm.bind(this));
        }

        const copyResultButton = document.getElementById('copy-result');
        if (copyResultButton) {
            copyResultButton.addEventListener('click', this.handleCopyResult.bind(this));
        }

        const expandTextareaButton = document.getElementById('expand-textarea');
        if (expandTextareaButton) {
            expandTextareaButton.addEventListener('click', this.toggleTextareaExpand.bind(this));
        }
    },

    async handleGenerate(prompt) {
        if (!prompt) {
            UI.showInputError('requirement', t('uxDesign.promptRequired', { default: '请输入需求描述。'}));
            return;
        }
        UI.clearInputError('requirement');
        UI.showRequestingState();
        this.state.isGenerating = true;

        try {
            const result = await API.generateUXPrompt(
                prompt,
                this.state.apiKey,
                this.state.apiEndpoint,
                this.state.currentUser,
                this.state.currentConversationId
            );
            // API handles UI updates during stream
            // Update conversation ID from result
            if (result && result.conversationId) {
                this.state.currentConversationId = result.conversationId;
            } else {
                console.warn("[Index UX] Did not receive conversationId from API result.");
            }
        } catch (error) {
            // API logs error, UI shows error
            this.state.isGenerating = false;
             if(typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                 UI.showGenerationCompleted(); // Ensure button resets on error
            }
        } // isGenerating is set to false by API stream handler on completion/error/stop
    },

    async stopGeneration() {
        if (!this.state.isGenerating || !this.state.currentMessageId) {
            console.warn("Stop request ignored: Not generating or no message ID.");
            return;
        }
        try {
            UI.setStoppingState();
            await API.stopGeneration(
                this.state.currentMessageId,
                this.state.apiKey,
                this.state.apiEndpoint,
                this.state.currentUser
            );
            // UI state updated in API/UI modules
            UI.showGenerationCompleted(); 
        } catch (error) {
            UI.showGenerationCompleted(); // Reset button on stop error
        } finally {
            this.state.isGenerating = false;
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

export default UXDesignApp; 