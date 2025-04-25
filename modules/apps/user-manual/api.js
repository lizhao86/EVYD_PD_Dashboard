/**
 * EVYD产品经理AI工作台 - User Manual生成器
 * API交互模块 (Refactored to remove direct UI dependency)
 */

import { getApiBaseUrl } from '/scripts/utils/helper.js';
import { t } from '/scripts/i18n.js';

const API = {
    currentAbortController: null,
    
    /**
     * 获取 User Manual App 的信息
     * @param {string} apiKey 
     * @param {string} apiEndpoint 
     * @param {object} callbacks - Callbacks: onLoading, onError, onAppInfo
     */
    async fetchAppInfo(apiKey, apiEndpoint, callbacks) {
        if (!apiKey) {
            callbacks?.onError(t('userManual.apiKeyMissingError', { default: '未配置 User Manual API 密钥。'}));
            return;
        }
        if (!apiEndpoint) {
            callbacks?.onError(t('userManual.apiEndpointMissing', { default: '未配置 User Manual API 地址。'}));
            return;
        }
        
        callbacks?.onLoading();
        const infoUrl = `${apiEndpoint}/info`;

        try {
            const response = await fetch(infoUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (!response.ok) {
                let errorDetail = '';
                try { errorDetail = JSON.stringify(await response.json()); } catch { errorDetail = await response.text(); }
                throw new Error(`Request failed: ${response.status} ${response.statusText}. Details: ${errorDetail}`);
            }
            
            const data = await response.json();
            callbacks?.onAppInfo(data);

        } catch (error) {
            console.error('Error fetching Dify app info (User Manual):', error);
            const errorMsg = t('userManual.connectionError', { default: '无法连接到 Dify API'});
            callbacks?.onError(`${errorMsg}: ${error.message}`);
            callbacks?.onAppInfo({
                name: t('userManual.defaultAppName', {default: 'User Manual 生成器'}),
                description: t('userManual.connectionError', {default: '无法连接Dify API，请检查设置...'}),
            });
        }
    },
    
    /**
     * 生成 User Manual 内容
     * @param {string} userStory - The User Story input.
     * @param {string} apiKey - Dify API Key.
     * @param {string} apiEndpoint - Dify API Endpoint base URL.
     * @param {object} user - User information (e.g., { username }).
     * @param {string | null} conversationId - Existing conversation ID or null.
     * @param {object} callbacks - Callbacks for UI updates (same set as generateAnalysis).
     * @returns {Promise<{ conversationId: string | null }>} The final conversation ID.
     */
    async generateUserManual(userStory, apiKey, apiEndpoint, user, conversationId = null, callbacks) {
         if (!apiKey || !apiEndpoint || !user || !userStory) {
            console.error("Missing parameters for generateUserManual");
            callbacks?.onErrorInResult(t('userManual.missingParams', { default: '缺少必要参数，无法生成。' }));
            return { conversationId: conversationId }; 
        }
        
        const chatUrl = `${apiEndpoint}/chat-messages`;
        let initialConversationId = conversationId;

        this.currentAbortController = new AbortController();
        const signal = this.currentAbortController.signal;

        callbacks?.onRequesting();

        try {
            const requestData = {
                query: userStory,
                inputs: {},
                response_mode: "streaming",
                conversation_id: conversationId || "",
                user: user.username || 'default-user',
                files: [],
                auto_generate_name: !conversationId
            };

            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
                signal: signal
            });

            if (!response.ok) {
                let errorDetail = '';
                try { errorDetail = JSON.stringify(await response.json()); } catch { errorDetail = await response.text(); }
                throw new Error(`Request failed: ${response.status} ${response.statusText}. Details: ${errorDetail}`);
            }

            const streamResult = await this.handleStreamResponse(response, callbacks); 
            callbacks?.onComplete();
            return { conversationId: streamResult.conversationId || initialConversationId };

        } catch (error) {
             if (error.name === 'AbortError') {
                console.log('[UM API] Generation aborted by user.');
                callbacks?.onStopMessage();
            } else {
                console.error('[UM API] Generation failed:', error);
                callbacks?.onErrorInResult(t('userManual.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
            }
            callbacks?.onComplete();
            this.currentAbortController = null;
            return { conversationId: initialConversationId };
        }
    },
    
    /**
     * 处理流式响应 (Common logic, same as Requirement Analysis)
     * @param {Response} response - The fetch Response object.
     * @param {object} callbacks - Callbacks from generateUserManual.
     * @returns {Promise<{ conversationId: string | null }>} The captured conversation ID.
     */
    async handleStreamResponse(response, callbacks) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let capturedMessageId = null; 
        let capturedConversationId = null; 
        let metadata = {}; 
        let startTime = Date.now();
        let isGenerationStartedUIUpdated = false;

        callbacks?.onClearResult();
        callbacks?.onShowResultContainer();

         while (true) {
            let value, done;
            try {
                 ({ value, done } = await reader.read());
            } catch (streamError) {
                 console.error("[UM Stream] Error reading stream:", streamError);
                 callbacks?.onErrorInResult('读取响应流时出错。');
                 break; 
            }

            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            let lines = chunk.split('\n\n'); 
            
            for (let line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue;
                line = line.substring(6);
                
                try {
                    const data = JSON.parse(line);
                    metadata = { ...metadata, ...data }; 

                    if (data.message_id && !capturedMessageId) {
                        capturedMessageId = data.message_id;
                        callbacks?.onMessageIdReceived(capturedMessageId);
                        if (!isGenerationStartedUIUpdated) {
                             callbacks?.onGenerating();
                             isGenerationStartedUIUpdated = true;
                        }
                        callbacks?.onSystemInfo({ message_id: capturedMessageId, conversation_id: capturedConversationId, ...metadata });
                    }
                    if (data.conversation_id && !capturedConversationId) {
                        capturedConversationId = data.conversation_id;
                        callbacks?.onConversationIdReceived(capturedConversationId);
                        callbacks?.onSystemInfo({ message_id: capturedMessageId, conversation_id: capturedConversationId, ...metadata });
                    }
                    
                    let textChunk = '';
                    if (data.event === 'agent_message' || data.event === 'message') {
                        textChunk = data.answer || '';
                        if (textChunk) {
                             callbacks?.onStreamChunk(textChunk);
                        }
                    } else if (data.event === 'message_end' && data.metadata) {
                         const endTime = Date.now();
                         const elapsedTime = (endTime - startTime) / 1000;
                         metadata = { ...metadata, ...data.metadata, elapsed_time: elapsedTime };
                         callbacks?.onStats(metadata);
                         callbacks?.onSystemInfo(metadata);
                    } else if (data.event === 'error') {
                        console.error('Stream error event:', data);
                        const errorMsg = data.code ? `[${data.code}] ${data.message}` : (data.error || 'Unknown stream error');
                        callbacks?.onErrorInResult(errorMsg);
                    }
                    
                } catch (e) { 
                    console.warn('Failed to parse stream data line:', line, e); 
                }
            }
        }
        
        this.currentAbortController = null; 
        return { conversationId: capturedConversationId }; 
    },
    
    /**
     * 停止生成 (Common logic, same as Requirement Analysis)
     * @param {string} messageId - The message ID to stop.
     * @param {string} apiKey - Dify API Key.
     * @param {string} apiEndpoint - Dify API Endpoint base URL.
     * @param {object} user - User information.
     * @param {object} callbacks - Callbacks: onStopping, onComplete, onStopMessage, onError
     */
    async stopGeneration(messageId, apiKey, apiEndpoint, user, callbacks) {
        if (!messageId || !apiKey || !apiEndpoint || !user) {
            console.error("Missing parameters for stopGeneration (UM)");
            callbacks?.onError('缺少停止参数。');
            return;
        }
        
        const stopUrl = `${apiEndpoint}/chat-messages/${messageId}/stop`;
        callbacks?.onStopping();

        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
            console.log("[UM API] Aborted fetch request.");
            return; 
        }

        console.log("[UM API] No active fetch, attempting direct stop call to Dify...");
        try {
            const response = await fetch(stopUrl, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${apiKey}`, 
                    'User-Agent': 'EVYD-PM-Dashboard/1.0'
                }
            });
            
            if (!response.ok) throw new Error(`Stop request failed: ${response.status} ${response.statusText}`);
            
            const data = await response.json();
            if (data.result === 'success') {
                console.log("[UM API] Dify stop endpoint call successful.");
                callbacks?.onStopMessage();
            } else {
                console.warn(`[UM API] Dify stop endpoint call returned non-success: ${data.message || 'Unknown'}`);
            }
        } catch (error) {
            console.error('[UM API] Direct stop endpoint call error:', error);
            callbacks?.onError('调用停止接口失败。');
        } finally {
            callbacks?.onComplete();
        }
    }
};

export default API; 