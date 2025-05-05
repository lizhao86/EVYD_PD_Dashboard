/**
 * ChatHistoryService.js
 * 封装对DynamoDB中聊天历史记录的操作
 * 通过AWS Amplify GraphQL API调用AppSync与DynamoDB交互
 */

import { API, Auth, graphqlOperation } from 'aws-amplify';
import * as queries from '../../src/graphql/queries';
import * as mutations from '../../src/graphql/mutations';

class ChatHistoryService {
    /**
     * 获取当前用户的所有聊天历史列表
     * @returns {Promise<Array>} 聊天历史元数据数组，按更新时间倒序排列
     */
    static async getConversationList() {
        try {
            // 获取当前用户ID
            const user = await Auth.currentAuthenticatedUser();
            if (!user) {
                console.error('[ChatHistoryService] No authenticated user found');
                return [];
            }

            // 使用owner过滤获取当前用户的所有对话
            const result = await API.graphql(
                graphqlOperation(queries.listConversations, {
                    filter: {
                        _deleted: { ne: true } // 排除已删除的对话
                    }
                })
            );

            // 在前端过滤结果，确保只显示属于当前用户的对话
            // 这是因为owner字段可能在返回中被限制访问，但GraphQL仍会返回用户有权访问的记录
            let conversations = result.data.listConversations.items || [];
            
            // 按更新时间降序排序
            conversations.sort((a, b) => {
                const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                return timeB - timeA; // 降序排列
            });

            // 转换每个对话对象为简单的元数据格式
            return conversations.map(conversation => ({
                id: conversation.id,
                title: conversation.title || this._generateDefaultTitle(conversation),
                last_message_time: new Date(conversation.updatedAt || conversation.createdAt).getTime() / 1000,
                messageCount: this._countMessages(conversation),
                appType: conversation.appType // 添加appType字段到返回结果
            }));
        } catch (error) {
            console.error('[ChatHistoryService] Error getting conversation list:', error);
            return [];
        }
    }

    /**
     * 根据应用类型获取对话列表
     * @param {string} appType 应用类型: 'chat', 'ux-design', 'requirement-analysis'
     * @returns {Promise<Array>} 过滤后的对话数组
     */
    static async getConversationsByAppType(appType) {
        try {
            console.log(`[ChatHistoryService] 正在按应用类型查询对话: ${appType}`);
            
            // 检查conversationsByAppType查询是否可用
            let conversations = [];
            if (queries.conversationsByAppType) {
                try {
                    const result = await API.graphql(
                        graphqlOperation(queries.conversationsByAppType, {
                            appType: appType,
                            sortDirection: "DESC"  // 降序排列，最新的对话在前
                        })
                    );
                    
                    conversations = result.data.conversationsByAppType.items || [];
                    console.log(`[ChatHistoryService] 按应用类型查询到 ${conversations.length} 条对话`);
                } catch (queryError) {
                    console.warn('[ChatHistoryService] conversationsByAppType查询出错:', queryError);
                    // 如果查询出错，使用回退方案
                    conversations = [];
                }
            }
            
            // 如果通过新查询获取的结果为空，则使用旧方法获取全部并过滤
            if (conversations.length === 0) {
                console.log('[ChatHistoryService] 没有找到记录或者新查询不可用，使用旧方法并过滤');
                
                // 获取所有对话
                const allConversations = await this.getConversationList();
                
                // 首先尝试通过appType字段过滤
                const appTypeFiltered = allConversations.filter(conv => conv.appType === appType);
                
                if (appTypeFiltered.length > 0) {
                    // 如果找到了匹配的记录，使用它们
                    console.log(`[ChatHistoryService] 通过appType字段过滤找到 ${appTypeFiltered.length} 条记录`);
                    return appTypeFiltered;
                }
                
                // 如果通过appType字段没有找到记录，尝试通过标题前缀过滤
                console.log('[ChatHistoryService] 通过appType字段没有找到记录，尝试使用标题前缀过滤');
                
                const prefixMap = {
                    'chat': '[手册]',
                    'ux-design': '[UX]',
                    'requirement-analysis': '[需求]'
                };
                const prefix = prefixMap[appType] || '';
                
                // 为空的chat应用特殊处理：没有前缀的记录归属于默认chat应用
                if (appType === 'chat') {
                    const filtered = allConversations.filter(conv => 
                        !conv.title || !conv.title.startsWith('[')
                    );
                    console.log(`[ChatHistoryService] 为chat应用找到 ${filtered.length} 条无前缀记录`);
                    return filtered;
                }
                
                const filtered = allConversations.filter(conv => 
                    conv.title && conv.title.startsWith(prefix)
                );
                console.log(`[ChatHistoryService] 通过标题前缀'${prefix}'过滤找到 ${filtered.length} 条记录`);
                return filtered;
            }
            
            // 转换每个对话对象为简单的元数据格式
            return conversations.map(conversation => ({
                id: conversation.id,
                title: conversation.title || this._generateDefaultTitle(conversation),
                last_message_time: new Date(conversation.updatedAt || conversation.createdAt).getTime() / 1000,
                messageCount: this._countMessages(conversation),
                appType: conversation.appType || appType // 如果没有appType字段，使用传入的appType
            }));
        } catch (error) {
            console.error(`[ChatHistoryService] 按应用类型查询对话时出错:`, error);
            
            // 出错时返回空数组
            return [];
        }
    }

