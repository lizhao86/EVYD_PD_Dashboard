/**
 * UX界面设计主入口
 */

// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', async () => {
    // 用户认证初始化
    if (window.AuthService) {
        await window.AuthService.init();
        
        // 检查用户登录状态，更新UI
        const user = await window.AuthService.getCurrentUser();
        if (user) {
            document.getElementById('user-info').style.display = 'flex';
            document.getElementById('username-display').textContent = user.username;
            document.getElementById('login-button').style.display = 'none';
            
            // 显示管理面板链接（如果是管理员）
            if (user.role === 'admin') {
                document.getElementById('admin-panel-link').style.display = 'block';
            }
        } else {
            document.getElementById('user-info').style.display = 'none';
            document.getElementById('login-button').style.display = 'block';
        }
    }
    
    // 初始化UI功能
    if (window.UXDesignUI) {
        window.UXDesignUI.initUI();
    }
    
    // 加载应用信息
    await loadAppInfo();
    
    // 处理模态框相关事件
    setupModals();
    
    // 设置管理面板按钮事件
    setupAdminPanel();
});

/**
 * 加载应用信息
 */
async function loadAppInfo() {
    // 显示加载状态
    document.getElementById('app-info').style.display = 'none';
    document.getElementById('app-form').style.display = 'none';
    document.getElementById('app-info-loading').style.display = 'block';
    document.getElementById('app-info-error').style.display = 'none';
    
    try {
        // 获取应用信息
        const appInfo = await window.UXDesignAPI.getAppInfo();
        
        // 更新应用信息UI
        document.getElementById('app-name').textContent = appInfo.name || 'UX 界面设计助手';
        document.getElementById('app-description').textContent = appInfo.description || '该工具可以根据需求描述和User Story生成Figma界面设计的AI提示词，帮助您快速创建界面原型。请注意，由于Figma AI功能本身较为原始，生成效果不保证可用。';
        
        // 清空标签
        const tagsContainer = document.getElementById('app-tags');
        tagsContainer.innerHTML = '';
        
        // 添加标签
        if (appInfo.tags && appInfo.tags.length > 0) {
            appInfo.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'app-tag';
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });
        }
        
        // 显示应用信息
        document.getElementById('app-info').style.display = 'block';
        document.getElementById('app-form').style.display = 'block';
        document.getElementById('app-info-loading').style.display = 'none';
    } catch (error) {
        console.error('加载应用信息失败:', error);
        
        // 显示错误信息
        document.getElementById('error-message').textContent = error.message || '无法连接到Dify API，请检查API地址和密钥设置。';
        document.getElementById('app-info-loading').style.display = 'none';
        document.getElementById('app-info-error').style.display = 'block';
        
        // 尝试使用默认信息
        document.getElementById('app-info').style.display = 'block';
        document.getElementById('app-form').style.display = 'block';
    }
}

/**
 * 设置模态框事件处理
 */
