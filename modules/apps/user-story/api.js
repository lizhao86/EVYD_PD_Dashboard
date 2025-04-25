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
        let accumulatedText = '';
        let buffer = '';
        let accumulatedJsonData = ''; // Accumulate data across potential 'data:' lines

        // ADDED: Variables for line-based block processing
        let currentMessageLines = [];

        callbacks?.onClearResult();
        callbacks?.onShowResultContainer();

        while (true) {
            let value, done;
            try {
                ({ value, done } = await reader.read());
                if (done) break; // Exit loop if stream is finished

                buffer += decoder.decode(value, { stream: true });

                // Process buffer line by line, handling message blocks correctly
                let lineEndIndex;
                const lineSeparatorRegex = /\r?\n/;
                while ((lineEndIndex = buffer.search(lineSeparatorRegex)) >= 0) {
                    const line = buffer.substring(0, lineEndIndex); // Extract line (without separator)
                    const separatorLength = buffer.match(lineSeparatorRegex)[0].length;
                    buffer = buffer.substring(lineEndIndex + separatorLength); // Remove line and separator

                    // Check if the line is empty, indicating end of a message block
                    if (line.trim() === '') {
                        if (currentMessageLines.length > 0) {
                            let jsonDataFromBlock = '';
                            let eventTypeFromBlock = null;

                            for (const msgLine of currentMessageLines) {
                                if (msgLine.startsWith('data:')) {
                                    jsonDataFromBlock += msgLine.substring(msgLine.indexOf(':') + 1).trim();
                                } else if (msgLine.startsWith('event:')) {
                                    eventTypeFromBlock = msgLine.substring(msgLine.indexOf(':') + 1).trim();
                                }
                                // Ignore other lines like id:, retry:
                            }

                            if (jsonDataFromBlock) {
                                try {
                                    // console.log(`[US Workflow Stream] Parsing JSON from block end. Event: ${eventTypeFromBlock || 'N/A'}. Data: ${jsonDataFromBlock.substring(0,100)}...`);
                                    const data = JSON.parse(jsonDataFromBlock);
                                    metadata = { ...metadata, ...data }; // Merge metadata

                                    // --- Event Handling Logic --- 
                                    const currentEvent = eventTypeFromBlock || data.event;
                                    
                                     if (currentEvent === 'ping') {
                                        // console.log('[US Workflow Stream] Received ping.');
                                     } else if (currentEvent === 'workflow_started' && data.task_id && !capturedTaskId) {
                                        capturedTaskId = data.task_id;
                                        callbacks?.onMessageIdReceived(capturedTaskId);
                                        if (!isGenerationStartedUIUpdated) {
                                             callbacks?.onGenerating();
                                             isGenerationStartedUIUpdated = true;
                                        }
                                        callbacks?.onSystemInfo({ task_id: capturedTaskId, ...metadata });
                                    } else if (currentEvent === 'node_started') {
                                        callbacks?.onSystemInfo({ current_node: data.data?.title, task_id: capturedTaskId, ...metadata });
                                    } else if (currentEvent === 'node_finished') {
                                        let textChunk = '';
                                        const outputs = data.data?.outputs;
                                        if (outputs) {
                                            if (typeof outputs.text === 'string') { textChunk = outputs.text; }
                                            else if (typeof outputs.result === 'string') { textChunk = outputs.result; }
                                            else if (typeof outputs.content === 'string') { textChunk = outputs.content; }
                                            // Add check for the specific output variable if needed
                                            else if (outputs['User Story'] && typeof outputs['User Story'] === 'string') { textChunk = outputs['User Story']; }
                                        }
                                        if (textChunk) {
                                            // Keep accumulating internally, but don't pass it to callback yet
                                             accumulatedText += textChunk; 
                                            // Reinstating DIAGNOSTIC CHANGE logic based on user feedback:
                                            // Pass ONLY the current chunk to avoid potential side-effects
                                            // console.log(`[US Workflow Stream] Event: node_finished, Node: ${data.data?.node_id} ('${data.data?.title}'), passing CURRENT CHUNK ONLY.`); // REMOVED
                                            callbacks?.onStreamChunk(textChunk); // Pass ONLY textChunk
                                        }
                                        callbacks?.onSystemInfo({ finished_node: data.data?.title, task_id: capturedTaskId, ...metadata });
                                    } else if (currentEvent === 'workflow_finished') {
                                        const finalData = data.data || {};
                                        metadata = { ...metadata, ...finalData }; // Ensure metadata includes final data
                                        const usage = finalData.usage || metadata.usage || {}; // Get usage from finalData or metadata
                                        const endTime = Date.now();
                                        const elapsedTime = finalData.elapsed_time ?? (metadata.elapsed_time ?? (endTime - startTime) / 1000);
                                        const stats = {
                                           elapsed_time: elapsedTime,
                                           total_tokens: usage.total_tokens || 0,
                                           total_price: usage.total_price || 0,
                                           currency: usage.currency || 'USD',
                                           total_steps: finalData.total_steps || (metadata?.total_steps ?? 0)
                                        };
                                        callbacks?.onStats(stats);
                                        // Pass the potentially updated metadata
                                        callbacks?.onSystemInfo({ task_id: capturedTaskId, status: 'Finished', ...metadata });

                                        // Handle final output text if not accumulated during node events
                                        // Check finalData first, then potentially metadata if finalData is incomplete
                                        const finalOutputs = finalData.outputs || metadata?.outputs;
                                        // Reinstating DIAGNOSTIC CHANGE logic: Process finalOutputs if they exist
                                        if (finalOutputs) { 
                                            let finalOutputText = '';
                                            if(typeof finalOutputs.text === 'string') { finalOutputText = finalOutputs.text; }
                                            else if (typeof finalOutputs.result === 'string') { finalOutputText = finalOutputs.result; }
                                            else if (typeof finalOutputs.content === 'string') { finalOutputText = finalOutputs.content; }
                                            else if (finalOutputs['User Story'] && typeof finalOutputs['User Story'] === 'string') { finalOutputText = finalOutputs['User Story']; }
                                            // Add more checks if the output variable name is different

                                            if(finalOutputText) {
                                                // Reinstating DIAGNOSTIC CHANGE logic: Pass final chunk directly
                                                // console.log(`[US Workflow Stream] Event: workflow_finished, Processing final outputs and passing DIRECTLY.`); // REMOVED
                                                callbacks?.onStreamChunk(finalOutputText);
                                            } else {
                                                // console.warn('[US Workflow Stream] Workflow finished, but no recognizable text output found in final outputs:', finalOutputs); // Keep this warning
                                            }
                                        }
                                        // Workflow finished, exit
                                        this.currentAbortController = null;
                                        // Ensure complete is called *before* returning
                                        if (callbacks?.onComplete) callbacks.onComplete();
                                        return { conversationId: null };
                                    } else if (currentEvent === 'error') {
                                        console.error('[US Workflow Stream] Error event:', data);
                                        const errorMsg = data.code ? `[${data.code}] ${data.message}` : (data.error || 'Unknown stream error');
                                        callbacks?.onErrorInResult(errorMsg);
                                        // Pass the potentially updated metadata
                                        callbacks?.onSystemInfo({ task_id: capturedTaskId || data.task_id, status: 'Error', error: errorMsg, ...metadata }); // Use data.task_id if captured is null
                                        // Error occurred, exit
                                        this.currentAbortController = null;
                                        // Ensure complete is called *before* returning
                                        if (callbacks?.onComplete) callbacks.onComplete();
                                        return { conversationId: null };
                                    }
                                    // --- End of Event Handling Logic ---

                                } catch (e) {
                                    console.error('Failed to parse JSON from completed message block:', e);
                                    // Log the data that failed parsing
                                    // console.error('Problematic JSON string from block:', jsonDataFromBlock); // Commented out, useful for future errors
                                    callbacks?.onErrorInResult(`解析流数据块时出错: ${e.message}`);
                                    // Stop processing on parse error
                                    this.currentAbortController = null;
                                    // Ensure complete is called *before* returning
                                    if (callbacks?.onComplete) callbacks.onComplete();
                                    return { conversationId: null };
                                }
                            } // end if(jsonDataFromBlock)

                            // Reset for the next message block
                            currentMessageLines = []; 
                        } // end if (currentMessageLines.length > 0)
                        // else: Ignore consecutive empty lines
                    } else {
                        // Not an empty line, add it to the current message block lines
                        currentMessageLines.push(line);
                    }
                } // End of while loop (processing lines in buffer)

            } catch (streamError) {
                 console.error("[US Workflow Stream] Error reading stream:", streamError);
                 callbacks?.onErrorInResult('读取响应流时出错。');
                 // Ensure complete is called *before* breaking
                 if (callbacks?.onComplete) callbacks.onComplete();
                 this.currentAbortController = null;
                 break; // Exit outer loop on stream read error
            }
        } // End of outer while loop (reading stream)

        // Handle any remaining data in the buffer after the stream ends
        // This might happen if the stream ends without a final empty line
        if (accumulatedJsonData) {
             console.warn("[US Workflow Stream] Stream ended with unprocessed data in accumulator. Attempting parse:", accumulatedJsonData);
             try {
                // Attempt to parse the final chunk
                const data = JSON.parse(accumulatedJsonData);
                metadata = { ...metadata, ...data };
                // You might want to handle this final data piece if relevant, e.g., check for workflow_finished
                console.log("[US Workflow Stream] Successfully parsed final data chunk.");
                // Potentially call callbacks based on this final data
                 if (data.event === 'workflow_finished') {
                      // ... (repeat workflow_finished logic if necessary, though unlikely needed here) ...
                     callbacks?.onSystemInfo({ task_id: capturedTaskId, status: 'Finished', ...metadata });
                 } else if (data.event === 'error') {
                      // ... (repeat error logic if necessary) ...
                     callbacks?.onSystemInfo({ task_id: capturedTaskId, status: 'Error', ...metadata });
                 }
             } catch (e) {
                  console.error('[US Workflow Stream] Failed to parse final accumulated JSON data:', e);
                  console.error('Final problematic accumulated JSON string:', accumulatedJsonData);
                  // Don't call onErrorInResult here again if already called
             } finally {
                 accumulatedJsonData = ''; // Clear it
             }
        }


        console.log("[US Workflow Stream] Stream processing finished.");
        this.currentAbortController = null;
        // Ensure onComplete is called if the loop finishes normally without returning early
        // Add a check to prevent calling it twice if already called in error/finish handlers
        if (callbacks?.onComplete && !this.currentAbortController) {
            // We might need a flag to track if onComplete was called inside the loop
            // For simplicity, let's assume it should always be called if we reach here naturally.
            // However, the return statements inside the loop should handle completion.
            // Let's remove this potential duplicate call.
             // callbacks.onComplete();
        }
        return { conversationId: null }; // Workflow mode doesn't use conversation ID
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