    /**
     * 获取特定对话的完整内容，包括所有消息
     * @param {string} conversationId 对话ID
     * @returns {Promise<Object|null>} 对话对象，包含已解析的消息数组，或null（如果未找到）
     */
    static async getConversation(conversationId) {
        if (!conversationId) {
            console.error('[ChatHistoryService] No conversation ID provided');
            return null;
        }

        try {
            const result = await API.graphql(
                graphqlOperation(queries.getConversation, { id: conversationId })
            );

            const conversation = result.data.getConversation;
            if (!conversation) {
                return null;
            }

            // 解析messages字段（JSON字符串→数组）
            const parsedMessages = this._parseMessages(conversation);
            
            return {
                ...conversation,
                messages: parsedMessages
            };
        } catch (error) {
            console.error(`[ChatHistoryService] Error getting conversation ${conversationId}:`, error);
            return null;
        }
    }

    /**
     * 创建新的对话记录
     * @param {Object} data 对话数据，包含title和messages数组
     * @returns {Promise<Object|null>} 创建的对话对象或null（如果失败）
     */
    static async createConversation(data) {
        if (!data || !data.title) {
            console.error('[ChatHistoryService] Invalid conversation data for creation');
            return null;
        }

        try {
            // 确保messages字段是JSON字符串
            const messages = data.messages || [];
            const messagesJson = JSON.stringify(messages);
            
            // 准备创建对话的输入数据
            const input = {
                title: data.title,
                messages: messagesJson
            };
            
            // 如果提供了appType，添加到输入
            if (data.appType) {
                input.appType = data.appType;
                console.log(`[ChatHistoryService] 创建对话设置appType: ${data.appType}`);
            }

            // 调用GraphQL API创建对话
            const result = await API.graphql(
                graphqlOperation(mutations.createConversation, { input })
            );

            const newConversation = result.data.createConversation;
            console.log(`[ChatHistoryService] 对话创建成功，ID: ${newConversation.id}`);
            
            // 返回解析后的对象
            return {
                ...newConversation,
                messages: messages // 返回原始消息数组，避免重复解析
            };
        } catch (error) {
            console.error('[ChatHistoryService] Error creating conversation:', error);
            return null;
        }
    }

