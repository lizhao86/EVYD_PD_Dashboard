/**
 * EVYD产品经理AI工作台
 * 云存储服务模块 (Powered by AWS Amplify)
 */

import { API, Auth, graphqlOperation } from 'aws-amplify';
// Adjust the path based on your project structure if src/graphql is incorrect
import * as queries from '../../src/graphql/queries';
import * as mutations from '../../src/graphql/mutations';

// Helper function to remove __typename fields recursively (if needed by API.graphql)
function cleanTypenameFields(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(cleanTypenameFields);
  } else {
    delete obj.__typename;
    Object.values(obj).forEach(cleanTypenameFields);
  }
}

// --- User Settings ---

/**
 * 获取当前登录用户的设置 (role, language).
 * @returns {Promise<object|null>} 用户设置对象或 null (如果未登录或未找到)
 */
export async function getCurrentUserSettings() {
    try {
        // 使用 Cognito 用户名或 sub 作为 ID 查询 DynamoDB
        const user = await Auth.currentAuthenticatedUser();
        const userId = user.username; // 或者: user.attributes.sub; 视你的 schema 设计而定
        // console.log(`Fetching settings for user ID (Cognito): ${userId}`);

        // Correct way to call API.graphql with query and variables
        const result = await API.graphql({
            query: queries.getUserSettings, 
            variables: { id: userId }
            // authMode: 'AMAZON_COGNITO_USER_POOLS' // Consider if authMode needs to be explicitly set
        });
        // Old incorrect call:
        // const result = await API.graphql(
        //     userId,
        //     queries.getUserSettings,
        //     graphqlOperation(`query GetUserSettings($id: ID!) {
        //       getUserSettings(id: $id) {
        //         id
        //         role
        //         language
        //         owner
        //         createdAt
        //         updatedAt
        //         _version
        //         _deleted
        //         _lastChangedAt
        //       }
        //     }`)
        // );

        if (result.data.getUserSettings) {
           // console.log('Fetched user settings:', result.data.getUserSettings);
            return result.data.getUserSettings;
        } else {
           // console.log('No user settings found for ID:', userId);
            return null;
        }
    } catch (error) {
        // Distinguish between 'user not found' (expected) and other errors
        if (error.errors && error.errors.some(e => e.message.includes("Cannot return null for non-nullable field"))) {
             // console.log('User settings not found (expected error for new user). ID:', userId);
             return null;
        }
        console.error('Error fetching user settings:', JSON.stringify(error));
        return null;
    }
}

/**
 * 保存当前用户设置 (role, language) 到DynamoDB
 * @param {Object} settings - 要保存的设置对象 { role, language }
 * @param {number} retryCount - 当前重试次数（内部使用）
 * @returns {Promise<Object|null>} - 保存或更新后的设置对象，或 null on failure
 */
