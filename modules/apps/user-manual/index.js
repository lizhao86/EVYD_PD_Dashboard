/**
 * EVYD产品经理AI工作台 - User Manual生成器
 * 模块入口文件
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
import { t } from '/scripts/i18n.js'; // Assuming t is needed, maybe in UI

// 命名空间
const UserManualApp = {
    // 全局状态
    state: {
        apiKey: null,
        apiEndpoint: null,
        currentUser: null,
        appInfo: null,
        currentConversationId: null, // Store conversation ID for continuous chat
        currentMessageId: null, // Store message ID for stopping
        isGenerating: false
    },
    
    // 功能模块
    core: {},
    
    /**
     * 初始化应用
     */
    async init() {
        // 首先等待Header初始化
        await Header.init();
        
        // 检查用户登录状态
        if (!Header.currentUser) {
            UI.showError(t('userManual.notLoggedIn', { default: '请先登录以使用此功能。'}));
            return;
        }

        try {
            // 初始化UI
            if (typeof UI.initUserInterface === 'function') {
                UI.initUserInterface();
            }

            // 加载配置 - 使用与user-story相同的模式
            const userSettings = Header.userSettings || await getCurrentUserSettings();
            const globalConfig = await getGlobalConfig();
            
            if (!userSettings || !userSettings.apiKeys || 
                (!userSettings.apiKeys.userManual && !userSettings.apiKeys.dify)) {
                UI.showError(t('userManual.apiKeyMissing', { default: '无法获取您的 User Manual API 密钥，请检查账号设置。'}));
                return;
            }
            
            if (!globalConfig || !globalConfig.apiEndpoints || 
                (!globalConfig.apiEndpoints.userManual && !globalConfig.apiEndpoints.dify)) {
                UI.showError(t('userManual.apiEndpointMissing', { default: '无法获取 User Manual API 地址，请联系管理员检查全局配置。'}));
                return;
            }
            
            // 设置API配置，支持fallback到dify
            this.state.apiKey = userSettings.apiKeys.userManual || userSettings.apiKeys.dify;
            this.state.apiEndpoint = globalConfig.apiEndpoints.userManual || globalConfig.apiEndpoints.dify;
            this.state.currentUser = Header.currentUser;
            
            // 获取应用信息
            this.fetchAppInformation();
            
            // 绑定事件
            this.bindEvents();
        } catch (error) {
            console.error("Error initializing User Manual App:", error);
            UI.showError(t('userManual.initError', { default: '初始化应用时出错，请刷新页面重试。'}));
        }
    },
    
    async fetchAppInformation() {
        if (!this.state.apiKey || !this.state.apiEndpoint) return; // Guard clause
        try {
            const info = await API.fetchAppInfo(this.state.apiKey, this.state.apiEndpoint);
            if (info) {
                this.state.appInfo = info;
                // UI.displayAppInfo(info); // API module already calls this
            }
        } catch (error) { /* Error handled in API/UI */ }
    },
    
    /**
     * 绑定所有事件
     */
    bindEvents() {
        // console.log('Binding User Manual events...');
        const generateButton = document.getElementById('generate-manual');
        const stopButton = document.getElementById('stop-generation');
        const promptInput = document.getElementById('requirement-description');

        if (promptInput) {
            promptInput.addEventListener('input', () => {
                // 更新字数统计和按钮状态
                UI.updateCharCountDisplay(promptInput.value.length);
                // 获取当前按钮状态（生成或停止）
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
    
    // --- ADD Central handleGenerate Function ---
    async handleGenerate(prompt) {
        if (!prompt) {
            UI.showInputError('requirement', t('userManual.promptRequired', { default: '请输入需求描述。'}));
            return;
        }
        UI.clearInputError('requirement');
        UI.showRequestingState();
        this.state.isGenerating = true;

        try {
            const result = await API.generateUserManual(
                prompt,
                this.state.apiKey,
                this.state.apiEndpoint,
                this.state.currentUser,
                this.state.currentConversationId // Pass conversation ID
            );
            // Stream handling updates UI, no need for completion call here immediately
             // API.handleStreamResponse takes care of updating UI and state (incl. isGenerating=false)
            // Update conversation ID if a new one was created or returned
            if (result && result.conversationId) {
                this.state.currentConversationId = result.conversationId;
        //     console.log("[Index] Updated Conversation ID from API result:", this.state.currentConversationId);
            }
        } catch (error) {
            // Error already logged in API, UI updated there
            this.state.isGenerating = false;
             if(typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                UI.showGenerationCompleted(); // Ensure button resets on error
             }
        }
    },
    
    // --- ADD Central stopGeneration Function ---
    async stopGeneration() {
         // console.log("Handling stop generation request...");
         if (!this.state.isGenerating || !this.state.currentMessageId) {
             console.warn("Stop request ignored: Not generating or no message ID.");
             return;
         }
         try {
            UI.setStoppingState(); // Indicate stop attempt
            await API.stopGeneration(
                 this.state.currentMessageId,
                 this.state.apiKey,
                 this.state.apiEndpoint,
                 this.state.currentUser
             );
             // API/UI modules handle showing the stop message
             // Ensure button is reset to generate state
             UI.showGenerationCompleted(); 
         } catch (error) {
            // Error logged in API, potentially show error in UI?
            UI.showGenerationCompleted(); // Reset button even on stop error
        } finally {
             this.state.isGenerating = false; 
        }
    },
    
    /**
     * 复制结果
     */
    handleCopyResult() {
        const markdownDiv = document.getElementById('result-content-markdown');
        let textToCopy = '';
        if (markdownDiv && markdownDiv.style.display !== 'none') {
            // Basic conversion from simple markdown HTML back to text if needed
            // Or just copy the innerText which might be good enough
            textToCopy = markdownDiv.innerText; // Prioritize innerText
        } else {
            const resultContentEl = document.getElementById('result-content');
            if(resultContentEl) textToCopy = resultContentEl.textContent;
        }
        
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
            const copyButton = document.getElementById('copy-result');
                const originalTitle = copyButton.title;
                copyButton.title = t('common.copied', { default: '已复制!' });
                copyButton.classList.add('copied-success'); // Add class for feedback
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
    
    /**
     * 更新字数统计
     */
    updateCharCount(event) {
        const textarea = event.target;
        const charCount = textarea.value.length;
        if (typeof UI !== 'undefined' && UI.updateCharCountDisplay) {
            UI.updateCharCountDisplay(charCount);
        }
    },
    
    /**
     * 切换文本框放大状态
     */
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
    
    /**
     * 放大文本框
     */
    expandTextarea(container, textarea, charCounter) {
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'textarea-overlay';
        overlay.addEventListener('click', () => this.shrinkTextarea(container, textarea, charCounter));
        document.body.appendChild(overlay);
        
        // 保存原始位置
        const formGroup = container.closest('.form-group');
        container.dataset.originalParent = formGroup.id || '';
        
        // 记住原始父元素的引用
        this.originalParentElement = formGroup;
        this.originalNextSibling = container.nextSibling;
        
        // 保存其他原始状态
        textarea.dataset.originalRows = textarea.rows;
        
        // 添加放大样式
        container.classList.add('textarea-expanded');
        document.body.appendChild(container);
        
        // 调整文本区大小
        textarea.rows = 20;
        textarea.focus();
        
        // 更新放大按钮图标
        const expandButton = document.getElementById('expand-textarea');
        expandButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
        `;
        
        // 移动字数统计到放大框内
        container.appendChild(charCounter);
    },
    
    /**
     * 缩小文本框
     */
    shrinkTextarea(container, textarea, charCounter) {
        // 移除遮罩层
        const overlay = document.querySelector('.textarea-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // 恢复原始样式
        container.classList.remove('textarea-expanded');
        textarea.rows = textarea.dataset.originalRows || 6;
        
        // 将文本框放回原位置
        if (this.originalParentElement) {
            // 先从当前位置移除
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
            
            // 放回正确位置
            if (this.originalNextSibling) {
                this.originalParentElement.insertBefore(container, this.originalNextSibling);
            } else {
                this.originalParentElement.appendChild(container);
            }
            
            // 确保字数统计在正确位置
            if (charCounter.parentNode) {
                charCounter.parentNode.removeChild(charCounter);
            }
            this.originalParentElement.appendChild(charCounter);
        }
        
        // 更新放大按钮图标
        const expandButton = document.getElementById('expand-textarea');
        expandButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7"/>
            </svg>
        `;
    },
    
    /**
     * 清空表单
     */
    handleClearForm() {
        const reqDesc = document.getElementById('requirement-description');
        if(reqDesc) reqDesc.value = '';
        if (typeof UI !== 'undefined' && UI.updateCharCountDisplay) {
            UI.updateCharCountDisplay(0);
        }
    }
};

// 在DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    UserManualApp.init();
}); 

// --- ADD EXPORT ---
export default UserManualApp; 