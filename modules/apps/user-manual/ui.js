/**
 * EVYD产品经理AI工作台 - User Manual生成器
 * UI交互模块
 */

// UI交互模块
const UI = {
    /**
     * 初始化用户界面
     */
    initUserInterface() {
        console.log('初始化UI...');
        
        // 检查用户登录状态
        const currentUser = Auth.checkAuth();
        console.log('当前用户:', currentUser);
        
        const userInfo = document.getElementById('user-info');
        const loginButton = document.getElementById('login-button');
        const usernameDisplay = document.getElementById('username-display');
        
        if (currentUser) {
            // 用户已登录，显示用户信息
            userInfo.style.display = 'flex';
            loginButton.style.display = 'none';
            
            usernameDisplay.textContent = currentUser.username;
            
            // 检查用户是否是管理员
            if (currentUser.role === 'admin') {
                document.getElementById('admin-panel-link').style.display = 'block';
            } else {
                document.getElementById('admin-panel-link').style.display = 'none';
            }
            
            console.log('显示登录用户:', currentUser.username);
        } else {
            // 用户未登录，显示登录按钮
            userInfo.style.display = 'none';
            loginButton.style.display = 'block';
            console.log('未登录状态');
        }
        
        // 绑定登出按钮事件
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', function(e) {
                e.preventDefault();
                Auth.logout();
                UI.initUserInterface();
                window.location.reload();
            });
        }
    },
    
    /**
     * 显示加载状态
     */
    showLoading() {
        document.getElementById('app-info-loading').style.display = 'block';
        document.getElementById('app-info-error').style.display = 'none';
        document.getElementById('app-info').style.display = 'none';
        document.getElementById('app-form').style.display = 'none';
    },
    
    /**
     * 显示错误信息
     */
    showError(message) {
        console.error('显示错误:', message);
        document.getElementById('app-info-loading').style.display = 'none';
        document.getElementById('app-info-error').style.display = 'block';
        document.getElementById('app-info').style.display = 'none';
        document.getElementById('app-form').style.display = 'none';
        
        document.getElementById('error-message').textContent = message;
    },
    
    /**
     * 显示应用信息
     */
    displayAppInfo(data) {
        console.log('显示应用信息:', data);
        document.getElementById('app-info-loading').style.display = 'none';
        document.getElementById('app-info-error').style.display = 'none';
        document.getElementById('app-info').style.display = 'block';
        document.getElementById('app-form').style.display = 'block';
        
        // 显示应用信息
        document.getElementById('app-name').textContent = data.name || 'User Manual 生成器';
        document.getElementById('app-description').textContent = data.description || '通过AI快速生成用户手册，提高产品体验和用户满意度。';
        
        // 显示标签
        const tagsContainer = document.getElementById('app-tags');
        tagsContainer.innerHTML = '';
        
        if (data.tags && data.tags.length > 0) {
            data.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'app-tag';
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });
        }
    },
    
    /**
     * 显示开始生成状态
     */
    showGenerationStarted() {
        console.log('开始生成...');
        
        // 显示结果区域
        document.getElementById('result-container').style.display = 'block';
        
        // 获取国际化文本
        let generatingText = '生成中，请稍候...'; // 默认文本
        if (typeof I18n !== 'undefined' && typeof I18n.t === 'function') {
            generatingText = I18n.t('userManual.generating');
        }
        document.getElementById('result-content').textContent = generatingText;
        document.getElementById('result-content').style.display = 'block';
        
        // 如果有Markdown区域，先隐藏
        const markdownDiv = document.getElementById('result-content-markdown');
        if (markdownDiv) {
            markdownDiv.style.display = 'none';
        }
        
        // 隐藏统计信息
        document.getElementById('result-stats').style.display = 'none';
        
        // 设置生成按钮状态为停止
        const generateButton = document.getElementById('generate-manual');
        
        // 获取停止生成按钮文本
        let stopGenerationText = '停止生成'; // 默认文本
        if (typeof I18n !== 'undefined' && typeof I18n.t === 'function') {
            stopGenerationText = I18n.t('common.stopGeneration');
        }
        generateButton.textContent = stopGenerationText;
        generateButton.setAttribute('data-action', 'stop');
        generateButton.classList.add('btn-danger');
        
        // 显示停止按钮
        document.getElementById('stop-generation').style.display = 'inline-block';
        
        // 滚动到结果区域
        setTimeout(() => {
            document.getElementById('result-container').scrollIntoView({ behavior: 'smooth' });
        }, 100);
    },
    
    /**
     * 显示生成完成状态
     */
    showGenerationCompleted() {
        console.log('生成完成');
        
        // 恢复生成按钮状态
        const generateButton = document.getElementById('generate-manual');
        
        // 获取生成按钮文本
        let generateButtonText = '生成 User Manual'; // 默认文本
        if (typeof I18n !== 'undefined' && typeof I18n.t === 'function') {
            generateButtonText = I18n.t('userManual.generateButton');
        }
        generateButton.textContent = generateButtonText;
        generateButton.setAttribute('data-action', 'generate');
        generateButton.classList.remove('btn-danger');
        
        // 隐藏停止按钮
        document.getElementById('stop-generation').style.display = 'none';
    },
    
    /**
     * 显示统计信息
     */
    displayStats(data) {
        console.log('显示统计信息:', data);
        
        const statsContainer = document.getElementById('result-stats');
        
        if (data) {
            // 获取国际化的"秒"后缀
            let secondsSuffix = '秒';
            if (typeof I18n !== 'undefined' && typeof I18n.t === 'function') {
                secondsSuffix = I18n.t('userManual.secondsSuffix');
            }
            
            // 更新统计数据
            document.getElementById('elapsed-time').textContent = `${data.elapsed_time.toFixed(2)}${secondsSuffix}`;
            document.getElementById('total-tokens').textContent = data.total_tokens;
            document.getElementById('total-steps').textContent = data.total_steps || 1;
            
            // 显示统计区域
            statsContainer.style.display = 'flex';
        } else {
            statsContainer.style.display = 'none';
        }
    },
    
    /**
     * 显示用户信息
     */
    loadUserProfile() {
        const currentUser = Auth.checkAuth();
        if (!currentUser) return;
        
        document.getElementById('profile-username').value = currentUser.username;
        document.getElementById('profile-role').value = currentUser.role;
        
        // 格式化日期
        const createdDate = new Date(currentUser.created);
        const formattedDate = createdDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        document.getElementById('profile-created').value = formattedDate;
    },
    
    /**
     * 显示API密钥
     */
    loadUserApiKeys() {
        const currentUser = Auth.checkAuth();
        if (!currentUser) return;
        
        // 显示各应用的API密钥
        const userStoryKey = document.getElementById('userStory-api-key');
        const userManualKey = document.getElementById('userManual-api-key');
        const requirementsAnalysisKey = document.getElementById('requirementsAnalysis-api-key');
        
        if (userStoryKey) {
            userStoryKey.value = currentUser.apiKeys.userStory || '';
        }
        
        if (userManualKey) {
            userManualKey.value = currentUser.apiKeys.userManual || '';
        }
        
        if (requirementsAnalysisKey) {
            requirementsAnalysisKey.value = currentUser.apiKeys.requirementsAnalysis || '';
        }
    },
    
    /**
     * 显示表单信息
     */
    showFormMessage(elementId, message, type = 'info') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.textContent = message;
        element.className = `form-message ${type}`;
    }
};