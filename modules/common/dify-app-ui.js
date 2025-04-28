/**
 * EVYD 产品经理 AI 工作台 - 通用 Dify 应用 UI 模块
 */

class DifyAppUI {
    constructor({ t, marked }) {
        if (!t || !marked) {
            throw new Error("DifyAppUI requires 't' (i18n function) and 'marked' library during instantiation.");
        }
        this.t = t;
        this.marked = marked;
        this.elements = {}; // To cache DOM elements
        this.config = {
            // Default configuration, can be overridden if needed
            charCountLimit: 5000,
            inputElementId: 'prompt-input', // Default primary input ID
            inputErrorElementId: 'prompt-error', // Default error message element for primary input
            textareaContainerSelector: '.textarea-container',
            expandButtonId: 'expand-textarea'
        }; 
    }

    /**
     * Caches essential UI elements based on standard IDs.
     * Call this after the DOM is ready.
     * @param {object} configOverrides - Optional overrides for configuration (e.g., inputElementId).
     */
    initUserInterface(configOverrides = {}) {
        // console.log("Initializing Generic Dify App UI elements...");
        this.config = { ...this.config, ...configOverrides };

        // --- Core Elements ---
        this.elements.loadingEl = document.getElementById('app-info-loading');
        this.elements.errorEl = document.getElementById('app-info-error');
        this.elements.errorMessageEl = document.getElementById('error-message');
        this.elements.appInfoEl = document.getElementById('app-info');
        this.elements.appNameEl = document.getElementById('app-name');
        this.elements.appDescEl = document.getElementById('app-description');
        this.elements.tagsContainer = document.getElementById('app-tags');
        this.elements.appFormEl = document.getElementById('app-form');
        
        // --- Input Elements (using config) ---
        this.elements.promptInput = document.getElementById(this.config.inputElementId); // Primary input
        this.elements.inputError = document.getElementById(this.config.inputErrorElementId); // Error display for primary input
        this.elements.charCount = document.getElementById('char-count');
        this.elements.charCountContainer = document.querySelector('.char-counter');

        // --- Buttons ---
        this.elements.generateButton = document.getElementById('generate-button'); // Standardized ID
        // Note: Separate stop button logic removed, assuming generateButton handles stop action.

        // --- Result Area Elements ---
        this.elements.resultContainer = document.getElementById('result-container');
        this.elements.resultStats = document.getElementById('result-stats');
        this.elements.elapsedTime = document.getElementById('elapsed-time');
        this.elements.totalSteps = document.getElementById('total-steps');
        this.elements.totalTokens = document.getElementById('total-tokens');
        this.elements.resultContent = document.getElementById('result-content'); // Raw content (optional)
        this.elements.resultMarkdown = document.getElementById('result-content-markdown'); // Rendered content
        this.elements.copyResultButton = document.getElementById('copy-result');

        // --- System Info Elements ---
        this.elements.systemInfoContainer = document.getElementById('system-info-container');
        this.elements.systemInfoContent = document.getElementById('system-info-content');
        this.elements.toggleSystemInfoButton = document.getElementById('toggle-system-info');

        // --- Textarea Expand Elements (using config) ---
        this.elements.textareaContainer = document.querySelector(this.config.textareaContainerSelector);
        this.elements.expandButton = document.getElementById(this.config.expandButtonId);

        // --- Initial State ---
        if (this.elements.resultContainer) this.elements.resultContainer.style.display = 'none';
        if (this.elements.promptInput) {
            this.updateCharCountDisplay(this.elements.promptInput.value.length);
        }
        if (this.elements.systemInfoContent) this.elements.systemInfoContent.style.display = 'none'; // Collapse by default
        if (this.elements.toggleSystemInfoButton) this.elements.toggleSystemInfoButton.classList.add('collapsed');
        if (this.elements.resultContent) this.elements.resultContent.style.display = 'none'; // Hide raw content area by default

        // console.log("UI Elements Cached:", this.elements);
    }

    // --- Loading & Error States ---

