/**
 * EVYD产品经理AI工作台
 * 云存储服务模块 (Powered by AWS Amplify)
 */

import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
// Adjust the path based on your project structure if src/graphql is incorrect
import * as queries from '../../src/graphql/queries';
import * as mutations from '../../src/graphql/mutations';

const client = generateClient();

// --- User Settings ---

/**
 * 获取当前登录用户的设置 (role, apiKeys).
 * @returns {Promise<object|null>} 用户设置对象或 null (如果未登录或未找到)
 */
export async function getCurrentUserSettings() {
    try {
        const { userId } = await getCurrentUser();
        const result = await client.graphql({
            query: queries.getUserSettings,
            variables: { id: userId }
        });
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
        const { userId } = await getCurrentUser();
        let existingSettingsData = null;
        try {
            existingSettingsData = await getCurrentUserSettings(); 
        } catch (fetchError) {
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
            result = await client.graphql({
                query: mutations.createUserSettings,
                variables: { input: payload }
            });
            return result.data.createUserSettings;
        } else {
            const updateInput = { ...payload };
            result = await client.graphql({
                query: mutations.updateUserSettings, 
                variables: { input: payload }
            });
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
        const result = await client.graphql({
            query: queries.getGlobalConfig,
            variables: { id: GLOBAL_CONFIG_ID }
        });
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
            result = await client.graphql({
                query: mutations.updateGlobalConfig,
                variables: { input: inputData }
            });
            return result.data.updateGlobalConfig;
        } catch (updateError) {
            const isNotFoundError = updateError.errors?.some(e => e.errorType?.includes('ConditionalCheckFailed') || e.message?.includes('conditional request failed'));

            if (isNotFoundError) {
                result = await client.graphql({
                    query: mutations.createGlobalConfig,
                    variables: { input: inputData }
                });
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

// Removed the old Storage object and the Storage.init() call.
// Initialization (like ensuring GlobalConfig exists) should now be handled
// within the application logic, possibly after admin login. 