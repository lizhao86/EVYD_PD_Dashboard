/**
 * EVYD产品经理AI工作台
 * 国际化(i18n)工具模块
 */

import { getCurrentUserSettings, saveCurrentUserSetting } from '/scripts/services/storage.js';
import { checkAuth } from '/modules/auth/auth.js'; // Needed to check login status

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
    currentUser: null, // Store auth info
    userSettings: null, // Store user settings
    
    /**
     * 初始化国际化模块 (async)
     */
    async init() {
        if (this.isInitialized) return; // Prevent multiple initializations
        
        // Try to get logged-in user info and settings first
        let preferredLang = null;
        try {
            const authInfo = await checkAuth(); // Check login status
            if (authInfo && authInfo.user) {
                this.currentUser = authInfo.user;
                this.userSettings = await getCurrentUserSettings();
                if (this.userSettings && this.userSettings.language) {
                    preferredLang = this.userSettings.language;
                }
            }
        } catch (error) {
            console.error("检查用户认证或获取设置时出错:", error);
        }

        // Determine language: User Setting > Local Storage (fallback) > Default
        const storedLang = localStorage.getItem('language'); // Keep LS as fallback for logged-out users
        this.currentLang = preferredLang || storedLang || 'zh-CN';
        
        // Validate the determined language
        if (!this.supportedLanguages[this.currentLang]) {
            console.warn(`无效的当前语言 '${this.currentLang}', 重置为默认 zh-CN`);
            this.currentLang = 'zh-CN';
             if (!preferredLang && !storedLang && this.currentUser) {
                 // Save default to DB if user logged in but had no preference
                 this.saveLanguagePreference(this.currentLang);
             }
        }
        
        // Update Local Storage for logged-out consistency
         if (localStorage.getItem('language') !== this.currentLang) {
            localStorage.setItem('language', this.currentLang);
         }

        // 设置HTML的lang属性
        document.documentElement.lang = this.currentLang;
        
        // 加载当前语言的翻译
        await this.loadTranslations();
        
        // 应用翻译到带有 data-translate 属性的元素
        this.applyTranslations();
        
        // 根据当前语言设置文档方向
        if (this.currentLang === 'ar' || this.currentLang === 'he') {
            document.documentElement.dir = 'rtl'; // 阿拉伯语和希伯来语从右到左
        } else {
            document.documentElement.dir = 'ltr'; // 其他语言从左到右
        }
        this.isInitialized = true;
        return this.currentLang;
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
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `/locales/${lang}.js`;
            script.onload = () => {
                console.log(`語言文件 ${lang}.js 加載成功`);
                resolve();
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
            switch (this.currentLang) {
                case 'zh-CN':
                    if (!window.zhCN) await this.loadLanguageFile('zh-CN');
                    this.translations = window.zhCN || {};
                    break;
                case 'zh-TW':
                    if (!window.zhTW) await this.loadLanguageFile('zh-TW');
                    this.translations = window.zhTW || {};
                    break;
                case 'en':
                    if (!window.en) await this.loadLanguageFile('en');
                    this.translations = window.en || {};
                    break;
                default:
                    if (!window.zhCN) await this.loadLanguageFile('zh-CN');
                    this.translations = window.zhCN || {};
                    break;
            }
            
            if (!this.translations || Object.keys(this.translations).length === 0) {
                console.warn(`警告: 語言包 ${this.currentLang} 加載失敗或為空`);
            }
            
            this.applyTranslations();
        } catch (error) {
            console.error(`加載翻譯內容時出錯:`, error);
            // 使用空對象作為後備，避免整個應用崩潰
            this.translations = {};
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
        if (!this.translations) this.loadTranslations();
        
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
     * 切换语言 (async)
     * @param {string} lang 目标语言代码
     */
    async switchLanguage(lang) {
        if (!this.supportedLanguages[lang]) {
            console.error(`不支持的语言: ${lang}`);
            return false;
        }
        
        const oldLang = this.currentLang;
        this.currentLang = lang;
        
        // 1. Save to local storage immediately for instant fallback
        localStorage.setItem('language', lang);

        // 2. Attempt to save to user settings if logged in
        if (this.currentUser) { // Check if we know the user is logged in
            try {
                await this.saveLanguagePreference(lang);
            } catch (error) {
                console.error('保存语言偏好到云端失败:', error);
                localStorage.setItem('preferredLang', lang);
            }
        }
        
        // 3. Update UI (reload is simplest)
        document.documentElement.lang = lang;
        this.applyTranslations();
        
        return true;
    },
    
    /** Helper to save language preference to UserSettings */
    async saveLanguagePreference(lang) {
         if (!this.currentUser) return; // Should not happen if called correctly
         try {
              // Pass only the language to avoid overwriting other settings unintentionally
             const result = await saveCurrentUserSetting({ language: lang }); 
             if (result) {
                 console.log(`语言偏好 ${lang} 已成功保存到云端。`);
                 // Update local state if needed, though reload handles it
                 if(this.userSettings) this.userSettings.language = lang;
             } else {
                 console.error("保存语言偏好到云端失败 (saveCurrentUserSetting returned null).");
             }
         } catch (error) {
             console.error("保存语言偏好到云端时出错:", error);
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
        const elements = container ? container.querySelectorAll('[data-translate], [data-translate-placeholder]') : document.querySelectorAll('[data-translate], [data-translate-placeholder]');
        
        elements.forEach(element => {
            // 处理 textContent
            const key = element.getAttribute('data-translate');
            if (key) {
                const translatedText = this.t(key);
                if (translatedText !== key) {
                    element.textContent = translatedText;
                } else {
                    console.warn(`未找到键 '${key}' 的有效翻译，或翻译值与键名相同。`);
                }
            }

            // 处理 placeholder
            const placeholderKey = element.getAttribute('data-translate-placeholder');
            if (placeholderKey) {
                const translatedPlaceholder = this.t(placeholderKey);
                if (translatedPlaceholder !== placeholderKey) {
                    element.setAttribute('placeholder', translatedPlaceholder);
                } else {
                    console.warn(`未找到 placeholder 键 '${placeholderKey}' 的有效翻译，或翻译值与键名相同。`);
                }
            }
        });
    },

    async _saveLangToDynamoDB(lang) {
        try {
            // ... existing code ...
        } catch (error) {
            console.error('保存语言偏好到 DynamoDB 失败:', error);
        }
    }
};

// Remove auto-initialization from here
// document.addEventListener('DOMContentLoaded', async function() {
//     await I18n.init();
// });

// Export the main object and the helper function
export const t = (key, params) => I18n.t(key, params);
export default I18n; 