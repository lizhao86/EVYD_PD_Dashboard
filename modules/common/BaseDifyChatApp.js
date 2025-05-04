// modules/common/BaseDifyChatApp.js

/**
 * Base class for Dify Chat-based AI applications.
 * Extends BaseDifyApp and integrates ChatUIManager for chat-specific UI interactions.
 */
import BaseDifyApp from './base-dify-app.js';
import ChatUIManager from './ChatUIManager.js'; // CORRECT: Import the new ChatUIManager
import DifyClient from './dify-client.js'; // Import DifyClient
import { t } from '/scripts/i18n.js';
import { marked } from 'marked';

class BaseDifyChatApp extends BaseDifyApp {
    // --- Configuration ---
    difyMode = 'chat'; // Override base mode
    // Subclasses should set difyApiKeyName

    // --- UI Manager ---
    // Override the ui property to hold a ChatUIManager instance
    ui = null; // Will be initialized in constructor

    constructor() {
        super(); // Call BaseDifyApp constructor

        // Instantiate ChatUIManager instead of DifyAppUI
        // Pass dependencies here
        this.ui = new ChatUIManager({ t, marked });

        // Reset specific state for chat apps
        this.state.currentConversationId = null;
    }

    /**
     * Initializes the chat application.
     * Extends base initialization and sets up chat-specific UI and event listeners.
     */
    async init() {
        console.log(`[BaseDifyChatApp ${this.constructor.name}] Initializing...`);
        // Call base init first (loads config, user, DifyClient etc.)
        // BaseDifyApp's init calls this.ui.initUserInterface, which now refers to ChatUIManager's method
        // Ensure this.ui is instantiated BEFORE super.init() is called if super.init() uses this.ui immediately.
        // The current structure where BaseDifyApp.init calls ui.initUserInterface is fine as long as this.ui is set before super.init(). Let's move ui instantiation earlier if needed, but current base class likely handles it after config load.
        // Re-checking BaseDifyApp: It initializes UI *inside* its init after config load. So, overriding ui in constructor is correct.
        await super.init(); // This should call ChatUIManager's initUserInterface now.

        // Additional chat-specific initialization
        if (this.state.currentUser) {
            // Fetch and display opening statement/initial questions (if available)
            this.displayInitialAssistantMessage();
            this.setupSidebarListeners(); // Add listeners for history/new chat
            this.loadChatHistory(); // Load history from storage/API
        } else {
             console.log(`[BaseDifyChatApp ${this.constructor.name}] Skipping chat-specific init as user is not logged in.`);
             // Ensure error is shown if needed (base init should handle this)
        }
         console.log(`[BaseDifyChatApp ${this.constructor.name}] Initialization complete.`);
    }

    // --- Overridden Methods ---

    /**
     * Override to use ChatUIManager for error display within the chat context.
     */
    _handleNotLoggedIn() {
        const errorMsg = t(`${this.difyApiKeyName}.notLoggedIn`, { default: '请先登录以使用此功能。'});
         // Ensure UI is instantiated
         if (!this.ui) {
             try {
                  this.ui = new ChatUIManager({ t, marked });
                  this.ui.initUserInterface(); // Attempt basic init
             } catch(e) { console.error("Failed to init ChatUIManager for error", e); }
         }
        // Prefer showing error in chat if possible
        if (this.ui?.showErrorInChat) {
            this.ui.showErrorInChat(errorMsg);
            // Also potentially hide the main form/app area if the base class doesn't
             const appFormEl = document.getElementById('app-form'); // Check standard ID
             if (appFormEl) appFormEl.style.display = 'none';
        } else {
             // Fallback to base error display (which might use alert or different DOM)
             super._handleNotLoggedIn();
        }
    }


