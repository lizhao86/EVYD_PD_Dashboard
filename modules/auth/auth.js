/**
 * EVYD产品经理AI工作台
 * 用户认证模块 (Powered by AWS Amplify)
 */

import { Auth } from 'aws-amplify';

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
        const currentUser = await Auth.currentAuthenticatedUser();
        const session = await Auth.currentSession(); 
        const groups = session.getAccessToken().payload["cognito:groups"] || [];
        return { user: currentUser, groups: groups }; 
    } catch (error) {
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
    try {
        const user = await Auth.signIn(username, password);
        
        // 检查是否需要额外步骤（如需要设置新密码）
        if (user.challengeName) {
            if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
                return { 
                    success: false, 
                    nextStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED', 
                    message: '需要设置新密码才能完成登录。' 
                };
            }
            return { 
                success: false, 
                nextStep: user.challengeName, 
                message: `登录需要额外步骤: ${user.challengeName}` 
            };
        }
        
        // 登录成功
        return { success: true, user: user };
    } catch (error) {
        console.error('Amplify sign in error:', error);
        let message = '登录失败，请检查您的凭据。';
        if (error.code === 'UserNotFoundException') {
            message = '用户名不存在。';
        } else if (error.code === 'NotAuthorizedException') {
            message = '用户名或密码不正确。';
        } else if (error.code === 'UserNotConfirmedException') {
            message = '用户尚未验证，请检查您的邮箱或短信。你需要先完成注册确认流程。';
        }
        return { success: false, message: message };
    }
}

/**
 * 使用 Amplify Cognito 退出登录.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function logout() {
    try {
        await Auth.signOut({ global: true });
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
        // 先获取当前用户
        const user = await Auth.currentAuthenticatedUser();
        await Auth.changePassword(user, currentPassword, newPassword);
        return { success: true, message: '密码修改成功。' };
    } catch (error) {
        console.error('Amplify password update error:', error);
        let message = '密码修改失败。请稍后再试。';
        if (error.code === 'NotAuthorizedException') {
            message = '当前密码不正确。';
        } else if (error.message?.includes('Password does not conform to policy')){
            message = '新密码不符合要求 (例如，长度、字符类型等)。';
        }
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
        const authInfo = await checkAuth();
        if (!authInfo || !authInfo.user) return false;

        const settings = await getCurrentUserSettings();
        if (settings && settings.role === 'admin') {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// 添加V5兼容的函数，实现V6风格API
// 这些函数帮助平滑过渡，让依赖V6 API的代码继续工作
export async function getCurrentUser() {
    return Auth.currentAuthenticatedUser();
}

export async function fetchAuthSession(options) {
    const session = await Auth.currentSession();
    return {
        tokens: {
            accessToken: {
                payload: session.getAccessToken().payload
            }
        }
    };
}

export async function signIn(params) {
    const { username, password } = params;
    const user = await Auth.signIn(username, password);
    const isSignedIn = !user.challengeName;
    
    return {
        isSignedIn,
        nextStep: user.challengeName ? { signInStep: user.challengeName } : undefined
    };
}

export async function signOut(options) {
    return Auth.signOut(options);
}

export async function updatePassword(params) {
    const { oldPassword, newPassword } = params;
    const user = await Auth.currentAuthenticatedUser();
    return Auth.changePassword(user, oldPassword, newPassword);
} 