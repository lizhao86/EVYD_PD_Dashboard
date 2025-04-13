/**
 * EVYD产品经理AI工作台 - User Manual生成器
 * API交互模块
 */

import UI from './ui.js';
import { getApiBaseUrl } from '/scripts/utils/helper.js';
import { t } from '/scripts/i18n.js'; // For error messages
import { marked } from 'marked';
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
        const infoUrl = `${baseUrl}/info`; 
        
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
            if (!data.name) data.name = '用户手册生成器'; // Default name
            UI.displayAppInfo(data); 

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
            return { conversationId: conversationId }; 
        }

        const baseUrl = getApiBaseUrl(apiEndpoint);
        const chatUrl = `${baseUrl}/chat-messages`; 
        let initialConversationId = conversationId; 

        try {
            const requestData = {
                query: requirement,
                inputs: {},
                response_mode: "streaming",
                conversation_id: conversationId || "", 
                user: user.username,
                files: [], 
                auto_generate_name: !conversationId 
            };
            
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
            
            const streamResult = await this.handleStreamResponse(response); 
            return { conversationId: streamResult.conversationId || initialConversationId };

        } catch (error) {
            console.error('[UserManual API] Generation failed:', error);
            if(typeof UI !== 'undefined' && UI.showErrorInResult) {
                 UI.showErrorInResult(t('userManual.generationFailed', { default: '生成失败:'}) + ` ${error.message}`);
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
     * 处理流式响应 (returns captured IDs)
     */
    async handleStreamResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let resultText = '';
        let capturedTaskId = null; 
        let capturedConversationId = null; 
        let usageInfo = {};
        let startTime = Date.now();
        let isGenerationStartedUIUpdated = false;
        let readerDone = false;

        const resultContentEl = document.getElementById('result-content');
        const resultMarkdownEl = document.getElementById('result-content-markdown');
        const systemInfoContainerEl = document.getElementById('system-info-container');
        const systemInfoContentEl = document.getElementById('system-info-content');

        if(!resultContentEl || !resultMarkdownEl) {
            console.error("Result display elements not found for User Manual!");
            return { conversationId: null };
        }
        // Reset UI
        UI.initUserInterface(); 
        resultContentEl.innerHTML = ''; 
        resultMarkdownEl.innerHTML = '';
        resultMarkdownEl.style.display = 'none';
        resultContentEl.style.display = 'block'; 

         while (true) {
            const { value, done } = await reader.read();
            if (done) {
                 readerDone = true; 
                 break;
            }
            const chunk = decoder.decode(value, { stream: true });
            
            let lines = chunk.split('\n\n'); 
            for (let line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue;
                line = line.substring(6);
                
                try {
                    const data = JSON.parse(line);
                    
                    if (data.message_id && !capturedTaskId) {
                        capturedTaskId = data.message_id;
                        if (UserManualApp && UserManualApp.state) {
                           UserManualApp.state.currentMessageId = capturedTaskId;
                           if (typeof UI !== 'undefined' && UI.displaySystemInfo) {
                               UI.displaySystemInfo({ message_id: capturedTaskId, conversation_id: capturedConversationId, usage: usageInfo });
                           }
                           if (!isGenerationStartedUIUpdated && typeof UI !== 'undefined' && UI.showGenerationStarted) {
                               UI.showGenerationStarted();
                               isGenerationStartedUIUpdated = true;
                           }
                        } else {
                            console.warn('[API Stream] UserManualApp state not accessible to update messageId.');
                        }
                    }
                    if (data.conversation_id && !capturedConversationId) {
                        capturedConversationId = data.conversation_id;
                        if (UserManualApp && UserManualApp.state) {
                           UserManualApp.state.currentConversationId = capturedConversationId;
                        } else {
                            console.warn('[API Stream] UserManualApp state not accessible to update conversationId.');
                        }
                    }
                    
                    let textChunk = '';
                    if (data.event === 'message' && data.answer) {
                        textChunk = data.answer;
                    } else if (data.event === 'message_end' && data.metadata?.usage) {
                         usageInfo = data.metadata.usage;
                         const endTime = Date.now();
                         const elapsedTime = (endTime - startTime) / 1000;
                         UI.displayStats({
                             elapsed_time: elapsedTime,
                             total_tokens: usageInfo.total_tokens || 0,
                             total_steps: 1 
                         });
                    } else if (data.event === 'error') {
                        console.error('Stream error event:', data);
                        textChunk = `\n*Error: ${data.error || 'Unknown error'}*`;
                    }

                    if(textChunk) {
                         resultText += textChunk;
                         resultContentEl.textContent = resultText;
                         resultContentEl.scrollTop = resultContentEl.scrollHeight;
                    }
                    
                    if (typeof UI !== 'undefined' && UI.displaySystemInfo) {
                        UI.displaySystemInfo({ message_id: capturedTaskId, conversation_id: capturedConversationId, usage: usageInfo });
                    }
                    
                } catch (e) { console.warn('Failed to parse stream data line:', line, e); }
            }
        }
        
        // Final Render after stream ends
        UI.renderMarkdown();

        // Call UI completion *after* rendering
        if (typeof UI !== 'undefined' && UI.showGenerationCompleted) {
            UI.showGenerationCompleted();
        }
        
        // Set state isGenerating to false if accessible
        if (UserManualApp && UserManualApp.state) {
            UserManualApp.state.isGenerating = false;
        }
        
        return { conversationId: capturedConversationId }; 
    },
    
    /**
     * 停止生成 (Chat Message Stop API)
     */
    async stopGeneration(messageId, apiKey, apiEndpoint, user) {
        if (!messageId || !apiKey || !apiEndpoint || !user) {
            console.error("Missing parameters for stopGeneration (User Manual)");
            return;
        }
        
        const baseUrl = getApiBaseUrl(apiEndpoint);
        const stopUrl = `${baseUrl}/chat-messages/${messageId}/stop`;
        
        try {
            const response = await fetch(stopUrl, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${apiKey}`, 
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error(`Request failed: ${response.status}`);
            
            const data = await response.json();
            if (data.result === 'success') {
                UI.showStopMessage();
                if (typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                    UI.showGenerationCompleted(); 
                }
            } else {
                throw new Error(`Stop request failed: ${data.message || 'Unknown error'}`);
            }
            
            // Set state.isGenerating to false
            if (UserManualApp && UserManualApp.state) {
                UserManualApp.state.isGenerating = false;
            }
            
            return data;
            
        } catch (error) {
            console.error('[UserManual API] Stop generation error:', error);
            if (typeof UI !== 'undefined' && UI.showErrorInResult) {
                UI.showErrorInResult(`停止生成失败: ${error.message}`);
            }
            if (typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                UI.showGenerationCompleted(); // Reset button state on error
            }
        }
    }
};

export default API; 