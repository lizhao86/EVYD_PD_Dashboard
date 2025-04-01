/**
 * EVYD产品经理AI工作台
 * 用户认证模块
 */

// 引用不再需要import

// 认证模块
const Auth = {
    /**
     * 检查用户是否已登录
     * @returns {Object|null} 当前用户信息或null
     */
    checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        // 检查token是否过期
        try {
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            const expiry = tokenData.exp * 1000; // 转换为毫秒
            
            if (Date.now() > expiry) {
                console.log('Token已过期');
                this.logout();
                return null;
            }
            
            // 获取用户信息
            const currentUser = Storage.getUser(tokenData.userId);
            if (!currentUser) {
                console.error('找不到用户信息');
                this.logout();
                return null;
            }
            
            return currentUser;
        } catch (e) {
            console.error('解析token失败', e);
            this.logout();
            return null;
        }
    },
    
    /**
     * 登录
     * @param {string} username 用户名
     * @param {string} password 密码
     * @returns {Object} 登录结果
     */
    login(username, password) {
        // 获取所有用户
        const users = Storage.getAllUsers();
        
        // 查找匹配的用户
        const user = users.find(u => u.username === username);
        if (!user) {
            return { success: false, message: '用户名不存在' };
        }
        
        // 验证密码
        if (user.password !== password) {
            return { success: false, message: '密码不正确' };
        }
        
        // 生成token
        const now = Date.now();
        const expiryMs = now + (3 * 24 * 60 * 60 * 1000); // 3天过期
        const tokenPayload = {
            userId: user.id,
            username: user.username,
            role: user.role,
            iat: Math.floor(now / 1000),
            exp: Math.floor(expiryMs / 1000)
        };
        
        // Base64编码
        const tokenHeader = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
        const tokenBody = btoa(JSON.stringify(tokenPayload));
        const token = `${tokenHeader}.${tokenBody}.nosign`;
        
        // 保存token
        localStorage.setItem('token', token);
        
        return { success: true, message: '登录成功' };
    },
    
    /**
     * 退出登录
     */
    logout() {
        localStorage.removeItem('token');
    },
    
    /**
     * 修改密码
     * @param {string} userId 用户ID
     * @param {string} currentPassword 当前密码
     * @param {string} newPassword 新密码
     * @returns {Object} 修改结果
     */
    changePassword(userId, currentPassword, newPassword) {
        const user = Storage.getUser(userId);
        if (!user) {
            return { success: false, message: '用户不存在' };
        }
        
        if (user.password !== currentPassword) {
            return { success: false, message: '当前密码不正确' };
        }
        
        // 更新密码
        user.password = newPassword;
        Storage.updateUser(user);
        
        return { success: true, message: '密码修改成功' };
    },
    
    /**
     * 检查是否有管理员权限
     * @returns {boolean} 是否为管理员
     */
    isAdmin() {
        const currentUser = this.checkAuth();
        return currentUser && currentUser.role === 'admin';
    }
};

// 不再导出模块 