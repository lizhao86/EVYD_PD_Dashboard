/**
 * EVYD产品经理AI工作台 - User Story生成器
 * UI交互模块
 */

import { t } from '/scripts/i18n.js'; // Import translation helper
// Remove Header import if not directly used for auth state here
// import Header from '/modules/common/header.js'; 

// UI交互模块 
const UI = {
    /**
     * 初始化用户界面
     */
    initUserInterface() {
        console.log("Initializing User Story UI elements...");
        const resultContainer = document.getElementById('result-container');
        if(resultContainer) resultContainer.style.display = 'none';
        
        const requirementDesc = document.getElementById('requirement-description');
        if (requirementDesc) {
            this.updateCharCountDisplay(requirementDesc.value.length); 
        }
    },
    
    /**
     * 显示加载状态
     */
    showLoading() {
        const loadingEl = document.getElementById('app-info-loading');
        if (loadingEl) loadingEl.style.display = 'flex'; 

        const errorEl = document.getElementById('app-info-error');
        if (errorEl) errorEl.style.display = 'none';
        
        const infoEl = document.getElementById('app-info');
        if (infoEl) infoEl.style.display = 'none';
        
        const formEl = document.getElementById('app-form');
        if (formEl) formEl.style.display = 'none';
    },
    
    /**
     * 显示通用错误信息 (通常用于API/连接错误)
     */
    showError(message, modalToOpenId = null) {
        const loadingEl = document.getElementById('app-info-loading');
        const errorEl = document.getElementById('app-info-error');
        const errorMessageEl = document.getElementById('error-message');
        const appInfoEl = document.getElementById('app-info');
        const appFormEl = document.getElementById('app-form');

        // Hide loading and content sections
        if(loadingEl) loadingEl.style.display = 'none';
        if(appInfoEl) appInfoEl.style.display = 'none';
        if(appFormEl) appFormEl.style.display = 'none';

        // Show error section
        if(errorEl && errorMessageEl) {
            errorEl.style.display = 'flex';
            errorMessageEl.textContent = message;
            // TODO: Handle modalToOpenId if needed
        } else {
            console.error("Could not display error, elements not found.");
            alert(message); // Fallback alert
        }
    },
    
     /**
     * 显示结果区域中的错误消息
     */
    showErrorInResult(message) {
        const resultContent = document.getElementById('result-content');
        const resultMarkdown = document.getElementById('result-content-markdown');
        if (resultContent) {
             resultContent.innerHTML = `<span style="color: red;">${message}</span>`;
             resultContent.style.display = 'block';
        }
         if (resultMarkdown) {
             resultMarkdown.style.display = 'none'; // Hide markdown view on error
        }
     },
     
      /**
     * 显示停止生成消息
     */
    showStopMessage() {
         const resultContent = document.getElementById('result-content');
         if (resultContent) {
             // Append stop message without removing existing content immediately
             const stopMsg = document.createElement('i');
             stopMsg.textContent = t('common.generationStopped', { default: '(已停止生成)' });
             const br = document.createElement('br');
             resultContent.appendChild(br);
             resultContent.appendChild(br.cloneNode());
             resultContent.appendChild(stopMsg);
         }
     },

    /**
     * 显示应用信息
     */
    displayAppInfo(appInfo) {
        const loadingEl = document.getElementById('app-info-loading');
        const appInfoEl = document.getElementById('app-info');
        const appNameEl = document.getElementById('app-name');
        const appDescEl = document.getElementById('app-description');
        const tagsContainer = document.getElementById('app-tags');
        const appFormEl = document.getElementById('app-form');
        
        if(loadingEl) loadingEl.style.display = 'none';

        if(appInfoEl && appNameEl && appDescEl && tagsContainer && appFormEl) {
            appInfoEl.style.display = 'block';
            appNameEl.textContent = appInfo.name || t('userStory.defaultAppName', { default: 'User Story 生成器'});
            appDescEl.textContent = appInfo.description || t('userStory.defaultAppDesc', { default: '自动生成用户故事和验收标准' });
            tagsContainer.innerHTML = '';
            if (appInfo.tags && appInfo.tags.length > 0) {
                 appInfo.tags.forEach(tag => {
                    const tagEl = document.createElement('span');
                    let className = 'app-tag';
                    if (tag.toLowerCase() === 'ai') className += ' tag-ai';
                    else if (tag.toLowerCase() === 'new') className += ' tag-new';
                    else if (tag.toLowerCase() === 'workflow') className += ' tag-workflow'; 
                    tagEl.className = className;
                    tagEl.textContent = tag;
                    tagsContainer.appendChild(tagEl);
                 });
            }
            appFormEl.style.display = 'block';
        } else {
             console.error("User Story: One or more required app info DOM elements not found!");
        }
    },
    
    /**
     * 显示请求发送中的状态
     */
    showRequestingState() {
        const generateButton = document.getElementById('generate-story');
        const stopButton = document.getElementById('stop-generation');

        if (generateButton) {
            const requestingText = t('common.requesting', { default: '请求中...' });
            generateButton.innerHTML = '<div class="loading-circle-container"><div class="loading-circle"></div></div> ' + requestingText;
            generateButton.disabled = true; // Disable button
            generateButton.setAttribute('data-action', 'requesting');
        }
        if (stopButton) {
            stopButton.style.display = 'none'; // Hide separate stop button
        }
    },

    /**
     * 显示生成开始状态
     */
    showGenerationStarted() {
        const resultContainer = document.getElementById('result-container');
        const resultStats = document.getElementById('result-stats');
        const resultContent = document.getElementById('result-content');
        const resultMarkdown = document.getElementById('result-content-markdown');
        const systemInfoContainer = document.getElementById('system-info-container');
        const systemInfoContent = document.getElementById('system-info-content');
        const generateButton = document.getElementById('generate-story');
        const stopButton = document.getElementById('stop-generation');

        if (resultContainer) resultContainer.style.display = 'block';
        if (resultContent) {
             resultContent.innerHTML = t('common.generatingSimple', { default: '正在生成...'}) + '<span class="cursor"></span>';
             resultContent.style.display = 'block'; // Show text view first
        }
        if (resultMarkdown) {
            resultMarkdown.style.display = 'none'; // Hide markdown view
            resultMarkdown.innerHTML = '';
        }
        if (systemInfoContent) systemInfoContent.innerHTML = '';
        
        if (generateButton) {
            // --- MODIFY: Enable button --- 
            generateButton.disabled = false; 
            const generatingText = t('common.generating', { default: '生成中...点击停止' });
            generateButton.innerHTML = '<div class="loading-circle-container"><div class="loading-circle" style="border-color: #ff3333; border-top-color: transparent;"></div></div> ' + generatingText;
            generateButton.setAttribute('data-action', 'stop');
        }
        // --- MODIFY: Hide separate stop button ---
        if(stopButton) stopButton.style.display = 'none'; 
    },
    
    /**
     * 显示生成完成状态
     */
    showGenerationCompleted() {
        const generateButton = document.getElementById('generate-story');
        if (generateButton) {
            // --- MODIFY: Ensure button is enabled --- 
            generateButton.disabled = false;
            const buttonText = t('userStory.generateButton', { default: '生成 User Story' });
            generateButton.innerHTML = buttonText;
            generateButton.setAttribute('data-action', 'generate');
        }
       // --- MODIFY: Hide separate stop button ---
       const stopButton = document.getElementById('stop-generation');
       if(stopButton) stopButton.style.display = 'none';
    },
    
    /**
     * 显示任务统计数据
     */
    displayStats(taskData) {
        // --- ADD Simple Entry Log ---
        console.log('[UI] displayStats received data:', taskData);

        // console.log('Displaying stats for User Story:', taskData); // Keep original log
        const elapsedTime = taskData.elapsed_time || 0;
        const totalSteps = taskData.total_steps || 0;
        const totalTokens = taskData.total_tokens || 0;
        
        const elapsedTimeElement = document.getElementById('elapsed-time');
        const totalStepsElement = document.getElementById('total-steps');
        const totalTokensElement = document.getElementById('total-tokens');
        const statsContainer = document.getElementById('result-stats');

        if (!elapsedTimeElement || !totalStepsElement || !totalTokensElement || !statsContainer) {
            console.error('Stat DOM elements not found for User Story.');
            return;
        }
        
        const secondsSuffix = t('userStory.secondsSuffix', { default: '秒' });
        if (elapsedTimeElement && taskData.elapsed_time !== undefined) elapsedTimeElement.textContent = `${Number(taskData.elapsed_time).toFixed(2)}${secondsSuffix}`;
        if (totalStepsElement && taskData.total_steps !== undefined) totalStepsElement.textContent = taskData.total_steps;
        if (totalTokensElement && taskData.total_tokens !== undefined) totalTokensElement.textContent = taskData.total_tokens;

        // --- ADD LOGS ---
        console.log(`[UI] Setting display for #result-stats to 'flex'. Current display was: ${statsContainer.style.display}`);
        statsContainer.style.display = 'flex';
        console.log(`[UI] New display for #result-stats: ${statsContainer.style.display}`);
        // --- END LOGS ---
    },
    
    /**
     * 显示任务统计获取失败
     */
    showTaskStatsFailed() {
        const statsContainer = document.getElementById('result-stats');
        if (statsContainer) {
            statsContainer.style.display = 'flex';
            const failedText = t('common.fetchFailed', { default: '获取失败'});
            document.getElementById('elapsed-time').textContent = failedText;
            document.getElementById('total-steps').textContent = failedText;
            document.getElementById('total-tokens').textContent = failedText;
        }
    },
    
    /**
     * 更新字数统计显示
     */
    updateCharCountDisplay(charCount) {
        const charCountElement = document.getElementById('char-count');
        const charCountContainer = document.querySelector('.char-counter');
        const generateButton = document.getElementById('generate-story');

        if (charCountElement) {
            charCountElement.textContent = charCount;
        }
        if (charCountContainer) {
            charCountContainer.classList.toggle('warning', charCount > 5000);
        }
        if (generateButton) {
            generateButton.disabled = charCount > 5000 && generateButton.getAttribute('data-action') === 'generate';
        }
    },
    
    // --- ADD NEW FUNCTIONS for Input Errors ---
    showInputError(fieldName, message) {
        // Use fieldName to find the input and the corresponding error div
        const errorElement = document.getElementById(`${fieldName}-error`);
        const inputElement = document.getElementById(`${fieldName}-name`) || document.getElementById(`${fieldName}-description`); // Handle different ID patterns
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        if (inputElement) {
            inputElement.classList.add('input-error');
        }
    },
    clearInputError(fieldName) {
        const errorElement = document.getElementById(`${fieldName}-error`);
        const inputElement = document.getElementById(`${fieldName}-name`) || document.getElementById(`${fieldName}-description`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
        if (inputElement) {
            inputElement.classList.remove('input-error');
        }
    },
    // --- END NEW FUNCTIONS ---

    // --- ADD System Info Update Function ---
    displaySystemInfo(taskId) {
        const systemInfoContainerEl = document.getElementById('system-info-container');
        const systemInfoContentEl = document.getElementById('system-info-content');
        if (systemInfoContainerEl && systemInfoContentEl) {
            if (taskId) { 
                systemInfoContainerEl.style.display = 'block';
                systemInfoContentEl.textContent = `Task ID: ${taskId}`;
            }
        } else {
            if (!taskId) console.warn("[UI US] displaySystemInfo called without taskId.");
        }
    }
    // --- END System Info Update Function ---
};

// Export UI object for index.js to use
export default UI; 