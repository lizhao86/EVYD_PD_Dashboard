/**
 * UX 界面设计API相关功能
 */
import UI from './ui.js';
import { getApiBaseUrl } from '/scripts/utils/helper.js';
import { t } from '/scripts/i18n.js';
import { marked } from 'marked';
// Assuming index.js manages state and passes it

// --- ADD IMPORT ---
import UXDesignApp from './index.js'; 

const API = {
    // Removed global variables for state

/**
 * 获取UX设计应用信息
 */
    async getAppInfo(apiKey, apiEndpoint) {
        // Similar to other API modules, using passed-in config
        if (!apiKey || !apiEndpoint) {
             UI.showError(t('uxDesign.configMissing', { default: '缺少UX Design API配置。'}));
             return null;
        }
        UI.showLoading();
        const baseUrl = getApiBaseUrl(apiEndpoint);
        const infoUrl = `${baseUrl}/info`; // Verify Dify endpoint for app info
        
        try {
            // console.log(`[UX API] Trying to connect: ${infoUrl}`);
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
            // console.log('[UX API] App info received:', data);
            if (!data.name) data.name = 'UX 界面设计助手'; // Default name
            UI.displayAppInfo(data);
            return data; // Return data for index.js
        } catch (error) {
            console.error('[UX API] Connection Error:', error);
            UI.showError(`无法连接到Dify API: ${error.message}`);
             UI.displayAppInfo({ // Attempt to show form even on error
                 name: 'UX 界面设计助手',
                 description: '无法连接 Dify API, 但可尝试生成。',
                 tags: ['可能离线']
             });
             return null;
        }
    },

    // getAppParameters might not be needed if inputs are static in the HTML?
    // If dynamic parameters are needed, implement similarly to getAppInfo
    // async getAppParameters(apiKey, apiEndpoint) { ... }

/**
     * 生成UX界面设计提示词 (Chat Endpoint)
     */
    async generateUXPrompt(requirementDescription, apiKey, apiEndpoint, user, conversationId = null) {
        if (!apiKey || !apiEndpoint || !user || !requirementDescription) {
            console.error("Missing parameters for generateUXPrompt");
            UI.showError('缺少必要参数，无法生成。');
            return { conversationId: conversationId }; 
        }
        
        const baseUrl = getApiBaseUrl(apiEndpoint);
        const chatUrl = `${baseUrl}/chat-messages`; 
        let initialConversationId = conversationId;

        try {
        const requestData = {
            query: requirementDescription,
                inputs: {},
                response_mode: "streaming",
                conversation_id: conversationId || "",
            user: user.username,
                files: [],
                auto_generate_name: !conversationId
        };
        
            // console.log('[UX API] Sending chat request:', requestData);
            const response = await fetch(chatUrl, {
            method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData),
                // Add signal if stop needs AbortController
        });
        
        if (!response.ok) {
                 let errorDetail = '';
                 try { errorDetail = JSON.stringify(await response.json()); } catch { errorDetail = await response.text(); }
                 throw new Error(`Request failed: ${response.status} ${response.statusText}. Details: ${errorDetail}`);
            }
            
            // Use a separate stream handler, potentially reusable?
            const streamResult = await this.handleStreamResponse(response);
            return { conversationId: streamResult.conversationId || initialConversationId };

        } catch (error) {
            console.error('[UX API] Generation failed:', error);
            if(typeof UI !== 'undefined' && UI.showErrorInResult) {
                 UI.showErrorInResult(t('uxDesign.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
            } else {
                 document.getElementById('result-content').innerHTML = `<span style="color: red;">生成失败: ${error.message}</span>`;
            }
            if (typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                UI.showGenerationCompleted(); 
            }
            return { conversationId: initialConversationId }; 
        }
    },
        
    /**
     * 处理流式响应 (Similar to user-manual, potentially refactor)
     */
    async handleStreamResponse(response) {
        // Reuse stream handling logic, calling UI.appendRawText and UI.renderMarkdown
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let resultText = '';
        let capturedTaskId = null;
        let capturedConversationId = null;
        let usageInfo = {};
        let startTime = Date.now();
        
        // Get elements directly
        const resultContentEl = document.getElementById('result-content');
        const resultMarkdownEl = document.getElementById('result-content-markdown');
        // ... (get system info elements if needed) ...
        
        if(!resultContentEl || !resultMarkdownEl) {
            console.error("Result display elements not found inside handleStreamResponse (UX Design)!");
            return { conversationId: null }; 
        }

        // Reset UI state here
        resultContentEl.innerHTML = ''; 
        resultMarkdownEl.innerHTML = '';
        resultMarkdownEl.style.display = 'none';
        resultContentEl.style.display = 'block'; 
        // ... (reset system info display) ...

         while (true) {
             const { value, done } = await reader.read();
             if (done) break;
             const chunk = decoder.decode(value, { stream: true });
             let lines = chunk.split('\n\n');
             for (let line of lines) {
                  if (!line.trim() || !line.startsWith('data: ')) continue;
                  line = line.substring(6);
                  try {
                      const data = JSON.parse(line);
                      if (data.message_id && !capturedTaskId) {
                          capturedTaskId = data.message_id;
                          if (UXDesignApp && UXDesignApp.state) {
                              UXDesignApp.state.currentMessageId = capturedTaskId;
                              // console.log('[UX API Stream] Updated UXDesignApp.state.currentMessageId:', UXDesignApp.state.currentMessageId);
                          } else {
                              console.warn('[UX API Stream] UXDesignApp state not accessible to update messageId.');
                          }
                      }
                      if (data.conversation_id && !capturedConversationId) {
                          capturedConversationId = data.conversation_id;
                           if (UXDesignApp && UXDesignApp.state) {
                              UXDesignApp.state.currentConversationId = capturedConversationId;
                              // console.log('[UX API Stream] Updated UXDesignApp.state.currentConversationId:', UXDesignApp.state.currentConversationId);
                          } else {
                              console.warn('[UX API Stream] UXDesignApp state not accessible to update conversationId.');
                          }
                      }
                      
                      let textChunk = '';
                      if (data.event === 'message' && data.answer) { textChunk = data.answer; }
                      else if (data.event === 'message_end' && data.metadata?.usage) {
                         usageInfo = data.metadata.usage;
                         const endTime = Date.now();
                         const elapsedTime = (endTime - startTime) / 1000;
                         // console.log(`[UX API Stream] Preparing to call UI.displayStats. Data:`, { elapsed_time: elapsedTime, total_tokens: usageInfo.total_tokens || 0, total_steps: 1 });
                         if (typeof UI.displayStats === 'function') { // Check function existence
                            // console.log("[UX API Stream] UI.displayStats function found. Attempting call...");
                            try {
                                UI.displayStats({ 
                                    elapsed_time: elapsedTime, 
                                    total_tokens: usageInfo.total_tokens || 0, 
                                    total_steps: 1 
                                });
                                // console.log("[UX API Stream] Call to UI.displayStats completed.");
                            } catch (uiError) {
                                console.error("[UX API Stream] Error calling UI.displayStats:", uiError); // Keep error logs
                            }
                         } else {
                             console.error("[UX API Stream] UI object or UI.displayStats function NOT found!");
                         }
                      } else if (data.event === 'error') { textChunk = `\n*Error: ${data.error}*`; }

                      if(textChunk) {
                           resultText += textChunk;
                           resultContentEl.textContent = resultText; // Update raw text view directly
                           resultContentEl.scrollTop = resultContentEl.scrollHeight; // Scroll raw text view
                      }
                      // Update system info if UI method exists
                      if(typeof UI !== 'undefined' && UI.displaySystemInfo) {
                         UI.displaySystemInfo({message_id: capturedTaskId, conversation_id: capturedConversationId});
                      }

                  } catch (e) { console.warn('Failed to parse stream line:', line, e); }
             }
         }
         
         // Final Render after stream ends
         // console.log("[UX Stream] Rendering final Markdown content.");
         try {
             // 使用UI模块的renderMarkdown方法进行统一处理
             if (typeof UI.renderMarkdown === 'function') {
                 UI.renderMarkdown();
             } else {
                 // 后备处理，如果方法不存在
                 const html = marked(resultText);
                 resultMarkdownEl.innerHTML = html;
                 resultMarkdownEl.style.display = 'block';
                 resultContentEl.style.display = 'none';
                 resultMarkdownEl.scrollTop = resultMarkdownEl.scrollHeight;
             }
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

         return { conversationId: capturedConversationId }; 
    },

/**
     * 停止生成 (Chat Endpoint)
 */
    async stopGeneration(messageId, apiKey, apiEndpoint, user) {
        // Reuse logic from user-manual/api.js stopGeneration
        if (!messageId || !apiKey || !apiEndpoint || !user) {
             console.error("Missing parameters for stopGeneration (UX Design)");
             return;
         }
        const baseUrl = getApiBaseUrl(apiEndpoint);
        const stopUrl = `${baseUrl}/chat-messages/${messageId}/stop`; 
        try {
            // console.log(`[UX API] Sending stop request: ${stopUrl}`);
            const response = await fetch(stopUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: user.username })
            });
            if (!response.ok) throw new Error(`Request failed: ${response.status}`);
            const data = await response.json();
            // console.log('[UX API] Stop generation response:', data);
            if (data.result === 'success') {
                 if (typeof UI !== 'undefined' && UI.showStopMessage) UI.showStopMessage();
                 if (typeof UI !== 'undefined' && UI.showGenerationCompleted) UI.showGenerationCompleted();
            } else {
                 throw new Error(data.message || 'Stop request failed.');
            }
        } catch (error) {
            console.error('[UX API] Stop generation failed:', error);
             if (typeof UI !== 'undefined' && UI.showError) UI.showError('停止生成失败: ' + error.message);
             if (typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                UI.showGenerationCompleted();
             }
        }
    },
}; 

export default API; 