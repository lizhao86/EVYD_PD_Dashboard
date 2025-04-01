/**
 * EVYD产品经理AI工作台
 * 主应用入口文件
 */

// 引用不再需要import

// 主应用
const App = {
    /**
     * 初始化应用
     */
    init() {
        console.log('初始化主应用...');
        
        // 确保存储服务已初始化
        Storage.init();
        
        // 初始化界面
        this.initUserInterface();
        
        // 绑定事件
        this.bindEvents();
    },
    
    /**
     * 初始化用户界面
     */
    initUserInterface() {
        const currentUser = Auth.checkAuth();
        console.log('当前用户:', currentUser);
        
        if (currentUser) {
            // 用户已登录
            document.getElementById('login-button').style.display = 'none';
            document.getElementById('user-info').style.display = 'flex';
            document.getElementById('username-display').textContent = currentUser.username;
            
            // 管理员特权
            if (currentUser.role === 'admin') {
                document.getElementById('admin-panel-link').style.display = 'block';
            } else {
                document.getElementById('admin-panel-link').style.display = 'none';
            }
        } else {
            // 用户未登录
            document.getElementById('login-button').style.display = 'block';
            document.getElementById('user-info').style.display = 'none';
            document.getElementById('admin-panel-link').style.display = 'none';
        }
    },
    
    /**
     * 绑定事件
     */
    bindEvents() {
        console.log('绑定事件...');
        
        // 登录按钮
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('点击登录按钮');
                // 显示登录模态框
                const loginModal = document.getElementById('login-modal');
                if (loginModal) {
                    loginModal.style.display = 'block';
                } else {
                    console.error('找不到登录模态框');
                }
            });
        } else {
            console.error('找不到登录按钮元素');
        }
        
        // 提交登录
        const submitLoginButton = document.getElementById('submit-login');
        if (submitLoginButton) {
            submitLoginButton.addEventListener('click', function() {
                const username = document.getElementById('login-username').value;
                const password = document.getElementById('login-password').value;
                
                if (!username || !password) {
                    App.showFormMessage('login-message', '请输入用户名和密码', 'error');
                    return;
                }
                
                console.log('尝试登录:', username);
                const result = Auth.login(username, password);
                console.log('登录结果:', result);
                
                if (result.success) {
                    // 登录成功
                    document.getElementById('login-modal').style.display = 'none';
                    App.initUserInterface();
                    
                    // 清空表单
                    document.getElementById('login-username').value = '';
                    document.getElementById('login-password').value = '';
                    document.getElementById('login-message').className = 'form-message';
                } else {
                    // 登录失败
                    App.showFormMessage('login-message', result.message, 'error');
                }
            });
        }
        
        // 登出按钮
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', function(e) {
                e.preventDefault();
                Auth.logout();
                window.location.reload();
            });
        }
        
        // 账号设置
        const profileSettingsBtn = document.getElementById('profile-settings');
        if (profileSettingsBtn) {
            profileSettingsBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('点击账号设置');
                const modal = document.getElementById('user-settings-modal');
                if (modal) {
                    modal.style.display = 'block';
                    App.loadUserProfile();
                } else {
                    console.error('找不到账号设置模态框');
                }
            });
        }
        
        // 查看API密钥
        const viewApiKeysBtn = document.getElementById('view-api-keys');
        if (viewApiKeysBtn) {
            viewApiKeysBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('点击查看API密钥');
                const modal = document.getElementById('api-keys-modal');
                if (modal) {
                    modal.style.display = 'block';
                    App.loadUserApiKeys();
                } else {
                    console.error('找不到API密钥模态框');
                }
            });
        }
        
        // 管理面板
        const adminPanelBtn = document.getElementById('admin-panel-button');
        if (adminPanelBtn) {
            adminPanelBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('点击管理面板');
                const modal = document.getElementById('admin-panel-modal');
                if (modal) {
                    modal.style.display = 'block';
                    // 初始化管理面板内容
                    App.initAdminPanel();
                } else {
                    console.error('找不到管理面板模态框');
                }
            });
        }
        
        // 添加用户按钮
        const addUserBtn = document.getElementById('add-user-button');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', function() {
                console.log('点击添加用户');
                const modal = document.getElementById('edit-user-modal');
                if (modal) {
                    // 重置表单
                    document.getElementById('edit-user-title').textContent = '添加用户';
                    document.getElementById('edit-username').value = '';
                    document.getElementById('edit-password').value = '';
                    document.getElementById('edit-role').value = 'user';
                    document.getElementById('edit-user-message').textContent = '';
                    document.getElementById('edit-user-message').className = 'form-message';
                    
                    // 显示模态框
                    modal.style.display = 'block';
                }
            });
        }
        
        // 保存用户
        const saveUserBtn = document.getElementById('save-edit-user');
        if (saveUserBtn) {
            saveUserBtn.addEventListener('click', function() {
                const username = document.getElementById('edit-username').value;
                const password = document.getElementById('edit-password').value;
                const role = document.getElementById('edit-role').value;
                
                if (!username) {
                    App.showFormMessage('edit-user-message', '请输入用户名', 'error');
                    return;
                }
                
                // 添加用户
                const userData = { 
                    username: username,
                    password: password || 'password123',
                    role: role
                };
                
                const result = App.addUser(userData);
                
                if (result.success) {
                    App.showFormMessage('edit-user-message', '用户添加成功', 'success');
                    setTimeout(() => {
                        document.getElementById('edit-user-modal').style.display = 'none';
                        App.loadUsersList(); // 重新加载用户列表
                    }, 1500);
                } else {
                    App.showFormMessage('edit-user-message', result.message, 'error');
                }
            });
        }
        
        // 取消添加/编辑用户
        const cancelEditUserBtn = document.getElementById('cancel-edit-user');
        if (cancelEditUserBtn) {
            cancelEditUserBtn.addEventListener('click', function() {
                document.getElementById('edit-user-modal').style.display = 'none';
            });
        }
        
        // 保存API密钥
        const saveApiKeysBtn = document.getElementById('save-api-keys-button');
        if (saveApiKeysBtn) {
            saveApiKeysBtn.addEventListener('click', function() {
                const selectedUserId = document.getElementById('api-keys-user-select').value;
                const userStoryKey = document.getElementById('admin-userStory-api-key').value;
                const userManualKey = document.getElementById('admin-userManual-api-key').value;
                const requirementsAnalysisKey = document.getElementById('admin-requirementsAnalysis-api-key').value;
                
                if (!selectedUserId) {
                    App.showFormMessage('admin-api-keys-message', '请选择用户', 'error');
                    return;
                }
                
                const result = App.updateUserApiKeys(selectedUserId, {
                    userStory: userStoryKey,
                    userManual: userManualKey,
                    requirementsAnalysis: requirementsAnalysisKey
                });
                
                if (result.success) {
                    App.showFormMessage('admin-api-keys-message', 'API密钥更新成功', 'success');
                } else {
                    App.showFormMessage('admin-api-keys-message', result.message, 'error');
                }
            });
        }
        
        // 保存API地址
        const saveApiEndpointsBtn = document.getElementById('save-api-endpoints-button');
        if (saveApiEndpointsBtn) {
            saveApiEndpointsBtn.addEventListener('click', function() {
                const userStoryEndpoint = document.getElementById('userStory-api-endpoint').value;
                const userManualEndpoint = document.getElementById('userManual-api-endpoint').value;
                const requirementsAnalysisEndpoint = document.getElementById('requirementsAnalysis-api-endpoint').value;
                
                const result = App.updateApiEndpoints({
                    userStory: userStoryEndpoint,
                    userManual: userManualEndpoint,
                    requirementsAnalysis: requirementsAnalysisEndpoint
                });
                
                if (result.success) {
                    App.showFormMessage('api-endpoints-message', 'API地址更新成功', 'success');
                } else {
                    App.showFormMessage('api-endpoints-message', result.message, 'error');
                }
            });
        }
        
        // 模态框关闭按钮
        const closeButtons = document.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const modal = this.closest('.modal');
                modal.style.display = 'none';
            });
        });
        
        // 点击模态框背景关闭
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', function(event) {
                if (event.target === this) {
                    this.style.display = 'none';
                }
            });
        });
    },
    
    /**
     * 加载用户资料
     */
    loadUserProfile() {
        const currentUser = Auth.checkAuth();
        if (!currentUser) return;
        
        document.getElementById('profile-username').value = currentUser.username;
        document.getElementById('profile-role').value = currentUser.role === 'admin' ? '管理员' : '普通用户';
        
        // 格式化日期
        const createdDate = new Date(currentUser.created);
        const formattedDate = createdDate.toLocaleDateString('zh-CN', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        document.getElementById('profile-created').value = formattedDate;
    },
    
    /**
     * 加载用户API密钥
     */
    loadUserApiKeys() {
        const currentUser = Auth.checkAuth();
        if (!currentUser) return;
        
        document.getElementById('userStory-api-key').value = currentUser.apiKeys.userStory || '';
        document.getElementById('userManual-api-key').value = currentUser.apiKeys.userManual || '';
        document.getElementById('requirementsAnalysis-api-key').value = currentUser.apiKeys.requirementsAnalysis || '';
    },
    
    /**
     * 显示表单消息
     * @param {string} elementId 消息元素ID
     * @param {string} message 消息内容
     * @param {string} type 消息类型 (error/success/warning/info)
     */
    showFormMessage(elementId, message, type) {
        const messageElement = document.getElementById(elementId);
        if (!messageElement) {
            console.error(`找不到消息元素: ${elementId}`);
            return;
        }
        
        messageElement.textContent = message;
        messageElement.className = 'form-message ' + type;
    },
    
    /**
     * 初始化管理面板
     */
    initAdminPanel() {
        console.log('初始化管理面板...');
        
        // 获取所有管理面板tab
        const adminTabs = document.querySelectorAll('.admin-tab');
        const adminContents = document.querySelectorAll('.admin-content');
        
        // 先隐藏所有内容
        adminContents.forEach(content => {
            content.style.display = 'none';
        });
        
        // 显示默认tab (用户管理)
        const usersContent = document.getElementById('users-management');
        if (usersContent) {
            usersContent.style.display = 'block';
        }
        
        // 设置默认active tab
        adminTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-admin-tab') === 'users') {
                tab.classList.add('active');
            }
        });
        
        // 加载用户列表
        this.loadUsersList();
        
        // 为所有tab添加点击事件
        adminTabs.forEach(tab => {
            // 移除旧的事件监听器
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            // 添加新的事件监听器
            newTab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-admin-tab');
                console.log('点击管理面板Tab:', tabId);
                
                // 更新active tab
                adminTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // 隐藏所有内容
                adminContents.forEach(content => {
                    content.style.display = 'none';
                });
                
                // 显示对应内容
                let contentId = '';
                if (tabId === 'users') {
                    contentId = 'users-management';
                    App.loadUsersList();
                } else if (tabId === 'api-keys') {
                    contentId = 'api-keys-management';
                    App.loadApiKeysConfig();
                } else if (tabId === 'api-endpoints') {
                    contentId = 'api-endpoints-management';
                    App.loadApiEndpointsConfig();
                }
                
                const contentElement = document.getElementById(contentId);
                if (contentElement) {
                    contentElement.style.display = 'block';
                    console.log('显示内容区域:', contentId);
                } else {
                    console.error('找不到内容区域:', contentId);
                    alert('找不到内容区域: ' + contentId);
                }
            });
        });
    },
    
    /**
     * 加载用户列表
     */
    loadUsersList() {
        // 获取所有用户
        const users = Storage.getAllUsers();
        
        // 获取表格体
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody) {
            console.error('找不到用户表格体');
            return;
        }
        
        // 清空表格
        tableBody.innerHTML = '';
        
        // 填充用户数据
        users.forEach(user => {
            const row = document.createElement('tr');
            
            // ID单元格
            const idCell = document.createElement('td');
            idCell.textContent = user.id;
            row.appendChild(idCell);
            
            // 用户名单元格
            const usernameCell = document.createElement('td');
            usernameCell.textContent = user.username;
            row.appendChild(usernameCell);
            
            // 角色单元格
            const roleCell = document.createElement('td');
            roleCell.textContent = user.role === 'admin' ? '管理员' : '普通用户';
            row.appendChild(roleCell);
            
            // 创建日期单元格
            const createdDate = new Date(user.created);
            const createdCell = document.createElement('td');
            createdCell.textContent = createdDate.toLocaleDateString('zh-CN');
            row.appendChild(createdCell);
            
            // 操作单元格
            const actionCell = document.createElement('td');
            
            // 编辑按钮
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-icon edit-user';
            editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
            editBtn.title = '编辑用户';
            editBtn.dataset.userId = user.id;
            
            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-icon delete-user';
            deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
            deleteBtn.title = '删除用户';
            deleteBtn.dataset.userId = user.id;
            
            actionCell.appendChild(editBtn);
            actionCell.appendChild(deleteBtn);
            row.appendChild(actionCell);
            
            tableBody.appendChild(row);
        });
        
        // 绑定编辑和删除按钮事件
        this.bindUserActions();
    },
    
    /**
     * 绑定用户操作按钮事件
     */
    bindUserActions() {
        // 编辑用户按钮
        const editButtons = document.querySelectorAll('.edit-user');
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.dataset.userId;
                const user = Storage.getUser(userId);
                
                if (user) {
                    // 填充表单
                    document.getElementById('edit-user-title').textContent = '编辑用户';
                    document.getElementById('edit-username').value = user.username;
                    document.getElementById('edit-password').value = '';
                    document.getElementById('password-help').textContent = '留空则保持原密码不变';
                    document.getElementById('edit-role').value = user.role;
                    
                    // 添加用户ID到表单中
                    const form = document.getElementById('edit-user-modal');
                    form.dataset.userId = userId;
                    
                    // 显示模态框
                    document.getElementById('edit-user-modal').style.display = 'block';
                }
            });
        });
        
        // 删除用户按钮
        const deleteButtons = document.querySelectorAll('.delete-user');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.dataset.userId;
                
                if (confirm('确定要删除此用户吗？此操作不可撤销。')) {
                    const result = App.deleteUser(userId);
                    
                    if (result.success) {
                        alert('用户删除成功');
                        App.loadUsersList(); // 重新加载用户列表
                    } else {
                        alert('删除失败: ' + result.message);
                    }
                }
            });
        });
    },
    
    /**
     * 加载API密钥配置
     */
    loadApiKeysConfig() {
        // 获取所有用户
        const users = Storage.getAllUsers();
        
        // 获取用户选择下拉框
        const userSelect = document.getElementById('api-keys-user-select');
        if (!userSelect) {
            console.error('找不到用户选择下拉框');
            return;
        }
        
        // 清空选择框
        userSelect.innerHTML = '';
        
        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '请选择用户';
        userSelect.appendChild(defaultOption);
        
        // 填充用户选项
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.username + (user.role === 'admin' ? ' (管理员)' : '');
            userSelect.appendChild(option);
        });
        
        // 添加选择用户事件
        userSelect.addEventListener('change', function() {
            const userId = this.value;
            
            if (userId) {
                const user = Storage.getUser(userId);
                
                if (user) {
                    document.getElementById('admin-userStory-api-key').value = user.apiKeys.userStory || '';
                    document.getElementById('admin-userManual-api-key').value = user.apiKeys.userManual || '';
                    document.getElementById('admin-requirementsAnalysis-api-key').value = user.apiKeys.requirementsAnalysis || '';
                }
            } else {
                // 清空输入框
                document.getElementById('admin-userStory-api-key').value = '';
                document.getElementById('admin-userManual-api-key').value = '';
                document.getElementById('admin-requirementsAnalysis-api-key').value = '';
            }
        });
    },
    
    /**
     * 加载API地址配置
     */
    loadApiEndpointsConfig() {
        console.log('加载API地址配置...');
        
        // 检查管理面板内容区域的状态
        const apiEndpointsDiv = document.getElementById('api-endpoints-management');
        if (apiEndpointsDiv) {
            console.log('API地址配置区域元素存在，当前显示状态:', apiEndpointsDiv.style.display);
            console.log('元素内容长度:', apiEndpointsDiv.innerHTML.length);
        } else {
            console.error('API地址配置区域元素不存在!');
            return;
        }
        
        // 获取全局配置
        const config = Config.getGlobalConfig();
        console.log('获取到全局配置:', JSON.stringify(config));
        
        // 检查配置对象是否存在
        if (!config) {
            console.error('全局配置不存在');
            config = {};
        }
        
        // 确保apiEndpoints存在
        if (!config.apiEndpoints) {
            console.log('API地址配置不存在，创建空对象');
            config.apiEndpoints = {};
        }
        
        // 只为缺失的配置项设置默认值
        let hasChanges = false;
        
        if (!config.apiEndpoints.userStory) {
            config.apiEndpoints.userStory = 'https://api.dify.ai/v1';
            hasChanges = true;
        }
        
        if (!config.apiEndpoints.userManual) {
            config.apiEndpoints.userManual = 'https://api.dify.ai/v2';
            hasChanges = true;
        }
        
        if (!config.apiEndpoints.requirementsAnalysis) {
            config.apiEndpoints.requirementsAnalysis = 'https://api.dify.ai/v3';
            hasChanges = true;
        }
        
        // 如果有任何默认值被设置，保存配置
        if (hasChanges) {
            Config.saveGlobalConfig(config);
            console.log('已更新部分缺失的配置:', JSON.stringify(config.apiEndpoints));
        }
        
        // 设置API地址输入字段
        const userStoryInput = document.getElementById('userStory-api-endpoint');
        const userManualInput = document.getElementById('userManual-api-endpoint');
        const requirementsAnalysisInput = document.getElementById('requirementsAnalysis-api-endpoint');
        
        console.log('输入字段存在状态:', {
            userStoryInput: !!userStoryInput,
            userManualInput: !!userManualInput,
            requirementsAnalysisInput: !!requirementsAnalysisInput
        });
        
        if (!userStoryInput || !userManualInput || !requirementsAnalysisInput) {
            console.error('找不到API地址输入字段，尝试查找可能的输入字段...');
            
            // 尝试查找页面中所有input元素
            const inputs = document.querySelectorAll('input');
            console.log('页面中的input元素数量:', inputs.length);
            inputs.forEach(input => {
                console.log('Input ID:', input.id, 'Type:', input.type);
            });
            
            return;
        }
        
        // 设置输入字段的值
        userStoryInput.value = config.apiEndpoints.userStory;
        userManualInput.value = config.apiEndpoints.userManual;
        requirementsAnalysisInput.value = config.apiEndpoints.requirementsAnalysis;
        
        console.log('API地址配置已加载:', {
            userStory: userStoryInput.value,
            userManual: userManualInput.value,
            requirementsAnalysis: requirementsAnalysisInput.value
        });
    },
    
    /**
     * 添加用户
     * @param {Object} userData 用户数据
     * @returns {Object} 操作结果
     */
    addUser(userData) {
        // 检查当前用户是否为管理员
        const currentUser = Auth.checkAuth();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, message: '只有管理员可以添加用户' };
        }
        
        // 准备要添加的用户数据
        const newUser = {
            id: 'user-' + Date.now(), // 生成唯一ID
            username: userData.username,
            password: userData.password,
            role: userData.role,
            created: new Date().toISOString(),
            apiKeys: {
                userStory: '',
                userManual: '',
                requirementsAnalysis: ''
            }
        };
        
        // 添加用户
        const success = Storage.addUser(newUser);
        
        return success ? 
            { success: true, message: '用户添加成功' } : 
            { success: false, message: '用户名已存在或添加失败' };
    },
    
    /**
     * 删除用户
     * @param {string} userId 用户ID
     * @returns {Object} 操作结果
     */
    deleteUser(userId) {
        // 检查当前用户是否为管理员
        const currentUser = Auth.checkAuth();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, message: '只有管理员可以删除用户' };
        }
        
        // 不能删除自己
        if (userId === currentUser.id) {
            return { success: false, message: '不能删除当前登录的用户' };
        }
        
        // 删除用户
        const success = Storage.deleteUser(userId);
        
        return success ? 
            { success: true, message: '用户删除成功' } : 
            { success: false, message: '用户不存在或删除失败' };
    },
    
    /**
     * 更新用户API密钥
     * @param {string} userId 用户ID
     * @param {Object} apiKeys API密钥对象
     * @returns {Object} 操作结果
     */
    updateUserApiKeys(userId, apiKeys) {
        // 检查当前用户是否为管理员
        const currentUser = Auth.checkAuth();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, message: '只有管理员可以更新API密钥' };
        }
        
        // 获取用户
        const user = Storage.getUser(userId);
        if (!user) {
            return { success: false, message: '用户不存在' };
        }
        
        // 更新API密钥
        user.apiKeys = {
            ...user.apiKeys,
            ...apiKeys
        };
        
        // 保存用户
        const success = Storage.updateUser(user);
        
        return success ? 
            { success: true, message: 'API密钥更新成功' } : 
            { success: false, message: '更新失败' };
    },
    
    /**
     * 更新API地址配置
     * @param {Object} endpoints API地址对象
     * @returns {Object} 操作结果
     */
    updateApiEndpoints(endpoints) {
        // 检查当前用户是否为管理员
        const currentUser = Auth.checkAuth();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, message: '只有管理员可以更新API地址' };
        }
        
        // 获取当前配置
        const config = Config.getGlobalConfig();
        
        // 更新API地址
        config.apiEndpoints = {
            ...config.apiEndpoints,
            ...endpoints
        };
        
        try {
            // 保存到localStorage
            Config.saveGlobalConfig(config);
            
            return { success: true, message: 'API地址更新成功' };
        } catch (error) {
            console.error('保存API地址失败:', error);
            return { success: false, message: '保存API地址失败: ' + error.message };
        }
    }
};

// 在DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    App.init();
}); 