export async function saveCurrentUserSetting(settings, retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 重试延迟1秒

    if (!settings || typeof settings !== 'object') {
        console.error('保存用户设置失败: 无效的设置对象', settings);
        return null;
    }
     // Ensure required 'role' field exists, default to 'user' if missing during creation
     if (!settings.role && retryCount === 0) { // Only default on first try
         settings.role = 'user';
         console.log("Role missing, defaulting to 'user'");
     } else if (!settings.role) {
         console.error("保存用户设置失败: 'role' 字段是必需的");
         return null; // Fail if role is missing on retry or explicitly null/undefined
     }

    // Validate role
    if (settings.role !== 'admin' && settings.role !== 'user') {
         console.error(`保存用户设置失败: 无效的角色值 '${settings.role}'. 只允许 'admin' 或 'user'.`);
         return null;
    }


    try {
        if (retryCount === 0) {
            // console.log(`saveCurrentUserSetting called (attempt ${retryCount + 1}/${MAX_RETRIES+1}) with settings:`, JSON.stringify(settings));
        }

        // 获取认证用户信息
        let user;
        try {
            user = await Auth.currentAuthenticatedUser();
        } catch (authError) {
            console.error('保存用户设置失败: 获取当前认证用户失败:', authError);
            return null; // Cannot save settings if user is not authenticated
        }

        // Use sub or username consistently with getCurrentUserSettings
        const userId = user.username; // Or preferably: user.attributes.sub;
        // console.log(`Saving settings for user ID (Cognito): ${userId}`);


        // 检查现有设置以确定是创建还是更新
        let existingSettingsData = null;
        try {
            // Pass userId to fetch specific user's settings
            existingSettingsData = await getCurrentUserSettings(); // Already uses userId
        } catch (fetchError) {
             // Log but continue, as we might be creating a new record
            console.error('获取现有设置以确定创建/更新时出错:', fetchError);
        }

        let payload;
        const isCreating = !existingSettingsData;

        if (isCreating) {
            // console.log('Creating new settings record.');
            payload = {
                id: userId, // Use Cognito ID as the primary key
                role: settings.role, // Already validated/defaulted
                // Use provided language or default, prevent setting null/undefined
                language: settings.language || 'zh-CN',
                // REMOVED apiKeys
            };
        } else {
           // console.log('Updating existing settings record.');
            // Prepare payload for update, only include fields being changed + required ID + _version
            payload = {
                id: userId, // Must include ID for update
                _version: existingSettingsData._version, // Must include _version for update
            };
            if (settings.role !== undefined && settings.role !== existingSettingsData.role) {
                 payload.role = settings.role;
            }
             if (settings.language !== undefined && settings.language !== existingSettingsData.language) {
                 payload.language = settings.language;
             }
            // REMOVED apiKeys logic

            // If no fields other than ID and version are being updated, no need to call API
            if (Object.keys(payload).length <= 2) {
                 // console.log("No changes detected to update.");
                 return existingSettingsData; // Return existing data as no update was needed
            }
        }

        // console.log('Payload prepared:', JSON.stringify(payload));

        let result;
        try {
            if (isCreating) {
                // console.log('Executing createUserSettings mutation...');
                result = await API.graphql(
                    graphqlOperation(mutations.createUserSettings, { input: payload })
                );
                // console.log('createUserSettings result:', result.data.createUserSettings);
                return result.data.createUserSettings;
            } else {
               // console.log('Executing updateUserSettings mutation...');
                result = await API.graphql(
                    graphqlOperation(mutations.updateUserSettings, { input: payload })
                );
               // console.log('updateUserSettings result:', result.data.updateUserSettings);
                return result.data.updateUserSettings;
            }
        } catch (graphqlError) {
            console.error('GraphQL operation failed:', JSON.stringify(graphqlError));

             // Basic retry logic for potential network issues or specific AWS errors
             const isNetworkError = graphqlError.message?.includes('Network') || graphqlError.networkError; // Check both possible properties
             const isRetryableAWSError = graphqlError.errors?.some(e =>
                 e.errorType === 'ConflictUnhandled' || // DataStore conflict if version mismatched
                 e.errorType === 'LimitExceededException' ||
                 e.errorType === 'ProvisionedThroughputExceededException'
             );

             if ((isNetworkError || isRetryableAWSError) && retryCount < MAX_RETRIES) {
                console.log(`Retrying operation due to ${isNetworkError ? 'network issue' : 'AWS error'} (${retryCount + 1}/${MAX_RETRIES})...`);
                 await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount))); // Exponential backoff
                 return saveCurrentUserSetting(settings, retryCount + 1); // Return the promise from the recursive call
            }

            // If update failed due to version mismatch (ConditionalCheckFailedException)
             if (graphqlError.errors?.some(e => e.errorType === 'ConflictUnhandled' || e.errorType === 'ConditionalCheckFailedException') && !isCreating) {
                 console.warn("Update failed due to version conflict. Data may have changed since last read.");
                 // Optionally: could trigger a re-fetch and merge strategy here, or just inform the user.
                 // For now, we just return null to indicate failure.
                 return null;
             }


            throw graphqlError; // Re-throw if not retried or other error
        }

    } catch (error) {
        console.error('Error saving user settings:', error);
         // Final catch-all, return null on unhandled errors during the process
         return null;
    }
}

// --- Application Functions ---

/**
 * 获取所有定义的 Application 列表.
 * 需要用户登录，因为 Application 模型的读取权限设置为 private.
 * @returns {Promise<Array<object>>} Application 对象数组，或空数组 if error.
 */
