/**
 * EVYD产品经理AI工作台
 * 通用头部组件 (Integrated with AWS Amplify Auth)
 */

// Import new Auth and Storage functions
import {
    checkAuth,
    isAdmin,
    changePassword
} from '/modules/auth/auth.js'; // Use absolute path

// Import Amplify directly - we don't need individual auth functions anymore
import { Auth, Amplify, API } from 'aws-amplify';
import { graphqlOperation } from '@aws-amplify/api-graphql'; // Import graphqlOperation

// 导入 Amplify 配置辅助函数
import { configureAmplify } from '/scripts/amplify-config.js';

import {
    getCurrentUserSettings,
    saveCurrentUserSetting,
    getGlobalConfig,      // Import getGlobalConfig
    saveGlobalConfig,      // Import saveGlobalConfig
    // Import new functions needed for API Key management
    getCurrentUserApiKeys,
    createUserApiKey,
    updateUserApiKey,
    deleteUserApiKey,
    listApplications 
} from '/scripts/services/storage.js'; // Use absolute path

// Import the specific helper function needed
import { showFormMessage } from '/scripts/utils/helper.js';

// Import config here as well
import awsconfig from '/src/aws-exports.js'; // 修改使用绝对路径导入

// Import I18n module
import I18n, { t } from '/scripts/i18n.js';

// Import GraphQL queries
import * as queries from '../../src/graphql/queries';

