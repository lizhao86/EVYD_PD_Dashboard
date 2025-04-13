/**
 * EVYD产品经理AI工作台
 * 通用头部组件 (Integrated with AWS Amplify Auth)
 */

// Import new Auth and Storage functions
import {
    // login, // Keep login for now, maybe needed for non-hosted UI flows later?
    // logout, // Keep logout for now, maybe needed for non-hosted UI flows later?
    checkAuth,
    isAdmin,
    changePassword
    // Remove federatedSignIn and signOut from here
} from '/modules/auth/auth.js'; // Use absolute path

// Import Amplify Auth functions directly for Hosted UI
import { signInWithRedirect, signOut } from 'aws-amplify/auth'; // Use signInWithRedirect for v6

import {
    getCurrentUserSettings,
    saveCurrentUserSetting,
    getGlobalConfig,
    saveGlobalConfig
} from '/scripts/services/storage.js'; // Use absolute path

// Import the specific helper function needed
import { showFormMessage } from '/scripts/utils/helper.js';

// Import Amplify and config here as well
import { Amplify } from 'aws-amplify';
import awsconfig from '../../src/aws-exports.js'; // Adjust path relative to header.js

// Import I18n module
import I18n, { t } from '/scripts/i18n.js';

// 头部组件命名空间 (We keep the structure but replace implementations)
const Header = {
    currentUser: null, // Store current Amplify user object
    userSettings: null, // Store user settings from DynamoDB

    /**
     * 初始化头部组件
     * @param {string} containerId 头部容器ID
     */
    async init(containerId = 'header-container') { // Made async
        // --- BEGIN AMPLIFY CONFIGURATION (moved here) ---
        try {
            // console.log("[Header.init] Configuring Amplify...");

            // Construct the final config, ensuring oauth block exists and uses env vars
            const updatedConfig = {
                ...awsconfig, // Spread existing config from aws-exports.js
                Auth: { // Ensure Auth block exists
                    ...(awsconfig.Auth || {}), // Spread existing Auth settings if they exist
                    Cognito: { // Ensure Cognito block exists
                        ...(awsconfig.Auth?.Cognito || {}), // Spread existing Cognito settings
                        // Ensure IDs are present (take from awsconfig or add manually if needed)
                        userPoolId: awsconfig.aws_user_pools_id || 'ap-southeast-1_r5O88umzn',
                        userPoolWebClientId: awsconfig.aws_user_pools_web_client_id || '4b9noidv0iu0rjn3l7cr3n27sb',
                        // Define or overwrite the loginWith.oauth section
                        loginWith: {
                            oauth: {
                                domain: "login.auth.ap-southeast-1.amazoncognito.com", // Use the correct domain
                                scopes: [ // Standard scopes, ensure they match Cognito App Client config
                                    'openid',
                                    'profile',
                                    'email',
                                    'aws.cognito.signin.user.admin' // If needed for admin actions
                                ],
                                // Load redirect URLs from environment variables
                                redirectSignIn: [import.meta.env.VITE_COGNITO_REDIRECT_SIGNIN],
                                redirectSignOut: [import.meta.env.VITE_COGNITO_REDIRECT_SIGNOUT],
                                responseType: 'code' // Standard for Hosted UI
                            }
                        }
                    }
                }
            };

            // console.log("[Header.init] Using updated config with OAuth:", updatedConfig);
            Amplify.configure(updatedConfig);
            // console.log("[Header.init] Amplify configured successfully!");
        } catch (error) {
            console.error("[Header.init] Error configuring Amplify:", error);
             // Optionally notify the user or fallback
             const container = document.getElementById(containerId);
             if (container) {
                 container.innerHTML = `<p style='color:red; text-align:center;'>Error initializing application configuration. Authentication might not work.</p>` + container.innerHTML;
             }
             return; // Stop further initialization if config fails
        }
        // --- END AMPLIFY CONFIGURATION ---

        // console.log('初始化头部组件...');
        this.loadHeader(containerId); // Keep this synchronous for initial HTML load
        // 设置全站favicon
        this.setGlobalFavicon();
        // Now check auth asynchronously
        await this.checkUserAuth();
        
        // NOW initialize I18n (it might use Header.currentUser/userSettings loaded by checkUserAuth)
        try {
            // console.log("[Header.init] Initializing I18n...");
            await I18n.init(); 
            // console.log("[Header.init] I18n initialized.");
            // Re-apply translations specifically to the header after init if needed
            const headerElement = document.getElementById(containerId);
            if(headerElement) {
                I18n.applyTranslations(headerElement); 
            }
        } catch (i18nError) {
             console.error("[Header.init] Error initializing I18n:", i18nError);
        }
    },

    /**
     * 加载头部HTML（内联方式）
     * @param {string} containerId 头部容器ID
     */
    loadHeader(containerId) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`找不到头部容器：#${containerId}`);
                return;
            }

            const rootPath = this.calculateRootPath();
            // console.log('根路径:', rootPath);

            let html = this.getHeaderTemplate();
            html = html.replace(/ROOT_PATH\//g, rootPath);
            container.innerHTML = html;
            
            this.setNavigationState();
            this.initEventListeners(); // Event listeners are set up synchronously
            // Auth check is now done in init() after loadHeader
            this.initLanguageSelector();
            
            // console.log('头部组件HTML加载完成。');
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
            <img src="ROOT_PATH/assets/images/Variant=White, Lockup=Default.png" alt="EVYD Logo" class="logo">
            <span class="logo-divider"></span>
            <div class="logo-text">
                <h1 data-translate="header.title">产品经理 AI 工作台</h1>
                <p data-translate="header.subtitle">AI驱动的产品开发助手</p>
            </div>
        </div>
        <nav class="main-nav">
            <ul>
                <li><a href="ROOT_PATH/templates/pages/Homepage.html" id="nav-home" data-translate="nav.home">工具主页</a></li>
                <li><a href="#" id="nav-ai-tools" data-translate="nav.aiTools">AI 工具</a></li>
                <li class="dropdown">
                    <a href="#" class="dropdown-toggle" id="nav-docs" data-translate="nav.docs">文档中心 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></a>
                    <div class="dropdown-menu">
                        <a href="#" id="nav-product-requirements" data-translate="nav.productRequirements">产品需求手册</a>
                        <a href="#" id="nav-api-docs" data-translate="nav.apiDocs">API文档</a>
                        <a href="#" id="nav-tutorials" data-translate="nav.tutorials">使用教程</a>
                    </div>
                </li>
                <li id="admin-panel-link" style="display: none;"><a href="javascript:void(0);" id="admin-panel-button" data-translate="nav.adminPanel">管理面板</a></li>
            </ul>
        </nav>
        <div class="user-actions">
            <!-- 语言选择器 -->
            <div class="language-selector">
                <button class="language-toggle">
                    <span id="current-language-display" data-translate="language.current">简体中文</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <div class="language-dropdown">
                    <a href="#" class="language-option" data-lang="zh-CN" data-translate="language.zhCN">简体中文</a>
                    <a href="#" class="language-option" data-lang="zh-TW" data-translate="language.zhTW">繁體中文</a>
                    <a href="#" class="language-option" data-lang="en" data-translate="language.en">English</a>
                </div>
            </div>
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
                        <a href="#" id="profile-settings" data-translate="header.userMenu.settings">账号设置</a>
                        <a href="#" id="logout-button" data-translate="common.logout">登出</a>
                    </div>
                </div>
            </div>
            <button id="login-button" class="btn-login" data-translate="common.login">登录</button>
        </div>
    </div>
</header>

<!-- 用户设置模态框 -->
<div class="modal" id="user-settings-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 data-translate="modal.settings.title">账号设置</h2>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
            <div class="settings-tabs">
                <button class="settings-tab active" data-settings="password" data-translate="modal.settings.tabPassword">修改密码</button>
                <button class="settings-tab" data-settings="api-keys" data-translate="modal.settings.tabApiKeys">API 密钥</button>
                <button class="settings-tab" data-settings="profile" data-translate="modal.settings.tabProfile">个人资料</button>
            </div>
            
            <div class="settings-content active" id="password-settings">
                <div class="form-group">
                    <label for="current-password" data-translate="modal.settings.currentPasswordLabel">当前密码</label>
                    <div class="password-input-container">
                    <input type="password" id="current-password" data-translate-placeholder="modal.settings.currentPasswordPlaceholder" placeholder="输入当前密码">
                        <button type="button" class="toggle-password-visibility" data-target="current-password" aria-label="Toggle password visibility">
                            <!-- Icon will be handled by CSS -->
                        </button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="new-password" data-translate="modal.settings.newPasswordLabel">新密码</label>
                    <div class="password-input-container">
                    <input type="password" id="new-password" data-translate-placeholder="modal.settings.newPasswordPlaceholder" placeholder="输入新密码">
                         <button type="button" class="toggle-password-visibility" data-target="new-password" aria-label="Toggle password visibility">
                            <!-- Icon will be handled by CSS -->
                        </button>
                    </div>
                    <!-- Password Policy Requirements -->
                    <ul id="password-policy-list" class="password-policy-list">
                        <li id="policy-length" class="policy-item invalid"><span class="policy-icon"></span><span class="policy-text" data-translate="policy.length">最小 8 个字符</span></li>
                        <li id="policy-number" class="policy-item invalid"><span class="policy-icon"></span><span class="policy-text" data-translate="policy.number">至少包含 1 个数字</span></li>
                        <li id="policy-special" class="policy-item invalid"><span class="policy-icon"></span><span class="policy-text" data-translate="policy.special">至少包含 1 个特殊字符</span></li>
                        <li id="policy-uppercase" class="policy-item invalid"><span class="policy-icon"></span><span class="policy-text" data-translate="policy.uppercase">至少包含 1 个大写字母</span></li>
                        <li id="policy-lowercase" class="policy-item invalid"><span class="policy-icon"></span><span class="policy-text" data-translate="policy.lowercase">至少包含 1 个小写字母</span></li>
                    </ul>
                </div>
                
                <div class="form-group">
                    <label for="confirm-password" data-translate="modal.settings.confirmPasswordLabel">确认新密码</label>
                     <div class="password-input-container">
                    <input type="password" id="confirm-password" data-translate-placeholder="modal.settings.confirmPasswordPlaceholder" placeholder="再次输入新密码">
                         <button type="button" class="toggle-password-visibility" data-target="confirm-password" aria-label="Toggle password visibility">
                            <!-- Icon will be handled by CSS -->
                        </button>
                    </div>
                </div>
                
                <div class="form-message" id="password-message"></div>
                
                <div class="form-actions">
                    <button class="btn-secondary" id="cancel-password-change" data-translate="common.cancel">取消</button>
                    <button class="btn-primary" id="submit-password-change" data-translate="modal.settings.updatePasswordButton">更新密码</button>
                </div>
            </div>
            
            <div class="settings-content" id="api-keys-settings">
                <div class="api-keys-description">
                     <p data-translate="modal.settings.apiKeysDesc">管理用于访问 AI 功能的 Dify API 密钥。这些密钥将安全地存储在您的用户设置中。</p>
                </div>
                <div class="form-group">
                    <label for="setting-userStory-key" data-translate="modal.apiKeys.userStoryTitle">User Story 生成器</label>
                     <div class="password-input-container">
                        <input type="password" id="setting-userStory-key" data-translate-placeholder="modal.settings.apiKeyPlaceholder" placeholder="输入 User Story API Key">
                        <button type="button" class="toggle-password-visibility" data-target="setting-userStory-key" aria-label="Toggle API Key visibility"></button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="setting-userManual-key" data-translate="modal.apiKeys.userManualTitle">User Manual 生成器</label>
                     <div class="password-input-container">
                        <input type="password" id="setting-userManual-key" data-translate-placeholder="modal.settings.apiKeyPlaceholder" placeholder="输入 User Manual API Key">
                         <button type="button" class="toggle-password-visibility" data-target="setting-userManual-key" aria-label="Toggle API Key visibility"></button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="setting-requirementsAnalysis-key" data-translate="modal.apiKeys.requirementsAnalysisTitle">需求分析助手</label>
                    <div class="password-input-container">
                        <input type="password" id="setting-requirementsAnalysis-key" data-translate-placeholder="modal.settings.apiKeyPlaceholder" placeholder="输入需求分析 API Key">
                         <button type="button" class="toggle-password-visibility" data-target="setting-requirementsAnalysis-key" aria-label="Toggle API Key visibility"></button>
                    </div>
                </div>
                <!-- Add UX Design Key Input -->
                <div class="form-group">
                    <label for="setting-uxDesign-key" data-translate="modal.apiKeys.uxDesignTitle">UX 界面设计 (POC)</label>
                    <div class="password-input-container">
                        <input type="password" id="setting-uxDesign-key" data-translate-placeholder="modal.settings.apiKeyPlaceholder" placeholder="输入 UX 设计 API Key">
                        <button type="button" class="toggle-password-visibility" data-target="setting-uxDesign-key" aria-label="Toggle API Key visibility"></button>
                    </div>
                </div>
                <!-- Add more API keys here if needed -->
                
                <div class="form-message" id="api-keys-settings-message"></div>
                
                <div class="form-actions">
                    <button class="btn-primary" id="submit-api-keys-change" data-translate="modal.settings.saveApiKeysButton">保存 API 密钥</button>
                </div>
            </div>
            
            <div class="settings-content" id="profile-settings-content">
                <div class="form-group">
                    <label for="profile-username" data-translate="modal.settings.profileUsernameLabel">用户名</label>
                    <input type="text" id="profile-username" disabled>
                </div>
                
                <div class="form-group">
                    <label for="profile-role" data-translate="modal.settings.profileRoleLabel">角色</label>
                    <input type="text" id="profile-role" disabled>
                </div>
                
                <div class="form-group">
                    <label for="profile-created" data-translate="modal.settings.profileCreatedLabel">创建日期</label>
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
            <h2 data-translate="modal.apiKeys.title">API 密钥管理</h2>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
            <div class="api-keys-description">
                <p data-translate="modal.apiKeys.description">这里您可以查看您的 Dify API 密钥，这些密钥用于连接到 Dify 服务并使用 AI 功能。</p>
            </div>
            
            <div class="api-keys-list">
                <div class="api-key-item">
                    <div class="api-key-info">
                        <h4 data-translate="modal.apiKeys.userStoryTitle">User Story 生成器</h4>
                        <p data-translate="modal.apiKeys.userStoryDesc">用于生成用户故事的 Dify Workflow API Key</p>
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
                        <h4 data-translate="modal.apiKeys.userManualTitle">User Manual 生成器</h4>
                        <p data-translate="modal.apiKeys.userManualDesc">用于生成用户手册的 Dify Agent API Key</p>
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
                        <h4 data-translate="modal.apiKeys.requirementsAnalysisTitle">需求分析助手</h4>
                        <p data-translate="modal.apiKeys.requirementsAnalysisDesc">用于需求分析的 Dify API Key</p>
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
                        <h4 data-translate="modal.apiKeys.uxDesignTitle">UX 界面设计</h4>
                        <p data-translate="modal.apiKeys.uxDesignDesc">用于生成界面设计提示词的 Dify API Key</p>
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
            <h2 data-translate="modal.admin.title">管理员面板</h2>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
            <div class="admin-tabs">
                <button class="admin-tab active" data-admin-tab="users" data-translate="modal.admin.tabUsers">用户管理</button>
                <button class="admin-tab" data-admin-tab="api-keys" data-translate="modal.admin.tabApiKeys">API Key 配置</button>
                <button class="admin-tab" data-admin-tab="api-endpoints" data-translate="modal.admin.tabApiEndpoints">API 地址配置</button>
            </div>
            
            <div class="admin-content active" id="users-management">
                <div class="users-table-container">
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th data-translate="modal.admin.usersTable.id">ID</th>
                                <th data-translate="modal.admin.usersTable.username">用户名</th>
                                <th data-translate="modal.admin.usersTable.role">角色</th>
                                <th data-translate="modal.admin.usersTable.createdDate">创建日期</th>
                                <th data-translate="modal.admin.usersTable.actions">操作</th>
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
                    <p data-translate="modal.admin.apiKeysDesc">在这里您可以为每个用户配置不同的 Dify API 密钥。</p>
                </div>
                
                <div class="user-select-container">
                    <label for="api-key-config-user-select" data-translate="modal.admin.selectUserLabel">选择用户</label>
                    <select id="api-key-config-user-select">
                        <!-- 用户选项将在这里动态生成 -->
                    </select>
                </div>
                
                <div class="api-keys-config">
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4 data-translate="modal.apiKeys.userStoryTitle">User Story 生成器</h4>
                            <p data-translate="modal.apiKeys.userStoryDesc">用于生成用户故事的 Dify Workflow API Key</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="user-specific-userStory-api-key" data-translate-placeholder="modal.admin.apiKeyPlaceholder" placeholder="输入 API Key">
                        </div>
                    </div>
                    
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4 data-translate="modal.apiKeys.userManualTitle">User Manual 生成器</h4>
                            <p data-translate="modal.apiKeys.userManualDesc">用于生成用户手册的 Dify Agent API Key</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="user-specific-userManual-api-key" data-translate-placeholder="modal.admin.apiKeyPlaceholder" placeholder="输入 API Key">
                        </div>
                    </div>
                    
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4 data-translate="modal.apiKeys.requirementsAnalysisTitle">需求分析助手</h4>
                            <p data-translate="modal.apiKeys.requirementsAnalysisDesc">用于需求分析的 Dify API Key</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="user-specific-requirementsAnalysis-api-key" data-translate-placeholder="modal.admin.apiKeyPlaceholder" placeholder="输入 API Key">
                        </div>
                    </div>
                    
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4 data-translate="modal.apiKeys.uxDesignTitle">UX 界面设计</h4>
                            <p data-translate="modal.apiKeys.uxDesignDesc">用于生成界面设计提示词的 Dify API Key</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="user-specific-uxDesign-api-key" data-translate-placeholder="modal.admin.apiKeyPlaceholder" placeholder="输入 API Key">
                        </div>
                    </div>
                </div>
                
                <div class="form-message" id="admin-api-keys-message"></div>
                
                <div class="form-actions">
                    <button class="btn-primary" id="save-api-keys-button" data-translate="modal.admin.saveApiKeysButton">保存 API Keys</button>
                </div>
            </div>

            <div class="admin-content" id="api-endpoints-management">
                <div class="api-keys-management-description">
                    <p data-translate="modal.admin.apiEndpointsDesc">在这里您可以配置全局的Dify API地址，所有用户都将使用这些地址进行API调用。</p>
                </div>
                
                <div class="api-keys-config">
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4 data-translate="modal.apiKeys.userStoryTitle">User Story 生成器</h4>
                            <p data-translate="modal.admin.userStoryEndpointDesc">用于生成用户故事的 Dify Workflow API 地址</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="global-userStory-api-endpoint" data-translate-placeholder="modal.admin.apiEndpointPlaceholder" placeholder="输入 API 地址，例如 http://localhost">
                        </div>
                    </div>
                    
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4 data-translate="modal.apiKeys.userManualTitle">User Manual 生成器</h4>
                            <p data-translate="modal.admin.userManualEndpointDesc">用于生成用户手册的 Dify Agent API 地址</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="global-userManual-api-endpoint" data-translate-placeholder="modal.admin.apiEndpointPlaceholder" placeholder="输入 API 地址，例如 http://localhost">
                        </div>
                    </div>
                    
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4 data-translate="modal.apiKeys.requirementsAnalysisTitle">需求分析助手</h4>
                            <p data-translate="modal.admin.requirementsAnalysisEndpointDesc">用于需求分析的 Dify API 地址</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="global-requirementsAnalysis-api-endpoint" data-translate-placeholder="modal.admin.apiEndpointPlaceholder" placeholder="输入 API 地址，例如 http://localhost">
                        </div>
                    </div>
                    
                    <div class="api-key-config-item">
                        <div class="api-key-info">
                            <h4 data-translate="modal.apiKeys.uxDesignTitle">UX 界面设计</h4>
                            <p data-translate="modal.admin.uxDesignEndpointDesc">用于生成界面设计提示词的 Dify API 地址</p>
                        </div>
                        <div class="api-key-input">
                            <input type="text" id="global-uxDesign-api-endpoint" data-translate-placeholder="modal.admin.apiEndpointPlaceholder" placeholder="输入 API 地址，例如 http://localhost">
                        </div>
                    </div>
                </div>
                
                <div class="form-message" id="api-endpoints-message"></div>
                
                <div class="form-actions">
                    <button class="btn-primary" id="save-global-api-endpoints-button" data-translate="modal.admin.saveApiEndpointsButton">保存 API 地址</button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- 添加/编辑用户模态框 -->
<div class="modal" id="edit-user-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 id="edit-user-title" data-translate="modal.editUser.titleAdd">添加用户</h2>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label for="user-edit-username" data-translate="modal.editUser.usernameLabel">用户名</label>
                <input type="text" id="user-edit-username" data-translate-placeholder="modal.editUser.usernamePlaceholder" placeholder="输入用户名">
            </div>
            
            <div class="form-group">
                <label for="user-edit-password" data-translate="modal.editUser.passwordLabel">密码</label>
                <input type="password" id="user-edit-password" data-translate-placeholder="modal.editUser.passwordPlaceholder" placeholder="输入密码">
                <p class="form-help" id="password-help" data-translate="modal.editUser.passwordHelpAdd">留空则使用默认密码: password123</p>
            </div>
            
            <div class="form-group">
                <label for="user-edit-role" data-translate="modal.editUser.roleLabel">角色</label>
                <select id="user-edit-role">
                    <option value="user" data-translate="modal.editUser.roleUser">普通用户</option>
                    <option value="admin" data-translate="modal.editUser.roleAdmin">管理员</option>
                </select>
            </div>
            
            <div class="form-message" id="edit-user-message"></div>
            
            <div class="form-actions">
                <button class="btn-secondary" id="cancel-edit-user" data-translate="common.cancel">取消</button>
                <button class="btn-primary" id="save-edit-user" data-translate="common.save">保存</button>
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
        // console.log('当前路径:', currentPath);
        
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
     * 初始化事件监听 (Updated for async auth)
     */
    initEventListeners() {
        // console.log('初始化头部事件监听...');
        const container = document.getElementById('header-container');
        if (!container) return; // Ensure container exists before adding listeners

        // --- Use Event Delegation for dynamically added elements --- 
        container.addEventListener('click', async (event) => {

            // 登录按钮 (Redirect to Hosted UI)
            if (event.target.matches('#login-button')) {
                event.preventDefault();
                // console.log("Login button clicked, redirecting to hosted UI...");
                this.showLoading('跳转到登录页面...'); // Translate this?
                try {
                     // Use Amplify's function to redirect to the Hosted UI (v6)
                    await signInWithRedirect(); // Changed from federatedSignIn
                    // Note: Browser will navigate away, hideLoading might not execute here
                } catch (error) {
                     this.hideLoading(); // Hide loading on error
                     // Log the detailed error object to the console
                     console.error("[Login Error] Failed to redirect to hosted UI:", error);
                     // Provide a more informative alert if possible, fallback to generic
                     const errorMessage = error instanceof Error ? error.message : String(error);
                     alert(`无法跳转到登录页面，请稍后再试。\n错误详情: ${errorMessage}`);
                }
            }

            // 登出按钮 (Use Amplify signOut, handles redirect)
            if (event.target.matches('#logout-button')) {
                event.preventDefault();
                this.showLoading('登出中...'); 
                try {
                    // Calling signOut with oauth configured triggers redirect
                    await signOut({ global: true }); // global:true invalidates tokens everywhere
                    // Redirect is handled by Amplify based on oauth.redirectSignOut
                     // console.log("Sign out initiated. Amplify will handle redirect.");
                     // hideLoading might be preempted by redirect
                     // this.hideLoading(); 
                } catch (error) {
                    this.hideLoading();
                    console.error('Amplify sign out error:', error);
                    // Use the error object directly for potentially more details
                    alert(`登出失败: ${error}`); 
                }
            }

            // 账号设置按钮 (Now also loads API Keys)
            if (event.target.matches('#profile-settings')) {
                event.preventDefault();
                const settingsModal = document.getElementById('user-settings-modal');
                if (settingsModal) {
                    // Reset to default tab (e.g., password) on open
                    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                    document.querySelector('.settings-tab[data-settings="password"]')?.classList.add('active');
                    document.querySelectorAll('.settings-content').forEach(c => c.classList.remove('active'));
                    document.getElementById('password-settings')?.classList.add('active');
                    
                    settingsModal.style.display = 'block';
                    await this.loadUserProfileAndApiKeys(); // Load data into modal
                }
        }
        
        // 管理面板按钮
            if (event.target.matches('#admin-panel-button')) {
                event.preventDefault();
                const adminModal = document.getElementById('admin-panel-modal');
                if (adminModal) {
                    adminModal.style.display = 'block';
                    this.initAdminPanel(); // Initialize admin panel tabs/data
                }
            }
            
            // 模态框关闭按钮 (Trigger form reset)
            if (event.target.matches('.close-modal')) {
                const modal = event.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                    if (modal.id === 'user-settings-modal') {
                        this.clearPasswordForm(); // Clear form on close
                    }
                }
            }
            
            // 设置标签页切换 (Handles new API Keys tab)
            if (event.target.matches('.settings-tab')) {
                const activeTab = event.target;
                document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                activeTab.classList.add('active');
                const settingsType = activeTab.getAttribute('data-settings');
                document.querySelectorAll('.settings-content').forEach(content => content.classList.remove('active'));
                // Construct ID based on convention (e.g., password-settings, api-keys-settings)
                document.getElementById(`${settingsType}-settings`)?.classList.add('active');
                 // Special case for profile ID which might be different
                 if (settingsType === 'profile') {
                     document.getElementById('profile-settings-content')?.classList.add('active');
                 }
            }
        
        // 管理员面板标签页切换
            if (event.target.matches('.admin-tab')) {
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                event.target.classList.add('active');
                const tabType = event.target.getAttribute('data-admin-tab');
                document.querySelectorAll('.admin-content').forEach(content => content.classList.remove('active'));
                
                let contentId = '';
                if (tabType === 'users') {
                    contentId = 'users-management';
                    this.loadUsersList(); // Will likely need changes or be disabled
                } else if (tabType === 'api-keys') {
                    contentId = 'api-keys-management';
                    this.loadApiKeysConfig(); // Will likely need changes
                } else if (tabType === 'api-endpoints') {
                    contentId = 'api-endpoints-management';
                    await this.loadApiEndpointsConfig(); // Made async
                }
                
                document.getElementById(contentId)?.classList.add('active');
            }
            
            // 密码修改提交 (No functional change, just uses toggle logic below)
            if (event.target.matches('#submit-password-change')) {
                await this.handlePasswordChange(); 
            }
            
            // Toggle Password Visibility ("eye" icon)
            if (event.target.matches('.toggle-password-visibility')) {
                const button = event.target;
                const targetInputId = button.getAttribute('data-target');
                const targetInput = document.getElementById(targetInputId);
                if (targetInput) {
                    const isPassword = targetInput.type === 'password';
                    targetInput.type = isPassword ? 'text' : 'password';
                    // Toggle button appearance (e.g., change icon via CSS class)
                    button.classList.toggle('active', isPassword);
                }
            }

            // Explicitly handle cancel password change button (Trigger form reset)
            if (event.target.matches('#cancel-password-change')) {
                const modal = event.target.closest('#user-settings-modal');
                if (modal) {
                    modal.style.display = 'none';
                    this.clearPasswordForm(); // Clear form on cancel
                }
            }

            // 添加用户按钮 (Admin Panel - Functionality TBD)
            if (event.target.matches('#add-user-button')) {
                console.warn("Add user functionality needs rework for Amplify Cognito.");
                alert("添加用户功能需要针对Amplify Cognito进行调整。");
                // document.getElementById('edit-user-modal').style.display = 'block';
            }

            // 保存用户按钮 (Admin Panel - Functionality TBD)
            if (event.target.matches('#save-edit-user')) {
                 console.warn("Save user functionality needs rework for Amplify Cognito.");
                 alert("保存用户功能需要针对Amplify Cognito进行调整。");
            }

            // 保存用户特定 API Keys 按钮 (Admin Panel)
            if (event.target.matches('#save-api-keys-button')) {
                // Renamed the handler to avoid confusion and ensure it's not called accidentally
                await this.handleAdminSaveUserApiKeys_Placeholder(); 
            }

            // 保存全局 API Endpoints 按钮 (Admin Panel)
            if (event.target.matches('#save-global-api-endpoints-button')) {
                 await this.handleSaveGlobalApiEndpoints(); // Needs implementation
            }

            // 清理脏数据按钮 (Admin Panel - Functionality TBD)
            if (event.target.matches('#cleanup-users-button')) {
                console.warn("Cleanup users functionality needs rework for Amplify Cognito.");
                alert("清理用户功能需要针对Amplify Cognito进行调整。");
            }

            // --- User action buttons within user table (Admin Panel - Functionality TBD) ---
             if (event.target.matches('.edit-user-btn')) {
                console.warn("Edit user functionality needs rework for Amplify Cognito.");
                alert("编辑用户功能需要针对Amplify Cognito进行调整。");
                // const userId = event.target.getAttribute('data-user-id');
                // this.openEditUserModal(userId);
            }
             if (event.target.matches('.delete-user-btn')) {
                console.warn("Delete user functionality needs rework for Amplify Cognito.");
                 alert("删除用户功能需要针对Amplify Cognito进行调整。");
               // const userId = event.target.getAttribute('data-user-id');
               // const username = event.target.getAttribute('data-username');
               // if (confirm(`确定要删除用户 ${username} (ID: ${userId}) 吗？`)) {
               //     this.handleDeleteUser(userId);
               // }
            }

            // Save API Keys button (From User Settings Modal)
            if (event.target.matches('#submit-api-keys-change')) {
                await this.handleSaveApiKeys(); // Ensure this calls the NEW function below
            }

        });
        
        // Handle modal closing when clicking outside (Trigger form reset)
         window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
                if (event.target.id === 'user-settings-modal') {
                     this.clearPasswordForm(); // Clear form on clicking outside
                    }
                }
            });

         // Handle language selection dropdown
         this.initLanguageSelectorListeners(container);

        // --- Add Password Policy Validation Listener ---
        const newPasswordInput = container.querySelector('#new-password');
        const passwordPolicyList = container.querySelector('#password-policy-list');
        const submitPasswordButton = container.querySelector('#submit-password-change');

        if (newPasswordInput && passwordPolicyList && submitPasswordButton) {
            // Initially disable submit button
            submitPasswordButton.disabled = true;
            submitPasswordButton.style.opacity = '0.5'; // Visual cue

            newPasswordInput.addEventListener('input', () => {
                const password = newPasswordInput.value;
                let allValid = true;

                // 1. Length check
                const lengthValid = password.length >= 8;
                this.updatePolicyStatus('policy-length', lengthValid);
                if (!lengthValid) allValid = false;

                // 2. Number check
                const numberValid = /[0-9]/.test(password);
                this.updatePolicyStatus('policy-number', numberValid);
                 if (!numberValid) allValid = false;

                // 3. Special character check
                const specialValid = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password);
                this.updatePolicyStatus('policy-special', specialValid);
                 if (!specialValid) allValid = false;

                // 4. Uppercase check
                const uppercaseValid = /[A-Z]/.test(password);
                this.updatePolicyStatus('policy-uppercase', uppercaseValid);
                 if (!uppercaseValid) allValid = false;

                // 5. Lowercase check
                const lowercaseValid = /[a-z]/.test(password);
                this.updatePolicyStatus('policy-lowercase', lowercaseValid);
                 if (!lowercaseValid) allValid = false;

                // Enable/disable submit button
                submitPasswordButton.disabled = !allValid;
                 submitPasswordButton.style.opacity = allValid ? '1' : '0.5';
            });
        }
        // --- End Password Policy Validation Listener ---

        // console.log('头部事件监听初始化完成。');
    },
    
    /** Helper function to update policy item status */
    updatePolicyStatus(elementId, isValid) {
        const element = document.getElementById(elementId);
        const textElement = element?.querySelector('.policy-text');
        if (element && textElement) {
             const translationKey = textElement.getAttribute('data-translate');
             if (translationKey) {
                 // Re-apply translation when status changes
                 textElement.textContent = t(translationKey); 
             }
             if (isValid) {
                 element.classList.remove('invalid');
                 element.classList.add('valid');
             } else {
                 element.classList.remove('valid');
                 element.classList.add('invalid');
             }
         }
     },

    /** Helper function to clear password change form */
    clearPasswordForm() {
        // console.log("Clearing password change form...");
        const currentPasswordInput = document.getElementById('current-password');
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const messageElement = document.getElementById('password-message');
        const submitButton = document.getElementById('submit-password-change');
        const policyItems = document.querySelectorAll('#password-policy-list .policy-item');

        if (currentPasswordInput) currentPasswordInput.value = '';
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
        if (messageElement) {
            messageElement.textContent = '';
            messageElement.className = 'form-message';
        }
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.style.opacity = '0.5';
        }
        policyItems.forEach(item => {
            item.classList.remove('valid');
            item.classList.add('invalid');
             // Re-apply initial translation from data-translate
             const textElement = item.querySelector('.policy-text');
             const translationKey = textElement?.getAttribute('data-translate');
             if (textElement && translationKey) {
                 textElement.textContent = t(translationKey);
             }
        });
        // Reset password visibility toggles if needed
        document.querySelectorAll('.toggle-password-visibility.active').forEach(btn => {
            const targetInput = document.getElementById(btn.getAttribute('data-target'));
            if(targetInput) targetInput.type = 'password';
            btn.classList.remove('active');
        });
    },
    
    /**
     * 初始化管理员面板 (部分功能待定)
     */
    initAdminPanel() {
        // console.log('初始化管理员面板...');
        // 默认加载用户列表（或提示功能调整）
        this.loadUsersList();
        // Reset tabs
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.admin-tab[data-admin-tab="users"]')?.classList.add('active');
        document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
        document.getElementById('users-management')?.classList.add('active');
    },
    
    /**
     * 加载用户列表 (管理员 - 功能待调整)
     */
    loadUsersList() {
        // console.warn("loadUsersList: User listing/management needs rework...");
        const tableBody = document.getElementById('users-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" data-translate="modal.admin.usersTable.needsRework">用户管理功能需要针对 Amplify Cognito 进行调整。请使用 AWS Cognito 控制台管理用户。</td></tr>';
            // Apply translation if I18n is available
            if (typeof I18n !== 'undefined') {
                 I18n.applyTranslations(tableBody);
            }
        }
        // // Placeholder - Real implementation requires Cognito Admin SDK or similar
        // const users = []; // Replace with actual user fetch logic if possible
        // const tableBody = document.getElementById('users-table-body');
        // if (!tableBody) return;
        // tableBody.innerHTML = ''; // Clear existing
        // users.forEach(user => {
        //     const row = tableBody.insertRow();
        //     row.innerHTML = `
        //         <td>${user.id}</td>
        //         <td>${user.username}</td>
        //         <td>${user.role}</td>
        //         <td>${new Date(user.created).toLocaleDateString()}</td>
        //         <td>
        //             <button class="btn-icon edit-user-btn" data-user-id="${user.id}">编辑</button>
        //             <button class="btn-icon delete-user-btn" data-user-id="${user.id}" data-username="${user.username}">删除</button>
        //         </td>
        //     `;
        // });
    },
    
    /**
     * 绑定用户操作按钮事件 (管理员 - 功能待调整)
     */
    bindUserActions() {
        // This logic is moved to the main event listener using delegation
         console.warn("bindUserActions is deprecated, using event delegation.");
    },

    /**
      * 处理删除用户 (管理员 - 功能待调整)
      */
    handleDeleteUser(userId) {
         console.warn("handleDeleteUser: Needs rework for Amplify Cognito.", userId);
         alert("删除用户功能需要针对Amplify Cognito进行调整。");
        // // Requires Admin API call to Cognito
        // const success = AdminService.deleteCognitoUser(userId); // Example
        // if (success) {
        //     this.showFormMessage('admin-message', '用户删除成功', 'success');
        //     this.loadUsersList();
        // } else {
        //     this.showFormMessage('admin-message', '用户删除失败', 'error');
        // }
    },

    /**
     * 加载 API Key 配置 (管理员 - 功能待调整)
     */
    async loadApiKeysConfig() {
         console.warn("loadApiKeysConfig: User listing/management needs rework for Amplify Cognito.");
         const userSelect = document.getElementById('api-key-config-user-select');
         if(!userSelect) return;
         userSelect.innerHTML = '<option data-translate="modal.admin.loadUsersError">加载用户列表出错或功能待调整</option>';
         // Clear fields
         document.getElementById('user-specific-userStory-api-key').value = '';
         document.getElementById('user-specific-userManual-api-key').value = '';
         document.getElementById('user-specific-requirementsAnalysis-api-key').value = '';
         // Apply translation if I18n is available
         if (typeof I18n !== 'undefined') {
                I18n.applyTranslations(userSelect.parentElement);
         }

        // // Placeholder - Requires fetching Cognito users and then their settings
        // try {
        //     const users = await AdminService.listCognitoUsers(); // Example
        //     const userSelect = document.getElementById('api-key-config-user-select');
        //     if (!userSelect) return;
        //     userSelect.innerHTML = '<option value="">-- 选择用户 --</option>';
        //     users.forEach(user => {
        //         const option = document.createElement('option');
        //         option.value = user.id; // Use Cognito sub as ID
        //         option.textContent = user.username;
        //         userSelect.appendChild(option);
        //     });

        //     userSelect.addEventListener('change', async (e) => {
        //         const selectedUserId = e.target.value;
        //         if (selectedUserId) {
        //             // Fetch settings for this specific user (requires admin privileges on GraphQL query or separate fetch logic)
        //             const settings = await AdminService.getUserSettings(selectedUserId); // Example
        //             document.getElementById('user-specific-userStory-api-key').value = settings?.apiKeys?.userStory || '';
        //             document.getElementById('user-specific-userManual-api-key').value = settings?.apiKeys?.userManual || '';
        //             document.getElementById('user-specific-requirementsAnalysis-api-key').value = settings?.apiKeys?.requirementsAnalysis || '';
        //         } else {
        //             // Clear fields
        //         }
        //     });

        // } catch (error) {
        //     console.error("Error loading users for API key config:", error);
        //     userSelect.innerHTML = '<option>加载用户列表失败</option>';
        // }
    },

    /**
     * 处理保存用户特定API Keys (管理员 - 功能待调整)
     */
     async handleSaveUserApiKeys() {
         console.warn("handleSaveUserApiKeys: Needs rework for Amplify Cognito & GraphQL permissions.");
         alert("保存用户API Keys功能需要针对Amplify Cognito和后台权限进行调整。");
         const userId = document.getElementById('api-key-config-user-select').value;
                if (!userId) {
             showFormMessage('admin-api-keys-message', '请先选择一个用户', 'error');
                    return;
                }
                
         // // Requires admin permissions to save settings for *other* users
         // const settingsInput = {
         //     id: userId,
         //     apiKeys: {
         //         userStory: document.getElementById('user-specific-userStory-api-key').value,
         //         userManual: document.getElementById('user-specific-userManual-api-key').value,
         //         requirementsAnalysis: document.getElementById('user-specific-requirementsAnalysis-api-key').value,
         //     }
         //     // Role might need to be preserved or fetched first if not updating it here
         // };

         // try {
         //     await AdminService.updateUserSettings(settingsInput); // Example admin mutation
         //     this.showFormMessage('admin-api-keys-message', 'API Keys 保存成功', 'success');
         // } catch (error) {
         //     console.error("Error saving user API keys:", error);
         //     this.showFormMessage('admin-api-keys-message', `保存失败: ${error.message}`, 'error');
         // }
     },

    /**
     * 加载全局 API Endpoints 配置 (管理员)
     */
    async loadApiEndpointsConfig() {
        // console.log('加载全局 API Endpoints 配置...');
        this.showLoading('加载配置...');
        const messageElementId = 'api-endpoints-message'; // Define for error message
        try {
            const config = await getGlobalConfig(); // Use the new async function
            this.hideLoading();
            if (config && config.apiEndpoints) {
                document.getElementById('global-userStory-api-endpoint').value = config.apiEndpoints.userStory ?? '';
                document.getElementById('global-userManual-api-endpoint').value = config.apiEndpoints.userManual ?? '';
                document.getElementById('global-requirementsAnalysis-api-endpoint').value = config.apiEndpoints.requirementsAnalysis ?? '';
                // Add loading for uxDesign
                document.getElementById('global-uxDesign-api-endpoint').value = config.apiEndpoints.uxDesign ?? ''; 
                        } else {
                 // console.warn('Global config not found or apiEndpoints missing. Needs creation.');
                 // Clear fields or show message
                 showFormMessage(messageElementId, '全局配置尚未创建，请先保存一次。', 'info'); // Use info type
                 // Clear fields explicitly
                 document.getElementById('global-userStory-api-endpoint').value = '';
                 document.getElementById('global-userManual-api-endpoint').value = '';
                 document.getElementById('global-requirementsAnalysis-api-endpoint').value = '';
                 document.getElementById('global-uxDesign-api-endpoint').value = '';
                        }
                    } catch (error) {
             this.hideLoading();
            console.error("Error loading global API endpoints config:", error);
            showFormMessage(messageElementId, '加载全局配置失败', 'error'); // Use imported function
                    }
    },
    
    /**
     * 处理保存全局API Endpoints (管理员)
     */
    async handleSaveGlobalApiEndpoints() {
        // console.log('保存全局 API Endpoints...');
        const messageElementId = 'api-endpoints-message'; // Define for messages
        const configInput = {
            apiEndpoints: {
                userStory: document.getElementById('global-userStory-api-endpoint').value,
                userManual: document.getElementById('global-userManual-api-endpoint').value,
                requirementsAnalysis: document.getElementById('global-requirementsAnalysis-api-endpoint').value,
                 // Add reading for uxDesign
                 uxDesign: document.getElementById('global-uxDesign-api-endpoint').value 
            }
        };

        // Ensure the input structure is valid (basic check)
        if (!configInput || !configInput.apiEndpoints) {
            console.error("Invalid global config format provided for saving.");
             showFormMessage(messageElementId, '无效的配置格式', 'error'); 
            return; // Changed from return null
        }

        this.showLoading('保存中...');
        try {
            const result = await saveGlobalConfig(configInput); // Use the new async function
             this.hideLoading();
            if (result) {
                 showFormMessage(messageElementId, 'API 地址保存成功', 'success');
            } else {
                 // Error should have been caught by saveGlobalConfig, but double-check
                 showFormMessage(messageElementId, '保存失败，请检查权限或查看控制台日志。', 'error');
            }
        } catch (error) { // Catch potential network errors etc.
             this.hideLoading();
            console.error("Error saving global API endpoints:", error);
            showFormMessage(messageElementId, `保存失败: ${error.message}`, 'error');
        }
    },


    /**
     * 检查用户认证状态并更新UI (Updated for Amplify)
     */
    async checkUserAuth() {
        // console.log('检查 Amplify 用户认证状态...');
        this.showLoading('检查登录状态...'); 
        const authInfo = await checkAuth(); // Returns { user, groups } or null
        this.hideLoading();

        const userInfo = document.getElementById('user-info');
        const loginButton = document.getElementById('login-button');
        const usernameDisplay = document.getElementById('username-display');
        const adminPanelLink = document.getElementById('admin-panel-link');
        
        if (authInfo && authInfo.user) {
            this.currentUser = authInfo.user;
            const userGroups = authInfo.groups;
            // console.log('用户已登录 (Amplify):', this.currentUser.username, 'Groups:', userGroups);
            
            // 用户已登录 - 更新UI
            if (userInfo) userInfo.style.display = 'flex';
            if (loginButton) loginButton.style.display = 'none';
            if (usernameDisplay) usernameDisplay.textContent = this.currentUser.username;

            // 尝试获取用户在 DynamoDB 中的设置
            this.userSettings = await getCurrentUserSettings();
            // console.log("用户设置 (from DB):", this.userSettings);

            // 如果 DynamoDB 中没有用户设置记录 (例如首次登录)
            if (!this.userSettings) {
                 // console.log("No user settings found in DB, attempting to create initial record...");
                 // 根据 Cognito 组决定初始角色 (Use lowercase 'admin' to match Cognito group name)
                 const initialRole = userGroups.includes('admin') ? 'admin' : 'user';
                 // console.log(`Initial role based on Cognito groups: ${initialRole}`);
                 
                 try {
                      // 调用保存函数创建记录，提供初始角色和空的 apiKeys
                      // Also include initial language, defaulting to browser or 'zh-CN'
                     const defaultLang = navigator.language || 'zh-CN'; // Use browser lang or default
                     const initialSettings = { 
                         role: initialRole, 
                         language: defaultLang, 
                         apiKeys: {} 
                     }; 
                     const createdSettings = await saveCurrentUserSetting(initialSettings);
                     
                     if (createdSettings) {
                         // console.log("Successfully created initial user settings:", createdSettings);
                         this.userSettings = createdSettings; // 更新 Header 对象的 userSettings
                     } else {
                          console.error("Failed to create initial user settings record in DB.");
                           // 即使创建失败，也继续，但用户可能没有角色信息
                           this.userSettings = null; 
                     }
                 } catch (creationError) {
                     console.error("Error creating initial user settings:", creationError);
                     this.userSettings = null;
                 }
            }

            // 检查管理员权限 (现在基于 this.userSettings, 可能刚刚创建)
            const isAdminUser = this.userSettings && this.userSettings.role === 'admin';
            if (isAdminUser) {
                 // console.log('用户是管理员 (based on userSettings.role)');
                 if (adminPanelLink) adminPanelLink.style.display = 'block';
            } else {
                 // console.log('用户不是管理员 (based on userSettings.role)', this.userSettings);
                 if (adminPanelLink) adminPanelLink.style.display = 'none';
            }
            
        } else {
             // console.log('用户未登录 (Amplify)');
             // 用户未登录 - 更新UI
             this.currentUser = null;
             this.userSettings = null;
             if (userInfo) userInfo.style.display = 'none';
             if (loginButton) loginButton.style.display = 'block';
             if (adminPanelLink) adminPanelLink.style.display = 'none';
        }
    },

    /**
     * 处理登录逻辑 (Updated for Amplify)
     */
    async handleLogin() {
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const messageElement = document.getElementById('login-message');

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!username || !password) {
            showFormMessage('login-message', '请输入用户名和密码', 'error');
            return;
        }
        
        showFormMessage('login-message', '登录中...', 'info');
        this.showLoading('登录中...');

        try {
            const result = await login(username, password); // Use new async login
            this.hideLoading();
        
        if (result.success) {
                messageElement.textContent = '';
                messageElement.className = 'form-message';
                document.getElementById('login-modal').style.display = 'none'; // Close modal
                // Update UI immediately or rely on checkUserAuth triggered by reload/navigation
                // For simplicity, let's reload or let checkUserAuth handle UI update on next load
                // await this.checkUserAuth(); // Update header UI immediately
                 window.location.reload(); // Easiest way to refresh state across app

        } else {
                showFormMessage('login-message', result.message || '登录失败', 'error');
            }
        } catch (error) {
            // Should be caught by login(), but just in case
            this.hideLoading();
            console.error("Unexpected error during login handling:", error);
            showFormMessage('login-message', '发生意外错误，请稍后再试', 'error');
        }
    },

    /**
     * 处理密码修改逻辑 (Updated for Amplify)
     */
    async handlePasswordChange() {
        const currentPasswordInput = document.getElementById('current-password');
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const messageElement = document.getElementById('password-message');

        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            showFormMessage('password-message', '所有字段均为必填项', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showFormMessage('password-message', '新密码和确认密码不匹配', 'error');
            return;
        }
        
        // Add basic password complexity check if needed here
        // if (newPassword.length < 8) { ... }

        showFormMessage('password-message', '正在更新密码...', 'info');
        this.showLoading('更新密码...');

        try {
            const result = await changePassword(currentPassword, newPassword); // Use new async function
            this.hideLoading();

            if (result.success) {
                showFormMessage('password-message', '密码更新成功！', 'success');
                // Clear fields after success
                currentPasswordInput.value = '';
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';
                // Optionally close modal after a delay
            setTimeout(() => {
                    const modal = document.getElementById('user-settings-modal');
                    if (modal) modal.style.display = 'none';
                    messageElement.textContent = '';
                     messageElement.className = 'form-message';
                }, 2000);
        } else {
                showFormMessage('password-message', result.message || '密码更新失败', 'error');
            }
        } catch (error) {
             this.hideLoading();
             console.error("Unexpected error during password change:", error);
             showFormMessage('password-message', '发生意外错误，请稍后再试', 'error');
        }
    },


    /**
     * 加载用户 API Keys 到设置模态框 (Updated for Amplify)
     */
    async loadUserApiKeys() {
        // This function seems specific to the *admin* panel API key config
        // User settings should load their *own* keys in a different modal/section if needed
        // Let's assume this is for the *currently logged in* user viewing their own keys.

        // console.log('加载用户 API Keys...');
        const userStoryKeyInput = document.getElementById('userStory-api-key'); // Assuming IDs in a user-facing modal
        const userManualKeyInput = document.getElementById('userManual-api-key');
        const requirementsAnalysisKeyInput = document.getElementById('requirementsAnalysis-api-key');
        // const uxDesignKeyInput = document.getElementById('uxDesign-api-key');

        // Ensure settings are loaded
        if (!this.userSettings && this.currentUser) {
            this.userSettings = await getCurrentUserSettings();
        }

        if (this.userSettings && this.userSettings.apiKeys) {
            if (userStoryKeyInput) userStoryKeyInput.value = this.userSettings.apiKeys.userStory || '';
            if (userManualKeyInput) userManualKeyInput.value = this.userSettings.apiKeys.userManual || '';
            if (requirementsAnalysisKeyInput) requirementsAnalysisKeyInput.value = this.userSettings.apiKeys.requirementsAnalysis || '';
             // if (uxDesignKeyInput) uxDesignKeyInput.value = this.userSettings.apiKeys.uxDesign || '';
        } else {
            // Clear fields if no settings found
             if (userStoryKeyInput) userStoryKeyInput.value = '';
            if (userManualKeyInput) userManualKeyInput.value = '';
            if (requirementsAnalysisKeyInput) requirementsAnalysisKeyInput.value = '';
        }
    },

    /**
     * 显示表单消息
     * @param {string} elementId 消息元素ID
     * @param {string} message 消息内容
     * @param {'info'|'success'|'error'} type 消息类型
     */
    showFormMessage(elementId, message, type) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.className = `form-message ${type}`;
        } else {
            console.warn(`showFormMessage: Element with ID ${elementId} not found.`);
        }
    },

     /** Helper for showing loading overlay */
     showLoading(message = '加载中...') {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10000; color: white; font-size: 1.2em;';
            document.body.appendChild(overlay);
        }
        overlay.textContent = message;
        overlay.style.display = 'flex';
    },

    /** Helper for hiding loading overlay */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    /**
     * 初始化语言选择器
     */
    initLanguageSelector() {
        // Only set up structure, don't rely on I18n yet
        const display = document.getElementById('current-language-display');
        if (display) {
            // Set initial text based on default or leave blank until I18n loads?
            // Let's set a default, I18n.init will update it.
             const langCode = localStorage.getItem('language') || 'zh-CN'; // Use LS as initial guess
             display.textContent = I18n.supportedLanguages[langCode] || 'Language';
        }
        // Event listeners are set up in initLanguageSelectorListeners
    },
    
    initLanguageSelectorListeners(container) {
         const languageToggle = container.querySelector('.language-toggle');
         const languageDropdown = container.querySelector('.language-dropdown');
         const languageOptions = container.querySelectorAll('.language-option');

         if (languageToggle && languageDropdown) {
             languageToggle.addEventListener('click', (e) => {
                 e.stopPropagation();
                 languageDropdown.style.display = languageDropdown.style.display === 'block' ? 'none' : 'block';
             });

            languageOptions.forEach(option => {
                 option.addEventListener('click', async (e) => {
                    e.preventDefault();
                     languageDropdown.style.display = 'none'; // Hide dropdown
                    const lang = option.getAttribute('data-lang');
                     if (lang && lang !== I18n.getCurrentLanguage()) {
                         // Call the async switchLanguage method
                         await I18n.switchLanguage(lang); 
                    }
                });
            });
            
             // Close dropdown when clicking outside
             document.addEventListener('click', (e) => {
                if (!e.target.closest('.language-selector')) {
                     if (languageDropdown) languageDropdown.style.display = 'none';
                }
            });
        }
    },

    /**
     * 设置全站favicon
     */
    setGlobalFavicon() {
       // ... (existing favicon logic)
    },

    // New function to load both profile and keys
    async loadUserProfileAndApiKeys() {
        // console.log('加载用户资料和 API Keys...');
        // Ensure user data and settings are loaded
        if (!this.currentUser) {
             this.currentUser = (await checkAuth())?.user; // Get only user part
        }
        if (!this.userSettings && this.currentUser) {
            this.userSettings = await getCurrentUserSettings();
        }
        // console.log("Loaded data for settings modal:", this.currentUser, this.userSettings);

        // Populate Profile Tab
        const usernameInput = document.getElementById('profile-username');
        const roleInput = document.getElementById('profile-role');
        const createdInput = document.getElementById('profile-created'); 
        if (this.currentUser && usernameInput) usernameInput.value = this.currentUser.username;
        if (this.userSettings && roleInput) roleInput.value = this.userSettings.role || 'N/A';
        if (createdInput) createdInput.value = 'N/A'; // Creation date still tricky

        // Populate API Keys Tab
        this.loadApiKeysToSettings();
        
        // Clear any previous messages
        const apiKeyMessage = document.getElementById('api-keys-settings-message');
        if(apiKeyMessage) apiKeyMessage.textContent = '';
        const passwordMessage = document.getElementById('password-message');
        if(passwordMessage) passwordMessage.textContent = '';
    },
    
    // Renamed from loadUserApiKeys to be more specific to the settings modal form
    loadApiKeysToSettings() {
        // console.log('填充 API Keys 到设置表单...');
        const userStoryKeyInput = document.getElementById('setting-userStory-key'); 
        const userManualKeyInput = document.getElementById('setting-userManual-key');
        const requirementsAnalysisKeyInput = document.getElementById('setting-requirementsAnalysis-key');
        const uxDesignKeyInput = document.getElementById('setting-uxDesign-key'); // Get new input

        if (this.userSettings && this.userSettings.apiKeys) {
            if (userStoryKeyInput) userStoryKeyInput.value = this.userSettings.apiKeys.userStory ?? '';
            if (userManualKeyInput) userManualKeyInput.value = this.userSettings.apiKeys.userManual ?? '';
            if (requirementsAnalysisKeyInput) requirementsAnalysisKeyInput.value = this.userSettings.apiKeys.requirementsAnalysis ?? '';
            if (uxDesignKeyInput) uxDesignKeyInput.value = this.userSettings.apiKeys.uxDesign ?? ''; // Load value
        } else {
             // Clear fields if no settings found
             if (userStoryKeyInput) userStoryKeyInput.value = '';
            if (userManualKeyInput) userManualKeyInput.value = '';
            if (requirementsAnalysisKeyInput) requirementsAnalysisKeyInput.value = '';
            if (uxDesignKeyInput) uxDesignKeyInput.value = ''; // Clear new field
        }
        // Reset visibility toggles for API keys
        document.querySelectorAll('#api-keys-settings .toggle-password-visibility.active').forEach(btn => {
            const targetInput = document.getElementById(btn.getAttribute('data-target'));
            if(targetInput) targetInput.type = 'password';
            btn.classList.remove('active');
        });
    },
    
    // New function to handle saving API Keys
    async handleSaveApiKeys() {
        // console.log("Handling save API Keys for current user..."); 
        const apiKeys = {
            userStory: document.getElementById('setting-userStory-key').value.trim(),
            userManual: document.getElementById('setting-userManual-key').value.trim(),
            requirementsAnalysis: document.getElementById('setting-requirementsAnalysis-key').value.trim(),
            uxDesign: document.getElementById('setting-uxDesign-key').value.trim() // Read value from new input
        };
        
        const messageElementId = 'api-keys-settings-message';
        showFormMessage(messageElementId, '保存中...', 'info');
        this.showLoading('保存 API 密钥...');

        try {
            // Call the refactored storage function
            const result = await saveCurrentUserSetting({ apiKeys: apiKeys }); 
            this.hideLoading();
            if (result) {
                 showFormMessage(messageElementId, 'API 密钥保存成功！', 'success');
                 this.userSettings = result; 
            } else {
                 showFormMessage(messageElementId, '保存失败，请稍后重试。', 'error');
            }
        } catch (error) {
             this.hideLoading();
             console.error("Error saving API keys:", error);
             showFormMessage(messageElementId, '保存时发生错误。', 'error');
        }
    },

    // Renamed the old placeholder function for the Admin Panel
    async handleAdminSaveUserApiKeys_Placeholder() {
         console.warn("handleAdminSaveUserApiKeys_Placeholder: Needs rework for Amplify Cognito & GraphQL permissions.");
         alert("管理员为其他用户保存 API Keys 的功能需要针对 Amplify Cognito 和后台权限进行调整。"); // Updated alert message
         const userId = document.getElementById('api-key-config-user-select')?.value;
         if (!userId) {
             // Avoid using showFormMessage here if the admin panel structure might change
             console.error('Admin Panel: Please select a user first.');
             return;
         }
         // Placeholder logic removed as it's non-functional
     },
};

// Expose Header for potential external calls if needed, otherwise can be removed
// window.Header = Header;

export default Header; // Export the Header object 