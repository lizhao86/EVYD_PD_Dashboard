// scripts/pages/user-manual-new.js

// 导入通用模块
import { configureAmplify } from '/scripts/amplify-config.js';
import Header from '../../modules/common/header.js';
import { getCurrentUserSettings } from '/scripts/services/storage.js';
import I18n, { t } from '../i18n.js'; // 保持默认导入
import { marked } from 'marked'; // Ensure marked is imported if not already global
// import UserManualNewApp from '../../modules/apps/user-manual-new/index.js';

// ---> MOVE IMPORTS FOR BASE CLASS AND UI HERE <---
import BaseDifyApp from '../../modules/common/base-dify-app.js';
import DifyAppUI from '../../modules/common/dify-app-ui.js';

// ---> MOVE CLASS DEFINITION TO TOP LEVEL <--
class UserManualChatApp extends BaseDifyApp {
    constructor() {
        super();
        this.difyApiKeyName = 'userManual';
        this.difyMode = 'chat';
        this.mainInputElementId = 'message-input';
        // Instantiate UI Helper *inside* the constructor or init, ensuring dependencies (t, marked) are ready
        // We'll instantiate it properly inside its init method later if needed, or pass t/marked
        // console.log(`[UserManualChatApp] Instance created. Mode: ${this.difyMode}, KeyName: ${this.difyApiKeyName}`);
         this.ui = null; // Initialize ui as null
    }
    
    // Override BaseDifyApp's init to instantiate UI here
    async init() {
        // Instantiate UI helper here, ensuring t and marked are available
         this.ui = new DifyAppUI({ t, marked });
         // Call the original BaseDifyApp init AFTER UI is ready
         await super.init();
         console.log("[UserManualChatApp] Child init completed.");
    }

    _gatherAndValidateInputs() {
        console.log(`[UserManualChatApp] _gatherAndValidateInputs called.`); // <-- Log G1
        const inputElement = document.getElementById(this.mainInputElementId);
        const value = inputElement ? inputElement.value.trim() : '';
        console.log(`[UserManualChatApp] Input value: "${value ? value.substring(0,30)+'...' : ''}"`); // <-- Log G2

        if (!value) { 
             console.warn('[UserManualChatApp] No input provided.'); // <-- Log G4 (Error Case)
            this.ui?.showToast(t('chat.error.emptyInput', { default: '请输入消息内容' }), 'warning');
            return null; 
        }
        const charCountLimit = 4000;
        if (value.length > charCountLimit) { 
             console.warn('[UserManualChatApp] Input too long.'); // <-- Log G5 (Error Case)
             this.ui?.showToast(t('chat.error.inputTooLong', { default: '输入内容过长' }), 'warning');
             return null; 
        }

        console.log(`[UserManualChatApp] Input validation passed.`); // <-- Log G3
        return { query: value };
    }

    _buildPayload(inputs) {
        console.log(`[UserManualChatApp] _buildPayload called with inputs:`, inputs);
        if (!this.state.currentUser || !inputs || !inputs.query) { 
             console.error('[UserManualChatApp] Cannot build payload: missing user or query.');
            return null;
        }
        const payload = {
            inputs: {
                query: inputs.query
            },
            user: this.state.currentUser.username || 'unknown-user',
            response_mode: 'streaming',
        };
        if (this.state.currentConversationId) { 
            payload.conversation_id = this.state.currentConversationId; 
        }
         console.log(`[UserManualChatApp] Payload built:`, payload);
        return payload;
    }

