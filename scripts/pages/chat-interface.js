// scripts/pages/chat-interface.js <-- New Filename

// 禁用调试日志
const DEBUG = false;

// 导入通用模块
import { configureAmplify } from '/scripts/amplify-config.js';
import Header from '../../modules/common/header.js';
import { getCurrentUserSettings, getGlobalConfig } from '/scripts/services/storage.js';
import I18n, { t } from '../i18n.js'; // 保持默认导入
import { marked } from 'marked'; // Ensure marked is imported if not already global
// import UserManualNewApp from '../../modules/apps/user-manual-new/index.js';

// ---> MOVE IMPORTS FOR BASE CLASS AND UI HERE <--
// import BaseDifyApp from '../../modules/common/base-dify-app.js'; // REMOVE - Use BaseDifyChatApp
// import DifyAppUI from '../../modules/common/dify-app-ui.js'; // REMOVE - BaseDifyChatApp uses ChatUIManager

// --- NEW: Import BaseDifyChatApp ---
import BaseDifyChatApp from '../../modules/common/BaseDifyChatApp.js'; // Revert to relative path
// 导入ChatHistoryService
import ChatHistoryService from '../../modules/common/ChatHistoryService.js';

// ---> MOVE CLASS DEFINITION TO TOP LEVEL <--
// --- Define the Specific Chat App Class ---
class GenericChatApp extends BaseDifyChatApp {
    constructor(appType = 'chat') {
        super();
        
        // 根据appType设置不同的difyApiKeyName
        this.appType = appType;
        
        // 设置API密钥名称映射
        this.apiKeyMapping = {
            'userManual': 'userManual', // MODIFIED: Changed key from 'chat' to 'userManual'
            'ux-design': 'uxDesign', // UX设计
            'requirement-analysis': 'requirementsAnalysis', // 需求分析 (注意: 修正拼写，添加's')
        };
        
        // 设置应用信息映射 (移除 name 和 description，保留 title, placeholder, welcomeMessage)
        this.appInfoMapping = {
            'userManual': { // MODIFIED: Changed key from 'chat' to 'userManual'
                title: t('userManualNew.title', { default: 'AI 写 User Manual (聊天模式)' }),
                placeholder: t('userManualNew.inputPlaceholder', { default: '输入您想了解的产品功能或使用问题...' }),
                welcomeMessage: t('userManualNew.welcomeMessage', { default: 'Hello! How can I assist you today? If you have a User Story and Acceptance Criteria to share, I can help generate a User Manual section based on them.' })
            },
            'ux-design': {
                title: t('uxDesign.title', { default: 'UX 界面设计(POC)' }),
                placeholder: t('uxDesign.requirementPlaceholder', { default: '请输入User Story Tickets中的描述和Acceptance Criteria的内容...' }),
                welcomeMessage: t('uxDesign.welcomeMessage', { default: '欢迎使用UX界面设计助手！请提供您的User Story和需求描述，我将帮您生成Figma设计提示词，协助快速创建界面原型。' })
            },
            'requirement-analysis': {
                title: t('requirementAnalysis.title', { default: 'AI 需求分析助手' }),
                placeholder: t('requirementAnalysis.requirementPlaceholder', { default: '请输入需要分析的需求内容...' }),
                welcomeMessage: t('requirementAnalysis.welcomeMessage', { default: '您好！我是需求分析助手。请描述您的产品需求或想法，我会帮您分析并生成结构化的需求文档，包括用户画像、功能列表和优先级建议。' })
            }
        };
        
        // 设置当前应用的API密钥名称
        this.difyApiKeyName = this.apiKeyMapping[appType] || this.apiKeyMapping['userManual'];
        
        // 确保输入元素ID匹配HTML
        this.mainInputElementId = 'message-input';
        this.inputErrorElementId = 'message-input-error';
    }
    