export async function listApplications() {
    try {
        // The listApplications query might have auth rules applied based on the schema.
        // If read is allowed for private (authenticated users), this should work.
        const result = await API.graphql(graphqlOperation(queries.listApplications));
        return result.data?.listApplications?.items || [];
    } catch (error) {
        console.error("Error listing applications:", JSON.stringify(error));
        // Check for specific auth errors if needed
        return [];
    }
}

// Example: Function to create an Application (requires Admin privileges via @auth rule)
export async function createApplication(name, description) {
  if (!name) {
    console.error("Application name is required.");
    return null;
  }
  const payload = { name, description };
  try {
    const result = await API.graphql(
      graphqlOperation(mutations.createApplication, { input: payload })
    );
    console.log("Application created:", result.data.createApplication);
    return result.data.createApplication;
  } catch (error) {
    console.error("Error creating application:", JSON.stringify(error));
    // Check if it's an auth error
    if (error.errors && error.errors.some(e => e.errorType === 'Unauthorized')) {
        console.error("Permission denied. User might not be in the 'Admin' group.");
    }
    return null;
  }
}

// --- User Application API Key Functions ---

// Example: Function for a user to create their API Key for a specific application
export async function createUserApiKey(applicationID, apiKey) {
   if (!applicationID || !apiKey) {
       console.error("Application ID and API Key are required.");
       return null;
   }
    // Owner is handled automatically by @auth rule, applicationID and apiKey are required
    const payload = { applicationID, apiKey };
    try {
        const result = await API.graphql(
           graphqlOperation(mutations.createUserApplicationApiKey, { input: payload })
        );
        console.log("User API Key created:", result.data.createUserApplicationApiKey);
        return result.data.createUserApplicationApiKey;
    } catch (error) {
       console.error("Error creating user API key:", JSON.stringify(error));
       return null;
    }
}

// 更新用户现有的API密钥
export async function updateUserApiKey(recordId, apiKey, version) {
   if (!recordId || !apiKey) {
       console.error("Record ID and API Key are required for update.");
       return null;
   }
    // 需要提供记录ID和版本号来更新
    const payload = { 
        id: recordId, 
        apiKey: apiKey
    };
    
    // 如果提供了版本号，添加到payload中
    if (version) {
        payload._version = version;
    }
    
    try {
        const result = await API.graphql(
           graphqlOperation(mutations.updateUserApplicationApiKey, { input: payload })
        );
        console.log("User API Key updated:", result.data.updateUserApplicationApiKey);
        return result.data.updateUserApplicationApiKey;
    } catch (error) {
       console.error("Error updating user API key:", JSON.stringify(error));
       
       // 如果是版本冲突错误，尝试获取最新版本并重试
       if (error.errors?.some(e => e.errorType === 'ConflictUnhandled')) {
           try {
               // 获取最新记录
               const getResult = await API.graphql(
                   graphqlOperation(queries.getUserApplicationApiKey, { id: recordId })
               );
               const latestRecord = getResult.data?.getUserApplicationApiKey;
               
               if (latestRecord) {
                   // 使用最新版本重试更新
                   const retryPayload = {
                       id: recordId,
                       apiKey: apiKey,
                       _version: latestRecord._version
                   };
                   
                   const retryResult = await API.graphql(
                       graphqlOperation(mutations.updateUserApplicationApiKey, { input: retryPayload })
                   );
                   console.log("User API Key updated after retry:", retryResult.data.updateUserApplicationApiKey);
                   return retryResult.data.updateUserApplicationApiKey;
               }
           } catch (retryError) {
               console.error("Error retrying update:", JSON.stringify(retryError));
           }
       }
       
       return null;
    }
}