    /**
     * Gathers input from the chat input field. (Default implementation, subclasses can override)
     * @returns {object | null} Object with { query: string } or null if empty.
     */
    _gatherAndValidateInputs() {
        if (!this.ui || typeof this.ui.getInputText !== 'function') {
            console.error("ChatUIManager or getInputText not available.");
            return null;
        }
        const query = this.ui.getInputText().trim();
        if (!query) {
            // Usually no error for empty input in chat
            return null;
        }
        // Add basic length validation maybe?
        // const charCountLimit = 4000;
        // if (query.length > charCountLimit) { ... return null; }
        return { query: query };
    }

    /**
     * Builds the payload for the Dify /chat-messages endpoint. (Default implementation, subclasses can override)
     * @param {object} inputs - The validated inputs ({ query: string }).
     * @returns {object | null} The payload for DifyClient, or null on error.
     */
    _buildPayload(inputs) {
        if (!inputs || !inputs.query || !this.state.currentUser) {
             console.error("Cannot build payload: invalid inputs or user state.", inputs, this.state.currentUser);
             return null; // Return null to indicate failure
        }
        return {
            inputs: { 
                // Assuming the Dify workflow variable for user input is named 'query'
                // Subclasses might need to override this to map `inputs` fields correctly.
                query: inputs.query 
            },
            query: inputs.query, // This is the user's utterance for context/history
            user: this.state.currentUser.username || 'unknown-user',
            response_mode: 'streaming',
            conversation_id: this.state.currentConversationId || undefined,
            // files: [], // Add file support later if needed
            auto_generate_name: !this.state.currentConversationId // Auto-generate name only for first message
        };
    }

    /**
     * Provides the base callbacks for DifyClient, adapted for ChatUIManager.
     * Expects an assistantMessageId to target updates.
     * @param {string} assistantMessageId - The unique ID assigned to the assistant's message placeholder.
     * @returns {object} Callbacks for onMessage, onComplete, onError.
     */
    _getBaseCallbacks(assistantMessageId) {
         if (!this.ui) {
             console.error("Cannot get base callbacks: ChatUIManager not initialized.");
             return {};
         }
         if (!assistantMessageId) {
             console.error("Cannot get base callbacks: assistantMessageId is required.");
              return {
                 // Provide dummy error handler at least
                 onError: (error) => this._handleError(error, null) // Pass null ID
             };
         }
        return {
            onMessage: (content, isFirstChunk) => {
                // console.log(`Callback onMessage: chunk received for ${assistantMessageId}`);
                this.ui.updateMessageStream(assistantMessageId, content);
            },
            onComplete: (metadata) => {
                console.log(`Callback onComplete for ${assistantMessageId}. Metadata:`, metadata);
                // Finalize the specific message bubble
                this.ui.finalizeMessage(assistantMessageId, metadata);

                // --- BaseDifyApp completion logic adaptation ---
                // this.ui.showGenerationCompleted(); // Reset main button state (if applicable)
                this.ui.setSendButtonState('idle'); // Reset chat send button
                this.ui.displaySystemInfo(metadata); // Show metadata if needed

                // Handle stats display (if UI manager supports it or adapt here)
                 if (metadata && metadata.usage) {
                      console.log("Received stats:", metadata.usage);
                      // TODO: Adapt stats display (e.g., add to finalized message actions?)
                 } else {
                      console.warn(`[${this.constructor.name}] Metadata or usage data is missing/incomplete. Skipping stats display.`);
                 }

                // Update conversation ID for the *next* message
                if (metadata?.conversation_id) {
                     console.log(`Updating conversation ID to: ${metadata.conversation_id}`);
                    this.state.currentConversationId = metadata.conversation_id;
                    this.ui.setActiveHistoryItem(this.state.currentConversationId); // Highlight in sidebar
                    // TODO: Add/Update history list if this was the first message of a new chat
                    this.addOrUpdateConversationHistory({ id: metadata.conversation_id, name: metadata.name || 'New Chat', last_message_time: Date.now() / 1000 });
                }

                // Fetch and display suggested questions for the completed message
                const finalMessageId = metadata?.message_id || assistantMessageId; // Use final ID if available
                this.fetchAndDisplaySuggestions(finalMessageId);


                this.difyClient = null;
                this.state.isGenerating = false;

                // Re-enable input
                if (this.ui.elements.messageInput) {
                    this.ui.elements.messageInput.disabled = false;
                    this.ui.elements.messageInput.focus();
                 }
            },
            onError: (error) => {
                 this._handleError(error, assistantMessageId); // Pass the ID for context
            }
        };
    }