    _getBaseCallbacks() {
        let botMessageContainer = null;
        let accumulatedContent = ""; // Accumulate content for final rendering

        return {
            onMessage: (content, isFirstChunk) => {
                 if (isFirstChunk) {
                     // console.log("[Chat Callback] First chunk received.");
                     accumulatedContent = ""; // Reset accumulator
                     botMessageContainer = displayMessage("", 'bot', true);
                 }
                 if (botMessageContainer) {
                     const contentDiv = botMessageContainer.querySelector('.message-content');
                     if (contentDiv) {
                         if (contentDiv.classList.contains('thinking')) {
                             contentDiv.innerHTML = '';
                             contentDiv.classList.remove('thinking');
                         }
                         accumulatedContent += content; // Accumulate raw content
                         // Live rendering can be problematic with partial markdown, render basic text for now
                         // For smoother experience, only render fully at the end.
                         // To show *something*, update textContent during stream:
                         contentDiv.textContent = accumulatedContent; // Display raw text during stream
                          // Scroll while streaming
                          const messagesContainer = document.getElementById('chat-messages');
                          if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
                     }
                 }
            },
            onComplete: (metadata) => {
                 // console.log("[Chat Callback] Stream completed. Metadata:", metadata);
                 if (botMessageContainer) {
                     const contentDiv = botMessageContainer.querySelector('.message-content');
                      if (contentDiv && typeof marked !== 'undefined') {
                          try {
                              // Render the *accumulated* content as Markdown
                              const finalHtml = marked.parse(accumulatedContent, { breaks: true, gfm: true });
                              contentDiv.innerHTML = finalHtml;
                              const messagesContainer = document.getElementById('chat-messages');
                               if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
                          } catch(e) {
                               console.error("Final markdown render error:", e);
                               contentDiv.textContent = accumulatedContent; // Fallback to text
                          }
                      }
                 } else if (metadata?.nodeOutputText) {
                     displayMessage(metadata.nodeOutputText, 'bot');
                 }
                 this._handleCompletion(metadata); // Call base handler
            },
            onError: (error) => {
                 this._handleError(error);
            },
            onWorkflowStarted: (data) => {
                 // console.log("[Chat Callback] Workflow Started:", data);
                 this.state.currentConversationId = null;
                 if (!botMessageContainer) {
                      botMessageContainer = displayMessage("", 'bot', true);
                 }
             },
              onNodeStarted: (data) => {
                 // console.log(`[Chat Callback] Node Started: ${data?.data?.node_id} - ${data?.data?.node_type}`);
                  if (!botMessageContainer) {
                       botMessageContainer = displayMessage("", 'bot', true);
                  }
              },
        };
    }

    // Override _handleCompletion if needed, otherwise base class handles it
     _handleCompletion(metadata) {
         super._handleCompletion(metadata); // Call base implementation first
          console.log(`[UserManualChatApp] Completion handled. Conv ID: ${this.state.currentConversationId}`);
          // Add any chat-specific completion logic here if needed
     }

     // Override _handleError if needed, otherwise base class handles it
     _handleError(error) {
         // Remove thinking message if present (moved from base callback)
         const thinkingMsg = document.getElementById('chat-messages')?.querySelector('.thinking');
         if (thinkingMsg) thinkingMsg.closest('.message-wrapper')?.remove();
         
         super._handleError(error); // Call base implementation
         // Add chat-specific error display if needed (base already calls displayMessage now)
          console.log(`[UserManualChatApp] Error handled.`);
     }
}
// ---> END NEW CLASS DEFINITION <--

