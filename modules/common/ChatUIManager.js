// modules/common/ChatUIManager.js

// 禁用调试日志
const DEBUG = false;

/**
 * ChatUIManager
 * Manages the DOM elements and interactions for a Dify chat interface.
 */
import { marked } from 'marked'; // Import marked directly if needed globally or pass it

class ChatUIManager {
    /**
     * @param {object} options
     * @param {function} options.t - The i18n translation function.
     * @param {object} [options.markedInstance] - Optional marked library instance. Defaults to global marked if available.
     * @param {object} [options.config] - Optional configuration overrides.
     */
    constructor({ t, markedInstance = null, config = {} }) {
        if (!t) {
            throw new Error("ChatUIManager requires 't' (i18n function) during instantiation.");
        }
        this.t = t;
        // Use provided marked instance or try to use global marked
        this.marked = markedInstance || (typeof marked !== 'undefined' ? marked : null);
        if (!this.marked) {
             console.warn("ChatUIManager: Marked library instance not provided and global 'marked' not found. Markdown rendering will be basic.");
             // Provide a basic fallback parser
              this.marked = {
                  parse: (text) => {
                      // Basic escaping and paragraph wrapping as a minimal fallback
                      const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                      return `<p>${escaped.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
                  }
              };
        }

        this.elements = {}; // To cache DOM elements
        this.config = {
            // Default configuration specific to chat UI
            chatMessagesId: 'chat-messages',
            messageInputId: 'message-input',
            sendButtonId: 'send-button',
            sidebarId: 'sidebar',
            chatHistoryId: 'chat-history',
            charCountId: 'char-count',
            toggleSidebarButtonId: 'toggle-sidebar',
            startNewChatButtonId: 'start-new-chat',
            // Add other relevant IDs/selectors as needed
            ...config
        };

        // Placeholder for tracking the state of messages being streamed
        this.streamingMessages = new Map(); // messageId -> { element: HTMLElement, fullContent: '' }
    }

    /**
     * Caches essential chat UI elements based on standard IDs/selectors.
     * Call this after the DOM is ready.
     * @param {object} configOverrides - Optional overrides for configuration.
     */
    initUserInterface(configOverrides = {}) {
        if (DEBUG) console.log("[ChatUIManager] Initializing elements...");
        this.config = { ...this.config, ...configOverrides };

        this.elements.chatMessagesContainer = document.getElementById(this.config.chatMessagesId);
        this.elements.messageInput = document.getElementById(this.config.messageInputId);
        this.elements.sendButton = document.getElementById(this.config.sendButtonId);
        this.elements.sidebar = document.getElementById(this.config.sidebarId);
        this.elements.chatHistoryList = document.getElementById(this.config.chatHistoryId);
        this.elements.charCount = document.getElementById(this.config.charCountId);
        this.elements.toggleSidebarButton = document.getElementById(this.config.toggleSidebarButtonId);
        this.elements.startNewChatButton = document.getElementById(this.config.startNewChatButtonId);
        // 缓存停止响应按钮和容器
        this.elements.stopRespondingButton = document.getElementById('stop-responding');
        this.elements.stopRespondingContainer = document.getElementById('stop-responding-container');

        // Check for essential elements
        if (!this.elements.chatMessagesContainer) console.error(`[ChatUIManager] Chat messages container element #${this.config.chatMessagesId} not found!`);
        if (!this.elements.messageInput) console.error(`[ChatUIManager] Message input element #${this.config.messageInputId} not found!`);
        if (!this.elements.sendButton) console.error(`[ChatUIManager] Send button element #${this.config.sendButtonId} not found!`);
        // Add checks for other critical elements if needed

        // Initial state setup
        if (this.elements.messageInput && this.elements.sendButton) {
             this.updateSendButtonState(); // Set initial button state based on input
        }
         if (this.elements.sidebar && localStorage.getItem('sidebar-collapsed') === 'true') {
             this.elements.sidebar.classList.add('collapsed');
         } else if (this.elements.sidebar) {
              this.elements.sidebar.classList.remove('collapsed'); // Ensure default is expanded
         }

        if (DEBUG) console.log("[ChatUIManager] Elements cached:", this.elements);
    }

    // --- App Info & General Error Display (Added for BaseDifyApp compatibility) ---

    /**
     * Displays basic application info in the dedicated info section.
     * Required by BaseDifyApp.
     * @param {object} appInfo - Object containing app details. Expected keys: name, description, tags (optional array).
     */
    displayAppInfo(appInfo = {}) {
        // Cache these elements if not already done, or re-select
        const appInfoEl = this.elements.appInfoEl || document.getElementById('app-info');
        const appNameEl = this.elements.appNameEl || document.getElementById('app-name');
        const appDescEl = this.elements.appDescEl || document.getElementById('app-description');
        const tagsContainer = this.elements.tagsContainer || document.getElementById('app-tags');
        const appFormEl = this.elements.appFormEl || document.getElementById('app-form'); // Assuming app form exists

        if (appInfoEl && appNameEl && appDescEl && tagsContainer) {
            // Store in elements cache if found dynamically
            if (!this.elements.appInfoEl) this.elements.appInfoEl = appInfoEl;
            if (!this.elements.appNameEl) this.elements.appNameEl = appNameEl;
            if (!this.elements.appDescEl) this.elements.appDescEl = appDescEl;
            if (!this.elements.tagsContainer) this.elements.tagsContainer = tagsContainer;
            if (appFormEl && !this.elements.appFormEl) this.elements.appFormEl = appFormEl;


            appInfoEl.style.display = 'block'; // Make sure the container is visible
            appNameEl.textContent = appInfo.name || this.t('common.appNamePlaceholder', { default: 'AI Chat Application' });
            appDescEl.textContent = appInfo.description || this.t('common.appDescPlaceholder', { default: 'Start chatting below...' });

            // Handle tags
            tagsContainer.innerHTML = '';
            if (appInfo.tags && Array.isArray(appInfo.tags) && appInfo.tags.length > 0) {
                appInfo.tags.forEach(tag => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'app-tag';
                    tagEl.textContent = tag;
                    tagsContainer.appendChild(tagEl);
                });
            }
            if (appFormEl) appFormEl.style.display = 'block'; // Show form if app info displayed

        } else {
            console.error("[ChatUIManager] Required app info DOM elements (app-info, app-name, app-description, app-tags) not found.");
        }
        // Hide loading/general error elements if they exist (might be managed by BaseDifyApp too)
        const loadingEl = document.getElementById('app-info-loading');
        const errorEl = document.getElementById('app-info-error');
        if(loadingEl) loadingEl.style.display = 'none';
        if(errorEl) errorEl.style.display = 'none';
    }

    /**
     * Shows a generic error message (e.g., during initialization).
     * Required by BaseDifyApp.
     * Uses a toast notification by default.
     * @param {string} message - The error message to display.
     * @param {boolean} isApiKeyError - Hint if it's an API key related error (currently unused here).
     */
    showError(message, isApiKeyError = false) {
        console.error(`[ChatUIManager] Generic Error Displayed: ${message}`);
        this.showToast(message, 'error');
        // Optionally hide the main app form on generic error
        const appFormEl = this.elements.appFormEl || document.getElementById('app-form');
        if (appFormEl) appFormEl.style.display = 'none';

         // Hide loading/app info if they exist
        const loadingEl = document.getElementById('app-info-loading');
        const appInfoEl = document.getElementById('app-info');
        if(loadingEl) loadingEl.style.display = 'none';
        if(appInfoEl) appInfoEl.style.display = 'none';
    }

    // --- Message Display ---

    /**
     * Adds a message bubble to the chat interface.
     * @param {'user' | 'assistant' | 'system'} role - The role of the message sender.
     * @param {string} content - The initial content (can be HTML or Markdown string).
     * @param {string} [messageId] - A unique ID for this message, especially for assistant messages to be updated later.
     * @param {'pending' | 'streaming' | 'complete' | 'error'} [status='complete'] - The initial status of the message.
     * @returns {HTMLElement | null} The created message element or null if container not found.
     */
    addMessage(role, content, messageId, status = 'complete') {
        if (!this.elements.chatMessagesContainer) {
             console.error("[ChatUIManager] Cannot add message, container not found.");
             return null;
        }
        // if (DEBUG) console.log(`[ChatUIManager] Adding message: role=${role}, messageId=${messageId}, status=${status}`);

        const messageWrapper = document.createElement('div');
        const roleClass = role === 'assistant' ? 'bot-message' : `${role}-message`;
        messageWrapper.classList.add('message-wrapper', roleClass);
        // --- DEBUGGING LOG ---
        if (DEBUG) console.log(`[ChatUIManager] Adding messageWrapper with classes:`, messageWrapper.classList);
        // --- END DEBUGGING LOG ---
        if (messageId) messageWrapper.dataset.messageId = messageId;
        messageWrapper.dataset.status = status;

        const avatarWrapper = document.createElement('div');
        const avatarClass = role === 'assistant' ? 'bot-avatar' : `${role}-avatar`;
        avatarWrapper.classList.add('message-avatar', avatarClass);
        const avatarImg = document.createElement('img');
        // TODO: Make avatar URLs configurable?
        avatarImg.src = role === 'user' ? '/assets/icons/user-avatar.svg' : '/assets/icons/robot-avatar.svg';
        avatarImg.alt = `${role} Avatar`;
        avatarWrapper.appendChild(avatarImg);

        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('message-content-wrapper');

        const contentBubble = document.createElement('div');
        contentBubble.classList.add('message-content');
        // Render initial content (assume it's safe HTML/Markdown)
        contentBubble.innerHTML = this.marked.parse(content || '', { breaks: true, gfm: true });

        const actionsWrapper = document.createElement('div');
        actionsWrapper.classList.add('message-actions');

         // Add thinking indicator for pending/streaming assistant messages
        if (role === 'assistant' && (status === 'pending' || status === 'streaming')) {
            const thinkingIndicator = document.createElement('div');
            thinkingIndicator.classList.add('thinking-indicator');
             thinkingIndicator.innerHTML = '<span>.</span><span>.</span><span>.</span>'; // TODO: Move style to CSS
            contentBubble.appendChild(thinkingIndicator);
         } else if (role === 'assistant' && status === 'complete') {
              // Add actions only if complete initially (will be added in finalizeMessage otherwise)
              this._addMessageActions(actionsWrapper, messageId);
         } else if (status === 'error') {
              contentBubble.classList.add('text-error'); // Add error styling
         }

        contentWrapper.appendChild(contentBubble);

        messageWrapper.appendChild(avatarWrapper);
        messageWrapper.appendChild(contentWrapper);
        messageWrapper.appendChild(actionsWrapper);

        this.elements.chatMessagesContainer.appendChild(messageWrapper);
        this.scrollToBottom();

        // Store for streaming updates if starting in pending/streaming state
        if (role === 'assistant' && messageId && (status === 'pending' || status === 'streaming')) {
            this.streamingMessages.set(messageId, { element: messageWrapper, fullContent: content || '' });
        }

        return messageWrapper;
    }

    /**
     * Sets the visual state of a specific message bubble.
     * @param {string} messageId - The ID of the message to update.
     * @param {'pending' | 'streaming' | 'complete' | 'error' | 'regenerating'} state - The new visual state.
     */
    setMessageState(messageId, state) {
        const messageElement = this.elements.chatMessagesContainer?.querySelector(`.message-wrapper[data-message-id="${messageId}"]`);
        if (!messageElement) {
            console.warn(`[ChatUIManager] setMessageState: Element for Message ID ${messageId} not found.`);
            return;
        }

        // if (DEBUG) console.log(`[ChatUIManager] Setting state for ${messageId} to: ${state}`);
        messageElement.dataset.status = state; // Update the status dataset attribute

        const contentBubble = messageElement.querySelector('.message-content');
        const actionsWrapper = messageElement.querySelector('.message-actions');
        let thinkingIndicator = contentBubble?.querySelector('.thinking-indicator');

        // Remove existing indicators first
        if (thinkingIndicator) thinkingIndicator.remove();

        switch (state) {
            case 'regenerating':
                if (contentBubble) {
                     // Clear existing content before showing indicator
                     contentBubble.innerHTML = ''; 
                     thinkingIndicator = document.createElement('div');
                     thinkingIndicator.classList.add('thinking-indicator');
                     thinkingIndicator.innerHTML = '<span>.</span><span>.</span><span>.</span>';
                     contentBubble.appendChild(thinkingIndicator);
                }
                if (actionsWrapper) {
                     actionsWrapper.querySelectorAll('button').forEach(btn => btn.disabled = true);
                }
                // --- ADD TO STREAMING MAP --- 
                this.streamingMessages.set(messageId, { element: messageElement, fullContent: '' });
                // --- END ADD --- 
                break;
            case 'streaming': 
            case 'pending': 
                 if (actionsWrapper) { // Ensure buttons are disabled
                     actionsWrapper.querySelectorAll('button').forEach(btn => btn.disabled = true);
                 }
                 // Add thinking indicator if not already present (e.g., for pending)
                 if (!thinkingIndicator && contentBubble && state === 'pending') {
                    thinkingIndicator = document.createElement('div');
                    thinkingIndicator.classList.add('thinking-indicator');
                    thinkingIndicator.innerHTML = '<span>.</span><span>.</span><span>.</span>';
                    contentBubble.appendChild(thinkingIndicator);
                 }
                break;
            case 'complete':
                if (actionsWrapper) {
                     actionsWrapper.querySelectorAll('button').forEach(btn => btn.disabled = false);
                }
                break;
            case 'error':
                 if (actionsWrapper) {
                     actionsWrapper.innerHTML = ''; // Clear actions on error
                 }
                break;
            default:
                console.warn(`[ChatUIManager] Unknown message state: ${state}`);
        }
    }

    /**
     * Updates the content of a specific assistant message during streaming.
     * @param {string} messageId - The ID of the message to update.
     * @param {string} chunk - The new chunk of content to append.
     */
    updateMessageStream(messageId, chunk) {
        const messageData = this.streamingMessages.get(messageId);
        if (!messageData) {
             console.warn(`[ChatUIManager] updateMessageStream: Message ID ${messageId} not found in streaming map.`);
             return;
        }

        const { element } = messageData;
        // --- Call setMessageState --- // No need to call here if called in callback
        // if (element.dataset.status !== 'streaming') { // Only set state on first chunk visually
        //     this.setMessageState(messageId, 'streaming'); 
        // }
        // --- End Call ---

        const contentBubble = element.querySelector('.message-content');
        if (!contentBubble) return;

        // Remove thinking indicator if streaming starts (done by setMessageState('streaming') or implicitly)
        const thinkingIndicator = contentBubble.querySelector('.thinking-indicator');
        if (thinkingIndicator) thinkingIndicator.remove();

        messageData.fullContent += chunk;
        
        try {
            // Render incrementally - 确保使用marked而不是直接插入HTML
            if (this.marked && typeof this.marked.parse === 'function') {
                contentBubble.innerHTML = this.marked.parse(messageData.fullContent, { breaks: true, gfm: true });
            } else {
                // 后备：至少进行基本的HTML转义和换行处理
                contentBubble.innerText = messageData.fullContent;
            }
        } catch (error) {
            console.error("Markdown parsing error:", error);
            // 出错时至少显示纯文本
            contentBubble.innerText = messageData.fullContent;
        }

        this.scrollToBottom(true); // Conditional scroll
    }

    /**
     * Finalizes an assistant message after streaming. Updates status, renders final content, adds actions.
     * @param {string} messageId - The ID of the message element to find and finalize.
     * @param {object} [metadata] - Optional metadata (e.g., usage, elapsed time, message_id from server).
     */
    finalizeMessage(messageId, metadata = {}) {
        // Use the initially provided messageId to find the element
        const messageElement = this.elements.chatMessagesContainer?.querySelector(`.message-wrapper[data-message-id="${messageId}"]`);
        const messageData = this.streamingMessages.get(messageId);

        if (!messageElement) {
             console.warn(`[ChatUIManager] finalizeMessage: Element for initial Message ID ${messageId} not found.`);
             return;
        }

        // 确保停止响应按钮隐藏
        this.toggleStopRespondingButton(false);

        // Determine the final message ID (server-provided or original)
        const finalMessageId = (metadata && metadata.message_id) ? metadata.message_id : messageId;
        
        // Update element's dataset ID if it changed
        if (finalMessageId !== messageId) {
            if (DEBUG) console.log(`[ChatUIManager] Updating message element dataset ID from ${messageId} to ${finalMessageId}`);
            messageElement.dataset.messageId = finalMessageId;
        }

        // Set final state using the final ID
        this.setMessageState(finalMessageId, 'complete');

        const contentBubble = messageElement.querySelector('.message-content');
        const actionsWrapper = messageElement.querySelector('.message-actions');

        // Final render of full content
        if (contentBubble && messageData) {
            try {
                // 确保使用marked渲染Markdown
                if (this.marked && typeof this.marked.parse === 'function') {
                    contentBubble.innerHTML = this.marked.parse(messageData.fullContent || '', { breaks: true, gfm: true });
                } else {
                    // 后备：至少进行基本的HTML转义和换行处理
                    contentBubble.innerText = messageData.fullContent || '';
                }
            } catch (error) {
                console.error("Markdown parsing error:", error);
                // 出错时至少显示纯文本
                contentBubble.innerText = messageData.fullContent || '';
            }
        } else if (contentBubble && !messageData && contentBubble.textContent) {
             // If called on a non-streamed message, re-render existing content
             try {
                  // 使用marked而不是直接操作innerHTML
                  if (this.marked && typeof this.marked.parse === 'function') {
                      // 获取内容的纯文本，避免HTML转义问题
                      const originalText = contentBubble.textContent || '';
                      contentBubble.innerHTML = this.marked.parse(originalText, { breaks: true, gfm: true });
                  }
             } catch (e) { 
                 console.error("Markdown error on finalize:", e);
                 // 出错时保留原始内容
             }
        }

        // Add/Update actions using the final ID
        if (actionsWrapper) {
             this._addMessageActions(actionsWrapper, finalMessageId, metadata);
        }

        // Clean up from streaming map using the original ID
        if (this.streamingMessages.has(messageId)) {
            this.streamingMessages.delete(messageId);
        }
    }

    /**
     * Helper to populate the message actions container.
     * @param {HTMLElement} actionsWrapper - The container element for actions.
     * @param {string} messageId - The final ID of the related message.
     * @param {object} [metadata] - Optional metadata.
     */
    _addMessageActions(actionsWrapper, messageId, metadata = {}) {
        // Check for opening message
        const messageElement = actionsWrapper.closest('.message-wrapper'); 
        if (messageElement?.dataset?.messageType === 'opening') {
            actionsWrapper.innerHTML = ''; 
            return; 
        }

        actionsWrapper.innerHTML = ''; // Clear previous actions

        // --- Create containers --- 
        const statsContainer = document.createElement('div');
        statsContainer.className = 'message-actions-stats';

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'message-actions-buttons';
        // --- End Create containers ---

        // --- Populate Stats Container --- 
        let hasStats = false;
        if (metadata && metadata.usage && metadata.usage.total_tokens) {
            const statsSpan = document.createElement('span');
            statsSpan.className = 'message-stat tokens'; 
            statsSpan.textContent = `Tokens: ${metadata.usage.total_tokens}`;
            statsSpan.title = `Prompt: ${metadata.usage.prompt_tokens || 'N/A'}, Completion: ${metadata.usage.completion_tokens || 'N/A'}`;
            statsContainer.appendChild(statsSpan);
            hasStats = true;
        }
        if (metadata && metadata.usage && typeof metadata.usage.latency === 'number') { 
             const latency = metadata.usage.latency;
             const timeSpan = document.createElement('span');
             timeSpan.className = 'message-stat time'; 
             const timeLabel = this.t('chat.elapsedTimeLabel', { default: '耗时:' });
             timeSpan.textContent = `${timeLabel} ${latency.toFixed(1)}s`; 
             statsContainer.appendChild(timeSpan);
             hasStats = true;
        }
        // --- End Populate Stats --- 

        // --- Populate Buttons Container --- 
        const thumbsUpSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M14.5998 8.00033H21C22.1046 8.00033 23 8.89576 23 10.0003V12.1047C23 12.3659 22.9488 12.6246 22.8494 12.8662L19.755 20.3811C19.6007 20.7558 19.2355 21.0003 18.8303 21.0003H2C1.44772 21.0003 1 20.5526 1 20.0003V10.0003C1 9.44804 1.44772 9.00033 2 9.00033H5.48184C5.80677 9.00033 6.11143 8.84246 6.29881 8.57701L11.7522 0.851355C11.8947 0.649486 12.1633 0.581978 12.3843 0.692483L14.1984 1.59951C15.25 2.12534 15.7931 3.31292 15.5031 4.45235L14.5998 8.00033ZM7 10.5878V19.0003H18.1606L21 12.1047V10.0003H14.5998C13.2951 10.0003 12.3398 8.77128 12.6616 7.50691L13.5649 3.95894C13.6229 3.73105 13.5143 3.49353 13.3039 3.38837L12.6428 3.0578L7.93275 9.73038C7.68285 10.0844 7.36341 10.3746 7 10.5878ZM5 11.0003H3V19.0003H5V11.0003Z"></path></svg>';
        const thumbsDownSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M9.40017 16H3C1.89543 16 1 15.1046 1 14V11.8957C1 11.6344 1.05118 11.3757 1.15064 11.1342L4.24501 3.61925C4.3993 3.24455 4.76447 3 5.16969 3H22C22.5523 3 23 3.44772 23 4V14C23 14.5523 22.5523 15 22 15H18.5182C18.1932 15 17.8886 15.1579 17.7012 15.4233L12.2478 23.149C12.1053 23.3508 11.8367 23.4184 11.6157 23.3078L9.80163 22.4008C8.74998 21.875 8.20687 20.6874 8.49694 19.548L9.40017 16ZM17 13.4125V5H5.83939L3 11.8957V14H9.40017C10.7049 14 11.6602 15.229 11.3384 16.4934L10.4351 20.0414C10.3771 20.2693 10.4857 20.5068 10.6961 20.612L11.3572 20.9425L16.0673 14.27C16.3172 13.9159 16.6366 13.6257 17 13.4125ZM19 13H21V5H19V13Z"></path></svg>';
        const copySvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        const regenerateSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M22 12C22 17.5228 17.5229 22 12 22C6.4772 22 2 17.5228 2 12C2 6.47715 6.4772 2 12 2V4C7.5817 4 4 7.58172 4 12C4 16.4183 7.5817 20 12 20C16.4183 20 20 16.4183 20 12C20 9.25022 18.6127 6.82447 16.4998 5.38451L16.5 8H14.5V2L20.5 2V4L18.0008 3.99989C20.4293 5.82434 22 8.72873 22 12Z"></path></svg>';

        const regenerateButton = document.createElement('button');
        regenerateButton.className = 'btn-icon regenerate-btn';
        regenerateButton.innerHTML = regenerateSvg; 
        regenerateButton.title = this.t('chat.regenerate', { default: 'Regenerate' });
        regenerateButton.dataset.messageId = messageId;
        regenerateButton.dataset.action = 'regenerate';
        buttonsContainer.appendChild(regenerateButton);

        const likeButton = document.createElement('button');
        likeButton.className = 'btn-icon feedback-btn thumbs-up';
        likeButton.innerHTML = thumbsUpSvg;
        likeButton.title = this.t('chat.like', { default: 'Like' });
        likeButton.dataset.messageId = messageId;
        likeButton.dataset.rating = 'like';
        buttonsContainer.appendChild(likeButton);

        const dislikeButton = document.createElement('button');
        dislikeButton.className = 'btn-icon feedback-btn thumbs-down';
        dislikeButton.innerHTML = thumbsDownSvg;
        dislikeButton.title = this.t('chat.dislike', { default: 'Dislike' });
        dislikeButton.dataset.messageId = messageId;
        dislikeButton.dataset.rating = 'dislike';
        buttonsContainer.appendChild(dislikeButton);

        const copyButton = document.createElement('button');
        copyButton.className = 'btn-icon copy-message-btn';
        copyButton.innerHTML = copySvg;
        copyButton.title = this.t('chat.copy', { default: 'Copy' });
        copyButton.addEventListener('click', (e) => {
             e.stopPropagation(); 
             this.copyMessageContent(messageId);
        });
        buttonsContainer.appendChild(copyButton);
        // --- End Populate Buttons --- 

        // --- Append containers to wrapper --- 
        if (hasStats) {
            actionsWrapper.appendChild(statsContainer);
        }
        actionsWrapper.appendChild(buttonsContainer);
        // --- End Append --- 
    }

    /**
     * Displays an error message within the chat stream or associated with a message.
     * @param {string} message - The error message.
     * @param {string} [messageId] - Optional ID of the message where the error occurred.
     */
    showErrorInChat(message, messageId) {
        console.error(`[ChatUIManager] Error: ${message}` + (messageId ? ` (related to message ${messageId})` : ''));
        
        // 确保停止响应按钮隐藏
        this.toggleStopRespondingButton(false);
        
        if (messageId) {
            // const messageData = this.streamingMessages.get(messageId);
            const messageElement = this.elements.chatMessagesContainer?.querySelector(`.message-wrapper[data-message-id="${messageId}"]`);
            if (messageElement) {
                // --- Call setMessageState ---
                this.setMessageState(messageId, 'error');
                // --- End Call ---
                const contentBubble = messageElement.querySelector('.message-content');
                 if (contentBubble) {
                      // Remove thinking indicator if present (done by setMessageState)
                      // Append error message
                      const errorP = document.createElement('p');
                      errorP.className = 'text-error'; // Style this class
                      errorP.textContent = `⚠️ ${message}`;
                      // Append error below any existing content (or replace? Replace might be better)
                      // contentBubble.innerHTML = ''; // Optional: Clear existing content on error
                      contentBubble.appendChild(errorP);
                 }
                 // Clear actions (done by setMessageState)

                // Clean up streaming map if error occurs mid-stream
                if (this.streamingMessages.has(messageId)) {
                    this.streamingMessages.delete(messageId);
                }
                 this.scrollToBottom();
                 return;
            }
        }
        // If no specific message context, add a system error message
        this.addMessage('system', `⚠️ Error: ${message}`, `error-${Date.now()}`, 'error');
    }

    /** Clears all messages from the chat area. */
    clearChatArea() {
        if (this.elements.chatMessagesContainer) {
            this.elements.chatMessagesContainer.innerHTML = '';
        }
        this.streamingMessages.clear();
    }

    // --- Input Area ---

    /**
     * Handles input events on the message input textarea.
     * Updates character count and send button state.
     * Also handles auto-resizing the textarea.
     * Required by BaseDifyApp's event binding.
     */
    handleInput() {
        const inputElement = this.elements.messageInput;
        if (!inputElement) return;

        const value = inputElement.value;
        const charCount = value.length;
        const charLimit = 4000; // Define the limit

        // Update Char Count
        if (this.elements.charCount) {
            this.elements.charCount.textContent = `${charCount}/${charLimit}`;
            // --- FIX: Uncomment and use the defined limit ---
            this.elements.charCount.classList.toggle('warning', charCount > charLimit);
            // --- END FIX ---
        }

        // Update Send Button State
        this.updateSendButtonState(); // Pass limit or recalculate inside

        // Auto-resize Textarea
        inputElement.style.height = 'auto'; // Reset height first to get correct scrollHeight
        const scrollHeight = inputElement.scrollHeight;
        const maxHeight = 150; // Example max height in pixels
        const newHeight = Math.min(scrollHeight, maxHeight);
        inputElement.style.height = newHeight + 'px';
    }

    getInputText() {
        return this.elements.messageInput?.value || '';
    }

    clearInputText() {
        if (this.elements.messageInput) {
            this.elements.messageInput.value = '';
            this.elements.messageInput.style.height = 'auto'; // Reset height
            this.elements.messageInput.dispatchEvent(new Event('input', { bubbles: true })); // Trigger state update
        }
    }

    /** Updates the state (disabled/enabled) of the send button based on input content and potentially app state. */
    updateSendButtonState() {
        if (this.elements.messageInput && this.elements.sendButton) {
            const hasText = this.elements.messageInput.value.trim().length > 0;
            const isProcessing = this.elements.sendButton.dataset.state === 'thinking' || this.elements.sendButton.dataset.state === 'streaming';
            // --- FIX: Add character limit check ---
            const charCount = this.elements.messageInput.value.length;
            const charLimit = 4000; // Ensure this matches the limit used in handleInput
            const exceedsLimit = charCount > charLimit;
            this.elements.sendButton.disabled = !hasText || isProcessing || exceedsLimit;
            // --- END FIX ---
        }
    }

    /**
     * Sets the visual state and disabled status of the send button.
     * @param {'idle' | 'thinking' | 'streaming' | 'disabled'} state
     */
    setSendButtonState(state) {
        if (!this.elements.sendButton) return;

        this.elements.sendButton.dataset.state = state;
        const originalIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z"/></svg>`;
        const loadingIndicatorHtml = `<div class="loading-circle-container small"><div class="loading-circle"></div></div>`; // Use specific class

        switch (state) {
            case 'thinking':
                 this.elements.sendButton.disabled = true;
                 this.elements.sendButton.innerHTML = loadingIndicatorHtml;
                 // 显示停止按钮
                 this.toggleStopRespondingButton(true);
                break;
            case 'streaming':
                  this.elements.sendButton.disabled = true; // Keep disabled during streaming
                  // Optionally change indicator? For now, keep the loading one.
                  this.elements.sendButton.innerHTML = loadingIndicatorHtml;
                  // 显示停止按钮
                  this.toggleStopRespondingButton(true);
                 break;
            case 'disabled': // Explicitly disabled state
                 this.elements.sendButton.disabled = true;
                 this.elements.sendButton.innerHTML = originalIconSvg;
                 // 隐藏停止按钮
                 this.toggleStopRespondingButton(false);
                break;
            case 'idle':
            default:
                 // --- FIX: Don't re-evaluate disabled state here. Restore icon and call the central state updater. ---
                 // this.elements.sendButton.disabled = !(this.elements.messageInput?.value.trim().length > 0);
                 this.elements.sendButton.innerHTML = originalIconSvg;
                 this.updateSendButtonState(); // Call the main function to set the correct disabled state based on all criteria
                 // --- END FIX ---
                 // 隐藏停止按钮
                 this.toggleStopRespondingButton(false);
                break;
        }
    }

    // --- Sidebar & History ---

    /**
     * Updates the chat history list in the sidebar.
     * @param {Array<object>} conversations - Array of conversation objects (e.g., { id: string, name: string, last_message_time?: number }).
     */
    updateHistoryList(conversations = []) {
        if (!this.elements.chatHistoryList) {
            console.error("[ChatUIManager] 无法更新历史记录列表：缺少容器元素");
            return;
        }
        
        if (!Array.isArray(conversations) || conversations.length === 0) {
            if (DEBUG) console.log("[ChatUIManager] 没有历史对话可显示");
            this.elements.chatHistoryList.innerHTML = `
                <div class="empty-history-message">
                    <p>${this.t('chat.noConversations', {default: '没有历史对话'})}</p>
                </div>
            `;
            return;
        }
        
        // 清空当前列表
        this.elements.chatHistoryList.innerHTML = '';

        // 为每个对话创建列表项
        conversations.forEach(conversation => {
            const listItem = document.createElement('div');
            listItem.className = 'history-item';
            listItem.dataset.id = conversation.id;
            
            // 添加标题
            const titleSpan = document.createElement('span');
            titleSpan.className = 'history-title';
            titleSpan.textContent = conversation.title || '无标题对话';
            
            // 添加删除和重命名按钮容器
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'history-actions';
            
            // 添加重命名按钮
            const renameButton = document.createElement('button');
            renameButton.className = 'btn-icon rename-btn';
            renameButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
            renameButton.dataset.action = 'rename';
            renameButton.title = this.t('chat.rename', {default: '重命名'});
            
            // 添加删除按钮
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn-icon delete-btn';
            deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
            deleteButton.dataset.action = 'delete';
            deleteButton.title = this.t('chat.delete', {default: '删除'});
            
            // 添加按钮到操作容器
            actionsDiv.appendChild(renameButton);
            actionsDiv.appendChild(deleteButton);
            
            // 组装列表项
            listItem.appendChild(titleSpan);
            listItem.appendChild(actionsDiv);
            
            // 添加到历史记录列表
            this.elements.chatHistoryList.appendChild(listItem);
        });
    }

    /**
     * Sets the specified conversation item in the history list as active.
     * @param {string | null} conversationId - The ID of the conversation to activate, or null to deactivate all.
     */
    setActiveHistoryItem(conversationId) {
        if (!this.elements.chatHistoryList) return;
        const items = this.elements.chatHistoryList.querySelectorAll('.history-item');
        items.forEach(item => {
            item.classList.toggle('active', item.dataset.id === conversationId);
        });
    }

    /** Toggles the collapsed state of the sidebar and saves state. */
    toggleSidebar() {
        if (this.elements.sidebar) {
             const isCollapsed = this.elements.sidebar.classList.toggle('collapsed');
             localStorage.setItem('sidebar-collapsed', isCollapsed);
             // Optionally adjust toggle button icon/tooltip
             // const toggleButton = this.elements.toggleSidebarButton;
             // if (toggleButton) { toggleButton.title = isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'; }
        }
    }

    // --- Suggested Questions ---

    /**
     * Displays suggested questions, typically below an assistant message.
     * @param {string} targetMessageId - The ID of the message these suggestions relate to.
     * @param {Array<string>} questions - An array of suggested question strings.
     */
    displaySuggestedQuestions(targetMessageId, questions = []) {
        if (!questions || questions.length === 0 || !this.elements.chatMessagesContainer) return;
        if (DEBUG) console.log(`[ChatUIManager] displaySuggestedQuestions called for targetMessageId: ${targetMessageId}, with questions:`, questions); // Added DEBUG log

        const targetMessageElement = this.elements.chatMessagesContainer.querySelector(`.message-wrapper[data-message-id="${targetMessageId}"]`);
        if (!targetMessageElement) {
             console.warn(`[ChatUIManager] Cannot display suggestions: target message ${targetMessageId} not found.`);
             return;
        }

        // Ensure it targets bot messages only
        if (!targetMessageElement.classList.contains('bot-message')) {
            if (DEBUG) console.log(`[ChatUIManager] Skipping suggestions: target message ${targetMessageId} is not a bot message.`); // Added DEBUG log
            return;
        }

        // --- FIX: Remove existing suggestion containers first --- 
        const existingSuggestions = this.elements.chatMessagesContainer.querySelectorAll('.suggested-questions');
        existingSuggestions.forEach(el => el.remove());
        // --- END FIX ---

        // --- FIX: Create container and insert AFTER the target message --- 
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'suggested-questions';
        suggestionsContainer.dataset.targetMessageId = targetMessageId; // Add data attribute

        // Insert after the target message element in the main chat container
        targetMessageElement.after(suggestionsContainer); 
        // --- END FIX ---

        // Populate the container (title and buttons)
        suggestionsContainer.innerHTML = ''; // Ensure it's empty before populating

        const titleElement = document.createElement('div');
        titleElement.className = 'suggested-questions-title';
        titleElement.textContent = this.t('chat.tryToAsk', { default: 'TRY TO ASK' }).toUpperCase(); 
        suggestionsContainer.appendChild(titleElement);
        
        const buttonsWrapper = document.createElement('div');
        buttonsWrapper.className = 'suggested-buttons-wrapper';
        suggestionsContainer.appendChild(buttonsWrapper);

        questions.forEach(q => {
            const button = document.createElement('button');
            button.className = 'btn suggested-question-btn'; 
            button.textContent = q;
            button.dataset.question = q;
            buttonsWrapper.appendChild(button);
        });
        this.scrollToBottom(true); 
    }

    // --- Utility ---

    /**
     * Scrolls the chat messages container to the bottom.
     * @param {boolean} [conditional=false] - If true, only scroll if user is already near the bottom.
     */
    scrollToBottom(conditional = false) {
        if (this.elements.chatMessagesContainer) {
            const el = this.elements.chatMessagesContainer;
             const threshold = 100; // Pixels from bottom
              // Check if the element is actually scrollable
             const isScrollable = el.scrollHeight > el.clientHeight;
             if (!isScrollable) return; // No need to scroll if content doesn't overflow

             const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

             if (!conditional || isNearBottom) {
                 // Use smooth scrolling for better UX
                 el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
             }
        }
    }

     /**
      * Copies the text content of a specific message to the clipboard.
      * @param {string} messageId - The ID of the message to copy.
      */
     copyMessageContent(messageId) {
         const messageElement = this.elements.chatMessagesContainer?.querySelector(`.message-wrapper[data-message-id="${messageId}"]`);
         const contentBubble = messageElement?.querySelector('.message-content');
         if (contentBubble) {
             // Try to get text representation, preferring innerText for visual layout
             const textToCopy = contentBubble.innerText || contentBubble.textContent || '';
             if (textToCopy.trim()) {
                 navigator.clipboard.writeText(textToCopy.trim()).then(() => {
                     this.showToast(this.t('common.copied', { default: '已复制!' }), 'success');
                 }).catch(err => {
                     console.error('[ChatUIManager] Failed to copy message: ', err);
                     this.showToast(this.t('common.copyFailed', { default: '复制失败' }), 'error');
                 });
             } else {
                  this.showToast(this.t('common.nothingToCopy', { default: '没有内容可复制' }), 'warning');
             }
         } else {
             console.warn(`[ChatUIManager] Could not find content bubble for message ID: ${messageId} to copy.`);
              this.showToast(this.t('common.copyFailed', { default: '复制失败' }), 'error');
         }
     }

     /**
      * Shows a simple toast notification. Creates container if it doesn't exist.
      * @param {string} message - The message to display.
      * @param {'success' | 'error' | 'warning' | 'info'} type - The type of toast.
      */
     showToast(message, type = 'info') {
         const toastContainerId = 'toast-container';
         let toastContainer = document.getElementById(toastContainerId);
         if (!toastContainer) {
             toastContainer = document.createElement('div');
             toastContainer.id = toastContainerId;
              // Style the container (position fixed, top right, z-index etc.)
              Object.assign(toastContainer.style, {
                 position: 'fixed',
                 top: '20px',
                 right: '20px',
                 zIndex: '1050', // Ensure it's above most elements
                 display: 'flex',
                 flexDirection: 'column',
                 gap: '10px'
             });
             document.body.appendChild(toastContainer);
         }

         const toast = document.createElement('div');
          // Basic toast styling (can be moved to CSS)
          Object.assign(toast.style, {
              padding: '10px 20px',
              borderRadius: '4px',
              color: '#fff',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              opacity: '0',
              transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
              transform: 'translateY(-20px)',
              maxWidth: '300px',
              wordWrap: 'break-word'
          });
          toast.classList.add('toast'); // Add class for general styling if needed

         // Type-specific styling
          switch (type) {
              case 'success': toast.style.backgroundColor = 'var(--green-600, #16a34a)'; break;
              case 'error': toast.style.backgroundColor = 'var(--red-600, #dc2626)'; break;
              case 'warning': toast.style.backgroundColor = 'var(--yellow-600, #ca8a04)'; color: '#000'; break; // Darker text for warning
              case 'info':
              default: toast.style.backgroundColor = 'var(--blue-600, #2563eb)'; break;
          }

         toast.textContent = message;
         toastContainer.appendChild(toast);

         // Animate in
         requestAnimationFrame(() => { // Ensure element is in DOM before animating
              requestAnimationFrame(() => {
                  toast.style.opacity = '1';
                  toast.style.transform = 'translateY(0)';
              });
         });


         // Auto-dismiss
         setTimeout(() => {
              toast.style.opacity = '0';
              toast.style.transform = 'translateY(-20px)';
             toast.addEventListener('transitionend', () => toast.remove(), { once: true });
             // Fallback removal
             setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
         }, 3000); // 3 seconds visibility
     }

    /**
     * Clears an error message associated with a specific input field.
     * Placeholder method for BaseDifyApp compatibility.
     * ChatUIManager typically shows errors directly in the chat stream.
     * @param {string} fieldName - Identifier for the field.
     */
    clearInputError(fieldName) {
        // console.log(`[ChatUIManager] clearInputError called for field: ${fieldName}. (No specific UI element targeted in chat mode)`);
        // In chat mode, we usually don't have specific input error fields like in forms.
        // If an input element was styled with an error class, we could remove it here.
        // Example: if (this.elements.messageInput) this.elements.messageInput.classList.remove('input-error');
    }

    /**
     * Displays system/metadata information (e.g., usage stats).
     * Required by BaseDifyApp.
     * In ChatUIManager, we'll just log this to the console for now.
     * @param {object} data - The metadata object to display.
     */
    displaySystemInfo(data) {
        if (!data) return;
        
        const systemInfoContainer = document.getElementById('system-info-container');
        const systemInfoContent = document.getElementById('system-info-content');
        
        if (!systemInfoContainer || !systemInfoContent) return;
        
        try {
            if (DEBUG) console.log("[ChatUIManager] System Info/Metadata Received:", data);
            
            // 构建系统信息HTML
            let html = '<div class="system-info-details">';
            
            // 添加对话ID
            if (data.conversation_id) {
                html += `<div class="info-item">
                    <span class="info-label">对话ID:</span>
                    <span class="info-value">${data.conversation_id}</span>
                </div>`;
            }
            
            // 添加消息ID
            if (data.message_id) {
                html += `<div class="info-item">
                    <span class="info-label">消息ID:</span>
                    <span class="info-value">${data.message_id}</span>
                </div>`;
            }
            
            // 添加用量信息
            if (data.usage) {
                const usage = data.usage;
                html += '<div class="info-section"><h5>Token 用量</h5>';
                
                // 提示Token
                if (usage.prompt_tokens) {
                    html += `<div class="info-item">
                        <span class="info-label">提示Token:</span>
                        <span class="info-value">${usage.prompt_tokens}</span>
                    </div>`;
                }
                
                // 完成Token
                if (usage.completion_tokens) {
                    html += `<div class="info-item">
                        <span class="info-label">完成Token:</span>
                        <span class="info-value">${usage.completion_tokens}</span>
                    </div>`;
                }
                
                // 总Token
                if (usage.total_tokens) {
                    html += `<div class="info-item">
                        <span class="info-label">总Token:</span>
                        <span class="info-value">${usage.total_tokens}</span>
                    </div>`;
                }
                
                html += '</div>'; // 关闭info-section
            }
            
            // 关闭主容器
            html += '</div>';
            
            // 更新DOM
            systemInfoContent.innerHTML = html;
            systemInfoContainer.style.display = 'block';
            
        } catch (error) {
            console.error('[ChatUIManager] Error displaying system info:', error);
        }
    }

    /**
     * Shows or hides the "Stop Responding" button.
     * @param {boolean} show - Whether to show the button.
     */
    toggleStopRespondingButton(show) {
        const stopRespondingContainer = document.getElementById('stop-responding-container');
        if (stopRespondingContainer) {
            stopRespondingContainer.style.display = show ? 'block' : 'none';
        }
    }

}

export default ChatUIManager; 