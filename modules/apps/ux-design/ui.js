/**
 * UX 界面设计UI相关功能
 */
import { t } from '/scripts/i18n.js';
import { marked } from 'marked';

const UXDesignUI = {
    // Cache DOM elements
    textareaElement: null,
    charCountElement: null,
    expandTextareaButton: null,
    generateButton: null,
    stopButton: null,
    copyButton: null,
    toggleSystemInfoButton: null,
    resultContentEl: null,
    resultMarkdownEl: null,
    statsContainerEl: null,
    systemInfoContainerEl: null,
    systemInfoContentEl: null,
    appInfoLoadingEl: null,
    appInfoErrorEl: null,
    appInfoEl: null,
    appNameEl: null,
    appDescEl: null,
    tagsContainerEl: null,
    appFormEl: null,
    errorMessageEl: null,
    resultContainerEl: null,

    initUI() {
        // console.log("Initializing UX Design UI...");
        this.textareaElement = document.getElementById('requirement-description');
        this.charCountElement = document.getElementById('char-count');
        this.expandTextareaButton = document.getElementById('expand-textarea');
        this.generateButton = document.getElementById('generate-prompt');
        this.stopButton = document.getElementById('stop-generation');
        this.copyButton = document.getElementById('copy-result');
        this.toggleSystemInfoButton = document.getElementById('toggle-system-info');
        this.resultContentEl = document.getElementById('result-content');
        this.resultMarkdownEl = document.getElementById('result-content-markdown');
        this.statsContainerEl = document.getElementById('result-stats');
        this.systemInfoContainerEl = document.getElementById('system-info-container');
        this.systemInfoContentEl = document.getElementById('system-info-content');
        this.appInfoLoadingEl = document.getElementById('app-info-loading');
        this.appInfoErrorEl = document.getElementById('app-info-error');
        this.appInfoEl = document.getElementById('app-info');
        this.appNameEl = document.getElementById('app-name');
        this.appDescEl = document.getElementById('app-description');
        this.tagsContainerEl = document.getElementById('app-tags');
        this.appFormEl = document.getElementById('app-form');
        this.errorMessageEl = document.getElementById('error-message');
        this.resultContainerEl = document.getElementById('result-container');

        if(this.resultContainerEl) this.resultContainerEl.style.display = 'none';
        if (this.textareaElement) {
            this.updateCharCountDisplay(this.textareaElement.value.length);
        } else {
             console.warn("Requirement description textarea not found during init (UX Design).");
        }
    },

    updateCharCountDisplay(count) {
        // console.log(`[UI UX] updateCharCountDisplay called with count: ${count}`);
        if (this.charCountElement) {
            this.charCountElement.textContent = count;
            const container = this.charCountElement.closest('.char-counter');
            if(container) container.classList.toggle('warning', count > 5000);
        }
        if (this.generateButton) {
             const isGenerateAction = this.generateButton.getAttribute('data-action') === 'generate';
             const isDisabled = count > 5000 && isGenerateAction;
             // console.log(`[UI UX] Setting generate button disabled state to: ${isDisabled} (count=${count}, isGenerateAction=${isGenerateAction})`);
             this.generateButton.disabled = isDisabled;
        }
    },

    clearForm() {
        if (this.textareaElement) {
            this.textareaElement.value = '';
            this.updateCharCountDisplay(0);
        }
    },

    showError(message) {
         // Hide loading and content sections
         if(this.appInfoLoadingEl) this.appInfoLoadingEl.style.display = 'none';
         if(this.appInfoEl) this.appInfoEl.style.display = 'none';
         if(this.appFormEl) this.appFormEl.style.display = 'none';

         // Show error section
         if(this.appInfoErrorEl && this.errorMessageEl) {
             this.appInfoErrorEl.style.display = 'flex';
             this.errorMessageEl.textContent = message;
         } else {
             console.error("Could not display error, elements not found.");
             alert(message); // Fallback
         }
    },

    showLoading() {
        // console.log("[UX UI] Showing loading state...");
        if (this.appInfoLoadingEl) this.appInfoLoadingEl.style.display = 'flex';
        if (this.appInfoErrorEl) this.appInfoErrorEl.style.display = 'none';
        if (this.appInfoEl) this.appInfoEl.style.display = 'none';
        if (this.appFormEl) this.appFormEl.style.display = 'none';
    },

    displayAppInfo(appInfo) {
         if(this.appInfoLoadingEl) this.appInfoLoadingEl.style.display = 'none';
         if(this.appInfoErrorEl) this.appInfoErrorEl.style.display = 'none'; // Hide error on success

         if(this.appInfoEl && this.appNameEl && this.appDescEl && this.tagsContainerEl && this.appFormEl) {
             this.appInfoEl.style.display = 'block';
             this.appNameEl.textContent = appInfo.name || t('uxDesign.defaultAppName', { default: 'UX 界面设计助手'});
             this.appDescEl.textContent = appInfo.description || t('uxDesign.defaultAppDesc', { default: '根据需求描述生成Figma提示词...'});
             this.tagsContainerEl.innerHTML = '';
             if (appInfo.tags && appInfo.tags.length > 0) {
                  appInfo.tags.forEach(tag => {
                     const tagEl = document.createElement('span');
                     let className = 'app-tag';
                     if (tag.toLowerCase() === 'ai') className += ' tag-ai';
                     else if (tag.toLowerCase() === 'new') className += ' tag-new';
                     else if (tag.toLowerCase() === 'poc') className += ' tag-poc';
                     tagEl.className = className;
                     tagEl.textContent = tag;
                     this.tagsContainerEl.appendChild(tagEl);
                  });
             }
             this.appFormEl.style.display = 'block';
    } else {
              console.error("Required app info DOM elements not found for UX Design.");
         }
    },

    showRequestingState() {
        // console.log("[UX UI] Showing requesting state...");
        if (this.generateButton) {
            const requestingText = t('common.button.processing', { default: '处理中...' });
            this.generateButton.innerHTML = '<div class="loading-circle-container"><div class="loading-circle"></div></div> ' + requestingText;
            this.generateButton.disabled = true; // Disable button
            this.generateButton.setAttribute('data-action', 'requesting');
        }
        if (this.stopButton) {
            this.stopButton.style.display = 'none'; // Hide separate stop button
        }
    },

    showGenerationStarted() {
        // console.log("[UX UI] Showing generation started...");
        // 确保结果容器显示
        if (this.resultContainerEl) {
            this.resultContainerEl.style.display = 'block';
        } else {
            const resultContainer = document.getElementById('result-container');
            if (resultContainer) resultContainer.style.display = 'block';
        }
        
        if (this.generateButton) {
            this.generateButton.disabled = false;
            const generatingText = t('common.button.generating', { default: '生成中...点击停止' });
            this.generateButton.innerHTML = '<div class="loading-circle-container"><div class="loading-circle" style="border-color: #ff3333; border-top-color: transparent;"></div></div> ' + generatingText;
            this.generateButton.setAttribute('data-action', 'stop');
        }
        if (this.stopButton) this.stopButton.style.display = 'none';
        
        if (this.resultContentEl) {
            this.resultContentEl.innerHTML = t('common.generatingSimple', { default: '正在生成...'}) + '<span class="cursor"></span>';
            this.resultContentEl.style.display = 'block'; // Show text initially
        }
        if (this.resultMarkdownEl) {
            this.resultMarkdownEl.style.display = 'none'; // Hide markdown initially
            this.resultMarkdownEl.innerHTML = '';
        }
        if (this.statsContainerEl) this.statsContainerEl.style.display = 'none';
        if (this.systemInfoContainerEl) this.systemInfoContainerEl.style.display = 'none';
    },

    showGenerationCompleted() {
        // console.log("[UX UI] Showing generation completed...");
        if (this.generateButton) {
            this.generateButton.disabled = false;
            const buttonText = t('common.button.generate', { default: '发送给AI' });
            this.generateButton.innerHTML = buttonText;
            this.generateButton.setAttribute('data-action', 'generate');
            this.generateButton.classList.remove('btn-danger');
            this.generateButton.classList.add('btn-primary');
            this.updateCharCountDisplay(this.textareaElement?.value?.length ?? 0);
        }
        if (this.stopButton) this.stopButton.style.display = 'none';
    },
    
    /**
     * 显示正在停止生成状态
     */
    setStoppingState() {
        if (this.generateButton) {
            const stoppingText = t('common.stopping', { default: '正在停止...' });
            this.generateButton.innerHTML = stoppingText;
            this.generateButton.disabled = true;
        }
    },
    
    displayStats(stats) {
        // console.log('[UI UX] displayStats received data:', stats);
        const elapsedTime = stats.elapsed_time || 0;
        const totalSteps = stats.total_steps || 1; // Default to 1 step for UX
         if (this.statsContainerEl) {
             this.statsContainerEl.style.display = 'flex';
             const elapsedEl = this.statsContainerEl.querySelector('#elapsed-time');
             const stepsEl = this.statsContainerEl.querySelector('#total-steps');
             const tokensEl = this.statsContainerEl.querySelector('#total-tokens');
             const secondsSuffix = t('uxDesign.secondsSuffix', { default: '秒' });

             if (elapsedEl && elapsedTime !== undefined) elapsedEl.textContent = `${Number(elapsedTime).toFixed(2)}${secondsSuffix}`;
             if (stepsEl && totalSteps !== undefined) stepsEl.textContent = totalSteps;
             if (tokensEl && stats.total_tokens !== undefined) tokensEl.textContent = stats.total_tokens;
         } else {
              console.error("Stats container not found.");
         }
    },
    
    displaySystemInfo(info) {
         if (this.systemInfoContainerEl && this.systemInfoContentEl) {
            if (info) { 
                this.systemInfoContainerEl.style.display = 'block';
                let displayData = {};
                if(info.message_id) displayData.message_id = info.message_id;
                if(info.conversation_id) displayData.conversation_id = info.conversation_id;
                this.systemInfoContentEl.textContent = JSON.stringify(displayData, null, 2);
            }
         } else {
              if (!info) console.warn("[UI UX] displaySystemInfo called without info object.");
         }
    },
    
    appendStreamContent(chunk) {
        // Assuming text content for simplicity now
        if (this.resultContentEl) {
            this.resultContentEl.textContent += chunk; 
            this.resultContentEl.scrollTop = this.resultContentEl.scrollHeight;
        } else if (this.resultMarkdownEl) {
             // If primarily using markdown, need to append and re-render
             this.resultMarkdownEl.textContent += chunk; // Append raw text
             this.resultMarkdownEl.scrollTop = this.resultMarkdownEl.scrollHeight;
        }
    },
    
    showErrorInResult(message) {
        if (this.resultContentEl) {
             this.resultContentEl.innerHTML = `<span style="color: red;">${message}</span>`;
             this.resultContentEl.style.display = 'block';
        }
         if (this.resultMarkdownEl) {
             this.resultMarkdownEl.style.display = 'none';
        }
    },
    
    showStopMessage() {
        if (this.resultContentEl) {
             const stopMsg = document.createElement('i');
             stopMsg.textContent = t('common.generationStopped', { default: '(已停止生成)' });
             const br = document.createElement('br');
             this.resultContentEl.appendChild(br);
             this.resultContentEl.appendChild(br.cloneNode());
             this.resultContentEl.appendChild(stopMsg);
         }
    },

    // Remove methods handled directly in api.js stream handler
    // renderMarkdown(markdownContent) { ... }
    // appendRawText(textChunk) { ... }
    // updateResultContent(content, isMarkdown = false) { ... }
    
    /**
     * 将当前结果文本渲染为Markdown HTML
     */
    renderMarkdown() {
        const resultContentEl = this.resultContentEl || document.getElementById('result-content');
        const resultMarkdownEl = this.resultMarkdownEl || document.getElementById('result-content-markdown');
        const resultContainerEl = this.resultContainerEl || document.getElementById('result-container');
        
        if (!resultContentEl || !resultMarkdownEl) {
            console.error("Result display elements not found for rendering markdown!");
            return;
        }
        
        // 确保结果容器显示
        if (resultContainerEl) {
            resultContainerEl.style.display = 'block';
        }
        
        try {
            const text = resultContentEl.textContent || '';
            if (!text.trim()) return;
            
            const html = marked(text);
            resultMarkdownEl.innerHTML = html;
            resultMarkdownEl.style.display = 'block';
            resultContentEl.style.display = 'none';
            resultMarkdownEl.scrollTop = resultMarkdownEl.scrollHeight;
        } catch (error) {
            console.error("Error rendering markdown:", error);
            // 保持纯文本显示
            resultContentEl.style.display = 'block';
            resultMarkdownEl.style.display = 'none';
        }
    },
};

// --- ADD NEW FUNCTIONS ---
/**
 * 显示指定输入字段的错误信息
 * @param {string} fieldName - 字段名称 (例如 'requirement')
 * @param {string} message - 错误信息文本
 */
UXDesignUI.showInputError = function(fieldName, message) {
    const errorElement = document.getElementById(`${fieldName}-error`);
    const inputElement = document.getElementById(`${fieldName}-description`); // Assuming ID pattern
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    if (inputElement) {
        inputElement.classList.add('input-error'); // Optional: Add class for styling
    }
};

/**
 * 清除指定输入字段的错误信息
 * @param {string} fieldName - 字段名称 (例如 'requirement')
 */
UXDesignUI.clearInputError = function(fieldName) {
    const errorElement = document.getElementById(`${fieldName}-error`);
    const inputElement = document.getElementById(`${fieldName}-description`); // Assuming ID pattern
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
    if (inputElement) {
        inputElement.classList.remove('input-error'); // Optional: Remove error class
    }
};
// --- END NEW FUNCTIONS ---

export default UXDesignUI; 