function setupModals() {
    // 登录按钮点击事件
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            document.getElementById('login-modal').style.display = 'block';
        });
    }
    
    // 登出按钮点击事件
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (window.AuthService) {
                await window.AuthService.logout();
                window.location.reload();
            }
        });
    }
    
    // 账号设置按钮点击事件
    const profileSettingsButton = document.getElementById('profile-settings');
    if (profileSettingsButton) {
        profileSettingsButton.addEventListener('click', async () => {
            // 显示账号设置模态框
            document.getElementById('user-settings-modal').style.display = 'block';
            
            // 加载用户信息
            if (window.AuthService) {
                const user = await window.AuthService.getCurrentUser();
                if (user) {
                    document.getElementById('profile-username').value = user.username;
                    document.getElementById('profile-role').value = user.role;
                    const createdDate = new Date(user.created_at);
                    document.getElementById('profile-created').value = createdDate.toLocaleDateString();
                }
            }
        });
    }
    
    // 查看API密钥按钮点击事件
    const viewApiKeysButton = document.getElementById('view-api-keys');
    if (viewApiKeysButton) {
        viewApiKeysButton.addEventListener('click', async () => {
            document.getElementById('api-keys-modal').style.display = 'block';
            
            // 加载API密钥
            try {
                if (window.StorageService) {
                    const userStoryApiKey = await window.StorageService.getItem('userStoryApiKey') || '';
                    const userManualApiKey = await window.StorageService.getItem('userManualApiKey') || '';
                    const requirementsAnalysisApiKey = await window.StorageService.getItem('requirementsAnalysisApiKey') || '';
                    const uxDesignApiKey = await window.StorageService.getItem('uxDesignApiKey') || '';
                    
                    document.getElementById('userStory-api-key').value = userStoryApiKey;
                    document.getElementById('userManual-api-key').value = userManualApiKey;
                    document.getElementById('requirementsAnalysis-api-key').value = requirementsAnalysisApiKey;
                    document.getElementById('uxDesign-api-key').value = uxDesignApiKey;
                }
            } catch (error) {
                console.error('加载API密钥失败:', error);
            }
        });
    }
    
    // 模态框关闭按钮点击事件
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 获取最近的模态框父元素
            const modal = button.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // 密码可见性切换
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', () => {
            const input = button.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                button.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                `;
            } else {
                input.type = 'password';
                button.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                `;
            }
        });
    });
    
    // 设置选项卡切换
    const settingsTabs = document.querySelectorAll('.settings-tab');
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 激活当前选项卡
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 显示对应内容
            const settingsType = tab.getAttribute('data-settings');
            document.querySelectorAll('.settings-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${settingsType}-settings`).classList.add('active');
        });
    });
    
    // 登录表单提交
    const submitLoginButton = document.getElementById('submit-login');
    if (submitLoginButton) {
        submitLoginButton.addEventListener('click', async () => {
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const messageElement = document.getElementById('login-message');
            
            if (!username || !password) {
                messageElement.textContent = '请输入用户名和密码';
                messageElement.classList.add('error');
                return;
            }
            
            try {
                const result = await window.AuthService.login(username, password);
                if (result.success) {
                    document.getElementById('login-modal').style.display = 'none';
                    window.location.reload();
                } else {
                    messageElement.textContent = result.message || '登录失败，请检查用户名和密码';
                    messageElement.classList.add('error');
                }
            } catch (error) {
                messageElement.textContent = error.message || '登录失败，请重试';
                messageElement.classList.add('error');
            }
        });
    }
    
    // 修改密码表单提交
    const submitPasswordChangeButton = document.getElementById('submit-password-change');
    if (submitPasswordChangeButton) {
        submitPasswordChangeButton.addEventListener('click', async () => {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const messageElement = document.getElementById('password-message');
            
            if (!currentPassword || !newPassword || !confirmPassword) {
                messageElement.textContent = '请填写所有密码字段';
                messageElement.classList.add('error');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                messageElement.textContent = '新密码和确认密码不匹配';
                messageElement.classList.add('error');
                return;
            }
            
            try {
                const result = await window.AuthService.changePassword(currentPassword, newPassword);
                if (result.success) {
                    messageElement.textContent = '密码修改成功';
                    messageElement.classList.remove('error');
                    messageElement.classList.add('success');
                    
                    // 清空表单
                    document.getElementById('current-password').value = '';
                    document.getElementById('new-password').value = '';
                    document.getElementById('confirm-password').value = '';
                } else {
                    messageElement.textContent = result.message || '密码修改失败';
                    messageElement.classList.add('error');
                }
            } catch (error) {
                messageElement.textContent = error.message || '密码修改失败';
                messageElement.classList.add('error');
            }
        });
    }
    
    // 取消密码修改
    const cancelPasswordChangeButton = document.getElementById('cancel-password-change');
    if (cancelPasswordChangeButton) {
        cancelPasswordChangeButton.addEventListener('click', () => {
            document.getElementById('user-settings-modal').style.display = 'none';
            
            // 清空表单
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            document.getElementById('password-message').textContent = '';
        });
    }
}

/**
 * 设置管理面板按钮事件
 */
function setupAdminPanel() {
    const adminPanelButton = document.getElementById('admin-panel-button');
    if (adminPanelButton) {
        adminPanelButton.addEventListener('click', () => {
            window.location.href = 'admin.html';
        });
    }
    
    // 重试连接按钮
    const retryConnectionButton = document.getElementById('retry-connection');
    if (retryConnectionButton) {
        retryConnectionButton.addEventListener('click', async () => {
            await loadAppInfo();
        });
    }
} 