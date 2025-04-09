/**
 * EVYD产品经理AI工作台
 * 通用头部组件
 */

// 头部组件命名空间
const Header = {
    /**
     * 初始化头部组件
     * @param {string} containerId 头部容器ID
     */
    init(containerId = 'header-container') {
        console.log('初始化头部组件...');
        this.loadHeader(containerId);
    },

    /**
     * 加载头部HTML（内联方式）
     * @param {string} containerId 头部容器ID
     */
    loadHeader(containerId) {
        try {
            // 获取容器元素
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`找不到头部容器：#${containerId}`);
                return;
            }

            // 动态计算相对路径前缀
            const rootPath = this.calculateRootPath();
            console.log('根路径:', rootPath);

            // 获取内联的头部HTML模板并替换路径占位符
            let html = this.getHeaderTemplate();
            
            // 替换所有ROOT_PATH占位符
            html = html.replace(/ROOT_PATH\//g, rootPath);
            
            // 注入头部HTML
            container.innerHTML = html;
            
            // 设置当前页面导航状态
            this.setNavigationState();
            
            // 初始化事件监听
            this.initEventListeners();
            
            // 检查用户登录状态
            this.checkUserAuth();
            
            console.log('头部组件加载完成');
        } catch (error) {
            console.error('头部组件加载失败:', error);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="header-error">
                        <p>头部组件加载失败，请刷新页面重试。</p>
                        <p>错误信息: ${error.message}</p>
                    </div>
                `;
            }
        }
    },

    /**
     * 获取头部HTML模板
     * @returns {string} 头部HTML模板字符串
     */
    getHeaderTemplate() {
        return `<!-- 通用头部组件 -->
<header class="header">
    <div class="container header-container">
        <div class="logo-container">
            <img src="ROOT_PATH/assets/images/Group-29-2048x943.png" alt="EVYD Logo" class="logo">
            <span class="logo-divider"></span>
            <div class="logo-text">
                <h1>产品经理 AI 工作台</h1>
                <p>AI驱动的产品开发助手</p>
            </div>
        </div>
        <nav class="main-nav">
            <ul>
                <li><a href="ROOT_PATH/templates/pages/Homepage.html" id="nav-home">工具主页</a></li>
                <li><a href="#" id="nav-ai-tools">AI 工具</a></li>
                <li class="dropdown">
                    <a href="#" class="dropdown-toggle" id="nav-docs">文档中心 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></a>
                    <div class="dropdown-menu">
                        <a href="#" id="nav-product-requirements">产品需求手册</a>
                        <a href="#" id="nav-api-docs">API文档</a>
                        <a href="#" id="nav-tutorials">使用教程</a>
                    </div>
                </li>
                <li id="admin-panel-link" style="display: none;"><a href="javascript:void(0);" id="admin-panel-button">管理面板</a></li>
            </ul>
        </nav>
        <div class="user-actions">
            <div id="user-info" style="display: none;">
                <span id="username-display"></span>
                <div class="user-dropdown">
                    <button class="user-dropdown-button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </button>
                    <div class="dropdown-content">
                        <a href="#" id="profile-settings">账号设置</a>
                        <a href="#" id="logout-button">登出</a>
                    </div>
                </div>
            </div>
            <button id="login-button" class="btn-login">登录</button>
        </div>
    </div>
</header>

<!-- 登录模态框 -->
<div class="modal" id="login-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>登录</h2>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
            <div class="auth-form">
                <div class="form-tabs">
                    <button class="form-tab active" data-tab="login">登录</button>
                    <button class="form-tab" data-tab="register" id="register-tab" style="display: none;">注册</button>
                </div>
                
                <div class="tab-content active" id="login-tab-content">
                    <div class="form-group">
                        <label for="login-username">用户名</label>
                        <input type="text" id="login-username" placeholder="输入用户名">
                    </div>
                    
                    <div class="form-group">
                        <label for="login-password">密码</label>
                        <input type="password" id="login-password" placeholder="输入密码">
                    </div>
                    
                    <div class="form-message" id="login-message"></div>
                    
                    <div class="form-actions">
                        <button class="btn-primary" id="submit-login">登录</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- 用户设置模态框 -->
<div class="modal" id="user-settings-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>账号设置</h2>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
            <div class="settings-tabs">
                <button class="settings-tab active" data-settings="password">修改密码</button>
                <button class="settings-tab" data-settings="profile">个人资料</button>
            </div>
            
            <div class="settings-content active" id="password-settings">
                <div class="form-group">
                    <label for="current-password">当前密码</label>
                    <input type="password" id="current-password" placeholder="输入当前密码">
                </div>
                
                <div class="form-group">
                    <label for="new-password">新密码</label>
                    <input type="password" id="new-password" placeholder="输入新密码">
                </div>
                
                <div class="form-group">
                    <label for="confirm-password">确认新密码</label>
                    <input type="password" id="confirm-password" placeholder="再次输入新密码">
                </div>
                
                <div class="form-message" id="password-message"></div>
                
                <div class="form-actions">
                    <button class="btn-secondary" id="cancel-password-change">取消</button>
                    <button class="btn-primary" id="submit-password-change">更新密码</button>
                </div>
            </div>
            
            <div class="settings-content" id="profile-settings-content">
                <div class="form-group">
                    <label for="profile-username">用户名</label>
                    <input type="text" id="profile-username" disabled>
                </div>
                
                <div class="form-group">
                    <label for="profile-role">角色</label>
                    <input type="text" id="profile-role" disabled>
                </div>
                
                <div class="form-group">
                    <label for="profile-created">创建日期</label>
                    <input type="text" id="profile-created" disabled>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- API Key 管理模态框 -->
<div class="modal" id="api-keys-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>API 密钥管理</h2>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
            <div class="api-keys-description">
                <p>这里您可以查看您的 Dify API 密钥，这些密钥用于连接到 Dify 服务并使用 AI 功能。</p>
            </div>
            
            <div class="api-keys-list">
                <div class="api-key-item">
                    <div class="api-key-info">
                        <h4>User Story 生成器</h4>
                        <p>用于生成用户故事的 Dify Workflow API Key</p>
                    </div>
                    <div class="api-key-value">
                        <input type="password" id="userStory-api-key" readonly>
                        <button class="btn-icon toggle-password">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="api-key-item">
                    <div class="api-key-info">
                        <h4>User Manual 生成器</h4>
                        <p>用于生成用户手册的 Dify Agent API Key</p>
                    </div>
                    <div class="api-key-value">
                        <input type="password" id="userManual-api-key" readonly>
                        <button class="btn-icon toggle-password">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="api-key-item">
                    <div class="api-key-info">
                        <h4>需求分析助手</h4>
                        <p>用于需求分析的 Dify API Key</p>
                    </div>
                    <div class="api-key-value">
                        <input type="password" id="requirementsAnalysis-api-key" readonly>
                        <button class="btn-icon toggle-password">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="api-key-item">
                    <div class="api-key-info">
                        <h4>UX 界面设计</h4>
                        <p>用于生成界面设计提示词的 Dify API Key</p>
                    </div>
                    <div class="api-key-value">
                        <input type="password" id="uxDesign-api-key" readonly>
                        <button class="btn-icon toggle-password">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="form-message" id="api-keys-message"></div>
        </div>
    </div>
</div>

<!-- 管理员面板模态框 -->
<div class="modal" id="admin-panel-modal">
    <div class="modal-content admin-modal-content">
        <div class="modal-header">
            <h2>管理员面板</h2>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
            <div class="admin-tabs">
                <button class="admin-tab active" data-admin-tab="users">用户管理</button>
                <button class="admin-tab" data-admin-tab="api-keys">API Key 配置</button>
                <button class="admin-tab" data-admin-tab="api-endpoints">API 地址配置</button>
            </div>
            
            <div class="admin-content active" id="users-management">
                <div class="admin-actions">
                    <button class="btn-primary" id="add-user-button">添加用户</button>
                </div>
                
                <div class="users-table-container">
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>用户名</th>
                                <th>角色</th>
                                <th>创建日期</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body">
                            <!-- 用户列表将在这里动态生成 -->
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="admin-content" id="api-keys-management">
                <div class="api-keys-management-description">
                    <p>在这里您可以为每个用户配置不同的 Dify API 密钥。</p>
                </div>
                
                <div class="user-select-container">
                    <label for="api-key-config-user-select">选择用户</label>
                    <select id="api-key-config-user-select">
                        <!-- 用户选项将在这里动态生成 -->
                    </select>
                </div>
                
                <div class="api-keys-config">
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4>User Story 生成器</h4>
                            <p>用于生成用户故事的 Dify Workflow API Key</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="user-specific-userStory-api-key" placeholder="输入 API Key">
                        </div>
                    </div>
                    
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4>User Manual 生成器</h4>
                            <p>用于生成用户手册的 Dify Agent API Key</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="user-specific-userManual-api-key" placeholder="输入 API Key">
                        </div>
                    </div>
                    
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4>需求分析助手</h4>
                            <p>用于需求分析的 Dify API Key</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="user-specific-requirementsAnalysis-api-key" placeholder="输入 API Key">
                        </div>
                    </div>
                    
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4>UX 界面设计</h4>
                            <p>用于生成界面设计提示词的 Dify API Key</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="user-specific-uxDesign-api-key" placeholder="输入 API Key">
                        </div>
                    </div>
                </div>
                
                <div class="form-message" id="admin-api-keys-message"></div>
                
                <div class="form-actions">
                    <button class="btn-primary" id="save-api-keys-button">保存 API Keys</button>
                </div>
            </div>

            <div class="admin-content" id="api-endpoints-management">
                <div class="api-keys-management-description">
                    <p>在这里您可以配置全局的Dify API地址，所有用户都将使用这些地址进行API调用。</p>
                </div>
                
                <div class="api-keys-config">
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4>User Story 生成器</h4>
                            <p>用于生成用户故事的 Dify Workflow API 地址</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="global-userStory-api-endpoint" placeholder="输入 API 地址，例如 http://localhost">
                        </div>
                    </div>
                    
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4>User Manual 生成器</h4>
                            <p>用于生成用户手册的 Dify Agent API 地址</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="global-userManual-api-endpoint" placeholder="输入 API 地址，例如 http://localhost">
                        </div>
                    </div>
                    
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4>需求分析助手</h4>
                            <p>用于需求分析的 Dify API 地址</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="global-requirementsAnalysis-api-endpoint" placeholder="输入 API 地址，例如 http://localhost">
                        </div>
                    </div>
                    
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4>UX 界面设计</h4>
                            <p>用于生成界面设计提示词的 Dify API 地址</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="global-uxDesign-api-endpoint" placeholder="输入 API 地址，例如 http://localhost">
                        </div>
                    </div>
                </div>
                
                <div class="form-message" id="api-endpoints-message"></div>
                
                <div class="form-actions">
                    <button class="btn-primary" id="save-global-api-endpoints-button">保存 API 地址</button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- 添加/编辑用户模态框 -->
<div class="modal" id="edit-user-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 id="edit-user-title">添加用户</h2>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label for="user-edit-username">用户名</label>
                <input type="text" id="user-edit-username" placeholder="输入用户名">
            </div>
            
            <div class="form-group">
                <label for="user-edit-password">密码</label>
                <input type="password" id="user-edit-password" placeholder="输入密码">
                <p class="form-help" id="password-help">留空则使用默认密码: password123</p>
            </div>
            
            <div class="form-group">
                <label for="user-edit-role">角色</label>
                <select id="user-edit-role">
                    <option value="user">普通用户</option>
                    <option value="admin">管理员</option>
                </select>
            </div>
            
            <div class="form-message" id="edit-user-message"></div>
            
            <div class="form-actions">
                <button class="btn-secondary" id="cancel-edit-user">取消</button>
                <button class="btn-primary" id="save-edit-user">保存</button>
            </div>
        </div>
    </div>
</div>`;
    },

    /**
     * 计算到项目根目录的相对路径
     * @returns {string} 根路径
     */
    calculateRootPath() {
        const currentPath = window.location.pathname;
        let pathDepth = 0;
        
        // 计算当前路径深度（排除index.html）
        if (!currentPath.endsWith('/') && !currentPath.endsWith('index.html')) {
            // 计算路径中的目录层级数
            pathDepth = currentPath.split('/').filter(part => part.length > 0).length;
            
            // 如果在templates/pages/下，深度为2
            if (currentPath.includes('/templates/pages/')) {
                return '../../';
            }
        }
        
        // 根据路径深度返回相应的相对路径
        return pathDepth > 0 ? '../'.repeat(pathDepth) : './';
    },

    /**
     * 设置当前页面导航状态
     */
    setNavigationState() {
        // 获取当前页面路径
        const currentPath = window.location.pathname;
        console.log('当前路径:', currentPath);
        
        // 清除所有激活状态
        document.querySelectorAll('.main-nav a').forEach(link => {
            link.classList.remove('active');
        });
        
        // 设置激活状态
        if (currentPath.includes('Homepage.html') || currentPath.endsWith('/') || currentPath.endsWith('index.html')) {
            // 首页
            document.getElementById('nav-home')?.classList.add('active');
        } else if (currentPath.includes('user-story.html') || currentPath.includes('user-manual.html') || currentPath.includes('ux-design.html')) {
            // AI工具页面
            document.getElementById('nav-ai-tools')?.classList.add('active');
        } else if (currentPath.includes('product-requirements.html')) {
            // 产品需求手册
            document.getElementById('nav-docs')?.classList.add('active');
            document.getElementById('nav-product-requirements')?.classList.add('active');
        }
    },

    /**
     * 初始化事件监听
     */
    initEventListeners() {
        console.log('初始化头部事件监听...');
        
        // 登录按钮事件
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-modal').style.display = 'block';
            });
        }
        
        // 登出按钮事件
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof Auth !== 'undefined') {
                    Auth.logout();
                    window.location.reload();
                }
            });
        }
        
        // 账号设置按钮
        const profileSettingsButton = document.getElementById('profile-settings');
        if (profileSettingsButton) {
            profileSettingsButton.addEventListener('click', (e) => {
                e.preventDefault();
                const settingsModal = document.getElementById('user-settings-modal');
                if (settingsModal) {
                    settingsModal.style.display = 'block';
                    this.loadUserProfile();
                }
            });
        }
        
        // 管理面板按钮
        const adminPanelButton = document.getElementById('admin-panel-button');
        if (adminPanelButton) {
            adminPanelButton.addEventListener('click', (e) => {
                e.preventDefault();
                // 打开管理面板模态框
                const adminModal = document.getElementById('admin-panel-modal');
                if (adminModal) {
                    adminModal.style.display = 'block';
                    this.initAdminPanel();
                }
            });
        }
        
        // 模态框关闭按钮
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => {
                // 关闭当前模态框
                const modal = button.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // 设置标签页切换
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // 切换标签活动状态
                document.querySelectorAll('.settings-tab').forEach(t => {
                    t.classList.remove('active');
                });
                tab.classList.add('active');
                
                // 显示对应内容
                const settingsType = tab.getAttribute('data-settings');
                document.querySelectorAll('.settings-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`${settingsType}-settings`)?.classList.add('active');
            });
        });
        
        // 管理员面板标签页切换
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                console.log('点击管理员面板标签页:', tab.getAttribute('data-admin-tab'));
                
                // 切换标签活动状态
                document.querySelectorAll('.admin-tab').forEach(t => {
                    t.classList.remove('active');
                });
                tab.classList.add('active');
                
                // 显示对应内容
                const tabType = tab.getAttribute('data-admin-tab');
                document.querySelectorAll('.admin-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                let contentId = '';
                if (tabType === 'users') {
                    contentId = 'users-management';
                    this.loadUsersList();
                } else if (tabType === 'api-keys') {
                    contentId = 'api-keys-management';
                    this.loadApiKeysConfig();
                } else if (tabType === 'api-endpoints') {
                    contentId = 'api-endpoints-management';
                    this.loadApiEndpointsConfig();
                }
                
                if (contentId) {
                    const contentElement = document.getElementById(contentId);
                    if (contentElement) {
                        contentElement.classList.add('active');
                        console.log('显示内容区域:', contentId);
                    } else {
                        console.error('找不到内容区域:', contentId);
                    }
                }
            });
        });
        
        // 登录表单提交
        const submitLoginButton = document.getElementById('submit-login');
        if (submitLoginButton) {
            submitLoginButton.addEventListener('click', () => {
                this.handleLogin();
            });
        }
        
        // 密码修改
        const submitPasswordButton = document.getElementById('submit-password-change');
        if (submitPasswordButton) {
            submitPasswordButton.addEventListener('click', () => {
                this.handlePasswordChange();
            });
        }
        
        // 切换密码可见性
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', (e) => {
                const input = e.target.closest('.api-key-value').querySelector('input');
                if (input) {
                    if (input.type === 'password') {
                        input.type = 'text';
                    } else {
                        input.type = 'password';
                    }
                }
            });
        });
        
        // 添加用户按钮
        const addUserButton = document.getElementById('add-user-button');
        if (addUserButton) {
            addUserButton.addEventListener('click', () => {
                console.log('点击添加用户按钮');
                // 重置表单
                document.getElementById('user-edit-modal-title').textContent = '添加用户';
                document.getElementById('user-edit-username').value = '';
                document.getElementById('user-edit-password').value = '';
                document.getElementById('user-edit-role').value = 'user';
                document.getElementById('user-edit-form-message').textContent = '';
                document.getElementById('user-edit-form-message').className = 'form-message';
                
                // 显示模态框
                document.getElementById('edit-user-modal').style.display = 'block';
            });
        }
        
        // 保存用户按钮
        const saveUserButton = document.getElementById('save-edit-user');
        if (saveUserButton) {
            saveUserButton.addEventListener('click', () => {
                const username = document.getElementById('user-edit-username').value;
                const password = document.getElementById('user-edit-password').value;
                const role = document.getElementById('user-edit-role').value;
                
                if (!username) {
                    this.showFormMessage('user-edit-form-message', '请输入用户名', 'error');
                    return;
                }
                
                // 检查是否存在同名用户
                const users = Storage.getAllUsers();
                const existingUser = users.find(u => u.username === username);
                if (existingUser) {
                    this.showFormMessage('user-edit-form-message', '用户名已存在', 'error');
                    return;
                }
                
                // 添加用户
                const result = Storage.addUser({
                    username,
                    password: password || 'password123',
                    role: role,
                    apiKeys: {
                        userStory: '',
                        userManual: '',
                        requirementsAnalysis: '',
                        uxDesign: ''
                    }
                });
                
                if (result.success) {
                    this.showFormMessage('user-edit-form-message', '用户添加成功', 'success');
                    setTimeout(() => {
                        document.getElementById('edit-user-modal').style.display = 'none';
                        this.loadUsersList();
                    }, 1500);
                } else {
                    this.showFormMessage('user-edit-form-message', result.message || '添加用户失败', 'error');
                }
            });
        }
        
        // 保存API密钥按钮
        const saveApiKeysButton = document.getElementById('save-api-keys-button');
        if (saveApiKeysButton) {
            saveApiKeysButton.addEventListener('click', () => {
                const userId = document.getElementById('api-key-config-user-select').value;
                if (!userId) {
                    this.showFormMessage('admin-api-keys-message', '请选择用户', 'error');
                    return;
                }
                
                const user = Storage.getUser(userId);
                if (!user) {
                    this.showFormMessage('admin-api-keys-message', '用户不存在', 'error');
                    return;
                }
                
                // 获取API Key值
                const apiKeys = {
                    userStory: document.getElementById('user-specific-userStory-api-key').value,
                    userManual: document.getElementById('user-specific-userManual-api-key').value,
                    requirementsAnalysis: document.getElementById('user-specific-requirementsAnalysis-api-key').value,
                    uxDesign: document.getElementById('user-specific-uxDesign-api-key').value
                };
                
                // 使用App模块的方法更新API Key
                if (typeof App !== 'undefined' && App.updateUserApiKeys) {
                    const result = App.updateUserApiKeys(userId, apiKeys);
                    if (result.success) {
                        this.showFormMessage('admin-api-keys-message', 'API密钥更新成功', 'success');
                    } else {
                        this.showFormMessage('admin-api-keys-message', result.message || '更新失败', 'error');
                    }
                } else {
                    // 降级处理：直接使用Storage.updateUser
                    user.apiKeys = apiKeys;
                    const result = Storage.updateUser(user);
                    if (result) {
                        this.showFormMessage('admin-api-keys-message', 'API密钥更新成功', 'success');
                    } else {
                        this.showFormMessage('admin-api-keys-message', '更新失败', 'error');
                    }
                }
            });
        }
        
        // 保存API地址按钮
        const saveApiEndpointsButton = document.getElementById('save-global-api-endpoints-button');
        if (saveApiEndpointsButton) {
            saveApiEndpointsButton.addEventListener('click', () => {
                if (typeof Config === 'undefined') {
                    console.error('Config模块未定义，请确保config.js已加载');
                    this.showFormMessage('api-endpoints-message', 'Config模块未定义', 'error');
                    return;
                }
                
                // 获取API地址
                const apiEndpoints = {
                    userStory: document.getElementById('global-userStory-api-endpoint').value,
                    userManual: document.getElementById('global-userManual-api-endpoint').value,
                    requirementsAnalysis: document.getElementById('global-requirementsAnalysis-api-endpoint').value,
                    uxDesign: document.getElementById('global-uxDesign-api-endpoint').value
                };
                
                // 更新全局配置
                const config = Config.getGlobalConfig() || {};
                config.apiEndpoints = apiEndpoints;
                
                // 保存配置并显示结果
                try {
                    Config.saveGlobalConfig(config);
                    this.showFormMessage('api-endpoints-message', 'API地址更新成功', 'success');
                } catch (error) {
                    console.error('保存API地址失败:', error);
                    this.showFormMessage('api-endpoints-message', '更新失败: ' + error.message, 'error');
                }
            });
        }
    },
    
    /**
     * 初始化管理面板
     */
    initAdminPanel() {
        console.log('初始化管理面板...');
        
        // 加载用户列表
        this.loadUsersList();
    },
    
    /**
     * 加载用户列表
     */
    loadUsersList() {
        console.log('加载用户列表...');
        
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
            const createdDate = new Date(user.created || Date.now());
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
            button.addEventListener('click', () => {
                const userId = button.dataset.userId;
                const user = Storage.getUser(userId);
                
                if (user) {
                    // 填充表单
                    document.getElementById('edit-user-title').textContent = '编辑用户';
                    document.getElementById('user-edit-username').value = user.username;
                    document.getElementById('user-edit-password').value = '';
                    document.getElementById('password-help').textContent = '留空则保持原密码不变';
                    document.getElementById('user-edit-role').value = user.role;
                    
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
            button.addEventListener('click', () => {
                const userId = button.dataset.userId;
                
                if (confirm('确定要删除此用户吗？此操作不可撤销。')) {
                    const result = Storage.deleteUser(userId);
                    
                    if (result.success) {
                        alert('用户删除成功');
                        this.loadUsersList(); // 重新加载用户列表
                    } else {
                        alert('删除失败: ' + (result.message || '未知错误'));
                    }
                }
            });
        });
    },
    
    /**
     * 加载API密钥配置
     */
    loadApiKeysConfig() {
        console.log('加载API密钥配置...');
        
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
                    document.getElementById('user-specific-userStory-api-key').value = user.apiKeys?.userStory || '';
                    document.getElementById('user-specific-userManual-api-key').value = user.apiKeys?.userManual || '';
                    document.getElementById('user-specific-requirementsAnalysis-api-key').value = user.apiKeys?.requirementsAnalysis || '';
                    document.getElementById('user-specific-uxDesign-api-key').value = user.apiKeys?.uxDesign || '';
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
                    document.getElementById('user-specific-userStory-api-key').value = user.apiKeys?.userStory || '';
                    document.getElementById('user-specific-userManual-api-key').value = user.apiKeys?.userManual || '';
                    document.getElementById('user-specific-requirementsAnalysis-api-key').value = user.apiKeys?.requirementsAnalysis || '';
                    document.getElementById('user-specific-uxDesign-api-key').value = user.apiKeys?.uxDesign || '';
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
    loadApiEndpointsConfig() {
        console.log('加载API地址配置...');
        
        if (typeof Config === 'undefined') {
            console.error('Config模块未定义，请确保config.js已加载');
            return;
        }
        
        // 获取全局配置
        const config = Config.getGlobalConfig() || {};
        
        // 确保apiEndpoints存在
        if (!config.apiEndpoints) {
            config.apiEndpoints = {
                userStory: 'https://api.dify.ai/v1',
                userManual: 'https://api.dify.ai/v1',
                requirementsAnalysis: 'https://api.dify.ai/v1',
                uxDesign: 'https://api.dify.ai/v1'
            };
            Config.saveGlobalConfig(config);
        }
        
        // 填充表单
        const userStoryEl = document.getElementById('global-userStory-api-endpoint');
        const userManualEl = document.getElementById('global-userManual-api-endpoint');
        const requirementsAnalysisEl = document.getElementById('global-requirementsAnalysis-api-endpoint');
        const uxDesignEl = document.getElementById('global-uxDesign-api-endpoint');
        
        if (userStoryEl) userStoryEl.value = config.apiEndpoints.userStory || '';
        if (userManualEl) userManualEl.value = config.apiEndpoints.userManual || '';
        if (requirementsAnalysisEl) requirementsAnalysisEl.value = config.apiEndpoints.requirementsAnalysis || '';
        if (uxDesignEl) uxDesignEl.value = config.apiEndpoints.uxDesign || '';
    },

    /**
     * 检查用户登录状态
     */
    checkUserAuth() {
        console.log('检查用户登录状态...');
        
        if (typeof Auth === 'undefined') {
            console.error('Auth模块未定义，请确保auth.js已加载');
            return;
        }
        
        const currentUser = Auth.checkAuth();
        const userInfo = document.getElementById('user-info');
        const loginButton = document.getElementById('login-button');
        const usernameDisplay = document.getElementById('username-display');
        
        if (currentUser) {
            // 用户已登录
            userInfo.style.display = 'flex';
            loginButton.style.display = 'none';
            usernameDisplay.textContent = currentUser.username;
            
            // 检查管理员权限
            if (currentUser.role === 'admin') {
                document.getElementById('admin-panel-link').style.display = 'block';
            } else {
                document.getElementById('admin-panel-link').style.display = 'none';
            }
            
            console.log('显示登录用户:', currentUser.username);
        } else {
            // 用户未登录
            userInfo.style.display = 'none';
            loginButton.style.display = 'block';
            document.getElementById('admin-panel-link').style.display = 'none';
            console.log('未登录状态');
        }
    },

    /**
     * 处理登录请求
     */
    handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            this.showFormMessage('login-message', '请输入用户名和密码', 'error');
            return;
        }
        
        console.log('尝试登录:', username);
        const result = Auth.login(username, password);
        console.log('登录结果:', result);
        
        if (result.success) {
            // 登录成功
            document.getElementById('login-modal').style.display = 'none';
            
            // 清空表单
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
            
            // 刷新页面
            window.location.reload();
        } else {
            // 登录失败
            this.showFormMessage('login-message', result.message, 'error');
        }
    },

    /**
     * 处理密码修改
     */
    handlePasswordChange() {
        // 获取表单数据
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // 验证表单
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showFormMessage('password-message', '请填写所有字段', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            this.showFormMessage('password-message', '新密码与确认密码不一致', 'error');
            return;
        }
        
        // 检查当前用户
        const currentUser = Auth.checkAuth();
        if (!currentUser) {
            this.showFormMessage('password-message', '用户未登录', 'error');
            return;
        }
        
        // 获取用户数据
        const user = Storage.getUser(currentUser.id);
        if (!user) {
            this.showFormMessage('password-message', '无法获取用户信息', 'error');
            return;
        }
        
        // 验证当前密码
        if (user.password !== currentPassword) {
            this.showFormMessage('password-message', '当前密码不正确', 'error');
            return;
        }
        
        // 更新密码
        user.password = newPassword;
        const result = Storage.updateUser(user);
        
        if (result) {
            this.showFormMessage('password-message', '密码修改成功', 'success');
            
            // 清空表单
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            
            // 延迟关闭模态框
            setTimeout(() => {
                document.getElementById('user-settings-modal').style.display = 'none';
            }, 1500);
        } else {
            this.showFormMessage('password-message', '密码修改失败', 'error');
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
        
        // 格式化创建日期
        if (currentUser.created_at) {
            const createdDate = new Date(currentUser.created_at);
            document.getElementById('profile-created').value = createdDate.toLocaleDateString();
        } else {
            document.getElementById('profile-created').value = '未知';
        }
    },

    /**
     * 加载用户API密钥
     */
    loadUserApiKeys() {
        if (typeof Storage === 'undefined') {
            console.error('Storage模块未定义，请确保storage.js已加载');
            return;
        }
        
        const currentUser = Auth.checkAuth();
        if (!currentUser) return;
        
        // 获取API密钥
        const apiKeys = Storage.getUserApiKeys(currentUser.id);
        
        // 显示API密钥
        if (apiKeys) {
            document.getElementById('userStory-api-key').value = apiKeys.userStory || '';
            document.getElementById('userManual-api-key').value = apiKeys.userManual || '';
            document.getElementById('requirementsAnalysis-api-key').value = apiKeys.requirementsAnalysis || '';
            
            // 兼容旧版本和新版本
            const uxDesignInput = document.getElementById('uxDesign-api-key');
            if (uxDesignInput) {
                uxDesignInput.value = apiKeys.uxDesign || '';
            }
        }
    },

    /**
     * 显示表单消息
     * @param {string} elementId 消息元素ID
     * @param {string} message 消息内容
     * @param {string} type 消息类型 (error|success)
     */
    showFormMessage(elementId, message, type) {
        const messageElement = document.getElementById(elementId);
        if (!messageElement) return;
        
        messageElement.textContent = message;
        messageElement.className = 'form-message';
        
        if (type) {
            messageElement.classList.add(type);
        }
    }
};

// 当DOM加载完成后初始化头部
document.addEventListener('DOMContentLoaded', () => {
    Header.init();
}); 