// --- Helper function to display messages ---
function displayMessage(text, sender, isThinking = false) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return null; // Return null if container not found

    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('message-wrapper', `${sender}-message`);
    
    // Remove previous thinking message if adding a real one
    if (!isThinking && sender === 'bot') {
        const thinkingMsg = messagesContainer.querySelector('.thinking');
        if (thinkingMsg) thinkingMsg.closest('.message-wrapper')?.remove(); // Remove the whole wrapper
    }

    // Avatar
    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar', `${sender}-avatar`);
    const avatarImg = document.createElement('img');
    avatarImg.src = sender === 'user' ? '/assets/icons/user-avatar.svg' : '/assets/icons/robot-avatar.svg';
    avatarImg.alt = `${sender} Avatar`;
    avatar.appendChild(avatarImg);

    // Content Wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content-wrapper');

    // Content Bubble
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
     if (isThinking) {
         contentDiv.classList.add('thinking'); // Add class for styling thinking state
         contentDiv.innerHTML = '<span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>'; // Simple dots animation
     } else {
         // Render markdown for bot messages, plain text for user
         if (sender === 'bot') {
             try {
                  // Assume marked is globally available or passed via UI class
                 contentDiv.innerHTML = marked.parse(text, { breaks: true, gfm: true }); 
             } catch (e) {
                  console.error('Markdown parsing error:', e);
                 contentDiv.textContent = text; // Fallback to text
             }
         } else {
             const p = document.createElement('p');
             p.textContent = text;
             contentDiv.appendChild(p);
         }
     }
    contentWrapper.appendChild(contentDiv);

    // Actions (only for non-thinking bot messages)
    if (sender === 'bot' && !isThinking) {
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('message-actions');
        actionsDiv.innerHTML = `
            <button class="btn-icon feedback-btn thumbs-up" aria-label="Like">👍</button>
            <button class="btn-icon feedback-btn thumbs-down" aria-label="Dislike">👎</button>
        `;
        contentWrapper.appendChild(actionsDiv);
    }

    // Assemble message
    if (sender === 'user') {
        messageWrapper.appendChild(contentWrapper); // Content first for user
        messageWrapper.appendChild(avatar);
    } else {
        messageWrapper.appendChild(avatar); // Avatar first for bot
        messageWrapper.appendChild(contentWrapper);
    }

    messagesContainer.appendChild(messageWrapper);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Apply translations if needed (especially if new elements have data-translate)
    I18n.applyTranslations(messageWrapper);
    
    return messageWrapper; // Return the created element
}

// Add simple CSS for thinking dots (can be moved to CSS file)
const style = document.createElement('style');
style.textContent = `
.thinking-dots span {
  animation: blink 1.4s infinite both;
  display: inline-block;
  margin: 0 1px;
  font-size: 1.2em;
  line-height: 1;
}
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0% { opacity: .2; } 20% { opacity: 1; } 100% { opacity: .2; } }
.message-content.thinking { font-style: italic; color: var(--gray-500); }
`;
document.head.appendChild(style);