    // 初始化页面UI (只设置标题和占位符)
    async initPageUI() {
        try {
            // 获取应用特定的UI文本（标题、占位符）
            const appTexts = this.appInfoMapping[this.appType] || this.appInfoMapping['userManual'];

            // 设置页面标题
            document.title = appTexts.title;
            const appTitleElement = document.getElementById('app-title');
            if (appTitleElement) {
                appTitleElement.textContent = appTexts.title;
            }

            // 设置输入框占位符
            const inputElement = document.getElementById(this.mainInputElementId);
            if (inputElement) {
                inputElement.placeholder = appTexts.placeholder;
            }

            // 注意：应用名称和描述现在由 BaseDifyApp 通过 /info API 获取并由 ChatUIManager 显示

            if (DEBUG) console.log(`[GenericChatApp] Page UI (title, placeholder) initialized for app type: ${this.appType}`);
        } catch (error) {
            console.error(`[GenericChatApp] Page UI initialization failed:`, error);
        }
    }
    
    // 重写init方法，在基类初始化后设置页面UI
    async init() {
        await super.init();
        await this.initPageUI();
    }
    
    // 重写输入收集和验证方法
    _gatherAndValidateInputs() {
        if (!this.ui || typeof this.ui.getInputText !== 'function') {
            console.error("[GenericChatApp] ChatUIManager或getInputText不可用");
            return null;
        }
        
        const query = this.ui.getInputText().trim();

        if (!query) { 
            return null; 
        }
        
        // 验证输入长度
        const charCountLimit = 4000;
        if (query.length > charCountLimit) { 
             this.ui?.showToast(t('chat.error.inputTooLong', { default: `输入超过 ${charCountLimit} 字符限制` }), 'warning');
             return null; 
        }

        return { query: query };
    }

    // 修改创建新对话的方法，使用数据库中的appType字段
    async createNewConversation(userInput) {
        try {
            // 确保有有效的用户输入
            if (!userInput || userInput.trim() === '') {
                throw new Error('用户输入不能为空');
            }

            // 创建第一条用户消息
            const firstMessage = {
                role: 'user',
                content: userInput,
                timestamp: Date.now()
            };

            // 创建对话标题 - 添加应用类型前缀
            const appPrefixMap = {
                'chat': '[手册] ',
                'ux-design': '[UX] ',
                'requirement-analysis': '[需求] '
            };
            const titlePrefix = appPrefixMap[this.appType] || '';
            const title = `${titlePrefix}${this._generateTitle(userInput)}`;

            if (DEBUG) console.log(`[DEBUG] 直接调用GraphQL API创建对话: appType=${this.appType}, title=${title}`);
            
            // 直接使用GraphQL API创建对话，确保appType字段被正确设置
            const { API, graphqlOperation } = await import('aws-amplify');
            const { createConversation } = await import('../../src/graphql/mutations.js');
            
            // 创建对话数据
            const input = {
                title: title,
                messages: JSON.stringify([firstMessage]),
                appType: this.appType  // 关键: 设置appType字段
            };
            
            // 直接调用GraphQL API
            const result = await API.graphql(
                graphqlOperation(createConversation, { input })
            );
            
            // 获取创建的对话
            const newConversation = result.data.createConversation;
            if (DEBUG) console.log(`[DEBUG] 创建对话结果:`, JSON.stringify(newConversation));
            
            // 解析messages字段
            this.currentConversation = {
                ...newConversation,
                messages: [firstMessage]  // 使用解析后的消息
            };

            // 更新UI显示对话标题
            if (this.conversationTitleElement) {
                this.conversationTitleElement.textContent = title;
            }
            
            return this.currentConversation;
        } catch (error) {
            console.error('[GenericChatApp] 创建新对话时出错:', error);
            throw error;
        }
    }
    
