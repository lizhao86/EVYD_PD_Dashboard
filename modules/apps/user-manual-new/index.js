import BaseDifyApp from '../../common/base-dify-app.js';
import I18n, { t } from '/scripts/i18n.js'; // 修改为同时导入I18n对象和t函数
import DifyClient from '../../common/dify-client.js'; // 导入DifyClient
// 使用全局marked或提供fallback
const markedLib = window.marked || { parse: text => text };

// 确保t函数存在，否则提供一个fallback
const translate = typeof t === 'function' ? t : (key, options) => {
    // 简单的fallback，在t不可用时返回key或默认值
    return options && options.default ? options.default : key;
};

class UserManualNewApp extends BaseDifyApp {
    constructor() {
        super(); // 调用基类构造函数

        // --- 聊天应用的特定配置 ---
        this.difyApiKeyName = 'userManual'; // 与 storage.js 中的 key 对应
        this.difyMode = 'chat'; // 使用 Dify 的聊天 API
        this.mainInputElementId = 'message-input'; // HTML 中的输入框 ID
        this.inputErrorElementId = 'chat-input-area'; // 改为使用输入区域本身作为错误消息容器
        
        // 聊天界面特有的元素
        this.elements = {
            chatMessages: null,        // 消息显示区域
            sendButton: null,          // 发送按钮
            stopButton: null,          // 停止生成按钮
            loadingIndicator: null,    // 加载指示器
            chatContainer: null        // 整个聊天容器
        };

        // 消息类型
        this.messageTypes = {
            USER: 'user-message',
            ASSISTANT: 'assistant-message',
            SYSTEM: 'system-message',
            ERROR: 'system-message error',
            INFO: 'system-message info'
        };
        
        // 禁用字符计数和部分基类UI功能
        this.config = {
            ...this.config,
            charCountLimit: null, // 禁用字符计数
            useMarkdown: true     // 启用Markdown渲染
        };
    }

    /**
     * 初始化聊天应用特有的元素引用 (移除ID交换)
     */
    async init() {
        try {
            // 直接调用基类初始化，不再交换ID
            await super.init(); 
            
            // 获取聊天界面的关键元素
            this.elements.chatMessages = document.getElementById('chat-messages');
            this.elements.sendButton = document.getElementById('send-button');
            this.elements.stopButton = document.getElementById('stop-button');
            this.elements.loadingIndicator = document.getElementById('loading-indicator');
            this.elements.chatContainer = document.getElementById('chat-container');
            
            if (!this.elements.chatMessages || !this.elements.sendButton) {
                console.error('Chat UI elements not found');
                throw new Error('聊天界面元素未找到');
            }
            
            // 设置发送/停止按钮的正确状态
            this.updateButtonState(false);
            
            // console.log('[UserManualNewApp] Initialization completed');
        } catch (error) {
            console.error('[UserManualNewApp] Initialization error:', error);
            this.showErrorMessage('应用初始化失败: ' + error.message);
        }
    }

    /**
     * Override base class bindEvents to prevent it from attaching
     * its default listeners (like the input listener) that conflict
     * with the chat interface's specific needs.
     * We will handle all necessary bindings in _bindSpecificEvents.
     */
    bindEvents() {
        // Intentionally do nothing here to prevent base class bindings.
        // console.log('[UserManualNewApp] Skipping BaseDifyApp.bindEvents');
    }

    /**
     * (覆盖基类方法)
     * 收集并验证此聊天应用的输入。
     * @returns {object | null} 包含验证后输入的对象，如果验证失败则返回 null。
     */
    _gatherAndValidateInputs() {
        const mainInput = document.getElementById(this.mainInputElementId);
        if (!mainInput) {
            console.error(`Input element #${this.mainInputElementId} not found.`);
            this.showErrorMessage('输入元素未找到');
            return null;
        }

        const query = mainInput.value.trim();
        
        // 基本的非空验证
        if (!query) {
            this.showErrorMessage('请输入问题或需求');
            mainInput.focus();
            return null;
        }
        
        return { query };
    }

