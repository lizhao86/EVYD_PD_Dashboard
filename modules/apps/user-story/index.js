/**
 * EVYD产品经理AI工作台 - User Story生成器
 * 模块入口文件
 */

// 引用不再需要import

// 命名空间
const UserStoryApp = {
    // 全局状态
    state: {
        currentTaskId: null
    },
    
    // 功能模块
    core: {},
    
    /**
     * 初始化应用
     */
    init() {
        console.log('初始化User Story应用...');
        
        // 初始化UI
        UI.initUserInterface();
        
        // 绑定事件
        this.bindEvents();
        
        // 检查登录状态
        const currentUser = Auth.checkAuth();
        console.log('当前用户:', currentUser);
        
        if (!currentUser) {
            console.log('用户未登录，显示登录框');
            // 确保登录框可见
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.style.display = 'block';
            } else {
                console.error('找不到登录模态框元素');
            }
        } else {
            console.log('用户已登录，获取应用信息');
            // 获取应用信息
            setTimeout(() => API.fetchAppInfo(), 500);
        }
    },
    
    /**
     * 绑定所有事件
     */
    bindEvents() {
        console.log('绑定事件...');
        
        // 登录相关
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('点击登录按钮');
                const loginModal = document.getElementById('login-modal');
                if (loginModal) {
                    loginModal.style.display = 'block';
                } else {
                    console.error('找不到登录模态框元素');
                }
            });
        } else {
            console.error('找不到登录按钮元素');
        }
        
        // 提交登录
        const submitLoginButton = document.getElementById('submit-login');
        if (submitLoginButton) {
            submitLoginButton.addEventListener('click', this.handleLogin.bind(this));
        } else {
            console.error('找不到提交登录按钮元素');
        }
        
        // 账号设置相关
        document.getElementById('profile-settings').addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('user-settings-modal').style.display = 'block';
            UI.loadUserProfile();
        });
        document.getElementById('submit-password-change').addEventListener('click', this.handlePasswordChange.bind(this));
        
        // API密钥相关
        document.getElementById('view-api-keys').addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('api-keys-modal').style.display = 'block';
            UI.loadUserApiKeys();
        });
        
        // 模态框操作
        const closeButtons = document.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const modal = this.closest('.modal');
                modal.style.display = 'none';
            });
        });
        
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', function(event) {
                if (event.target === this) {
                    this.style.display = 'none';
                }
            });
        });
        
        // 密码可见性切换
        const togglePasswordButtons = document.querySelectorAll('.toggle-password');
        togglePasswordButtons.forEach(button => {
            button.addEventListener('click', function() {
                const input = this.previousElementSibling;
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
            });
        });
        
        // 系统信息折叠/展开
        const toggleSystemInfoButton = document.getElementById('toggle-system-info');
        if (toggleSystemInfoButton) {
            toggleSystemInfoButton.addEventListener('click', function() {
                const systemInfoContent = document.getElementById('system-info-content');
                if (systemInfoContent.style.display === 'none') {
                    systemInfoContent.style.display = 'block';
                    this.classList.remove('collapsed');
                } else {
                    systemInfoContent.style.display = 'none';
                    this.classList.add('collapsed');
                }
            });
        }
        
        // 重试连接
        document.getElementById('retry-connection').addEventListener('click', function() {
            API.fetchAppInfo();
        });
        
        // User Story 相关
        document.getElementById('clear-form').addEventListener('click', this.handleClearForm.bind(this));
        document.getElementById('generate-story').addEventListener('click', this.handleGenerateStory.bind(this));
        document.getElementById('stop-generation').addEventListener('click', this.handleStopGeneration.bind(this));
        document.getElementById('copy-result').addEventListener('click', this.handleCopyResult.bind(this));
    },
    
    /**
     * 处理登录
     */
    handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            UI.showFormMessage('login-message', '请输入用户名和密码', 'error');
            return;
        }
        
        console.log('尝试登录:', username);
        const result = Auth.login(username, password);
        console.log('登录结果:', result);
        
        if (result.success) {
            // 登录成功
            document.getElementById('login-modal').style.display = 'none';
            UI.initUserInterface();
            setTimeout(() => API.fetchAppInfo(), 500);
            
            // 清空表单
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
            document.getElementById('login-message').className = 'form-message';
        } else {
            // 登录失败
            UI.showFormMessage('login-message', result.message, 'error');
        }
    },
    
    /**
     * 处理登出
     */
    handleLogout() {
        Auth.logout();
        UI.initUserInterface();
        window.location.href = 'index.html';
    },
    
    /**
     * 处理密码修改
     */
    handlePasswordChange() {
        const currentUser = Auth.checkAuth();
        if (!currentUser) return;
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            UI.showFormMessage('password-message', '请填写所有密码字段', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            UI.showFormMessage('password-message', '新密码和确认密码不匹配', 'error');
            return;
        }
        
        const result = Auth.changePassword(currentUser.id, currentPassword, newPassword);
        
        if (result.success) {
            UI.showFormMessage('password-message', result.message, 'success');
            
            // 清空表单
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            
            // 3秒后关闭模态框
            setTimeout(() => {
                document.getElementById('user-settings-modal').style.display = 'none';
            }, 3000);
        } else {
            UI.showFormMessage('password-message', result.message, 'error');
        }
    },
    
    /**
     * 生成User Story
     */
    handleGenerateStory() {
        const generateButton = document.getElementById('generate-story');
        const action = generateButton.getAttribute('data-action');
        
        // 如果当前是停止状态，则调用停止生成方法
        if (action === 'stop') {
            console.log('触发停止生成，当前任务ID:', UserStoryApp.state.currentTaskId);
            if (UserStoryApp.state.currentTaskId) {
                API.stopGeneration(UserStoryApp.state.currentTaskId);
            } else {
                console.warn('没有正在进行的任务ID，无法停止');
                // 即使没有任务ID也恢复UI状态
                UI.showGenerationCompleted();
            }
            return;
        }
        
        // 否则，正常执行生成逻辑
        const platformName = document.getElementById('platform-name').value;
        const systemName = document.getElementById('system-name').value;
        const moduleName = document.getElementById('module-name').value;
        const requirementDesc = document.getElementById('requirement-description').value;

        if (!platformName || !systemName || !moduleName || !requirementDesc) {
            alert('请填写所有必要字段');
            return;
        }

        API.generateUserStory(platformName, systemName, moduleName, requirementDesc);
    },
    
    /**
     * 停止生成
     */
    handleStopGeneration() {
        if (UserStoryApp.state.currentTaskId) {
            API.stopGeneration(UserStoryApp.state.currentTaskId);
        }
    },
    
    /**
     * 复制结果
     */
    handleCopyResult() {
        const resultContent = document.getElementById('result-content').innerText;
        navigator.clipboard.writeText(resultContent).then(() => {
            // 复制成功反馈
            const copyButton = document.getElementById('copy-result');
            const originalTitle = copyButton.getAttribute('title');
            copyButton.setAttribute('title', '已复制!');
            setTimeout(() => {
                copyButton.setAttribute('title', originalTitle);
            }, 2000);
        });
    },
    
    /**
     * 清空表单
     */
    handleClearForm() {
        document.getElementById('platform-name').value = '';
        document.getElementById('system-name').value = '';
        document.getElementById('module-name').value = '';
        document.getElementById('requirement-description').value = '';
    }
};

// 在DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    UserStoryApp.init();
});

// 不再导出模块 