/**
 * User Story 生成器 API 交互模块 (Refactored to remove direct UI dependency)
 */
// REMOVED: import UI from './ui.js';
import { getApiBaseUrl } from '/scripts/utils/helper.js';
import { t } from '/scripts/i18n.js';
// REMOVED: import UserStoryApp from './index.js'; // Avoid circular dependency

const API = {
    currentAbortController: null,

    /**
     * 获取 User Story App 的信息
     * @param {string} apiKey 
     * @param {string} apiEndpoint 
     * @param {object} callbacks - Callbacks: onLoading, onError, onAppInfo
     */
    async fetchAppInfo(apiKey, apiEndpoint, callbacks) {
        // console.log("Fetching User Story app info...");
        if (!apiKey) {
            callbacks?.onError(t('userStory.apiKeyMissingError', { default: '未配置 User Story API 密钥。' }));
            return;
        }
        if (!apiEndpoint) {
            callbacks?.onError(t('userStory.apiEndpointMissing', { default: '未配置 User Story API 地址。' }));
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
            // console.log('Dify App Info Response (User Story):', data);
            callbacks?.onAppInfo(data);

        } catch (error) {
            console.error('Error fetching Dify app info (User Story):', error);
            const errorMsg = t('userStory.connectionError', { default: '无法连接到 Dify API'});
            callbacks?.onError(`${errorMsg}: ${error.message}`);
            callbacks?.onAppInfo({
                 name: t('userStory.defaultAppName', {default: 'User Story 生成器'}),
                 description: t('userStory.connectionError', {default: '无法连接Dify API，请检查设置...'}),
             });
        }
    },

    /**
     * 生成 User Story 内容 (Chat Endpoint)
     * @param {string} platformName
     * @param {string} systemName
     * @param {string} moduleName
     * @param {string} requirementDescription
     * @param {string} apiKey - Dify API Key.
     * @param {string} apiEndpoint - Dify API Endpoint base URL.
     * @param {object} user - User information.
     * @param {string | null} conversationId - Existing conversation ID or null.
     * @param {object} callbacks - Callbacks for UI updates.
     * @returns {Promise<{ conversationId: string | null }>} The final conversation ID.
     */
    async generateUserStory(platformName, systemName, moduleName, requirementDescription, apiKey, apiEndpoint, user, conversationId = null, callbacks) {
        // Check for essential parameters, conversationId is optional
        if (!apiKey || !apiEndpoint || !user || !requirementDescription || !platformName || !systemName || !moduleName) {
            console.error("Missing parameters for generateUserStory");
            callbacks?.onErrorInResult(t('userStory.missingParams', { default: '缺少必要参数，无法生成。' }));
            return { conversationId: conversationId }; // Return null taskId or initial conversationId
        }

        // MODIFIED: Use the workflow run endpoint
        const runUrl = `${apiEndpoint}/workflows/run`;
        // REMOVED: let initialConversationId = conversationId; // Not relevant for workflow taskId

        this.currentAbortController = new AbortController();
        const signal = this.currentAbortController.signal;

        callbacks?.onRequesting();

        try {
            // MODIFIED: Construct requestData for workflow endpoint
            const requestData = {
                inputs: {
                    // MODIFIED: Use CamelCase keys to match the error message / likely Dify config
                    Platform: platformName,
                    System: systemName,
                    Module: moduleName,
                    // Assuming the main text variable is Requirements, based on error pattern and previous code
                    Requirements: requirementDescription
                },
                response_mode: "streaming",
                user: user.username || 'default-user'
                // Remove chat-specific fields: query, conversation_id, files, auto_generate_name
            };

            // console.log("[US API] Sending generation request to workflow:", JSON.stringify(requestData, null, 2));

            const response = await fetch(runUrl, { // Use runUrl
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
                signal: signal
            });

            if (!response.ok) {
                let errorDetail = '';
                try { errorDetail = JSON.stringify(await response.json()); } catch { errorDetail = await response.text(); }
                 // Attempt to parse Dify's specific error structure
                let specificError = 'Unknown error from API.';
                try {
                    const errorJson = JSON.parse(errorDetail);
                    specificError = `${errorJson.code}: ${errorJson.message}` || errorDetail;
                } catch { /* Ignore parse error */ }
                throw new Error(`Request failed: ${response.status} ${response.statusText}. Details: ${specificError}`);
            }

            // IMPORTANT: Current handleStreamResponse is for CHAT, will likely fail for WORKFLOW.
            // We expect this to break here or show no output until handleStreamResponse is fixed.
            const streamResult = await this.handleStreamResponse(response, callbacks);
            callbacks?.onComplete(); // May be called prematurely if stream handler fails
            // Workflow doesn't return conversationId, maybe taskId? Stream handler needs update.
            return { conversationId: null }; // Return placeholder

        } catch (error) {
             if (error.name === 'AbortError') {
                console.log('[US API] Generation aborted by user.');
                callbacks?.onStopMessage(); // This might not work correctly if stop is also broken
            } else {
                console.error('[US API] Generation failed:', error);
                callbacks?.onErrorInResult(t('userStory.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
            }
            callbacks?.onComplete();
            this.currentAbortController = null;
            // Workflow doesn't return conversationId
            return { conversationId: null }; 
        }
    },

    /**
     * 处理流式响应 (Common logic)
     * @param {Response} response - The fetch Response object.
     * @param {object} callbacks - Callbacks from generateUserStory.
     * @returns {Promise<{ conversationId: string | null }>} The captured conversation ID.
     */
    async handleStreamResponse(response, callbacks) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let capturedTaskId = null; 
        let metadata = {}; 
        let startTime = Date.now();
        let isGenerationStartedUIUpdated = false;
        let accumulatedText = ''; // Accumulate text for final output if needed

        callbacks?.onClearResult();
        callbacks?.onShowResultContainer();

         while (true) {
            let value, done;
            try {
                 ({ value, done } = await reader.read());
            } catch (streamError) {
                 console.error("[US Workflow Stream] Error reading stream:", streamError);
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

                    if (data.event === 'workflow_started' && data.task_id && !capturedTaskId) {
                        capturedTaskId = data.task_id;
                        callbacks?.onMessageIdReceived(capturedTaskId); 
                        if (!isGenerationStartedUIUpdated) {
                             callbacks?.onGenerating();
                             isGenerationStartedUIUpdated = true;
                        }
                        callbacks?.onSystemInfo({ task_id: capturedTaskId, ...metadata }); 
                    } else if (data.event === 'node_started') {
                        callbacks?.onSystemInfo({ current_node: data.data?.title, task_id: capturedTaskId, ...metadata }); 
                    } else if (data.event === 'node_finished') {
                        let textChunk = '';
                        if (data.data?.outputs?.text) {
                            textChunk = data.data.outputs.text;
                        } else if (data.data?.outputs?.result) {
                             textChunk = typeof data.data.outputs.result === 'string' ? data.data.outputs.result : ''
                        } else if (data.data?.outputs?.content) {
                             textChunk = typeof data.data.outputs.content === 'string' ? data.data.outputs.content : '';
                        } 
                        
                        if (textChunk) {
                             accumulatedText += textChunk;
                             callbacks?.onStreamChunk(textChunk);
                        }
                        callbacks?.onSystemInfo({ finished_node: data.data?.title, task_id: capturedTaskId, ...metadata }); 
                    } else if (data.event === 'workflow_finished') {
                        const finalData = data.data || {};
                        metadata = { ...metadata, ...finalData };
                        const usage = finalData.usage || {};
                        const endTime = Date.now();
                        const elapsedTime = finalData.elapsed_time ?? (endTime - startTime) / 1000;
                        const stats = {
                           elapsed_time: elapsedTime,
                           total_tokens: usage.total_tokens || 0,
                           total_price: usage.total_price || 0,
                           currency: usage.currency || 'USD',
                           total_steps: finalData.total_steps || 1
                        }; 
                        callbacks?.onStats(stats);
                        callbacks?.onSystemInfo({ task_id: capturedTaskId, status: 'Finished', ...metadata }); 
                        
                        if (accumulatedText.length === 0 && finalData.outputs) {
                            let finalOutputText = '';
                            if(typeof finalData.outputs.text === 'string') {
                                finalOutputText = finalData.outputs.text;
                            } else if (typeof finalData.outputs.result === 'string') {
                                 finalOutputText = finalData.outputs.result;
                            } else if (typeof finalData.outputs.content === 'string') {
                                 finalOutputText = finalData.outputs.content;
                            }
                            
                            if(finalOutputText) {
                                callbacks?.onStreamChunk(finalOutputText);
                            }
                        }
                        break;
                    } else if (data.event === 'error') {
                        console.error('[US Workflow Stream] Error event:', data);
                        const errorMsg = data.code ? `[${data.code}] ${data.message}` : (data.error || 'Unknown stream error');
                        callbacks?.onErrorInResult(errorMsg);
                        callbacks?.onSystemInfo({ task_id: capturedTaskId, status: 'Error', error: errorMsg, ...metadata }); 
                         break;
                    }
                    
                } catch (e) { 
                    console.warn('Failed to parse workflow stream data line:', line, e); 
                }
            }
        }
        
        this.currentAbortController = null; 
        return { conversationId: null }; 
    },

    /**
     * 停止生成 (Modified for Workflow)
     * @param {string} taskId - The TASK ID to stop (received via onMessageIdReceived).
     * @param {string} apiKey - Dify API Key.
     * @param {string} apiEndpoint - Dify API Endpoint base URL.
     * @param {object} user - User information.
     * @param {object} callbacks - Callbacks.
     */
    async stopGeneration(taskId, apiKey, apiEndpoint, user, callbacks) {
        if (!taskId || !apiKey || !apiEndpoint || !user) {
            console.error("Missing parameters for stopGeneration (US Workflow)");
            callbacks?.onError('缺少停止参数 (Task ID)。');
            return;
        }
        
        const stopUrl = `${apiEndpoint}/workflows/tasks/${taskId}/stop`;
        callbacks?.onStopping();

        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
            console.log("[US API] Aborted fetch request (stop clicked early).");
        }

        console.log("[US API] Attempting direct stop call to Dify Workflow endpoint...");
        try {
            const response = await fetch(stopUrl, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${apiKey}`, 
                    'Content-Type': 'application/json',
                    'User-Agent': 'EVYD-PM-Dashboard/1.0'
                },
                body: JSON.stringify({ user: user.username || 'default-user' })
            });
            
            if (!response.ok) {
                let errorDetail = 'Failed to stop workflow.';
                 try { errorDetail = JSON.stringify(await response.json()); } catch { errorDetail = await response.text(); }
                throw new Error(`Stop request failed: ${response.status} ${response.statusText}. Details: ${errorDetail}`);
            }
            
            const data = await response.json();
            if (data.result === 'success' || data.status === 'stopped' || response.status === 200) {
                console.log("[US API] Dify workflow stop endpoint call successful or task already stopped.");
                callbacks?.onStopMessage();
            } else {
                console.warn(`[US API] Dify workflow stop endpoint call returned non-success or unexpected status: ${data.message || 'Unknown'}`);
                callbacks?.onStopMessage();
            }
        } catch (error) {
            console.error('[US API] Direct workflow stop endpoint call error:', error);
            callbacks?.onError('调用停止接口失败。' + error.message);
            callbacks?.onStopMessage(); 
        } finally {
            callbacks?.onComplete();
        }
    }
};

export default API; 