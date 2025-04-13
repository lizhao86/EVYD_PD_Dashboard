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
        currentMessageId: null,
        currentConversationId: null,
        apiKey: null,
        apiEndpoint: null
    },
    
    // 功能模块
    core: {},
    
    /**
     * 初始化应用
     */
    async init() {
        console.log('Initializing User Manual App (async)...');
        
        // 1. Init Header (Handles Amplify, Auth, I18n)
        await Header.init(); 
        console.log("Header initialized. Current user:", Header.currentUser);
        
        // 2. Check login
        if (!Header.currentUser) {
            console.log('User not logged in.');
            UI.showError(t('common.loginRequired', {default: '请先登录以使用此功能。'})); 
            return; 
        }

        // 3. Fetch config
        try {
            const userSettings = Header.userSettings || await getCurrentUserSettings(); 
            const globalConfig = await getGlobalConfig();

            if (!userSettings?.apiKeys?.userManual) {
                 UI.showError(t('userManual.apiKeyError', {default: '无法获取您的 User Manual API 密钥，请检查账号设置。'}), 'user-settings-modal');
                 return;
            }
             if (!globalConfig?.apiEndpoints?.userManual) {
                 UI.showError(t('userManual.apiEndpointError', {default: '无法获取 User Manual API 地址，请联系管理员检查全局配置。'}), 'admin-panel-modal');
                 return;
            }

            this.state.apiKey = userSettings.apiKeys.userManual;
            this.state.apiEndpoint = globalConfig.apiEndpoints.userManual;
            console.log("API Key and Endpoint loaded for User Manual.");
            
            // 4. Init UI and fetch Dify App Info
            UI.initUserInterface();
            // Pass config to fetchAppInfo
            await API.fetchAppInfo(this.state.apiKey, this.state.apiEndpoint); 

            // 5. Bind events
            this.bindEvents();

        } catch (error) {
             console.error("Error fetching settings for User Manual app:", error);
             UI.showError(t('common.configLoadError', {default: '加载应用配置时出错，请稍后重试。'}));
        }
    },
    
    /**
     * 绑定所有事件
     */
    bindEvents() {
        console.log('Binding User Manual events...');
        
        // Remove login/logout/password handlers (delegated to Header)

        // Keep App specific events
        const retryButton = document.getElementById('retry-connection');
        if (retryButton) retryButton.addEventListener('click', () => {
            // Re-fetch app info using stored state
            if (this.state.apiKey && this.state.apiEndpoint) {
                API.fetchAppInfo(this.state.apiKey, this.state.apiEndpoint);
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
        
        const generateManualButton = document.getElementById('generate-manual'); 
        if (generateManualButton) generateManualButton.addEventListener('click', this.handleGenerateManual.bind(this));
        
        const stopGenerationButton = document.getElementById('stop-generation');
        if (stopGenerationButton) stopGenerationButton.addEventListener('click', this.handleStopGeneration.bind(this));
        
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
     * Generate User Manual
     */
    async handleGenerateManual() {
        const generateButton = document.getElementById('generate-manual');
        const action = generateButton?.getAttribute('data-action');
        
        if (action === 'stop') {
            this.handleStopGeneration(); 
            return;
        }
        
        const requirementDesc = document.getElementById('requirement-description').value;
        UI.clearInputError('requirement');
        if (!requirementDesc) {
            UI.showInputError('requirement', t('userManual.error.emptyRequirement', {default: '请填写需求描述'}));
            return;
        }

        if (!this.state.apiKey || !this.state.apiEndpoint || !Header.currentUser) {
             if (typeof UI !== 'undefined' && UI.showError) UI.showError(t('common.configLoadError', {default: 'API 配置或用户信息丢失，无法生成。'}));
            else alert(t('common.configLoadError', {default: 'API 配置或用户信息丢失，无法生成。'}));
            return;
        }
        
        // Reset IDs before starting generation
        this.state.currentMessageId = null;
        // Keep existing conversation ID if available, otherwise null. API will update if a new one is created.
        // this.state.currentConversationId = this.state.currentConversationId || null;
        // UI.showGenerationStarted() is called in API now, or keep here? Let's ensure it's called before API call.
        UI.showRequestingState();

        try {
            // Call API.generateUserManual. The API will handle setting state.currentMessageId during the stream.
            // We await to know when the process is complete and potentially get the final conversation ID.
            const result = await API.generateUserManual(
                requirementDesc,
                this.state.apiKey,
                this.state.apiEndpoint,
                Header.currentUser,
                this.state.currentConversationId // Pass the current conversation ID
            );
            
            // API now sets state.currentConversationId directly during stream if new one created.
            // Optionally, update from result if needed as fallback or confirmation.
            // if (result && result.conversationId) {
            //     this.state.currentConversationId = result.conversationId;
            //     console.log("[Index] Updated Conversation ID from API result:", this.state.currentConversationId);
            // }
        } catch (error) {
             console.error("Error caught in handleGenerateManual:", error);
             // UI completion is handled within API/Stream response handler now, including errors.
             // UI.showGenerationCompleted();
        }
    },
    
    /**
     * Stop Generation
     */
    handleStopGeneration() {
        console.log("Handling stop generation request...");
        // This condition should now work correctly as state.currentMessageId is set earlier by the API stream handler
        if (this.state.currentMessageId && this.state.apiKey && this.state.apiEndpoint && Header.currentUser) {
            API.stopGeneration(this.state.currentMessageId, this.state.apiKey, this.state.apiEndpoint, Header.currentUser);
            this.state.currentMessageId = null; // Clear the ID after requesting stop
        } else {
            console.warn("Cannot stop, missing messageId or config/user. State was:", this.state);
            if (typeof UI !== 'undefined' && UI.showGenerationCompleted) UI.showGenerationCompleted();
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
document.addEventListener('DOMContentLoaded', function() {
    UserManualApp.init();
}); 

// --- ADD EXPORT ---
export default UserManualApp; 