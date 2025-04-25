/**
 * EVYD产品经理AI工作台 - Requirement Analysis Assistant
 * API交互模块 (Refactored to remove direct UI dependency)
 */

import { getApiBaseUrl } from '/scripts/utils/helper.js'; // Assuming helper exists
import { t } from '/scripts/i18n.js';
// import { marked } from 'marked'; // Marked likely used by UI, not API

// NOTE: This assumes the Dify interactions for Requirement Analysis
// also use the /chat-messages endpoint and streaming.
// Adjust URLs and request bodies if the actual Dify app is different.

const API = {
    currentAbortController: null,

    /**
     * 获取应用信息
     * @param {string} apiKey 
     * @param {string} apiEndpoint 
     * @param {object} callbacks - Callbacks for UI updates: onLoading, onError, onAppInfo
     */
    async fetchAppInfo(apiKey, apiEndpoint, callbacks) {
        if (!apiKey) {
            callbacks?.onError(t('requirementAnalysis.apiKeyMissingError', { default: '未配置 Requirement Analysis API 密钥。' }));
            return;
        }
        if (!apiEndpoint) {
            callbacks?.onError(t('requirementAnalysis.apiEndpointMissing', { default: '未配置 Requirement Analysis API 地址。' }));
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
            // console.log('Dify Info Response:', data); // Keep or remove debug log
            // if (!data || !data.app) throw new Error('Invalid app info structure received'); // REMOVE this check
            
            callbacks?.onAppInfo(data); 

        } catch (error) {
            console.error('[RA API] Connection Error:', error);
            const errorMsg = t('requirementAnalysis.connectionErrorDesc', { default: '无法连接到Dify API，请检查设置。'});
            callbacks?.onError(`${errorMsg} (${error.message})`);
            // Still provide basic app info for UI structure even if fetch fails
            callbacks?.onAppInfo({
                name: t('requirementAnalysis.appName', {default: '需求分析助手'}),
                description: t('requirementAnalysis.connectionErrorDesc', {default: '无法连接Dify API，请检查设置...'}),
            });
        }
    },
    
    /**
     * 生成分析结果 (Chat Endpoint - Assumption)
     * @param {string} requirement - The user's input prompt.
     * @param {string} apiKey - Dify API Key.
     * @param {string} apiEndpoint - Dify API Endpoint base URL.
     * @param {object} user - User information (e.g., { username }).
     * @param {string | null} conversationId - Existing conversation ID or null.
     * @param {object} callbacks - Callbacks for UI updates: 
     *    onRequesting, onGenerating, onStopping, onComplete, onStats, 
     *    onStreamChunk, onSystemInfo, onStopMessage, onErrorInResult, 
     *    onMessageIdReceived, onConversationIdReceived
     * @returns {Promise<{ conversationId: string | null }>} The final conversation ID.
     */
    async generateAnalysis(requirement, apiKey, apiEndpoint, user, conversationId = null, callbacks) {
        if (!apiKey || !apiEndpoint || !user || !requirement) {
            console.error("Missing parameters for generateAnalysis");
            callbacks?.onErrorInResult(t('requirementAnalysis.missingParams', { default: '缺少必要参数，无法生成。' }));
            return { conversationId: conversationId }; 
        }

        const chatUrl = `${apiEndpoint}/chat-messages`; 
        let initialConversationId = conversationId; 

        this.currentAbortController = new AbortController();
        const signal = this.currentAbortController.signal;
        
        // Notify UI that request is starting
        callbacks?.onRequesting();

        try {
            const requestData = {
                query: requirement,
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
            
            // Process the stream
            const streamResult = await this.handleStreamResponse(response, callbacks);
            // Notify completion (even if stream had internal errors, the fetch itself succeeded)
            callbacks?.onComplete(); 
            return { conversationId: streamResult.conversationId || initialConversationId };

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('[RA API] Generation aborted by user.');
                callbacks?.onStopMessage(); // Show stopped message in UI via callback
            } else {
                console.error('[RA API] Generation failed:', error);
                callbacks?.onErrorInResult(t('requirementAnalysis.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
            }
            // Ensure UI state is reset regardless of error type
            callbacks?.onComplete(); // Call complete callback to reset UI state
            this.currentAbortController = null; // Clear controller
            return { conversationId: initialConversationId }; 
        }
    },
    
    /**
     * 处理流式响应
     * @param {Response} response - The fetch Response object.
     * @param {object} callbacks - Callbacks from generateAnalysis.
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

        // Callbacks replace direct UI calls
        callbacks?.onClearResult(); // Clear previous results before streaming
        callbacks?.onShowResultContainer();

         while (true) {
            let value, done;
            try {
                 ({ value, done } = await reader.read());
            } catch (streamError) {
                 console.error("[RA Stream] Error reading stream:", streamError);
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

                    // --- Capture IDs & Notify --- 
                    if (data.message_id && !capturedMessageId) {
                        capturedMessageId = data.message_id;
                        callbacks?.onMessageIdReceived(capturedMessageId); // Pass ID back
                        if (!isGenerationStartedUIUpdated) {
                             callbacks?.onGenerating(); // Update button to show generating/stop
                             isGenerationStartedUIUpdated = true;
                        }
                        callbacks?.onSystemInfo({ message_id: capturedMessageId, conversation_id: capturedConversationId, ...metadata });
                    }
                    if (data.conversation_id && !capturedConversationId) {
                        capturedConversationId = data.conversation_id;
                        callbacks?.onConversationIdReceived(capturedConversationId); // Pass ID back
                        callbacks?.onSystemInfo({ message_id: capturedMessageId, conversation_id: capturedConversationId, ...metadata });
                    }
                    
                    // --- Handle Content --- 
                    let textChunk = '';
                    if (data.event === 'agent_message' || data.event === 'message') {
                        textChunk = data.answer || '';
                        if (textChunk) {
                             callbacks?.onStreamChunk(textChunk); // Pass chunk to UI callback
                        }
                    } else if (data.event === 'message_end' && data.metadata) {
                         // --- Handle Completion Metadata --- 
                         const endTime = Date.now();
                         const elapsedTime = (endTime - startTime) / 1000;
                         metadata = { ...metadata, ...data.metadata, elapsed_time: elapsedTime };
                         callbacks?.onStats(metadata); // Pass stats back
                         callbacks?.onSystemInfo(metadata); // Pass final system info
                    } else if (data.event === 'error') {
                         // --- Handle Stream Error Event --- 
                        console.error('Stream error event:', data);
                        const errorMsg = data.code ? `[${data.code}] ${data.message}` : (data.error || 'Unknown stream error');
                        callbacks?.onErrorInResult(errorMsg); // Show error via callback
                    }
                    
                } catch (e) { 
                    console.warn('Failed to parse stream data line:', line, e); 
                }
            }
        }
        
        // --- Final Updates After Stream --- 
        // Completion/UI reset is now handled by the caller (generateAnalysis) or its callbacks
        // REMOVED: UI.renderMarkdown(); 
        // REMOVED: UI.showGenerationCompleted();
        // REMOVED: State updates
        
        this.currentAbortController = null; // Clear controller locally
        
        return { conversationId: capturedConversationId }; // Return the captured conversation ID
    },
    
    /**
     * 停止生成
     * @param {string} messageId - The message ID to stop.
     * @param {string} apiKey - Dify API Key.
     * @param {string} apiEndpoint - Dify API Endpoint base URL.
     * @param {object} user - User information.
     * @param {object} callbacks - Callbacks: onStopping, onComplete, onStopMessage, onError
     */
    async stopGeneration(messageId, apiKey, apiEndpoint, user, callbacks) {
        if (!messageId || !apiKey || !apiEndpoint || !user) {
            console.error("Missing parameters for stopGeneration (RA)");
            callbacks?.onError('缺少停止参数。'); // Notify via generic error callback
            return;
        }
        
        const stopUrl = `${apiEndpoint}/chat-messages/${messageId}/stop`;
        callbacks?.onStopping(); // Indicate attempt to stop

        // If there's an active fetch request, abort it first
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
            console.log("[RA API] Aborted fetch request.");
            // The fetch catch block in generateAnalysis should handle calling onStopMessage/onComplete callbacks
            return; // Aborting is sufficient
        }

        // If no active fetch, try calling the stop endpoint directly
        console.log("[RA API] No active fetch, attempting direct stop call to Dify...");
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
                console.log("[RA API] Dify stop endpoint call successful.");
                callbacks?.onStopMessage(); // Notify UI via callback
            } else {
                console.warn(`[RA API] Dify stop endpoint call returned non-success: ${data.message || 'Unknown'}`);
            }
        } catch (error) {
            console.error('[RA API] Direct stop endpoint call error:', error);
            callbacks?.onError('调用停止接口失败。'); // Notify UI
        } finally {
            // Ensure UI/State is reset via onComplete callback regardless of stop endpoint result
            callbacks?.onComplete();
        }
    }
};

export default API; 