// 删除用户的API密钥
export async function deleteUserApiKey(recordId, version) {
   if (!recordId) {
       console.error("Record ID is required for deletion.");
       return false;
   }
   
   const payload = { id: recordId };
   if (version) {
       payload._version = version;
   }
   
   try {
        const result = await API.graphql(
           graphqlOperation(mutations.deleteUserApplicationApiKey, { input: payload })
        );
        console.log("User API Key deleted:", result.data.deleteUserApplicationApiKey);
        return true;
    } catch (error) {
       console.error("Error deleting user API key:", JSON.stringify(error));
       
       // 如果是版本冲突错误，尝试获取最新版本并重试
       if (error.errors?.some(e => e.errorType === 'ConflictUnhandled')) {
           try {
               // 获取最新记录
               const getResult = await API.graphql(
                   graphqlOperation(queries.getUserApplicationApiKey, { id: recordId })
               );
               const latestRecord = getResult.data?.getUserApplicationApiKey;
               
               if (latestRecord) {
                   // 使用最新版本重试删除
                   const retryResult = await API.graphql(
                       graphqlOperation(mutations.deleteUserApplicationApiKey, { 
                           input: { id: recordId, _version: latestRecord._version } 
                       })
                   );
                   console.log("User API Key deleted after retry:", retryResult.data.deleteUserApplicationApiKey);
                   return true;
               }
           } catch (retryError) {
               console.error("Error retrying deletion:", JSON.stringify(retryError));
           }
       }
       
       return false;
    }
}

// Example: Function to get API Keys for the current user
export async function getCurrentUserApiKeys() {
    try {
        const user = await Auth.currentAuthenticatedUser();
        // 构造 owner 字段的期望值: <sub>::<username>
        const sub = user.attributes.sub;
        const username = user.username;
        if (!sub || !username) {
            console.error("[storage.js] getCurrentUserApiKeys: 无法获取用户的 sub 或 username 属性。");
            return [];
        }
        const ownerFilterValue = `${sub}::${username}`;

        console.log("[storage.js] getCurrentUserApiKeys: 开始获取API密钥，使用的 owner 过滤值: ", ownerFilterValue);

        const result = await API.graphql(
            graphqlOperation(queries.listUserApplicationApiKeys, {
                filter: {
                    owner: { eq: ownerFilterValue }, // 使用组合值过滤
                    _deleted: { ne: true }
                }
            })
        );

        let items = result.data.listUserApplicationApiKeys.items || [];
        console.log("[storage.js] getCurrentUserApiKeys: GraphQL 返回的原始 items: ", JSON.stringify(items, null, 2));

        if (items.length === 0) {
            console.log("[storage.js] getCurrentUserApiKeys: 未找到该用户的API密钥记录 (owner='${ownerFilterValue}')。");
            return [];
        }

        items.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0);
            const dateB = new Date(b.updatedAt || b.createdAt || 0);
            return dateB - dateA;
        });

        const appKeyMap = new Map();
        for (const item of items) {
            if (item.applicationID && !appKeyMap.has(item.applicationID)) {
                appKeyMap.set(item.applicationID, item);
            }
        }

        const finalItems = Array.from(appKeyMap.values());
        console.log("[storage.js] getCurrentUserApiKeys: 最终返回的 finalItems: ", JSON.stringify(finalItems, null, 2));

        return finalItems;
    } catch (error) {
       console.error("[storage.js] getCurrentUserApiKeys: 获取用户API密钥时出错:", error);
       console.error("[storage.js] getCurrentUserApiKeys: 错误详情:", JSON.stringify({
           message: error.message,
           stack: error.stack,
           name: error.name,
           code: error.code
       }));
       return [];
    }
}

// --- Global Config ---

/**
 * 获取所有全局配置项，并以 Map<configKey, { value: string, type: string }> 的形式返回.
 * @returns {Promise<Map<string, { value: string, type: string }>>} 包含所有全局配置的 Map.
 */
export async function getGlobalConfig() {
    const configMap = new Map();
    let nextToken = null;
    console.log("[getGlobalConfig] Fetching global configs..."); // Added log

    try {
        do {
            // Ensure the query includes applicationType
            const result = await API.graphql(graphqlOperation(queries.listGlobalConfigs, { nextToken }));
            const items = result.data?.listGlobalConfigs?.items || [];
            nextToken = result.data?.listGlobalConfigs?.nextToken;
            console.log(`[getGlobalConfig] Fetched ${items.length} items. Next token: ${nextToken ? 'yes' : 'no'}`); // Added log

            items.forEach(item => {
                if (item && item.configKey && !item._deleted) { // Ensure item, key exist and not deleted
                    // Store both value and type
                    configMap.set(item.configKey, {
                        value: item.configValue || '', 
                        type: item.applicationType || 'chat' // Default to 'chat' if type is missing for some reason
                    });
                }
            });
        } while (nextToken);
        
        console.log("[getGlobalConfig] Finished fetching. Config map:", configMap); // Added log
        return configMap;
    } catch (error) {
        console.error('[getGlobalConfig] Error fetching global configs:', error);
        return configMap; // Return potentially partial map on error
    }
}

