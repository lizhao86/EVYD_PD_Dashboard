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

        // Instantiate ChatUIManager instead of DifyAppUI
        // Pass dependencies here
        this.ui = new ChatUIManager({ t, marked });

        // Reset specific state for chat apps
        this.state.currentConversationId = null;
        
        // 添加history属性用于缓存历史记录列表
        this.history = [];
    }

    /**
     * Initializes the chat application.
     * Extends base initialization and sets up chat-specific UI and event listeners.
     */
    async init() {
        console.log(`[BaseDifyChatApp ${this.constructor.name}] Initializing...`);
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
                    console.log("自动加载最新对话...");
                    const latestConversation = this.history[0]; // 因为已经按时间排序，第一个是最新的
                    await this.loadConversationMessages(latestConversation.id);
                } else {
                    // 只有在没有历史对话时才显示初始欢迎消息
                    console.log("没有历史对话，显示欢迎消息...");
                    this.displayInitialAssistantMessage();
                }
            } catch (error) {
                console.error("初始化对话加载失败:", error);
                // 出错时显示欢迎消息作为后备
                this.displayInitialAssistantMessage();
            }
        } else {
             console.log(`[BaseDifyChatApp ${this.constructor.name}] Skipping chat-specific init as user is not logged in.`);
        }
         console.log(`[BaseDifyChatApp ${this.constructor.name}] Initialization complete.`);
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

        // Send Button Click
        if (sendButton) {
            sendButton.addEventListener('click', () => {
                if (!this.state.isGenerating && !sendButton.disabled) {
                    this.handleGenerate();
                } else {
                    console.log("[BaseDifyChatApp] Send button clicked but ignored (generating or disabled).");
                }
            });
        } else {
            console.warn(`[BaseDifyChatApp ${this.constructor.name}] Send button not found.`);
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
        
        console.log(`[BaseDifyChatApp ${this.constructor.name}] Chat-specific events bound.`);
        
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
            onComplete: async (metadata) => {
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
                    // 更新当前会话ID
                    this.state.currentConversationId = metadata.conversation_id;
                    // 保存Dify会话ID
                    this.state.difyConversationId = metadata.conversation_id;
                    // 设置当前活跃的历史项
                    this.ui?.setActiveHistoryItem(this.state.currentConversationId);
                    
                    // 获取Dify生成的对话名称
                    let conversationName = metadata.name || null;
                    if (conversationName) {
                        console.log(`Dify自动生成的对话标题: ${conversationName}`);
                        
                        // 如果已经有对话记录，更新对话标题（只更新当前对话，不创建新的）
                        try {
                            // 更新对话标题
                            await ChatHistoryService.updateConversation(this.state.currentConversationId, {
                                title: conversationName
                            });
                            console.log(`更新对话标题成功: ${conversationName}`);
                            
                            // 只更新UI和内存中的状态，不创建新记录
                            // 重要：在这里我们确保只更新已存在的对话，不添加新记录
                            const existingIndex = this.history.findIndex(h => h.id === metadata.conversation_id);
                            if (existingIndex > -1) {
                                // 只更新已存在的记录
                                this.history[existingIndex] = {
                                    ...this.history[existingIndex],
                                    title: conversationName,
                                    last_message_time: Math.floor(Date.now() / 1000)
                                };
                                
                                // 重新排序（最新的在前）
                                this.history.sort((a, b) => (b.last_message_time || 0) - (a.last_message_time || 0));
                                
                                // 更新UI
                                this.ui?.updateHistoryList(this.history);
                                console.log(`[BaseDifyChatApp.onComplete] 已更新现有历史记录，当前共 ${this.history.length} 条。`);
                            } else {
                                console.warn(`[BaseDifyChatApp.onComplete] 找不到要更新的历史记录ID: ${metadata.conversation_id}`);
                            }
                        } catch (error) {
                            console.error("更新对话标题失败:", error);
                        }
                    }
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

        // 检查是否需要创建新对话（只有在用户未选择任何对话且未手动点击新对话时）
        if (!this.state.currentConversationId && !this.state.difyConversationId) {
            console.log("首次发送消息，自动创建新对话...");
            // 这是一个自动创建的对话，不做特殊处理
        }

        // 显示用户消息
        const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        this.ui.addMessage('user', inputs.query, userMessageId);
        const userQuery = inputs.query; // 保留用户输入的副本
        this.ui.clearInputText(); // 清空输入框

        // 保存用户消息到历史记录
        await this.saveMessageToHistory('user', userQuery, userMessageId);

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
                    baseUrl: '/api/v1',
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
            const baseCallbacks = this._getBaseCallbacks(assistantMessageId);
            const specificCallbacks = this._getSpecificCallbacks(); // 用于潜在的重写
            finalCallbacks = { ...baseCallbacks, ...specificCallbacks };

             // 修改回调以设置'streaming'状态
             const originalOnMessage = finalCallbacks.onMessage;
             const originalOnComplete = finalCallbacks.onComplete;
             let streamingStateSet = false;
             
             finalCallbacks.onMessage = (content, isFirstChunk) => {
                 if (!streamingStateSet) {
                      this.ui.setSendButtonState('streaming');
                      streamingStateSet = true;
                 }
                 if (originalOnMessage) originalOnMessage(content, isFirstChunk);
             };
             
             // 添加消息保存逻辑到onComplete回调
             finalCallbacks.onComplete = async (metadata) => {
                 console.log(`Callback onComplete for ${assistantMessageId}. Metadata:`, metadata);
                 
                 // 保存助手消息到历史记录（使用最终消息ID）
                 const finalMessageId = metadata?.message_id || assistantMessageId;
                 const messageContent = this.ui.streamingMessages.get(assistantMessageId)?.fullContent || '';
                 
                 // 使用DynamoDB保存助手消息
                 await this.saveMessageToHistory('assistant', messageContent, finalMessageId);
                 
                 // 调用原始的onComplete回调
                 if (originalOnComplete) originalOnComplete(metadata);
             };

            console.log(`[BaseDifyChatApp ${this.constructor.name}] Calling difyClient.generateStream with payload for message ${assistantMessageId}`);
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

        const paramsUrl = '/api/v1/parameters';
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
             console.warn("Cannot fetch suggestions: missing messageId or config/user.");
             return;
         }

         const suggestionsUrl = '/api/v1/messages/' + messageId + '/suggested?user=' + encodeURIComponent(this.state.currentUser.username || 'unknown-user');
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
             this.stopGeneration(); // 先停止任何正在进行的生成
         }
        // 重置状态
        this.state.currentConversationId = null;
        this.state.difyConversationId = null; // 同时重置Dify对话ID
        // 清空聊天区域
        this.ui?.clearChatArea();
        // 从侧边栏取消选中所有历史项
        this.ui?.setActiveHistoryItem(null);
        // 显示欢迎语
        this.displayInitialAssistantMessage();
        // 聚焦输入框
        if (this.ui?.elements?.messageInput) this.ui.elements.messageInput.focus();
        // 标记这是一个用户明确请求的新对话
        console.log("用户主动创建新对话");
        
        // 重要：不要在此时创建新的对话记录，等到用户发送第一条消息时再创建
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
                     console.log("最后一条是用户消息，尝试向Dify创建新会话以继续对话");
                     // 这里不需要使用历史消息，只需要最新的用户消息来创建新会话
                     try {
                         // 从Dify API获取新的会话ID
                         const difyConversationId = await this._createNewDifyConversation(lastMessage.content);
                         
                         if (difyConversationId) {
                             console.log(`创建新的Dify会话ID成功: ${difyConversationId}`);
                             // 保存到状态，让后续交互能够在同一Dify对话中进行
                             this.state.difyConversationId = difyConversationId;
                         } else {
                             console.warn("无法为现有对话创建新的Dify会话");
                         }
                     } catch (difyError) {
                         console.error("创建Dify会话时出错:", difyError);
                         this.ui?.showErrorInChat("无法创建新的会话上下文，您可能需要发送新消息来开始新对话");
                     }
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
     * 创建新的Dify会话（改进版）
     * @param {string} userQuery - 用户查询
     * @private
     */
    async _createNewDifyConversation(userQuery) {
        if (!userQuery || !this.state.apiKey) {
            console.warn("创建新Dify会话失败：缺少用户查询或API密钥");
            return null;
        }
        
        try {
            // 创建一个临时DifyClient实例
            const tempClient = new DifyClient({
                baseUrl: '/api/v1',
                apiKey: this.state.apiKey,
                mode: this.difyMode
            });
            
            // 使用阻塞模式创建新会话
            console.log("正在使用用户消息创建新的Dify会话:", userQuery);
            const response = await tempClient.generateBlocking({
                query: userQuery,
                user: this.state.currentUser.username || 'unknown-user',
                response_mode: 'blocking',
                auto_generate_name: true // 自动生成会话名称
            });
            
            if (response?.conversation_id) {
                console.log("成功创建Dify会话ID:", response.conversation_id);
                return response.conversation_id;
            } else {
                console.warn("创建会话响应缺少conversation_id:", response);
                return null;
            }
        } catch (error) {
            console.error("创建Dify会话时出错:", error);
            throw error;
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
            } else {
                // 添加新记录到顶部
                this.history.unshift({ 
                    ...conversationData,
                    last_message_time: conversationData.last_message_time || Math.floor(Date.now() / 1000)
                });
            }
            
            // 排序（最新的在前）
            this.history.sort((a, b) => (b.last_message_time || 0) - (a.last_message_time || 0));
            
            // 更新UI
            this.ui?.updateHistoryList(this.history);
            
            // 当这是一个新对话被创建时，设置为当前活动对话
            if (existingIndex === -1 && conversationData.id === this.state.currentConversationId) {
                this.ui?.setActiveHistoryItem(conversationData.id);
            }
            
            console.log(`[BaseDifyChatApp.addOrUpdateConversationHistory] 历史记录已更新，当前共 ${this.history.length} 条。`);
        } catch (error) {
            console.error("[BaseDifyChatApp.addOrUpdateConversationHistory] 更新历史记录时出错:", error);
        }
    }

    /**
     * 保存当前对话消息到DynamoDB.
     * 当添加新消息时调用此方法，确保对话内容被持久化。
     * @param {string} role - 消息发送者角色 ('user' 或 'assistant')
     * @param {string} content - 消息内容
     * @param {string} messageId - 消息ID
     * @returns {Promise<void>}
     */
    async saveMessageToHistory(role, content, messageId) {
        // 如果没有conversation_id，表示这是新对话的第一条消息
        if (!this.state.currentConversationId) {
            console.log("[BaseDifyChatApp.saveMessageToHistory] 创建新对话...");
            // 创建临时标题，后续将被Dify生成的标题替换
            // 从用户消息创建标题（如果是用户消息）
            const title = role === 'user' 
                ? (content.length > 20 ? `${content.slice(0, 20)}...` : content)
                : `对话 ${new Date().toLocaleDateString()}`;
            
            // 创建消息对象
            const message = {
                id: messageId,
                role,
                content,
                timestamp: Date.now()
            };
            
            try {
                // 创建新对话
                const newConversation = await ChatHistoryService.createConversation({
                    title,
                    messages: [message]
                });
                
                if (newConversation) {
                    console.log(`[BaseDifyChatApp.saveMessageToHistory] 新对话创建成功, ID: ${newConversation.id}`);
                    // 更新当前对话ID（这可能会被后续的Dify API响应中的conversation_id覆盖）
                    this.state.currentConversationId = newConversation.id;
                    
                    // 更新历史记录列表和UI
                    await this.addOrUpdateConversationHistory({
                        id: newConversation.id,
                        title: newConversation.title,
                        last_message_time: Math.floor(Date.now() / 1000)
                    });
                    
                    // 设置活跃历史项
                    this.ui?.setActiveHistoryItem(newConversation.id);
                }
            } catch (error) {
                console.error("[BaseDifyChatApp.saveMessageToHistory] 创建新对话失败:", error);
            }
        } else {
            // 现有对话，添加消息
            console.log(`[BaseDifyChatApp.saveMessageToHistory] 向对话 ${this.state.currentConversationId} 添加消息...`);
            
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
                    console.log(`[BaseDifyChatApp.saveMessageToHistory] 消息添加成功，对话 ${updatedConversation.id} 现在有 ${updatedConversation.messages.length} 条消息。`);
                    
                    // 更新历史记录列表
                    await this.addOrUpdateConversationHistory({
                        id: updatedConversation.id,
                        title: updatedConversation.title,
                        last_message_time: Math.floor(Date.now() / 1000)
                    });
                }
            } catch (error) {
                console.error(`[BaseDifyChatApp.saveMessageToHistory] 向对话 ${this.state.currentConversationId} 添加消息失败:`, error);
            }
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
             this.startNewConversation();
         });

         // History list item clicks (using event delegation)
         this.ui.elements.chatHistoryList?.addEventListener('click', async (e) => {
             // 如果点击的是重命名按钮
             if (e.target.closest('.rename-history-btn')) {
                 e.stopPropagation(); // 阻止冒泡到history item
                 const historyItem = e.target.closest('.chat-history-item');
                 const convId = historyItem?.dataset.conversationId;
                 
                 if (convId) {
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
             if (e.target.closest('.delete-history-btn')) {
                 e.stopPropagation(); // 阻止冒泡到history item
                 const historyItem = e.target.closest('.chat-history-item');
                 const convId = historyItem?.dataset.conversationId;
                 
                 if (convId) {
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
             
             // 常规点击（加载对话）
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

         const feedbackUrl = '/api/v1/messages/' + messageId + '/feedbacks';
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
        console.log(`[BaseDifyChatApp ${this.constructor.name}] handleRegenerate called for message: ${assistantMsgId}`);

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
                     baseUrl: '/api/v1', // Use proxy
                     apiKey: this.state.apiKey,
                     mode: this.difyMode
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