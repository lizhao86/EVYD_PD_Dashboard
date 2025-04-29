/**
 * EVYD产品经理AI工作台
 * 国际化(i18n)工具模块
 */

import { getCurrentUserSettings, saveCurrentUserSetting } from '/scripts/services/storage.js';
import { checkAuth } from '/modules/auth/auth.js'; // Needed to check login status
import { Auth } from 'aws-amplify'; // Added for Auth module

// 国际化工具
const I18n = {
    // 支持的语言
    supportedLanguages: {
        'zh-CN': '简体中文',
        'zh-TW': '繁體中文',
        'en': 'English'
    },
    
    // 当前语言
    currentLang: 'zh-CN', // Default language
    
    // 当前翻译内容
    translations: null,
    
    isInitialized: false,
    isAutoRefreshBlocked: true, // 防止首次加载时自动刷新页面
    currentUser: null, // Store auth info
    userSettings: null, // Store user settings
    
    /**
     * 初始化国际化模块 (async)
     */
    async init() {
        // console.log('I18n.init() 开始初始化...');
        
        if (this.isInitialized) {
            // console.log('I18n 已经初始化，跳过');
            return this.currentLang;
        }
        
        // 1. 不再在此处添加加载类，假设已由<head>中的内联脚本添加
        // document.documentElement.classList.add('i18n-loading'); 
        
        // 2. 优先从 localStorage 获取语言
        const storedLang = localStorage.getItem('language');
        let initialLang = storedLang || 'zh-CN'; // 默认简体中文
        
        // 3. 验证初始语言是否支持
        if (!this.supportedLanguages[initialLang]) {
            console.warn(`本地存储语言 '${initialLang}' 无效, 重置为 zh-CN`);
            initialLang = 'zh-CN';
            localStorage.setItem('language', initialLang); // 修正本地存储
        }
        
        // 4. 立即设置初始语言，但不加载翻译或应用
        this.currentLang = initialLang;
        document.documentElement.lang = this.currentLang;
        // console.log(`初始语言确定为 (来自本地存储或默认): ${this.currentLang}`);

        // 5. 异步检查用户设置和认证
        let preferredLang = null;
        try {
            const authInfo = await checkAuth();
            if (authInfo && authInfo.user) {
                this.currentUser = authInfo.user;
                try {
                    this.userSettings = await getCurrentUserSettings();
                    if (this.userSettings && this.userSettings.language) {
                        preferredLang = this.userSettings.language;
                        // console.log(`从用户设置中获取到首选语言: ${preferredLang}`);
                        
                        // 验证云端语言是否支持
                        if (!this.supportedLanguages[preferredLang]) {
                            console.warn(`用户云端设置语言 '${preferredLang}' 无效，将忽略`);
                            preferredLang = null; // 忽略无效的云端设置
                        }
                    } else {
                        // console.log('用户已登录但无云端语言设置');
                    }
                } catch (settingsError) {
                     console.error("获取用户设置时出错:", settingsError);
                     // 即使获取设置失败，也继续使用localStorage的语言
                }
            }
        } catch (error) {
            console.error("检查用户认证时出错:", error);
        }
        
        // 6. 确定最终语言 (用户设置优先)
        const finalLang = preferredLang || this.currentLang;
        // console.log(`最终语言确定为: ${finalLang}`);
        
        // 7. 如果最终语言与初始语言不同，更新状态
        if (finalLang !== this.currentLang) {
            // console.log(`语言从 ${this.currentLang} 更新为 ${finalLang} (基于用户设置)`);
            this.currentLang = finalLang;
            document.documentElement.lang = this.currentLang;
            // 同时更新localStorage，保持一致性
            localStorage.setItem('language', this.currentLang);
            // console.log(`更新本地存储的语言为: ${this.currentLang}`);
        }

        // 8. 加载最终确定的语言的翻译
        // console.log(`开始加载最终语言 ${this.currentLang} 的翻译...`);
        await this.loadTranslations(); // loadTranslations 内部会调用 applyTranslations 并移除加载类
        
        // 根据当前语言设置文档方向 (如果需要RTL支持)
        if (this.currentLang === 'ar' || this.currentLang === 'he') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
        
        this.isInitialized = true;
        this.isAutoRefreshBlocked = false; // 初始化完成后允许自动刷新
        // console.log('I18n 初始化完成');
        
        // 更新语言选择器显示
        this.updateLanguageDisplay();

        // 9. 移除加载类的操作移到 loadTranslations 内部完成

        return this.currentLang;
    },
    
    // 更新语言选择器显示
    updateLanguageDisplay() {
        const display = document.getElementById('current-language-display');
        if (display) {
            display.textContent = this.supportedLanguages[this.currentLang] || this.currentLang;
            // console.log(`更新语言选择器显示为: ${display.textContent}`);
        } else {
            // console.log('未找到语言选择器显示元素');
        }
    },
    
    /**
     * 動態加載語言文件
     * @param {string} lang 語言代碼
     * @returns {Promise} 加載完成的Promise
     */
    async loadLanguageFile(lang) {
        // 檢查window對象上是否已有該語言對象
        const langCode = lang.replace('-', ''); // 轉換 zh-CN 為 zhCN 格式
        if (window[langCode]) {
            // console.log(`語言文件 ${lang}.js 已存在于window对象中`);
            return Promise.resolve();
        }
        
        // 检查当前页面是否已经加载了语言文件脚本
        const existingScript = document.querySelector(`script[src="/locales/${lang}.js"]`);
        if (existingScript) {
            // console.log(`語言文件 ${lang}.js 脚本标签已存在，但window对象中没有相应变量，尝试重新加载`);
            return new Promise((resolve, reject) => {
                // 移除旧脚本并重新加载
                existingScript.remove();
                const script = document.createElement('script');
                script.src = `/locales/${lang}.js`;
                script.onload = () => {
                    if (window[langCode]) {
                        // console.log(`語言文件 ${lang}.js 重新加载成功`);
                        resolve();
                    } else {
                        console.error(`重新加载语言文件后，window.${langCode}仍不存在`);
                        reject(new Error(`語言文件 ${lang}.js 加載失敗，window.${langCode}不存在`));
                    }
                };
                script.onerror = () => {
                    console.error(`無法加載語言文件: ${lang}.js`);
                    reject(new Error(`無法加載語言文件: ${lang}.js`));
                };
                document.head.appendChild(script);
            });
        }

        // 加载新的语言文件
        // console.log(`尝试加载新的语言文件: ${lang}.js`);
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `/locales/${lang}.js`;
            script.onload = () => {
                if (window[langCode]) {
                    // console.log(`語言文件 ${lang}.js 加載成功`);
                    resolve();
                } else {
                    console.error(`加载语言文件后，window.${langCode}不存在`);
                    reject(new Error(`語言文件 ${lang}.js 加載失敗，window.${langCode}不存在`));
                }
            };
            script.onerror = () => {
                console.error(`無法加載語言文件: ${lang}.js`);
                reject(new Error(`無法加載語言文件: ${lang}.js`));
            };
            document.head.appendChild(script);
        });
    },
    
    /**
     * 加载翻译内容
     */
    async loadTranslations() {
        try {
            // 根據當前語言加載對應的語言文件
            // console.log(`加载语言 ${this.currentLang} 的翻译内容`);
            const langCode = this.currentLang.replace('-', ''); // zh-CN -> zhCN
            
            // 检查window对象上是否已有翻译，如果没有则加载文件
            if (!window[langCode]) {
                // console.log(`未找到 window.${langCode}，尝试加载 ${this.currentLang}.js`);
                await this.loadLanguageFile(this.currentLang);
            } else {
                // console.log(`已存在 window.${langCode}，直接使用`);
            }
            
            // 从window对象获取翻译
            this.translations = window[langCode] || {};
            
            if (!this.translations || Object.keys(this.translations).length === 0) {
                console.warn(`警告: 語言包 ${this.currentLang} 加載失敗或為空`);
            } else {
                // console.log(`成功设置语言 ${this.currentLang} 的翻译内容，包含 ${Object.keys(this.translations).length} 个顶级键`);
            }
            
            // 应用翻译
            this.applyTranslations();
            
            // 关键：在翻译应用完成后从 <html> 移除加载状态类
            document.documentElement.classList.remove('i18n-loading');
            // console.log('已移除 <html> 上的 i18n-loading 类，内容已显示');
            
        } catch (error) {
            console.error(`加載翻譯內容時出錯:`, error);
            this.translations = {};
            // 即使加载失败，也要移除加载状态
            document.documentElement.classList.remove('i18n-loading');
            console.error('翻译加载失败，但已移除 <html> 上的 i18n-loading 类');
        }
    },
    
    /**
     * 获取翻译文本
     * @param {string} key 翻译键，支持点表示法，如 'common.submit'
     * @param {Object} params 替换参数
     * @returns {string} 翻译后的文本
     */
    t(key, params = {}) {
        if (!key) return '';
        if (!this.translations) {
            console.warn('调用t()时translations为null，尝试加载翻译');
            this.loadTranslations();
        }
        
        // 分解键，支持点表示法
        const keys = key.split('.');
        let value = this.translations;
        
        // 遍历键路径获取翻译值
        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                console.warn(`翻译键不存在: ${key}`);
                // 如果提供了默認值，則使用默認值
                if (params.default) {
                    return params.default;
                }
                return key;
            }
        }
        
        // 如果找到的值不是字符串，返回键名或默認值
        if (typeof value !== 'string') {
            console.warn(`翻译值不是字符串: ${key}`);
            return params.default || key;
        }
        
        // 替换参数 {name} 形式的占位符
        if (params && Object.keys(params).length > 0) {
            return value.replace(/{(\w+)}/g, (match, paramName) => {
                return params[paramName] !== undefined ? params[paramName] : match;
            });
        }
        
        return value;
    },
    
    /**
     * 切换应用程序语言
     * @param {string} lang - 目标语言代码
     * @param {boolean} [skipSaving=false] - 是否跳过保存到用户设置
     * @param {boolean} [forceReload=false] - 是否强制页面刷新
     * @returns {Promise<boolean>} - 切换是否成功
     */
    async switchLanguage(lang, skipSaving = false, forceReload = false) {
        try {
            console.log(`尝试切换语言到: ${lang}`);

            // 先检查语言是否已加载
            if (this.translations) {
                console.log(`使用缓存的翻译数据切换到 ${lang}`);
                this.currentLang = lang;
                this.applyTranslations();
            } else {
                // 加载新语言
                console.log(`尝试加载新语言: ${lang}`);
                await this.loadLanguageFile(lang);
                this.currentLang = lang;
                this.applyTranslations();
            }

            // 保存用户语言偏好
            if (!skipSaving) {
                console.log(`将尝试保存语言偏好到云端: ${lang}`);
                const saveResult = await this.saveLanguagePreference(lang);
                console.log(`保存语言偏好到云端结果: ${saveResult ? '成功' : '失败'}`);
                
                // 立即强制刷新页面确保翻译完全生效
                // 无论是否为首次加载，都刷新
                if (saveResult) {
                    console.log('语言切换成功，将在300ms后刷新页面以完全应用新语言');
                    // 使用短暂延迟以确保设置已保存并允许日志输出
                    setTimeout(() => {
                        console.log('执行页面刷新...');
                        window.location.reload();
                    }, 300);
                }
            }
            
            // 强制页面刷新（当明确要求时）
            if (forceReload) {
                console.log('根据请求强制刷新页面');
                window.location.reload();
            }

            return true;
        } catch (error) {
            console.error('切换语言时出错:', error);
            return false;
        }
    },
    
    /**
     * 保存用户语言偏好到数据库
     * @param {string} lang - 语言代码 (例如 'zh-CN', 'en')
     * @returns {Promise<boolean>} 是否成功保存
     */
    async saveLanguagePreference(lang) {
        if (!lang || typeof lang !== 'string' || lang.trim() === '') {
            console.error(`无效的语言值: "${lang}"`);
            return false;
        }
        
        const normalizedLang = lang.trim();
        
        // 总是保存到本地存储，确保在刷新页面后仍能保持语言设置
        localStorage.setItem('language', normalizedLang);
        console.log(`语言偏好已保存到本地存储: ${normalizedLang}`);
        
        // 在会话存储中记录语言变更，以便在其他页面同步
        sessionStorage.setItem('languageJustChanged', 'true');
        sessionStorage.setItem('lastChangedLang', normalizedLang);
        sessionStorage.setItem('langChangeTimestamp', Date.now().toString());
        
        // 检查用户登录状态
        let isLoggedIn = false;
        let userId = null;
        try {
            // 使用checkAuth()函数重新确认登录状态，避免依赖可能过期的this.currentUser
            const authInfo = await checkAuth();
            isLoggedIn = !!(authInfo && authInfo.user);
            if (isLoggedIn && authInfo.user) {
                userId = authInfo.user.username || authInfo.user.attributes?.sub;
            }
            
            // 如果authInfo有效但this.currentUser为空，更新当前用户信息
            if (isLoggedIn && !this.currentUser) {
                this.currentUser = authInfo.user;
            }
        } catch (authError) {
            console.error('检查认证状态时出错:', authError);
            isLoggedIn = false;
        }
        
        if (!isLoggedIn) {
            return true; // 即使用户未登录，本地保存也是"成功"的
        }
        
        // 使用Promise.race设置超时，防止保存操作长时间阻塞UI
        const saveTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('保存语言偏好到云端超时')), 5000);
        });
        
        try {
            // 确保传递正确的格式给saveCurrentUserSetting
            const payload = { 
                language: normalizedLang,
                id: userId // 提供用户ID以防认证过期
            };
            
            // 使用Promise.race确保操作不会无限期阻塞
            const result = await Promise.race([
                saveCurrentUserSetting(payload),
                saveTimeout
            ]);
            
            if (result) {
                // 更新本地状态
                if (this.userSettings) {
                    this.userSettings.language = normalizedLang;
                } else {
                    this.userSettings = { language: normalizedLang };
                }
                
                return true;
            } else {
                // 尝试直接从Auth获取用户信息并再次尝试保存
                try {
                    const authUser = await Auth.currentAuthenticatedUser();
                    if (authUser) {
                        const secondPayload = {
                            language: normalizedLang,
                            id: authUser.username || authUser.attributes?.sub,
                            _force: true
                        };
                        
                        const secondResult = await Promise.race([
                            saveCurrentUserSetting(secondPayload),
                            saveTimeout
                        ]);
                        
                        if (secondResult) {
                            return true;
                        }
                    }
                } catch (authRetryError) {
                    console.error('通过Auth重试保存失败');
                }
                
                // 即使数据库保存失败，本地设置仍然已经更新，所以返回部分成功
                return true;
            }
        } catch (error) {
            console.error("保存语言偏好到云端时出错");
            
            // 尝试一次直接通过ID保存（跳过认证检查）
            if (userId) {
                try {
                    const emergencyPayload = { 
                        id: userId,
                        language: normalizedLang,
                        _force: true
                    };
                    
                    const emergencyResult = await Promise.race([
                        saveCurrentUserSetting(emergencyPayload),
                        saveTimeout
                    ]);
                    
                    if (emergencyResult) {
                        return true;
                    }
                } catch (emergencyError) {
                    console.error('紧急保存失败');
                }
            }
            
            // 实在不行，尝试最后一次通过Auth模块直接获取用户
            try {
                const user = await Auth.currentAuthenticatedUser();
                if (user) {
                    const finalPayload = { 
                        id: user.username || user.attributes?.sub,
                        language: normalizedLang,
                        _force: true
                    };
                    
                    const finalResult = await Promise.race([
                        saveCurrentUserSetting(finalPayload),
                        saveTimeout
                    ]);
                    
                    if (finalResult) {
                        return true;
                    }
                }
            } catch (finalError) {
                console.error('所有保存尝试均失败');
            }
            
            // 即使所有云端保存尝试都失败，本地设置已更新，标记为部分成功
            return true;
        }
    },
    
    /**
     * 获取当前语言代码
     * @returns {string} 当前语言代码
     */
    getCurrentLanguage() {
        return this.currentLang;
    },
    
    /**
     * 获取当前语言名称
     * @returns {string} 当前语言名称
     */
    getCurrentLanguageName() {
        return this.supportedLanguages[this.currentLang] || '';
    },
    
    /**
     * 获取所有支持的语言
     * @returns {Object} 语言代码到语言名称的映射
     */
    getSupportedLanguages() {
        return this.supportedLanguages;
    },

    /**
     * 应用翻译到页面上所有带有 data-translate 属性的元素
     * @param {HTMLElement|null} container 可选的容器元素，仅翻译其中的元素。若为null则翻译整个文档
     */
    applyTranslations(container = null) {
        // console.log(`应用翻译${container ? '到指定容器' : '到整个文档'}`);
        const elements = container ? container.querySelectorAll('[data-translate], [data-translate-placeholder]') : document.querySelectorAll('[data-translate], [data-translate-placeholder]');
        
        // console.log(`找到 ${elements.length} 个需要翻译的元素`);
        let successCount = 0;
        let failCount = 0;
        
        elements.forEach(element => {
            // 处理 textContent
            const key = element.getAttribute('data-translate');
            if (key) {
                const translatedText = this.t(key);
                if (translatedText !== key) {
                    element.textContent = translatedText;
                    successCount++;
                } else {
                    console.warn(`未找到键 '${key}' 的有效翻译，或翻译值与键名相同。`);
                    failCount++;
                }
            }

            // 处理 placeholder
            const placeholderKey = element.getAttribute('data-translate-placeholder');
            if (placeholderKey) {
                const translatedPlaceholder = this.t(placeholderKey);
                if (translatedPlaceholder !== placeholderKey) {
                    element.setAttribute('placeholder', translatedPlaceholder);
                    successCount++;
                } else {
                    console.warn(`未找到 placeholder 键 '${placeholderKey}' 的有效翻译，或翻译值与键名相同。`);
                    failCount++;
                }
            }
        });
        
        // console.log(`翻译应用完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    },

    async _saveLangToDynamoDB(lang) {
        try {
            // ... existing code ...
        } catch (error) {
            console.error('保存语言偏好到 DynamoDB 失败:', error);
        }
    }
};