/**
 * 保存全局配置对象 (用于管理员配置API端点等全局设置)
 * @param {Object} config - 配置对象，包含要保存的各种全局配置
 * @returns {Promise<boolean>} - 保存成功返回true
 */
export async function saveGlobalConfig(config) {
    if (!config || typeof config !== 'object') {
        console.error("Invalid config object provided:", config);
        return false;
    }

    const MAX_RETRIES = 2; // 最大重试次数
    const RETRY_DELAY = 500; // 重试间隔，毫秒

    // API端点保存处理
    if (config.apiEndpoints && typeof config.apiEndpoints === 'object') {
        console.log("Saving global config entries:", config.apiEndpoints);
        
        // 预加载所有现有配置，以减少API调用次数
        // 这样我们可以先检查是否需要更新，不需要时避免API调用
        let existingConfigsMap = new Map();
        try {
            const globalConfig = await getGlobalConfig();
            for (const key in globalConfig) {
                existingConfigsMap.set(key, globalConfig[key]);
            }
            // 对于UI中特定命名的输入框，也映射其ID
            document.querySelectorAll('[id^="global-"][id$="-api-endpoint"]').forEach(input => {
                const appId = input.id.replace('global-', '').replace('-api-endpoint', '');
                if (globalConfig[appId]) {
                    existingConfigsMap.set(input.id, globalConfig[appId]);
                }
            });
        } catch (loadError) {
            // 加载失败时继续，仅意味着我们将无法预先检查是否需要更新
        }
        
        // 处理每个API端点配置
        const results = await Promise.all(
            Object.entries(config.apiEndpoints).map(async ([configKey, configValue]) => {
                return await processConfigKeySave(configKey, configValue, 0, existingConfigsMap);
            })
        );
        
        // 如果所有配置都保存成功，返回true
        return results.every(result => result);
    }
    
    return false;
}

/**
 * 处理单个配置键的保存，支持重试
 * @private
 */
