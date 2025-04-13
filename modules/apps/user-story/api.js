/**
 * EVYD产品经理AI工作台 - User Story生成器
 * API交互模块
 */

import UI from './ui.js'; // Assuming UI module provides necessary UI updates like showError
import { getApiBaseUrl } from '/scripts/utils/helper.js'; // Import necessary helper
import { marked } from 'marked'; // <-- Add marked import
import { t } from '/scripts/i18n.js'; // <-- Add i18n import
// Import UserStoryApp state reference if needed for task ID
import UserStoryApp from './index.js'; // <-- Add UserStoryApp import
// Instead of importing UserStoryApp, let index.js manage the state and pass necessary info (like taskId) to API functions.

const API = {
    /**
     * 获取应用信息
     * Needs apiKey and apiEndpoint passed in
     */
    async fetchAppInfo(apiKey, apiEndpoint) {
        if (!apiKey) {
            UI.showError('未提供 API 密钥。');
            return;
        }
        if (!apiEndpoint) {
            UI.showError('未提供 API 地址。');
            return;
        }
        
        UI.showLoading();
        const baseUrl = getApiBaseUrl(apiEndpoint); // Use imported helper
        const infoUrl = `${baseUrl}/info`;
        
        try {
            const response = await fetch(infoUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            
            if (!response.ok) {
                let errorDetail = '';
                try {
                    const errorJson = await response.json();
                    errorDetail = JSON.stringify(errorJson, null, 2);
                } catch (e) { errorDetail = await response.text().catch(() => 'Failed to get error details'); }
                throw new Error(`Request failed: ${response.status} ${response.statusText}${errorDetail ? '\nDetails: ' + errorDetail : ''}`);
            }
            
            const data = await response.json();
            if (!data.name) data.name = 'User Story 生成器';
            UI.displayAppInfo(data);

        } catch (error) {
            console.error('[API.fetchAppInfo] Error:', error);
            let errorMessage = `无法连接到Dify API (${error.message || '未知错误'})`;
            // ... (Error message refinement logic) ...
            UI.showError(errorMessage);
             // Attempt to show form even on error
             UI.displayAppInfo({
                name: 'User Story 生成器（模式）', // Simplified name
                description: '无法连接 Dify API, 但可尝试生成。', // Simplified desc
                tags: ['离线可能']
            });
        }
    },
    
    /**
     * 生成User Story
     * Needs apiKey, apiEndpoint, and user passed in
     */
    async generateUserStory(platform, system, module, requirement, apiKey, apiEndpoint, user) {
        if (!apiKey || !apiEndpoint || !user) {
            console.error("Missing API key, endpoint, or user for generateUserStory");
            UI.showError('缺少必要配置，无法生成。');
            return null; // Return null or throw error
        }

        const baseUrl = getApiBaseUrl(apiEndpoint);
        const runUrl = `${baseUrl}/workflows/run`;
        // UI.showGenerationStarted(); // --- REMOVE THIS CALL (moved to index.js / handleStreamResponse)
        // let taskId = null; // Task ID will be captured from stream and stored in state

        try {
            const formatAttempts = [ // Simplified attempts for clarity
                { inputs: { Platform: platform, System: system, Module: module, Requirements: requirement } },
                { inputs: { platform: platform, system: system, module: module, requirements: requirement } },
                { inputs: { text: `平台：${platform}\n系统：${system}\n模块：${module}\n需求：${requirement}` } }
            ];
            
            let response = null;
            let success = false;
            for (const attempt of formatAttempts) {
                const requestData = { ...attempt, response_mode: "streaming", user: user.username }; // Use username
                try {
                    response = await fetch(runUrl, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestData)
                    });
                    if (response.ok) {
                        success = true;
                        break;
                    }
                } catch (fetchError) {
                    console.error("Fetch error during format attempt:", fetchError);
                }
            }
            
            if (!success || !response) {
                throw new Error('All request format attempts failed.');
            }
            
            // --- MODIFY: Don't need to await/return taskId here anymore --- 
            // taskId = await this.handleStreamResponse(response); 
            // return taskId; // Return the captured task ID
            await this.handleStreamResponse(response); // Call stream handler, it will update state
            return; // Indicate API call was successful (stream started)

        } catch (error) {
            console.error('Generation failed:', error);
            const errorMsg = t('userStory.generationFailed', { default: '生成失败:'}) + ` ${error.message}`;
            if(typeof UI !== 'undefined' && UI.showErrorInResult) {
                 UI.showErrorInResult(errorMsg);
            }
             // --- MODIFY: Ensure UI.showGenerationCompleted --- 
             if (typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                UI.showGenerationCompleted(); 
             }
             return null; // Indicate failure
        }
    },
    
    /**
     * 处理流式响应 (returns captured task ID)
     */
    async handleStreamResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let resultText = ''; // Accumulate full text
        let capturedTaskId = null; // Local variable for tracking
        let systemInfo = {};
        let statsUpdated = false;
        let isGenerationStartedUIUpdated = false; 
        let streamEnded = false;
        
        // Get elements directly inside this handler
        const resultContentEl = document.getElementById('result-content');
        const resultMarkdownEl = document.getElementById('result-content-markdown');
        const systemInfoContainerEl = document.getElementById('system-info-container');
        const systemInfoContentEl = document.getElementById('system-info-content');
        // console.log("[handleStreamResponse] DOM Elements:", { resultContentEl, resultMarkdownEl /* ... */ });

        if(!resultContentEl || !resultMarkdownEl) {
            console.error("Result display elements not found inside handleStreamResponse!");
            return null; 
        }

        // Reset UI state here
        resultContentEl.innerHTML = ''; 
        resultMarkdownEl.innerHTML = '';
        resultMarkdownEl.style.display = 'none';
        resultContentEl.style.display = 'block'; // Show plain text view first
        if(systemInfoContainerEl) systemInfoContainerEl.style.display = 'none';
        if(systemInfoContentEl) systemInfoContentEl.innerHTML = '';

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
                      // ... (Capture IDs) ...
                      
                      let textChunk = '';
                      // ... (Extract textChunk based on event type) ...
                      if (data.event === 'message' && data.answer) { textChunk = data.answer; }
                      else if (data.event === 'node_finished' && data.data?.outputs?.text) { textChunk = data.data.outputs.text; }
                      else if (data.output?.text) { textChunk = data.output.text; }
                      else if (data.event === 'error') { textChunk = `\n*Error: ${data.error}*`; }

                      if(textChunk) {
                           resultText += textChunk;
                           resultContentEl.textContent = resultText; // Update raw text view directly
                           resultContentEl.scrollTop = resultContentEl.scrollHeight;
                      }
                      
                      // Handle stats update from message_end or workflow_finished
                      if (data.event === 'message_end' || data.event === 'workflow_finished') {
                          // --- ADD Log to check data structure ---
                          // console.log(`[API Stream] Received ${data.event} event:`, data);
                          const usageData = data.metadata?.usage || data.data?.usage || data.data; // Check multiple locations
                          // console.log(`[API Stream] Extracted usageData for stats:`, usageData);
                          // Ensure we have the necessary fields from usageData according to API doc
                          if (!statsUpdated && usageData && usageData.total_tokens !== undefined && usageData.elapsed_time !== undefined && usageData.total_steps !== undefined) {
                               const endTime = Date.now(); // Might need startTime from index.js?
                               // Use elapsed_time directly from Dify if available
                               const elapsedTime = usageData.elapsed_time;
                               // --- MODIFY Logging and add Try/Catch ---
                               // console.log(`[API Stream] Preparing to call UI.displayStats. Data:`, { elapsed_time: elapsedTime, total_tokens: usageData.total_tokens, total_steps: usageData.total_steps });
                               // --- MODIFY Check and Call --- 
                               if (typeof UI !== 'undefined' && UI.displayStats) { // Check for displayStats
                                    // console.log("[API Stream] UI.displayStats function found. Attempting call..."); // Log correct name
                                    try {
                                        UI.displayStats({ // Call correct name
                                           elapsed_time: elapsedTime,
                                           total_tokens: usageData.total_tokens || 0,
                                           total_steps: usageData.total_steps || 1 
                                        });
                                        // console.log("[API Stream] Call to UI.displayStats completed."); // Log correct name
                                    } catch (e) {
                                        console.error("[API Stream] Error calling UI.displayStats:", e); // Keep error logs
                                    }
                                    statsUpdated = true;
                               } else {
                                   console.error("[API Stream] UI object or UI.displayStats function NOT found!"); // Log correct name
                               }
                          } else {
                              console.warn("[API Stream] Stats not updated. Missing fields or already updated. usageData:", usageData);
                          }
                          // If workflow finished, extract final output
                          if (data.event === 'workflow_finished' && data.data?.outputs) {
                               resultText = this.extractFinalOutput(data.data.outputs);
                               // Final update is handled after the loop
                          }
                      }
                      // ... (Update system info) ...
                      // --- ADD Task ID Capture and State Update ---
                      if (data.event === 'workflow_started' && data.task_id && !capturedTaskId) {
                           capturedTaskId = data.task_id;
                           // console.log('Captured Task ID:', capturedTaskId);
                           if (UserStoryApp && UserStoryApp.state) {
                               UserStoryApp.state.currentTaskId = capturedTaskId;
                               // console.log('[API Stream] Updated UserStoryApp.state.currentTaskId:', UserStoryApp.state.currentTaskId);
                                // --- ADD UI Call ---
                                if (!isGenerationStartedUIUpdated && typeof UI !== 'undefined' && UI.showGenerationStarted) {
                                    UI.showGenerationStarted();
                                    isGenerationStartedUIUpdated = true;
                                }
                                // --- ADD System Info Update Call ---
                                if (typeof UI !== 'undefined' && UI.displaySystemInfo) {
                                    UI.displaySystemInfo(capturedTaskId);
                                }
                           } else {
                               console.warn('[API Stream] UserStoryApp state not accessible to update taskId.');
                           }
                      }
                      // --- END Task ID Capture ---
                  } catch (e) { console.warn('Failed to parse stream line:', line, e); }
             }
             
             // Check if generation stopped flag set externally (for fast abort)
             if (UserStoryApp?.state?.abortGeneration) {
                  streamEnded = true;
                  console.warn('[API Stream] Generation aborted by user.');
                  break;
             }
         }
         
         // After stream ends
         if (!streamEnded) {
             streamEnded = true; 
             UI.renderMarkdown();
             if (typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                 UI.showGenerationCompleted();
             }
         }
    },

    // Helper to extract final text from potentially varied output structures
    extractFinalOutput(outputs) {
        let finalText = '';
        
        // Try different possible output formats from Dify workflow
        if (typeof outputs === 'string') {
            // Direct string output
            finalText = outputs;
        } else if (outputs.text) {
            // Object with text property
            finalText = outputs.text;
        } else if (outputs.content) {
            // Object with content property
            finalText = outputs.content;
        } else if (outputs.result) {
            // Object with result property (could be string or another object)
            finalText = typeof outputs.result === 'string' ? outputs.result : JSON.stringify(outputs.result, null, 2);
        } else {
            // Fallback: stringify the entire outputs
            finalText = JSON.stringify(outputs, null, 2);
        }
        
        return finalText;
    },
    
    /**
     * 停止生成
     * Needs taskId, apiKey, apiEndpoint passed in
     */
    async stopGeneration(taskId, apiKey, apiEndpoint, user) {
        if (!taskId || !apiKey || !apiEndpoint || !user) {
             console.error("Missing taskId, apiKey, endpoint or user for stopGeneration");
             return;
        }

        const baseUrl = getApiBaseUrl(apiEndpoint);
        const stopUrl = `${baseUrl}/workflows/tasks/${taskId}/stop`;
        
        try {
            const response = await fetch(stopUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: user.username })
            });
            
            if (!response.ok) throw new Error(`Request failed: ${response.status} ${response.statusText}`);
            
            const data = await response.json();
            if (data.result === 'success') {
                 // Update UI using UI module
                 if (typeof UI !== 'undefined' && UI.showStopMessage) {
                      UI.showStopMessage(); // Assumes UI method exists
                 }
                 // --- MODIFY: Use UI.showGenerationCompleted --- 
                 if (typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                    UI.showGenerationCompleted();
                 }
            } else {
                 throw new Error(data.message || 'Stop request did not succeed.');
            }
        } catch (error) {
            console.error('Stop generation failed:', error);
             // Use UI module for error display
             if (typeof UI !== 'undefined' && UI.showError) {
                  UI.showError('停止生成失败: ' + error.message);
             }
             // --- MODIFY: Use UI.showGenerationCompleted --- 
             if (typeof UI !== 'undefined' && UI.showGenerationCompleted) {
                UI.showGenerationCompleted();
             }
        }
    },
    
    /**
     * 获取任务详情
     * Needs taskId, apiKey, apiEndpoint passed in
     */
    async fetchTaskDetails(taskId, apiKey, apiEndpoint) {
         if (!taskId || !apiKey || !apiEndpoint) {
             console.error("Missing taskId, apiKey, or endpoint for fetchTaskDetails");
             UI.showTaskStatsFailed();
             return;
         }
        
        const baseUrl = getApiBaseUrl(apiEndpoint);
        const detailsUrl = `${baseUrl}/workflows/run/${taskId}`;
        
        try {
            const response = await fetch(detailsUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            
            if (!response.ok) throw new Error(`Request failed: ${response.status} ${response.statusText}`);
            
            const taskData = await response.json();

            // Extract stats carefully
            let stats = taskData;
             if (taskData.elapsed_time === undefined && taskData.data) {
                 stats = taskData.data; // Use nested data if top-level is missing
             }
            
            if (stats.elapsed_time !== undefined && stats.total_steps !== undefined && stats.total_tokens !== undefined) {
                 UI.displayTaskStats(stats);
            } else {
                 console.warn("Could not find expected stats fields in task details:", stats);
                 UI.showTaskStatsFailed();
            }

        } catch (error) {
            console.error('Fetch task details failed:', error.message);
            UI.showTaskStatsFailed();
        }
    },

    /**
     * 将Markdown文本转换为HTML
     */
    convertMarkdownToHtml(markdown) {
        if (!markdown) return '';
        return marked(markdown);
    }
}; 

// Export API object for index.js to use
export default API; 