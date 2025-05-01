/**
 * DifyClient
 * A reusable client for interacting with Dify Chat and Workflow APIs supporting Server-Sent Events (SSE).
 */
class DifyClient {
    /**
     * @param {object} config
     * @param {string} config.baseUrl - The base URL of your Dify API (e.g., "https://api.dify.ai/v1").
     * @param {string} config.apiKey - The API key for your Dify application.
     * @param {'chat' | 'workflow'} config.mode - The type of Dify application ('chat' or 'workflow').
     * @param {object} [config.defaultHeaders] - Optional default headers to include in requests.
     */
    constructor({ baseUrl, apiKey, mode, defaultHeaders = {} }) {
        if (!baseUrl || !apiKey || !mode) {
            throw new Error('DifyClient requires baseUrl, apiKey, and mode.');
        }
        if (mode !== 'chat' && mode !== 'workflow') {
            throw new Error("DifyClient mode must be either 'chat' or 'workflow'.");
        }

        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash if present
        this.apiKey = apiKey;
        this.mode = mode;
        this.defaultHeaders = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...defaultHeaders
        };

        this.abortController = null; // To manage fetch request abortion
    }

    /**
     * Starts a streaming generation request to the Dify API.
     *
     * @param {object} payload
     * @param {object} payload.inputs - App-specific inputs for the Dify request.
     * @param {string} payload.query - The main query or message for Chat apps.
     * @param {string} payload.user - A unique identifier for the end-user.
     * @param {string} [payload.conversation_id] - Optional conversation ID for session context.
     * @param {boolean} [payload.stream] - Defaults to true for this method.
     *
     * @param {object} callbacks
     * @param {function(string, boolean): void} callbacks.onMessage - Called when a message chunk is received. Passes (content, isFirstChunk).
     * @param {function(object): void} [callbacks.onThought] - Called when an agent thought is received.
     * @param {function(object): void} [callbacks.onWorkflowStarted] - Called when a workflow starts.
     * @param {function(object): void} [callbacks.onWorkflowCompleted] - Called when a workflow finishes.
     * @param {function(object): void} [callbacks.onNodeStarted] - Called when a workflow node starts.
     * @param {function(object): void} [callbacks.onNodeCompleted] - Called when a workflow node finishes.
     * @param {function(object): void} callbacks.onComplete - Called when the stream finishes successfully. Passes metadata.
     * @param {function(Error): void} callbacks.onError - Called when any error occurs during the request or stream processing.
     *
     * @returns {Promise<void>}
     */
    async generateStream(payload, callbacks) {
        if (this.abortController) {
            callbacks.onError(new Error("Another generation is already in progress."));
            return;
        }
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        const endpoint = this.mode === 'chat' ? '/chat-messages' : '/workflows/run';
        const url = `${this.baseUrl}${endpoint}`;

        // Ensure essential payload fields are present and set stream mode
        const body = {
            ...payload,
            response_mode: 'streaming', // Crucial for SSE
            stream: true // Some Dify versions might use this, redundant but safe
        };

        let isFirstChunk = true;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.defaultHeaders,
                body: JSON.stringify(body),
                signal: signal, // Pass the abort signal to fetch
            });

            if (!response.ok) {
                let errorBody = 'Unknown error';
                try {
                    // Attempt to parse error details from Dify
                    const errorData = await response.json();
                    errorBody = JSON.stringify(errorData);
                } catch (e) {
                    // If parsing fails, use the status text
                    errorBody = `${response.status} ${response.statusText}`;
                }
                throw new Error(`Dify API Error: ${errorBody}`);
            }

            if (!response.body) {
                throw new Error("Response body is null.");
            }

            // Process the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = '';
            let finalMetadata = {}; // To store metadata from message_end or workflow events

            // Regex to find SSE lines: starts with 'data:', captures the JSON part until newline or end of string
            // This is a simplified approach; a more robust parser might handle comments, events, ids etc. differently.
            const sseRegex = /^data:\s*(.+)$/gm; // 'm' flag for multiline search

            while (true) {
                const { done, value } = await reader.read();
                
                // Log raw data received
                const rawChunk = decoder.decode(value, { stream: !done });

                if (done) {
                    // Process any remaining data in the buffer before completing
                    const finalProcessed = processBuffer(buffer, callbacks, finalMetadata, isFirstChunk, true); // Pass a flag for final processing
                    callbacks.onComplete(finalMetadata); // Pass accumulated metadata
                    break;
                }

                buffer += rawChunk;
                // Process the buffer to extract and handle complete SSE messages
                const processedLength = processBuffer(buffer, callbacks, finalMetadata, isFirstChunk);
                buffer = buffer.substring(processedLength); // Remove processed part from buffer
                if(processedLength > 0 && isFirstChunk) isFirstChunk = false; // isFirstChunk only true for the very first message callback

            }
        } catch (error) {
            if (error.name === 'AbortError') {
                callbacks.onError(error);
            } else {
                callbacks.onError(error);
            }
        } finally {
            this.abortController = null; // Ensure cleanup regardless of success/failure
        }
    }

    /**
     * Attempts to abort the current fetch request.
     */
    stopGeneration() {
        if (this.abortController) {
            this.abortController.abort(); // Signal the fetch to abort
        }
    }
}

