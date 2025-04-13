/**
 * AWS Amplify V5 配置工具
 * 提供统一的配置初始化函数，确保 OAuth 设置正确
 */

import { Amplify, Auth } from 'aws-amplify';
import awsconfig from '../src/aws-exports.js';

/**
 * 初始化 Amplify 配置
 * 确保正确设置 V5 OAuth
 */
export function configureAmplify() {
    console.log("[AmplifyConfig] 初始化 Amplify V5 配置");
    
    try {
        // 创建配置的副本，以便我们可以修改它
        const config = { ...awsconfig };
        
        // 确保 V5 格式的 oauth 配置正确设置
        if (!config.oauth || !config.oauth.domain) {
            console.log("[AmplifyConfig] 从 V6 格式导入 OAuth 配置");
            
            // 如果根级别没有 OAuth 配置，但有 V6 格式的配置，复制它
            if (config.Auth && config.Auth.Cognito && 
                config.Auth.Cognito.loginWith && 
                config.Auth.Cognito.loginWith.oauth) {
                
                const v6OAuth = config.Auth.Cognito.loginWith.oauth;
                
                // 设置 V5 格式的 OAuth 配置
                config.oauth = {
                    domain: v6OAuth.domain,
                    scope: v6OAuth.scopes || ['openid', 'profile', 'email'],
                    redirectSignIn: Array.isArray(v6OAuth.redirectSignIn) 
                        ? v6OAuth.redirectSignIn[0] 
                        : v6OAuth.redirectSignIn,
                    redirectSignOut: Array.isArray(v6OAuth.redirectSignOut)
                        ? v6OAuth.redirectSignOut[0]
                        : v6OAuth.redirectSignOut,
                    responseType: v6OAuth.responseType || 'code'
                };
                
                console.log("[AmplifyConfig] V5 OAuth 配置已设置", config.oauth);
            }
        }
        
        // 配置 Amplify
        Amplify.configure(config);
        console.log("[AmplifyConfig] Amplify V5 配置完成");
        
        return true;
    } catch (error) {
        console.error("[AmplifyConfig] 配置 Amplify 时出错:", error);
        return false;
    }
}

// 默认导出配置函数，方便导入
export default { configureAmplify }; 