// ---> Input Area Initialization - NO CHANGES NEEDED HERE <---
function initializeInputArea(chatAppInstance) { // Accepts app instance
    console.log('[DEBUG] ENTERING initializeInputArea');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const charCount = document.getElementById('char-count');
    const charCountLimit = 4000;

    // Enhanced Element Check
    if (!messageInput) {
        console.error('[DEBUG] CRITICAL: #message-input not found!');
        return; // Stop if essential input is missing
    } else {
        console.log('[DEBUG] #message-input found:', messageInput);
    }
    if (!sendButton) {
        console.warn('[DEBUG] #send-button not found!');
        // Continue if only button missing, but log it
    } else {
         console.log('[DEBUG] #send-button found:', sendButton);
    }
    if (!charCount) {
        console.warn('[DEBUG] #char-count not found!');
        // Continue if only count missing, but log it
    } else {
        console.log('[DEBUG] #char-count found:', charCount);
    }

    if (!messageInput || !sendButton || !charCount || !chatAppInstance) { // Check instance
        console.error('[DEBUG] Input area elements or chatAppInstance missing!');
        return;
    }

    // Function to update button state and char count
    const updateInputState = () => {
        // console.log('[DEBUG] updateInputState called.'); // Keep this if needed for detailed flow

        // Add checks inside the handler too, in case elements become invalid later
        if (!messageInput || !sendButton || !charCount) {
             console.error('[DEBUG] updateInputState: One or more elements are missing!');
             return;
        }

        const value = messageInput.value;
        const count = value.length;
        const isDisabled = !value.trim() || count > charCountLimit;
        // console.log(`[DEBUG] updateInputState - Count: ${count}, Limit: ${charCountLimit}, Disabled: ${isDisabled}`);

        sendButton.disabled = isDisabled; // Try setting disabled directly
        charCount.textContent = `${count}/${charCountLimit}`;
        charCount.classList.toggle('warning', count > charCountLimit);

        // Auto-resize textarea
        // console.log('[DEBUG] updateInputState - Adjusting height. Current height:', messageInput.style.height, 'Scroll height:', messageInput.scrollHeight);
        try {
            messageInput.style.height = 'auto'; // Reset height first
            const newHeight = Math.min(messageInput.scrollHeight, 150); // 150px is max-height in CSS
            messageInput.style.height = `${newHeight}px`;
           // console.log('[DEBUG] updateInputState - New height set to:', messageInput.style.height);
        } catch (e) {
            console.error('[DEBUG] Error during height adjustment:', e);
        }
    };

    // Initial state update immediately after finding elements
    console.log('[DEBUG] Performing initial input state update.');
    updateInputState();

    // Add event listeners
    console.log('[DEBUG] Attempting to add \'input\' event listener to messageInput.');
    messageInput.addEventListener('input', () => {
        console.log('[DEBUG] <<< \'input\' event FIRED on messageInput >>>'); // Clearer log
        updateInputState();
    });
    console.log('[DEBUG] \'input\' event listener attached.');

    console.log('[DEBUG] Attempting to add \'keydown\' event listener to messageInput.');
    messageInput.addEventListener('keydown', (e) => {
        console.log(`[DEBUG] <<< \'keydown\' event FIRED. Key: ${e.key}, Shift: ${e.shiftKey} >>>`); // Clearer log
        if (!sendButton) return; // Guard clause if button is missing
        if (e.key === 'Enter' && !e.shiftKey && !sendButton.disabled) {
            console.log('[DEBUG] Enter pressed without Shift, triggering send.'); // Log Enter press
            e.preventDefault();
            sendButton.click(); // Trigger the button's click handler
        } else if (e.key === 'Enter' && !e.shiftKey && sendButton.disabled) {
            console.log('[DEBUG] Enter pressed without Shift, but button is disabled.'); // Log disabled case
            e.preventDefault(); // Prevent newline even if disabled
        }
    });
     console.log("[DEBUG] 'keydown' event listener attached."); // Use double quotes for the outer string

    if(sendButton) {
        console.log('[DEBUG] Attempting to add \'click\' event listener to sendButton.');
        sendButton.addEventListener('click', async () => {
            console.log('[DEBUG] <<< Send button CLICKED >>>'); // Clearer log
             if (!messageInput) return;

            const messageText = messageInput.value.trim();

            if (!messageText || messageText.length > charCountLimit) {
                console.warn('[DEBUG] Send button clicked but input is invalid or limit exceeded.');
                return;
            }

            // 1. Display user message IMMEDIATELY
            displayMessage(messageText, 'user');

            // 2. Clear input and update state BEFORE starting generation
            messageInput.value = '';
            updateInputState();
            messageInput.focus(); // Keep focus on input

            // 3. Call the handleGenerate method of the app instance
            // console.log('[DEBUG] Calling chatApp.handleGenerate()');
            try {
                await chatAppInstance.handleGenerate();
            } catch (e) {
                 console.error("Error caught during handleGenerate call:", e);
                  // UI should be reset by the error handler in chatAppInstance
            }
        });
         console.log('[DEBUG] Send button click listener attached.');
    }

    console.log('[DEBUG] Input area initialization sequence complete.');
    console.log('[DEBUG] EXITING initializeInputArea');
}

