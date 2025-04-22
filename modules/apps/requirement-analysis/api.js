/**
 * EVYD产品经理AI工作台 - Requirement Analysis Assistant
 * API交互模块 (Adapted from User Manual API)
 */

import UI from './ui.js'; // Assuming UI module is in the same directory
import { getApiBaseUrl } from '/scripts/utils/helper.js'; // Assuming helper exists
import { t } from '/scripts/i18n.js';
// import { marked } from 'marked'; // Marked likely used by UI, not API
import RequirementAnalysisApp from './index.js'; // Import main app state if needed

// NOTE: This assumes the Dify interactions for Requirement Analysis
// also use the /chat-messages endpoint and streaming.
// Adjust URLs and request bodies if the actual Dify app is different.

const API = {
    currentAbortController: null,

    /**
     * 获取应用信息
     */
    async fetchAppInfo(apiKey, apiEndpoint) {
        if (!apiKey) {
            UI.showError(t('requirementAnalysis.apiKeyMissingError', { default: '未配置 Requirement Analysis API 密钥。' }));
            return;
        }
        if (!apiEndpoint) {
            UI.showError(t('requirementAnalysis.apiEndpointMissing', { default: '未配置 Requirement Analysis API 地址。' }));
            return;
        }
        
        UI.showLoading();
        // Assuming Dify structure: /v1/info
        const infoUrl = `${apiEndpoint}/info`; // Use the full endpoint directly
        
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
            
            // Use UI module to display, passing the data object directly
            UI.displayAppInfo(data); 

        } catch (error) {
            console.error('[RA API] Connection Error:', error);
            const errorMsg = t('requirementAnalysis.connectionErrorDesc', { default: '无法连接到Dify API，请检查设置。'});
            UI.showError(`${errorMsg} (${error.message})`);
            // Still display form elements even if info fails
             UI.displayAppInfo({
                name: t('requirementAnalysis.appName', {default: '需求分析助手'}),
                description: t('requirementAnalysis.connectionErrorDesc', {default: '无法连接Dify API，请检查设置...'}),
             });
        }
    },
    
    /**
     * 生成分析结果 (Chat Endpoint - Assumption)
     */
    async generateAnalysis(requirement, apiKey, apiEndpoint, user, conversationId = null, messageIdCallback) {
        if (!apiKey || !apiEndpoint || !user || !requirement) {
            console.error("Missing parameters for generateAnalysis");
            UI.showError(t('requirementAnalysis.missingParams', { default: '缺少必要参数，无法生成。' }));
            return { conversationId: conversationId }; 
        }

        // Assuming Dify structure: /v1/chat-messages
        const chatUrl = `${apiEndpoint}/chat-messages`; 
        let initialConversationId = conversationId; 

        this.currentAbortController = new AbortController(); // Create new controller for this request
        const signal = this.currentAbortController.signal;

        try {
            const requestData = {
                query: requirement,
                inputs: {}, // Add specific inputs if the Dify app requires them
                response_mode: "streaming",
                conversation_id: conversationId || "", 
                user: user.username || 'default-user', // Ensure user identifier is passed
                files: [], 
                auto_generate_name: !conversationId 
            };
            
            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
                signal: signal // Pass the signal to fetch
            });
            
            if (!response.ok) {
                let errorDetail = '';
                 try { errorDetail = JSON.stringify(await response.json()); } catch { errorDetail = await response.text(); }
                 throw new Error(`Request failed: ${response.status} ${response.statusText}. Details: ${errorDetail}`);
            }
            
            // Process the stream
            const streamResult = await this.handleStreamResponse(response, messageIdCallback); 
            return { conversationId: streamResult.conversationId || initialConversationId };

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('[RA API] Generation aborted by user.');
                UI.showStopMessage(); // Show stopped message in UI
            } else {
                console.error('[RA API] Generation failed:', error);
                UI.showErrorInResult(t('requirementAnalysis.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
            }
            // Ensure UI state is reset regardless of error type
            UI.showGenerationCompleted(); 
            if (RequirementAnalysisApp && RequirementAnalysisApp.state) {
                 RequirementAnalysisApp.state.isGenerating = false;
                 RequirementAnalysisApp.state.currentMessageId = null;
            }
            this.currentAbortController = null; // Clear controller
            return { conversationId: initialConversationId }; // Return original conversation ID on error
        }
    },
    
    /**
     * 处理流式响应 (Adapted for Requirement Analysis)
     */
    async handleStreamResponse(response, messageIdCallback) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let capturedMessageId = null; 
        let capturedConversationId = null; 
        let usageInfo = {};
        let metadata = {}; // Store full metadata
        let startTime = Date.now();
        let isGenerationStartedUIUpdated = false;

        UI.clearResultArea(); // Clear previous results before streaming
        UI.showResultContainer();

         while (true) {
            let value, done;
            try {
                 ({ value, done } = await reader.read());
            } catch (streamError) {
                 console.error("[RA Stream] Error reading stream:", streamError);
                 UI.showErrorInResult('读取响应流时出错。');
                 break; // Exit loop on read error
            }

            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            let lines = chunk.split('\n\n'); 
            
            for (let line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue;
                line = line.substring(6);
                
                try {
                    const data = JSON.parse(line);
                    metadata = { ...metadata, ...data }; // Accumulate metadata

                    // --- Capture IDs --- 
                    if (data.message_id && !capturedMessageId) {
                        capturedMessageId = data.message_id;
                        if (messageIdCallback) messageIdCallback(capturedMessageId); // Update index.js state
                        if (!isGenerationStartedUIUpdated) {
                             UI.setGeneratingState(); // Update button to show generating/stop
                             isGenerationStartedUIUpdated = true;
                        }
                        // Update system info display as IDs are found
                        UI.displaySystemInfo({ message_id: capturedMessageId, conversation_id: capturedConversationId, ...metadata });
                    }
                    if (data.conversation_id && !capturedConversationId) {
                        capturedConversationId = data.conversation_id;
                         if (RequirementAnalysisApp && RequirementAnalysisApp.state) {
                            RequirementAnalysisApp.state.currentConversationId = capturedConversationId;
                         } else {
                             console.warn('[RA Stream] Main app state not accessible to update conversationId.');
                         }
                         // Update system info display
                         UI.displaySystemInfo({ message_id: capturedMessageId, conversation_id: capturedConversationId, ...metadata });
                    }
                    
                    // --- Handle Content --- 
                    let textChunk = '';
                    if (data.event === 'agent_message' || data.event === 'message') {
                        textChunk = data.answer || '';
                        if (textChunk) {
                             UI.appendStreamContent(textChunk); // UI handles appending and rendering
                        }
                    } else if (data.event === 'message_end' && data.metadata) {
                         // --- Handle Completion --- 
                         usageInfo = data.metadata.usage || {};
                         const endTime = Date.now();
                         const elapsedTime = (endTime - startTime) / 1000;
                         metadata = { ...metadata, ...data.metadata, elapsed_time: elapsedTime }; // Add final metadata and elapsed time
                         UI.displayStats(metadata);
                         UI.displaySystemInfo(metadata); // Display final system info
                         // console.log("Stream finished. Metadata:", metadata);
                    } else if (data.event === 'error') {
                         // --- Handle Stream Error Event --- 
                        console.error('Stream error event:', data);
                        const errorMsg = data.code ? `[${data.code}] ${data.message}` : (data.error || 'Unknown stream error');
                        UI.showErrorInResult(errorMsg);
                         // Stop processing further chunks on error? Maybe not, let it finish.
                    }
                    
                } catch (e) { 
                    console.warn('Failed to parse stream data line:', line, e); 
                    // Don't stop the stream for a single bad line if possible
                }
            }
        }
        
        // --- Final UI Updates After Stream --- 
        UI.renderMarkdown(); // Ensure final rendering
        UI.showGenerationCompleted(); // Reset button state
        
        // Set main state flags
        if (RequirementAnalysisApp && RequirementAnalysisApp.state) {
            RequirementAnalysisApp.state.isGenerating = false;
            RequirementAnalysisApp.state.currentMessageId = null; // Clear message ID
        }
        this.currentAbortController = null; // Clear controller
        
        return { conversationId: capturedConversationId }; // Return the captured conversation ID
    },
    
    /**
     * 停止生成 (Chat Message Stop API - Assumption)
     */
    async stopGeneration(messageId, apiKey, apiEndpoint, user) {
        if (!messageId || !apiKey || !apiEndpoint || !user) {
            console.error("Missing parameters for stopGeneration (RA)");
            // Optionally update UI to show stop failed state
            return;
        }
        
        // Assuming Dify structure: /v1/chat-messages/{message_id}/stop
        const stopUrl = `${apiEndpoint}/chat-messages/${messageId}/stop`;
        
        // If there's an active fetch request, abort it first
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
            console.log("[RA API] Aborted fetch request.");
            // The fetch catch block in generateAnalysis should handle UI updates
             UI.showStopMessage(); 
             UI.showGenerationCompleted();
             // Ensure main state is updated
             if (RequirementAnalysisApp && RequirementAnalysisApp.state) {
                 RequirementAnalysisApp.state.isGenerating = false;
                 RequirementAnalysisApp.state.currentMessageId = null;
             }
             return; // Aborting fetch handles it
        }

        // If no active fetch (stream might have ended quickly or error occurred), 
        // try calling the stop endpoint anyway (might be redundant but safer)
        console.log("[RA API] No active fetch, attempting direct stop call to Dify...");
        try {
            const response = await fetch(stopUrl, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${apiKey}`, 
                    'User-Agent': 'EVYD-PM-Dashboard/1.0' // Example User-Agent
                }
            });
            
            if (!response.ok) throw new Error(`Stop request failed: ${response.status} ${response.statusText}`);
            
            const data = await response.json();
            if (data.result === 'success') {
                console.log("[RA API] Dify stop endpoint call successful.");
                UI.showStopMessage();
            } else {
                console.warn(`[RA API] Dify stop endpoint call returned non-success: ${data.message || 'Unknown'}`);
                // Don't show error usually, stopping might have already happened
            }
        } catch (error) {
            console.error('[RA API] Direct stop endpoint call error:', error);
            // Don't necessarily show error to user, might be confusing
        } finally {
            // Ensure UI/State is reset regardless of stop endpoint result
            UI.showGenerationCompleted();
            if (RequirementAnalysisApp && RequirementAnalysisApp.state) {
                RequirementAnalysisApp.state.isGenerating = false;
                RequirementAnalysisApp.state.currentMessageId = null;
            }
        }
    }
};

export default API; 