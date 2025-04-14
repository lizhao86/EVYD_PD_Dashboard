export async function saveCurrentUserSetting(settings, retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 重试延迟1秒
    
    if (!settings) {
        console.error('保存用户设置失败: 设置对象为空');
        return null;
    }
    
    try {
        console.log(`saveCurrentUserSetting被调用[重试次数: ${retryCount}/${MAX_RETRIES}]，设置:`, JSON.stringify(settings));
        
        // 确保语言字段存在且有效
        if (settings.language !== undefined) {
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
            console.error('获取当前认证用户失败:', authError);
            
            // 如果有强制标记并且提供了ID，尝试绕过认证检查
            if (settings._force && settings.id) {
                console.log(`使用提供的ID强制保存: ${settings.id}`);
                user = { username: settings.id };
            } else {
                throw new Error('用户未登录或认证失败');
            }
        }
        
        const userId = user.username; // 或者使用 user.attributes.sub
        console.log(`已获取用户ID: ${userId}`);
        
        // 获取现有设置
        let existingSettingsData = null;
        try {
            existingSettingsData = await getCurrentUserSettings(); 
            console.log('从数据库获取到已存在的设置:', JSON.stringify(existingSettingsData));
        } catch (fetchError) {
            console.error('获取现有设置时出错:', fetchError);
            // 获取失败时不中断流程，因为我们可以创建新设置
        }
        
        let payload;
        let isCreating = false;

        if (existingSettingsData) {
            console.log('更新现有设置记录');
            
            // 特别关注language字段
            const newLanguage = settings.language !== undefined ? settings.language : (existingSettingsData.language || 'zh-CN');
            const oldLanguage = existingSettingsData.language || 'zh-CN';
            
            if (newLanguage !== oldLanguage) {
                console.log(`语言偏好将从 ${oldLanguage} 更改为 ${newLanguage}`);
            } else {
                console.log(`语言偏好保持不变: ${newLanguage}`);
            }
            
            payload = { 
                id: userId,
                role: settings.role !== undefined ? settings.role : existingSettingsData.role, 
                language: newLanguage,
                apiKeys: settings.apiKeys !== undefined ? {
                    userStory: settings.apiKeys?.userStory ?? existingSettingsData.apiKeys?.userStory ?? '',
                    userManual: settings.apiKeys?.userManual ?? existingSettingsData.apiKeys?.userManual ?? '',
                    requirementsAnalysis: settings.apiKeys?.requirementsAnalysis ?? existingSettingsData.apiKeys?.requirementsAnalysis ?? '',
                    uxDesign: settings.apiKeys?.uxDesign ?? existingSettingsData.apiKeys?.uxDesign ?? ''
                } : existingSettingsData.apiKeys 
            };
        } else {
            console.log('创建新的设置记录');
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
        
        console.log('准备提交到DynamoDB的payload:', JSON.stringify(payload));

        let result;
        try {
            if (isCreating) {
                console.log('调用createUserSettings...');
                result = await API.graphql(
                    graphqlOperation(mutations.createUserSettings, { input: payload })
                );
                console.log('createUserSettings结果:', JSON.stringify(result.data.createUserSettings));
                return result.data.createUserSettings;
            } else {
                console.log('调用updateUserSettings...');
                // 确保传输所有必要字段
                if(!payload.role) payload.role = existingSettingsData.role || 'viewer';
                if(!payload.language) payload.language = existingSettingsData.language || 'zh-CN';
                
                // 记录mutation参数
                console.log('updateUserSettings mutation参数:', JSON.stringify({ input: payload }));
                
                result = await API.graphql(
                    graphqlOperation(mutations.updateUserSettings, { input: payload })
                );
                
                const updatedSettings = result.data.updateUserSettings;
                console.log('updateUserSettings结果:', JSON.stringify(updatedSettings));
                
                // 验证更新结果
                if (settings.language && updatedSettings.language !== settings.language) {
                    console.warn(`警告: 数据库更新后的language(${updatedSettings.language})与请求的language(${settings.language})不匹配!`);
                    
                    // 如果是强制更新且结果不匹配，记录错误但不重试
                    if (settings._force) {
                        console.error('强制更新失败，语言不匹配');
                    } 
                    // 否则尝试重试
                    else if (retryCount < MAX_RETRIES) {
                        console.log(`语言不匹配，将在${RETRY_DELAY}毫秒后重试(${retryCount + 1}/${MAX_RETRIES})`);
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
            console.error('GraphQL操作失败:', graphqlError);
            
            // 检查是否为网络错误或其他可重试的错误
            const isNetworkError = graphqlError.message && (
                graphqlError.message.includes('Network') || 
                graphqlError.message.includes('network') ||
                graphqlError.message.includes('timeout') ||
                graphqlError.message.includes('断开') ||
                graphqlError.message.includes('连接') ||
                graphqlError.message.includes('network') ||
                graphqlError.message.includes('ECONNREFUSED')
            );
            
            // 如果是网络错误并且未超过最大重试次数，则重试
            if (isNetworkError && retryCount < MAX_RETRIES) {
                console.log(`发生网络错误，将在${RETRY_DELAY}毫秒后重试(${retryCount + 1}/${MAX_RETRIES})`);
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
        console.error('保存用户设置时出错:', error);
        console.error('错误详情:', JSON.stringify(error, null, 2));
        
        // 如果是已知可重试的错误类型且未超过最大重试次数
        const isRetryableError = error.message && (
            error.message.includes('ConditionalCheckFailedException') ||
            error.message.includes('LimitExceededException') ||
            error.message.includes('ProvisionedThroughputExceededException') ||
            error.message.includes('ResourceNotFoundException')
        );
        
        if (isRetryableError && retryCount < MAX_RETRIES) {
            console.log(`发生可重试的错误，将在${RETRY_DELAY}毫秒后重试(${retryCount + 1}/${MAX_RETRIES})`);
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