     /**
      * Handles errors during the Dify stream, using the message ID for context.
      * Overrides the base implementation.
      * @param {Error} error - The error object.
      * @param {string | null} assistantMessageId - The ID of the message being streamed when error occurred.
      */
     _handleError(error, assistantMessageId) {
          // Display error within the chat context if possible
          if (this.ui?.showErrorInChat) {
               const errorMsg = error.name === 'AbortError'
                  ? t('common.generationStoppedByUser', { default: '生成已由用户停止。' })
                  : t('common.generationFailed', { default: '生成失败:'}) + ` ${error.message}`;

              this.ui.showErrorInChat(errorMsg, assistantMessageId); // Show error related to the message ID
          } else {
               // Fallback to simpler UI feedback if chat UI isn't ready
               console.error(`[${this.constructor.name}] Dify API Error:`, error);
               alert(t('common.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
          }

          // Reset generic UI states (button, input enabling)
          if (this.ui?.setSendButtonState) this.ui.setSendButtonState('idle');
          if (this.ui?.elements?.messageInput) this.ui.elements.messageInput.disabled = false;

          // Clean up Dify client
          this.difyClient = null;
          this.state.isGenerating = false;
     }


    /**
     * Handles the generate button click.
     * Overrides base to orchestrate chat UI updates.
     */
    async handleGenerate() {
         console.log(`[BaseDifyChatApp ${this.constructor.name}] handleGenerate called.`);

        if (!this.ui || !this.state.apiKey || !this.state.apiEndpoint || !this.state.currentUser) {
            console.error(`[BaseDifyChatApp ${this.constructor.name}] Cannot generate: App not fully initialized or missing config.`);
            this.ui?.showErrorInChat(t(`${this.difyApiKeyName}.initError`, { default: '应用未完全初始化或缺少配置，无法生成。' }));
            return;
        }

        const inputs = this._gatherAndValidateInputs();
        if (!inputs) {
            return; // Validation failed or input empty
        }

        // Display user message using ChatUIManager
        this.ui.addMessage('user', inputs.query);
        const userQuery = inputs.query; // Keep a copy before clearing
        this.ui.clearInputText(); // Clear input after getting text

        // Set UI to thinking state
        this.ui.setSendButtonState('thinking');
        if (this.ui.elements.messageInput) {
           this.ui.elements.messageInput.disabled = true; // Disable input while thinking
        }
        this.state.isGenerating = true;

        // Add placeholder for assistant response BEFORE calling API
        const assistantMessageId = `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        this.ui.addMessage('assistant', '', assistantMessageId, 'pending');


        let finalCallbacks = null;

        try {
            // Create Dify client
            if (!this.difyClient) { // Create if not existing (e.g., after error/completion)
                this.difyClient = new DifyClient({
                    baseUrl: this.state.apiEndpoint,
                    apiKey: this.state.apiKey,
                    mode: this.difyMode
                });
            }

            // Rebuild payload here, potentially using the saved userQuery
            const payload = this._buildPayload({ query: userQuery });
             if (!payload) {
                  // If payload fails here, it's an internal error
                  throw new Error("Failed to build payload internally.");
             }

            // Get callbacks, passing the temporary message ID
            const baseCallbacks = this._getBaseCallbacks(assistantMessageId);
            const specificCallbacks = this._getSpecificCallbacks(); // For potential overrides
            finalCallbacks = { ...baseCallbacks, ...specificCallbacks };

             // Modify callbacks slightly to set 'streaming' state
             const originalOnMessage = finalCallbacks.onMessage;
             let streamingStateSet = false;
             finalCallbacks.onMessage = (content, isFirstChunk) => {
                 if (!streamingStateSet) {
                      this.ui.setSendButtonState('streaming');
                      streamingStateSet = true;
                 }
                 if (originalOnMessage) originalOnMessage(content, isFirstChunk);
             };


            console.log(`[BaseDifyChatApp ${this.constructor.name}] Calling difyClient.generateStream with payload for message ${assistantMessageId}`);
            // Don't await here, let callbacks handle completion/error
             this.difyClient.generateStream(payload, finalCallbacks).catch(err => {
                 // This catch is a safety net for errors *before* streaming starts or if the promise rejects unexpectedly
                 console.error("Error directly from generateStream promise:", err);
                 if (finalCallbacks && finalCallbacks.onError) {
                     finalCallbacks.onError(err instanceof Error ? err : new Error(String(err)));
                 }
             });
             // console.log(`[BaseDifyChatApp ${this.constructor.name}] generateStream call initiated.`);

        } catch (error) {
            console.error(`[BaseDifyChatApp ${this.constructor.name}] Error during generation stream setup or call:`, error);
             // Use the onError callback (which now references assistantMessageId)
             // Ensure callbacks exist before calling
             const errorCallback = finalCallbacks?.onError || ((err) => this._handleError(err, assistantMessageId));
             errorCallback(error);
        }
    }

    /**
     * Override to stop generation and reset chat button state.
     */
    async stopGeneration() {
        if (this.difyClient) {
            console.log(`[BaseDifyChatApp ${this.constructor.name}] Stopping generation...`);
            this.difyClient.stopGeneration(); // This will trigger onError with AbortError
        } else {
             console.warn(`[${this.constructor.name}] No active DifyClient instance to stop.`);
             this.ui?.setSendButtonState('idle'); // Ensure button is reset anyway
              if (this.ui?.elements?.messageInput) {
                   this.ui.elements.messageInput.disabled = false;
              }
        }
    }

    // --- Chat Specific Methods ---

    /**
     * Fetches the opening statement and initial suggested questions from Dify parameters.
     * Displays the opening statement as the first assistant message.
     */
    async displayInitialAssistantMessage() {
        if (!this.state.apiKey || !this.state.apiEndpoint) {
            console.warn("Cannot display initial message: missing API config.");
            return;
        }

        const paramsUrl = `${this.state.apiEndpoint}/parameters`;
        let openingStatement = t('chat.welcomeMessage', { default: '你好！我可以帮你做什么？' }); // Default welcome
        let suggestedQuestions = [];

        try {
            const response = await fetch(paramsUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${this.state.apiKey}` }
            });
            if (!response.ok) {
                throw new Error(`HTTP error fetching parameters! status: ${response.status}`);
            }
            const params = await response.json();
            console.log("Fetched Dify parameters:", params);