// 添加调试功能，可以在控制台直接调用
window._debugI18n = {
    reloadTranslations: async () => {
        await I18n.loadTranslations();
        I18n.applyTranslations();
        return '手动重载翻译完成';
    },
    getCurrentTranslations: () => I18n.translations,
    switchTo: async (lang) => {
        if (I18n.supportedLanguages[lang]) {
            return await I18n.switchLanguage(lang);
        } else {
            console.error(`不支持的语言: ${lang}`);
            return false;
        }
    },
    getDebugInfo: () => {
        return {
            currentLang: I18n.currentLang,
            isInitialized: I18n.isInitialized,
            translations: I18n.translations ? Object.keys(I18n.translations) : null,
            supportedLanguages: I18n.supportedLanguages
        };
    }
};

// 确保加载完成后自动初始化
document.addEventListener('DOMContentLoaded', async function() {
    // console.log('DOMContentLoaded事件触发，开始初始化I18n...');
    
    try {
        // 检查是否刚刚在另一个页面切换了语言
        const langJustChanged = sessionStorage.getItem('languageJustChanged');
        const lastChangedLang = sessionStorage.getItem('lastChangedLang');
        const changeTimestamp = sessionStorage.getItem('langChangeTimestamp');
        
        // 如果在最近10秒内在另一个页面切换了语言，就从sessionStorage加载
        if (langJustChanged === 'true' && lastChangedLang && changeTimestamp) {
            const now = Date.now();
            const changeTime = parseInt(changeTimestamp, 10);
            
            // 只应用10秒内的变更，以防止过期的语言切换
            if (now - changeTime < 10000) {
                // console.log(`检测到最近的语言切换: ${lastChangedLang}`);
                // 强制设置到localStorage确保一致
                localStorage.setItem('language', lastChangedLang);
            } else {
                // 清除过期的标志
                // console.log('语言切换标志已过期，清除');
                sessionStorage.removeItem('languageJustChanged');
                sessionStorage.removeItem('lastChangedLang');
                sessionStorage.removeItem('langChangeTimestamp');
            }
        }
    
        // 初始化I18n
        const currentLang = await I18n.init();
        // console.log(`页面加载完成，当前语言为: ${currentLang}`);
        
        // 查找并设置页面标题
        const pageTitle = document.querySelector('title');
        if (pageTitle && pageTitle.getAttribute('data-translate')) {
            const titleKey = pageTitle.getAttribute('data-translate');
            pageTitle.textContent = I18n.t(titleKey, { default: pageTitle.textContent });
            // console.log(`已设置页面标题: ${pageTitle.textContent}`);
        }
        
        // 记录语言初始化完成
        // console.log('I18n初始化完成');
        
    } catch (error) {
        console.error('I18n初始化失败:', error);
        // 即使初始化失败，也要尝试移除loading类，防止页面卡死
        document.documentElement.classList.remove('i18n-loading');
    }
});

// Export the main object and the helper function
export const t = (key, params) => I18n.t(key, params);

// 添加默认导出
export default I18n; 