    /**
     * (覆盖基类方法)
     * 构建发送给 Dify Chat API 的 payload。
     * @param {object} inputs - 从 _gatherAndValidateInputs 返回的对象
     * @returns {object} Dify API payload。
     */
    _buildPayload(inputs) {
        if (!this.state.currentUser || !this.state.currentUser.username) {
            throw new Error('Current user information is missing.');
        }
        if (!inputs || typeof inputs.query !== 'string') {
             throw new Error('Invalid inputs provided to _buildPayload.');
        }

        return {
            query: inputs.query, // 用户输入的消息
            user: this.state.currentUser.username, // 当前登录用户名作为用户标识
            response_mode: 'streaming', // 强制使用流式响应
            conversation_id: this.state.currentConversationId || undefined, // 从基类状态获取对话 ID
            inputs: {} // 如果需要变量，在这里添加
        };
    }

    /**
     * 覆盖基类方法以提供聊天应用特有的回调
     */
    _getBaseCallbacks() {
        return {
            onMessage: (content, isFirstChunk) => {
                // 首次接收消息时创建新的AI回复消息元素
                if (isFirstChunk) {
                    this.createAssistantMessageElement();
                }
                // 追加内容到AI回复
                this.appendAssistantContent(content);
                // 滚动到最新消息
                this.scrollToBottom();
            },
            onComplete: (metadata) => {
                // 隐藏加载指示器
                this.toggleLoadingIndicator(false);
                // 更新按钮状态
                this.updateButtonState(false);
                // 保存对话ID
                if (metadata && metadata.conversation_id) {
                    this.state.currentConversationId = metadata.conversation_id;
                }
                // 标记生成完成
                this.state.isGenerating = false;
                // 移除当前消息的ID，确保下次生成新的消息元素
                const currentMessage = document.getElementById('current-assistant-message');
                if (currentMessage) {
                    currentMessage.removeAttribute('id');
                }
                // 滚动到底部确保所有内容可见
                this.scrollToBottom();
            },
            onError: (error) => {
                // 隐藏加载指示器
                this.toggleLoadingIndicator(false);
                // 更新按钮状态
                this.updateButtonState(false);
                // 显示错误信息
                if (error.name === 'AbortError') {
                    this.addSystemMessage('生成已停止', this.messageTypes.INFO);
                } else {
                    this.addSystemMessage('错误: ' + error.message, this.messageTypes.ERROR);
                }
                // 标记生成完成
                this.state.isGenerating = false;
                // 滚动到底部
                this.scrollToBottom();
            }
        };
    }
    
