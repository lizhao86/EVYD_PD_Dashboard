// modules/common/BaseDifyChatApp.js

// 禁用调试日志
const DEBUG = false;

/**
 * Base class for Dify Chat-based AI applications.
 * Extends BaseDifyApp and integrates ChatUIManager for chat-specific UI interactions.
 */
import BaseDifyApp from './base-dify-app.js';
import ChatUIManager from './ChatUIManager.js'; // CORRECT: Import the new ChatUIManager
import DifyClient from './dify-client.js'; // Import DifyClient
import { t } from '/scripts/i18n.js';
import { marked } from 'marked';
// 导入ChatHistoryService
import ChatHistoryService from './ChatHistoryService.js';

class BaseDifyChatApp extends BaseDifyApp {
    // --- Configuration ---
    difyMode = 'chat'; // Override base mode
    // Subclasses should set difyApiKeyName

    // --- UI Manager ---
    // Override the ui property to hold a ChatUIManager instance
    ui = null; // Will be initialized in constructor

    constructor() {
        super(); // Call BaseDifyApp constructor

        // 设置默认appType
        this.appType = 'chat'; // 默认值，可以被子类覆盖

        // Instantiate ChatUIManager instead of DifyAppUI
        // Pass dependencies here
        this.ui = new ChatUIManager({ t, marked });

        // Reset specific state for chat apps
        this.state.currentConversationId = null;
        this.state.isNewConversationPending = false; // Initialize pending flag
        this.state.isStartingNewChat = false; // Flag to prevent rapid clicks

        // 添加history属性用于缓存历史记录列表
        this.history = [];
    }

    /**
     * Initializes the chat application.
     * Extends base initialization and sets up chat-specific UI and event listeners.
     */
    async init() {
        if (DEBUG) console.log(`[BaseDifyChatApp ${this.constructor.name}] Initializing...`);
        // Call base init first (loads config, user, DifyClient etc.)
        await super.init(); // This should call ChatUIManager's initUserInterface now.

        // Additional chat-specific initialization
        if (this.state.currentUser) {
            // 设置侧边栏和其他UI事件监听器
            this.setupSidebarListeners();
            
            try {
                // 加载历史记录
                await this.loadChatHistory();
                
                // 判断是否有历史对话可加载
                if (this.history.length > 0) {
                    // 自动加载最新的一个对话
                    if (DEBUG) console.log("[BaseDifyChatApp Init] Found history, loading latest conversation...");
                    const latestConversation = this.history[0]; // 因为已经按时间排序，第一个是最新的
                    await this.loadConversationMessages(latestConversation.id);
                } else {
                    // --- MODIFICATION: Call startNewConversation to auto-create --- 
                    if (DEBUG) console.log("[BaseDifyChatApp Init] No history found, automatically starting a new conversation...");
                    this.startNewConversation(); // This will create record, update sidebar, select, and show welcome
                    // OLD LOGIC - REMOVED
                    /*
                    // 只有在没有历史对话时才显示初始欢迎消息
                    if (DEBUG) console.log("没有历史对话，显示欢迎消息...");
                    this.displayInitialAssistantMessage();
                    */
                   // --- END MODIFICATION --- 
                }
            } catch (error) {
                console.error("[BaseDifyChatApp Init] Initialization conversation loading/creation failed:", error);
                // 出错时尝试显示欢迎消息作为后备 (或者可以显示错误信息)
                // this.displayInitialAssistantMessage(); 
                this.ui?.showErrorInChat(t('chat.error.loadHistoryFailed', {default: '加载或创建初始对话失败'}));
            }
        } else {
             if (DEBUG) console.log(`[BaseDifyChatApp ${this.constructor.name}] Skipping chat-specific init as user is not logged in.`);
        }
         if (DEBUG) console.log(`[BaseDifyChatApp ${this.constructor.name}] Initialization complete.`);
    }

    // --- Overridden Methods ---