// ---> MODIFY DOMContentLoaded Listener AGAIN for correct order <---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[DEBUG] DOMContentLoaded event fired.');
    let chatApp = null;

    try {
        console.log('[DEBUG] Configuring Amplify...');
        configureAmplify();
        console.log('[DEBUG] Amplify configured.');

        console.log('[DEBUG] Initializing I18n...');
        await I18n.init();
        console.log('[DEBUG] I18n initialized.');

        console.log('[DEBUG] Initializing Header...');
        await Header.init(); // Includes user check
        console.log('[DEBUG] Header initialized.');

        if (!Header.currentUser) {
            console.warn('[DEBUG] User not logged in after Header init. Stopping.');
            document.documentElement.classList.remove('i18n-loading');
            document.body.style.display = 'block';
            return;
        }
        console.log('[DEBUG] User is logged in:', Header.currentUser.username);

        // ---> Instantiate the Chat App <--- 
        console.log('[DEBUG] Instantiating UserManualChatApp...');
        chatApp = new UserManualChatApp();
        console.log('[DEBUG] UserManualChatApp instantiated.');

        // ---> Initialize the Chat App instance <--- 
        // BaseDifyApp.init will now handle UI init and app info display again
        console.log('[DEBUG] Initializing UserManualChatApp instance (BaseDifyApp.init)...');
        await chatApp.init(); 
        console.log('[DEBUG] UserManualChatApp instance initialized (BaseDifyApp.init completed).');

        // ---> Initialize Interactions AFTER BaseDifyApp.init <--- 
        console.log('[DEBUG] Calling initializeChatInterfaceInteractions...');
        initializeChatInterfaceInteractions();
        console.log('[DEBUG] Returned from initializeChatInterfaceInteractions.');

        // ---> Initialize Input Area AFTER BaseDifyApp.init <--- 
        console.log('[DEBUG] Calling initializeInputArea...');
        initializeInputArea(chatApp); // Still pass the instance
        console.log('[DEBUG] Returned from initializeInputArea.');

        console.log('[DEBUG] Page initialization complete.');
        
    } catch (error) {
        console.error('[DEBUG] Error during DOMContentLoaded initialization:', error);
        const errorDiv = document.createElement('div');
        errorDiv.style = 'padding: 20px; text-align: center; color: red; background-color: #ffeeee; border: 1px solid red; border-radius: 5px; margin: 10px;';
        // Display the specific error message caught
        errorDiv.textContent = `页面初始化失败: ${error.message}`;
        const main = document.querySelector('main');
        if (main) {
            // Insert error at the very top of main content for visibility
            main.insertBefore(errorDiv, main.firstChild);
        } else {
            // Fallback if main isn't found
            document.body.insertAdjacentElement('afterbegin', errorDiv);
        }
    } finally {
         console.log('[DEBUG] DOMContentLoaded finally block executing.');
         document.documentElement.classList.remove('i18n-loading');
         document.body.style.display = 'block';
    }
});