    showLoading() {
        if (this.elements.loadingEl) this.elements.loadingEl.style.display = 'flex';
        if (this.elements.errorEl) this.elements.errorEl.style.display = 'none';
        if (this.elements.appInfoEl) this.elements.appInfoEl.style.display = 'none';
        if (this.elements.appFormEl) this.elements.appFormEl.style.display = 'none';
    }

    hideLoading() {
        if (this.elements.loadingEl) this.elements.loadingEl.style.display = 'none';
    }

    hideError() {
        if (this.elements.errorEl) this.elements.errorEl.style.display = 'none';
    }

    /**
     * Shows a generic error message for app info loading failures or other setup issues.
     * @param {string} message - The error message to display.
     * @param {boolean} isApiKeyError - Hint if it's an API key related error (future use).
     */
    showError(message, isApiKeyError = false) {
        this.hideLoading();
        if (this.elements.appInfoEl) this.elements.appInfoEl.style.display = 'none';
        if (this.elements.appFormEl) this.elements.appFormEl.style.display = 'none';

        if (this.elements.errorEl && this.elements.errorMessageEl) {
            this.elements.errorEl.style.display = 'flex';
            this.elements.errorMessageEl.textContent = message;
            // TODO: Add button/link to settings if isApiKeyError is true and config provided
        } else {
            console.error("Could not display error, elements not found.");
            alert(message); // Fallback
        }
    }