    /**
     * Binds event listeners specific to the chat interface.
     * Overrides BaseDifyApp.bindEvents.
     */
    bindEvents() {
        if (!this.ui || !this.ui.elements) {
            console.error(`[BaseDifyChatApp ${this.constructor.name}] Cannot bind events: UI or elements not initialized.`);
            return;
        }

        const sendButton = this.ui.elements.sendButton;
        const messageInput = this.ui.elements.messageInput;
        const toggleSidebarButton = this.ui.elements.toggleSidebarButton;
        const startNewChatButton = this.ui.elements.startNewChatButton;
        const chatHistoryList = this.ui.elements.chatHistoryList;
        const stopRespondingButton = this.ui.elements.stopRespondingButton; // 获取停止响应按钮

        // Send Button Click
        if (sendButton) {
            sendButton.addEventListener('click', () => {
                if (!this.state.isGenerating && !sendButton.disabled) {
                    this.handleGenerate();
                } else {
                    if (DEBUG) console.log("[BaseDifyChatApp] Send button clicked but ignored (generating or disabled).");
                }
            });
        } else {
            console.warn(`[BaseDifyChatApp ${this.constructor.name}] Send button not found.`);
        }

        // 停止响应按钮点击事件
        if (stopRespondingButton) {
            stopRespondingButton.addEventListener('click', () => {
                this.stopGeneration();
            });
        }

        // Message Input Keydown (Enter to send)
        if (messageInput) {
            messageInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (!this.state.isGenerating && sendButton && !sendButton.disabled) {
                        this.handleGenerate();
                    }
                }
            });
            // Input event for char count/button state is likely handled by ChatUIManager.handleInput
            // Let's ensure ChatUIManager.handleInput is called from init or elsewhere
            messageInput.addEventListener('input', () => this.ui.handleInput()); 
        } else {
            console.warn(`[BaseDifyChatApp ${this.constructor.name}] Message input not found.`);
        }

        // --- Sidebar listeners are already handled in setupSidebarListeners() ---
        // No need to re-bind them here unless consolidating.

        // ---> Bind listeners for ACTION BUTTONS (Copy, Feedback, Regenerate) <--- 
        // REMOVED: This logic is now handled in setupSidebarListeners to avoid duplication
        /*
        const chatMessagesContainer = this.ui.elements.chatMessagesContainer;
        if (chatMessagesContainer) {
            chatMessagesContainer.addEventListener('click', (event) => {
                const targetButton = event.target.closest('.feedback-btn, .copy-message-btn, .regenerate-btn'); // Find the closest action button
                if (!targetButton) return; // Click wasn't on an action button

                const messageId = targetButton.dataset.messageId;
                if (!messageId) return; // Button missing message ID

                if (targetButton.classList.contains('feedback-btn')) {
                    const rating = targetButton.dataset.rating; // 'like' or 'dislike'
                    if (rating) {
                        this.submitFeedback(messageId, rating);
                        // Optional: Visually update button state (e.g., add 'active' class)
                        targetButton.classList.add('active'); // Add some visual feedback
                    }
                } else if (targetButton.classList.contains('copy-message-btn')) {
                    // Copy is handled directly by ChatUIManager's internal listener added in _addMessageActions
                    // No action needed here unless we move the listener logic
                } else if (targetButton.classList.contains('regenerate-btn')) {
                    this.handleRegenerate(messageId);
                }
            });
        }
        */
        
        if (DEBUG) console.log(`[BaseDifyChatApp ${this.constructor.name}] Chat-specific events bound.`);
        
        // Call _bindSpecificEvents for any further subclass bindings
        this._bindSpecificEvents(); 
    }

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
            conversation_id: this.state.difyConversationId || undefined,
            // files: [], // Add file support later if needed
            auto_generate_name: !this.state.difyConversationId // 基于difyConversationId判断是否是新对话
        };
    }

    /**
     * Provides the base callbacks for DifyClient, adapted for ChatUIManager.
     * Expects an assistantMessageId to target updates.
     * --- MODIFIED: Accepts userQuery and isPendingNewConversation for handling delayed creation. ---
     * @param {string} assistantMessageId - The unique ID assigned to the assistant's message placeholder.
     * @param {string} [userQuery] - The initial user query (needed for creating new conv).
     * @param {boolean} [isPendingNewConversation] - Flag indicating if this is the first message of a new conversation.
     * @returns {object} Callbacks for onMessage, onComplete, onError.
     */
    _getBaseCallbacks(assistantMessageId, userQuery, isPendingNewConversation) {
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
                // Find the user message ID which should be the element before the assistant message
                const assistantElement = this.ui.elements.chatMessagesContainer?.querySelector(`.message-wrapper[data-message-id="${assistantMessageId}"]`);
                const userElement = assistantElement?.previousElementSibling;
                const userMessageId = userElement?.dataset.messageId; // Get the user message ID

                // console.log(`Callback onMessage: chunk received for ${assistantMessageId}`);
                this.ui.updateMessageStream(assistantMessageId, content);

                // Set streaming state if it's the first chunk (moved from handleGenerate)
                if (isFirstChunk) {
                    this.ui.setSendButtonState('streaming');
                }
            },
            onComplete: async (metadata) => {
                if (DEBUG) console.log(`Callback onComplete for ${assistantMessageId}. Metadata:`, metadata);
                this.state.isGenerating = false; // Generation complete

                // Find the user message ID again (in case it was not found in onMessage)
                const assistantElement = this.ui.elements.chatMessagesContainer?.querySelector(`.message-wrapper[data-message-id="${assistantMessageId}"]`);
                const userElement = assistantElement?.previousElementSibling;
                const userMessageId = userElement?.dataset.messageId;

                // Get final assistant message content
                const assistantContent = this.ui.streamingMessages.get(assistantMessageId)?.fullContent || '';
                const finalDifyConversationId = metadata?.conversation_id;
                const finalAssistantMessageId = metadata?.message_id || assistantMessageId; // Use Dify's ID if available
                const conversationName = metadata?.name || null; // Dify generated title

                try {
                    if (isPendingNewConversation) {
                        // --- Create New Conversation Logic ---
                        if (DEBUG) console.log(`[BaseDifyChatApp.onComplete] Creating new conversation record.`);
                        if (!userQuery) {
                            console.error("[BaseDifyChatApp.onComplete] Cannot create new conversation: userQuery is missing.");
                            throw new Error("Missing user query for new conversation creation.");
                        }
                        if (!userMessageId) {
                            console.warn("[BaseDifyChatApp.onComplete] Cannot find userMessageId for new conversation. Using a placeholder.");
                            // Potentially generate a fallback ID if needed by ChatHistoryService
                        }

                        // Use Dify's name or generate a fallback title
                        const title = conversationName || (userQuery.length > 20 ? `${userQuery.slice(0, 20)}...` : userQuery) || `Chat ${new Date().toLocaleTimeString()}`;
                        if (DEBUG) console.log(`[BaseDifyChatApp.onComplete] Using title: ${title}`);

                        // Prepare messages array
                        const messagesToSave = [
                            { id: userMessageId || `user-${Date.now()}`, role: 'user', content: userQuery, timestamp: Date.now() - 1000 }, // Approx user time
                            { id: finalAssistantMessageId, role: 'assistant', content: assistantContent, timestamp: Date.now() }
                        ];

                        // Create conversation using ChatHistoryService
                        const newConversation = await ChatHistoryService.createConversation({
                            title: title,
                            messages: messagesToSave,
                            appType: this.appType
                        });

                        if (!newConversation || !newConversation.id) {
                            throw new Error("Failed to create conversation in ChatHistoryService.");
                        }
                        if (DEBUG) console.log(`[BaseDifyChatApp.onComplete] New conversation created locally. ID: ${newConversation.id}, Dify ID: ${finalDifyConversationId}`);

                        // Update state
                        this.state.currentConversationId = newConversation.id; // Use the local ID
                        this.state.difyConversationId = finalDifyConversationId;
                        this.state.isNewConversationPending = false; // No longer pending

                        // Update history list in UI
                        await this.addOrUpdateConversationHistory({
                            id: newConversation.id,
                            title: newConversation.title,
                            last_message_time: Math.floor(Date.now() / 1000),
                            appType: newConversation.appType
                        });
                        // Ensure the new item is selected
                        this.ui?.setActiveHistoryItem(newConversation.id);

                    } else {
                        // --- Update Existing Conversation Logic ---
                        if (DEBUG) console.log(`[BaseDifyChatApp.onComplete] Adding assistant message to existing conversation: ${this.state.currentConversationId}`);
                        if (!this.state.currentConversationId) {
                             console.error("[BaseDifyChatApp.onComplete] Inconsistent state: Not a new conversation, but currentConversationId is missing.");
                             // Handle error - maybe show toast?
                        } else {
                             // Save only the assistant message
                             await this.saveMessageToHistory('assistant', assistantContent, finalAssistantMessageId);

                             // Update Dify conversation ID for next message if it changed
                             if (finalDifyConversationId && finalDifyConversationId !== this.state.difyConversationId) {
                                  if (DEBUG) console.log(`Updating Dify conversation ID from ${this.state.difyConversationId} to: ${finalDifyConversationId}`);
                                  this.state.difyConversationId = finalDifyConversationId;
                             }

                             // If Dify provided a name (unlikely for existing chats, but handle defensively)
                             // and it differs from the current local title, update the local title.
                             if (conversationName) {
                                 const existingConv = this.history.find(h => h.id === this.state.currentConversationId);
                                 if (existingConv && existingConv.title !== conversationName) {
                                     if (DEBUG) console.log(`[BaseDifyChatApp.onComplete] Dify provided a name '${conversationName}' for existing chat ${this.state.currentConversationId}. Updating local title.`);
                                     try {
                                         await ChatHistoryService.updateConversation(this.state.currentConversationId, { title: conversationName });
                                         // Update cache and UI
                                         await this.addOrUpdateConversationHistory({ id: this.state.currentConversationId, title: conversationName });
                                         this.ui?.setActiveHistoryItem(this.state.currentConversationId); // Keep it active
                                     } catch (error) {
                                         console.error("Failed to update existing conversation title based on Dify name:", error);
                                     }
                                 }
                             }
                        }
                    }

                    // Finalize the assistant message in UI (render markdown, add actions etc.)
                    // --- BUG FIX: Pass the *initial* assistantMessageId, not the final one ---
                    // finalizeMessage internally handles updating the element's ID if needed.
                    this.ui?.finalizeMessage(assistantMessageId, metadata);
                    // --- END BUG FIX ---

                    // Fetch suggestions (only if successful and message ID exists)
                    // --- Use the final ID for fetching suggestions, as that's what the API expects ---
                    if (finalAssistantMessageId) {
                         this.fetchAndDisplaySuggestions(finalAssistantMessageId);
                    } else {
                         if (DEBUG) console.log(`[BaseDifyChatApp.onComplete] Skipping suggestion fetch for ${assistantMessageId} because final message ID is missing.`);
                    }

                } catch (error) {
                    console.error("[BaseDifyChatApp.onComplete] Error processing completion callback:", error);
                    this._handleError(error instanceof Error ? error : new Error(String(error)), finalAssistantMessageId || assistantMessageId);
                } finally {
                    // Always reset client and input state, regardless of success/error in processing
                    this.difyClient = null;
                    // Re-enable input
                    if (this.ui?.elements?.messageInput) {
                        this.ui.elements.messageInput.disabled = false;
                        this.ui.elements.messageInput.focus();
                    }
                    // Ensure button state is idle if not handled by error
                    if (!this.state.isGenerating) {
                         this.ui?.setSendButtonState('idle');
                    }
                }
            },
            onError: (error) => {
                 this._handleError(error, assistantMessageId); // Pass the ID for context
                 // Also reset the pending flag if an error occurs during the first message attempt
                 if (isPendingNewConversation) {
                      this.state.isNewConversationPending = false; // Reset flag on error too
                      // Maybe reset currentConversationId as well if it was tentatively set?
                      // this.state.currentConversationId = null; 
                 }
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
     * --- MODIFIED: Delays saving user message for pending new conversations. ---
     */
    async handleGenerate() {
         if (DEBUG) {
             console.log(`[BaseDifyChatApp ${this.constructor.name}] handleGenerate called.`);
             console.log(`[BaseDifyChatApp ${this.constructor.name}] 当前appType=${this.appType || '未设置'}`);
         }

        if (!this.ui || !this.state.apiKey || !this.state.apiEndpoint || !this.state.currentUser) {
            console.error(`[BaseDifyChatApp ${this.constructor.name}] Cannot generate: App not fully initialized or missing config.`);
            this.ui?.showErrorInChat(t(`${this.difyApiKeyName}.initError`, { default: '应用未完全初始化或缺少配置，无法生成。' }));
            return;
        }

        const inputs = this._gatherAndValidateInputs();
        if (!inputs) {
            return; // Validation failed or input empty
        }
        const userQuery = inputs.query; // Store the user query

        // --- MODIFICATION: Check if it's a pending new conversation ---
        const isPendingNewConversation = this.state.isNewConversationPending || !this.state.currentConversationId;
        if (isPendingNewConversation) {
            if (DEBUG) console.log("[BaseDifyChatApp] Handling first message for a pending new conversation.");
        } else {
             if (!this.state.currentConversationId) {
                  console.error("[BaseDifyChatApp] Error: Not a pending new conversation, but currentConversationId is missing!");
                  // Handle this potential error state, perhaps by treating as new?
             }
        }
        // --- END MODIFICATION ---

        // 显示用户消息 (Always show in UI)
        const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        this.ui.addMessage('user', userQuery, userMessageId);
        this.ui.clearInputText(); // 清空输入框

        // --- MODIFICATION: Only save user message immediately for existing conversations ---
        if (!isPendingNewConversation && this.state.currentConversationId) {
             await this.saveMessageToHistory('user', userQuery, userMessageId);
        } else {
             if (DEBUG) console.log("[BaseDifyChatApp] Delaying save of user message for new conversation.");
        }
        // --- END MODIFICATION ---

        // 设置UI为思考状态
        this.ui.setSendButtonState('thinking');
        if (this.ui.elements.messageInput) {
           this.ui.elements.messageInput.disabled = true; // 生成过程中禁用输入
        }
        this.state.isGenerating = true;

        // 添加助手回复的占位符
        const assistantMessageId = `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        this.ui.addMessage('assistant', '', assistantMessageId, 'pending');


        let finalCallbacks = null;

        try {
            // 创建Dify客户端
            if (!this.difyClient) { // 如果不存在则创建（例如，在错误/完成后）
                this.difyClient = new DifyClient({
                    baseUrl: this.state.apiEndpoint,
                    apiKey: this.state.apiKey,
                    mode: this.difyMode,
                    onError: this.state.onError || ((error) => {
                        console.error('[DifyClient Error]', error);
                        this.ui.showError(`Dify Client Error: ${error.message || 'Unknown error'}`);
                    })
                });
            }

            // 构建payload
            const payload = this._buildPayload({ query: userQuery });
             if (!payload) {
                  throw new Error("Failed to build payload internally.");
             }

            // 获取回调函数，传入临时消息ID
            // --- MODIFICATION: Pass userQuery and isPendingNewConversation to callbacks ---
            const baseCallbacks = this._getBaseCallbacks(assistantMessageId, userQuery, isPendingNewConversation);
            // --- END MODIFICATION ---
            const specificCallbacks = this._getSpecificCallbacks(); // 用于潜在的重写
            finalCallbacks = { ...baseCallbacks, ...specificCallbacks };

             // 修改回调以设置'streaming'状态
             const originalOnMessage = finalCallbacks.onMessage;
             // --- MODIFICATION: remove originalOnComplete handling here, move to _getBaseCallbacks ---
             // const originalOnComplete = finalCallbacks.onComplete;
             let streamingStateSet = false;

             finalCallbacks.onMessage = (content, isFirstChunk) => {
                 if (!streamingStateSet) {
                      this.ui.setSendButtonState('streaming');
                      streamingStateSet = true;
                 }
                 if (originalOnMessage) originalOnMessage(content, isFirstChunk);
             };

             // --- REMOVED: Logic moved to _getBaseCallbacks's onComplete wrapper ---
             /*
             // 添加消息保存逻辑到onComplete回调
             finalCallbacks.onComplete = async (metadata) => {
                 if (DEBUG) console.log(`Callback onComplete for ${assistantMessageId}. Metadata:`, metadata);

                 // 保存助手消息到历史记录（使用最终消息ID）
                 const finalMessageId = metadata?.message_id || assistantMessageId;
                 const messageContent = this.ui.streamingMessages.get(assistantMessageId)?.fullContent || '';

                 // 使用DynamoDB保存助手消息
                 await this.saveMessageToHistory('assistant', messageContent, finalMessageId);

                 // 调用原始的onComplete回调
                 if (originalOnComplete) originalOnComplete(metadata);
             };
             */

            if (DEBUG) console.log(`[BaseDifyChatApp ${this.constructor.name}] Calling difyClient.generateStream with payload for message ${assistantMessageId}`);
            // 不使用await，让回调处理完成/错误
             this.difyClient.generateStream(payload, finalCallbacks).catch(err => {
                 console.error("Error directly from generateStream promise:", err);
                 if (finalCallbacks && finalCallbacks.onError) {
                     finalCallbacks.onError(err instanceof Error ? err : new Error(String(err)));
                 }
             });

        } catch (error) {
            console.error(`[BaseDifyChatApp ${this.constructor.name}] Error during generation stream setup or call:`, error);
             // 使用onError回调（现在引用assistantMessageId）
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
                 // --- ADD MARKER FOR OPENING MESSAGE ---
                 msgElement.dataset.messageType = 'opening'; 
                 // --- END MARKER ---
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
             console.warn("[BaseDifyChatApp] Cannot fetch suggestions: missing messageId or config/user.");
             return;
         }

         const suggestionsUrl = `${this.state.apiEndpoint}/messages/${messageId}/suggested?user=${encodeURIComponent(this.state.currentUser.username || 'unknown-user')}`;
         if (DEBUG) console.log(`[BaseDifyChatApp] Fetching suggestions from: ${suggestionsUrl}`); // Added DEBUG log
         
         try {
             const response = await fetch(suggestionsUrl, {
                 method: 'GET',
                 headers: { 'Authorization': `Bearer ${this.state.apiKey}` }
             });

             // --- Modification Start: Log response and adjust error logging --- 
             const responseStatus = response.status;
             const responseOk = response.ok;
             let result = null;

             try {
                 result = await response.json();
                 if (DEBUG) console.log(`[BaseDifyChatApp] Suggestions API response for ${messageId}: Status=${responseStatus}, OK=${responseOk}, Data=`, JSON.stringify(result));
             } catch (jsonError) {
                 // Handle cases where response is not JSON (e.g., empty body for 204, or error page for others)
                 const textResponse = await response.text(); // Try reading as text
                 console.warn(`[BaseDifyChatApp] Suggestions API response for ${messageId} was not valid JSON. Status=${responseStatus}. Body:`, textResponse);
                 if (!responseOk) { // If status was already not ok, throw based on status
                     throw new Error(`HTTP error! status: ${responseStatus}`);
                 }
                 // If status was ok but parsing failed, treat as no suggestions
                 result = { data: [] }; 
             }

             if (!responseOk) {
                 // Log non-critical errors (400, 404) differently
                 if (responseStatus === 400 || responseStatus === 404) {
                     console.log(`[BaseDifyChatApp] Failed to fetch suggestions for message ${messageId}. Status: ${responseStatus} (This might be expected for some apps).`);
                 } else {
                     // Log other errors as warnings
                     console.warn(`[BaseDifyChatApp] Failed to fetch suggestions for message ${messageId}. Status: ${responseStatus}`);
                 }
                 return; // Stop processing if fetch failed
             }
             // --- Modification End ---

             if (result.data && Array.isArray(result.data) && result.data.length > 0) {
                 if (DEBUG) console.log(`[BaseDifyChatApp] Calling ui.displaySuggestedQuestions for ${messageId}`); // Added DEBUG log
                 this.ui?.displaySuggestedQuestions(messageId, result.data);
             } else {
                 if (DEBUG) console.log(`[BaseDifyChatApp] No suggestions data received or data array is empty for ${messageId}.`); // Added DEBUG log
             }
         } catch (error) {
              // Log network errors or unexpected issues as errors
              console.error(`[BaseDifyChatApp] Error during fetchAndDisplaySuggestions for message ${messageId}:`, error);
         }
    }

    /**
     * Handles starting a new chat session.
     * --- MODIFIED: Does NOT create backend record immediately. ---
     */
    startNewConversation() {
        console.log("[BaseDifyChatApp] Starting new conversation (UI only)...");
        if (this.state.isGenerating && this.difyClient) {
             console.log("[BaseDifyChatApp] Stopping current generation before starting new chat.");
             this.stopGeneration(); // 先停止任何正在进行的生成
         }

        // --- MODIFIED: Remove backend creation, only reset state & UI ---
        // Reset state
        this.state.currentConversationId = null;
        this.state.difyConversationId = null; // Reset Dify ID for the new chat
        this.state.isNewConversationPending = true; // Mark that a new conversation is pending storage

        // Update UI
        this.ui?.clearChatArea();
        this.ui?.setActiveHistoryItem(null); // Deselect history item
        this.displayInitialAssistantMessage(); // Show welcome message
        if (this.ui?.elements?.messageInput) this.ui.elements.messageInput.focus();

        console.log("[BaseDifyChatApp] New conversation UI setup complete, pending first message to save.");
        // --- END MODIFICATION ---
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
         
         try {
             // 使用ChatHistoryService加载对话详情
             const conversation = await ChatHistoryService.getConversation(conversationId);
             
             if (!conversation) {
                 throw new Error(`Conversation ${conversationId} not found`);
             }
             
             // 设置当前对话ID和UI状态
             this.state.currentConversationId = conversationId;
             // 重置Dify会话ID，避免使用之前对话的ID
             this.state.difyConversationId = null;
             // 清空聊天区域
             this.ui?.clearChatArea();
             // 设置活动的历史项
             this.ui?.setActiveHistoryItem(conversationId);
             
             const messages = conversation.messages || [];
             
             if (messages.length > 0) {
                 // 显示所有消息
                 messages.forEach(msg => {
                     if (msg.role === 'user') {
                         this.ui?.addMessage('user', msg.content, msg.id, 'complete');
                     } else if (msg.role === 'assistant') {
                         // 创建助手消息元素
                         const assistantMsgElement = this.ui?.addMessage('assistant', msg.content, msg.id, 'pending');
                         if (assistantMsgElement) {
                             // 处理Markdown渲染：确保调用finalizeMessage，但先为这个消息创建一个流记录
                             // 这样finalizeMessage就会正确处理内容而不是将其视为普通HTML
                             if (!this.ui.streamingMessages.has(msg.id)) {
                                 this.ui.streamingMessages.set(msg.id, {
                                     element: assistantMsgElement,
                                     fullContent: msg.content || ''
                                 });
                             }
                             // 完成消息（添加操作按钮等）并渲染Markdown
                             this.ui?.finalizeMessage(msg.id);
                         }
                     }
                 });
                 
                 // 如果最后一条是用户消息，尝试获取Dify会话ID
                 const lastMessage = messages[messages.length - 1];
                 if (lastMessage.role === 'user') {
                     // 最后一条是用户消息，无需特殊处理。
                     // Dify API 会在下次用户发送消息时自动处理会话。
                     // 只需要确保 this.state.difyConversationId 在加载对话时被重置 (已在前面完成)。
                     console.log("最后一条是用户消息，等待用户输入以继续对话。");
                     // this.state.difyConversationId = null; // 确保 Dify 会话 ID 已重置 (在前面已做)
                 } else {
                     // 如果最后一条是助手消息，则表示对话已完成
                     // 不需要恢复Dify会话，用户下一条消息会创建新的上下文
                     console.log("最后一条是助手消息，继续对话将创建新的Dify会话");
                 }
             } else {
                 // 空对话，显示欢迎消息
                 this.displayInitialAssistantMessage();
             }
             
             // 滚动到底部确保用户看到最新消息
             setTimeout(() => this.ui?.scrollToBottom(), 100);
             
         } catch (error) {
             console.error(`Error loading messages for conversation ${conversationId}:`, error);
             this.ui?.showErrorInChat(t('chat.error.loadMessagesFailed', { default: '加载历史消息失败' }));
             
             // 显示欢迎消息作为后备
             this.displayInitialAssistantMessage();
             
             // 重要：如果对话加载失败，清除这个ID，避免后续操作继续使用无效ID
             if (this.state.currentConversationId === conversationId) {
                 this.state.currentConversationId = null;
             }
         }
     }

    /**
     * Loads chat history from storage or API (placeholder implementation).
     */
    async loadChatHistory() {
        try {
            console.log("[BaseDifyChatApp.loadChatHistory] 开始加载聊天历史记录...");
            
            // 使用ChatHistoryService获取历史记录
            this.history = await ChatHistoryService.getConversationList();
            console.log(`[BaseDifyChatApp.loadChatHistory] 成功加载 ${this.history.length} 条历史记录。`);
            
            // 如果有重复的对话ID，清理一下
            const uniqueIds = new Set();
            this.history = this.history.filter(conv => {
                if (uniqueIds.has(conv.id)) return false;
                uniqueIds.add(conv.id);
                return true;
            });
            
            // 更新UI侧边栏
            this.ui?.updateHistoryList(this.history);
            return this.history;
        } catch (error) {
            console.error("[BaseDifyChatApp.loadChatHistory] 加载聊天历史时出错:", error);
            // 加载失败时使用空数组更新UI
            this.history = [];
            this.ui?.updateHistoryList([]);
            return [];
        }
    }

    /**
     * Adds or updates a conversation in the history list.
     * @param {object} conversationData - 至少包含 { id, title } 的对话数据对象
     */
    async addOrUpdateConversationHistory(conversationData) {
        if (!conversationData || !conversationData.id) {
            console.error("[BaseDifyChatApp.addOrUpdateConversationHistory] 无效的对话数据:", conversationData);
            return;
        }
        if (DEBUG) console.log(`[BaseDifyChatApp.addOrUpdateConversationHistory] Received data:`, JSON.stringify(conversationData)); // Added DEBUG log

        try {
            // 确保所有对话数据使用统一的title字段
            if (conversationData.name && !conversationData.title) {
                conversationData.title = conversationData.name;
                delete conversationData.name; // 移除name字段，统一使用title
            }

            // 更新内部缓存
            const existingIndex = this.history.findIndex(h => h.id === conversationData.id);
            if (existingIndex > -1) {
                // 更新现有记录
                this.history[existingIndex] = { 
                    ...this.history[existingIndex], 
                    ...conversationData,
                    // 如果未提供last_message_time，则使用当前时间
                    last_message_time: conversationData.last_message_time || Math.floor(Date.now() / 1000)
                };
                
                if (DEBUG) console.log(`[BaseDifyChatApp.addOrUpdateConversationHistory] 更新对话 ${conversationData.id}，appType=${conversationData.appType || this.history[existingIndex].appType || 'undefined'}`);
            } else {
                // 添加新记录到顶部，确保包含appType
                const newConversationData = { 
                    ...conversationData,
                    last_message_time: conversationData.last_message_time || Math.floor(Date.now() / 1000),
                    appType: conversationData.appType || this.appType // 如果没有appType则使用当前appType
                };
                
                this.history.unshift(newConversationData);
                
                if (DEBUG) console.log(`[BaseDifyChatApp.addOrUpdateConversationHistory] 添加新对话 ${conversationData.id}，appType=${newConversationData.appType || 'undefined'}`);
            }
            
            // 排序（最新的在前）
            this.history.sort((a, b) => (b.last_message_time || 0) - (a.last_message_time || 0));
            if (DEBUG) console.log(`[BaseDifyChatApp.addOrUpdateConversationHistory] History sorted. Calling updateHistoryList.`); // Added DEBUG log
            
            // 更新UI
            this.ui?.updateHistoryList(this.history);
            
            // 当这是一个新对话被创建时，设置为当前活动对话
            if (existingIndex === -1 && conversationData.id === this.state.currentConversationId) {
                this.ui?.setActiveHistoryItem(conversationData.id);
            }
            
            if (DEBUG) console.log(`[BaseDifyChatApp.addOrUpdateConversationHistory] 历史记录已更新，当前共 ${this.history.length} 条。`);
        } catch (error) {
            console.error("[BaseDifyChatApp.addOrUpdateConversationHistory] 更新历史记录时出错:", error);
        }
    }

    /**
     * 保存**现有**对话消息到DynamoDB.
     * 当添加新消息到已存在的对话时调用此方法，确保对话内容被持久化。
     * --- MODIFIED: This function now ONLY handles ADDING messages to EXISTING conversations. ---
     * --- Creating new conversations is handled in the onComplete callback. ---
     * @param {string} role - 消息发送者角色 ('user' 或 'assistant')
     * @param {string} content - 消息内容
     * @param {string} messageId - 消息ID
     * @returns {Promise<void>}
     */
    async saveMessageToHistory(role, content, messageId) {
        // --- MODIFIED: Check if currentConversationId exists. If not, do nothing (should be handled by onComplete). ---
        if (!this.state.currentConversationId) {
            console.warn("[BaseDifyChatApp.saveMessageToHistory] Called without a currentConversationId. Aborting save. New conversation creation should happen in onComplete.");
            return;
        }
        // --- END MODIFICATION ---

        // 现有对话，添加消息
        if (DEBUG) console.log(`[BaseDifyChatApp.saveMessageToHistory] 向对话 ${this.state.currentConversationId} 添加消息...`);

        try {
            // 创建消息对象
            const message = {
                id: messageId,
                role,
                content,
                timestamp: Date.now()
            };

            // 添加消息到现有对话
            const updatedConversation = await ChatHistoryService.addMessage(
                this.state.currentConversationId,
                message
            );

            if (updatedConversation) {
                if (DEBUG) console.log(`[BaseDifyChatApp.saveMessageToHistory] 消息添加成功，对话 ${updatedConversation.id} 现在有 ${updatedConversation.messages.length} 条消息。`);

                // 更新历史记录列表，保留appType字段
                await this.addOrUpdateConversationHistory({
                    id: updatedConversation.id,
                    title: updatedConversation.title,
                    last_message_time: Math.floor(Date.now() / 1000),
                    appType: updatedConversation.appType || this.appType // 保留现有appType或使用当前appType
                });
            } else {
                 // Handle case where addMessage might fail but not throw
                 console.error(`[BaseDifyChatApp.saveMessageToHistory] ChatHistoryService.addMessage did not return an updated conversation for ID: ${this.state.currentConversationId}`);
            }
        } catch (error) {
            console.error(`[BaseDifyChatApp.saveMessageToHistory] 向对话 ${this.state.currentConversationId} 添加消息失败:`, error);
            // Optionally show a toast message?
            // this.ui?.showToast(t('chat.error.saveMessageFailed', { default: '保存消息失败' }), 'error');
        }
    }

    /**
     * 删除指定的对话历史记录.
     * @param {string} conversationId - 要删除的对话ID
     * @returns {Promise<boolean>} - 删除是否成功
     */
    async deleteConversation(conversationId) {
        if (!conversationId) {
            console.error("[BaseDifyChatApp.deleteConversation] 未提供对话ID");
            return false;
        }
        
        try {
            // 调用服务删除对话
            const success = await ChatHistoryService.deleteConversation(conversationId);
            
            if (success) {
                console.log(`[BaseDifyChatApp.deleteConversation] 对话 ${conversationId} 删除成功`);
                
                // 更新内部缓存，在UI更新前先移除此对话
                this.history = this.history.filter(h => h.id !== conversationId);
                
                // 如果删除的是当前对话，处理UI和状态
                const isCurrentConversation = this.state.currentConversationId === conversationId;
                if (isCurrentConversation) {
                    // 重置状态
                    this.state.currentConversationId = null;
                    this.state.difyConversationId = null;
                    
                    // 检查是否还有其他对话
                    if (this.history.length > 0) {
                        // 有其他对话，加载最新的一个（排序后的第一个）
                        console.log(`[BaseDifyChatApp.deleteConversation] 自动切换到最新对话`);
                        const latestConversation = this.history[0];
                        // 先更新UI历史列表
                        this.ui?.updateHistoryList(this.history);
                        // 然后加载最新对话
                        await this.loadConversationMessages(latestConversation.id);
                    } else {
                        // 没有其他对话，创建新对话界面
                        console.log(`[BaseDifyChatApp.deleteConversation] 没有其他对话，创建新对话界面`);
                        this.ui?.clearChatArea();
                        // 更新UI历史列表（清空）
                        this.ui?.updateHistoryList([]);
                        // 显示欢迎消息，准备新对话
                        this.displayInitialAssistantMessage();
                    }
                } else {
                    // 不是当前对话，只需更新UI列表
                    this.ui?.updateHistoryList(this.history);
                }
                
                return true;
            } else {
                console.error(`[BaseDifyChatApp.deleteConversation] 删除对话 ${conversationId} 失败`);
                return false;
            }
        } catch (error) {
            console.error(`[BaseDifyChatApp.deleteConversation] 删除对话 ${conversationId} 时出错:`, error);
            return false;
        }
    }

    /**
     * 重命名对话
     * @param {string} conversationId - 要重命名的对话ID
     * @param {string} newTitle - 新的对话标题
     * @returns {Promise<boolean>} - 重命名是否成功
     */
    async renameConversation(conversationId, newTitle) {
        if (!conversationId) {
            console.error("[BaseDifyChatApp.renameConversation] 未提供对话ID");
            return false;
        }
        
        if (!newTitle || newTitle.trim() === '') {
            console.error("[BaseDifyChatApp.renameConversation] 新标题为空");
            return false;
        }
        
        try {
            // 使用ChatHistoryService更新对话标题
            const result = await ChatHistoryService.updateConversation(conversationId, {
                title: newTitle
            });
            
            if (result) {
                console.log(`[BaseDifyChatApp.renameConversation] 对话 ${conversationId} 重命名成功为: ${newTitle}`);
                
                // 更新内存中的历史记录
                const existingIndex = this.history.findIndex(h => h.id === conversationId);
                if (existingIndex > -1) {
                    this.history[existingIndex] = {
                        ...this.history[existingIndex],
                        title: newTitle
                    };
                    
                    // 更新UI
                    this.ui?.updateHistoryList(this.history);
                    
                    // 如果是当前选中的对话，更新活跃状态
                    if (this.state.currentConversationId === conversationId) {
                        this.ui?.setActiveHistoryItem(conversationId);
                    }
                }
                
                return true;
            } else {
                console.error(`[BaseDifyChatApp.renameConversation] 重命名对话 ${conversationId} 失败`);
                return false;
            }
        } catch (error) {
            console.error(`[BaseDifyChatApp.renameConversation] 重命名对话 ${conversationId} 时出错:`, error);
            return false;
        }
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
             // --- MODIFICATION: Prevent rapid clicks ---
             if (this.state.isStartingNewChat) {
                 console.warn("[BaseDifyChatApp] Ignoring rapid click on Start New Chat button.");
                 return;
             }
             this.state.isStartingNewChat = true;
             try {
                  this.startNewConversation();
             } finally {
                 // Reset the flag after a short delay to allow UI updates but prevent immediate re-clicks
                 setTimeout(() => { this.state.isStartingNewChat = false; }, 500);
             }
             // --- END MODIFICATION ---
         });

         // History list item clicks (using event delegation)
         this.ui.elements.chatHistoryList?.addEventListener('click', async (e) => {
             console.log('[DEBUG Sidebar Click] Click event on chatHistoryList triggered.'); // 日志 1
             console.log('[DEBUG Sidebar Click] Target element:', e.target); // 日志 2
             
             const renameBtn = e.target.closest('.rename-btn'); // 修正选择器: 移除 -history
             const deleteBtn = e.target.closest('.delete-btn'); // 修正选择器: 移除 -history
             console.log('[DEBUG Sidebar Click] renameBtn found:', renameBtn); // 日志 3.1
             console.log('[DEBUG Sidebar Click] deleteBtn found:', deleteBtn); // 日志 3.2

             // 如果点击的是重命名按钮
             if (renameBtn) {
                 console.log('[DEBUG Sidebar Click] Clicked Rename button.');
                 e.stopPropagation(); // 阻止冒泡到history item
                 const historyItem = e.target.closest('.history-item'); // 修正选择器
                 console.log('[DEBUG Sidebar Click] Found historyItem for rename:', historyItem); // 日志 4.1
                 const convId = historyItem?.dataset.id; // 从 data-id 获取对话ID
                 console.log('[DEBUG Sidebar Click] Extracted convId for rename:', convId); // 日志 5.1
                 
                 if (convId) {
                     console.log('[DEBUG Sidebar Click] Entering rename logic...'); // 日志 6.1
                     // 获取当前标题
                     const existingConv = this.history.find(h => h.id === convId);
                     const currentTitle = existingConv?.title || '';
                     
                     // 弹出对话框让用户输入新标题
                     const newTitle = prompt(t('chat.enterNewTitle', { default: '请输入新的对话标题' }), currentTitle);
                     
                     // 如果用户取消或输入为空，不执行重命名
                     if (newTitle === null || newTitle.trim() === '') {
                         return;
                     }
                     
                     try {
                         const success = await this.renameConversation(convId, newTitle);
                         if (success) {
                             this.ui.showToast(t('chat.conversationRenamed', { default: '对话已重命名' }), 'success');
                         }
                     } catch (error) {
                         console.error('Error renaming conversation:', error);
                         this.ui.showToast(t('chat.error.renameConversationFailed', { default: '重命名对话失败' }), 'error');
                     }
                     return;
                 }
             }
             
             // 如果点击的是删除按钮
             if (deleteBtn) {
                 console.log('[DEBUG Sidebar Click] Clicked Delete button.');
                 e.stopPropagation(); // 阻止冒泡到history item
                 const historyItem = e.target.closest('.history-item'); // 修正选择器
                 console.log('[DEBUG Sidebar Click] Found historyItem for delete:', historyItem); // 日志 4.2
                 const convId = historyItem?.dataset.id; // 从 data-id 获取对话ID
                 console.log('[DEBUG Sidebar Click] Extracted convId for delete:', convId); // 日志 5.2
                 
                 if (convId) {
                     console.log('[DEBUG Sidebar Click] Entering delete logic...'); // 日志 6.2
                     // 显示确认对话框 - 修复: 使用全局t函数而不是this.t
                     if (confirm(t('chat.confirmDeleteConversation', { default: '确定要删除这个对话吗？此操作不可撤销。' }))) {
                         try {
                             const success = await this.deleteConversation(convId);
                             if (success) {
                                 this.ui.showToast(t('chat.conversationDeleted', { default: '对话已删除' }), 'success');
                             }
                         } catch (error) {
                             console.error('Error deleting conversation:', error);
                             this.ui.showToast(t('chat.error.deleteConversationFailed', { default: '删除对话失败' }), 'error');
                         }
                     }
                     return;
                 }
             }
             
             // 常规点击（加载对话） - 仅在未点击按钮时执行
             if (!renameBtn && !deleteBtn) {
                 console.log('[DEBUG Sidebar Click] Handling regular item click.');
                 const historyItem = e.target.closest('.history-item'); // 修正选择器
                 console.log('[DEBUG Sidebar Click] Found historyItem for load:', historyItem); // 日志 4.3
                 const convId = historyItem?.dataset.id; // 从 data-id 获取对话ID
                 console.log('[DEBUG Sidebar Click] Extracted convId for load:', convId); // 日志 5.3
                 if (convId && convId !== this.state.currentConversationId) {
                     console.log('[DEBUG Sidebar Click] Entering load conversation logic...'); // 日志 6.3
                     this.loadConversationMessages(convId);
                     // Collapse sidebar on mobile after selection
                      if (window.innerWidth <= 768 && this.ui.elements.sidebar && !this.ui.elements.sidebar.classList.contains('collapsed')) {
                          this.ui.toggleSidebar(); // Use the UI method
                      }
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
                    return; // Stop further processing if it was a suggestion click
               }

               // Feedback Button Click
               const feedbackButton = e.target.closest('.feedback-btn');
               if (feedbackButton) {
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
                    return; // Stop further processing if it was a feedback click
               }

               // --- Regenerate Button Click --- 
               const regenerateButton = e.target.closest('.regenerate-btn');
               if (regenerateButton) {
                    const messageId = regenerateButton.dataset.messageId;
                    if (messageId) {
                        this.handleRegenerate(messageId);
                    }
                    return; // Stop further processing
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
         const feedbackButton = this.ui?.elements.chatMessagesContainer?.querySelector(`.feedback-btn[data-message-id="${messageId}"][data-rating="${rating}"]`);

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
                  // --- FIX: Ensure visual state is updated correctly on success --- 
                  if (feedbackButton) {
                      // Remove selected from sibling buttons
                      feedbackButton.parentElement?.querySelectorAll('.feedback-btn').forEach(sib => {
                          if (sib !== feedbackButton) sib.classList.remove('selected');
                      });
                      // Add selected to the clicked button
                      feedbackButton.classList.add('selected');
                  }
                  // --- END FIX ---
              } else {
                   throw new Error("Feedback API did not return success.");
              }
         } catch (error) {
              console.error(`[${this.constructor.name}] Error submitting feedback for message ${messageId}:`, error);
               this.ui?.showToast(t('chat.error.feedbackFailed', { default: '提交反馈失败' }) + `: ${error.message}`, 'error');
               // Revert button visual state on error
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

    // --- Regeneration Logic ---

    /**
     * Handles the regeneration request for a specific assistant message.
     * @param {string} assistantMsgId - The ID of the assistant message to regenerate.
     */
    async handleRegenerate(assistantMsgId) {
        if (DEBUG) console.log(`[BaseDifyChatApp ${this.constructor.name}] handleRegenerate called for message: ${assistantMsgId}`);

        if (!this.ui || !this.state.apiKey || !this.state.apiEndpoint || !this.state.currentUser || !this.state.currentConversationId) {
            console.error(`[BaseDifyChatApp ${this.constructor.name}] Cannot regenerate: App not fully initialized, missing config, or conversation ID.`);
            this.ui?.showErrorInChat(t('chat.error.regenerateInitFailed', { default: '无法重新生成：应用未初始化或缺少必要信息。' }), assistantMsgId);
            return;
        }

        if (this.state.isGenerating) {
            console.warn(`[BaseDifyChatApp ${this.constructor.name}] Regeneration request ignored: Another generation is already in progress.`);
             this.ui?.showToast(t('chat.error.alreadyGenerating', { default: '请等待当前响应完成。'}), 'warning');
            return;
        }

        // 1. Find the assistant message element
        const assistantMessageElement = this.ui.elements.chatMessagesContainer?.querySelector(`.message-wrapper[data-message-id="${assistantMsgId}"]`);
        if (!assistantMessageElement) {
            console.error(`[BaseDifyChatApp ${this.constructor.name}] Cannot regenerate: Assistant message element with ID ${assistantMsgId} not found.`);
            this.ui?.showToast(t('chat.error.regenerateMessageNotFound', { default: '找不到要重新生成的消息。'}), 'error');
            return;
        }

        // 2. Find the preceding user message and extract query
        let userQuery = null;
        let currentUserMessageElement = assistantMessageElement.previousElementSibling;
        while (currentUserMessageElement) {
            if (currentUserMessageElement.classList.contains('user-message')) {
                const contentElement = currentUserMessageElement.querySelector('.message-content');
                // Prefer innerText to avoid including hidden elements or complex HTML structure
                userQuery = contentElement?.innerText?.trim();
                break; // Found the user message
            }
            currentUserMessageElement = currentUserMessageElement.previousElementSibling;
        }

        if (!userQuery) {
            console.error(`[BaseDifyChatApp ${this.constructor.name}] Cannot regenerate: Could not find preceding user query for message ${assistantMsgId}.`);
            this.ui?.showErrorInChat(t('chat.error.regenerateQueryNotFound', { default: '无法找到对应的用户问题以重新生成。' }), assistantMsgId);
            return;
        }

        console.log(`[BaseDifyChatApp ${this.constructor.name}] Found user query for regeneration:`, userQuery);

        // Set UI to regenerating state for the specific message
        // Need to implement this in ChatUIManager first
        if (this.ui.setMessageState) { 
            this.ui.setMessageState(assistantMsgId, 'regenerating'); 
        } else {
            console.warn("[BaseDifyChatApp] ui.setMessageState is not available yet.");
            // Basic fallback: maybe just disable buttons?
            assistantMessageElement.querySelectorAll('.message-actions button').forEach(btn => btn.disabled = true);
        }

        this.state.isGenerating = true; // Prevent other actions

        try {
            // Create Dify client if needed
            if (!this.difyClient) {
                 this.difyClient = new DifyClient({
                     baseUrl: this.state.apiEndpoint,
                     apiKey: this.state.apiKey,
                     mode: this.difyMode,
                     // No onError here, we use callbacks
                 });
            }

            // Build payload (use found userQuery, current conversationId)
            const payload = this._buildPayload({ query: userQuery }); // Use existing _buildPayload
             if (!payload) {
                  throw new Error("Failed to build payload internally for regeneration.");
             }
             // Ensure auto_generate_name is false for regeneration
             payload.auto_generate_name = false; 

            // Get Callbacks adapted for regeneration
            const callbacks = this._getRegenerationCallbacks(assistantMsgId);

            console.log(`[BaseDifyChatApp ${this.constructor.name}] Calling difyClient.generateStream for regeneration, targeting message ${assistantMsgId}`);

            // Call API (Don't await here, let callbacks handle completion/error)
             this.difyClient.generateStream(payload, callbacks).catch(err => {
                 // Safety catch for errors before streaming or unexpected promise rejections
                 console.error("Error directly from generateStream promise during regeneration:", err);
                 if (callbacks && callbacks.onError) {
                     callbacks.onError(err instanceof Error ? err : new Error(String(err)));
                 }
             });

        } catch (error) {
             console.error(`[BaseDifyChatApp ${this.constructor.name}] Error during regeneration stream setup or call:`, error);
             // Use the onError callback if possible, otherwise handle directly
             const errorCallback = this._getRegenerationCallbacks(assistantMsgId)?.onError || ((err) => this._handleRegenerationError(err, assistantMsgId));
             errorCallback(error);
        } 
        // Note: isGenerating state reset is handled within the callbacks (onComplete/onError)
    }

    /**
     * Provides callbacks specifically adapted for regenerating a message.
     * @param {string} assistantMessageId - The ID of the message being regenerated.
     * @returns {object} Callbacks for onMessage, onComplete, onError.
     */
    _getRegenerationCallbacks(assistantMessageId) {
        if (!this.ui) {
            console.error("Cannot get regeneration callbacks: ChatUIManager not initialized.");
            return {};
        }
        if (!assistantMessageId) {
            console.error("Cannot get regeneration callbacks: assistantMessageId is required.");
            return {};
        }

        let firstChunkReceived = false;

        return {
            onMessage: (content, isFirstChunk) => {
                if (!firstChunkReceived) {
                    // Optionally clear the old content visually on first chunk
                    // if (this.ui.clearMessageContent) this.ui.clearMessageContent(assistantMessageId); 
                     if (this.ui.setMessageState) this.ui.setMessageState(assistantMessageId, 'streaming'); // Update state visually
                    firstChunkReceived = true;
                }
                this.ui.updateMessageStream(assistantMessageId, content);
            },
            onComplete: (metadata) => {
                console.log(`Regeneration onComplete for ${assistantMessageId}. Metadata:`, metadata);
                // Finalize the message bubble (will re-render content and add actions)
                // If Dify returns a new ID for the regenerated message, finalizeMessage handles updating the element's dataset
                const finalMessageId = metadata?.message_id || assistantMessageId;
                 // Pass the original ID used for lookup, finalizeMessage handles the potential new ID from metadata internally
                this.ui.finalizeMessage(assistantMessageId, metadata); 
                if (this.ui.setMessageState) this.ui.setMessageState(finalMessageId, 'complete'); // Ensure final state is set using the final ID

                // Handle suggested questions for the *regenerated* message
                this.fetchAndDisplaySuggestions(finalMessageId);

                // Reset general state
                this.difyClient = null;
                this.state.isGenerating = false;

                 // Re-enable main input (if it was globally disabled)
                 if (this.ui.elements.messageInput) {
                     this.ui.elements.messageInput.disabled = false;
                 }
            },
            onError: (error) => {
                 this._handleRegenerationError(error, assistantMessageId);
            }
        };
    }

    /**
     * Handles errors specifically during the regeneration process.
     * @param {Error} error - The error object.
     * @param {string} assistantMessageId - The ID of the message being regenerated.
     */
    _handleRegenerationError(error, assistantMessageId) {
        console.error(`[${this.constructor.name}] Error during regeneration for message ${assistantMessageId}:`, error);

        const errorMsg = error.name === 'AbortError'
           ? t('common.generationStoppedByUser', { default: '生成已由用户停止。' })
           : t('chat.error.regenerateFailed', { default: '重新生成失败:'}) + ` ${error.message}`;

        // Show error within the specific message context
        if (this.ui?.showErrorInChat) {
           this.ui.showErrorInChat(errorMsg, assistantMessageId);
           if (this.ui.setMessageState) this.ui.setMessageState(assistantMessageId, 'error'); // Set visual error state
        } else {
           // Fallback alert
           alert(errorMsg);
        }

        // Reset general state
        this.difyClient = null;
        this.state.isGenerating = false;

        // Re-enable main input
        if (this.ui?.elements?.messageInput) {
           this.ui.elements.messageInput.disabled = false;
        }
    }

}

export default BaseDifyChatApp; 