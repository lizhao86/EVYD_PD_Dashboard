/**
 * EVYD产品经理AI工作台
 * 主应用入口文件
 */

import { handleLogin, handleLogout, checkUserSession } from './auth.js';
import { setupNavigation } from './navigation.js';
import { loadUIComponents } from '../ui/ui-loader.js';
import { loadSettings } from '../settings/settings-manager.js';
import { setupErrorHandling } from '../utils/error-handler.js';
import { migrateGlobalConfigs } from '../services/storage.js';
import { useEffect } from 'react';

// 主应用
const App = {
    /**
     * 初始化应用
     */
    init() {
        console.log('初始化主应用...');
        
        // 在初始化早期调用迁移函数
        migrateGlobalConfigs();
        
        // 确保存储服务已初始化
        Storage.init();
        
        // 初始化界面
        this.initUserInterface();
        
        // 确保页面已完全加载再绑定事件
        if (document.readyState === 'complete') {
            this.bindEvents();
        } else {
            window.addEventListener('load', () => {
                this.bindEvents();
            });
        }
    },
    
    /**
     * 初始化用户界面
     */
    initUserInterface() {
        const currentUser = Auth.checkAuth();
        console.log('当前用户:', currentUser);
        
        // 获取DOM元素，并检查它们是否存在
        const loginButton = document.getElementById('login-button');
        const userInfo = document.getElementById('user-info');
        const usernameDisplay = document.getElementById('username-display');
        const adminPanelLink = document.getElementById('admin-panel-link');
        
        // 检查必要的DOM元素是否存在
        if (!loginButton || !userInfo || !usernameDisplay) {
            console.error('找不到必要的DOM元素:', {
                loginButton: !!loginButton,
                userInfo: !!userInfo,
                usernameDisplay: !!usernameDisplay
            });
            return; // 如果缺少必要元素，则提前返回
        }
        
        if (currentUser) {
            // 用户已登录
            loginButton.style.display = 'none';
            userInfo.style.display = 'flex';
            usernameDisplay.textContent = currentUser.username;
            
            // 管理员特权
            if (adminPanelLink) {
                if (currentUser.role === 'admin') {
                    adminPanelLink.style.display = 'block';
                } else {
                    adminPanelLink.style.display = 'none';
                }
            }
        } else {
            // 用户未登录
            loginButton.style.display = 'block';
            userInfo.style.display = 'none';
            if (adminPanelLink) {
                adminPanelLink.style.display = 'none';
            }
        }
    },
    
    /**
     * 绑定事件
     */
    bindEvents() {
        console.log('绑定事件...');
        
        // 检查页面是否已经完成加载并且DOM元素存在
        if (!document.getElementById('header-container')) {
            console.warn('头部容器不存在，可能页面尚未完全加载，跳过事件绑定');
            return;
        }
        
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
        
        
        // 保存API密钥按钮
        const saveApiKeysBtn = document.getElementById('save-user-api-keys-button');
        if (saveApiKeysBtn) {
            saveApiKeysBtn.addEventListener('click', function() {
                const selectedUserId = document.getElementById('api-key-config-user-select').value;
                const userStoryKey = document.getElementById('user-specific-userStory-api-key').value;
                const userManualKey = document.getElementById('user-specific-userManual-api-key').value;
                const requirementsAnalysisKey = document.getElementById('user-specific-requirementsAnalysis-api-key').value;
                const uxDesignKey = document.getElementById('user-specific-uxDesign-api-key').value;
                
                if (!selectedUserId) {
                    App.showFormMessage('user-specific-api-keys-message', '请选择用户', 'error');
                    return;
                }
                
                const user = Storage.getUser(selectedUserId);
                if (!user) {
                    App.showFormMessage('user-specific-api-keys-message', '用户不存在', 'error');
                    return;
                }
                
                // 更新API密钥
                user.apiKeys = {
                    userStory: userStoryKey,
                    userManual: userManualKey,
                    requirementsAnalysis: requirementsAnalysisKey,
                    uxDesign: uxDesignKey
                };
                
                const result = App.updateUserApiKeys(selectedUserId, {
                    userStory: userStoryKey,
                    userManual: userManualKey,
                    requirementsAnalysis: requirementsAnalysisKey,
                    uxDesign: uxDesignKey
                });
                
                if (result.success) {
                    App.showFormMessage('user-specific-api-keys-message', 'API密钥更新成功', 'success');
                } else {
                    App.showFormMessage('user-specific-api-keys-message', result.message, 'error');
                }
            });
        }
        
        // 保存API地址
        const saveApiEndpointsBtn = document.getElementById('save-global-api-endpoints-button');
        if (saveApiEndpointsBtn) {
            saveApiEndpointsBtn.addEventListener('click', function() {
                App.loadApiEndpointsConfig();
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

        // 修改密码按钮
        const submitPasswordChangeButton = document.getElementById('submit-password-change');
        if (submitPasswordChangeButton) {
            submitPasswordChangeButton.addEventListener('click', function() {
                const currentPassword = document.getElementById('current-password').value;
                const newPassword = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-password').value;
                
                if (!currentPassword || !newPassword || !confirmPassword) {
                    App.showFormMessage('password-message', '请填写所有密码字段', 'error');
                    return;
                }
                
                if (newPassword !== confirmPassword) {
                    App.showFormMessage('password-message', '新密码与确认密码不匹配', 'error');
                    return;
                }
                
                // 获取当前用户
                const currentUser = Auth.checkAuth();
                if (!currentUser) {
                    App.showFormMessage('password-message', '用户未登录', 'error');
                    return;
                }
                
                // 验证当前密码
                if (currentUser.password !== currentPassword) {
                    App.showFormMessage('password-message', '当前密码不正确', 'error');
                    return;
                }
                
                // 更新密码
                currentUser.password = newPassword;
                const success = Storage.updateUser(currentUser);
                
                if (success) {
                    App.showFormMessage('password-message', '密码修改成功', 'success');
                    // 清空表单
                    document.getElementById('current-password').value = '';
                    document.getElementById('new-password').value = '';
                    document.getElementById('confirm-password').value = '';
                    
                    // 延迟关闭模态框
                    setTimeout(() => {
                        document.getElementById('user-settings-modal').style.display = 'none';
                    }, 1500);
                } else {
                    App.showFormMessage('password-message', '密码修改失败', 'error');
                }
            });
        } else {
            console.error('找不到修改密码按钮');
        }
        
        // 取消修改密码按钮
        const cancelPasswordChangeButton = document.getElementById('cancel-password-change');
        if (cancelPasswordChangeButton) {
            cancelPasswordChangeButton.addEventListener('click', function() {
                // 清空表单
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
                document.getElementById('password-message').className = 'form-message';
                document.getElementById('password-message').textContent = '';
                
                // 关闭模态框
                document.getElementById('user-settings-modal').style.display = 'none';
            });
        } else {
            console.error('找不到取消修改密码按钮');
        }
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
        document.getElementById('uxDesign-api-key').value = currentUser.apiKeys.uxDesign || '';
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
        
        // 先移除所有内容的active类
        adminContents.forEach(content => {
            content.classList.remove('active');
        });
        
        // 显示默认tab (用户管理)
        const usersContent = document.getElementById('users-management');
        if (usersContent) {
            usersContent.classList.add('active');
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
            // 移除旧的事件监听器，通过克隆节点并替换的方式
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            // 添加新的事件监听器
            newTab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-admin-tab');
                console.log('点击管理面板Tab:', tabId);
                
                // 重新获取所有标签元素，确保能正确移除所有active类
                const allTabs = document.querySelectorAll('.admin-tab');
                
                // 更新active tab样式
                allTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // 移除所有内容的active类
                adminContents.forEach(content => {
                    content.classList.remove('active');
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
                    contentElement.classList.add('active');
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
     * 加载API密钥配置
     */
    loadApiKeysConfig() {
        // 获取所有用户
        const users = Storage.getAllUsers();
        // 获取当前登录用户
        const currentUser = Auth.checkAuth();
        
        // 获取用户选择下拉框
        const userSelect = document.getElementById('api-key-config-user-select');
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
            // 如果是当前登录用户，则选中该选项
            if (currentUser && user.id === currentUser.id) {
                option.selected = true;
                // 预填充当前用户的API密钥
                setTimeout(() => {
                    document.getElementById('user-specific-userStory-api-key').value = user.apiKeys.userStory || '';
                    document.getElementById('user-specific-userManual-api-key').value = user.apiKeys.userManual || '';
                    document.getElementById('user-specific-requirementsAnalysis-api-key').value = user.apiKeys.requirementsAnalysis || '';
                    document.getElementById('user-specific-uxDesign-api-key').value = user.apiKeys.uxDesign || '';
                }, 0);
            }
            userSelect.appendChild(option);
        });
        
        // 添加选择用户事件
        userSelect.addEventListener('change', function() {
            const userId = this.value;
            
            if (userId) {
                const user = Storage.getUser(userId);
                
                if (user) {
                    document.getElementById('user-specific-userStory-api-key').value = user.apiKeys.userStory || '';
                    document.getElementById('user-specific-userManual-api-key').value = user.apiKeys.userManual || '';
                    document.getElementById('user-specific-requirementsAnalysis-api-key').value = user.apiKeys.requirementsAnalysis || '';
                    document.getElementById('user-specific-uxDesign-api-key').value = user.apiKeys.uxDesign || '';
                }
            } else {
                // 清空输入框
                document.getElementById('user-specific-userStory-api-key').value = '';
                document.getElementById('user-specific-userManual-api-key').value = '';
                document.getElementById('user-specific-requirementsAnalysis-api-key').value = '';
                document.getElementById('user-specific-uxDesign-api-key').value = '';
            }
        });
    },
    
    /**
     * 加载API地址配置
     */
    async loadApiEndpointsConfig() {
        console.log('加载全局API端点配置...');

        try {
            // Asynchronously fetch the global config map
            const configMap = await getGlobalConfig();
            console.log("获取到的全局配置:", configMap);

            // Define the expected keys for API endpoints
            const endpointKeys = ['userStory', 'userManual', 'requirementsAnalysis', 'uxDesign'];
            let needsDefaults = false;

            // Populate inputs, check if any are missing from the fetched config
            endpointKeys.forEach(key => {
                const inputElement = document.getElementById(`global-${key}-api-endpoint`);
                if (inputElement) {
                    const configEntry = configMap.get(key);
                    if (configEntry && configEntry.value) {
                        inputElement.value = configEntry.value;
                        console.log(`填充 ${key} 输入框: ${configEntry.value}`);
                    } else {
                        console.warn(`未在全局配置中找到 ${key} 的有效配置，将使用默认值。`);
                        inputElement.value = 'https://api.dify.ai/v1';
                        needsDefaults = true;
                    }
                } else {
                    console.warn(`找不到ID为 global-${key}-api-endpoint 的输入元素`);
                }
            });

            if (needsDefaults) {
                console.log("某些API端点使用了默认值填充，用户需手动保存以持久化。")
            }

        } catch (error) {
            console.error('加载或解析全局API端点配置时出错:', error);
            App.showFormMessage('global-api-endpoints-message', '加载API地址配置失败: ' + error.message, 'error');
        }
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