            if (params.opening_statement) {
                openingStatement = params.opening_statement;
            }
            if (params.suggested_questions && params.suggested_questions.length > 0) {
                 suggestedQuestions = params.suggested_questions;
            }

        } catch (error) {
            console.error(`[${this.constructor.name}] Error fetching Dify parameters:`, error);
             this.ui?.showToast(t('chat.error.fetchParamsFailed', { default: '获取应用配置失败' }), 'error');
        } finally {
            // Always display *something*
            this.ui?.clearChatArea(); // Clear any previous messages first
            const openingMessageId = 'opening-message-0'; // Make ID slightly more unique
            const msgElement = this.ui?.addMessage('assistant', openingStatement, openingMessageId, 'complete');
             if (msgElement) {
                 this.ui?.finalizeMessage(openingMessageId); // Immediately finalize
                 // Display initial suggested questions below opening statement
                 if (suggestedQuestions.length > 0) {
                      this.ui?.displaySuggestedQuestions(openingMessageId, suggestedQuestions);
                 }
             } else {
                 console.error("Failed to add opening message to UI.");
             }
        }
    }

    /**
     * Fetches suggested questions for a given message ID and displays them.
     * @param {string} messageId
     */
    async fetchAndDisplaySuggestions(messageId) {
         if (!messageId || !this.state.apiKey || !this.state.apiEndpoint || !this.state.currentUser) {
             console.warn("Cannot fetch suggestions: missing messageId or config/user.");
             return;
         }

         const suggestionsUrl = `${this.state.apiEndpoint}/messages/${messageId}/suggested?user=${encodeURIComponent(this.state.currentUser.username || 'unknown-user')}`;
         try {
             const response = await fetch(suggestionsUrl, {
                 method: 'GET',
                 headers: { 'Authorization': `Bearer ${this.state.apiKey}` }
             });
             if (!response.ok) {
                 console.warn(`[${this.constructor.name}] Failed to fetch suggestions for message ${messageId}. Status: ${response.status}`);
                 return; // Non-critical error
             }
             const result = await response.json();
             if (result.data && Array.isArray(result.data) && result.data.length > 0) {
                 this.ui?.displaySuggestedQuestions(messageId, result.data);
             }
         } catch (error) {
              console.error(`[${this.constructor.name}] Error fetching suggestions for message ${messageId}:`, error);
              // Don't show toast for this potentially minor error
         }
    }

    /**
     * Handles starting a new chat session.
     */
    startNewConversation() {
        console.log("Starting new conversation...");
        if (this.state.isGenerating && this.difyClient) {
             console.log("Stopping current generation before starting new chat.");
             this.stopGeneration(); // Stop any ongoing generation first
         }
        this.state.currentConversationId = null;
        this.ui?.clearChatArea();
        this.ui?.setActiveHistoryItem(null); // Deactivate all history items
        this.displayInitialAssistantMessage(); // Show opening statement again
        if (this.ui?.elements?.messageInput) this.ui.elements.messageInput.focus(); // Focus input
        // TODO: Visually update history list (add "New Chat" entry?)
    }

    /**
     * Loads and displays messages for a specific conversation.
     * @param {string} conversationId
     */
    async loadConversationMessages(conversationId) {
         if (!conversationId || !this.state.apiKey || !this.state.apiEndpoint || !this.state.currentUser) {
             console.warn("Cannot load messages: missing conversationId or config.");
             return;
         }
         if (this.state.isGenerating && this.difyClient) {
             console.log("Stopping current generation before loading history.");
             this.stopGeneration(); // Stop generation if loading another chat
         }
         console.log(`Loading messages for conversation: ${conversationId}`);
         this.state.currentConversationId = conversationId;
         this.ui?.setActiveHistoryItem(conversationId);
         this.ui?.clearChatArea();
         // TODO: Show loading indicator in chat area

         const messagesUrl = `${this.state.apiEndpoint}/messages?conversation_id=${conversationId}&user=${encodeURIComponent(this.state.currentUser.username || 'unknown-user')}&limit=50`; // TODO: Add pagination

         try {
             const response = await fetch(messagesUrl, {
                 method: 'GET',
                 headers: { 'Authorization': `Bearer ${this.state.apiKey}` }
             });
             if (!response.ok) {
                 throw new Error(`HTTP error fetching messages! status: ${response.status}`);
             }
             const result = await response.json();

             if (result.data && result.data.length > 0) {
                 // Display messages in order (API returns newest first, so reverse)
                 result.data.reverse().forEach(msg => {
                     if (msg.query) {
                         this.ui?.addMessage('user', msg.query, msg.id, 'complete');
                     }
                     if (msg.answer) {
                          const assistantMsgElement = this.ui?.addMessage('assistant', msg.answer, msg.id, 'complete');
                          if (assistantMsgElement) {
                              // Add feedback buttons etc. to finalized historical messages
                               this.ui?.finalizeMessage(msg.id); // Call finalize even for historical ones
                          }
                     }
                     // TODO: Handle files, feedback status etc. from historical messages
                 });
             } else {
                  // If the conversation has no messages (shouldn't usually happen if conv exists), show welcome
                  this.displayInitialAssistantMessage();
             }
         } catch (error) {
              console.error(`[${this.constructor.name}] Error loading messages for conversation ${conversationId}:`, error);
              this.ui?.showErrorInChat(t('chat.error.loadMessagesFailed', { default: '加载历史消息失败' }));
               // Maybe revert to welcome or show a clear error state?
               this.displayInitialAssistantMessage();
         } finally {
             // TODO: Hide loading indicator
         }
    }

    /**
     * Loads chat history from storage or API (placeholder implementation).
     */
    loadChatHistory() {
        // TODO: Implement loading history from a real source (e.g., Dify GET /conversations or localStorage)
        console.warn("loadChatHistory() is using dummy data.");
         const dummyHistory = [
             { id: 'conv-1', name: 'Previous Chat 1', last_message_time: Date.now()/1000 - 3600 },
             { id: 'conv-2', name: 'Another Old Chat', last_message_time: Date.now()/1000 - 7200 },
         ];
         this.ui?.updateHistoryList(dummyHistory);
    }

    /**
     * Adds or updates a conversation in the history list (placeholder).
     * @param {object} conversationData - e.g., { id, name, last_message_time }
     */
    addOrUpdateConversationHistory(conversationData) {
        // TODO: Implement logic to update internal history state and call ui.updateHistoryList
        console.warn("addOrUpdateConversationHistory() is not implemented yet.");
         // Basic example: Assume an array `this.history = []` exists
         /*
         const existingIndex = this.history.findIndex(h => h.id === conversationData.id);
         if (existingIndex > -1) {
             this.history[existingIndex] = { ...this.history[existingIndex], ...conversationData };
         } else {
              this.history.unshift(conversationData); // Add to top
         }
         this.ui?.updateHistoryList(this.history);
         */
    }


    /**
     * Binds event listeners specific to the chat UI (sidebar, history items, suggested questions).
     */
    setupSidebarListeners() {
         if (!this.ui) return; // Ensure UI is available

         // Toggle sidebar button
         this.ui.elements.toggleSidebarButton?.addEventListener('click', () => {
             this.ui.toggleSidebar();
         });
          // Apply initial collapsed state from localStorage
          if (this.ui.elements.sidebar && localStorage.getItem('sidebar-collapsed') === 'true') {
               this.ui.elements.sidebar.classList.add('collapsed');
          } else if (this.ui.elements.sidebar) {
               this.ui.elements.sidebar.classList.remove('collapsed'); // Ensure default is expanded
          }

         // Start new chat button
         this.ui.elements.startNewChatButton?.addEventListener('click', () => {
             this.startNewConversation();
         });

         // History list item clicks (using event delegation)
         this.ui.elements.chatHistoryList?.addEventListener('click', (e) => {
             const historyItem = e.target.closest('.chat-history-item');
             const convId = historyItem?.dataset.conversationId;
             if (convId && convId !== this.state.currentConversationId) {
                 this.loadConversationMessages(convId);
                 // Collapse sidebar on mobile after selection
                  if (window.innerWidth <= 768 && this.ui.elements.sidebar && !this.ui.elements.sidebar.classList.contains('collapsed')) {
                      this.ui.toggleSidebar(); // Use the UI method
                  }
             }
         });

         // Suggested question & Feedback clicks (using event delegation on chat container)
         this.ui.elements.chatMessagesContainer?.addEventListener('click', (e) => {
             // Suggested Question Click
              const suggestionButton = e.target.closest('.suggested-question-btn');
               if (suggestionButton?.dataset?.question && this.ui.elements.messageInput) {
                   const question = suggestionButton.dataset.question;
                   this.ui.elements.messageInput.value = question;
                   // Trigger input event to update send button state etc.
                   this.ui.elements.messageInput.dispatchEvent(new Event('input', { bubbles: true }));
                   this.ui.elements.messageInput.focus();
                   // Automatically send the suggested question
                    this.handleGenerate();
               }

               // Feedback Button Click
               const feedbackButton = e.target.closest('.feedback-btn');
               const messageId = feedbackButton?.dataset?.messageId;
               const rating = feedbackButton?.dataset?.rating;
               if (messageId && rating) {
                    this.submitFeedback(messageId, rating);
                    // Update button visual state (e.g., add 'selected' class, remove from sibling)
                    feedbackButton.classList.add('selected');
                     const siblings = feedbackButton.parentElement?.querySelectorAll('.feedback-btn');
                     siblings?.forEach(sib => {
                          if (sib !== feedbackButton) sib.classList.remove('selected');
                     });
               }
         });
    }

     /**
      * Submits feedback for a message.
      * @param {string} messageId
      * @param {'like' | 'dislike' | null} rating - null to clear feedback
      */
     async submitFeedback(messageId, rating) {
         if (!this.state.apiKey || !this.state.apiEndpoint || !this.state.currentUser) {
             console.warn("Cannot submit feedback: missing config/user.");
             return;
         }
         console.log(`Submitting feedback: message=${messageId}, rating=${rating}`);

         const feedbackUrl = `${this.state.apiEndpoint}/messages/${messageId}/feedbacks`;
         try {
             const response = await fetch(feedbackUrl, {
                 method: 'POST',
                 headers: {
                     'Authorization': `Bearer ${this.state.apiKey}`,
                     'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({
                     rating: rating,
                     user: this.state.currentUser.username || 'unknown-user'
                     // content: '' // Optional: Add content field if implementing detailed feedback
                 })
             });
             if (!response.ok) {
                 // Try to get error details from response
                 let errorBody = `HTTP error! status: ${response.status}`;
                 try {
                      const errorJson = await response.json();
                      errorBody = errorJson.message || errorJson.code || JSON.stringify(errorJson);
                 } catch (e) { /* ignore parsing error */ }
                 throw new Error(errorBody);
             }
             const result = await response.json();
              if (result.result === 'success') {
                  this.ui?.showToast(t('chat.feedbackSubmitted', { default: '感谢反馈！' }), 'success');
              } else {
                   throw new Error("Feedback API did not return success.");
              }
         } catch (error) {
              console.error(`[${this.constructor.name}] Error submitting feedback for message ${messageId}:`, error);
               this.ui?.showToast(t('chat.error.feedbackFailed', { default: '提交反馈失败' }) + `: ${error.message}`, 'error');
               // Revert button visual state on error?
                const feedbackButton = this.ui?.elements.chatMessagesContainer?.querySelector(`.feedback-btn[data-message-id="${messageId}"][data-rating="${rating}"]`);
                 feedbackButton?.classList.remove('selected');
         }
     }

     // --- Helper to bind specific events in base class ---
     // Override _bindSpecificEvents from BaseDifyApp to set up chat input listeners correctly
     _bindSpecificEvents() {
         const messageInput = this.ui?.elements?.messageInput; // Use UI manager's cached element
         if (messageInput && this.ui) {
             messageInput.addEventListener('input', () => {
                 this.ui.updateSendButtonState();
                  // Update char count
                  const count = messageInput.value.length;
                  if (this.ui.elements.charCount) {
                      this.ui.elements.charCount.textContent = `${count}/4000`; // Assuming 4000 limit
                  }
                  // Auto-resize textarea
                  messageInput.style.height = 'auto';
                  const newHeight = Math.min(messageInput.scrollHeight, 150); // Limit height
                  messageInput.style.height = newHeight + 'px';
             });

             messageInput.addEventListener('keydown', (e) => {
                  // Send on Enter (not Shift+Enter)
                  const sendButton = this.ui.elements.sendButton;
                  if (e.key === 'Enter' && !e.shiftKey && sendButton && !sendButton.disabled) {
                      e.preventDefault();
                       this.handleGenerate(); // Call the app's handleGenerate method
                  }
             });
         } else {
              console.warn(`[${this.constructor.name}] Chat message input element not found via UI manager for event binding.`);
         }
     }
}

export default BaseDifyChatApp; 