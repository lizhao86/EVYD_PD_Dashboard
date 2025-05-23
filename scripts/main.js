// scripts/main.js
// Amplify configuration moved to Header.init to ensure it runs in the correct context

// 首先导入并配置 Amplify
import { configureAmplify } from '/scripts/amplify-config.js';

// 确保 Amplify 在所有其他代码之前完成配置
configureAmplify();

// 初始化语言，在页面加载完成后更新文本
document.addEventListener('DOMContentLoaded', function() {
    // 如果I18n已加载，则更新文本
    if (typeof I18n !== 'undefined') {
        // Note: This logic might be specific to index.html and might not be needed
        // if header.js handles translation within its own scope after loading.
        // Consider if this DOM manipulation is still necessary here.
        const welcomeTitle = document.getElementById('welcome-title');
        const loadingText = document.getElementById('loading-text');
        const backBtn = document.getElementById('back-btn');
        const continueBtn = document.getElementById('continue-btn');
        // Use t() if available, otherwise keep default text
        const translate = (key, fallback) => (typeof t !== 'undefined' ? t(key, { default: fallback }) : fallback);
        if(welcomeTitle) welcomeTitle.textContent = translate('common.title', '产品经理AI工作台');
        if(loadingText) loadingText.textContent = translate('common.loading', '正在加载...');
        if(backBtn) backBtn.textContent = translate('common.back', '返回');
        if(continueBtn) continueBtn.textContent = translate('common.continue', '继续');
    }

    // 进度条动画 (This seems specific to the index.html loading page)
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const backBtnEl = document.getElementById('back-btn'); // Renamed to avoid conflict
    const continueBtnEl = document.getElementById('continue-btn'); // Renamed to avoid conflict

    // Only run progress bar logic if elements exist
    if (progressFill && progressPercent && backBtnEl && continueBtnEl) {
        // 禁用返回按钮
        backBtnEl.style.opacity = '0.5';
        backBtnEl.style.pointerEvents = 'none';

        // 模拟加载进度
        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressPercent) progressPercent.textContent = `${progress}%`;

            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    // 3秒后自动跳转
                    window.location.href = '/templates/pages/Homepage.html'; // Use absolute path
                }, 500);
            }
        }, 30); // 大约3秒完成

        // 点击继续直接跳转
        continueBtnEl.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/templates/pages/Homepage.html'; // Use absolute path
        });
    }
}); 