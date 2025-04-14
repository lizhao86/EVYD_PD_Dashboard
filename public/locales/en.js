/**
 * English language pack
 */
window.en = {
    // Common
    common: {
        title: 'EVYD Product Manager AI Workbench',
        subtitle: 'AI-powered product development assistant',
        loading: 'Loading...',
        submit: 'Submit',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        back: 'Back',
        continue: 'Continue',
        logout: 'Logout',
        login: 'Login',
        comingSoon: 'Coming Soon',
        stayTuned: 'Stay Tuned',
        useTool: 'Use Tool',
        tag: {
            ai: 'AI',
            new: 'New',
            poc: 'POC'
        },
        role: {
            admin: 'Administrator',
            user: 'User'
        },
        confirm: 'Confirm',
        alert: {
            deleteConfirm: 'Are you sure you want to delete this item? This action cannot be undone.',
            dirtyDataCleanupConfirm: 'Are you sure you want to clean up all user data without the correct ID format? This action cannot be undone.',
            cannotDeleteSelf: 'You cannot delete the currently logged-in user account.',
            cannotDeleteLastAdmin: 'You cannot delete the only administrator account.',
            userNotFound: 'User to delete not found, they may have already been deleted.',
            deleteFailed: 'Deletion failed',
            deleteSuccess: 'Deletion successful',
            cleanupFailed: 'Cleanup failed',
            cleanupSuccess: 'Successfully cleaned up {count} dirty data users.',
            noDirtyData: 'No dirty data users found.'
        },
        message: {
            fillAllFields: 'Please fill in all fields.',
            passwordsNotMatch: 'New password does not match confirmation password.',
            userNotLoggedIn: 'User not logged in.',
            cannotGetUser: 'Unable to retrieve user information.',
            wrongCurrentPassword: 'Incorrect current password.',
            passwordUpdateSuccess: 'Password updated successfully.',
            passwordUpdateFailed: 'Password update failed.',
            selectUser: 'Please select a user.',
            userNotExist: 'User does not exist.',
            updateFailed: 'Update failed.',
            apiKeyUpdateSuccess: 'API keys updated successfully.',
            apiEndpointUpdateSuccess: 'API addresses updated successfully.',
            usernameRequired: 'Please enter a username.',
            usernameExists: 'Username already exists.',
            userAddSuccess: 'User added successfully.',
            userAddFailed: 'Failed to add user.',
            userAddError: 'Error adding user: {error}'
        },
        generating: 'Generating...Click to stop',
        stopGeneration: 'Stop Generation',
        backToHome: 'Back to Home',
        requesting: 'Requesting...',
        generatingSimple: 'Generating...',
        generationStopped: '(Generation stopped)',
        copied: 'Copied!',
        copyFailed: 'Copy Failed',
        
        // Unified button states
        button: {
            generate: 'Send to Dify',
            processing: 'Processing...',
            generating: 'Generating...Click to stop'
        }
    },
    
    // Navigation
    nav: {
        home: 'Home',
        aiTools: 'AI Tools',
        docs: 'Documentation',
        productRequirements: 'Product Requirements',
        apiDocs: 'API Documentation',
        tutorials: 'Tutorials',
        adminPanel: 'Admin Panel'
    },
    
    // Example page
    example: {
        pageTitle: 'Multilingual Example Page',
        welcome: 'Welcome to EVYD Product Manager AI Workbench',
        description: 'This is an example page with multilingual support. You can switch between languages using the language selector in the top right corner.',
        languageSelect: 'Select Language',
        featureListing: 'Feature List',
        feature1: 'AI-driven product requirements generation',
        feature2: 'Automated user story creation',
        feature3: 'Multilingual interface support',
        buttonDemo: 'Example Button',
        greeting: 'Hello, World!',
        documentation: 'View Documentation',
        currentLanguage: 'Current Language: English'
    },

    // Homepage
    homepage: {
        title: 'EVYD Product Manager AI Workbench',
        hero: {
            title: 'AI-Powered Product Manager Workbench',
            description: 'Simplify product development workflows, enhance creativity, and automate documentation with AI, allowing product managers to focus on more creative tasks.'
        },
        category: {
            foresight: {
                title: 'Foresight Research',
                description: 'Collect and analyze market, competitor, and customer information to support product decisions.'
            },
            aiAssistant: {
                title: 'AI Assistant Tools',
                description: 'Utilize AI technology to simplify the daily work of product managers, completing tasks from requirements analysis to documentation with one click.'
            },
            dataAnalysis: {
                title: 'Data Analysis Tools',
                description: 'Integrate various data analysis tools to help product managers gain insights from data and support decision-making.'
            }
        },
        tool: {
            marketInsight: {
                title: 'Market Insight',
                description: 'Collect and analyze market trend data, identify opportunities and risks, and help formulate market strategies.',
                tag1: 'Market Research',
                tag2: 'Trend Analysis'
            },
            competitorAnalysis: {
                title: 'Competitor Analysis',
                description: 'Comprehensively analyze competitor product features, strengths, weaknesses, and strategies to develop differentiated competitive plans.',
                tag1: 'Competitive Intelligence',
                tag2: 'SWOT Analysis'
            },
            targetCustomerAnalysis: {
                title: 'Target Customer Analysis',
                description: 'Create user personas, analyze customer needs and behavior patterns, and guide product design decisions.',
                tag1: 'User Persona',
                tag2: 'Needs Analysis'
            },
            requirementsAssistant: {
                title: 'Requirements Assistant',
                description: 'Analyze requirements documents, identify key points, extract feature lists, and provide optimization suggestions.',
                tag1: 'Text Analysis',
                tag2: 'Requirements Management'
            },
            aiUserStory: {
                title: 'AI Write User Story',
                description: 'Automatically generate structured user stories and acceptance criteria based on simple descriptions, supporting export in multiple formats.',
                tag1: 'Dify Workflow',
                tag2: 'Natural Language Processing'
            },
            aiUserManual: {
                title: 'AI Write User Manual',
                description: 'Generate clear and concise user manuals for your product, automatically creating operation guides and FAQs.',
                tag1: 'Dify Agent',
                tag2: 'Documentation Generation'
            },
            uxDesign: {
                title: 'UX Interface Design (POC)',
                description: 'Generate AI prompts for Figma interface design based on requirements descriptions and User Stories, accelerating interface prototyping.',
                tag1: 'Dify API',
                tag2: 'Figma AI'
            },
            userBehaviorAnalysis: {
                title: 'User Behavior Analysis',
                description: 'Analyze user behavior data when using the product, generate heatmaps and behavior paths, and identify optimization points.',
                tag1: 'Behavior Analysis',
                tag2: 'User Experience'
            }
        }
    },

    // Footer
    footer: {
        title: 'EVYD Product Manager AI Workbench',
        description: 'An all-in-one platform for product managers based on EVYD\'s advanced AI technology, improving work efficiency and output quality.',
        copyright: '© 2023 EVYD Technology',
        link: {
            about: 'About Us',
            terms: 'Terms of Use',
            privacy: 'Privacy Policy'
        }
    },

    // Header
    header: {
        title: 'Product Manager AI Workbench',
        subtitle: 'AI-powered product development assistant',
        userMenu: {
            settings: 'Account Settings'
        }
    },
    
    // Language Selector
    language: {
        current: 'English',
        zhCN: '简体中文',
        zhTW: '繁體中文',
        en: 'English'
    },
    
    // Modals Common
    modal: {
        // Login Modal
        login: {
            title: 'Login',
            tabLogin: 'Login',
            tabRegister: 'Register',
            usernameLabel: 'Username',
            usernamePlaceholder: 'Enter username',
            passwordLabel: 'Password',
            passwordPlaceholder: 'Enter password',
            submitButton: 'Login'
        },
        // Settings Modal
        settings: {
            title: 'Account Settings',
            tabPassword: 'Change Password',
            tabApiKeys: 'API Key Management',
            tabProfile: 'Profile',
            currentPasswordLabel: 'Current Password',
            currentPasswordPlaceholder: 'Enter current password',
            newPasswordLabel: 'New Password',
            newPasswordPlaceholder: 'Enter new password',
            confirmPasswordLabel: 'Confirm New Password',
            confirmPasswordPlaceholder: 'Enter new password again',
            updatePasswordButton: 'Update Password',
            profileUsernameLabel: 'Username',
            profileRoleLabel: 'Role',
            profileCreatedLabel: 'Date Created',
            apiKeysDesc: 'Here you can manage your Dify API keys used to connect to Dify services and use AI features.',
            apiKeyPlaceholder: 'Enter API Key',
            saveApiKeysButton: 'Save API Keys'
        },
        // API Keys Modal
        apiKeys: {
            title: 'API Key Management',
            description: 'Here you can view your Dify API keys used to connect to Dify services and use AI features.',
            userStoryTitle: 'User Story Generator',
            userStoryDesc: 'Dify Workflow API Key for generating user stories',
            userManualTitle: 'User Manual Generator',
            userManualDesc: 'Dify Agent API Key for generating user manuals',
            requirementsAnalysisTitle: 'Requirements Assistant',
            requirementsAnalysisDesc: 'Dify API Key for requirements analysis',
            uxDesignTitle: 'UX Interface Design',
            uxDesignDesc: 'Dify API Key for generating interface design prompts'
        },
        // Admin Panel
        admin: {
            title: 'Admin Panel',
            tabUsers: 'User Management',
            tabApiKeys: 'API Key Config',
            tabApiEndpoints: 'API Address Config',
            addUserButton: 'Add User',
            cleanupButton: 'Cleanup Dirty Data Users',
            loadUsersError: 'Failed to load user list, please try again',
            usersTable: {
                id: 'ID',
                username: 'Username',
                role: 'Role',
                createdDate: 'Date Created',
                actions: 'Actions',
                needsRework: 'Needs Rework'
            },
            apiKeysDesc: 'Here you can configure different Dify API keys for each user.',
            selectUserLabel: 'Select User',
            apiKeyPlaceholder: 'Enter API Key',
            saveApiKeysButton: 'Save API Keys',
            apiEndpointsDesc: 'Here you can configure the global Dify API addresses used by all users for API calls.',
            userStoryEndpointDesc: 'Dify Workflow API address for generating user stories',
            userManualEndpointDesc: 'Dify Agent API address for generating user manuals',
            requirementsAnalysisEndpointDesc: 'Dify API address for requirements analysis',
            uxDesignEndpointDesc: 'Dify API address for generating interface design prompts',
            apiEndpointPlaceholder: 'Enter API address, e.g., http://localhost',
            saveApiEndpointsButton: 'Save API Addresses'
        },
        // Add/Edit User Modal
        editUser: {
            titleAdd: 'Add User',
            titleEdit: 'Edit User',
            usernameLabel: 'Username',
            usernamePlaceholder: 'Enter username',
            passwordLabel: 'Password',
            passwordPlaceholder: 'Enter password',
            passwordHelpAdd: 'Leave blank to use default password: password123',
            passwordHelpEdit: 'Leave blank to keep the current password',
            roleLabel: 'Role',
            roleUser: 'User',
            roleAdmin: 'Administrator'
        }
    },

    // UX Design Page
    uxDesign: {
        pageTitle: 'EVYD Product Manager AI Workbench - UX Interface Design (POC)',
        title: 'UX Interface Design (POC)',
        loadingInfo: 'Loading application information...',
        connectionError: 'Connection Error',
        connectionErrorDesc: 'Unable to connect to Dify API, please check API address and key settings.',
        retryConnection: 'Retry Connection',
        appName: 'UX Design Assistant',
        appDescription: 'This tool can generate AI prompts for Figma interface design based on requirement descriptions and User Stories, helping you quickly create interface prototypes. Please note that due to the primitive nature of Figma AI functionality, the generated results are not guaranteed to be usable.',
        requirementLabel: 'Requirement Description',
        requirementPlaceholder: 'Please enter the descriptions and Acceptance Criteria from User Story Tickets. Detailed requirement descriptions help generate more precise design prompts.',
        clearButton: 'Clear',
        generateButton: 'Generate Design Prompts',
        resultTitle: 'Generated Results',
        systemInfoTitle: 'System Information',
        elapsedTimeLabel: 'Time Elapsed:',
        totalStepsLabel: 'Total Steps:',
        totalTokensLabel: 'Total Tokens:',
        secondsSuffix: 's',
        error: {
            emptyRequirement: 'Please enter the requirement description',
            promptRequired: 'Please enter design prompt requirements'
        }
    },
    
    // User Manual Page
    userManual: {
        pageTitle: 'EVYD Product Manager AI Workbench - User Manual Generator',
        title: 'AI User Manual Generator',
        loadingInfo: 'Loading application information...',
        connectionError: 'Connection Error',
        connectionErrorDesc: 'Unable to connect to Dify API, please check API address and key settings.',
        retryConnection: 'Retry Connection',
        appName: 'Application Name',
        appDescription: 'Loading application description...',
        requirementLabel: 'Requirement Description',
        requirementPlaceholder: 'Please enter the Acceptance Criteria content of the requirement.',
        clearButton: 'Clear',
        generateButton: 'Generate User Manual',
        resultTitle: 'Generated Results',
        stopButton: 'Stop Generation',
        systemInfoTitle: 'System Information',
        elapsedTimeLabel: 'Time Elapsed:',
        totalStepsLabel: 'Total Steps:',
        totalTokensLabel: 'Total Tokens:',
        generating: 'Generating, please wait...',
        secondsSuffix: 's',
        error: {
            emptyRequirement: 'Please enter the requirement description',
            promptRequired: 'Please enter manual content requirements'
        }
    },
    
    // User Story Page
    userStory: {
        pageTitle: 'EVYD Product Manager AI Workbench - User Story Generator',
        title: 'AI User Story Generator',
        loadingInfo: 'Loading application information...',
        connectionError: 'Connection Error',
        connectionErrorDesc: 'Unable to connect to Dify API, please check API address and key settings.',
        retryConnection: 'Retry Connection',
        appName: 'Application Name',
        appDescription: 'Loading application description...',
        platformLabel: 'Platform Name',
        platformPlaceholder: 'E.g.: App, Console',
        systemLabel: 'System Name',
        systemPlaceholder: 'E.g.: Routines, OVA',
        moduleLabel: 'Module Name',
        modulePlaceholder: 'E.g.: Logging, Calendar',
        requirementLabel: 'Requirement Description',
        requirementPlaceholder: 'Describe the feature requirement in detail, including target users, main functionality, and business rules.',
        clearButton: 'Clear',
        generateButton: 'Generate User Story',
        resultTitle: 'Generated Results',
        stopButton: 'Stop Generation',
        systemInfoTitle: 'System Information',
        elapsedTimeLabel: 'Time Elapsed:',
        totalStepsLabel: 'Total Steps:',
        totalTokensLabel: 'Total Tokens:',
        secondsSuffix: 's',
        error: {
            platformRequired: 'Please enter Platform Name',
            systemRequired: 'Please enter System Name',
            moduleRequired: 'Please enter Module Name',
            requirementRequired: 'Please enter Requirement Description'
        }
    },

    // Password Policy
    policy: {
        length: 'Password must be at least 8 characters long',
        number: 'Must contain at least one number',
        special: 'Must contain at least one special character',
        uppercase: 'Must contain at least one uppercase letter',
        lowercase: 'Must contain at least one lowercase letter'
    }
}; 