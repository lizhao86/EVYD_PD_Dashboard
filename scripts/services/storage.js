/**
 * EVYD产品经理AI工作台
 * 云存储服务模块 (Powered by AWS Amplify)
 */

import { API, Auth, graphqlOperation } from 'aws-amplify';
// Adjust the path based on your project structure if src/graphql is incorrect
import * as queries from '../../src/graphql/queries';
import * as mutations from '../../src/graphql/mutations';

// --- User Settings ---

/**
 * 获取当前登录用户的设置 (role, apiKeys).
 * @returns {Promise<object|null>} 用户设置对象或 null (如果未登录或未找到)
 */
export async function getCurrentUserSettings() {
    try {
        const user = await Auth.currentAuthenticatedUser();
        const userId = user.username; // 或者使用 user.attributes.sub

        const result = await API.graphql(
            graphqlOperation(queries.getUserSettings, { id: userId })
        );
        return result.data.getUserSettings;
    } catch (error) {
        console.error('Error fetching user settings:', error);
        return null;
    }
}

/**
 * 保存当前用户设置到DynamoDB
 * @param {Object} settings - 要保存的设置对象
 * @param {number} retryCount - 当前重试次数（内部使用）
 * @returns {Promise<Object>} - 保存的设置对象
 */
export async function saveCurrentUserSetting(settings, retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 重试延迟1秒
    
    if (!settings) {
        console.error('保存用户设置失败: 设置对象为空');
        return null;
    }
    
    try {
        // 确保语言字段存在且有效
        if (settings.language !== undefined && retryCount === 0) {
            console.log(`尝试保存语言设置: ${settings.language}`);
        }
        
        // 获取认证用户信息
        let user;
        try {
            user = await Auth.currentAuthenticatedUser();
            if (!user) {
                throw new Error('无法获取当前认证用户');
            }
        } catch (authError) {
            // 如果有强制标记并且提供了ID，尝试绕过认证检查
            if (settings._force && settings.id) {
                user = { username: settings.id };
            } else {
                throw new Error('用户未登录或认证失败');
            }
        }
        
        const userId = user.username; // 或者使用 user.attributes.sub
        
        // 获取现有设置
        let existingSettingsData = null;
        try {
            existingSettingsData = await getCurrentUserSettings(); 
            
            // 移除所有__typename字段，避免GraphQL错误
            if (existingSettingsData) {
                // 深度复制并清理metadata
                existingSettingsData = JSON.parse(JSON.stringify(existingSettingsData));
                cleanTypenameFields(existingSettingsData);
            }
        } catch (fetchError) {
            // 获取失败时不中断流程，因为我们可以创建新设置
        }
        
        let payload;
        let isCreating = false;

        if (existingSettingsData) {
            // 特别关注language字段
            const newLanguage = settings.language !== undefined ? settings.language : (existingSettingsData.language || 'zh-CN');
            const oldLanguage = existingSettingsData.language || 'zh-CN';
            
            // 确保apiKeys对象不包含__typename
            const apiKeys = settings.apiKeys !== undefined 
                ? {
                    userStory: settings.apiKeys?.userStory ?? (existingSettingsData.apiKeys?.userStory ?? ''),
                    userManual: settings.apiKeys?.userManual ?? (existingSettingsData.apiKeys?.userManual ?? ''),
                    requirementsAnalysis: settings.apiKeys?.requirementsAnalysis ?? (existingSettingsData.apiKeys?.requirementsAnalysis ?? ''),
                    uxDesign: settings.apiKeys?.uxDesign ?? (existingSettingsData.apiKeys?.uxDesign ?? '')
                } 
                : (existingSettingsData.apiKeys ? {
                    userStory: existingSettingsData.apiKeys.userStory || '',
                    userManual: existingSettingsData.apiKeys.userManual || '',
                    requirementsAnalysis: existingSettingsData.apiKeys.requirementsAnalysis || '',
                    uxDesign: existingSettingsData.apiKeys.uxDesign || ''
                } : {
                    userStory: '',
                    userManual: '',
                    requirementsAnalysis: '',
                    uxDesign: ''
                });
            
            payload = { 
                id: userId,
                role: settings.role !== undefined ? settings.role : existingSettingsData.role, 
                language: newLanguage,
                apiKeys: apiKeys
            };
        } else {
            isCreating = true;
            payload = { 
                id: userId,
                role: settings.role || 'viewer',
                language: settings.language || 'zh-CN',
                apiKeys: settings.apiKeys || {
                    userStory: '',
                    userManual: '',
                    requirementsAnalysis: '',
                    uxDesign: ''
                }
            };
        }
        
        // 最后检查确保payload中没有__typename字段
        cleanTypenameFields(payload);

        let result;
        try {
            if (isCreating) {
                result = await API.graphql(
                    graphqlOperation(mutations.createUserSettings, { input: payload })
                );
                return result.data.createUserSettings;
            } else {
                // 确保传输所有必要字段
                if(!payload.role) payload.role = existingSettingsData.role || 'viewer';
                if(!payload.language) payload.language = existingSettingsData.language || 'zh-CN';
                
                result = await API.graphql(
                    graphqlOperation(mutations.updateUserSettings, { input: payload })
                );
                
                const updatedSettings = result.data.updateUserSettings;
                
                // 验证更新结果
                if (settings.language && updatedSettings.language !== settings.language) {
                    // 如果是强制更新且结果不匹配，记录错误但不重试
                    if (settings._force) {
                        console.error('强制更新失败，语言不匹配');
                    } 
                    // 否则尝试重试
                    else if (retryCount < MAX_RETRIES) {
                        return new Promise(resolve => {
                            setTimeout(async () => {
                                const retryResult = await saveCurrentUserSetting(settings, retryCount + 1);
                                resolve(retryResult);
                            }, RETRY_DELAY);
                        });
                    }
                }
                
                return updatedSettings;
            }
        } catch (graphqlError) {
            console.error('GraphQL操作失败');
            
            // 分析GraphQL错误
            const errorMessage = JSON.stringify(graphqlError);
            const isTypeNameError = errorMessage.includes('__typename') || 
                                    errorMessage.includes('variables input contains a field that is not defined');
            
            if (isTypeNameError) {
                // 再次清理payload确保没有__typename字段
                cleanTypenameFields(payload);
                
                if (retryCount < MAX_RETRIES) {
                    return new Promise(resolve => {
                        setTimeout(async () => {
                            try {
                                // 直接重试请求，使用清理后的payload
                                if (isCreating) {
                                    result = await API.graphql(
                                        graphqlOperation(mutations.createUserSettings, { input: payload })
                                    );
                                    resolve(result.data.createUserSettings);
                                } else {
                                    result = await API.graphql(
                                        graphqlOperation(mutations.updateUserSettings, { input: payload })
                                    );
                                    resolve(result.data.updateUserSettings);
                                }
                            } catch (retryError) {
                                // 如果仍然失败，尝试整个函数的重试
                                const retryResult = await saveCurrentUserSetting(settings, retryCount + 1);
                                resolve(retryResult);
                            }
                        }, RETRY_DELAY);
                    });
                }
            }
            
            // 检查是否为网络错误或其他可重试的错误
            const isNetworkError = errorMessage.includes('Network') || 
                errorMessage.includes('network') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('断开') ||
                errorMessage.includes('连接') ||
                errorMessage.includes('ECONNREFUSED');
            
            // 如果是网络错误并且未超过最大重试次数，则重试
            if (isNetworkError && retryCount < MAX_RETRIES) {
                return new Promise(resolve => {
                    setTimeout(async () => {
                        const retryResult = await saveCurrentUserSetting(settings, retryCount + 1);
                        resolve(retryResult);
                    }, RETRY_DELAY);
                });
            }
            
            throw graphqlError; // 重新抛出以便上层捕获
        }

    } catch (error) {
        console.error('保存用户设置时出错');
        
        // 如果是已知可重试的错误类型且未超过最大重试次数
        const isRetryableError = error.message && (
            error.message.includes('ConditionalCheckFailedException') ||
            error.message.includes('LimitExceededException') ||
            error.message.includes('ProvisionedThroughputExceededException') ||
            error.message.includes('ResourceNotFoundException')
        );
        
        if (isRetryableError && retryCount < MAX_RETRIES) {
            return new Promise(resolve => {
                setTimeout(async () => {
                    const retryResult = await saveCurrentUserSetting(settings, retryCount + 1);
                    resolve(retryResult);
                }, RETRY_DELAY);
            });
        }
        
        return null;
    }
}

