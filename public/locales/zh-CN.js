/**
 * 简体中文语言包
 */
window.zhCN = {
    // 通用
    common: {
        title: 'EVYD 产品经理AI工作台',
        subtitle: 'AI驱动的产品开发助手',
        loading: '正在加载...',
        submit: '提交',
        cancel: '取消',
        save: '保存',
        delete: '删除',
        back: '返回',
        continue: '继续',
        logout: '退出登录',
        login: '登录',
        comingSoon: '即将推出',
        stayTuned: '敬请期待',
        useTool: '使用工具',
        tag: {
            ai: 'AI',
            new: '新',
            poc: 'POC'
        },
        role: {
            admin: '管理员',
            user: '普通用户'
        },
        confirm: '确认',
        alert: {
            deleteConfirm: '确定要删除此项吗？此操作不可撤销。',
            dirtyDataCleanupConfirm: '确定要清理所有没有正确ID格式的用户数据吗？此操作不可撤销。',
            cannotDeleteSelf: '不能删除当前登录的用户账号',
            cannotDeleteLastAdmin: '不能删除唯一的管理员账号',
            userNotFound: '找不到要删除的用户，该用户可能已被删除',
            deleteFailed: '删除失败',
            deleteSuccess: '删除成功',
            cleanupFailed: '清理失败',
            cleanupSuccess: '成功清理了 {count} 个脏数据用户',
            noDirtyData: '没有发现脏数据用户'
        },
        message: {
            fillAllFields: '请填写所有字段',
            passwordsNotMatch: '新密码与确认密码不一致',
            userNotLoggedIn: '用户未登录',
            cannotGetUser: '无法获取用户信息',
            wrongCurrentPassword: '当前密码不正确',
            passwordUpdateSuccess: '密码修改成功',
            passwordUpdateFailed: '密码修改失败',
            selectUser: '请选择用户',
            userNotExist: '用户不存在',
            updateFailed: '更新失败',
            apiKeyUpdateSuccess: 'API密钥更新成功',
            apiEndpointUpdateSuccess: 'API地址更新成功',
            usernameRequired: '请输入用户名',
            usernameExists: '用户名已存在',
            userAddSuccess: '用户添加成功',
            userAddFailed: '添加用户失败',
            userAddError: '添加用户异常: {error}'
        },
        generating: '生成中...点击停止',
        stopGeneration: '停止生成',
        backToHome: '返回主页',
        requesting: '请求中...',
        generatingSimple: '正在生成...',
        generationStopped: '(已停止生成)',
        copied: '已复制!',
        copyFailed: '复制失败',
        
        // 统一的按钮状态
        button: {
            generate: '发送给Dify',
            processing: '处理中...',
            generating: '生成中...点击停止'
        },
        
        // Stats display related
        fetchFailed: '获取失败',
        secondsSuffix: '秒',
        tryNewVersion: '尝试新版'
    },
    
    // 导航
    nav: {
        home: '工具主页',
        aiTools: 'AI 工具',
        docs: '文档中心',
        productRequirements: '产品需求手册',
        apiDocs: 'API文档',
        tutorials: '使用教程',
        adminPanel: '管理面板'
    },
    
    // 示例页面
    example: {
        pageTitle: '多语言示例页面',
        welcome: '欢迎使用 EVYD 产品经理AI工作台',
        description: '这是一个多语言支持的示例页面，您可以使用右上角的语言切换功能切换不同的语言。',
        languageSelect: '选择语言',
        featureListing: '功能列表',
        feature1: 'AI驱动的产品需求生成',
        feature2: '用户故事自动创建',
        feature3: '多语言界面支持',
        buttonDemo: '示例按钮',
        greeting: '你好，世界！',
        documentation: '查看文档',
        currentLanguage: '当前语言: 简体中文'
    },

    // 首页
    homepage: {
        title: 'EVYD 产品经理AI工作台',
        hero: {
            title: 'AI 驱动的产品经理工作台',
            description: '利用人工智能技术简化产品开发流程，增强创意生成，自动编写产品文档，让产品经理专注于更具创造性的工作。'
        },
        category: {
            foresight: {
                title: '前瞻性研究',
                description: '收集和分析市场、竞争对手和客户信息，为产品决策提供数据支持'
            },
            aiAssistant: {
                title: 'AI 助手工具',
                description: '利用AI技术简化产品经理的日常工作，从需求分析到文档编写，一键完成'
            },
            dataAnalysis: {
                title: '数据分析工具',
                description: '整合多种数据分析工具，帮助产品经理从数据中获取洞察，支持决策制定'
            }
        },
        tool: {
            marketInsight: {
                title: '市场洞察',
                description: '收集和分析市场趋势数据，识别机会与风险，帮助制定市场策略',
                tag1: '市场研究',
                tag2: '趋势分析'
            },
            competitorAnalysis: {
                title: '竞争对手分析',
                description: '全面分析竞争对手产品特点、优劣势和策略，制定差异化竞争方案',
                tag1: '竞争情报',
                tag2: 'SWOT分析'
            },
            targetCustomerAnalysis: {
                title: '目标客户分析',
                description: '创建用户画像，分析客户需求和行为模式，指导产品设计决策',
                tag1: '用户画像',
                tag2: '需求分析'
            },
            requirementsAssistant: {
                title: '需求分析助手',
                description: '分析需求文档，识别关键点，提取功能列表，并提供优化建议',
                tag1: '文本分析',
                tag2: '需求管理'
            },
            aiUserStory: {
                title: 'AI 写 User Story',
                description: '基于简单描述，自动生成结构化的用户故事和验收标准，支持多种格式导出',
                tag1: 'Dify Workflow',
                tag2: '自然语言处理'
            },
            aiUserManual: {
                title: 'AI 写 User Manual',
                description: '为您的产品生成清晰简洁的用户手册，自动创建操作指南和常见问题解答',
                tag1: 'Dify Agent',
                tag2: '文档生成'
            },
            aiUserManualNew: {
                title: 'AI 写 User Manual (新版)',
                description: '为您的产品生成清晰简洁的用户手册，全新对话式界面，支持连续对话',
                tag1: '对话式界面',
                tag2: 'Dify Chat'
            },
            uxDesign: {
                title: 'UX 界面设计(POC)',
                description: '根据需求描述和User Story生成Figma界面设计的AI提示词，加速界面原型设计',
                tag1: 'Dify API',
                tag2: 'Figma AI'
            },
            userBehaviorAnalysis: {
                title: '用户行为分析',
                description: '分析用户使用产品的行为数据，生成热图和行为路径，识别优化点',
                tag1: '行为分析',
                tag2: '用户体验'
            }
        }
    },

    // 页脚
    footer: {
        title: 'EVYD 产品经理 AI 工作台',
        description: '基于EVYD科技先进的人工智能技术，为产品经理提供的一站式工作平台，提升工作效率和产出质量。',
        copyright: '© 2023 EVYD Technology',
        link: {
            about: '关于我们',
            terms: '使用条款',
            privacy: '隐私政策'
        }
    },

    // 头部
    header: {
        title: '产品经理 AI 工作台',
        subtitle: 'AI驱动的产品开发助手',
        userMenu: {
            settings: '账号设置'
        }
    },
    
    // 语言选择器
    language: {
        current: '简体中文',
        zhCN: '简体中文',
        zhTW: '繁體中文',
        en: 'English'
    },
    
    // 模态框通用
    modal: {
        // 登录模态框
        login: {
            title: '登录',
            tabLogin: '登录',
            tabRegister: '注册',
            usernameLabel: '用户名',
            usernamePlaceholder: '输入用户名',
            passwordLabel: '密码',
            passwordPlaceholder: '输入密码',
            submitButton: '登录'
        },
        // 账号设置模态框
        settings: {
            title: '账号设置',
            tabPassword: '修改密码',
            tabApiKeys: 'API 密钥管理',
            tabProfile: '个人资料',
            currentPasswordLabel: '当前密码',
            currentPasswordPlaceholder: '输入当前密码',
            newPasswordLabel: '新密码',
            newPasswordPlaceholder: '输入新密码',
            confirmPasswordLabel: '确认新密码',
            confirmPasswordPlaceholder: '再次输入新密码',
            updatePasswordButton: '更新密码',
            profileUsernameLabel: '用户名',
            profileRoleLabel: '角色',
            profileCreatedLabel: '创建日期',
            apiKeysDesc: '这里您可以管理您的 Dify API 密钥，这些密钥用于连接到 Dify 服务并使用 AI 功能。',
            apiKeyPlaceholder: '输入 API Key',
            saveApiKeysButton: '保存 API Keys'
        },
        // API密钥模态框
        apiKeys: {
            title: 'API 密钥管理',
            description: '这里您可以查看您的 Dify API 密钥，这些密钥用于连接到 Dify 服务并使用 AI 功能。',
            userStoryTitle: 'User Story 生成器',
            userStoryDesc: '用于生成用户故事的 Dify Workflow API Key',
            userManualTitle: 'User Manual 生成器',
            userManualDesc: '用于生成用户手册的 Dify Agent API Key',
            requirementsAnalysisTitle: '需求分析助手',
            requirementsAnalysisDesc: '用于需求分析的 Dify API Key',
            uxDesignTitle: 'UX 界面设计',
            uxDesignDesc: '用于生成界面设计提示词的 Dify API Key'
        },
        // 管理员面板
        admin: {
            title: '管理员面板',
            tabUsers: '用户管理',
            tabApiKeys: 'API Key 配置',
            tabApiEndpoints: 'API 地址配置',
            addUserButton: '添加用户',
            cleanupButton: '清理脏数据用户',
            loadUsersError: '加载用户列表失败，请重试',
            usersTable: {
                id: 'ID',
                username: '用户名',
                role: '角色',
                createdDate: '创建日期',
                actions: '操作',
                needsRework: '需要修改'
            },
            apiKeysDesc: '在这里您可以为每个用户配置不同的 Dify API 密钥。',
            selectUserLabel: '选择用户',
            apiKeyPlaceholder: '输入 API Key',
            saveApiKeysButton: '保存 API Keys',
            apiEndpointsDesc: '在这里您可以配置全局的Dify API地址，所有用户都将使用这些地址进行API调用。',
            userStoryEndpointDesc: '用于生成用户故事的 Dify Workflow API 地址',
            userManualEndpointDesc: '用于生成用户手册的 Dify Agent API 地址',
            requirementsAnalysisEndpointDesc: '用于需求分析的 Dify API 地址',
            uxDesignEndpointDesc: '用于生成界面设计提示词的 Dify API 地址',
            apiEndpointPlaceholder: '输入 API 地址，例如 http://localhost',
            saveApiEndpointsButton: '保存 API 地址'
        },
        // 添加/编辑用户模态框
        editUser: {
            titleAdd: '添加用户',
            titleEdit: '编辑用户',
            usernameLabel: '用户名',
            usernamePlaceholder: '输入用户名',
            passwordLabel: '密码',
            passwordPlaceholder: '输入密码',
            passwordHelpAdd: '留空则使用默认密码: password123',
            passwordHelpEdit: '留空则保持原密码不变',
            roleLabel: '角色',
            roleUser: '普通用户',
            roleAdmin: '管理员'
        }
    },

    // UX设计页面
    uxDesign: {
        pageTitle: 'EVYD 产品经理AI工作台 - UX 界面设计(POC)',
        title: 'UX 界面设计(POC)',
        loadingInfo: '正在获取应用信息...',
        connectionError: '连接错误',
        connectionErrorDesc: '无法连接到Dify API，请检查API地址和密钥设置。',
        retryConnection: '重试连接',
        appName: 'UX 界面设计助手',
        appDescription: '该工具可以根据需求描述和User Story生成Figma界面设计的AI提示词，帮助您快速创建界面原型。请注意，由于Figma AI功能本身较为原始，生成效果不保证可用。',
        requirementLabel: '需求描述',
        requirementPlaceholder: '请输入User Story Tickets中的描述和Acceptance Criteria的内容，详细的需求描述可以帮助生成更精准的设计提示词。',
        clearButton: '清空',
        generateButton: '生成设计提示词',
        resultTitle: '生成结果',
        systemInfoTitle: '系统信息',
        elapsedTimeLabel: '耗时:',
        totalStepsLabel: '总步骤:',
        totalTokensLabel: '总Token:',
        secondsSuffix: '秒',
        error: {
            emptyRequirement: '请输入需求描述',
            promptRequired: '请输入设计提示词要求'
        }
    },
    
    // User Manual页面
    userManual: {
        pageTitle: 'EVYD 产品经理AI工作台 - User Manual 生成器',
        title: 'AI User Manual 生成器',
        loadingInfo: '正在获取应用信息...',
        connectionError: '连接错误',
        connectionErrorDesc: '无法连接到Dify API，请检查API地址和密钥设置。',
        retryConnection: '重试连接',
        appName: '应用名称',
        appDescription: '应用描述加载中...',
        requirementLabel: '需求描述',
        requirementPlaceholder: '请输入需求的 Acceptance Criteria的内容。',
        clearButton: '清空',
        generateButton: '生成 User Manual',
        resultTitle: '生成结果',
        stopButton: '停止生成',
        systemInfoTitle: '系统信息',
        elapsedTimeLabel: '耗时:',
        totalStepsLabel: '总步骤:',
        totalTokensLabel: '总Token:',
        generating: '生成中，请稍候...',
        secondsSuffix: '秒',
        error: {
            emptyRequirement: '请输入需求描述',
            promptRequired: '请输入手册内容要求'
        }
    },
    
    // User Story页面
    userStory: {
        pageTitle: 'EVYD 产品经理AI工作台 - User Story 生成器',
        title: 'AI User Story 生成器',
        loadingInfo: '正在获取应用信息...',
        connectionError: '连接错误',
        connectionErrorDesc: '无法连接到Dify API，请检查API地址和密钥设置。',
        retryConnection: '重试连接',
        appName: '应用名称',
        appDescription: '应用描述加载中...',
        platformLabel: '平台名称',
        platformPlaceholder: '例如：App, Console',
        systemLabel: '系统名称',
        systemPlaceholder: '例如：Routines, OVA',
        moduleLabel: '模块名称',
        modulePlaceholder: '例如：Logging, Calendar',
        requirementLabel: '需求描述',
        requirementPlaceholder: '详细描述该功能需求，包括目标用户、主要功能点、业务规则等。',
        clearButton: '清空',
        generateButton: '生成 User Story',
        resultTitle: '生成结果',
        stopButton: '停止生成',
        systemInfoTitle: '系统信息',
        elapsedTimeLabel: '耗时:',
        totalStepsLabel: '总步骤:',
        totalTokensLabel: '总Token:',
        retryConnection: '重试连接',
        secondsSuffix: '秒',
        error: {
            platformRequired: '请填写平台名称',
            systemRequired: '请填写系统名称',
            moduleRequired: '请填写模块名称',
            requirementRequired: '请填写需求描述'
        }
    },

    // 密码策略
    policy: {
        length: '密码长度必须至少为8个字符',
        number: '必须包含至少一个数字',
        special: '必须包含至少一个特殊字符',
        uppercase: '必须包含至少一个大写字母',
        lowercase: '必须包含至少一个小写字母'
    },

    // 需求分析助手页面
    requirementAnalysis: {
        pageTitle: "EVYD 产品经理AI工作台 - 需求分析助手",
        title: "AI 需求分析助手",
        loadingInfo: "正在获取应用信息...",
        connectionError: "连接错误",
        connectionErrorDesc: "无法连接到Dify API，请检查API地址和密钥设置。",
        apiKeyMissingError: "未能找到 requirementsAnalysis 的 API 密钥，请在管理员面板配置。",
        apiEndpointMissing: '未能找到 requirementsAnalysis API 地址，请联系管理员检查全局配置。',
        missingParams: '缺少必要参数，无法生成。',
        generationFailed: '生成失败:',
        retryConnection: "重试连接",
        appName: "需求分析助手",
        appDescription: "应用描述加载中...",
        requirementLabel: "需求描述",
        requirementPlaceholder: "请输入需要分析的需求内容。",
        clearButton: "清空",
        resultTitle: "生成结果",
        stopButton: "停止生成",
        systemInfoTitle: "系统信息",
        elapsedTimeLabel: "耗时:",
        totalStepsLabel: "总步骤:",
        totalTokensLabel: "总Token:",
        secondsSuffix: '秒',
        error: {
            requirementRequired: "需求描述不能为空。",
            requirementTooLong: "需求描述不能超过5000字符。"
        }
    },

    // ADD CHAT SPECIFIC KEYS
    chat: {
        newChat: '新对话',
        welcomeMessage: '你好！有什么可以帮您？',
        like: '赞',
        dislike: '踩',
        copy: '复制',
        regenerate: '重新生成',
        tryToAsk: '尝试提问',
        feedbackSubmitted: '感谢反馈！',
        error: {
            fetchParamsFailed: '获取应用配置失败',
            loadMessagesFailed: '加载历史消息失败',
            feedbackFailed: '提交反馈失败',
            inputTooLong: '输入超过 {count} 字符限制'
        }
    },
    // END CHAT SPECIFIC KEYS
}; 