    // 简化loadChatHistory方法，直接根据appType过滤对话
    async loadChatHistory() {
        try {
            if (DEBUG) console.log(`[GenericChatApp] 加载聊天历史记录，应用类型: ${this.appType}`);
            
            // 获取所有对话
            const allHistory = await ChatHistoryService.getConversationList();
            
            // 根据appType过滤
            this.history = allHistory.filter(conv => {
                // 如果有appType字段，直接按字段过滤
                if (conv.appType) {
                    return conv.appType === this.appType;
                }
                
                // 如果没有appType字段，根据标题前缀过滤(向后兼容)
                if (this.appType === 'chat') {
                    return !conv.title || !conv.title.startsWith('[');
                } else if (this.appType === 'ux-design') {
                    return conv.title && conv.title.startsWith('[UX]');
                } else if (this.appType === 'requirement-analysis') {
                    return conv.title && conv.title.startsWith('[需求]');
                }
                
                return false;
            });
            
            if (DEBUG) console.log(`[GenericChatApp] 找到 ${this.history.length} 条对话记录`);
            
            // 更新UI显示历史记录
            if (this.ui && typeof this.ui.updateHistoryList === 'function') {
                this.ui.updateHistoryList(this.history);
            }
            
            return this.history;
        } catch (error) {
            console.error('[GenericChatApp] 加载聊天历史记录时出错:', error);
            return [];
        }
    }
    