    /**
     * (覆盖基类方法) 绑定此应用特有的事件。
     */
    _bindSpecificEvents() {
        // 防止基类隐藏chat-input-area
        const chatInputArea = document.getElementById('chat-input-area');
        if (chatInputArea) {
            // 确保它始终显示
            chatInputArea.style.display = 'flex';
        }

        // 发送按钮事件
        const sendButton = document.getElementById('send-button');
        // 添加一个检查，防止重复绑定监听器
        if (sendButton && !sendButton.dataset.listenerAttached) {
            sendButton.addEventListener('click', async () => {
                // 直接调用当前类的 handleGenerate 方法
                if (!this.state.isGenerating) {
                    await this.handleGenerate();
                }
            });
            sendButton.dataset.listenerAttached = 'true'; // 标记已绑定
        } else if (!sendButton) {
            console.error("Send button (#send-button) not found during binding.");
        }
        
        // 停止按钮事件 (保持不变，但也加个检查)
        const stopButton = document.getElementById('stop-button');
         if (stopButton && !stopButton.dataset.listenerAttached) {
            stopButton.addEventListener('click', async () => {
                if (this.state.isGenerating) {
                    await this.stopGeneration(); // stopGeneration 是基类方法，可以直接调用
                }
            });
             stopButton.dataset.listenerAttached = 'true';
        } else if (!stopButton) {
             console.error("Stop button (#stop-button) not found during binding.");
        }
        
        // Enter键发送消息 (移除 replaceWith，添加检查)
        const messageInput = document.getElementById(this.mainInputElementId);
         if (messageInput && !messageInput.dataset.listenerAttached) {
             messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const sendBtnRef = document.getElementById('send-button'); // 在事件处理时获取按钮
                    if (sendBtnRef && !this.state.isGenerating) { // 检查按钮存在和生成状态
                        sendBtnRef.click(); // 触发按钮点击
                    }
                }
            });
            
            // Keep focus listener to ensure visibility on focus
            messageInput.addEventListener('focus', () => {
                if (chatInputArea) chatInputArea.style.display = 'flex';
            });

            messageInput.dataset.listenerAttached = 'true'; // Mark keydown/focus attached
        } else if (!messageInput) {
             console.error("Message input (#message-input) not found during binding.");
        }
    }

    /**
     * 覆盖基类的方法，使其适合聊天应用
     */
    async handleGenerate() {
        if (!this.ui || !this.state.apiKey || !this.state.apiEndpoint || !this.state.currentUser) {
            console.error("Cannot generate: App not fully initialized.");
            this.showErrorMessage('应用未完全初始化，无法生成。');
            return;
        }

        // 确保输入区域始终显示
        const chatInputArea = document.getElementById('chat-input-area');
        if (chatInputArea) {
            chatInputArea.style.display = 'flex';
        }

        const inputs = this._gatherAndValidateInputs();
        if (!inputs) {
            return; // 验证失败，停止生成
        }
        
        // --- ADDED: Add user message and clear input AFTER validation ---
        const mainInput = document.getElementById(this.mainInputElementId);
        if (mainInput) {
            this.addUserMessage(inputs.query); // Add validated query to UI
            mainInput.value = ''; // Clear input now
        } else {
             console.warn("Could not find input element to clear after successful validation.");
        }
        // --- END ADDED ---

        // 确保移除旧的current-assistant-message ID
        const existingMessage = document.getElementById('current-assistant-message');
        if (existingMessage) {
            existingMessage.removeAttribute('id');
        }

        // 设置生成状态
        this.state.isGenerating = true;
        this.updateButtonState(true);
        this.toggleLoadingIndicator(true);

        try {
            this.difyClient = new DifyClient({
                baseUrl: this.state.apiEndpoint,
                apiKey: this.state.apiKey,
                mode: this.difyMode
            });

            const payload = this._buildPayload(inputs);
            const callbacks = this._getBaseCallbacks();

            await this.difyClient.generateStream(payload, callbacks);

        } catch (initError) {
            console.error(`[${this.constructor.name}] Error setting up generation:`, initError);
            this.toggleLoadingIndicator(false);
            this.updateButtonState(false);
            this.showErrorMessage('启动生成时出错: ' + initError.message);
            this.difyClient = null;
            this.state.isGenerating = false;
        }
    }

    // ----- 聊天应用特有的辅助方法 -----

    /**
     * 添加用户消息到聊天界面
     * @param {string} text - 用户输入的文本
     */
    addUserMessage(text) {
        if (!this.elements.chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${this.messageTypes.USER}`;
        
        // 添加用户头像
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar user-avatar';
        avatarDiv.textContent = 'U'; // 可以使用用户首字母或其他标识
        messageDiv.appendChild(avatarDiv);
        
        // 添加消息内容容器
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = `<p>${this.escapeHtml(text)}</p>`;
        messageDiv.appendChild(contentDiv);
        
        this.elements.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * 创建新的AI助手回复消息元素
     */
    createAssistantMessageElement() {
        if (!this.elements.chatMessages) return;
        
        // 先检查是否已存在当前消息元素，如存在则移除ID
        const existingMessage = document.getElementById('current-assistant-message');
        if (existingMessage) {
            existingMessage.removeAttribute('id');
        }
        
        // 创建新的消息容器
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${this.messageTypes.ASSISTANT}`;
        messageDiv.id = 'current-assistant-message';
        
        // 添加助手头像
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar assistant-avatar';
        // 添加AI图标
        avatarDiv.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4285f4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10Z"></path>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
            </svg>
        `;
        messageDiv.appendChild(avatarDiv);
        
        // 添加消息内容容器
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        messageDiv.appendChild(contentDiv);
        
        // 添加消息操作按钮容器
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        // 复制按钮
        const copyButton = document.createElement('button');
        copyButton.className = 'action-button copy';
        copyButton.title = '复制';
        copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        `;
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const content = messageDiv.getAttribute('data-content') || '';
            if (content) {
                navigator.clipboard.writeText(content).then(() => {
                    this.showToast('已复制到剪贴板');
                }).catch(err => {
                    console.error('复制失败:', err);
                });
            }
        });
        actionsDiv.appendChild(copyButton);
        
        // 重试按钮
        const retryButton = document.createElement('button');
        retryButton.className = 'action-button retry';
        retryButton.title = '重新生成';
        retryButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 0 1-9 9"></path>
                <path d="M3 12a9 9 0 0 1 9-9"></path>
                <path d="M21 12H3"></path>
                <path d="m6 15-3-3 3-3"></path>
                <path d="m18 9 3 3-3 3"></path>
            </svg>
        `;
        retryButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            // 获取最新一条用户消息的内容
            const userMessages = document.querySelectorAll(`.message.${this.messageTypes.USER}`);
            if (userMessages.length > 0) {
                const lastUserMessage = userMessages[userMessages.length - 1];
                const messageContent = lastUserMessage.querySelector('.message-content');
                if (messageContent) {
                    const userText = messageContent.textContent.trim() || '';
                    if (userText) {
                        // 显示重新生成提示
                        this.showToast('重新生成中...');
                        
                        try {
                            // 创建一个自定义的输入对象，包含上一次的查询
                            const inputs = { query: userText };
                            
                            // 设置生成状态
                            this.state.isGenerating = true;
                            this.updateButtonState(true);
                            this.toggleLoadingIndicator(true);
                            
                            // 移除当前AI回复消息 - 使用按钮父级元素找到当前消息
                            const currentMessageElement = e.target.closest('.message');
                            if (currentMessageElement) {
                                currentMessageElement.remove();
                            }
                            
                            // 确保difyClient已初始化
                            if (!this.difyClient) {
                                this.difyClient = new DifyClient({
                                    baseUrl: this.state.apiEndpoint,
                                    apiKey: this.state.apiKey,
                                    mode: this.difyMode
                                });
                            }
                            
                            // 构建payload并发送请求
                            const payload = this._buildPayload(inputs);
                            const callbacks = this._getBaseCallbacks();
                            
                            // 执行流式生成
                            await this.difyClient.generateStream(payload, callbacks);
                            
                        } catch (error) {
                            console.error('[重新生成] 错误:', error);
                            this.toggleLoadingIndicator(false);
                            this.updateButtonState(false);
                            this.showErrorMessage('重新生成失败: ' + error.message);
                            this.state.isGenerating = false;
                        }
                    }
                }
            }
        });
        actionsDiv.appendChild(retryButton);
        
        // 加入分隔线
        const divider = document.createElement('div');
        divider.className = 'divider';
        actionsDiv.appendChild(divider);
        
        // 好评按钮
        const likeButton = document.createElement('button');
        likeButton.className = 'action-button like';
        likeButton.title = '好评';
        likeButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 10v12"></path>
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path>
            </svg>
        `;
        likeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = likeButton.classList.contains('active');
            
            // 重置按钮状态
            likeButton.classList.remove('active');
            dislikeButton.classList.remove('active');
            
            // 如果之前未激活，则激活
            if (!isActive) {
                likeButton.classList.add('active');
                this.showToast('感谢您的反馈！');
            }
        });
        actionsDiv.appendChild(likeButton);
        
        // 差评按钮
        const dislikeButton = document.createElement('button');
        dislikeButton.className = 'action-button dislike';
        dislikeButton.title = '差评';
        dislikeButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 14V2"></path>
                <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"></path>
            </svg>
        `;
        dislikeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = dislikeButton.classList.contains('active');
            
            // 重置按钮状态
            likeButton.classList.remove('active');
            dislikeButton.classList.remove('active');
            
            // 如果之前未激活，则激活
            if (!isActive) {
                dislikeButton.classList.add('active');
                this.showToast('感谢您的反馈！');
            }
        });
        actionsDiv.appendChild(dislikeButton);
        
        // 将操作按钮容器添加到消息div
        messageDiv.appendChild(actionsDiv);
        
        this.elements.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * 追加内容到当前的AI助手回复
     * @param {string} content - 接收到的内容
     */
    appendAssistantContent(content) {
        const currentMessage = document.getElementById('current-assistant-message');
        if (!currentMessage) {
            console.warn('找不到当前助手消息元素，创建一个新的');
            this.createAssistantMessageElement();
            return this.appendAssistantContent(content);
        }
        
        // 获取消息内容容器
        const contentDiv = currentMessage.querySelector('.message-content');
        if (!contentDiv) {
            console.error('消息内容容器不存在');
            return;
        }
        
        // 使用marked库渲染Markdown
        if (this.config.useMarkdown) {
            // 累积内容
            const existingContent = currentMessage.getAttribute('data-content') || '';
            const newContent = existingContent + content;
            currentMessage.setAttribute('data-content', newContent);
            
            // 渲染Markdown
            try {
                contentDiv.innerHTML = markedLib.parse(newContent);
            } catch (error) {
                console.error('Markdown渲染错误:', error);
                // 降级到纯文本
                contentDiv.innerHTML = this.escapeHtml(newContent);
            }
        } else {
            // 纯文本模式
            contentDiv.innerHTML += this.escapeHtml(content);
        }
    }

    /**
     * 添加系统消息（提示、错误等）
     * @param {string} text - 消息文本
     * @param {string} type - 消息类型
     */
    addSystemMessage(text, type = this.messageTypes.SYSTEM) {
        if (!this.elements.chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `<p>${this.escapeHtml(text)}</p>`;
        
        this.elements.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * 显示错误消息
     * @param {string} message - 错误消息文本
     */
    showErrorMessage(message) {
        // 在聊天界面中添加系统错误消息
        this.addSystemMessage(message, this.messageTypes.ERROR);
        
        // 同时在输入框下方也显示错误
        const errorElement = document.getElementById('chat-input-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // 3秒后自动隐藏输入框下的错误
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * 切换加载指示器的显示状态
     * @param {boolean} isLoading - 是否正在加载
     */
    toggleLoadingIndicator(isLoading) {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = isLoading ? 'block' : 'none';
        }
    }

    /**
     * 更新发送/停止按钮的状态
     * @param {boolean} isGenerating - 是否正在生成内容
     */
    updateButtonState(isGenerating) {
        if (this.elements.sendButton) {
            this.elements.sendButton.style.display = isGenerating ? 'none' : 'inline-flex';
        }
        if (this.elements.stopButton) {
            this.elements.stopButton.style.display = isGenerating ? 'inline-flex' : 'none';
        }
        
        // 确保聊天输入区域始终显示
        const chatInputArea = document.getElementById('chat-input-area');
        if (chatInputArea) {
            chatInputArea.style.display = 'flex';
        }
    }

    /**
     * 将聊天滚动到底部
     */
    scrollToBottom() {
        if (this.elements.chatMessages) {
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }
    }

    /**
     * 转义HTML特殊字符以防止XSS
     * @param {string} text - 需要转义的文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 显示提示消息
     * @param {string} message - 提示消息文本
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg z-50 transition-opacity duration-300';
        toast.innerText = message;
        document.body.appendChild(toast);
        
        // 2秒后自动移除
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }
}

// Initialize the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // console.log('DOM fully loaded. Initializing UserManualNewApp...');
    const app = new UserManualNewApp();
    app.init();
});

// 导出类，以便页面脚本可以导入和实例化
export default UserManualNewApp; 