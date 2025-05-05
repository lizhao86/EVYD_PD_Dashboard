// modules/common/ChatUIManager.js

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
        console.log("[ChatUIManager] Initializing elements...");
        this.config = { ...this.config, ...configOverrides };

        this.elements.chatMessagesContainer = document.getElementById(this.config.chatMessagesId);
        this.elements.messageInput = document.getElementById(this.config.messageInputId);
        this.elements.sendButton = document.getElementById(this.config.sendButtonId);
        this.elements.sidebar = document.getElementById(this.config.sidebarId);
        this.elements.chatHistoryList = document.getElementById(this.config.chatHistoryId);
        this.elements.charCount = document.getElementById(this.config.charCountId);
        this.elements.toggleSidebarButton = document.getElementById(this.config.toggleSidebarButtonId);
        this.elements.startNewChatButton = document.getElementById(this.config.startNewChatButtonId);

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

        console.log("[ChatUIManager] Elements cached:", this.elements);
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
        // console.log(`[ChatUIManager] Adding message: role=${role}, messageId=${messageId}, status=${status}`);

        const messageWrapper = document.createElement('div');
        const roleClass = role === 'assistant' ? 'bot-message' : `${role}-message`;
        messageWrapper.classList.add('message-wrapper', roleClass);
        // --- DEBUGGING LOG ---
        console.log(`[ChatUIManager] Adding messageWrapper with classes:`, messageWrapper.classList);
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

        // console.log(`[ChatUIManager] Setting state for ${messageId} to: ${state}`);
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
        // Render incrementally - careful with complex markdown
        contentBubble.innerHTML = this.marked.parse(messageData.fullContent, { breaks: true, gfm: true });

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

        // Determine the final message ID (server-provided or original)
        const finalMessageId = (metadata && metadata.message_id) ? metadata.message_id : messageId;
        
        // Update element's dataset ID if it changed
        if (finalMessageId !== messageId) {
            console.log(`[ChatUIManager] Updating message element dataset ID from ${messageId} to ${finalMessageId}`);
            messageElement.dataset.messageId = finalMessageId;
        }

        // Set final state using the final ID
        this.setMessageState(finalMessageId, 'complete');

        const contentBubble = messageElement.querySelector('.message-content');
        const actionsWrapper = messageElement.querySelector('.message-actions');

        // Final render of full content
        if (contentBubble && messageData) {
            contentBubble.innerHTML = this.marked.parse(messageData.fullContent || '', { breaks: true, gfm: true });
        } else if (contentBubble && !messageData && contentBubble.textContent) {
             // If called on a non-streamed message, re-render existing content
             try {
                  contentBubble.innerHTML = this.marked.parse(contentBubble.textContent || '', { breaks: true, gfm: true });
             } catch (e) { console.error("Markdown error on finalize:", e)}
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
        // --- ADD CHECK FOR OPENING MESSAGE ---
        const messageElement = actionsWrapper.closest('.message-wrapper'); // More robust way to find parent
        // const messageElement = this.elements.chatMessagesContainer?.querySelector(`.message-wrapper[data-message-id="${messageId}"]`);
        if (messageElement?.dataset?.messageType === 'opening') {
            actionsWrapper.innerHTML = ''; // Ensure actions are cleared just in case
            return; // Don't add actions for opening messages
        }
        // --- END CHECK ---

        actionsWrapper.innerHTML = ''; // Clear previous actions

        // --- SVG Icons --- (Using simple examples, replace with preferred icons)
        const thumbsUpSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M14.5998 8.00033H21C22.1046 8.00033 23 8.89576 23 10.0003V12.1047C23 12.3659 22.9488 12.6246 22.8494 12.8662L19.755 20.3811C19.6007 20.7558 19.2355 21.0003 18.8303 21.0003H2C1.44772 21.0003 1 20.5526 1 20.0003V10.0003C1 9.44804 1.44772 9.00033 2 9.00033H5.48184C5.80677 9.00033 6.11143 8.84246 6.29881 8.57701L11.7522 0.851355C11.8947 0.649486 12.1633 0.581978 12.3843 0.692483L14.1984 1.59951C15.25 2.12534 15.7931 3.31292 15.5031 4.45235L14.5998 8.00033ZM7 10.5878V19.0003H18.1606L21 12.1047V10.0003H14.5998C13.2951 10.0003 12.3398 8.77128 12.6616 7.50691L13.5649 3.95894C13.6229 3.73105 13.5143 3.49353 13.3039 3.38837L12.6428 3.0578L7.93275 9.73038C7.68285 10.0844 7.36341 10.3746 7 10.5878ZM5 11.0003H3V19.0003H5V11.0003Z"></path></svg>';
        const thumbsDownSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M9.40017 16H3C1.89543 16 1 15.1046 1 14V11.8957C1 11.6344 1.05118 11.3757 1.15064 11.1342L4.24501 3.61925C4.3993 3.24455 4.76447 3 5.16969 3H22C22.5523 3 23 3.44772 23 4V14C23 14.5523 22.5523 15 22 15H18.5182C18.1932 15 17.8886 15.1579 17.7012 15.4233L12.2478 23.149C12.1053 23.3508 11.8367 23.4184 11.6157 23.3078L9.80163 22.4008C8.74998 21.875 8.20687 20.6874 8.49694 19.548L9.40017 16ZM17 13.4125V5H5.83939L3 11.8957V14H9.40017C10.7049 14 11.6602 15.229 11.3384 16.4934L10.4351 20.0414C10.3771 20.2693 10.4857 20.5068 10.6961 20.612L11.3572 20.9425L16.0673 14.27C16.3172 13.9159 16.6366 13.6257 17 13.4125ZM19 13H21V5H19V13Z"></path></svg>';
        const copySvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        const regenerateSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M22 12C22 17.5228 17.5229 22 12 22C6.4772 22 2 17.5228 2 12C2 6.47715 6.4772 2 12 2V4C7.5817 4 4 7.58172 4 12C4 16.4183 7.5817 20 12 20C16.4183 20 20 16.4183 20 12C20 9.25022 18.6127 6.82447 16.4998 5.38451L16.5 8H14.5V2L20.5 2V4L18.0008 3.99989C20.4293 5.82434 22 8.72873 22 12Z"></path></svg>';

        // Regenerate Button (Add this first as per Dify screenshot order)
        const regenerateButton = document.createElement('button');
        regenerateButton.className = 'btn-icon regenerate-btn';
        regenerateButton.innerHTML = regenerateSvg;
        regenerateButton.ariaLabel = this.t('chat.regenerate', { default: 'Regenerate' });
        regenerateButton.title = this.t('chat.regenerate', { default: 'Regenerate' });
        regenerateButton.dataset.messageId = messageId;
        regenerateButton.dataset.action = 'regenerate'; // Add data attribute for event listener
        actionsWrapper.appendChild(regenerateButton);

        // Feedback Buttons
        const likeButton = document.createElement('button');
        likeButton.className = 'btn-icon feedback-btn thumbs-up';
        // likeButton.innerHTML = '👍'; // Use SVG icons for better styling
        likeButton.innerHTML = thumbsUpSvg;
        likeButton.ariaLabel = this.t('chat.like', { default: 'Like' });
        likeButton.title = this.t('chat.like', { default: 'Like' });
        likeButton.dataset.messageId = messageId;
        likeButton.dataset.rating = 'like';
        actionsWrapper.appendChild(likeButton);

        const dislikeButton = document.createElement('button');
        dislikeButton.className = 'btn-icon feedback-btn thumbs-down';
        // dislikeButton.innerHTML = '👎';
        dislikeButton.innerHTML = thumbsDownSvg;
        dislikeButton.ariaLabel = this.t('chat.dislike', { default: 'Dislike' });
        dislikeButton.title = this.t('chat.dislike', { default: 'Dislike' });
        dislikeButton.dataset.messageId = messageId;
        dislikeButton.dataset.rating = 'dislike';
        actionsWrapper.appendChild(dislikeButton);

        // Copy Button
        const copyButton = document.createElement('button');
        copyButton.className = 'btn-icon copy-message-btn';
         // copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'; // Example SVG
         copyButton.innerHTML = copySvg;
        copyButton.ariaLabel = this.t('chat.copy', { default: 'Copy' });
        copyButton.title = this.t('chat.copy', { default: 'Copy' });
        copyButton.addEventListener('click', (e) => {
             e.stopPropagation(); // Prevent triggering other listeners
             this.copyMessageContent(messageId);
        });
        actionsWrapper.appendChild(copyButton);

        // TODO: Add stats display (Tokens, Time) if needed
        // const statsContainer = document.createElement('div');
        // statsContainer.className = 'message-stats';
        // ... populate with metadata ...
        // actionsWrapper.appendChild(statsContainer);
    }

    /**
     * Displays an error message within the chat stream or associated with a message.
     * @param {string} message - The error message.
     * @param {string} [messageId] - Optional ID of the message where the error occurred.
     */
    showErrorInChat(message, messageId) {
        console.error(`[ChatUIManager] Error: ${message}` + (messageId ? ` (related to message ${messageId})` : ''));
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
                break;
            case 'streaming':
                  this.elements.sendButton.disabled = true; // Keep disabled during streaming
                  // Optionally change indicator? For now, keep the loading one.
                  this.elements.sendButton.innerHTML = loadingIndicatorHtml;
                 break;
            case 'disabled': // Explicitly disabled state
                 this.elements.sendButton.disabled = true;
                 this.elements.sendButton.innerHTML = originalIconSvg;
                break;
            case 'idle':
            default:
                 // --- FIX: Don't re-evaluate disabled state here. Restore icon and call the central state updater. ---
                 // this.elements.sendButton.disabled = !(this.elements.messageInput?.value.trim().length > 0);
                 this.elements.sendButton.innerHTML = originalIconSvg;
                 this.updateSendButtonState(); // Call the main function to set the correct disabled state based on all criteria
                 // --- END FIX ---
                break;
        }
    }

    // --- Sidebar & History ---

    /**
     * Updates the chat history list in the sidebar.
     * @param {Array<object>} conversations - Array of conversation objects (e.g., { id: string, name: string, last_message_time?: number }).
     */
    updateHistoryList(conversations = []) {
        if (!this.elements.chatHistoryList) return;
        this.elements.chatHistoryList.innerHTML = ''; // Clear existing

        // Sort conversations, newest first (handle potentially missing times)
        conversations.sort((a, b) => (b.last_message_time || 0) - (a.last_message_time || 0));

        conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = 'chat-history-item';
            item.dataset.conversationId = conv.id;
            item.title = conv.name || `Conversation ${conv.id.substring(0, 6)}`; // Add tooltip

            const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
             // Object.assign(icon, { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }); // OLD: Using Object.assign
             // NEW: Using setAttribute for SVG attributes
             icon.setAttribute('width', '16');
             icon.setAttribute('height', '16');
             icon.setAttribute('viewBox', '0 0 24 24');
             icon.setAttribute('fill', 'none');
             icon.setAttribute('stroke', 'currentColor');
             icon.setAttribute('stroke-width', '2');
             icon.setAttribute('stroke-linecap', 'round');
             icon.setAttribute('stroke-linejoin', 'round');

             icon.classList.add('icon', 'history-item-icon');
             icon.innerHTML = '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>';
            item.appendChild(icon);

            const nameSpan = document.createElement('span');
             // Truncate long names if needed via CSS text-overflow
            nameSpan.textContent = conv.name || `Conversation ${conv.id.substring(0, 6)}...`;
            item.appendChild(nameSpan);

            // TODO: Add delete button? Needs event listener in BaseDifyChatApp
            // const deleteBtn = document.createElement('button'); ... item.appendChild(deleteBtn);

            this.elements.chatHistoryList.appendChild(item);
        });
    }

    /**
     * Sets the specified conversation item in the history list as active.
     * @param {string | null} conversationId - The ID of the conversation to activate, or null to deactivate all.
     */
    setActiveHistoryItem(conversationId) {
        if (!this.elements.chatHistoryList) return;
        const items = this.elements.chatHistoryList.querySelectorAll('.chat-history-item');
        items.forEach(item => {
            item.classList.toggle('active', item.dataset.conversationId === conversationId);
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

        const targetMessageElement = this.elements.chatMessagesContainer.querySelector(`.message-wrapper[data-message-id="${targetMessageId}"]`);
        if (!targetMessageElement) {
             console.warn(`[ChatUIManager] Cannot display suggestions: target message ${targetMessageId} not found.`);
             return;
        }

        // Ensure it targets bot messages only
        if (!targetMessageElement.classList.contains('bot-message')) return; 

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
        if (data) {
            console.log("[ChatUIManager] System Info/Metadata Received:", data);
            // Potential future enhancement: Display this info somewhere non-intrusive?
            // Example: Add to the last message's actions, or a dedicated debug panel.
        } else {
            // console.log("[ChatUIManager] displaySystemInfo called without data.");
        }
    }

}

export default ChatUIManager; 