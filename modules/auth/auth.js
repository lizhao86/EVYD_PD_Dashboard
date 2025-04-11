/**
 * EVYD产品经理AI工作台
 * 用户认证模块 (Powered by AWS Amplify)
 */

import {
    signIn,
    signOut,
    fetchAuthSession,
    getCurrentUser,
    updatePassword
} from 'aws-amplify/auth';

// Assuming storage.js is correctly located relative to this file
// Adjust path if necessary: e.g., '../../scripts/services/storage.js'
// Use absolute path for Vite compatibility
import { getCurrentUserSettings } from '/scripts/services/storage.js';

/**
 * 检查用户是否通过 Amplify 登录，并获取其 Cognito 组信息。
 * @returns {Promise<{user: object, groups: string[]}|null>} 
 *          包含 Amplify 用户对象和组列表的对象，或 null。
 */
export async function checkAuth() {
    try {
        // 1. Check authentication status
        const currentUser = await getCurrentUser(); // Throws if not authenticated
        console.log("Amplify user authenticated (via getCurrentUser):", currentUser);

        // 2. Fetch session tokens to get group information
        // We force refresh to ensure we have the latest token claims
        const session = await fetchAuthSession({ forceRefresh: true }); 
        const groups = session.tokens?.accessToken?.payload["cognito:groups"] || [];
        console.log("User Cognito Groups:", groups);

        return { user: currentUser, groups: groups }; 

    } catch (error) {
        // Catches error if user is not authenticated
        console.log("Amplify session not valid or user not logged in (checkAuth). Error:", error);
        return null;
    }
}

/**
 * 使用 Amplify Cognito 进行登录.
 * @param {string} username 用户名.
 * @param {string} password 密码.
 * @returns {Promise<{success: boolean, message?: string, user?: any}>}
 */
export async function login(username, password) {
    console.log("Inside login function, about to call signIn...");
    try {
        const { isSignedIn, nextStep } = await signIn({ username, password });

        if (isSignedIn) {
            console.log("Amplify sign in successful");
            const user = await getCurrentUser();
            return { success: true, user: user };
        } else {
            // Handle MFA or other steps if configured
            console.log('Amplify sign in requires next step:', nextStep);
            // Check for forced new password
            if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
                return { 
                    success: false, // Not fully signed in yet
                    nextStep: nextStep.signInStep, // Indicate the required step
                    message: '需要设置新密码才能完成登录。' 
                };
            }
            // Handle other potential next steps (MFA, etc.) if needed
            return { 
                 success: false, 
                 nextStep: nextStep.signInStep, 
                 message: `登录需要额外步骤: ${nextStep.signInStep}` 
            };
        }

    } catch (error) {
        console.error('Amplify sign in error:', error);
        // Provide user-friendly messages based on error type
        let message = '登录失败，请检查您的凭据。';
        if (error.name === 'UserNotFoundException') {
            message = '用户名不存在。';
        } else if (error.name === 'NotAuthorizedException') {
            message = '用户名或密码不正确。';
        } else if (error.name === 'UserNotConfirmedException') {
            message = '用户尚未验证，请检查您的邮箱或短信。你需要先完成注册确认流程。'; // You might need a resend confirmation code flow
        }
        // Add more specific error handling as needed
        return { success: false, message: message };
    }
}

/**
 * 使用 Amplify Cognito 退出登录.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function logout() {
    try {
        await signOut();
        console.log("Amplify sign out successful");
        return { success: true };
    } catch (error) {
        console.error('Amplify sign out error:', error);
        return { success: false, message: '退出登录失败。' };
    }
}

/**
 * 使用 Amplify Cognito 修改当前登录用户的密码.
 * @param {string} currentPassword 当前密码.
 * @param {string} newPassword 新密码.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function changePassword(currentPassword, newPassword) {
    try {
        await updatePassword({ oldPassword: currentPassword, newPassword });
        console.log("Amplify password update successful");
        return { success: true, message: '密码修改成功。' };
    } catch (error) {
        console.error('Amplify password update error:', error);
         let message = '密码修改失败。请稍后再试。';
         if (error.name === 'NotAuthorizedException') {
            message = '当前密码不正确。';
         } else if (error.message?.includes('Password does not conform to policy')){
             message = '新密码不符合要求 (例如，长度、字符类型等)。';
         }
        // Add more specific error handling as needed
        return { success: false, message: message };
    }
}

/**
 * 检查当前登录用户是否具有管理员角色.
 * (需要先登录，并已获取/存储 UserSettings).
 * @returns {Promise<boolean>}
 */
export async function isAdmin() {
    try {
        // 1. Check if user is logged in
        const user = await getCurrentUser(); // Throws if not logged in

        // 2. Fetch user settings from DynamoDB via GraphQL
        const settings = await getCurrentUserSettings(); // Uses the function from storage.js

        if (settings && settings.role === 'admin') {
             console.log("User is admin.");
            return true;
        } else {
            console.log("User is not admin or settings not found/loaded.", settings);
            return false;
        }
    } catch (error) {
        // Catches error if user is not logged in or error fetching settings
         if (error.name === 'UserUnAuthenticatedException' || error.message === 'User is not authenticated') {
           console.log("User not logged in, cannot check admin status.");
        } else{
            console.error('Error checking admin status:', error);
        }
        return false;
    }
}

// Removed the old Auth object 