// Helper function moved outside the method for clarity and reuse
function processBuffer(buffer, callbacks, finalMetadata, isFirstChunk, isFinalProcessing = false) {
    let processedLength = 0;
    // Split by double newline or single newline NOT followed by 'data:'. 
    // Added lookahead for optional whitespace \s* after newline before data:
    const potentialMessages = buffer.split(/\n\n|\n(?!\s*data:)/); 
    let currentPosition = 0;

    for (let i = 0; i < potentialMessages.length; i++) {
        const messageBlock = potentialMessages[i];
        
        if (!messageBlock.trim()) {
             if (i < potentialMessages.length - 1 || !isFinalProcessing) {
                const separatorLength = buffer.includes('\n\n', currentPosition) ? 2 : (buffer.startsWith('\n', currentPosition) ? 1 : 0);
                currentPosition += messageBlock.length + separatorLength;
             }
            continue;
        }

        // Check if it's the last potential message and we are *not* in final processing mode.
        // If so, it might be incomplete, so we don't process it yet.
        if (i === potentialMessages.length - 1 && !isFinalProcessing && !buffer.endsWith('\n\n') && !buffer.endsWith(']')) { // Heuristic: complete messages often end with double newline or a specific marker like ] for [DONE]
             break; // Stop processing this buffer, wait for more data
         }

        let jsonData = null;
        let eventType = null;

        // Find the 'data:' line within the block
        // Trim leading/trailing whitespace from the block before matching
        const trimmedBlock = messageBlock.trim();
        const dataLineMatch = trimmedBlock.match(/^data:\s*(.+)$/m);
        if (dataLineMatch && dataLineMatch[1]) {
            jsonData = dataLineMatch[1].trim();
        } else {
            // Check if it's just a ping event, which is expected not to have data
            if (!trimmedBlock.includes('event: ping')) {
            }
             // If it's the last block and potentially incomplete, stop processing
             if (i === potentialMessages.length - 1 && !isFinalProcessing) {
                 break;
             } else {
                // Otherwise, treat as processed (maybe it's just whitespace or noise)
                const separatorLength = buffer.includes('\n\n', currentPosition) ? 2 : (buffer.startsWith('\n', currentPosition) ? 1 : 0);
                processedLength = currentPosition + messageBlock.length + separatorLength; // Advance past this potentially bad block
                currentPosition = processedLength;
                 continue;
             }
        }

        if (jsonData) {
            try {
                if (jsonData === "[DONE]") {
                } else {
                    const data = JSON.parse(jsonData);
                    eventType = data.event; // Get event type from Dify's JSON payload

                    switch (eventType) {
                        case 'message':
                        case 'agent_message':
                            callbacks.onMessage(data.answer, isFirstChunk && processedLength === 0); // Only true first chunk on first successful message
                            isFirstChunk = false; // Ensure subsequent messages aren't marked as first
                            break;
                        case 'agent_thought':
                            callbacks.onThought?.(data);
                            break;
                        case 'workflow_started':
                            finalMetadata.workflow_run_id = data.workflow_run_id;
                            finalMetadata.task_id = data.task_id; // Capture task_id
                            callbacks.onWorkflowStarted?.(data);
                            break;
                        case 'workflow_finished':
                            // Capture all data from the event payload into finalMetadata
                            if (data.data) { // Only update if data exists
                                finalMetadata.status = data.data.status || finalMetadata.status || 'unknown'; // Keep existing if new is undefined
                                finalMetadata.error = data.data.error || finalMetadata.error; // Keep existing error if new is undefined/null
                                // Outputs are usually handled by node_finished or specific text_chunk events now
                                // finalMetadata.outputs = { ...(finalMetadata.outputs || {}), ...data.data.outputs }; // Optional: Merge outputs if needed

                                // Merge usage, elapsed time, and total steps from the workflow_finished event data
                                if (data.data.usage) {
                                     finalMetadata.usage = { ...(finalMetadata.usage || {}), ...data.data.usage };
                                }
                                if(data.data.elapsed_time) {
                                      finalMetadata.elapsed_time = data.data.elapsed_time;
                                }
                                if (data.data.total_steps) {
                                    finalMetadata.total_steps = data.data.total_steps;
                                }
                             }

                            callbacks.onWorkflowCompleted?.(data);
                            break;
                        case 'node_started':
                            callbacks.onNodeStarted?.(data);
                            break;
                        case 'node_finished':
                            // Node completion is now mainly for metadata and logging. Text comes from text_chunk.
                            const nodeData = data.data;

                            // Attempt to extract potential final text from node outputs as a fallback
                            if (nodeData?.outputs) {
                                const potentialText = extractTextFromOutputs(nodeData.outputs);
                                if (potentialText) {
                                    // Store it in finalMetadata, potentially overwriting previous node outputs
                                    // Assuming the last node with text output might contain the final result
                                    finalMetadata.nodeOutputText = potentialText;
                                    // DO NOT call onMessage here; rely on text_chunk events for streaming display
                                }
                            }

                             // Update metadata with node-specific info if needed (e.g., usage)
                             // Attempt to merge usage from node metadata first
                             if (nodeData?.metadata?.usage) {
                                  finalMetadata.usage = { ...(finalMetadata.usage || {}), ...nodeData.metadata.usage };
                             }
                             // Also check node outputs for usage (LLM nodes often put it here)
                             if (nodeData?.outputs?.usage) {
                                  finalMetadata.usage = { ...(finalMetadata.usage || {}), ...nodeData.outputs.usage };
                             }
                             // Capture node elapsed time (might be useful for detailed stats later, but finalMetadata.elapsed_time usually comes from workflow_finished)
                             if (nodeData?.elapsed_time) {
                                  // Avoid overwriting the main elapsed_time if it exists
                                  if (!finalMetadata.node_elapsed_times) finalMetadata.node_elapsed_times = {};
                                  finalMetadata.node_elapsed_times[nodeData.node_id] = nodeData.elapsed_time;
                             }
                             // Capture total_steps if available at node level (less common)
                             if (nodeData?.total_steps && !finalMetadata.total_steps) { // Only set if not already set by workflow
                                finalMetadata.total_steps = nodeData.total_steps;
                             }

                            callbacks.onNodeCompleted?.(data);
                            break;
                        // ADDED: Handle text chunks for streaming workflow output
                        case 'text_chunk':
                            if (data.text && typeof data.text === 'string') {
                                callbacks.onMessage(data.text, isFirstChunk && processedLength === 0);
                                isFirstChunk = false; // Ensure subsequent chunks append
                            }
                            break;
                        case 'message_end':
                            finalMetadata.conversation_id = data.conversation_id;
                            finalMetadata.message_id = data.message_id;
                            finalMetadata.usage = data.metadata?.usage || {};
                            break;
                        case 'error':
                            callbacks.onError(new Error(`Dify Stream Error: ${JSON.stringify(data)}`));
                            // Decide if we should stop entirely here.
                            // For now, we process the error and let the caller decide.
                            break;
                        default:
                    }
                }
                 // Successfully processed this block
                 processedLength = currentPosition + messageBlock.length + (buffer.includes('\n\n', currentPosition) ? 2 : 1); // Update processed length

            } catch (e) {
                // JSON parsing failed. This might be an incomplete JSON object at the end of the buffer.
                // Stop processing this buffer chunk and wait for more data.
                console.warn("[DifyClient] Failed to parse JSON, waiting for more data:", jsonData, e);
                break; // Exit the loop for this buffer chunk
            }
        }
        // Move position marker
        currentPosition += messageBlock.length + (buffer.includes('\n\n', currentPosition) ? 2 : 1);

    }
    return processedLength; // Return how much of the buffer was successfully processed
}

/**
 * Helper function to extract text from Dify output objects.
 * Checks common keys and falls back to the value of the first key if only one exists.
 * @param {object | null | undefined} outputs - The outputs object from Dify.
 * @returns {string | null} The extracted text or null if none found.
 */
function extractTextFromOutputs(outputs) {
    if (!outputs || typeof outputs !== 'object') {
        return null;
    }
    // Prioritize common text output keys
    if (typeof outputs.text === 'string') return outputs.text;
    if (typeof outputs.result === 'string') return outputs.result;
    if (typeof outputs.content === 'string') return outputs.content;
    // Check for specific keys if known (e.g., from User Story)
    if (typeof outputs['User Story'] === 'string') return outputs['User Story'];

    // Fallback: If only one key exists, assume it's the text output
    const keys = Object.keys(outputs);
    if (keys.length === 1 && typeof outputs[keys[0]] === 'string') {
        return outputs[keys[0]];
    }
    
    // Add more specific checks here based on known workflow variable names if needed
    // e.g., if (typeof outputs.generated_story === 'string') return outputs.generated_story;
    if (typeof outputs['User Story'] === 'string') {
        return outputs['User Story'];
    }

    return null; // No suitable text found
}

export default DifyClient; 