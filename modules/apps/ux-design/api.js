/**
 * UX 设计助手 API 相关功能 (Refactored to remove direct UI dependency)
 */
// REMOVED: import UXDesignUI from './ui.js';
import { getApiBaseUrl } from '/scripts/utils/helper.js';
import { t } from '/scripts/i18n.js';
// REMOVED: import UXDesignApp from './index.js';

const UXDesignAPI = {
    currentAbortController: null,

    /**
     * 获取UX Design App信息
     * @param {string} apiKey 
     * @param {string} apiEndpoint 
     * @param {object} callbacks - Callbacks: onLoading, onError, onAppInfo
     */
    async fetchAppInfo(apiKey, apiEndpoint, callbacks) {
        // console.log("Fetching UX Design app info...");
        if (!apiKey) {
            callbacks?.onError(t('uxDesign.apiKeyMissingError', { default: '未配置 UX Design API 密钥。' }));
            return;
        }
        if (!apiEndpoint) {
            callbacks?.onError(t('uxDesign.apiEndpointMissing', { default: '未配置 UX Design API 地址。' }));
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
            // console.log('Dify App Info Response (UX Design):', data);
            callbacks?.onAppInfo(data);

        } catch (error) {
            console.error('Error fetching Dify app info (UX Design):', error);
            const errorMsg = t('uxDesign.connectionError', { default: '无法连接到 Dify API'});
            callbacks?.onError(`${errorMsg}: ${error.message}`);
            // Provide fallback info
             callbacks?.onAppInfo({
                 name: t('uxDesign.defaultAppName', {default: 'UX 界面设计助手'}),
                 description: t('uxDesign.connectionError', {default: '无法连接Dify API，请检查设置...'}),
             });
        }
    },

    /**
     * 生成UX设计提示词
     * @param {string} requirement - The requirement description.
     * @param {string} apiKey - Dify API Key.
     * @param {string} apiEndpoint - Dify API Endpoint base URL.
     * @param {object} user - User information.
     * @param {string | null} conversationId - Existing conversation ID or null.
     * @param {object} callbacks - Callbacks for UI updates.
     * @returns {Promise<{ conversationId: string | null }>} The final conversation ID.
     */
    async generatePrompt(requirement, apiKey, apiEndpoint, user, conversationId = null, callbacks) {
        if (!apiKey || !apiEndpoint || !user || !requirement) {
            console.error("Missing parameters for generatePrompt (UX Design)");
            callbacks?.onErrorInResult(t('uxDesign.missingParams', { default: '缺少必要参数，无法生成。' }));
            return { conversationId: conversationId };
        }

        const chatUrl = `${apiEndpoint}/chat-messages`; // Assuming chat endpoint
        let initialConversationId = conversationId;

        this.currentAbortController = new AbortController();
        const signal = this.currentAbortController.signal;

        callbacks?.onRequesting();

        try {
            const requestData = {
                query: requirement,
                inputs: {}, // Add specific inputs if needed for UX Design Chatbot
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

            // Process the stream using the common handler
            const streamResult = await this.handleStreamResponse(response, callbacks);
            callbacks?.onComplete();
            return { conversationId: streamResult.conversationId || initialConversationId };

        } catch (error) {
             if (error.name === 'AbortError') {
                console.log('[UX API] Generation aborted by user.');
                callbacks?.onStopMessage();
            } else {
                console.error('[UX API] Generation failed:', error);
                callbacks?.onErrorInResult(t('uxDesign.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
            }
            callbacks?.onComplete();
            this.currentAbortController = null;
            return { conversationId: initialConversationId };
        }
    },

    /**
     * 处理流式响应 (Common logic)
     * @param {Response} response - The fetch Response object.
     * @param {object} callbacks - Callbacks from generatePrompt.
     * @returns {Promise<{ conversationId: string | null }>} The captured conversation ID.
     */
    async handleStreamResponse(response, callbacks) {
        // This logic is identical to the other API modules now
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
                 console.error("[UX Stream] Error reading stream:", streamError);
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
     * 停止生成 (Common logic)
     * @param {string} messageId - The message ID to stop.
     * @param {string} apiKey - Dify API Key.
     * @param {string} apiEndpoint - Dify API Endpoint base URL.
     * @param {object} user - User information.
     * @param {object} callbacks - Callbacks.
     */
    async stopGeneration(messageId, apiKey, apiEndpoint, user, callbacks) {
        // Identical logic to other modules
        if (!messageId || !apiKey || !apiEndpoint || !user) {
            console.error("Missing parameters for stopGeneration (UX)");
            callbacks?.onError('缺少停止参数。');
            return;
        }
        
        const stopUrl = `${apiEndpoint}/chat-messages/${messageId}/stop`;
        callbacks?.onStopping();

        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
            console.log("[UX API] Aborted fetch request.");
            return; 
        }

        console.log("[UX API] No active fetch, attempting direct stop call to Dify...");
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
                console.log("[UX API] Dify stop endpoint call successful.");
                callbacks?.onStopMessage();
            } else {
                console.warn(`[UX API] Dify stop endpoint call returned non-success: ${data.message || 'Unknown'}`);
            }
        } catch (error) {
            console.error('[UX API] Direct stop endpoint call error:', error);
            callbacks?.onError('调用停止接口失败。');
        } finally {
            callbacks?.onComplete();
        }
    }
};

export default UXDesignAPI; 