async function processConfigKeySave(configKey, configValue, retryCount = 0, existingConfigsMap = new Map()) {
    const MAX_RETRIES = 2; // 最大重试次数
    const RETRY_DELAY = 500; // 重试间隔，毫秒
    
    try {
        let version;
        let needsUpdate = true;
        let shouldCreate = false;
        let existing = null;
        
        // 尝试获取现有的配置
        try {
            // 1. 首先检查预加载的配置
            if (existingConfigsMap.has(configKey)) {
                const existingValue = existingConfigsMap.get(configKey);
                if (existingValue === configValue) {
                    needsUpdate = false;
                }
            }
            
            // 即使预加载的值表明不需要更新，我们仍需获取完整记录以获取版本号
            const result = await API.graphql(
                graphqlOperation(queries.getGlobalConfig, { id: configKey })
            );
            
            existing = result.data.getGlobalConfig;
            if (existing) {
                version = existing._version;
                
                // 如果值相同，不需要更新
                if (existing.configValue === configValue) {
                    needsUpdate = false;
                }
            } else {
                shouldCreate = true;
            }
        } catch (getError) {
            // 如果错误表明记录不存在，则创建新记录
            if (getError.errors && getError.errors.some(e => e.message.includes("not found"))) {
                shouldCreate = true;
            } else {
                throw getError; // 重新抛出其他错误
            }
        }
        
        let result = false;
        
        if (!needsUpdate) {
            // 值相同，不需要更新
            return true;
        } else if (shouldCreate) {
            // 创建新配置
            const createInput = {
                id: configKey,
                configKey: configKey,
                configValue: configValue
            };
            
            const createResult = await API.graphql(
                graphqlOperation(mutations.createGlobalConfig, { input: createInput })
            );
            
            result = !!createResult.data.createGlobalConfig;
        } else {
            // 更新现有配置
            const updateInput = {
                id: configKey,
                configValue: configValue,
                _version: version
            };
            
            const updateResult = await API.graphql(
                graphqlOperation(mutations.updateGlobalConfig, { input: updateInput })
            );
            
            result = !!updateResult.data.updateGlobalConfig;
        }
        
        return result;
    } catch (error) {
        // 处理冲突错误和其他错误
        const isVersionConflict = 
            error.errors && 
            error.errors.some(e => 
                e.errorType === 'ConflictUnhandled' || 
                e.message.includes('Conflict') || 
                e.message.includes('version')
            );
        
        if (isVersionConflict && retryCount < MAX_RETRIES) {
            // 版本冲突，等待然后重试
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
            return processConfigKeySave(configKey, configValue, retryCount + 1, existingConfigsMap);
        }
        
        // 最后一次尝试使用list-then-update方法
        if (retryCount === MAX_RETRIES) {
            try {
                // 先尝试使用list操作获取最新项
                const listResult = await API.graphql(
                    graphqlOperation(queries.listGlobalConfigs, {
                        filter: { id: { eq: configKey } }
                    })
                );
                
                const items = listResult.data.listGlobalConfigs.items;
                if (items && items.length > 0) {
                    // 找到了项，使用最新版本更新
                    const latestItem = items[0];
                    
                    const updateInput = {
                        id: configKey,
                        configValue: configValue,
                        _version: latestItem._version
                    };
                    
                    await API.graphql(
                        graphqlOperation(mutations.updateGlobalConfig, { input: updateInput })
                    );
                    
                    return true;
                } else {
                    // 没有找到项，创建新项
                    const createInput = {
                        id: configKey,
                        configKey: configKey,
                        configValue: configValue
                    };
                    
                    await API.graphql(
                        graphqlOperation(mutations.createGlobalConfig, { input: createInput })
                    );
                    
                    return true;
                }
            } catch (finalError) {
                console.error(`Failed to save config for key ${configKey} (final attempt):`, finalError);
                return false;
            }
        }
        
        console.error(`Failed to save config for key ${configKey}:`, error);
        return false;
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

/**
 * 一次性迁移函数，用于为现有的 GlobalConfig 记录添加 applicationType 字段。
 */
export async function migrateGlobalConfigs() {
    console.log("Starting GlobalConfig migration...");
    let migratedCount = 0;
    let nextToken = null;

    try {
        do {
            // 获取一批 GlobalConfig 记录
            const listResult = await API.graphql(
                graphqlOperation(queries.listGlobalConfigs, { nextToken })
            );
            
            const items = listResult.data?.listGlobalConfigs?.items || [];
            nextToken = listResult.data?.listGlobalConfigs?.nextToken;

            const updates = [];

            for (const item of items) {
                // 检查 applicationType 是否缺失
                if (item && !item.applicationType) {
                    let newType = null;
                    switch (item.configKey) {
                        case 'userStory':
                            newType = 'workflow';
                            break;
                        case 'requirementsAnalysis':
                        case 'userManual':
                        case 'uxDesign':
                            newType = 'chat';
                            break;
                        default:
                            console.warn(`Skipping migration for unknown configKey: ${item.configKey}`);
                            continue; // 跳过未知类型
                    }

                    if (newType) {
                        console.log(`Migrating item ${item.id} (${item.configKey}) to type: ${newType}`);
                        // 准备更新操作
                        const updateInput = {
                            id: item.id,
                            applicationType: newType,
                            _version: item._version
                        };
                        // 将更新操作添加到批处理数组中
                        updates.push(
                            API.graphql(
                                graphqlOperation(mutations.updateGlobalConfig, { input: updateInput })
                            )
                        );
                        migratedCount++;
                    }
                }
            }
            // 并行执行当前批次的更新操作
            await Promise.all(updates);
            console.log(`Processed batch, ${updates.length} updates attempted.`);

        } while (nextToken); // 如果有下一页，继续循环

        console.log(`GlobalConfig migration completed. ${migratedCount} items migrated.`);
        return true;

    } catch (error) {
        console.error('Error during GlobalConfig migration:', error);
        return false;
    }
}