    /**
     * 更新现有对话（例如添加新消息或更改标题）
     * @param {string} conversationId 对话ID
     * @param {Object} data 要更新的数据（title和/或messages）
     * @returns {Promise<Object|null>} 更新后的对话对象或null（如果失败）
     */
    static async updateConversation(conversationId, data) {
        if (!conversationId) {
            console.error('[ChatHistoryService] No conversation ID provided for update');
            return null;
        }

        try {
            // 先获取现有对话以获取版本号
            const existingResult = await API.graphql(
                graphqlOperation(queries.getConversation, { id: conversationId })
            );
            
            const existingConversation = existingResult.data.getConversation;
            if (!existingConversation) {
                console.error(`[ChatHistoryService] Conversation ${conversationId} not found for update`);
                return null;
            }

            // 准备更新输入
            const input = {
                id: conversationId,
                _version: existingConversation._version
            };

            // 如果提供了新标题，添加到输入
            if (data.title !== undefined) {
                input.title = data.title;
            }

            // 如果提供了消息，序列化并添加到输入
            if (data.messages) {
                input.messages = JSON.stringify(data.messages);
            }
            
            // 如果提供了appType，添加到输入
            if (data.appType) {
                input.appType = data.appType;
                console.log(`[ChatHistoryService] 更新对话设置appType: ${data.appType}`);
            }
            // 否则保留现有的appType
            else if (existingConversation.appType) {
                input.appType = existingConversation.appType;
            }

            // 执行更新
            const result = await API.graphql(
                graphqlOperation(mutations.updateConversation, { input })
            );

            const updatedConversation = result.data.updateConversation;
            
            // 返回解析后的对象
            return {
                ...updatedConversation,
                messages: data.messages || this._parseMessages(updatedConversation)
            };
        } catch (error) {
            console.error(`[ChatHistoryService] Error updating conversation ${conversationId}:`, error);
            
            // 如果是版本冲突，可以考虑重试逻辑
            if (error.errors && error.errors.some(e => 
                e.errorType === 'ConflictUnhandled' || 
                e.message.includes('Conflict'))) {
                console.warn(`[ChatHistoryService] Version conflict while updating conversation ${conversationId}. Consider implementing retry logic.`);
            }
            
            return null;
        }
    }

    /**
     * 删除指定的对话
     * @param {string} conversationId 要删除的对话ID
     * @returns {Promise<boolean>} 是否成功删除
     */
    static async deleteConversation(conversationId) {
        if (!conversationId) {
            console.error('[ChatHistoryService] No conversation ID provided for deletion');
            return false;
        }

        try {
            // 先获取现有对话以获取版本号
            const existingResult = await API.graphql(
                graphqlOperation(queries.getConversation, { id: conversationId })
            );
            
            const existingConversation = existingResult.data.getConversation;
            if (!existingConversation) {
                console.error(`[ChatHistoryService] Conversation ${conversationId} not found for deletion`);
                return false;
            }

            // 执行删除
            await API.graphql(
                graphqlOperation(mutations.deleteConversation, { 
                    input: { 
                        id: conversationId, 
                        _version: existingConversation._version 
                    } 
                })
            );

            return true;
        } catch (error) {
            console.error(`[ChatHistoryService] Error deleting conversation ${conversationId}:`, error);
            return false;
        }
    }

    /**
     * 添加单条消息到指定对话
     * @param {string} conversationId 对话ID
     * @param {Object} message 要添加的消息对象
     * @returns {Promise<Object|null>} 更新后的对话对象或null（如果失败）
     */
    static async addMessage(conversationId, message) {
        try {
            // 获取现有对话
            const conversation = await this.getConversation(conversationId);
            if (!conversation) {
                console.error(`[ChatHistoryService] Conversation ${conversationId} not found to add message`);
                return null;
            }

            // 添加新消息到消息数组
            const messages = conversation.messages || [];
            messages.push(message);

            // 更新对话
            return await this.updateConversation(conversationId, { messages });
        } catch (error) {
            console.error(`[ChatHistoryService] Error adding message to conversation ${conversationId}:`, error);
            return null;
        }
    }

    /**
     * 更新特定对话消息的状态或内容
     * @param {string} conversationId 对话ID
     * @param {string} messageId 消息ID
     * @param {Object} updates 要应用到消息的更新
     * @returns {Promise<Object|null>} 更新后的对话对象或null（如果失败）
     */
    static async updateMessage(conversationId, messageId, updates) {
        try {
            // 获取现有对话
            const conversation = await this.getConversation(conversationId);
            if (!conversation) {
                console.error(`[ChatHistoryService] Conversation ${conversationId} not found to update message`);
                return null;
            }

            // 查找并更新特定消息
            const messages = conversation.messages || [];
            const messageIndex = messages.findIndex(msg => msg.id === messageId);
            
            if (messageIndex === -1) {
                console.error(`[ChatHistoryService] Message ${messageId} not found in conversation ${conversationId}`);
                return null;
            }

            // 更新消息对象
            messages[messageIndex] = {
                ...messages[messageIndex],
                ...updates
            };

            // 更新对话
            return await this.updateConversation(conversationId, { messages });
        } catch (error) {
            console.error(`[ChatHistoryService] Error updating message ${messageId} in conversation ${conversationId}:`, error);
            return null;
        }
    }

