/**
 * EVYD产品经理AI工作台
 * 国际化(i18n)工具模块
 */

// 国际化工具
const I18n = {
    // 支持的语言
    supportedLanguages: {
        'zh-CN': '简体中文',
        'zh-TW': '繁體中文',
        'en': 'English'
    },
    
    // 当前语言
    currentLang: null,
    
    // 当前翻译内容
    translations: null,
    
    /**
     * 初始化国际化模块
     */
    init() {
        console.log('初始化国际化模块...');
        
        // 获取当前语言设置，默认为简体中文
        const storedLang = localStorage.getItem('language');
        this.currentLang = storedLang || 'zh-CN';
        
        // 设置HTML的lang属性
        document.documentElement.lang = this.currentLang;
        
        console.log(`当前语言: ${this.currentLang}`);
        
        // 加载当前语言的翻译
        this.loadTranslations();
        
        // 应用翻译到带有 data-translate 属性的元素
        this.applyTranslations();
        
        // 根据当前语言设置文档方向
        if (this.currentLang === 'ar' || this.currentLang === 'he') {
            document.documentElement.dir = 'rtl'; // 阿拉伯语和希伯来语从右到左
        } else {
            document.documentElement.dir = 'ltr'; // 其他语言从左到右
        }
    },
    
    /**
     * 加载翻译内容
     */
    loadTranslations() {
        // 根据当前语言获取对应的翻译对象
        // 注意：在实际实现中，这些变量必须已经在页面中加载
        switch (this.currentLang) {
            case 'zh-CN':
                this.translations = window.zhCN || {};
                break;
            case 'zh-TW':
                this.translations = window.zhTW || {};
                break;
            case 'en':
                this.translations = window.en || {};
                break;
            default:
                this.translations = window.zhCN || {};
                break;
        }
        
        console.log('翻译内容已加载');
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
                return key;
            }
        }
        
        // 如果找到的值不是字符串，返回键名
        if (typeof value !== 'string') {
            console.warn(`翻译值不是字符串: ${key}`);
            return key;
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
     * 切换语言
     * @param {string} lang 目标语言代码
     */
    switchLanguage(lang) {
        if (!this.supportedLanguages[lang]) {
            console.error(`不支持的语言: ${lang}`);
            return false;
        }
        
        // 保存语言设置
        localStorage.setItem('language', lang);
        this.currentLang = lang;
        
        // 设置HTML的lang属性
        document.documentElement.lang = lang;
        
        console.log(`切换语言到: ${lang}`);
        
        // 刷新页面应用新语言
        window.location.reload();
        
        return true;
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
        console.log('应用页面翻译...');
        if (!this.translations) {
            console.warn('翻译尚未加载，无法应用。');
            return;
        }
        
        // 选择特定容器内或全文档中带有 data-translate 或 data-translate-placeholder 属性的元素
        const context = container || document;
        const elements = context.querySelectorAll('[data-translate], [data-translate-placeholder]');
        
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
        console.log(`已处理 ${elements.length} 个待翻译元素。`);
    }
};

// 初始化国际化模块
document.addEventListener('DOMContentLoaded', function() {
    I18n.init();
});

// 简写形式，方便使用
const t = (key, params) => I18n.t(key, params); 