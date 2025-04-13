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
 * 创建或更新当前登录用户的设置. (Handles partial updates)
 * @param {object} settings - 包含要更新的字段的对象 (e.g., { role: 'newRole' }, { language: 'en' }, { apiKeys: {...} }).
 * @returns {Promise<object|null>} 更新/创建后的用户设置对象或 null (如果出错)
 */
export async function saveCurrentUserSetting(settings) {
    try {
        const user = await Auth.currentAuthenticatedUser();
        const userId = user.username; // 或者使用 user.attributes.sub
        
        let existingSettingsData = null;
        try {
            existingSettingsData = await getCurrentUserSettings(); 
        } catch (fetchError) {
            // 如果fetchError，可能是找不到现有设置
        }
        
        let payload;
        let isCreating = false;

        if (existingSettingsData) {
            payload = { 
                id: userId,
                role: settings.role !== undefined ? settings.role : existingSettingsData.role, 
                language: settings.language !== undefined ? settings.language : existingSettingsData.language, 
                apiKeys: settings.apiKeys !== undefined ? {
                    userStory: settings.apiKeys?.userStory ?? existingSettingsData.apiKeys?.userStory ?? '',
                    userManual: settings.apiKeys?.userManual ?? existingSettingsData.apiKeys?.userManual ?? '',
                    requirementsAnalysis: settings.apiKeys?.requirementsAnalysis ?? existingSettingsData.apiKeys?.requirementsAnalysis ?? '',
                    uxDesign: settings.apiKeys?.uxDesign ?? existingSettingsData.apiKeys?.uxDesign ?? ''
                } : existingSettingsData.apiKeys 
            };
        } else {
            isCreating = true;
            payload = {
                id: userId,
                role: settings.role || 'user',
                language: settings.language || navigator.language || 'zh-CN',
                apiKeys: {
                    userStory: settings.apiKeys?.userStory ?? '',
                    userManual: settings.apiKeys?.userManual ?? '',
                    requirementsAnalysis: settings.apiKeys?.requirementsAnalysis ?? '',
                    uxDesign: settings.apiKeys?.uxDesign ?? ''
                }
            };
        }

        let result;
        if (isCreating) {
            result = await API.graphql(
                graphqlOperation(mutations.createUserSettings, { input: payload })
            );
            return result.data.createUserSettings;
        } else {
            result = await API.graphql(
                graphqlOperation(mutations.updateUserSettings, { input: payload })
            );
            return result.data.updateUserSettings;
        }

    } catch (error) {
        console.error('Error saving user settings:', JSON.stringify(error, null, 2));
        return null;
    }
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