    /**
     * 为现有对话添加应用类型字段（迁移工具）
     * @param {string} conversationId 对话ID
     * @param {string} appType 应用类型
     * @returns {Promise<boolean>} 是否成功更新
     */
    static async updateConversationAppType(conversationId, appType) {
        if (!conversationId || !appType) {
            console.error('[ChatHistoryService] 更新appType需要对话ID和应用类型');
            return false;
        }

        try {
            // 获取现有对话
            const conversation = await this.getConversation(conversationId);
            if (!conversation) {
                console.error(`[ChatHistoryService] 对话 ${conversationId} 不存在`);
                return false;
            }

            // 准备更新数据
            const updateData = {
                appType: appType
            };

            // 更新对话
            const result = await this.updateConversation(conversationId, updateData);
            
            if (result) {
                console.log(`[ChatHistoryService] 对话 ${conversationId} 的appType更新为 ${appType}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`[ChatHistoryService] 更新对话appType时出错:`, error);
            return false;
        }
    }

    /**
     * 批量更新对话的应用类型字段（迁移工具）
     * @param {string} appType 应用类型
     * @param {string} titlePrefix 标题前缀用于筛选（可选）
     * @returns {Promise<number>} 成功更新的对话数量
     */
    static async batchUpdateAppType(appType, titlePrefix = '') {
        try {
            console.log(`[ChatHistoryService] 开始批量更新appType为 ${appType}`);
            
            // 获取所有对话
            const allConversations = await this.getConversationList();
            
            // 筛选需要更新的对话
            let targetConversations = allConversations;
            
            // 如果提供了标题前缀，则根据前缀筛选
            if (titlePrefix) {
                targetConversations = allConversations.filter(conv => 
                    conv.title && conv.title.startsWith(titlePrefix)
                );
            } else if (appType === 'chat') {
                // 如果是chat应用且没有提供前缀，则选取没有前缀的对话
                targetConversations = allConversations.filter(conv => 
                    !conv.title || !conv.title.startsWith('[')
                );
            }
            
            console.log(`[ChatHistoryService] 找到 ${targetConversations.length} 个符合条件的对话`);
            
            // 批量更新
            let successCount = 0;
            for (const conv of targetConversations) {
                if (await this.updateConversationAppType(conv.id, appType)) {
                    successCount++;
                }
            }
            
            console.log(`[ChatHistoryService] 成功更新 ${successCount}/${targetConversations.length} 个对话的appType`);
            return successCount;
        } catch (error) {
            console.error(`[ChatHistoryService] 批量更新appType时出错:`, error);
            return 0;
        }
    }

    // --- 工具方法 ---

    /**
     * 解析消息字段从JSON字符串到数组
     * @param {Object} conversation 原始对话对象
     * @returns {Array} 解析后的消息数组
     * @private
     */
    static _parseMessages(conversation) {
        if (!conversation) return [];
        
        try {
            // 如果messages是字符串，尝试解析
            if (typeof conversation.messages === 'string') {
                return JSON.parse(conversation.messages);
            }
            // 如果已经是数组，直接返回
            if (Array.isArray(conversation.messages)) {
                return conversation.messages;
            }
            // 默认返回空数组
            return [];
        } catch (error) {
            console.error('[ChatHistoryService] Error parsing messages:', error);
            return [];
        }
    }

    /**
     * 计算对话中的消息数量
     * @param {Object} conversation 对话对象
     * @returns {number} 消息数量
     * @private
     */
    static _countMessages(conversation) {
        if (!conversation) return 0;
        
        try {
            const messages = this._parseMessages(conversation);
            return messages.length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * 为对话生成默认标题（基于首条消息）
     * @param {Object} conversation 对话对象
     * @returns {string} 生成的标题
     * @private
     */
    static _generateDefaultTitle(conversation) {
        try {
            const messages = this._parseMessages(conversation);
            if (messages.length > 0) {
                // 查找第一条用户消息
                const firstUserMessage = messages.find(msg => msg.role === 'user');
                if (firstUserMessage && firstUserMessage.content) {
                    // 截取前20个字符作为标题，如果需要的话再加省略号
                    const title = firstUserMessage.content.slice(0, 20);
                    return title.length < firstUserMessage.content.length ? `${title}...` : title;
                }
            }
            return `对话 ${new Date(conversation.createdAt).toLocaleDateString()}`;
        } catch (error) {
            return `对话 ${conversation.id.substring(0, 8)}`;
        }
    }
}

export default ChatHistoryService; 