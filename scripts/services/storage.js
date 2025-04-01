/**
 * EVYD产品经理AI工作台
 * 存储服务模块
 */

// 存储服务
const Storage = {
    /**
     * 初始化存储
     */
    init() {
        console.log('初始化存储服务...');
        
        // 检查是否已有用户数据
        const users = this.getAllUsers();
        console.log('现有用户数:', users.length);
        
        if (users.length === 0) {
            // 创建默认管理员
            const adminUser = {
                id: 'admin-' + Date.now(),
                username: 'admin',
                password: 'admin',
                role: 'admin',
                created: new Date().toISOString(),
                apiKeys: {
                    userStory: '',
                    userManual: '',
                    requirementsAnalysis: ''
                }
            };
            
            this.saveUsers([adminUser]);
            console.log('已创建默认管理员账户');
        }
        
        // 初始化全局配置
        let config = this.getGlobalConfig();
        
        // 检查配置中是否有apiEndpoints，并确保每个字段都存在
        if (!config.apiEndpoints) {
            config.apiEndpoints = {};
        }
        
        // 设置默认API地址
        const defaultEndpoint = 'https://api.dify.ai/v1';
        
        // 只为不存在的配置项设置默认值
        let hasChanges = false;
        if (!config.apiEndpoints.userStory) {
            config.apiEndpoints.userStory = defaultEndpoint;
            hasChanges = true;
        }
        
        if (!config.apiEndpoints.userManual) {
            config.apiEndpoints.userManual = defaultEndpoint;
            hasChanges = true;
        }
        
        if (!config.apiEndpoints.requirementsAnalysis) {
            config.apiEndpoints.requirementsAnalysis = defaultEndpoint;
            hasChanges = true;
        }
        
        // 只有在有变更时才保存配置
        if (hasChanges) {
            this.saveGlobalConfig(config);
            console.log('已初始化缺失的API配置项:', config.apiEndpoints);
        } else {
            console.log('使用现有API配置:', config.apiEndpoints);
        }
    },
    
    /**
     * 获取所有用户
     * @returns {Array} 用户列表
     */
    getAllUsers() {
        const usersJson = localStorage.getItem('users');
        if (!usersJson) return [];
        try {
            return JSON.parse(usersJson);
        } catch (e) {
            console.error('解析用户数据失败', e);
            return [];
        }
    },
    
    /**
     * 保存用户列表
     * @param {Array} users 用户列表
     */
    saveUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
    },
    
    /**
     * 获取用户
     * @param {string} userId 用户ID
     * @returns {Object|null} 用户信息
     */
    getUser(userId) {
        const users = this.getAllUsers();
        return users.find(u => u.id === userId) || null;
    },
    
    /**
     * 添加用户
     * @param {Object} user 用户信息
     * @returns {boolean} 是否成功
     */
    addUser(user) {
        const users = this.getAllUsers();
        
        // 检查用户名是否已存在
        if (users.some(u => u.username === user.username)) {
            return false;
        }
        
        // 添加用户
        users.push(user);
        this.saveUsers(users);
        return true;
    },
    
    /**
     * 更新用户
     * @param {Object} updatedUser 更新后的用户信息
     * @returns {boolean} 是否成功
     */
    updateUser(updatedUser) {
        const users = this.getAllUsers();
        const index = users.findIndex(u => u.id === updatedUser.id);
        
        if (index === -1) return false;
        
        // 更新用户
        users[index] = updatedUser;
        this.saveUsers(users);
        return true;
    },
    
    /**
     * 删除用户
     * @param {string} userId 用户ID
     * @returns {boolean} 是否成功
     */
    deleteUser(userId) {
        const users = this.getAllUsers();
        const newUsers = users.filter(u => u.id !== userId);
        
        if (newUsers.length === users.length) return false;
        
        this.saveUsers(newUsers);
        return true;
    },
    
    /**
     * 获取全局配置
     * @returns {Object} 全局配置
     */
    getGlobalConfig() {
        const configJson = localStorage.getItem('global_config');
        if (!configJson) {
            // 返回默认配置
            return {
                apiEndpoints: {
                    userStory: '',
                    userManual: '',
                    requirementsAnalysis: ''
                }
            };
        }
        
        try {
            return JSON.parse(configJson);
        } catch (e) {
            console.error('解析全局配置失败', e);
            return {
                apiEndpoints: {
                    userStory: '',
                    userManual: '',
                    requirementsAnalysis: ''
                }
            };
        }
    },
    
    /**
     * 保存全局配置
     * @param {Object} config 全局配置
     */
    saveGlobalConfig(config) {
        localStorage.setItem('global_config', JSON.stringify(config));
    }
};

// 确保在脚本加载时立即初始化存储
Storage.init(); 