    // 根据用户输入生成对话标题
    _generateTitle(userInput) {
        // 基于用户输入的前几个字（最多20个字符）生成标题
        const titleText = userInput.trim().substring(0, 20) + (userInput.length > 20 ? '...' : '');
        
        // 如果输入为空，使用当前时间生成默认标题
        if (!titleText) {
            const now = new Date();
            const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`;
            const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            // 从应用类型到默认标题名称的映射
            const appTitleMap = {
                'chat': '用户手册对话',
                'ux-design': 'UX设计对话',
                'requirement-analysis': '需求分析对话'
            };
            
            const baseName = appTitleMap[this.appType] || '新对话';
            return `${baseName} (${dateStr} ${timeStr})`;
        }
        
        return titleText;
    }

    // 重写显示初始欢迎消息方法
    displayInitialAssistantMessage() {
        try {
            // 获取应用特定的欢迎消息
            const appInfo = this.appInfoMapping[this.appType] || this.appInfoMapping['userManual'];
            const welcomeMessage = appInfo.welcomeMessage || t('chat.welcomeMessage', { default: '你好！我可以帮你做什么？' }); // Default welcome
            const messageId = `welcome-${this.appType}-${Date.now()}`; // Unique ID for the welcome message
            
            if (this.ui && typeof this.ui.addMessage === 'function') {
                if (DEBUG) console.log(`[GenericChatApp] Displaying welcome message for ${this.appType} using ui.addMessage`);
                // --- FIX: Use addMessage directly --- 
                const msgElement = this.ui.addMessage('assistant', welcomeMessage, messageId, 'pending'); // Start as pending
                if (msgElement) {
                     // Add marker for opening message
                     msgElement.dataset.messageType = 'opening'; 
                     // Immediately finalize to add actions (which _addMessageActions will skip due to the marker) 
                     // and render markdown.
                     this.ui.finalizeMessage(messageId); 
                     if (DEBUG) console.log(`[GenericChatApp] Welcome message added and finalized for ${this.appType}`);
                 } else {
                     console.error(`[GenericChatApp] ui.addMessage failed to return element for welcome message.`);
                 }
                // --- END FIX ---
            } else {
                 console.error("[GenericChatApp] Cannot display welcome message: UI manager or addMessage method not available.");
            }

            // --- REMOVED Manual DOM Manipulation Fallback ---
            /*
            if (this.ui && typeof this.ui.addAssistantMessage === 'function') {
                // ... old incorrect code ...
            }
            */
        } catch (error) {
            console.error('[GenericChatApp] 显示欢迎消息出错:', error);
            // --- REMOVED super call in catch block --- 
            // super.displayInitialAssistantMessage();
        }
    }

    // 初始化消息输入区域
    initMessageInput() {
        this.messageInput = document.getElementById(this.mainInputElementId);
        this.messageInputError = document.getElementById(this.inputErrorElementId);
        
        if (!this.messageInput) {
            console.error('[GenericChatApp] 未找到消息输入元素');
            return;
        }
        
        // 设置输入框占位符
        const placeholder = this.appInfoMapping[this.appType]?.placeholder || 
                           '输入您的问题..';
        this.messageInput.setAttribute('placeholder', placeholder);
        
        // 发送按钮
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.addEventListener('click', async () => {
                const message = this.messageInput.value.trim();
                if (message) {
                    await this.sendUserMessage(message);
                }
            });
        }
        
        // 监听键盘事件
        this.messageInput.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                const message = this.messageInput.value.trim();
                if (message) {
                    await this.sendUserMessage(message);
                }
            }
        });
    }
    
    // 发送用户消息
    async sendUserMessage(message) {
        try {
            this.ui.showLoadingIndicator();
            this.messageInput.value = '';
            
            // 如果没有当前对话，创建一个新对话
            if (!this.currentConversation) {
                if (DEBUG) console.log(`[DEBUG] 创建新对话，应用类型=${this.appType}`);
                
                // 使用用户消息创建新对话
                await this.createNewConversation(message);
                
                // 显示消息到UI
                this.ui.appendUserMessage(message);
                
                // 发送至API并获取回复
                const response = await this.sendToDify(message);
                this.ui.appendAssistantMessage(response);
            } else {
                // 显示消息到UI
                this.ui.appendUserMessage(message);
                
                // 在现有对话中添加消息
                await this.addMessageToCurrentConversation({
                    role: 'user',
                    content: message,
                    timestamp: Date.now()
                });
                
                // 发送至API并获取回复
                const response = await this.sendToDify(message);
                
                // 添加助手回复到当前对话
                await this.addMessageToCurrentConversation({
                    role: 'assistant',
                    content: response,
                    timestamp: Date.now()
                });
                
                this.ui.appendAssistantMessage(response);
            }
        } catch (error) {
            console.error('[GenericChatApp] 发送用户消息时出错:', error);
            this.ui.showError('发送消息时出错: ' + error.message);
        } finally {
            this.ui.hideLoadingIndicator();
        }
    }
}
// ---> END NEW CLASS DEFINITION <--

// --- REMOVE OLD Helper Functions (displayMessage, initializeInputArea etc.) --- 
// These functionalities are now handled by ChatUIManager and BaseDifyChatApp
/*
function displayMessage(text, sender, isThinking = false) {
    // ... (implementation removed)
}

function initializeInputArea(chatAppInstance) {
   // ... (implementation removed)
}

function initializeChatInterfaceInteractions() {
    // ... (implementation removed)
}
*/

// ---> MODIFY DOMContentLoaded Listener AGAIN for correct order <---
document.addEventListener('DOMContentLoaded', async () => {
    if (DEBUG) console.log('[DEBUG] DOMContentLoaded事件触发');

    try {
        // 标准初始化步骤
        if (DEBUG) console.log('[DEBUG] 配置Amplify...');
        configureAmplify();
        if (DEBUG) console.log('[DEBUG] Amplify配置完成');

        if (DEBUG) console.log('[DEBUG] 初始化I18n...');
        await I18n.init();
        if (DEBUG) console.log('[DEBUG] I18n初始化完成');

        if (DEBUG) console.log('[DEBUG] 初始化Header...');
        await Header.init();
        if (DEBUG) console.log('[DEBUG] Header初始化完成');

        // 从URL参数获取应用类型
        const urlParams = new URLSearchParams(window.location.search);
        const appType = urlParams.get('app') || 'userManual'; // 默认为用户手册

        if (DEBUG) console.log(`[GenericChatApp] 初始化应用，类型: ${appType}`);
        
        // 创建应用实例并初始化
        const app = new GenericChatApp(appType);
        await app.init();
        
        // 将应用实例存储在全局变量中（调试用）
        window.chatApp = app;
        
        if (DEBUG) console.log(`[GenericChatApp] 应用初始化完成: ${appType}`);
    } catch (error) {
        console.error('[GenericChatApp] 初始化时发生错误:', error);
        // 显示错误消息
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = `初始化失败: ${error.message}`;
        document.body.appendChild(errorElement);
    }
});

// 导出类供其他模块使用
export default GenericChatApp; 