    /**
     * Displays basic application info.
     * @param {object} appInfo - Object containing app details. Expected keys: name, description, tags (optional array).
     */
    displayAppInfo(appInfo = {}) {
        this.hideLoading();
        this.hideError();

        if (this.elements.appInfoEl && this.elements.appNameEl && this.elements.appDescEl && this.elements.tagsContainer && this.elements.appFormEl) {
            this.elements.appInfoEl.style.display = 'block';
            this.elements.appNameEl.textContent = appInfo.name || this.t('common.appNamePlaceholder', { default: 'AI Application' });
            this.elements.appDescEl.textContent = appInfo.description || this.t('common.appDescPlaceholder', { default: 'Enter details below...' });
            
            // Handle tags
            this.elements.tagsContainer.innerHTML = ''; 
            if (appInfo.tags && Array.isArray(appInfo.tags) && appInfo.tags.length > 0) {
                appInfo.tags.forEach(tag => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'app-tag'; 
                    tagEl.textContent = tag;
                    this.elements.tagsContainer.appendChild(tagEl);
                });
            }
            
            this.elements.appFormEl.style.display = 'block';
        } else {
            console.error("Required app info DOM elements not found.");
        }
    }

    // --- Button State Management (Assumes single #generate-button handles generate/stop) ---

    setRequestingState() {
        if (this.elements.generateButton) {
            const requestingText = this.t('common.button.processing', { default: '处理中...' });
            this.elements.generateButton.innerHTML = `<div class="loading-circle-container"><div class="loading-circle"></div></div> ${requestingText}`;
            this.elements.generateButton.disabled = true;
            this.elements.generateButton.setAttribute('data-action', 'requesting');
        }
    }

    setGeneratingState() {
        if (this.elements.generateButton) {
            this.elements.generateButton.disabled = false; // Enable to allow stopping
            const generatingText = this.t('common.button.generating', { default: '生成中...点击停止' });
            // Ensure class includes 'loading-red' for the generating state specifically
            this.elements.generateButton.innerHTML = `<div class="loading-circle-container"><div class="loading-circle loading-red"></div></div> ${generatingText}`;
            this.elements.generateButton.setAttribute('data-action', 'stop');
        }
    }

    setStoppingState() {
        if (this.elements.generateButton) {
            const stoppingText = this.t('common.stopping', { default: '正在停止...' });
            this.elements.generateButton.innerHTML = stoppingText;
            this.elements.generateButton.disabled = true;
            // Keep data-action as 'stop' or change to 'stopping'? Keep as 'stop' for now.
        }
    }

    /**
     * Resets the generate button to its initial state after generation completes or stops.
     */
    showGenerationCompleted() {
        if (this.elements.generateButton) {
            this.elements.generateButton.disabled = false;
            const buttonText = this.t('common.button.generate', { default: '发送给Dify' });
            this.elements.generateButton.innerHTML = buttonText;
            this.elements.generateButton.setAttribute('data-action', 'generate');
        }
        // Remove lingering cursor from content if markdown rendering adds one
        const cursor = this.elements.resultMarkdown?.querySelector('span.cursor');
        if (cursor) cursor.remove();
    }

    /**
     * Shows a simple message in the button area indicating the stop action was processed.
     * Usually followed by showGenerationCompleted.
     */
    showStopMessage() {
         if (this.elements.generateButton) {
            const stoppedText = this.t('common.stopped', { default: '已停止' });
            this.elements.generateButton.innerHTML = stoppedText;
            this.elements.generateButton.disabled = true; // Temporarily disable after stop
        }
    }

    // --- Result Display ---

    clearResultArea() {
        if (this.elements.resultContainer) this.elements.resultContainer.style.display = 'none';
        if (this.elements.resultStats) this.elements.resultStats.style.display = 'none';
        if (this.elements.resultContent) this.elements.resultContent.innerHTML = ''; // Clear raw (optional)
        if (this.elements.resultMarkdown) {
            this.elements.resultMarkdown.innerHTML = ''; // Clear rendered
            this.elements.resultMarkdown.style.display = 'none';
        }
        if (this.elements.systemInfoContainer) this.elements.systemInfoContainer.style.display = 'none';
        if (this.elements.systemInfoContent) this.elements.systemInfoContent.innerHTML = '';
    }

    showResultContainer() {
        if (this.elements.resultContainer) this.elements.resultContainer.style.display = 'block';
    }

    /**
     * Appends a chunk of text to the result area and triggers Markdown rendering.
     * Assumes the textChunk is valid Markdown or plain text.
     * @param {string} textChunk - The text chunk to append.
     */
    appendStreamContent(textChunk) {
        if (!this.elements.resultContent) {
            console.error("Result content element (#result-content) not found for appending raw content.");
            if (this.elements.resultMarkdown) {
                 this.elements.resultMarkdown.innerHTML = textChunk;
                 this.renderMarkdown();
                 this.elements.resultMarkdown.scrollTop = this.elements.resultMarkdown.scrollHeight;
            }
            return;
        }

        this.showResultContainer();
        this.elements.resultContent.innerHTML += textChunk;
        this.elements.resultContent.scrollTop = this.elements.resultContent.scrollHeight;
    }

    /**
     * Renders the content of the resultMarkdown element using the marked library.
     */
    renderMarkdown() {
        if (!this.elements.resultContent || !this.elements.resultMarkdown || typeof this.marked.parse !== 'function') {
             if (!this.elements.resultContent) console.error("Cannot render markdown: raw source element (#result-content) missing.");
             if (!this.elements.resultMarkdown) console.error("Cannot render markdown: target element (#result-content-markdown) missing.");
             if (typeof this.marked.parse !== 'function') console.error("Cannot render markdown: marked.parse is not available.");
             return;
        }
        try {
            const rawMarkdown = this.elements.resultContent.innerHTML;
            if (!rawMarkdown.trim()) {
                 this.elements.resultMarkdown.style.display = 'none';
                 this.elements.resultContent.style.display = 'none';
                 return;
            }

            const html = this.marked.parse(rawMarkdown, { breaks: true, gfm: true });
            this.elements.resultMarkdown.innerHTML = html;
            
            this.elements.resultMarkdown.style.display = 'block';
            this.elements.resultContent.style.display = 'none';

            this.elements.resultMarkdown.scrollTop = this.elements.resultMarkdown.scrollHeight;

        } catch (error) {
            console.error("Error rendering markdown:", error);
            this.elements.resultContent.style.display = 'block';
            this.elements.resultMarkdown.style.display = 'none';
            this.elements.resultContent.innerHTML += `<hr><p style="color:red;">Markdown rendering error: ${error.message}</p>`;
        }
    }
    
    /**
     * Shows an error message directly within the result area.
     * @param {string} errorMessage 
     */
    showErrorInResult(errorMessage) {
        if (!this.elements.resultMarkdown) return;
        this.showResultContainer();
        this.elements.resultMarkdown.style.display = 'block';
        if (this.elements.resultContent) this.elements.resultContent.style.display = 'none';

        // Use a specific class for errors within the results
        this.elements.resultMarkdown.innerHTML = `<div class="result-error">${errorMessage}</div>`;
    }


    // --- Stats & System Info ---

    /**
     * Displays statistics about the generation task.
     * @param {object} metadata - Object containing stats. Expected keys: elapsed_time, usage.total_tokens, total_steps.
     */
    displayStats(metadata) {
        // console.log("[UI] Displaying stats with metadata:", metadata);
        const failedText = this.t('common.fetchFailed', { default: 'N/A' }); // Use N/A for missing data

        if (!this.elements.resultStats || !metadata) {
            // console.warn("[UI] Cannot display stats: elements or metadata missing.");
            this.showTaskStatsFailed(); // Show failure if no elements or data
            return;
        }

        // CORRECTED: Read latency from usage object, handle missing fields gracefully
        const latency = metadata.usage?.latency;
        const totalTokens = metadata.usage?.total_tokens;
        const totalSteps = metadata.total_steps; // This might be undefined, especially in chat mode

        const elapsedTimeText = typeof latency === 'number' ? `${Number(latency).toFixed(2)}${this.t('common.secondsSuffix', { default: '秒' })}` : failedText;
        const totalTokensText = typeof totalTokens === 'number' ? totalTokens : failedText;
        const totalStepsText = typeof totalSteps === 'number' ? totalSteps : failedText; // Show N/A if steps are undefined

        if (this.elements.elapsedTime) this.elements.elapsedTime.textContent = elapsedTimeText;
        if (this.elements.totalSteps) this.elements.totalSteps.textContent = totalStepsText;
        if (this.elements.totalTokens) this.elements.totalTokens.textContent = totalTokensText;
        
        this.elements.resultStats.style.display = 'flex';
    }

    showTaskStatsFailed() {
        if (this.elements.resultStats) {
            this.elements.resultStats.style.display = 'flex';
            const failedText = this.t('common.fetchFailed', { default: 'N/A' }); // Use N/A
            if (this.elements.elapsedTime) this.elements.elapsedTime.textContent = failedText;
            if (this.elements.totalSteps) this.elements.totalSteps.textContent = failedText;
            if (this.elements.totalTokens) this.elements.totalTokens.textContent = failedText;
        }
    }

    /**
     * Displays structured data (usually JSON) in the system info section.
     * @param {object} data - The data object to display.
     */
    displaySystemInfo(data) {
        if (this.elements.systemInfoContainer && this.elements.systemInfoContent && data) {
            this.elements.systemInfoContainer.style.display = 'block';
            try {
                // Display as formatted JSON
                this.elements.systemInfoContent.innerHTML = `<pre><code>${JSON.stringify(data, null, 2)}</code></pre>`;
            } catch (e) {
                this.elements.systemInfoContent.textContent = this.t('common.errorDisplayingInfo', { default: 'Error displaying system info.' });
            }
        } else {
            if (this.elements.systemInfoContainer) this.elements.systemInfoContainer.style.display = 'none';
            // if (!data) console.warn("[UI] displaySystemInfo called without data.");
        }
    }

    /**
     * Toggles the visibility of the system info content area.
     */
    toggleSystemInfo() {
        const content = this.elements.systemInfoContent;
        const button = this.elements.toggleSystemInfoButton; 
        if (!content || !button) return;

        const isHidden = content.style.display === 'none' || content.offsetHeight === 0;
        if (isHidden) {
            content.style.display = 'block';
            button.classList.remove('collapsed');
            button.title = this.t('common.collapseInfo', { default: '收起系统信息' });
        } else {
            content.style.display = 'none';
            button.classList.add('collapsed');
            button.title = this.t('common.expandInfo', { default: '展开系统信息' });
        }
    }

    // --- Form Handling ---

    /**
     * Handles input events on the primary input element. Updates character count 
     * and enables/disables the generate button based on content and limit.
     * @param {string} value - The current value of the input element.
     */
    handleInput(value) {
        const charCount = value.length;
        this.updateCharCountDisplay(charCount);

        if (this.elements.generateButton) {
            const isDisabled = value.trim().length === 0 || charCount > this.config.charCountLimit;
            // Only disable if the button is currently in the 'generate' state
            if (this.elements.generateButton.getAttribute('data-action') === 'generate') {
                this.elements.generateButton.disabled = isDisabled;
            }
        }
    }

    /**
     * Updates the character count display and adds/removes warning class.
     * @param {number} charCount - The current character count.
     */
    updateCharCountDisplay(charCount) {
        if (this.elements.charCount) this.elements.charCount.textContent = charCount;
        if (this.elements.charCountContainer) {
            this.elements.charCountContainer.classList.toggle('warning', charCount > this.config.charCountLimit);
        }
    }

    /**
     * Shows an error message associated with a specific input field.
     * @param {string} fieldName - Identifier for the field (e.g., 'prompt', 'platform'). Used to find error element if needed.
     * @param {string} message - The error message.
     * @param {HTMLElement} [inputElement=this.elements.promptInput] - The input element itself.
     * @param {HTMLElement} [errorElement=this.elements.inputError] - The element to display the error message in.
     */
    showInputError(fieldName, message, inputElement = this.elements.promptInput, errorElement = this.elements.inputError) {
        let targetInputElement = inputElement;
        let targetErrorElement = errorElement;

        if (fieldName) {
            const potentialErrorEl = document.getElementById(`${fieldName}-error`);
            const potentialInputEl = document.getElementById(`${fieldName}-description`) || document.getElementById(`${fieldName}-name`) || document.getElementById(fieldName); 
            
            if (potentialErrorEl) {
                targetErrorElement = potentialErrorEl;
            }
            if (potentialInputEl) {
                targetInputElement = potentialInputEl;
            }
        }
        
        if (targetErrorElement) {
            targetErrorElement.textContent = message;
            targetErrorElement.style.display = 'block';
        } else {
             console.warn(`[UI] Error element not found for field '${fieldName}' or default.`);
        }
        
        if (targetInputElement) {
            targetInputElement.classList.add('input-error');
        } else {
            console.warn(`[UI] Input element not found for field '${fieldName}' or default.`);
        }
    }

    /**
     * Clears an error message associated with a specific input field.
     * @param {string} fieldName - Identifier for the field.
     * @param {HTMLElement} [inputElement=this.elements.promptInput] - The input element itself.
     * @param {HTMLElement} [errorElement=this.elements.inputError] - The element displaying the error message.
     */
    clearInputError(fieldName, inputElement = this.elements.promptInput, errorElement = this.elements.inputError) {
        let targetInputElement = inputElement;
        let targetErrorElement = errorElement;

        if (fieldName) {
            const potentialErrorEl = document.getElementById(`${fieldName}-error`);
            const potentialInputEl = document.getElementById(`${fieldName}-description`) || document.getElementById(`${fieldName}-name`) || document.getElementById(fieldName); 
            
            if (potentialErrorEl) {
                targetErrorElement = potentialErrorEl;
            }
            if (potentialInputEl) {
                targetInputElement = potentialInputEl;
            }
        }

        if (targetErrorElement) {
            targetErrorElement.textContent = '';
            targetErrorElement.style.display = 'none';
        }
        if (targetInputElement) {
            targetInputElement.classList.remove('input-error');
        }
    }

    /**
     * Clears the primary input field and its associated errors/counts.
     * Does not clear the result area by default.
     * @param {HTMLElement} [inputElement=this.elements.promptInput] - The input element to clear.
     */
    clearForm(inputElement = this.elements.promptInput) {
        if (inputElement) inputElement.value = '';
        this.updateCharCountDisplay(0);
        this.clearInputError('prompt', inputElement, this.elements.inputError); 
    }

    // --- Utility Functions ---

    /**
     * Copies the text content of the rendered markdown result area to the clipboard.
     */
    copyResult() {
        let textToCopy = '';
        if (this.elements.resultMarkdown && this.elements.resultMarkdown.style.display !== 'none') {
             // Get innerText which usually represents visually rendered text better than textContent for Markdown
            textToCopy = this.elements.resultMarkdown.innerText; 
        } else if (this.elements.resultContent) {
            // Fallback to raw content if markdown isn't visible/available
            textToCopy = this.elements.resultContent.textContent;
        }

        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                this.showToast(this.t('common.copied', { default: '已复制!' }), 'success');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                this.showToast(this.t('common.copyFailed', { default: '复制失败' }), 'error');
            });
        } else {
            this.showToast(this.t('common.nothingToCopy', { default: '没有内容可复制' }), 'warning');
        }
    }

    /**
     * Toggles the expanded/collapsed state of the primary textarea container.
     * Assumes specific CSS classes ('textarea-expanded', 'textarea-overlay') and structure.
     */
    toggleTextareaExpand() {
        const container = this.elements.textareaContainer;
        const textarea = this.elements.promptInput; // Assumes primary input is the one expanding
        const button = this.elements.expandButton;
        const overlayId = 'textarea-dynamic-overlay';

        if (!container || !textarea || !button) {
            console.error('Textarea expand required elements not found');
            return;
        }

        const isExpanded = container.classList.contains('textarea-expanded');
        let existingOverlay = document.getElementById(overlayId);

        if (isExpanded) {
            // --- Shrink ---
            container.classList.remove('textarea-expanded');
            // Reset inline styles potentially added during expand (though CSS class should handle most)
            container.style.position = ''; 
            container.style.zIndex = '';

            // Restore textarea size if saved (optional)
            if (textarea.dataset.originalRows) {
                textarea.rows = textarea.dataset.originalRows;
            }

            if (existingOverlay) {
                existingOverlay.remove();
            }

            // Restore expand button icon (replace with actual SVG or icon class toggle)
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7"/></svg>`; // Expand icon
            button.title = this.t('common.expandTextarea', { default: '展开' });

        } else {
            // --- Expand ---
            // Save original rows (optional)
            textarea.dataset.originalRows = textarea.rows;

            // Apply expanded class (CSS should handle fixed positioning, size, z-index)
            container.classList.add('textarea-expanded');

            // Create and add overlay
            if (!existingOverlay) {
                const overlay = document.createElement('div');
                overlay.id = overlayId;
                overlay.className = 'textarea-overlay'; // Style this class in CSS
                overlay.addEventListener('click', () => this.toggleTextareaExpand()); // Click overlay to shrink
                document.body.appendChild(overlay);
            }

            // Update shrink button icon (replace with actual SVG or icon class toggle)
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`; // Shrink icon
             button.title = this.t('common.collapseTextarea', { default: '收起' });

            textarea.focus();
        }
    }

    /**
     * Shows a simple toast notification.
     * @param {string} message - The message to display.
     * @param {'success' | 'error' | 'warning'} type - The type of toast.
     */
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        // Assumes CSS classes like .toast, .toast-success, .show are defined
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Timeout to allow transition
        setTimeout(() => {
            toast.classList.add('show');
        }, 10); // Small delay

        setTimeout(() => {
            toast.classList.remove('show');
            // Remove from DOM after fade out transition completes
            toast.addEventListener('transitionend', () => toast.remove(), { once: true }); 
            // Fallback removal if transitionend doesn't fire
            setTimeout(() => toast.remove(), 500); 
        }, 3000); // Duration toast is visible
    }
}

export default DifyAppUI; 