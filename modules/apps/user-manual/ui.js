/**
 * EVYD产品经理AI工作台 - User Manual生成器
 * UI交互模块
 */

import { t } from '/scripts/i18n.js'; 
import { marked } from 'marked'; // Import marked library
// import Header from '/modules/common/header.js'; // Likely not needed directly

const UI = {
    initUserInterface() {
        console.log("Initializing User Manual UI elements...");
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
        // Rewrite with explicit checks
        const loadingEl = document.getElementById('app-info-loading');
        if (loadingEl) loadingEl.style.display = 'flex';

        const errorEl = document.getElementById('app-info-error');
        if (errorEl) errorEl.style.display = 'none';

        const infoEl = document.getElementById('app-info');
        if (infoEl) infoEl.style.display = 'none';

        const formEl = document.getElementById('app-form');
        if (formEl) formEl.style.display = 'none';
    },
    
    showError(message, modalToOpenId = null) {
        const loadingEl = document.getElementById('app-info-loading');
        const errorEl = document.getElementById('app-info-error');
        const errorMessageEl = document.getElementById('error-message');
        const appInfoEl = document.getElementById('app-info');
        const appFormEl = document.getElementById('app-form');

        if(loadingEl) loadingEl.style.display = 'none';
        if(appInfoEl) appInfoEl.style.display = 'none';
        if(appFormEl) appFormEl.style.display = 'none';

        if(errorEl && errorMessageEl) {
            errorEl.style.display = 'flex';
            errorMessageEl.textContent = message;
             // TODO: Handle modalToOpenId to suggest opening settings/admin panel
        } else {
            console.error("Could not display error, elements not found.");
            alert(message); // Fallback
        }
    },

    displayAppInfo(appInfo) {
         // Rewrite with explicit checks instead of optional chaining
         const loadingEl = document.getElementById('app-info-loading');
         if (loadingEl) loadingEl.style.display = 'none';
         
         const appInfoEl = document.getElementById('app-info');
         const appNameEl = document.getElementById('app-name');
         const appDescEl = document.getElementById('app-description');
         const tagsContainer = document.getElementById('app-tags');
         const appFormEl = document.getElementById('app-form');

         if(appInfoEl && appNameEl && appDescEl && tagsContainer && appFormEl) {
             if (appInfoEl) appInfoEl.style.display = 'block';
             appNameEl.textContent = appInfo.name || t('userManual.defaultAppName', { default: 'User Manual 生成器'});
             appDescEl.textContent = appInfo.description || t('userManual.defaultAppDesc', { default: '通过AI快速生成用户手册...'});
             tagsContainer.innerHTML = '';
             if (appInfo.tags && appInfo.tags.length > 0) {
                  appInfo.tags.forEach(tag => {
                     const tagEl = document.createElement('span');
                     let className = 'app-tag';
                     if (tag.toLowerCase() === 'ai') className += ' tag-ai';
                     // Add other tag classes if needed
                     tagEl.className = className;
                     tagEl.textContent = tag;
                     tagsContainer.appendChild(tagEl);
                  });
             }
             if (appFormEl) appFormEl.style.display = 'block';
         } else {
              console.error("Required app info DOM elements not found for User Manual.");
         }
    },
    
    showRequestingState() {
        const generateButton = document.getElementById('generate-manual');
        const stopButton = document.getElementById('stop-generation');

        if (generateButton) {
            const requestingText = t('common.requesting', { default: '请求中...' });
            generateButton.innerHTML = '<div class="loading-circle-container"><div class="loading-circle"></div></div> ' + requestingText;
            generateButton.disabled = true; // Disable button during request
            generateButton.setAttribute('data-action', 'requesting'); // Optional: set action state
        }
        if (stopButton) {
            stopButton.style.display = 'none'; // Ensure separate stop button is hidden
        }
    },
    
    showGenerationStarted() {
        const resultContainer = document.getElementById('result-container');
        const resultStats = document.getElementById('result-stats');
        const resultContent = document.getElementById('result-content');
        const resultMarkdown = document.getElementById('result-content-markdown');
        const systemInfoContainer = document.getElementById('system-info-container');
        const systemInfoContent = document.getElementById('system-info-content');
        const generateButton = document.getElementById('generate-manual'); // Correct button ID
        const stopButton = document.getElementById('stop-generation');

        if (resultContainer) resultContainer.style.display = 'block';
        if (resultStats) resultStats.style.display = 'none';
        if (resultContent) {
             resultContent.innerHTML = t('common.generatingSimple', { default: '正在生成...'}) + '<span class="cursor"></span>';
             resultContent.style.display = 'block';
        }
        if (resultMarkdown) {
            resultMarkdown.style.display = 'none';
            resultMarkdown.innerHTML = '';
        }
        if (systemInfoContainer) systemInfoContainer.style.display = 'none';
        if (systemInfoContent) systemInfoContent.innerHTML = '';
        
        if (generateButton) {
            generateButton.disabled = false; // --- MODIFY: Enable button --- 
            const generatingText = t('common.generating', { default: '生成中...点击停止' });
            generateButton.innerHTML = '<div class="loading-circle-container"><div class="loading-circle" style="border-color: #ff3333; border-top-color: transparent;"></div></div> ' + generatingText;
            generateButton.setAttribute('data-action', 'stop');
        }
        // --- MODIFY: Hide separate stop button --- 
        // if(stopButton) stopButton.style.display = 'inline-block'; // Show separate stop button
        if(stopButton) stopButton.style.display = 'none'; 
    },
    
    showGenerationCompleted() {
        const generateButton = document.getElementById('generate-manual'); // Correct button ID
        if (generateButton) {
            generateButton.disabled = false; // --- MODIFY: Ensure button is enabled --- 
            const buttonText = t('userManual.generateButton', { default: '生成 User Manual' });
            generateButton.innerHTML = buttonText;
            generateButton.setAttribute('data-action', 'generate');
            generateButton.classList.remove('btn-danger', 'btn-secondary'); 
            generateButton.classList.add('btn-primary');
        }
        const stopButton = document.getElementById('stop-generation');
        if(stopButton) stopButton.style.display = 'none';
    },
    
    displayStats(taskData) {
        // Reuse logic from user-story UI, ensure element IDs match user-manual.html
        console.log('Displaying stats for User Manual:', taskData);
        const elapsedTime = taskData.elapsed_time || 0;
        const totalSteps = taskData.total_steps || 0;
        const totalTokens = taskData.total_tokens || 0;
        
        const elapsedTimeElement = document.getElementById('elapsed-time');
        const totalStepsElement = document.getElementById('total-steps');
        const totalTokensElement = document.getElementById('total-tokens');
        const statsContainer = document.getElementById('result-stats');

        if (!elapsedTimeElement || !totalStepsElement || !totalTokensElement || !statsContainer) {
            console.error('Stat DOM elements not found for User Manual.');
            return;
        }
        
        const secondsSuffix = t('userManual.secondsSuffix', { default: '秒' });
        elapsedTimeElement.textContent = `${Number(elapsedTime).toFixed(2)}${secondsSuffix}`;
        totalStepsElement.textContent = totalSteps;
        totalTokensElement.textContent = totalTokens;
        statsContainer.style.display = 'flex';
    },
    
    showTaskStatsFailed() {
        // Reuse logic, ensure IDs match
        const statsContainer = document.getElementById('result-stats');
        if (statsContainer) {
            statsContainer.style.display = 'flex';
            const failedText = t('common.fetchFailed', { default: '获取失败'});
            document.getElementById('elapsed-time').textContent = failedText;
            document.getElementById('total-steps').textContent = failedText;
            document.getElementById('total-tokens').textContent = failedText;
        }
    },
    
    updateCharCountDisplay(charCount) {
        const charCountElement = document.getElementById('char-count');
        const charCountContainer = document.querySelector('.char-counter');
        const generateButton = document.getElementById('generate-manual'); // Correct button ID

        if (charCountElement) charCountElement.textContent = charCount;
        if (charCountContainer) charCountContainer.classList.toggle('warning', charCount > 5000);
        if (generateButton) {
            generateButton.disabled = charCount > 5000 && generateButton.getAttribute('data-action') === 'generate';
        }
    },
     showStopMessage() {
         const resultContent = document.getElementById('result-content');
         if (resultContent) {
             const stopMsg = document.createElement('i');
             stopMsg.textContent = t('common.generationStopped', { default: '(已停止生成)' });
             const br = document.createElement('br');
             resultContent.appendChild(br);
             resultContent.appendChild(br.cloneNode());
             resultContent.appendChild(stopMsg);
         }
     },
      showErrorInResult(message) {
        const resultContent = document.getElementById('result-content');
        const resultMarkdown = document.getElementById('result-content-markdown');
        if (resultContent) {
             resultContent.innerHTML = `<span style="color: red;">${message}</span>`;
             resultContent.style.display = 'block';
        }
         if (resultMarkdown) {
             resultMarkdown.style.display = 'none';
        }
     },
     showInputError(fieldName, message) {
        const errorElement = document.getElementById(`${fieldName}-error`);
        const inputElement = document.getElementById(`${fieldName}-description`); // Assuming ID pattern
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        if (inputElement) {
            inputElement.classList.add('input-error'); // Optional: Add class for styling
        }
    },
    clearInputError(fieldName) {
        const errorElement = document.getElementById(`${fieldName}-error`);
        const inputElement = document.getElementById(`${fieldName}-description`); // Assuming ID pattern
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
        if (inputElement) {
            inputElement.classList.remove('input-error'); // Optional: Remove error class
        }
    },
    displaySystemInfo(data) { // Parameter could be taskId or an object { task_id, conversation_id }
        const systemInfoContainerEl = document.getElementById('system-info-container');
        const systemInfoContentEl = document.getElementById('system-info-content');
        if (systemInfoContainerEl && systemInfoContentEl && data) {
            systemInfoContainerEl.style.display = 'block';
            // Adapt based on what data is passed (string taskId or object)
            if (typeof data === 'string') { 
                systemInfoContentEl.textContent = `Message ID: ${data}`;
            } else {
                systemInfoContentEl.textContent = JSON.stringify(data, null, 2);
            }
        } else {
            if (!data) console.warn("[UI UM] displaySystemInfo called without data.");
            // else console.warn("[UI UM] System info container/content elements not found.");
        }
    }
};

export default UI;