/**
 * 递归清理对象中的__typename字段
 * @param {Object} obj - 要清理的对象
 */
function cleanTypenameFields(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    // 删除当前对象中的__typename
    if ('__typename' in obj) {
        delete obj.__typename;
    }
    
    // 递归处理所有子对象
    Object.keys(obj).forEach(key => {
        if (obj[key] && typeof obj[key] === 'object') {
            cleanTypenameFields(obj[key]);
        }
    });
}

// --- Global Config ---

// Use a consistent, known ID for the single global configuration record
const GLOBAL_CONFIG_ID = "GLOBAL_CONFIG";

/**
 * 获取全局配置 (apiEndpoints).
 * @returns {Promise<object|null>} 全局配置对象或 null (如果未找到或出错)
 */
export async function getGlobalConfig() {
    try {
        const result = await API.graphql(
            graphqlOperation(queries.getGlobalConfig, { id: GLOBAL_CONFIG_ID })
        );
        if (result.data.getGlobalConfig) {
            return result.data.getGlobalConfig;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching global config:', error);
        return null;
    }
}

/**
 * 保存全局配置 (需要管理员权限).
 * 注意：首次保存需要调用此函数来 *创建* 全局配置记录.
 * @param {object} config - 包含 apiEndpoints 的对象.
 * @param {object} config.apiEndpoints - 包含 API 端点 URL 的对象.
 * @param {string} [config.apiEndpoints.userStory]
 * @param {string} [config.apiEndpoints.userManual]
 * @param {string} [config.apiEndpoints.requirementsAnalysis]
 * @param {string} [config.apiEndpoints.uxDesign]
 * @returns {Promise<object|null>} 更新/创建后的全局配置对象或 null (如果出错或权限不足)
 */
export async function saveGlobalConfig(config) {
    if (!config || !config.apiEndpoints) {
        console.error("Invalid global config format provided for saving.");
        return null;
    }

    const inputData = {
        id: GLOBAL_CONFIG_ID,
        apiEndpoints: {
            userStory: config.apiEndpoints.userStory ?? '',
            userManual: config.apiEndpoints.userManual ?? '',
            requirementsAnalysis: config.apiEndpoints.requirementsAnalysis ?? '',
            uxDesign: config.apiEndpoints.uxDesign ?? ''
        }
    };

    try {
        let result;
        try {
            result = await API.graphql(
                graphqlOperation(mutations.updateGlobalConfig, { input: inputData })
            );
            return result.data.updateGlobalConfig;
        } catch (updateError) {
            const isNotFoundError = updateError.errors?.some(e => 
                e.errorType?.includes('ConditionalCheckFailed') || 
                e.message?.includes('conditional request failed')
            );

            if (isNotFoundError) {
                result = await API.graphql(
                    graphqlOperation(mutations.createGlobalConfig, { input: inputData })
                );
                return result.data.createGlobalConfig;
            } else {
                throw updateError;
            }
        }
    } catch (error) {
        console.error('Error saving global config (permissions?):', error);
        return null;
    }
}

// 为实现兼容性，添加V6 API风格的函数
// 这些帮助我们平滑过渡，让依赖这些方法的代码可以继续工作
export const generateClient = () => {
    // 返回一个与V6 API风格类似的客户端对象
    return {
        graphql: async (params) => {
            const { query, variables } = params;
            const result = await API.graphql(graphqlOperation(query, variables));
            return result;
        }
    };
};

export async function getCurrentUser() {
    const user = await Auth.currentAuthenticatedUser();
    return {
        userId: user.username // 或 user.attributes.sub
    };
} 