// 头部组件命名空间 (We keep the structure but replace implementations)
const Header = {
    currentUser: null, // Store current Amplify user object
    userSettings: null, // Store user settings from DynamoDB
    // Add state for applications and user API keys
    applications: [], // Store list of Applications fetched from backend
    userApiKeys: [], // Store list of UserApplicationApiKey fetched from backend
    apiEndpointInputRefs: {}, // NEW: Store references to dynamically created endpoint inputs
    initialized: false, // 是否已初始化
    initPromise: null, // 初始化Promise，用于防止并行初始化

    /**
     * 初始化头部组件
     * @param {string} containerId 头部容器ID
     */
    async init(containerId = 'header-container') {
        // 如果已有初始化过程在进行中，直接返回该Promise
        if (this.initPromise) {
            console.log("===> Header初始化已在进行中，复用现有初始化过程");
            return this.initPromise;
        }
        
        // 如果已经完成初始化，直接返回
        if (this.initialized) {
            console.log("===> Header已经初始化完成，跳过重复初始化");
            return Promise.resolve();
        }
        
        // 创建初始化Promise
        this.initPromise = (async () => {
            try {
                console.log("===> 开始Header初始化过程");
                configureAmplify(); // Initialize AWS Amplify
            } catch (error) {
                console.error("[Header.init] Error configuring Amplify:", error);
                const containerElement = document.getElementById(containerId);
                if (containerElement) {
                    containerElement.innerHTML = "<p style='color:red; text-align:center;'>Error initializing application configuration. Authentication might not work.</p>" + containerElement.innerHTML;
                }
                return;
            }

            // 先加载header结构
            this.loadHeader(containerId);
            this.setGlobalFavicon();
            
            // 初始化 I18n 并立即设置语言选择器
            try {
                // 确保I18n初始化
                await I18n.init();
                
                // 获取已保存的语言，确保显示正确
                const currentLang = I18n.getCurrentLanguage();
                const langDisplay = document.getElementById('current-language-display');
                if (langDisplay) {
                    langDisplay.textContent = I18n.supportedLanguages[currentLang] || currentLang;
                    // console.log(`Header设置语言显示为: ${langDisplay.textContent} (${currentLang})`);
                }
                
                // 应用翻译到整个header容器
                const headerElement = document.getElementById(containerId);
                if (headerElement) {
                    I18n.applyTranslations(headerElement);
                    // console.log('已应用翻译到header元素');
                }
            } catch (error) {
                console.error("[Header.init] Error initializing I18n:", error);
            }
            
            // 最后检查用户认证状态
            await this.checkUserAuth();
            
            // 标记初始化完成
            this.initialized = true;
            console.log("===> Header初始化完成");
        })();
        
        // 返回初始化Promise
        return this.initPromise;
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
            <img src="/Variant=White, Lockup=Default.png" alt="EVYD Logo" class="logo">
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
                
                <!-- Container for displaying loaded API endpoints -->
                <div id="api-endpoints-list">
                    <!-- Loaded endpoints will be rendered here by loadApiEndpointsConfig -->
                </div>

                <div class="api-keys-config"> <!-- This div holds the input fields -->
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
                this.showLoading('跳转到登录页面...');
                try {
                    // console.log("[Login] 使用 Amplify V5 登录");
                    
                    // V5 风格登录：不传递复杂参数，让配置文件处理细节
                    await Auth.federatedSignIn();
                } catch (error) {
                    this.hideLoading();
                    console.error("[Login Error] Failed to redirect to hosted UI:", error);
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    alert(`无法跳转到登录页面，请稍后再试。\n错误详情: ${errorMessage}`);
                }
            }

            // 登出按钮 (Use Amplify Auth.signOut, handles redirect)
            if (event.target.matches('#logout-button')) {
                event.preventDefault();
                this.showLoading('登出中...'); 
                try {
                    // 调用Auth.signOut而不是signOut
                    await Auth.signOut({ global: true });
                    // Redirect is handled by Amplify based on oauth.redirectSignOut
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
                // 完全移除这个事件委托处理，让initAdminPanel中的专门监听器来处理
                return; // 直接返回，不执行任何操作
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
        const adminPanelButton = document.getElementById('admin-panel-button');
        // 修改：直接获取正确的adminModal元素
        const adminModal = document.getElementById('admin-panel-modal');
        const closeAdminModalButton = adminModal?.querySelector('.close-modal');
        // 修改：获取正确的admin tabs元素
        const adminTabs = adminModal?.querySelectorAll('.admin-tab');
        // 修改：获取正确的admin contents元素
        const adminContents = adminModal?.querySelectorAll('.admin-content');

        if (!adminPanelButton || !adminModal || !closeAdminModalButton || !adminTabs || !adminContents) {
            console.warn("Admin panel elements not found, skipping initialization");
            return;
        }

        // 确保在DOM加载后立即设置用户管理选项卡为默认选中状态
        adminTabs.forEach(t => t.classList.remove('active'));
        const usersTab = adminModal.querySelector('.admin-tab[data-admin-tab="users"]');
        if (usersTab) {
            usersTab.classList.add('active');
        }
        
        adminContents.forEach(c => c.classList.remove('active'));
        const usersContent = document.getElementById('users-management');
        if (usersContent) {
            usersContent.classList.add('active');
        }

        // 删除预加载用户列表的代码，避免在页面加载时立即触发API请求
        // 仅在用户实际打开管理面板时加载
        
        // 先检查是否已绑定点击事件，避免重复绑定
        if (!adminPanelButton.hasAttribute('data-event-bound')) {
            adminPanelButton.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log("===> 点击了管理员面板按钮");
                const isAdminUser = this.userSettings && this.userSettings.role === 'admin';
                console.log("===> 用户是否为管理员:", isAdminUser, "用户设置:", this.userSettings);
                
                if (isAdminUser) {
                    // 确保加载应用程序数据
                    if (!this.applications || this.applications.length === 0) {
                        await this.loadApplications();
                    }
                    
                    // 显示模态框
                    adminModal.style.display = 'block';
                    
                    // 加载用户列表以确保数据最新
                    console.log("===> 打开管理面板，准备加载用户列表");
                    await this.loadUsersList();
                } else {
                    console.log("===> 用户不是管理员，显示提示信息");
                    alert(t('alert.adminRequired'));
                }
            });
            // 标记已绑定事件
            adminPanelButton.setAttribute('data-event-bound', 'true');
        }

        if (!closeAdminModalButton.hasAttribute('data-event-bound')) {
            closeAdminModalButton.addEventListener('click', () => {
                adminModal.style.display = 'none';
            });
            closeAdminModalButton.setAttribute('data-event-bound', 'true');
        }

        adminTabs.forEach(tab => {
            if (!tab.hasAttribute('data-event-bound')) {
                tab.addEventListener('click', async () => {
                    const tabType = tab.getAttribute('data-admin-tab');
                    console.log("===> 点击了管理面板选项卡:", tabType);
    
                    adminTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
    
                    adminContents.forEach(content => {
                        content.classList.remove('active');
                    });
                    
                    // 根据选项卡类型激活相应内容并加载数据
                    if (tabType === 'users') {
                        document.getElementById('users-management')?.classList.add('active');
                        console.log("===> 切换到用户管理选项卡，加载用户列表");
                        await this.loadUsersList(); // 加载用户列表
                    } else if (tabType === 'api-keys') {
                        document.getElementById('api-keys-management')?.classList.add('active');
                        // this.loadApiKeysConfig(); // 如果实现的话
                    } else if (tabType === 'api-endpoints') {
                        document.getElementById('api-endpoints-management')?.classList.add('active');
                        console.log("===> 切换到API端点配置选项卡，加载端点配置");
                        await this.loadApiEndpointsConfig(); // 加载API端点配置
                    }
                    
                    // 重新应用翻译
                    I18n.applyTranslations(adminModal);
                });
                tab.setAttribute('data-event-bound', 'true');
            }
        });

        // 添加保存API端点按钮的事件监听器（确保只注册一次）
        const saveEndpointsButton = document.getElementById('save-global-api-endpoints-button');
        if (saveEndpointsButton && !saveEndpointsButton.hasAttribute('data-event-bound')) {
            saveEndpointsButton.addEventListener('click', () => {
                this.handleSaveGlobalApiEndpoints();
            });
            saveEndpointsButton.setAttribute('data-event-bound', 'true');
            console.log("===> 已为保存API端点按钮注册一次点击事件");
        } else if (saveEndpointsButton) {
            console.log("===> 保存API端点按钮已经注册过事件，跳过");
        } else {
            console.warn("Save endpoints button not found");
        }
    },

    // Function to load applications into the Admin App Management tab
    async loadApplicationsForAdmin() {
        const appListContainer = document.getElementById('application-list-container');
        if (!appListContainer) return;

        // Use the already loaded applications if available
        if (!this.applications || this.applications.length === 0) {
            await this.loadApplications(); // Ensure apps are loaded
        }

        appListContainer.innerHTML = ''; // Clear previous list
        if (this.applications.length === 0) {
            appListContainer.innerHTML = `<p>${t('adminPanel.noAppsDefined')}</p>`;
                    return;
                }
                
        this.applications.forEach(app => {
            const appElement = document.createElement('div');
            appElement.classList.add('application-item'); // Add styling hook
            appElement.innerHTML = `
                <span>${app.name} (ID: ${app.id})</span>
                <span>${app.description || ''}</span>
                <button class="btn-danger btn-sm delete-app-btn" data-app-id="${app.id}">${t('common.delete')}</button>
                 <!-- Add edit button if needed -->
            `;
             // Add delete listener
             const deleteBtn = appElement.querySelector('.delete-app-btn');
             if(deleteBtn) {
                 deleteBtn.addEventListener('click', async () => {
                     if (confirm(t('adminPanel.confirmDeleteApp', { appName: app.name }))) {
                         this.showLoading(t('common.deleting'));
                         // Add deleteApplication function to storage.js if needed
                         // await deleteApplication(app.id);
                         console.warn("Delete application functionality not fully implemented in storage.js yet.");
                         this.hideLoading();
                         await this.loadApplicationsForAdmin(); // Refresh list
                     }
                 });
             }
            appListContainer.appendChild(appElement);
        });
    },

    // Function to handle adding a new application (Admin)
    async handleAddApplication() {
        const appNameInput = document.getElementById('new-application-name');
        const appDescInput = document.getElementById('new-application-description');
        if (!appNameInput || !appDescInput) return;

        const name = appNameInput.value.trim();
        const description = appDescInput.value.trim();

        if (!name) {
            alert(t('adminPanel.appNameRequired'));
            return;
        }

        this.showLoading(t('common.saving'));
        const createdApp = await createApplication(name, description); // Use function from storage.js
            this.hideLoading();

        if (createdApp) {
            appNameInput.value = '';
            appDescInput.value = '';
            await this.loadApplicationsForAdmin(); // Refresh the list
            await this.loadApplications(); // Also refresh the main applications list used elsewhere
                        } else {
            alert(t('adminPanel.errorAddingApp'));
        }
    },


    // --- Functions related to specific Admin configurations ---

    // Load API Keys for a specific user (Admin Panel - Requires significant refactoring)
    async loadApiKeysConfig() {
        console.warn("Admin panel: loadApiKeysConfig needs complete refactoring for the new UserApplicationApiKey model.");
        // TODO: Implement logic if admin needs to view/manage specific user's keys.
        // This would involve:
        // 1. Selecting a user.
        // 2. Calling a *new* function in storage.js like `getApiKeysForUser(userId)`.
        // 3. Displaying the keys in the admin UI.
        // This function is now largely obsolete in its previous form.
        const messageElement = document.getElementById('admin-api-keys-message');
        if(messageElement) showFormMessage(messageElement, t('common.featureNotImplemented'), 'warning');

    },

    // Handle saving API Keys for a specific user (Admin Panel - Requires significant refactoring)
    async handleSaveUserApiKeys() {
        console.warn("Admin panel: handleSaveUserApiKeys needs complete refactoring.");
        // TODO: Implement logic if admin needs to create/update/delete a specific user's keys.
        // This would involve:
        // 1. Getting the selected user's ID.
        // 2. Getting the application ID and the new API key from the admin UI.
        // 3. Calling appropriate functions in storage.js (e.g., createUserApiKey, updateUserApiKey, deleteUserApiKey - potentially needing adjusted auth rules or a dedicated admin mutation).
        // This function is now largely obsolete in its previous form.
         const messageElement = document.getElementById('admin-api-keys-message');
         if(messageElement) showFormMessage(messageElement, t('common.featureNotImplemented'), 'warning');
    },

    // Load Global API Endpoints (Admin Panel - Revised with input refs)
    async loadApiEndpointsConfig() {
        const container = document.getElementById('api-endpoints-list');
        if (!container) {
            console.error("API Endpoints container 'api-endpoints-list' not found.");
            return;
        }
        container.innerHTML = ''; // Clear previous content
        this.apiEndpointInputRefs = {}; // Clear previous refs

        // 确保applications已加载
        if (!this.applications || this.applications.length === 0) {
            await this.loadApplications();
        }
        
        // 如果applications仍然为空，创建默认列表
        if (!this.applications || this.applications.length === 0) {
            this.applications = [
                { id: 'userStory', name: 'User Story' },
                { id: 'userManual', name: 'User Manual' },
                { id: 'requirementsAnalysis', name: 'Requirements Analysis' },
                { id: 'uxDesign', name: 'UX Design' }
            ];
        }

        this.showLoading(t('common.loading'));
        try {
            const globalConfigMap = await getGlobalConfig(); // Use storage function (returns Map)

            // 先创建一个页面内部容器，确保结构更清晰
            const apiKeysConfigContainer = document.querySelector('#api-endpoints-management .api-keys-config');
            if (!apiKeysConfigContainer) {
                console.error("Could not find .api-keys-config container in #api-endpoints-management");
                return;
            }
            apiKeysConfigContainer.innerHTML = ''; // 清空现有内容

            this.applications.forEach(app => {
                // 构建查询键 - 优先使用app.id，然后回退到app.name，然后尝试从ID字符串中提取
                let configKey = app.id; // Primary key is Application ID
                
                // 如果globalConfigMap不包含这个键但包含ID前缀的键，尝试查找
                if (!globalConfigMap.has(configKey)) {
                    // 尝试使用应用名称作为键
                    const nameKey = app.name.toLowerCase().replace(/\s+/g, '-');
                    // 或者尝试使用input ID格式作为键
                    const inputIdKey = `global-${app.name.toLowerCase().replace(/\s+/g, '-')}-api-endpoint`;
                    
                    if (globalConfigMap.has(nameKey)) {
                        configKey = nameKey;
                    } else if (globalConfigMap.has(inputIdKey)) {
                        configKey = inputIdKey;
                    }
                }
                
                const currentValue = globalConfigMap.get(configKey) || ''; // Get value from map

                // 创建基于应用程序的输入字段
                const configItemDiv = document.createElement('div');
                configItemDiv.className = 'api-key-config-item';
                
                const infoDiv = document.createElement('div');
                infoDiv.className = 'api-key-info';
                
                const header = document.createElement('h4');
                header.textContent = app.name;
                
                const description = document.createElement('p');
                description.textContent = `${app.name} API URL`;
                
                infoDiv.appendChild(header);
                infoDiv.appendChild(description);
                
                const inputDiv = document.createElement('div');
                inputDiv.className = 'api-key-input';
                
                const input = document.createElement('input');
                input.type = 'text';
                const inputId = `global-${app.name.toLowerCase().replace(/\s+/g, '-')}-api-endpoint`;
                input.id = inputId;
                input.setAttribute('data-app-id', app.id);
                input.className = 'form-control'; // Ensure this matches your selector
                input.value = currentValue;
                input.placeholder = `Enter API URL for ${app.name}`;
                
                inputDiv.appendChild(input);
                
                configItemDiv.appendChild(infoDiv);
                configItemDiv.appendChild(inputDiv);
                
                apiKeysConfigContainer.appendChild(configItemDiv);

                // Store the input element reference
                this.apiEndpointInputRefs[app.id] = input;
            });

            I18n.applyTranslations(apiKeysConfigContainer);
        } catch (error) {
            console.error("Error loading global API endpoints:", error);
            container.innerHTML = `<p class="error">${t('adminPanel.errorLoadingEndpoints')}</p>`;
        } finally {
            this.hideLoading();
        }
    },

    // REMOVED/COMMENTED OUT: fetchAllGlobalConfigs as it's replaced by getGlobalConfig logic
    // async fetchAllGlobalConfigs() { ... },

    // Handle saving Global API Endpoints (Admin Panel - Revised - DOM DIRECT ACCESS)
    async handleSaveGlobalApiEndpoints() {
        // 防止重复调用：使用处理中状态标记
        if (this.isSavingApiEndpoints) {
            console.log("===> API端点保存操作正在进行中，跳过重复请求");
            return;
        }
        
        this.isSavingApiEndpoints = true;
        console.log("===> 开始保存API端点配置");
        
        // DIRECT DOM ACCESS: Get all input elements inside the api-endpoints-management content
        const apiEndpointsContent = document.getElementById('api-endpoints-management');
        if (!apiEndpointsContent) {
            console.error('[ERROR] Could not find api-endpoints-management content.');
            this.isSavingApiEndpoints = false;
            return;
        }
        
        // ---- 确保应用程序列表已加载 ----
        if (!this.applications || this.applications.length === 0) {
            try {
                await this.loadApplications();
            } catch (error) {
                console.error('[ERROR] Failed to load applications:', error);
                // 即使加载失败，我们仍然可以继续保存配置
            }
        }
        
        // ---- 使用更通用的选择器 ----
        const allInputs = apiEndpointsContent.querySelectorAll('input');
        
        // 尝试找到正确的输入元素，不管它们有什么类名和属性
        const inputElements = Array.from(allInputs).filter(input => {
            // 如果有data-app-id属性，使用它；否则从ID中获取
            return input.hasAttribute('data-app-id') || input.id.startsWith('global-') || input.id.includes('-api-endpoint');
        });
        
        const apiEndpoints = {}; // Object to hold { appId: url } pairs
        
        // Collect data from DOM elements
        inputElements.forEach(input => {
            const inputValue = input.value.trim();
            
            // 1. 首先尝试从data-app-id属性获取appId
            let appId = input.getAttribute('data-app-id');
            
            // 2. 如果没有data-app-id，尝试使用预定义的映射表
            if (!appId && input.id && INPUT_ID_TO_APP_ID_MAP[input.id.toLowerCase()]) {
                appId = INPUT_ID_TO_APP_ID_MAP[input.id.toLowerCase()];
            }
            // 3. 如果仍然没有，尝试从ID提取
            else if (!appId && input.id) {
                if (input.id.startsWith('global-') && input.id.includes('-api-endpoint')) {
                    const appName = input.id.replace('global-', '').replace('-api-endpoint', '');
                    
                    // 使用不区分大小写的方式查找应用
                    if (this.applications && this.applications.length > 0) {
                        const app = this.applications.find(a => 
                            a.name.toLowerCase() === appName.toLowerCase() || 
                            a.name.toLowerCase().replace(/[\s-_]+/g, '') === appName.toLowerCase().replace(/[\s-_]+/g, '')
                        );
                        
                        if (app) {
                            appId = app.id;
                        } else {
                            // 4. 如果仍然找不到匹配的应用程序，使用小写名称作为键
                            appId = appName.toLowerCase();
                        }
                    } else {
                        // 使用名称作为键
                        appId = appName.toLowerCase();
                    }
                } else if (input.id.startsWith('endpoint-')) {
                    appId = input.id.replace('endpoint-', '');
                }
            }
            
            if (appId) {
                apiEndpoints[appId] = inputValue;
            } else {
                // 5. 最后的后备方案：直接使用完整的输入ID作为键
                if (input.id) {
                    apiEndpoints[input.id] = inputValue;
                }
            }
        });
        
        const messageElement = document.getElementById('api-endpoints-message');
        
        // Prevent saving if no data collected
        if (Object.keys(apiEndpoints).length === 0) {
             console.warn("No API endpoint data found. Nothing to save. Aborting.");
             // 修正: 直接设置消息元素的内容
             if (messageElement) {
                 messageElement.textContent = t('adminPanel.endpointsNoDataFound') || "未找到API端点数据，无法保存。";
                 messageElement.className = 'form-message warning';
             } else {
                 console.error("Message element not found");
             }
             this.isSavingApiEndpoints = false;
             return;
        }

        const configToSave = { 
            apiEndpoints: apiEndpoints 
        };

        // --- DEBUGGING: Check the object being passed to saveGlobalConfig --- 
        console.log("[DEBUG] configToSave object being passed to storage:", configToSave);
        // --- END DEBUGGING ---

        this.showLoading(t('common.saving') || "保存中...");
        try {
            const success = await saveGlobalConfig(configToSave);
            if (success) {
                // 修正: 直接设置消息元素的内容
                if (messageElement) {
                    messageElement.textContent = t('adminPanel.endpointsSavedSuccess') || "API端点保存成功！";
                    messageElement.className = 'form-message success';
                } else {
                    console.error("[DEBUG] Message element not found for success message");
                }
                // 重新加载配置以显示最新数据
                await this.loadApiEndpointsConfig();
            } else {
                // 修正: 直接设置消息元素的内容
                if (messageElement) {
                    messageElement.textContent = t('adminPanel.endpointsSavedError') || "保存API端点时出错。";
                    messageElement.className = 'form-message error';
                } else {
                    console.error("[DEBUG] Message element not found for error message");
                }
            }
        } catch (error) {
            console.error("Error saving global API endpoints:", error);
            // 修正: 直接设置消息元素的内容
            if (messageElement) {
                messageElement.textContent = `${t('adminPanel.endpointsSavedError') || "保存API端点时出错"}: ${error.message || 'Unknown error'}`;
                messageElement.className = 'form-message error';
            } else {
                console.error("[DEBUG] Message element not found for exception message");
            }
        } finally {
            this.hideLoading();
            console.log("===> API端点保存操作完成");
            this.isSavingApiEndpoints = false;
        }
    },

    // REMOVED/COMMENTED OUT: saveSingleGlobalConfig as it's replaced by handleSaveGlobalApiEndpoints logic
    // async saveSingleGlobalConfig(key, value) { ... },

    // --- Standard User Functions ---

    /**
     * 检查用户认证状态并更新UI。
     * 如果用户已认证，显示用户信息并检查管理员权限。
     * 如果未认证，显示登录按钮。
     */
    async checkUserAuth() {
        console.log("===> 开始检查用户认证状态");
        this.showLoading(t('header.checkingLoginStatus'));
        
        try {
            // 检查是否有已认证的用户
            console.log("===> 尝试获取当前认证用户");
            this.currentUser = await Auth.currentAuthenticatedUser();
            console.log("===> 用户已认证:", this.currentUser.username);
            
            // 显示用户信息区域，隐藏登录按钮
            const userInfo = document.getElementById('user-info');
            const loginButton = document.getElementById('login-button');
            const usernameDisplay = document.getElementById('username-display');
            
            if (userInfo) userInfo.style.display = 'flex';
            if (loginButton) loginButton.style.display = 'none';
            if (usernameDisplay) usernameDisplay.textContent = this.currentUser.username;
            
            console.log("===> 已更新UI显示用户信息");
            
            // 检查用户是否在Cognito Admin组中
            console.log("===> 检查用户是否在Cognito Admin组中");
            let isAdminGroup = false;
            try {
                isAdminGroup = await checkAdminGroup();
                console.log("===> 用户是否在Cognito Admin组中:", isAdminGroup);
            } catch (error) {
                console.error("===> 检查管理员组时出错:", error);
            }
            
            // 获取用户设置以检查角色
            console.log("===> 获取用户设置以检查角色");
            this.userSettings = await getCurrentUserSettings();
            
            if (this.userSettings) {
                console.log("===> 获取到用户设置，角色:", this.userSettings.role);
                
                // 如果用户在Cognito Admin组中，但数据库角色不是admin，则更新数据库角色
                if (isAdminGroup && this.userSettings.role !== 'admin') {
                    console.log("===> 发现Cognito组和数据库角色不一致，更新数据库角色为admin");
                    try {
                        this.userSettings = await saveCurrentUserSetting({
                            ...this.userSettings,
                            role: 'admin'
                        });
                        console.log("===> 已更新用户角色为admin:", this.userSettings);
                    } catch (error) {
                        console.error("===> 更新用户角色失败:", error);
                    }
                }
                // 如果用户不在Cognito Admin组，但数据库角色是admin，也更新数据库角色
                else if (!isAdminGroup && this.userSettings.role === 'admin') {
                    console.log("===> 发现用户不在Cognito Admin组，但数据库角色是admin，更新为user");
                    try {
                        this.userSettings = await saveCurrentUserSetting({
                            ...this.userSettings,
                            role: 'user'
                        });
                        console.log("===> 已更新用户角色为user:", this.userSettings);
                    } catch (error) {
                        console.error("===> 更新用户角色失败:", error);
                    }
                }
            } else {
                console.log("===> 未找到用户设置，创建默认设置");
                // 如果没有设置，创建默认设置，根据Cognito组设置正确的角色
                this.userSettings = await saveCurrentUserSetting({
                    role: isAdminGroup ? 'admin' : 'user', // 根据Cognito组设置角色
                    language: I18n.getCurrentLanguage() || 'zh-CN'
                });
                console.log("===> 创建的默认设置:", this.userSettings);
            }
            
            // 检查用户是否为管理员 (使用最终的角色信息)
            const isAdminUser = this.userSettings && this.userSettings.role === 'admin';
            console.log("===> 用户是否为管理员(根据数据库角色):", isAdminUser);
            
            // 显示或隐藏管理员面板链接
            const adminPanelLink = document.getElementById('admin-panel-link');
            if (adminPanelLink) {
                if (isAdminUser) {
                    adminPanelLink.style.display = 'block';
                    console.log("===> 显示管理员面板链接");
                    // 初始化管理员面板
                    this.initAdminPanel();
                } else {
                    adminPanelLink.style.display = 'none';
                    console.log("===> 隐藏管理员面板链接");
                }
            }
            
            // 预加载API密钥和应用程序列表
            console.log("===> 预加载用户资料和API密钥");
            await this.loadUserProfileAndApiKeys();
            
        } catch (error) {
            // 用户未认证，显示登录按钮
            console.log("===> 用户未认证:", error);
            const userInfo = document.getElementById('user-info');
            const loginButton = document.getElementById('login-button');
            
            if (userInfo) userInfo.style.display = 'none';
            if (loginButton) loginButton.style.display = 'inline-block';
            
            // 根据不同类型的错误处理 - 通常是因为没有当前用户
            if (error.message === 'The user is not authenticated') {
                console.log("===> 用户未登录");
            } else {
                console.error("===> 检查用户认证状态时出错:", error);
            }
        } finally {
            this.hideLoading();
            console.log("===> 完成用户认证状态检查");
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
     * 加载用户 API Keys 到设置模态框 (Updated for new schema)
     * Assumes this is for the currently logged-in user's settings modal.
     */
    async loadUserApiKeys() {
        console.log('开始加载用户 API Keys 到设置模态框...');
        const apiKeysSettingsContainer = document.getElementById('api-keys-settings');
        if (!apiKeysSettingsContainer) {
            console.error("API Keys settings container 'api-keys-settings' not found in modal.");
            return;
        }
        
        // 映射应用ID到设置面板中的输入字段ID
        const APP_ID_TO_INPUT_ID_MAP = {
            'userStory': 'setting-userStory-key',
            'userManual': 'setting-userManual-key',
            'requirementsAnalysis': 'setting-requirementsAnalysis-key',
            'uxDesign': 'setting-uxDesign-key'
        };

        // 确保应用和用户密钥已加载
        if (this.applications.length === 0) {
            console.log('加载应用列表...');
            await this.loadApplications();
            console.log(`加载到 ${this.applications.length} 个应用`);
        }
        
        if (this.userApiKeys.length === 0 && this.currentUser) {
            console.log('加载用户API密钥...');
            await this.loadCurrentUserApiKeysInternal();
            console.log(`加载到 ${this.userApiKeys.length} 个API密钥记录`);
        }
        
        console.log('当前已加载的API密钥:', this.userApiKeys);

        // 将API密钥填充到现有的输入字段中
        Object.entries(APP_ID_TO_INPUT_ID_MAP).forEach(([appId, inputId]) => {
            const input = document.getElementById(inputId);
            if (!input) {
                console.warn(`输入字段 ${inputId} 不存在，跳过`);
                return; // 如果输入字段不存在，跳过
            }
            
            // 尝试找到该应用的API密钥
            const userApiKeyRecord = this.userApiKeys.find(key => key.applicationID === appId);
            const currentKey = userApiKeyRecord ? userApiKeyRecord.apiKey : '';
            const recordId = userApiKeyRecord ? userApiKeyRecord.id : '';
            
            console.log(`设置应用 ${appId} 的API密钥: ${currentKey ? '已设置' : '未设置'} (记录ID: ${recordId || 'N/A'})`);
            
            // 设置输入字段的值和数据属性
            input.value = currentKey;
            input.setAttribute('data-app-id', appId);
            input.setAttribute('data-record-id', recordId);
        });
        
        console.log('用户 API Keys 加载完成');
    },

    // New function to load applications from the backend
    async loadApplications() {
        console.log("开始加载应用列表...");
        try {
            // 确保查询已导入
            if (!queries.listApplications) {
                console.error("listApplications查询不可用，使用默认应用列表");
                // 使用默认应用程序列表
                this.applications = [
                    { id: 'userStory', name: 'User Story' },
                    { id: 'userManual', name: 'User Manual' },
                    { id: 'requirementsAnalysis', name: 'Requirements Analysis' },
                    { id: 'uxDesign', name: 'UX Design' }
                ];
                return;
            }
            
            // 添加错误处理和详细日志
            console.log("执行listApplications查询...");
            const result = await API.graphql(graphqlOperation(queries.listApplications));
            
            if (result && result.data && result.data.listApplications) {
                this.applications = result.data.listApplications.items || [];
                console.log(`查询成功，获取到${this.applications.length}个应用`);
            } else {
                console.error("查询结果结构异常:", result);
                this.applications = [];
            }
            
            // 如果没有应用程序，创建默认的应用程序列表
            if (!this.applications || this.applications.length === 0) {
                console.log("未找到应用，使用默认应用列表");
                // 创建默认应用程序列表
                this.applications = [
                    { id: 'userStory', name: 'User Story' },
                    { id: 'userManual', name: 'User Manual' },
                    { id: 'requirementsAnalysis', name: 'Requirements Analysis' },
                    { id: 'uxDesign', name: 'UX Design' }
                ];
            }
        } catch(error) {
            console.error("加载应用程序时出错:", error);
            // 出错时使用默认应用程序列表
            this.applications = [
                { id: 'userStory', name: 'User Story' },
                { id: 'userManual', name: 'User Manual' },
                { id: 'requirementsAnalysis', name: 'Requirements Analysis' },
                { id: 'uxDesign', name: 'UX Design' }
            ];
        }
    },

    // New function to load the current user's API keys internally
    async loadCurrentUserApiKeysInternal() {
        console.log("开始加载当前用户API密钥...");
        try {
            const keys = await getCurrentUserApiKeys();
            console.log(`从服务器获取到 ${keys.length} 个API密钥记录:`, keys);
            this.userApiKeys = keys;
        } catch (error) {
            console.error("加载用户API密钥时出错:", error);
            this.userApiKeys = [];
        }
    },


    // Renamed from loadUserApiKeys - this loads data into the SETTINGS modal specifically
    async loadApiKeysToSettings() {
        // This function is effectively replaced by loadUserApiKeys which now targets the modal.
        // console.log("loadApiKeysToSettings called - redirecting to loadUserApiKeys");
        await this.loadUserApiKeys();

        // Old logic based on userSettings.apiKeys - REMOVE/COMMENT OUT
        // console.log('加载用户 API Keys 到设置模态框...');
        // const userStoryKeyInput = document.getElementById('userStory-api-key'); // Assuming IDs in a user-facing modal
        // const userManualKeyInput = document.getElementById('userManual-api-key');
        // const requirementsAnalysisKeyInput = document.getElementById('requirementsAnalysis-api-key');
        // // const uxDesignKeyInput = document.getElementById('uxDesign-api-key');

        // // Ensure settings are loaded
        // if (!this.userSettings && this.currentUser) {
        //     this.userSettings = await getCurrentUserSettings();
        // }

        // if (this.userSettings && this.userSettings.apiKeys) { // This structure no longer exists
        //     if (userStoryKeyInput) userStoryKeyInput.value = this.userSettings.apiKeys.userStory || '';
        //     if (userManualKeyInput) userManualKeyInput.value = this.userSettings.apiKeys.userManual || '';
        //     if (requirementsAnalysisKeyInput) requirementsAnalysisKeyInput.value = this.userSettings.apiKeys.requirementsAnalysis || '';
        //      // if (uxDesignKeyInput) uxDesignKeyInput.value = this.userSettings.apiKeys.uxDesign || '';
        // } else {
        //     // Clear fields if no settings found
        //      if (userStoryKeyInput) userStoryKeyInput.value = '';
        //     if (userManualKeyInput) userManualKeyInput.value = '';
        //     if (requirementsAnalysisKeyInput) requirementsAnalysisKeyInput.value = '';
        // }
    },

    // Handle saving API Keys from the user settings modal (Updated for new schema)
    async handleSaveApiKeys() {
        // console.log('保存用户 API Keys...');
        const messageElement = document.getElementById('api-keys-settings-message');
        let successCount = 0;
        let errors = [];

        this.showLoading(t('common.saving'));
        
        // 映射应用ID到设置面板中的输入字段ID
        const APP_ID_TO_INPUT_ID_MAP = {
            'userStory': 'setting-userStory-key',
            'userManual': 'setting-userManual-key',
            'requirementsAnalysis': 'setting-requirementsAnalysis-key',
            'uxDesign': 'setting-uxDesign-key'
        };

        const savePromises = [];
        
        // 遍历每个输入字段
        Object.entries(APP_ID_TO_INPUT_ID_MAP).forEach(([applicationID, inputId]) => {
            const input = document.getElementById(inputId);
            if (!input) return; // 如果输入字段不存在，跳过
            
            const apiKey = input.value.trim();
            const recordId = input.getAttribute('data-record-id');

            if (applicationID && apiKey) { // 只有在密钥不为空时保存
                if (recordId && recordId !== 'null' && recordId !== '') {
                    // 更新现有记录
                    console.log(`Updating existing API key for application ${applicationID}, record ID: ${recordId}`);
                    const updatePromise = updateUserApiKey(recordId, apiKey)
                        .then(result => {
                            if(result) {
                                successCount++;
                                console.log(`Successfully updated API key for ${applicationID}`);
                            }
                            else errors.push(`Failed to update key for App ID ${applicationID}`);
                        })
                        .catch(err => {
                            errors.push(`Error updating key for App ID ${applicationID}: ${err.message || 'Unknown error'}`);
                        });
                    savePromises.push(updatePromise);
                } else if (!recordId || recordId === 'null' || recordId === '') {
                    // 创建新记录
                    console.log(`Creating new API key for application ${applicationID}`);
                    const createPromise = createUserApiKey(applicationID, apiKey)
                        .then(result => {
                            if(result) {
                                successCount++;
                                console.log(`Successfully created API key for ${applicationID}`);
                            }
                            else errors.push(`Failed to create key for App ID ${applicationID}`);
                        })
                        .catch(err => {
                            errors.push(`Error creating key for App ID ${applicationID}: ${err.message || 'Unknown error'}`);
                        });
                    savePromises.push(createPromise);
                }
            } else if (applicationID && !apiKey && recordId && recordId !== 'null' && recordId !== '') {
                // 删除清空的密钥
                console.log(`Deleting API key for application ${applicationID}, record ID: ${recordId}`);
                const deletePromise = deleteUserApiKey(recordId)
                    .then(result => {
                        if(result) {
                            successCount++;
                            console.log(`Successfully deleted API key for ${applicationID}`);
                        }
                        else errors.push(`Failed to delete key for App ID ${applicationID}`);
                    })
                    .catch(err => {
                        errors.push(`Error deleting key for App ID ${applicationID}: ${err.message || 'Unknown error'}`);
                    });
                savePromises.push(deletePromise);
            }
        });

        await Promise.all(savePromises);
        this.hideLoading();

        // 刷新UI中的密钥
        await this.loadCurrentUserApiKeysInternal(); // 获取更新后的密钥
        await this.loadUserApiKeys(); // 重新加载UI选项卡

        if (errors.length === 0) {
            showFormMessage(messageElement, t('settings.apiKeysSavedSuccess'), 'success');
        } else {
            showFormMessage(messageElement, `${t('settings.apiKeysSavedPartialError', { count: successCount })}\n${errors.join('\n')}`, 'error');
        }
    },

    // Placeholder for Admin saving user API keys - Requires refactoring
    async handleAdminSaveUserApiKeys_Placeholder() {
        console.warn("handleAdminSaveUserApiKeys_Placeholder needs implementation based on new schema and admin UI.");
        // This needs to be tied to the admin panel's user management and API key input fields for a specific user.
    },

    /**
     * 加载用户资料和 API Keys 到设置模态框 (Updated for Amplify)
     */
    async loadUserProfileAndApiKeys() {
        console.log("===> 开始加载用户资料和API密钥");
        
        // 确保用户数据和设置已加载
        if (!this.currentUser) {
            console.log("===> 当前用户未加载，尝试获取");
            try {
                this.currentUser = (await checkAuth())?.user; // 只获取用户部分
            } catch (error) {
                console.error("===> 获取当前用户失败:", error);
            }
        }
        
        if (!this.userSettings && this.currentUser) {
            console.log("===> 用户设置未加载，尝试获取");
            try {
                this.userSettings = await getCurrentUserSettings();
                console.log("===> 获取到的用户设置:", this.userSettings ? "成功" : "未找到");
            } catch (error) {
                console.error("===> 获取用户设置失败:", error);
            }
        }
        
        // 无论是否为管理员，都加载应用程序列表
        try {
            console.log("===> 加载应用程序列表");
            await this.loadApplications();
            console.log(`===> 成功加载了 ${this.applications.length} 个应用程序`);
        } catch (error) {
            console.error("===> 加载应用程序列表失败:", error);
        }
        
        // 加载用户API密钥
        try {
            console.log("===> 加载用户API密钥");
            await this.loadCurrentUserApiKeysInternal();
            console.log(`===> 成功加载了 ${this.userApiKeys.length} 个API密钥`);
        } catch (error) {
            console.error("===> 加载用户API密钥失败:", error);
        }
        
        // 更新用户资料标签
        console.log("===> 更新用户资料标签UI");
        const usernameInput = document.getElementById('profile-username');
        const roleInput = document.getElementById('profile-role');
        const createdInput = document.getElementById('profile-created'); 
        
        if (this.currentUser && usernameInput) {
            usernameInput.value = this.currentUser.username;
            console.log("===> 已设置用户名:", this.currentUser.username);
        }
        
        if (this.userSettings && roleInput) {
            roleInput.value = this.userSettings.role || 'N/A';
            console.log("===> 已设置角色:", this.userSettings.role || 'N/A');
        }
        
        if (createdInput) {
            createdInput.value = 'N/A'; // 创建日期仍然有问题
        }
        
        // 更新API密钥标签
        console.log("===> 更新API密钥设置UI");
        this.loadApiKeysToSettings();
        
        // 清除之前的消息
        const apiKeyMessage = document.getElementById('api-keys-settings-message');
        if(apiKeyMessage) apiKeyMessage.textContent = '';
        
        const passwordMessage = document.getElementById('password-message');
        if(passwordMessage) passwordMessage.textContent = '';
        
        console.log("===> 完成用户资料和API密钥加载");
        return true;
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
        // 获取语言显示元素
        const display = document.getElementById('current-language-display');
        if (display) {
            // 获取当前已选择的语言（优先从I18n获取，因为它已经处理了来自不同源的语言偏好）
            let langCode = 'zh-CN';
            
            // 如果I18n已初始化，则从它那里获取当前语言
            if (typeof I18n !== 'undefined' && I18n.isInitialized) {
                langCode = I18n.getCurrentLanguage();
                // console.log(`从I18n获取语言码: ${langCode}`);
            } 
            // 否则从localStorage读取
            else if (localStorage.getItem('language')) {
                langCode = localStorage.getItem('language');
                // console.log(`从localStorage获取语言码: ${langCode}`);
            }
            
            // 设置显示文本
            if (typeof I18n !== 'undefined' && I18n.supportedLanguages) {
                display.textContent = I18n.supportedLanguages[langCode] || langCode;
            } else {
                // 后备处理
                const langNames = {
                    'zh-CN': '简体中文',
                    'zh-TW': '繁體中文',
                    'en': 'English'
                };
                display.textContent = langNames[langCode] || langCode;
            }
            
            // console.log(`语言选择器初始化完成，当前显示: ${display.textContent}`);
        } else {
            console.warn('未找到语言选择器显示元素');
        }
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
                         // console.log(`头部监听到语言点击: ${lang}`);
                         // 立即更新语言显示器
                         const display = document.getElementById('current-language-display');
                         if (display) {
                             display.textContent = I18n.supportedLanguages[lang] || lang;
                             // console.log(`语言选择器已立即更新为: ${display.textContent}`);
                         }
                         
                         // 调用语言切换
                         try {
                             const success = await I18n.switchLanguage(lang);
                             if (success) {
                                 // console.log(`语言切换成功: ${lang}`);
                                 // 强制重新翻译头部元素
                                 if (container) {
                                     // console.log('立即重新翻译头部区域');
                                     I18n.applyTranslations(container);
                                 }
                                 
                                 // 立即应用翻译到整个页面
                                 // console.log('立即应用翻译到整个页面');
                                 I18n.applyTranslations();
                                 
                             } else {
                                 console.error(`语言切换失败: ${lang}`);
                             }
                         } catch (error) {
                             console.error(`语言切换时出错:`, error);
                         }
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

    /**
     * 加载用户列表到管理员面板
     */
    async loadUsersList() {
        console.log("===> 开始加载用户列表");
        const usersTableBody = document.getElementById('users-table-body');
        if (!usersTableBody) {
            console.error("用户表格主体元素找不到，DOM元素ID 'users-table-body' 不存在");
            return;
        }
        
        console.log("===> 找到用户表格元素，显示加载中...");
        this.showLoading(t('common.loading') || '加载中...');
        
        try {
            console.log("===> 尝试获取当前认证用户信息");
            // 获取当前登录用户信息 - 显示至少一个用户（自己）
            const currentUser = await Auth.currentAuthenticatedUser();
            console.log("===> Auth.currentAuthenticatedUser() 返回结果类型:", typeof currentUser);
            
            if (!currentUser) {
                console.error("===> 无法获取当前认证用户，Auth.currentAuthenticatedUser() 返回空值");
                usersTableBody.innerHTML = '<tr><td colspan="5">加载用户信息失败</td></tr>';
                return;
            }
            
            // 打印详细的用户信息，帮助调试
            console.log("===> 当前用户对象键:", Object.keys(currentUser));
            
            // 打印安全的用户信息（不包含敏感数据）
            const safeUserInfo = {
                username: currentUser.username,
                attributes: currentUser.attributes ? Object.keys(currentUser.attributes).reduce((obj, key) => {
                    // 过滤掉敏感信息
                    if (!['password', 'email_verified', 'phone_number_verified'].includes(key)) {
                        obj[key] = currentUser.attributes[key];
                    }
                    return obj;
                }, {}) : "无属性",
                signInUserSession: currentUser.signInUserSession ? {
                    accessToken: {
                        jwtToken: "已隐藏",
                        payload: currentUser.signInUserSession?.accessToken?.payload || "无载荷"
                    },
                    idToken: {
                        jwtToken: "已隐藏",
                        payload: currentUser.signInUserSession?.idToken?.payload || "无载荷"
                    },
                    refreshToken: "已隐藏"
                } : "无会话信息",
                groups: currentUser.signInUserSession?.accessToken?.payload?.['cognito:groups'] || "无群组信息"
            };
            
            console.log("===> 成功获取当前用户信息（安全版本）:", JSON.stringify(safeUserInfo, null, 2));
            
            // 尝试获取Cognito会话信息
            try {
                console.log("===> 尝试获取Cognito会话信息");
                const session = await Auth.currentSession();
                console.log("===> Cognito会话状态:", {
                    isValid: session.isValid() || "无法确定",
                    accessTokenExpiration: new Date(session.getAccessToken().getExpiration() * 1000).toLocaleString(),
                    hasAccessToken: !!session.getAccessToken(),
                    hasIdToken: !!session.getIdToken(),
                    accessTokenScopes: session.getAccessToken().getJwtToken().split('.')[1] ? 
                        JSON.parse(atob(session.getAccessToken().getJwtToken().split('.')[1])).scope || "无范围" : 
                        "无法解析"
                });
            } catch (sessionError) {
                console.error("===> 获取Cognito会话信息失败:", sessionError);
            }
            
            // 获取当前用户设置，确认用户角色
            console.log("===> 尝试获取用户设置");
            let userSettings = this.userSettings;
            if (!userSettings) {
                console.log("===> this.userSettings不存在，从数据库获取用户设置");
                try {
                    userSettings = await getCurrentUserSettings();
                    console.log("===> getCurrentUserSettings() 返回结果:", JSON.stringify(userSettings));
                } catch (settingsError) {
                    console.error("===> 获取用户设置时出错:", settingsError);
                    console.log("===> 错误详情:", JSON.stringify({
                        message: settingsError.message,
                        name: settingsError.name
                    }));
                }
            } else {
                console.log("===> 使用缓存的用户设置:", JSON.stringify(userSettings));
            }
            
            // 检查用户是否为管理员
            if (!userSettings) {
                console.error("===> 无法获取用户设置，使用默认角色 'user'");
            } else if (userSettings.role !== 'admin') {
                console.error(`===> 用户角色不是管理员，当前角色: ${userSettings.role}`);
                const errorMsg = "您需要管理员权限才能查看用户列表";
                usersTableBody.innerHTML = `<tr><td colspan="5">${errorMsg}</td></tr>`;
                this.hideLoading();
                return;
            } else {
                console.log(`===> 确认用户具有管理员角色: ${userSettings.role}`);
            }
            
            // 检查用户组权限 
            console.log("===> 检查用户Cognito组权限");
            try {
                // 输出session检查过程的详细日志
                console.log("===> 开始执行checkAdminGroup函数");
                const session = await Auth.currentSession();
                console.log("===> 获取到会话对象，尝试获取访问令牌");
                const accessToken = session.getAccessToken();
                console.log("===> 获取到访问令牌，尝试获取payload");
                const payload = accessToken.payload;
                console.log("===> 访问令牌的payload:", payload);
                console.log("===> 检查cognito:groups属性:", payload['cognito:groups']);
                
                const isUserAdmin = await checkAdminGroup();
                console.log("===> 用户是否在Cognito管理员组:", isUserAdmin);
                console.log("===> 权限状态: 数据库角色=" + (userSettings?.role || "未知") + ", Cognito管理员组=" + isUserAdmin);
                
                if (!isUserAdmin && userSettings?.role === 'admin') {
                    console.warn("===> 权限不一致: 用户未在Cognito Admin组中，但数据库角色设置为admin");
                }
            } catch (error) {
                console.error("===> 检查管理员组时出错:", error);
                console.log("===> 错误详情:", JSON.stringify({
                    message: error.message, 
                    name: error.name
                }));
            }
            
            const userId = currentUser.username;
            const username = currentUser.username;
            const role = userSettings?.role || 'user';
            const createdDate = new Date(currentUser.createdAt || Date.now()).toLocaleDateString();
            
            console.log(`===> 准备创建用户行，用户ID: ${userId}, 用户名: ${username}, 角色: ${role}, 创建日期: ${createdDate}`);
            
            // 创建用户行
            const userRow = document.createElement('tr');
            userRow.innerHTML = `
                <td>${userId}</td>
                <td>${username}</td>
                <td>${role}</td>
                <td>${createdDate}</td>
                <td class="action-buttons">
                    <button class="btn-primary btn-sm edit-user-btn" data-user-id="${userId}" data-username="${username}">
                        ${t('common.edit') || '编辑'}
                    </button>
                </td>
            `;
            
            // 清空表格并添加新行
            console.log("===> 清空表格并添加新行");
            usersTableBody.innerHTML = '';
            usersTableBody.appendChild(userRow);
            
            console.log("===> 用户表格已更新，目前只显示当前用户");
            // 注意：此处只显示当前用户
            // 完整实现需要调用 AWS Cognito API 列出所有用户
            // 但由于权限限制，这通常需要在后端实现
            
            // TODO: 若要显示更多用户，需请求后端API
            console.log("===> 注意: 当前仅显示当前登录用户。要显示所有用户需后端支持。");
            
        } catch (error) {
            console.error("===> 加载用户列表失败:", error);
            console.error("错误详情:", JSON.stringify({
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code
            }));
            usersTableBody.innerHTML = `<tr><td colspan="5">加载用户列表失败: ${error.message || '未知错误'}</td></tr>`;
        } finally {
            console.log("===> 完成用户列表加载，隐藏加载提示");
            this.hideLoading();
        }
    },
};

// Expose Header globally or handle module appropriately
window.Header = Header;

// Automatically initialize header on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => Header.init());

// Re-export functions needed by other modules if using module system strictly
// export { signInWithRedirect, signOut };

// Add the standalone OAuth handling functions (if still needed, confirm usage)
export const signInWithRedirect = () => {
     Auth.federatedSignIn(); // Uses configuration from aws-exports/amplifyconfiguration
};

export const signOut = (options) => {
     Auth.signOut(options); // Pass options if needed (e.g., { global: true })
 };

 // Example of checking if user is in Admin group
 async function checkAdminGroup() {
    try {
        const session = await Auth.currentSession();
        const groups = session.getAccessToken().payload['cognito:groups'];
        return groups && groups.includes('Admin'); // Case-sensitive match
    } catch (e) {
        return false; // Not authenticated or error fetching session
    }
 }

// Export the main Header object as default
export default Header;

// 修改输入ID到应用程序的映射规则
const INPUT_ID_TO_APP_ID_MAP = {
    'global-userstory-api-endpoint': 'userStory',
    'global-usermanual-api-endpoint': 'userManual',
    'global-requirementsanalysis-api-endpoint': 'requirementsAnalysis',
    'global-uxdesign-api-endpoint': 'uxDesign'
};