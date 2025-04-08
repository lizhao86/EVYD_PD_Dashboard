/**
 * EVYD产品经理AI工作台 - User Manual生成器
 * 模块入口文件
 */

// 命名空间
const UserManualApp = {
    // 全局状态
    state: {
        currentMessageId: null,
        currentConversationId: null
    },
    
    // 功能模块
    core: {},
    
    /**
     * 初始化应用
     */
    init() {
        console.log('初始化User Manual应用...');
        
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
        
        // 需求描述字数统计和放大功能
        const requirementDescription = document.getElementById('requirement-description');
        if (requirementDescription) {
            requirementDescription.addEventListener('input', this.updateCharCount.bind(this));
            // 初始化字数统计
            this.updateCharCount({ target: requirementDescription });
        }
        
        // 放大按钮功能
        const expandTextarea = document.getElementById('expand-textarea');
        if (expandTextarea) {
            expandTextarea.addEventListener('click', this.toggleTextareaExpand.bind(this));
        }
        
        // User Manual 相关
        document.getElementById('clear-form').addEventListener('click', this.handleClearForm.bind(this));
        document.getElementById('generate-manual').addEventListener('click', this.handleGenerateManual.bind(this));
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
        window.location.href = 'Homepage.html';
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
     * 生成User Manual
     */
    handleGenerateManual() {
        const generateButton = document.getElementById('generate-manual');
        const action = generateButton.getAttribute('data-action');
        
        // 如果当前是停止状态，则调用停止生成方法
        if (action === 'stop') {
            console.log('触发停止生成，当前消息ID:', UserManualApp.state.currentMessageId);
            if (UserManualApp.state.currentMessageId) {
                API.stopGeneration(UserManualApp.state.currentMessageId);
            } else {
                console.warn('没有正在进行的任务ID，无法停止');
                // 即使没有任务ID也恢复UI状态
                UI.showGenerationCompleted();
            }
            return;
        }
        
        // 否则，正常执行生成逻辑
        const requirementDesc = document.getElementById('requirement-description').value;

        if (!requirementDesc) {
            alert('请填写需求描述');
            return;
        }

        API.generateUserManual(requirementDesc);
    },
    
    /**
     * 停止生成
     */
    handleStopGeneration() {
        if (UserManualApp.state.currentMessageId) {
            API.stopGeneration(UserManualApp.state.currentMessageId);
        }
    },
    
    /**
     * 复制结果
     */
    handleCopyResult() {
        // 检查是否显示的是Markdown内容
        const markdownDiv = document.getElementById('result-content-markdown');
        let resultContent;
        if (markdownDiv && markdownDiv.style.display !== 'none') {
            // 从markdown内容中获取纯文本
            resultContent = markdownDiv.textContent;
        } else {
            // 获取普通结果内容
            resultContent = document.getElementById('result-content').textContent;
        }
        
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
     * 更新字数统计
     */
    updateCharCount(event) {
        const textarea = event.target;
        const charCount = textarea.value.length;
        const charCountElement = document.getElementById('char-count');
        const charCountContainer = document.querySelector('.char-counter');
        const generateButton = document.getElementById('generate-manual');
        
        charCountElement.textContent = charCount;
        
        // 超出字数限制时的处理
        if (charCount > 5000) {
            charCountContainer.classList.add('warning');
            generateButton.disabled = true;
        } else {
            charCountContainer.classList.remove('warning');
            generateButton.disabled = false;
        }
    },
    
    /**
     * 切换文本框放大状态
     */
    toggleTextareaExpand() {
        const textareaContainer = document.querySelector('.textarea-container');
        const textarea = document.getElementById('requirement-description');
        const charCounter = document.querySelector('.char-counter');
        
        if (textareaContainer.classList.contains('textarea-expanded')) {
            // 恢复正常大小
            this.shrinkTextarea(textareaContainer, textarea, charCounter);
        } else {
            // 放大文本框
            this.expandTextarea(textareaContainer, textarea, charCounter);
        }
    },
    
    /**
     * 放大文本框
     */
    expandTextarea(container, textarea, charCounter) {
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'textarea-overlay';
        overlay.addEventListener('click', () => this.shrinkTextarea(container, textarea, charCounter));
        document.body.appendChild(overlay);
        
        // 保存原始位置
        const formGroup = container.closest('.form-group');
        container.dataset.originalParent = formGroup.id || '';
        
        // 记住原始父元素的引用
        this.originalParentElement = formGroup;
        this.originalNextSibling = container.nextSibling;
        
        // 保存其他原始状态
        textarea.dataset.originalRows = textarea.rows;
        
        // 添加放大样式
        container.classList.add('textarea-expanded');
        document.body.appendChild(container);
        
        // 调整文本区大小
        textarea.rows = 20;
        textarea.focus();
        
        // 更新放大按钮图标
        const expandButton = document.getElementById('expand-textarea');
        expandButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
        `;
        
        // 移动字数统计到放大框内
        container.appendChild(charCounter);
    },
    
    /**
     * 缩小文本框
     */
    shrinkTextarea(container, textarea, charCounter) {
        // 移除遮罩层
        const overlay = document.querySelector('.textarea-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // 恢复原始样式
        container.classList.remove('textarea-expanded');
        textarea.rows = textarea.dataset.originalRows || 6;
        
        // 将文本框放回原位置
        if (this.originalParentElement) {
            // 先从当前位置移除
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
            
            // 放回正确位置
            if (this.originalNextSibling) {
                this.originalParentElement.insertBefore(container, this.originalNextSibling);
            } else {
                this.originalParentElement.appendChild(container);
            }
            
            // 确保字数统计在正确位置
            if (charCounter.parentNode) {
                charCounter.parentNode.removeChild(charCounter);
            }
            this.originalParentElement.appendChild(charCounter);
        }
        
        // 更新放大按钮图标
        const expandButton = document.getElementById('expand-textarea');
        expandButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7"/>
            </svg>
        `;
    },
    
    /**
     * 清空表单
     */
    handleClearForm() {
        document.getElementById('requirement-description').value = '';
        
        // 重置字数统计
        const charCountElement = document.getElementById('char-count');
        if (charCountElement) {
            charCountElement.textContent = '0';
        }
        const charCountContainer = document.querySelector('.char-counter');
        if (charCountContainer) {
            charCountContainer.classList.remove('warning');
        }
        const generateButton = document.getElementById('generate-manual');
        if (generateButton) {
            generateButton.disabled = false;
        }
    }
};

// 在DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    UserManualApp.init();
}); 