/**
 * EVYD产品经理AI工作台 - Requirement Analysis Assistant
 * UI交互模块 (Adapted from User Manual UI)
 */

import { t } from '/scripts/i18n.js'; 
import { marked } from 'marked';

const UI = {
    // Store DOM elements for reuse
    elements: {},

    initUserInterface() {
        console.log("Initializing Requirement Analysis UI elements...");
        // Cache frequently used elements
        this.elements.resultContainer = document.getElementById('result-container');
        this.elements.requirementDesc = document.getElementById('requirement-description');
        this.elements.generateButton = document.getElementById('generate-button');
        this.elements.stopButton = document.getElementById('stop-generation');
        this.elements.charCount = document.getElementById('char-count');
        this.elements.charCountContainer = document.querySelector('.char-counter');
        this.elements.loadingEl = document.getElementById('app-info-loading');
        this.elements.errorEl = document.getElementById('app-info-error');
        this.elements.errorMessageEl = document.getElementById('error-message');
        this.elements.appInfoEl = document.getElementById('app-info');
        this.elements.appNameEl = document.getElementById('app-name');
        this.elements.appDescEl = document.getElementById('app-description');
        this.elements.tagsContainer = document.getElementById('app-tags');
        this.elements.appFormEl = document.getElementById('app-form');
        this.elements.resultStats = document.getElementById('result-stats');
        this.elements.resultContent = document.getElementById('result-content');
        this.elements.resultMarkdown = document.getElementById('result-content-markdown');
        this.elements.systemInfoContainer = document.getElementById('system-info-container');
        this.elements.systemInfoContent = document.getElementById('system-info-content');
        this.elements.elapsedTime = document.getElementById('elapsed-time');
        this.elements.totalSteps = document.getElementById('total-steps');
        this.elements.totalTokens = document.getElementById('total-tokens');
        this.elements.requirementError = document.getElementById('requirement-error');
        this.elements.textareaContainer = document.querySelector('.textarea-container');
        this.elements.expandButton = document.getElementById('expand-textarea');


        if(this.elements.resultContainer) this.elements.resultContainer.style.display = 'none';
        if (this.elements.requirementDesc) {
            this.updateCharCountDisplay(this.elements.requirementDesc.value.length);
        }
    },
    
    showLoading() {
        if (this.elements.loadingEl) this.elements.loadingEl.style.display = 'flex';
        if (this.elements.errorEl) this.elements.errorEl.style.display = 'none';
        if (this.elements.appInfoEl) this.elements.appInfoEl.style.display = 'none';
        if (this.elements.appFormEl) this.elements.appFormEl.style.display = 'none';
    },

    hideLoading() {
         if (this.elements.loadingEl) this.elements.loadingEl.style.display = 'none';
    },

    hideError() {
        if (this.elements.errorEl) this.elements.errorEl.style.display = 'none';
    },
    
    showError(message, isApiKeyError = false) {
        this.hideLoading();
        if(this.elements.appInfoEl) this.elements.appInfoEl.style.display = 'none';
        if(this.elements.appFormEl) this.elements.appFormEl.style.display = 'none';

        if(this.elements.errorEl && this.elements.errorMessageEl) {
            this.elements.errorEl.style.display = 'flex';
            this.elements.errorMessageEl.textContent = message;
            // TODO: Add button/link to settings if isApiKeyError is true
        } else {
            console.error("Could not display error, elements not found.");
            alert(message); // Fallback
        }
    },

    displayAppInfo(appInfo) {
         this.hideLoading();
         this.hideError();

         if(this.elements.appInfoEl && this.elements.appNameEl && this.elements.appDescEl && this.elements.tagsContainer && this.elements.appFormEl) {
             this.elements.appInfoEl.style.display = 'block';
             this.elements.appNameEl.textContent = appInfo.name || t('requirementAnalysis.appName', { default: '需求分析助手'});
             this.elements.appDescEl.textContent = appInfo.description || t('requirementAnalysis.appDescription', { default: '分析需求文档，识别关键点...'});
             this.elements.tagsContainer.innerHTML = ''; // Clear tags
             // Add tags if they exist in appInfo (example)
             if (appInfo.tags && appInfo.tags.length > 0) {
                  appInfo.tags.forEach(tag => {
                     const tagEl = document.createElement('span');
                     tagEl.className = 'app-tag'; // Add specific classes if needed
                     tagEl.textContent = tag;
                     this.elements.tagsContainer.appendChild(tagEl);
                  });
             }
             this.elements.appFormEl.style.display = 'block';
         } else {
              console.error("Required app info DOM elements not found for Requirement Analysis.");
         }
    },
    
    // --- Button State Management --- 
    setRequestingState() {
        if (this.elements.generateButton) {
            const requestingText = t('common.button.processing', { default: '处理中...' });
            this.elements.generateButton.innerHTML = `<div class="loading-circle-container"><div class="loading-circle"></div></div> ${requestingText}`;
            this.elements.generateButton.disabled = true;
            this.elements.generateButton.setAttribute('data-action', 'requesting');
        }
        if (this.elements.stopButton && this.elements.stopButton !== this.elements.generateButton) {
            this.elements.stopButton.style.display = 'none';
        }
    },
    
    setGeneratingState() {
        if (this.elements.generateButton) {
            this.elements.generateButton.disabled = false; 
            const generatingText = t('common.button.generating', { default: '生成中...点击停止' });
            this.elements.generateButton.innerHTML = `<div class="loading-circle-container"><div class="loading-circle loading-red"></div></div> ${generatingText}`;
            this.elements.generateButton.setAttribute('data-action', 'stop');
        }
        if (this.elements.stopButton && this.elements.stopButton !== this.elements.generateButton) {
            this.elements.stopButton.style.display = 'inline-block'; // Show separate stop button if it exists
        }
    },
    
    setStoppingState() {
        if (this.elements.generateButton) {
            const stoppingText = t('common.stopping', { default: '正在停止...' });
            this.elements.generateButton.innerHTML = stoppingText;
            this.elements.generateButton.disabled = true;
        }
        if (this.elements.stopButton && this.elements.stopButton !== this.elements.generateButton) {
            this.elements.stopButton.disabled = true;
        }
    },

    showGenerationCompleted() {
        if (this.elements.generateButton) {
            this.elements.generateButton.disabled = false; 
            const buttonText = t('common.button.generate', { default: '发送给Dify' }); // Use updated default
            this.elements.generateButton.innerHTML = buttonText;
            this.elements.generateButton.setAttribute('data-action', 'generate');
        }
        if (this.elements.stopButton && this.elements.stopButton !== this.elements.generateButton) {
            this.elements.stopButton.style.display = 'none';
            this.elements.stopButton.disabled = false;
        }
        // Remove lingering cursor from content
        const cursor = this.elements.resultContent?.querySelector('span.cursor');
        if (cursor) cursor.remove();
    },

    // --- Result Display --- 
    clearResultArea() {
        if (this.elements.resultContainer) this.elements.resultContainer.style.display = 'none';
        if (this.elements.resultStats) this.elements.resultStats.style.display = 'none';
        if (this.elements.resultContent) this.elements.resultContent.innerHTML = '';
        if (this.elements.resultMarkdown) {
             this.elements.resultMarkdown.innerHTML = '';
             this.elements.resultMarkdown.style.display = 'none';
        }
        if (this.elements.systemInfoContainer) this.elements.systemInfoContainer.style.display = 'none';
        if (this.elements.systemInfoContent) this.elements.systemInfoContent.innerHTML = '';
    },

    showResultContainer() {
        if (this.elements.resultContainer) this.elements.resultContainer.style.display = 'block';
    },

    appendStreamContent(textChunk) {
        if (!this.elements.resultContent || !this.elements.resultMarkdown) return;

        // Remove initial placeholder/cursor if present
        const cursor = this.elements.resultContent.querySelector('span.cursor');
        if (cursor) cursor.remove();
        
        // Append to hidden raw text (optional, for debugging or backup)
        // this.elements.resultContent.textContent += textChunk;

        // Append to markdown view
        this.elements.resultMarkdown.innerHTML += textChunk;
        this.elements.resultMarkdown.style.display = 'block';
        this.elements.resultContent.style.display = 'none'; // Hide raw
        
        // Render accumulated Markdown
        this.renderMarkdown(); 
        
        // Scroll to bottom
        this.elements.resultMarkdown.scrollTop = this.elements.resultMarkdown.scrollHeight;
    },

    renderMarkdown() {
        if (!this.elements.resultMarkdown) return;
        try {
            // Use innerHTML as source, assuming it contains Markdown text
            this.elements.resultMarkdown.innerHTML = marked.parse(this.elements.resultMarkdown.innerHTML, { breaks: true });
            // Re-apply scroll after render if needed
            this.elements.resultMarkdown.scrollTop = this.elements.resultMarkdown.scrollHeight;
        } catch (error) {
            console.error("Error rendering markdown:", error);
            // Fallback: display raw in the primary content area
            if (this.elements.resultContent && this.elements.resultMarkdown) {
                this.elements.resultContent.textContent = this.elements.resultMarkdown.textContent;
                this.elements.resultContent.style.display = 'block';
                this.elements.resultMarkdown.style.display = 'none';
            }
        }
    },

    displayStats(metadata) {
        if (!this.elements.resultStats || !metadata) {
            this.showTaskStatsFailed(); // Show failure if no elements or data
            return;
        }
        const elapsedTime = metadata.elapsed_time || 0;
        // Correctly access total_tokens within the usage object
        const totalTokens = metadata.usage?.total_tokens || 0; 
        // Restore totalSteps, default to 1 if not present
        const totalSteps = metadata.total_steps || 1; 
        
        const secondsSuffix = t('requirementAnalysis.secondsSuffix', { default: '秒' }); // Use correct key
        if(this.elements.elapsedTime) this.elements.elapsedTime.textContent = `${Number(elapsedTime).toFixed(2)}${secondsSuffix}`;
        if(this.elements.totalSteps) this.elements.totalSteps.textContent = totalSteps;
        if(this.elements.totalTokens) this.elements.totalTokens.textContent = totalTokens;
        this.elements.resultStats.style.display = 'flex';
    },
    
    showTaskStatsFailed() {
        if (this.elements.resultStats) {
            this.elements.resultStats.style.display = 'flex';
            const failedText = t('common.fetchFailed', { default: '获取失败'});
            if(this.elements.elapsedTime) this.elements.elapsedTime.textContent = failedText;
            if(this.elements.totalSteps) this.elements.totalSteps.textContent = failedText;
            if(this.elements.totalTokens) this.elements.totalTokens.textContent = failedText;
        }
    },

    displaySystemInfo(data) {
        if (this.elements.systemInfoContainer && this.elements.systemInfoContent && data) {
            this.elements.systemInfoContainer.style.display = 'block';
            try {
                 this.elements.systemInfoContent.innerHTML = `<pre><code>${JSON.stringify(data, null, 2)}</code></pre>`;
            } catch (e) {
                 this.elements.systemInfoContent.textContent = 'Error displaying system info.';
            }
        } else {
             if (this.elements.systemInfoContainer) this.elements.systemInfoContainer.style.display = 'none';
             if (!data) console.warn("[UI RA] displaySystemInfo called without data.");
        }
    },

    toggleSystemInfo() {
        const content = UI.elements.systemInfoContent;
        const button = document.getElementById('toggle-system-info'); // Get button by ID
        if (!content || !button) return;

        const isHidden = content.style.display === 'none' || content.offsetHeight === 0;
        if (isHidden) {
            content.style.display = 'block';
            button.classList.remove('collapsed');
            button.title = t('common.collapseInfo', { default: '收起系统信息' });
        } else {
            content.style.display = 'none';
            button.classList.add('collapsed');
            button.title = t('common.expandInfo', { default: '展开系统信息' });
        }
    },

    // --- Form Handling --- 
     handleInput(value) {
        const charCount = value.length;
        this.updateCharCountDisplay(charCount);
        // Enable/disable generate button based on content and length
        if (this.elements.generateButton) {
            const isDisabled = value.trim().length === 0 || charCount > 5000;
            // Only disable if the current action is 'generate'
            if (this.elements.generateButton.getAttribute('data-action') === 'generate') {
                 this.elements.generateButton.disabled = isDisabled;
            }
        }
    },

    updateCharCountDisplay(charCount) {
        if (this.elements.charCount) this.elements.charCount.textContent = charCount;
        if (this.elements.charCountContainer) {
             this.elements.charCountContainer.classList.toggle('warning', charCount > 5000);
        }
    },

    showInputError(fieldName, message) {
        // Assuming fieldName is 'requirement' for now
        if (this.elements.requirementError) {
            this.elements.requirementError.textContent = message;
            this.elements.requirementError.style.display = 'block';
        }
        if (this.elements.requirementDesc) {
            this.elements.requirementDesc.classList.add('input-error');
        }
    },

    clearInputError(fieldName) {
         if (this.elements.requirementError) {
            this.elements.requirementError.textContent = '';
            this.elements.requirementError.style.display = 'none';
        }
        if (this.elements.requirementDesc) {
            this.elements.requirementDesc.classList.remove('input-error');
        }
    },

    clearForm() {
        if(this.elements.requirementDesc) this.elements.requirementDesc.value = '';
        this.updateCharCountDisplay(0);
        this.clearInputError('requirement');
        // Don't clear results automatically, user might want to keep them
        // this.clearResultArea(); 
    },

    copyResult() {
        let textToCopy = '';
        if (this.elements.resultMarkdown && this.elements.resultMarkdown.style.display !== 'none') {
            textToCopy = this.elements.resultMarkdown.innerText; // Get text from rendered markdown
        } else if (this.elements.resultContent) {
            textToCopy = this.elements.resultContent.textContent;
        }
        
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                this.showToast(t('common.copied', { default: '已复制!' }), 'success');
            }).catch(err => {
                 console.error('Failed to copy text: ', err);
                 this.showToast(t('common.copyFailed', { default: '复制失败'}), 'error');
            });
         } else {
             this.showToast(t('common.nothingToCopy', { default: '没有内容可复制' }), 'warning');
         }
    },

    toggleTextareaExpand() {
        const container = this.elements.textareaContainer;
        const textarea = this.elements.requirementDesc;
        const button = this.elements.expandButton;
        const overlayId = 'textarea-dynamic-overlay';

        if (!container || !textarea || !button) {
            console.error('Textarea expand required elements not found');
            return;
        }
        
        const isExpanded = container.classList.contains('textarea-expanded'); // Check custom class
        let existingOverlay = document.getElementById(overlayId);
        
        if (isExpanded) {
            // --- Shrink --- 
            container.classList.remove('textarea-expanded');
            container.style.position = ''; // Remove fixed styles if needed
            container.style.top = '';
            container.style.left = '';
            container.style.transform = '';
            container.style.width = '';
            container.style.height = '';
            container.style.zIndex = '';

            // Restore textarea size if saved
            textarea.rows = textarea.dataset.originalRows || 6;

            // Remove overlay if it exists
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            // Restore button icon
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7"/></svg>`;
        } else {
            // --- Expand --- 
            // Save original rows
            textarea.dataset.originalRows = textarea.rows;

            // Apply expanded class (which sets position: fixed, etc.)
            container.classList.add('textarea-expanded');

            // Create and add overlay
            if (!existingOverlay) {
                const overlay = document.createElement('div');
                overlay.id = overlayId;
                overlay.className = 'textarea-overlay'; // Use class from common.css
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                overlay.style.zIndex = '1000'; // Ensure it's below the expanded textarea (z-index 1001)
                overlay.addEventListener('click', () => this.toggleTextareaExpand()); // Click overlay to shrink
                document.body.appendChild(overlay);
            }
            
            // Update button icon
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`;
            textarea.focus();
        }
    },

    // Simple Toast Notification (can be expanded)
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        // Trigger reflow for animation
        toast.offsetHeight; 
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500); // Remove after fade out
        }, 3000);
    }
};

export default UI; 