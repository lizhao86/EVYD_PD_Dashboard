/**
 * EVYD产品经理AI工作台 - User Manual生成器
 * API交互模块
 */

import UI from './ui.js';
import { getApiBaseUrl } from '/scripts/utils/helper.js';
import { t } from '/scripts/i18n.js'; // For error messages
import { marked } from 'marked'; // <-- Add this import
// Import UserManualApp state reference IF NEEDED
// import UserManualApp from './index.js'; // Avoid if possible

// --- ADD IMPORT ---
import UserManualApp from './index.js'; 

const API = {
    /**
     * 获取应用信息
     */
    async fetchAppInfo(apiKey, apiEndpoint) {
        if (!apiKey) {
            UI.showError(t('userManual.apiKeyMissing', {default: '未配置 User Manual API 密钥。'}));
            return;
        }
        if (!apiEndpoint) {
            UI.showError(t('userManual.apiEndpointMissing', {default: '未配置 User Manual API 地址。'}));
            return;
        }
        
        UI.showLoading();
        const baseUrl = getApiBaseUrl(apiEndpoint);
        const infoUrl = `${baseUrl}/info`; // Dify Agent info endpoint might differ, check Dify docs
        
        try {
            console.log(`[UserManual API] Trying to connect: ${infoUrl}`);
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
            console.log('[UserManual API] App info received:', data);
            if (!data.name) data.name = 'User Manual 生成器';
            UI.displayAppInfo(data); // Call UI method to display

        } catch (error) {
            console.error('[UserManual API] Connection Error:', error);
            UI.showError(`无法连接到Dify API: ${error.message}`);
            // Attempt to show form even on error
                UI.displayAppInfo({
                name: 'User Manual 生成器',
                description: '无法连接 Dify API, 但可尝试生成。',
                tags: ['可能离线']
                });
        }
    },
    
    /**
     * 生成User Manual (Chat Endpoint)
     */
    async generateUserManual(requirement, apiKey, apiEndpoint, user, conversationId = null) {
        if (!apiKey || !apiEndpoint || !user || !requirement) {
            console.error("Missing parameters for generateUserManual");
            UI.showError('缺少必要参数，无法生成。');
            // --- MODIFICATION ---
            // Return only conversationId, ensure it matches expected structure if index.js uses it.
            return { conversationId: conversationId }; 
        }

        const baseUrl = getApiBaseUrl(apiEndpoint);
        const chatUrl = `${baseUrl}/chat-messages`; // Dify Agent uses chat-messages endpoint
        // UI.showGenerationStarted(); // --- REMOVE THIS CALL --- Moved to index.js
        // let capturedTaskId = null; // Removed, handled via state
        let initialConversationId = conversationId; // Keep track of initial ID

        try {
            const requestData = {
                query: requirement,
                inputs: {},
                response_mode: "streaming",
                conversation_id: conversationId || "", // Use existing or empty for new
                user: user.username,
                files: [], // Add file support if needed later
                auto_generate_name: !conversationId // Only generate name for new conversations
            };
            
            console.log('[UserManual API] Sending chat request:', requestData);
            
            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                let errorDetail = '';
                 try { errorDetail = JSON.stringify(await response.json()); } catch { errorDetail = await response.text(); }
                 throw new Error(`Request failed: ${response.status} ${response.statusText}. Details: ${errorDetail}`);
            }
            
            // Handle stream and capture IDs
            // IDs will be updated within handleStreamResponse via state mutation
            const streamResult = await this.handleStreamResponse(response); 
            // capturedTaskId = streamResult.taskId; // Removed
            // capturedConversationId = streamResult.conversationId || capturedConversationId; // Use result or initial
            
            // --- MODIFICATION ---
            // Return the final conversationId
            return { conversationId: streamResult.conversationId || initialConversationId };

        } catch (error) {
            console.error('[UserManual API] Generation failed:', error);
            if(typeof UI !== 'undefined' && UI.showErrorInResult) {
                 UI.showErrorInResult(t('userManual.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
            } else {
                 document.getElementById('result-content').innerHTML = `<span style="color: red;">生成失败: ${error.message}</span>`;
            }
            // --- MODIFY: Call showGenerationCompleted on error --- 
            if (typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                UI.showGenerationCompleted();
            }
            // UI.showGenerationCompleted(); // Removed duplicate call
             // --- MODIFICATION ---
            // Return initial conversationId on error
            return { conversationId: initialConversationId }; 
        }
    },
    
    /**
     * 处理流式响应 (returns captured IDs)
     */
    async handleStreamResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let resultText = '';
        let capturedTaskId = null; // Keep local track to prevent multiple updates
        let capturedConversationId = null; // Keep local track
        let usageInfo = {};
        let startTime = Date.now();
        
        // --- ADD Flag --- 
        let isGenerationStartedUIUpdated = false;

        const resultContentEl = document.getElementById('result-content');
        const resultMarkdownEl = document.getElementById('result-content-markdown');
        const systemInfoContainerEl = document.getElementById('system-info-container');
        const systemInfoContentEl = document.getElementById('system-info-content');
        console.log("[UserManual Stream] DOM Elements:", { resultContentEl, resultMarkdownEl });

        if(!resultContentEl || !resultMarkdownEl) {
            console.error("Result display elements not found for User Manual!");
            return { conversationId: null };
        }
        // Reset UI
        UI.initUserInterface(); // Or UI.clearResults()
        resultContentEl.innerHTML = ''; 
        resultMarkdownEl.innerHTML = '';
        resultMarkdownEl.style.display = 'none';
        resultContentEl.style.display = 'block'; 

         while (true) {
            const { value, done } = await reader.read();
            if (done) {
                 console.log("[UserManual Stream] Stream finished.");
                 break;
            }
            const chunk = decoder.decode(value, { stream: true });
            
            let lines = chunk.split('\n\n'); // Dify chat stream uses double newline
            for (let line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue;
                line = line.substring(6);
                
                try {
                    const data = JSON.parse(line);
                    // console.log('[UserManual Stream] Parsed:', data); 
                    
                    if (data.message_id && !capturedTaskId) {
                        capturedTaskId = data.message_id; // For chat, message_id acts as task_id for stopping
                        console.log('Captured Message/Task ID:', capturedTaskId);
                        // --- MODIFICATION START ---
                        // Update state directly
                        if (UserManualApp && UserManualApp.state) {
                            UserManualApp.state.currentMessageId = capturedTaskId;
                            console.log('[API Stream] Updated UserManualApp.state.currentMessageId:', UserManualApp.state.currentMessageId);
                            // --- ADD UI Call --- 
                            if (!isGenerationStartedUIUpdated && typeof UI !== 'undefined' && UI.showGenerationStarted) {
                                UI.showGenerationStarted();
                                isGenerationStartedUIUpdated = true;
                            }
                        } else {
                            console.warn('[API Stream] UserManualApp state not accessible to update messageId.');
                        }
                        // --- MODIFICATION END ---
                    }
                    if (data.conversation_id && !capturedConversationId) {
                        capturedConversationId = data.conversation_id;
                        console.log('Captured Conversation ID:', capturedConversationId);
                         // --- MODIFICATION START ---
                        // Update state directly
                        if (UserManualApp && UserManualApp.state) {
                            UserManualApp.state.currentConversationId = capturedConversationId;
                            console.log('[API Stream] Updated UserManualApp.state.currentConversationId:', UserManualApp.state.currentConversationId);
                        } else {
                            console.warn('[API Stream] UserManualApp state not accessible to update conversationId.');
                        }
                        // --- MODIFICATION END ---
                    }
                    
                    let textChunk = '';
                    if (data.event === 'message' && data.answer) {
                        textChunk = data.answer;
                    } else if (data.event === 'message_end' && data.metadata?.usage) {
                         console.log("Message end event with usage.");
                            usageInfo = data.metadata.usage;
                            const endTime = Date.now();
                         const elapsedTime = (endTime - startTime) / 1000;
                            UI.displayStats({
                                elapsed_time: elapsedTime,
                                total_tokens: usageInfo.total_tokens || 0,
                             total_steps: 1 
                            });
                         // No text update here, just stats
                    } else if (data.event === 'error') {
                        console.error('Stream error event:', data);
                        textChunk = `\n*Error: ${data.error || 'Unknown error'}*`;
                    }

                    if(textChunk) {
                         resultText += textChunk;
                         resultContentEl.textContent = resultText; // Update raw text view directly
                         resultContentEl.scrollTop = resultContentEl.scrollHeight; // Scroll raw text view
                    }
                    
                    // Update system info if needed (maybe conversation id?)
                    if (typeof UI !== 'undefined' && UI.displaySystemInfo) {
                        // Pass object for User Manual (Agent has both IDs)
                        UI.displaySystemInfo({ message_id: capturedTaskId, conversation_id: capturedConversationId, usage: usageInfo });
                    }
                    
                } catch (e) { console.warn('Failed to parse stream data line:', line, e); }
            }
        }
        
        // Final Render after stream ends
        console.log("[UserManual Stream] Rendering final Markdown content.");
        try {
            const html = marked(resultText);
            resultMarkdownEl.innerHTML = html;
            resultMarkdownEl.style.display = 'block';
            resultContentEl.style.display = 'none';
            resultMarkdownEl.scrollTop = resultMarkdownEl.scrollHeight;
        } catch (markdownError) {
            console.error("Error converting final markdown:", markdownError);
            resultContentEl.textContent = resultText; // Fallback to text
            resultContentEl.style.display = 'block';
            resultMarkdownEl.style.display = 'none';
        }
        
        // Call UI completion *after* rendering
        if (typeof UI !== 'undefined' && UI.showGenerationCompleted) {
             UI.showGenerationCompleted();
        }
        
        // --- MODIFICATION ---
        // Return only conversationId
        return { conversationId: capturedConversationId }; 
    },
    
    /**
     * 停止生成 (Chat Endpoint)
     */
    async stopGeneration(messageId, apiKey, apiEndpoint, user) {
         if (!messageId || !apiKey || !apiEndpoint || !user) {
             console.error("Missing parameters for stopGeneration (User Manual)");
             return;
         }
        
        const baseUrl = getApiBaseUrl(apiEndpoint);
        // Dify uses chat-messages/<message-id>/stop for chat agent stop
        const stopUrl = `${baseUrl}/chat-messages/${messageId}/stop`;
        
        try {
            console.log(`[UserManual API] Sending stop request: ${stopUrl}`);
            const response = await fetch(stopUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: user.username })
            });
            
            if (!response.ok) throw new Error(`Request failed: ${response.status} ${response.statusText}`);
            
            const data = await response.json();
            console.log('[UserManual API] Stop generation response:', data);
            if (data.result === 'success') {
                 if (typeof UI !== 'undefined' && UI.showStopMessage) UI.showStopMessage();
                 // --- MODIFY: Ensure completed state is shown on successful stop --- 
                 if (typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                    UI.showGenerationCompleted();
                 }
            } else {
                 throw new Error(data.message || 'Stop request did not succeed.');
            }
        } catch (error) {
            console.error('[UserManual API] Stop generation failed:', error);
             if (typeof UI !== 'undefined' && UI.showError) UI.showError('停止生成失败: ' + error.message);
             // --- MODIFY: Ensure completed state is shown on stop error --- 
             if (typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                UI.showGenerationCompleted();
             }
        }
    },
    
    // fetchTaskDetails is not applicable for chat-messages endpoint
}; 

export default API; 