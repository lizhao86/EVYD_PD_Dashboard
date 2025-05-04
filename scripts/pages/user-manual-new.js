// scripts/pages/user-manual-new.js

// 导入通用模块
import { configureAmplify } from '/scripts/amplify-config.js';
import Header from '../../modules/common/header.js';
import { getCurrentUserSettings } from '/scripts/services/storage.js';
import I18n from '../i18n.js'; // 保持默认导入
// import UserManualNewApp from '../../modules/apps/user-manual-new/index.js';

// 确保 Amplify 配置在所有其他代码之前完成
configureAmplify();

// --- Helper function to display messages ---
function displayMessage(text, sender, isThinking = false) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('message-wrapper', `${sender}-message`);
    
    // Remove previous thinking message if adding a real one
    if (!isThinking && sender === 'bot') {
        const thinkingMsg = messagesContainer.querySelector('.thinking');
        if (thinkingMsg) thinkingMsg.remove();
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

// DOM 加载完成后执行初始化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[DEBUG] DOMContentLoaded event fired.'); // <-- 日志 1: 监听器触发
    
    try {
        console.log('[DEBUG] Configuring Amplify...'); // <-- 日志 2: Amplify 配置前
        configureAmplify();
        console.log('[DEBUG] Amplify configured.');

        console.log('[DEBUG] Initializing I18n...'); // <-- 日志 3: i18n 初始化前
        await I18n.init();
        console.log('[DEBUG] I18n initialized.');

        console.log('[DEBUG] Initializing Header...'); // <-- 日志 4: Header 初始化前
        await Header.init();
        console.log('[DEBUG] Header initialized.');

        console.log('[DEBUG] Checking user settings...'); // <-- 日志 5: 用户检查前
        const userSettings = await getCurrentUserSettings();
        if (!userSettings) {
            console.warn('[DEBUG] User not logged in or settings not available.');
            const main = document.querySelector('main');
            if (main) {
                const errorDiv = document.createElement('div');
                errorDiv.style = 'padding: 20px; text-align: center; color: red; background-color: #ffeeee; border: 1px solid red; border-radius: 5px; margin: 10px;';
                errorDiv.textContent = '请先登录以使用此功能。';
                main.insertBefore(errorDiv, main.firstChild);
            }
             document.documentElement.classList.remove('i18n-loading');
             document.body.style.display = 'block';
            return; // Exit early if not logged in
        }
        console.log('[DEBUG] User settings checked.');

        console.log('[DEBUG] Calling initializeChatInterfaceInteractions...'); // <-- 日志 6: 调用交互初始化前
        initializeChatInterfaceInteractions();
        console.log('[DEBUG] Returned from initializeChatInterfaceInteractions.'); // <-- 日志 7: 调用交互初始化后

        console.log('[DEBUG] Calling initializeInputArea...'); // <-- 日志 8: 调用输入区初始化前
        initializeInputArea();
        console.log('[DEBUG] Returned from initializeInputArea.'); // <-- 日志 9: 调用输入区初始化后

        console.log('[DEBUG] Page initialization complete.'); // <-- 日志 10: 初始化成功结束
        
    } catch (error) {
        console.error('[DEBUG] Error during DOMContentLoaded initialization:', error); // <-- 日志 11: 捕获到错误
        const errorDiv = document.createElement('div');
        errorDiv.style = 'padding: 20px; text-align: center; color: red; background-color: #ffeeee; border: 1px solid red; border-radius: 5px; margin: 10px;';
        errorDiv.textContent = `页面初始化失败: ${error.message}`;
        
        const main = document.querySelector('main');
        if (main) {
            main.insertBefore(errorDiv, main.firstChild);
        }
    } finally {
         console.log('[DEBUG] DOMContentLoaded finally block executing.'); // <-- 日志 12: finally 块
        // Ensure content is visible after potential i18n loading hide
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

// --- Input Area Initialization ---
function initializeInputArea() {
    console.log('[DEBUG] ENTERING initializeInputArea'); // Add entry log
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const charCount = document.getElementById('char-count');
    const charCountLimit = 4000; // Define character limit

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
            sendButton.click(); // Trigger the send button's click handler
        } else if (e.key === 'Enter' && !e.shiftKey && sendButton.disabled) {
            console.log('[DEBUG] Enter pressed without Shift, but button is disabled.'); // Log disabled case
            e.preventDefault(); // Prevent newline even if disabled
        }
    });
     console.log('[DEBUG] \'keydown\' event listener attached.');

    if(sendButton) {
        console.log('[DEBUG] Attempting to add \'click\' event listener to sendButton.');
        sendButton.addEventListener('click', () => {
            console.log('[DEBUG] <<< Send button CLICKED >>>'); // Clearer log
             if (!messageInput) return; // Guard clause

            if (!messageInput.value.trim() || messageInput.value.length > charCountLimit) {
                console.warn('[DEBUG] Send button clicked but input is invalid or limit exceeded.');
                return;
            }

            const messageText = messageInput.value.trim();
            console.log('[DEBUG] Preparing to display user message:', messageText);

            // 1. Display user message in the chat
            displayMessage(messageText, 'user');

            // 2. Clear the input field and reset state
            messageInput.value = '';
            updateInputState(); // Reset char count, button state, and textarea height
            console.log('[DEBUG] Input cleared and state updated after send.');

            // 3. TODO: Trigger the actual API call
            // ...
        });
         console.log('[DEBUG] Send button click listener attached.');
    }

    console.log('[DEBUG] Input area initialization sequence complete.');
    console.log('[DEBUG] EXITING initializeInputArea');
}