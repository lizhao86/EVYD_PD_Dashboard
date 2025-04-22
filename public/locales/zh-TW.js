/**
 * 繁體中文語言包
 */
window.zhTW = {
    // 通用
    common: {
        title: 'EVYD 產品經理AI工作台',
        subtitle: 'AI驅動的產品開發助手',
        loading: '正在加載...',
        submit: '提交',
        cancel: '取消',
        save: '保存',
        delete: '刪除',
        back: '返回',
        continue: '繼續',
        logout: '退出登錄',
        login: '登錄',
        comingSoon: '即將推出',
        stayTuned: '敬請期待',
        useTool: '使用工具',
        tag: {
            ai: 'AI',
            new: '新',
            poc: 'POC'
        },
        role: {
            admin: '管理員',
            user: '普通用戶'
        },
        confirm: '確認',
        alert: {
            deleteConfirm: '確定要刪除此項嗎？此操作不可撤銷。',
            dirtyDataCleanupConfirm: '確定要清理所有沒有正確ID格式的用戶數據嗎？此操作不可撤銷。',
            cannotDeleteSelf: '不能刪除當前登錄的用戶賬號',
            cannotDeleteLastAdmin: '不能刪除唯一的管理員賬號',
            userNotFound: '找不到要刪除的用戶，該用戶可能已被刪除',
            deleteFailed: '刪除失敗',
            deleteSuccess: '刪除成功',
            cleanupFailed: '清理失敗',
            cleanupSuccess: '成功清理了 {count} 個髒數據用戶',
            noDirtyData: '沒有發現髒數據用戶'
        },
        message: {
            fillAllFields: '請填寫所有字段',
            passwordsNotMatch: '新密碼與確認密碼不一致',
            userNotLoggedIn: '用戶未登錄',
            cannotGetUser: '無法獲取用戶信息',
            wrongCurrentPassword: '當前密碼不正確',
            passwordUpdateSuccess: '密碼修改成功',
            passwordUpdateFailed: '密碼修改失敗',
            selectUser: '請選擇用戶',
            userNotExist: '用戶不存在',
            updateFailed: '更新失敗',
            apiKeyUpdateSuccess: 'API密鑰更新成功',
            apiEndpointUpdateSuccess: 'API地址更新成功',
            usernameRequired: '請輸入用戶名',
            usernameExists: '用戶名已存在',
            userAddSuccess: '用戶添加成功',
            userAddFailed: '添加用戶失敗',
            userAddError: '添加用戶異常: {error}'
        },
        generating: '生成中...點擊停止',
        stopGeneration: '停止生成',
        backToHome: '返回主頁',
        requesting: '請求中...',
        generatingSimple: '正在生成...',
        generationStopped: '(已停止生成)',
        copied: '已複製!',
        copyFailed: '複製失敗',
        
        // 統一的按鈕狀態
        button: {
            generate: '發送給Dify',
            processing: '處理中...',
            generating: '生成中...點擊停止'
        }
    },
    
    // 導航
    nav: {
        home: '工具主頁',
        aiTools: 'AI 工具',
        docs: '文檔中心',
        productRequirements: '產品需求手冊',
        apiDocs: 'API文檔',
        tutorials: '使用教程',
        adminPanel: '管理面板'
    },
    
    // 示例頁面
    example: {
        pageTitle: '多語言示例頁面',
        welcome: '歡迎使用 EVYD 產品經理AI工作台',
        description: '這是一個多語言支持的示例頁面，您可以使用右上角的語言切換功能切換不同的語言。',
        languageSelect: '選擇語言',
        featureListing: '功能列表',
        feature1: 'AI驅動的產品需求生成',
        feature2: '用戶故事自動創建',
        feature3: '多語言界面支持',
        buttonDemo: '示例按鈕',
        greeting: '你好，世界！',
        documentation: '查看文檔',
        currentLanguage: '當前語言: 繁體中文'
    },

    // 首頁
    homepage: {
        title: 'EVYD 產品經理AI工作台',
        hero: {
            title: 'AI 驅動的產品經理工作台',
            description: '利用人工智能技術簡化產品開發流程，增強創意生成，自動編寫產品文檔，讓產品經理專注於更具創造性的工作。'
        },
        category: {
            foresight: {
                title: '前瞻性研究',
                description: '收集和分析市場、競爭對手和客戶資訊，為產品決策提供數據支持'
            },
            aiAssistant: {
                title: 'AI 助手工具',
                description: '利用AI技術簡化產品經理的日常工作，從需求分析到文檔編寫，一鍵完成'
            },
            dataAnalysis: {
                title: '數據分析工具',
                description: '整合多種數據分析工具，幫助產品經理從數據中獲取洞察，支持決策制定'
            }
        },
        tool: {
            marketInsight: {
                title: '市場洞察',
                description: '收集和分析市場趨勢數據，識別機會與風險，幫助制定市場策略',
                tag1: '市場研究',
                tag2: '趨勢分析'
            },
            competitorAnalysis: {
                title: '競爭對手分析',
                description: '全面分析競爭對手產品特點、優劣勢和策略，制定差異化競爭方案',
                tag1: '競爭情報',
                tag2: 'SWOT分析'
            },
            targetCustomerAnalysis: {
                title: '目標客戶分析',
                description: '創建用戶畫像，分析客戶需求和行為模式，指導產品設計決策',
                tag1: '用戶畫像',
                tag2: '需求分析'
            },
            requirementsAssistant: {
                title: '需求分析助手',
                description: '分析需求文檔，識別關鍵點，提取功能列表，並提供優化建議',
                tag1: '文本分析',
                tag2: '需求管理'
            },
            aiUserStory: {
                title: 'AI 寫 User Story',
                description: '基於簡單描述，自動生成結構化的用戶故事和驗收標準，支持多種格式匯出',
                tag1: 'Dify Workflow',
                tag2: '自然語言處理'
            },
            aiUserManual: {
                title: 'AI 寫 User Manual',
                description: '為您的產品生成清晰簡潔的用戶手冊，自動創建操作指南和常見問題解答',
                tag1: 'Dify Agent',
                tag2: '文檔生成'
            },
            uxDesign: {
                title: 'UX 介面設計(POC)',
                description: '根據需求描述和User Story生成Figma介面設計的AI提示詞，加速介面原型設計',
                tag1: 'Dify API',
                tag2: 'Figma AI'
            },
            userBehaviorAnalysis: {
                title: '用戶行為分析',
                description: '分析用戶使用產品的行為數據，生成熱圖和行為路徑，識別優化點',
                tag1: '行為分析',
                tag2: '用戶體驗'
            }
        }
    },

    // 頁腳
    footer: {
        title: 'EVYD 產品經理 AI 工作台',
        description: '基於EVYD科技先進的人工智能技術，為產品經理提供的一站式工作平台，提升工作效率和產出質量。',
        copyright: '© 2023 EVYD Technology',
        link: {
            about: '關於我們',
            terms: '使用條款',
            privacy: '隱私政策'
        }
    },

    // 頭部
    header: {
        title: '產品經理 AI 工作台',
        subtitle: 'AI驅動的產品開發助手',
        userMenu: {
            settings: '賬號設置'
        }
    },
    
    // 語言選擇器
    language: {
        current: '繁體中文',
        zhCN: '简体中文',
        zhTW: '繁體中文',
        en: 'English'
    },
    
    // 模態框通用
    modal: {
        // 登錄模態框
        login: {
            title: '登錄',
            tabLogin: '登錄',
            tabRegister: '註冊',
            usernameLabel: '用戶名',
            usernamePlaceholder: '輸入用戶名',
            passwordLabel: '密碼',
            passwordPlaceholder: '輸入密碼',
            submitButton: '登錄'
        },
        // 賬號設置模態框
        settings: {
            title: '賬號設置',
            tabPassword: '修改密碼',
            tabApiKeys: 'API 密鑰管理',
            tabProfile: '個人資料',
            currentPasswordLabel: '當前密碼',
            currentPasswordPlaceholder: '輸入當前密碼',
            newPasswordLabel: '新密碼',
            newPasswordPlaceholder: '輸入新密碼',
            confirmPasswordLabel: '確認新密碼',
            confirmPasswordPlaceholder: '再次輸入新密碼',
            updatePasswordButton: '更新密碼',
            profileUsernameLabel: '用戶名',
            profileRoleLabel: '角色',
            profileCreatedLabel: '創建日期',
            apiKeysDesc: '這裡您可以管理您的 Dify API 密鑰，這些密鑰用於連接到 Dify 服務並使用 AI 功能。',
            apiKeyPlaceholder: '輸入 API Key',
            saveApiKeysButton: '保存 API Keys'
        },
        // API密鑰模態框
        apiKeys: {
            title: 'API 密鑰管理',
            description: '這裡您可以查看您的 Dify API 密鑰，這些密鑰用於連接到 Dify 服務並使用 AI 功能。',
            userStoryTitle: 'User Story 生成器',
            userStoryDesc: '用於生成用戶故事的 Dify Workflow API Key',
            userManualTitle: 'User Manual 生成器',
            userManualDesc: '用於生成用戶手冊的 Dify Agent API Key',
            requirementsAnalysisTitle: '需求分析助手',
            requirementsAnalysisDesc: '用於需求分析的 Dify API Key',
            uxDesignTitle: 'UX 介面設計',
            uxDesignDesc: '用於生成介面設計提示詞的 Dify API Key'
        },
        // 管理員面板
        admin: {
            title: '管理員面板',
            tabUsers: '用戶管理',
            tabApiKeys: 'API Key 配置',
            tabApiEndpoints: 'API 地址配置',
            addUserButton: '添加用戶',
            cleanupButton: '清理髒數據用戶',
            loadUsersError: '加載用戶列表失敗，請重試',
            usersTable: {
                id: 'ID',
                username: '用戶名',
                role: '角色',
                createdDate: '創建日期',
                actions: '操作',
                needsRework: '需要修改'
            },
            apiKeysDesc: '在這裡您可以為每個用戶配置不同的 Dify API 密鑰。',
            selectUserLabel: '選擇用戶',
            apiKeyPlaceholder: '輸入 API Key',
            saveApiKeysButton: '保存 API Keys',
            apiEndpointsDesc: '在這裡您可以配置全局的Dify API地址，所有用戶都將使用這些地址進行API調用。',
            userStoryEndpointDesc: '用於生成用戶故事的 Dify Workflow API 地址',
            userManualEndpointDesc: '用於生成用戶手冊的 Dify Agent API 地址',
            requirementsAnalysisEndpointDesc: '用於需求分析的 Dify API 地址',
            uxDesignEndpointDesc: '用於生成介面設計提示詞的 Dify API 地址',
            apiEndpointPlaceholder: '輸入 API 地址，例如 http://localhost',
            saveApiEndpointsButton: '保存 API 地址'
        },
        // 添加/編輯用戶模態框
        editUser: {
            titleAdd: '添加用戶',
            titleEdit: '編輯用戶',
            usernameLabel: '用戶名',
            usernamePlaceholder: '輸入用戶名',
            passwordLabel: '密碼',
            passwordPlaceholder: '輸入密碼',
            passwordHelpAdd: '留空則使用默認密碼: password123',
            passwordHelpEdit: '留空則保持原密碼不變',
            roleLabel: '角色',
            roleUser: '普通用戶',
            roleAdmin: '管理員'
        }
    },

    // UX設計頁面
    uxDesign: {
        pageTitle: 'EVYD 產品經理AI工作台 - UX 界面設計(POC)',
        title: 'UX 界面設計(POC)',
        loadingInfo: '正在獲取應用資訊...',
        connectionError: '連接錯誤',
        connectionErrorDesc: '無法連接到Dify API，請檢查API位址和密鑰設定。',
        retryConnection: '重試連接',
        appName: 'UX 界面設計助手',
        appDescription: '該工具可以根據需求描述和User Story生成Figma界面設計的AI提示詞，幫助您快速創建界面原型。請注意，由於Figma AI功能本身較為原始，生成效果不保證可用。',
        requirementLabel: '需求描述',
        requirementPlaceholder: '請輸入User Story Tickets中的描述和Acceptance Criteria的內容，詳細的需求描述可以幫助生成更精準的設計提示詞。',
        clearButton: '清空',
        generateButton: '生成設計提示詞',
        resultTitle: '生成結果',
        systemInfoTitle: '系統資訊',
        elapsedTimeLabel: '耗時:',
        totalStepsLabel: '總步驟:',
        totalTokensLabel: '總Token:',
        secondsSuffix: '秒',
        error: {
            emptyRequirement: '請輸入需求描述',
            promptRequired: '請輸入設計提示詞要求'
        }
    },
    
    // User Manual頁面
    userManual: {
        pageTitle: 'EVYD 產品經理AI工作台 - User Manual 生成器',
        title: 'AI User Manual 生成器',
        loadingInfo: '正在獲取應用資訊...',
        connectionError: '連接錯誤',
        connectionErrorDesc: '無法連接到Dify API，請檢查API位址和密鑰設定。',
        retryConnection: '重試連接',
        appName: '應用名稱',
        appDescription: '應用描述加載中...',
        requirementLabel: '需求描述',
        requirementPlaceholder: '請輸入需求的 Acceptance Criteria的內容。',
        clearButton: '清空',
        generateButton: '生成 User Manual',
        resultTitle: '生成結果',
        stopButton: '停止生成',
        systemInfoTitle: '系統資訊',
        elapsedTimeLabel: '耗時:',
        totalStepsLabel: '總步驟:',
        totalTokensLabel: '總Token:',
        generating: '生成中，請稍候...',
        secondsSuffix: '秒',
        error: {
            emptyRequirement: '請輸入需求描述',
            promptRequired: '請輸入手冊內容要求'
        }
    },
    
    // User Story頁面
    userStory: {
        pageTitle: 'EVYD 產品經理AI工作台 - User Story 生成器',
        title: 'AI User Story 生成器',
        loadingInfo: '正在獲取應用資訊...',
        connectionError: '連接錯誤',
        connectionErrorDesc: '無法連接到Dify API，請檢查API位址和密鑰設定。',
        retryConnection: '重試連接',
        appName: '應用名稱',
        appDescription: '應用描述加載中...',
        platformLabel: '平台名稱',
        platformPlaceholder: '例如：App, Console',
        systemLabel: '系統名稱',
        systemPlaceholder: '例如：Routines, OVA',
        moduleLabel: '模塊名稱',
        modulePlaceholder: '例如：Logging, Calendar',
        requirementLabel: '需求描述',
        requirementPlaceholder: '詳細描述該功能需求，包括目標用戶、主要功能點、業務規則等。',
        clearButton: '清空',
        generateButton: '生成 User Story',
        resultTitle: '生成結果',
        stopButton: '停止生成',
        systemInfoTitle: '系統資訊',
        elapsedTimeLabel: '耗時:',
        totalStepsLabel: '總步驟:',
        totalTokensLabel: '總Token:',
        secondsSuffix: '秒',
        error: {
            platformRequired: '請填寫平台名稱',
            systemRequired: '請填寫系統名稱',
            moduleRequired: '請填寫模塊名稱',
            requirementRequired: '請填寫需求描述'
        }
    },

    // 密碼策略
    policy: {
        length: '密碼長度必須至少為8個字符',
        number: '必須包含至少一個數字',
        special: '必須包含至少一個特殊字符',
        uppercase: '必須包含至少一個大寫字母',
        lowercase: '必須包含至少一個小寫字母'
    },

    // 需求分析助手頁面
    requirementAnalysis: {
        pageTitle: "EVYD 產品經理AI工作台 - 需求分析助手",
        title: "AI 需求分析助手",
        loadingInfo: "正在獲取應用程式資訊...",
        connectionError: "連線錯誤",
        connectionErrorDesc: "無法連線到Dify API，請檢查API位址和金鑰設定。",
        apiKeyMissingError: "未能找到 requirementsAnalysis 的 API 金鑰，請在管理員面板設定。",
        apiEndpointMissing: '未能找到 requirementsAnalysis API 位址，請聯繫管理員檢查全域設定。',
        missingParams: '缺少必要參數，無法生成。',
        generationFailed: '生成失敗:',
        retryConnection: "重試連線",
        appName: "需求分析助手",
        appDescription: "應用程式描述載入中...",
        requirementLabel: "需求描述",
        requirementPlaceholder: "請輸入需要分析的需求內容。",
        clearButton: "清空",
        resultTitle: "生成結果",
        stopButton: "停止生成",
        systemInfoTitle: "系統資訊",
        elapsedTimeLabel: "耗時:",
        totalStepsLabel: "總步驟:",
        totalTokensLabel: "總Token:",
        secondsSuffix: '秒',
        error: {
            requirementRequired: "需求描述不能為空。",
            requirementTooLong: "需求描述不能超過5000字元。"
        }
    }
}; 