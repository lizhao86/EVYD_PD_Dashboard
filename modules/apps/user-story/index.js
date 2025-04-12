/**
 * EVYD产品经理AI工作台 - User Story生成器
 * 模块入口文件
 */

import Header from '/modules/common/header.js';
import UI from './ui.js';
import API from './api.js';
import { getCurrentUserSettings, getGlobalConfig } from '/scripts/services/storage.js';
import { t } from '/scripts/i18n.js';

// 命名空间
const UserStoryApp = {
    // 全局状态
    state: {
        currentTaskId: null,
        apiKey: null,
        apiEndpoint: null
    },
    
    // 功能模块
    core: {},
    
    /**
     * 初始化应用 (async)
     */
    async init() {
        await Header.init(); 
        if (!Header.currentUser) {
            UI.showError('请先登录以使用此功能。'); // Assuming UI has showError
            return; 
        }

        try {
            const userSettings = Header.userSettings || await getCurrentUserSettings(); // Use Header's or fetch again
            const globalConfig = await getGlobalConfig();

            if (!userSettings || !userSettings.apiKeys || !userSettings.apiKeys.userStory) {
                 UI.showError('无法获取您的 User Story API 密钥，请检查账号设置。 ', 'user-settings-modal');
                 return;
            }
             if (!globalConfig || !globalConfig.apiEndpoints || !globalConfig.apiEndpoints.userStory) {
                 UI.showError('无法获取 User Story API 地址，请联系管理员检查全局配置。', 'admin-panel-modal');
                 return;
            }

            this.state.apiKey = userSettings.apiKeys.userStory;
            this.state.apiEndpoint = globalConfig.apiEndpoints.userStory;
            
            UI.initUserInterface();
             await API.fetchAppInfo(this.state.apiKey, this.state.apiEndpoint); 

            this.bindEvents();

        } catch (error) {
             console.error("Error fetching settings for User Story app:", error);
             UI.showError('加载应用配置时出错，请稍后重试。');
        }
    },
    
    /**
     * 绑定事件
     */
    bindEvents() {
        const retryButton = document.getElementById('retry-connection');
        if (retryButton) retryButton.addEventListener('click', () => API.fetchAppInfo());

        const requirementDesc = document.getElementById('requirement-description');
        if (requirementDesc) requirementDesc.addEventListener('input', this.updateCharCount.bind(this));

        const expandTextarea = document.getElementById('expand-textarea');
        if (expandTextarea) expandTextarea.addEventListener('click', this.toggleTextareaExpand.bind(this));

        const clearForm = document.getElementById('clear-form');
        if (clearForm) clearForm.addEventListener('click', this.handleClearForm.bind(this));
        
        const generateStory = document.getElementById('generate-story');
        if (generateStory) generateStory.addEventListener('click', this.handleGenerateStory.bind(this));
        
        const stopGeneration = document.getElementById('stop-generation');
        if (stopGeneration) stopGeneration.addEventListener('click', this.handleStopGeneration.bind(this));
        
        const copyResult = document.getElementById('copy-result');
        if (copyResult) copyResult.addEventListener('click', this.handleCopyResult.bind(this));

        const toggleSystemInfoButton = document.getElementById('toggle-system-info');
        if (toggleSystemInfoButton) {
            toggleSystemInfoButton.addEventListener('click', function() {
                const systemInfoContent = document.getElementById('system-info-content');
                if (systemInfoContent.style.display === 'none') {
                    systemInfoContent.style.display = 'block';
                    this.classList.remove('collapsed');
                } else {
                    systemInfoContent.style.display = 'none';
                    this.classList.add('collapsed');
                }
            });
        }
    },
    
    /**
     * 生成User Story
     */
    handleGenerateStory() {
        const generateButton = document.getElementById('generate-story');
        const action = generateButton.getAttribute('data-action');
        
        if (action === 'stop') {
            if (this.state.currentTaskId && this.state.apiKey && this.state.apiEndpoint && Header.currentUser) {
                API.stopGeneration(this.state.currentTaskId, this.state.apiKey, this.state.apiEndpoint, Header.currentUser);
                this.state.currentTaskId = null;
            } else {
                console.warn("Cannot stop, missing taskId or config/user. State was:", this.state);
                if (typeof UI !== 'undefined' && UI.showGenerationCompleted) UI.showGenerationCompleted();
            }
            return;
        }
        
        const platformName = document.getElementById('platform-name').value;
        const systemName = document.getElementById('system-name').value;
        const moduleName = document.getElementById('module-name').value;
        const requirementDesc = document.getElementById('requirement-description').value;

        UI.clearInputError('platform');
        UI.clearInputError('system');
        UI.clearInputError('module');
        UI.clearInputError('requirement');
        let isValid = true;

        if (!platformName) {
            UI.showInputError('platform', t('userStory.error.platformRequired', { default: '请填写平台名称' }));
            isValid = false;
        }
        if (!systemName) {
            UI.showInputError('system', t('userStory.error.systemRequired', { default: '请填写系统名称' }));
            isValid = false;
        }
        if (!moduleName) {
            UI.showInputError('module', t('userStory.error.moduleRequired', { default: '请填写模块名称' }));
            isValid = false;
        }
        if (!requirementDesc) {
            UI.showInputError('requirement', t('userStory.error.requirementRequired', { default: '请填写需求描述' }));
            isValid = false;
        }

        if (!isValid) {
            return;
        }
        
        if (!this.state.apiKey || !this.state.apiEndpoint) {
             if (typeof UI !== 'undefined' && UI.showError) {
                UI.showError(t('userStory.apiConfigMissingError', { default: 'API 配置丢失，无法生成。请检查账号设置或联系管理员。' }));
             }
            return;
        }
        const currentUser = Header.currentUser; 
        if (!currentUser) {
            if (typeof UI !== 'undefined' && UI.showError) {
                 UI.showError(t('userStory.notLoggedInError', { default: '用户未登录，无法生成。' }));
             }
            return;
        }

        this.state.currentTaskId = null; 
        UI.showRequestingState(); 

        API.generateUserStory(platformName, systemName, moduleName, requirementDesc, this.state.apiKey, this.state.apiEndpoint, currentUser);
    },
    
    /**
     * 停止生成 (Handler for the separate stop button)
     */
    handleStopGeneration() {
        if (this.state.currentTaskId && this.state.apiKey && this.state.apiEndpoint && Header.currentUser) {
            API.stopGeneration(this.state.currentTaskId, this.state.apiKey, this.state.apiEndpoint, Header.currentUser);
            this.state.currentTaskId = null;
        } else {
             console.warn("Cannot stop via separate button, missing taskId or config/user. State was:", this.state);
        }
    },
    
    /**
     * 复制结果
     */
    handleCopyResult() {
        const resultContent = document.getElementById('result-content').innerText;
        navigator.clipboard.writeText(resultContent).then(() => {
            const copyButton = document.getElementById('copy-result');
            const originalTitle = copyButton.getAttribute('title');
            copyButton.setAttribute('title', '已复制!');
            setTimeout(() => {
                copyButton.setAttribute('title', originalTitle);
            }, 2000);
        });
    },
    
    /**
     * 更新字数统计
     */
    updateCharCount(event) {
        const textarea = event.target;
        const charCount = textarea.value.length;
        if (typeof UI !== 'undefined' && UI.updateCharCountDisplay) {
            UI.updateCharCountDisplay(charCount);
        } else {
            const charCountElement = document.getElementById('char-count');
            if(charCountElement) charCountElement.textContent = charCount;
        }
    },
    
    /**
     * 切换文本框放大状态
     */
    toggleTextareaExpand() {
        const textareaContainer = document.querySelector('.textarea-container');
        const textarea = document.getElementById('requirement-description');
        const charCounter = document.querySelector('.char-counter');
        
        if (textareaContainer.classList.contains('textarea-expanded')) {
            this.shrinkTextarea(textareaContainer, textarea, charCounter);
        } else {
            this.expandTextarea(textareaContainer, textarea, charCounter);
        }
    },
    
    /**
     * 放大文本框
     */
    expandTextarea(container, textarea, charCounter) {
        const overlay = document.createElement('div');
        overlay.className = 'textarea-overlay';
        overlay.addEventListener('click', () => this.shrinkTextarea(container, textarea, charCounter));
        document.body.appendChild(overlay);
        
        const formGroup = container.closest('.form-group');
        container.dataset.originalParent = formGroup.id || '';
        
        this.originalParentElement = formGroup;
        this.originalNextSibling = container.nextSibling;
        
        textarea.dataset.originalRows = textarea.rows;
        
        container.classList.add('textarea-expanded');
        document.body.appendChild(container);
        
        textarea.rows = 20;
        textarea.focus();
        
        const expandButton = document.getElementById('expand-textarea');
        expandButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
        `;
        
        container.appendChild(charCounter);
    },
    
    /**
     * 缩小文本框
     */
    shrinkTextarea(container, textarea, charCounter) {
        const overlay = document.querySelector('.textarea-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        container.classList.remove('textarea-expanded');
        textarea.rows = textarea.dataset.originalRows || 6;
        
        if (this.originalParentElement) {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
            
            if (this.originalNextSibling) {
                this.originalParentElement.insertBefore(container, this.originalNextSibling);
            } else {
                this.originalParentElement.appendChild(container);
            }
            
            if (charCounter.parentNode) {
                charCounter.parentNode.removeChild(charCounter);
            }
            this.originalParentElement.appendChild(charCounter);
        }
        
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
        document.getElementById('platform-name').value = '';
        document.getElementById('system-name').value = '';
        document.getElementById('module-name').value = '';
        document.getElementById('requirement-description').value = '';
        
        const charCountElement = document.getElementById('char-count');
        if (charCountElement) {
            charCountElement.textContent = '0';
        }
        const charCountContainer = document.querySelector('.char-counter');
        if (charCountContainer) {
            charCountContainer.classList.remove('warning');
        }
        const generateButton = document.getElementById('generate-story');
        if (generateButton) {
            generateButton.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    UserStoryApp.init();
});

export default UserStoryApp; 