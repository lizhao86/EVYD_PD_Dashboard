/**
 * AWS Amplify V5 配置工具
 * 提供统一的配置初始化函数，确保 OAuth 正确配置
 */

import { Amplify } from 'aws-amplify';
import awsconfig from '/src/aws-exports.js';

/**
 * 初始化 Amplify 配置
 * 根据环境变量覆盖重定向URL，确保多环境支持
 */
export function configureAmplify() {
    try {
        // 创建配置的副本
        const config = { ...awsconfig };
        
        // 从环境变量获取重定向URL
        const redirectSignIn = import.meta.env.VITE_COGNITO_REDIRECT_SIGNIN;
        const redirectSignOut = import.meta.env.VITE_COGNITO_REDIRECT_SIGNOUT;
        
        // 确保V5 oauth配置存在
        if (!config.oauth || !config.oauth.domain) {
            // 如果没有根级别oauth，但有V6格式配置，进行转换
            if (config.Auth?.Cognito?.loginWith?.oauth) {
                const v6OAuth = config.Auth.Cognito.loginWith.oauth;
                
                config.oauth = {
                    domain: v6OAuth.domain,
                    scope: v6OAuth.scopes || ['openid', 'profile', 'email'],
                    redirectSignIn: Array.isArray(v6OAuth.redirectSignIn) ? v6OAuth.redirectSignIn[0] : v6OAuth.redirectSignIn,
                    redirectSignOut: Array.isArray(v6OAuth.redirectSignOut) ? v6OAuth.redirectSignOut[0] : v6OAuth.redirectSignOut,
                    responseType: v6OAuth.responseType || 'code'
                };
            }
        }
        
        // 使用环境变量覆盖重定向URL
        if (redirectSignIn && config.oauth) {
            config.oauth.redirectSignIn = redirectSignIn;
            // 同时更新V6格式(如果存在)
            if (config.Auth?.Cognito?.loginWith?.oauth) {
                config.Auth.Cognito.loginWith.oauth.redirectSignIn = [redirectSignIn];
            }
        }
        
        if (redirectSignOut && config.oauth) {
            config.oauth.redirectSignOut = redirectSignOut;
            // 同时更新V6格式(如果存在)
            if (config.Auth?.Cognito?.loginWith?.oauth) {
                config.Auth.Cognito.loginWith.oauth.redirectSignOut = [redirectSignOut];
            }
        }
        
        // 配置Amplify
        Amplify.configure(config);
        
        return true;
    } catch (error) {
        console.error("[AmplifyConfig] 配置错误:", error);
        return false;
    }
}

export default { configureAmplify }; 