// --- Chat Interface Interactions ---
function initializeChatInterfaceInteractions() {
    console.log('[DEBUG] ENTERING initializeChatInterfaceInteractions');

    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const chatHistoryList = document.getElementById('chat-history');

    // --- Sidebar Toggle ---
    console.log('[DEBUG] Sidebar element:', sidebar);
    console.log('[DEBUG] Toggle button element:', toggleSidebarBtn);

    if (toggleSidebarBtn && sidebar) {
        // REMOVE/COMMENT OUT check for localStorage on load
        /*
        if (localStorage.getItem('sidebar-collapsed') === 'true') {
            sidebar.classList.add('collapsed');
            console.log('[DEBUG] Sidebar collapsed on load from localStorage.');
        }
        */
       // Ensure sidebar is initially expanded by removing collapsed class if present
       sidebar.classList.remove('collapsed');
       console.log('[DEBUG] Sidebar ensured to be expanded on load.');

        // Keep the event listener to allow toggling and saving state
        toggleSidebarBtn.addEventListener('click', () => {
            console.log('[DEBUG] Toggle sidebar button clicked!');
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
            console.log('[DEBUG] Sidebar toggled. Collapsed:', sidebar.classList.contains('collapsed'));
        });
        console.log('[DEBUG] Sidebar toggle button event listener added.');
    } else {
        if (!sidebar) console.warn('[DEBUG] Sidebar element (#sidebar) not found.');
        if (!toggleSidebarBtn) console.warn('[DEBUG] Toggle sidebar button (#toggle-sidebar) not found.');
    }

    // --- Chat History Selection ---
    if (chatHistoryList) {
         console.log('[DEBUG] Chat history list element found:', chatHistoryList); // <-- 检查历史列表元素
         chatHistoryList.addEventListener('click', (event) => {
            const clickedItem = event.target.closest('.chat-history-item');
            if (clickedItem && !clickedItem.classList.contains('active')) {
                // Remove active class from all items
                const allItems = chatHistoryList.querySelectorAll('.chat-history-item');
                allItems.forEach(item => item.classList.remove('active'));

                // Add active class to the clicked item
                clickedItem.classList.add('active');
                // console.log('Chat history item selected:', clickedItem.textContent.trim());

                // TODO: Add logic here to load the actual chat conversation based on the selected item.
                // For now, it just visually selects the item.

                // Collapse sidebar on mobile after selection
                if (window.innerWidth <= 768 && sidebar && !sidebar.classList.contains('collapsed')) {
                   sidebar.classList.add('collapsed');
                   localStorage.setItem('sidebar-collapsed', 'true');
                   // console.log('Sidebar collapsed on mobile after selection.');
                }
            }
        });
         console.log('[DEBUG] Chat history click event listener added.'); // <-- 确认监听器已添加
     } else {
         console.warn('[DEBUG] Chat history list element (#chat-history) not found.');
     }

    // --- New Chat Button ---
     const newChatBtn = document.getElementById('start-new-chat');
     if (newChatBtn && chatHistoryList && sidebar) {
          console.log('[DEBUG] New chat button element found:', newChatBtn); // <-- 检查新建按钮元素
          newChatBtn.addEventListener('click', () => {
             console.log('New chat button clicked.');
             // 1. Clear current messages (keep welcome maybe?)
             const chatMessages = document.getElementById('chat-messages');
             if (chatMessages) {
                  // Example: Clear all messages for now
                  chatMessages.innerHTML = `
                      <div class="message-wrapper bot-message">
                           <div class="message-avatar bot-avatar">
                                <img src="/assets/icons/robot-avatar.svg" alt="Bot Avatar" />
                           </div>
                           <div class="message-content-wrapper">
                               <div class="message-content">
                                   <p data-translate="chat.welcomeMessage">你好！我是用户手册 AI 助手。请告诉我你的用户故事和验收标准，我来帮你撰写用户手册章节。</p>
                               </div>
                               <div class="message-actions">
                                   <button class="btn-icon feedback-btn thumbs-up" aria-label="Like">👍</button>
                                   <button class="btn-icon feedback-btn thumbs-down" aria-label="Dislike">👎</button>
                               </div>
                          </div>
                     </div>`;
                  // Re-apply translations if necessary
                   I18n.applyTranslations(chatMessages);
                   console.log('Chat messages reset to welcome message.');
             }

             // 2. Deactivate current history item and add a new active one
             const allItems = chatHistoryList.querySelectorAll('.chat-history-item');
             allItems.forEach(item => item.classList.remove('active'));

             const newItem = document.createElement('div');
             newItem.className = 'chat-history-item active'; // Make the new one active
             // Use textContent for security, or carefully sanitize if using innerHTML
             newItem.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon history-item-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <span>${t('chat.newConversation', { default: 'New Conversation' })}</span>`;
             chatHistoryList.prepend(newItem); // Add to the top
             console.log('New chat history item added and activated.');
             
             // TODO: Clear conversation ID in the state (e.g., this.state.currentConversationId = null;)
             // This should be handled within the App class instance when integrated.

             // 3. Expand sidebar if collapsed
             if (sidebar.classList.contains('collapsed')) {
                 sidebar.classList.remove('collapsed');
                 localStorage.setItem('sidebar-collapsed', 'false');
                 // console.log('Sidebar expanded for new chat.');
             }
         });
          console.log('[DEBUG] New chat button event listener added.'); // <-- 确认监听器已添加
      } else {
          if (!newChatBtn) console.warn('[DEBUG] New chat button (#start-new-chat) not found.');
          if (!chatHistoryList && !newChatBtn) console.warn('[DEBUG] Chat history list element (#chat-history) not found.'); // Only warn if button exists but list doesn\'t
          if (!sidebar && !newChatBtn) console.warn('[DEBUG] Sidebar element (#sidebar) not found.'); // Only warn if button exists but sidebar doesn\'t
      }
    console.log('[DEBUG] EXITING initializeChatInterfaceInteractions');
}