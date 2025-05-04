// scripts/pages/user-manual-new.js

// 导入通用模块
import { configureAmplify } from '/scripts/amplify-config.js';
import Header from '../../modules/common/header.js';
import { getCurrentUserSettings } from '/scripts/services/storage.js';
import I18n from '../i18n.js'; // 保持默认导入
// import UserManualNewApp from '../../modules/apps/user-manual-new/index.js';

// 确保 Amplify 配置在所有其他代码之前完成
configureAmplify();

// DOM 加载完成后执行初始化
document.addEventListener('DOMContentLoaded', async () => {
    // console.log('DOM fully loaded. Initializing basic page elements...');
    
    try {
        // 等待i18n加载完成
        await I18n.init();
        
        // 加载公共头部
        await Header.init();
        
        // 确保用户已登录
        const userSettings = await getCurrentUserSettings();
        if (!userSettings) {
            console.warn('User is not logged in or settings not available');
            const main = document.querySelector('main');
            if (main) {
                const errorDiv = document.createElement('div');
                errorDiv.style = 'padding: 20px; text-align: center; color: red; background-color: #ffeeee; border: 1px solid red; border-radius: 5px; margin: 10px;';
                errorDiv.textContent = '请先登录以使用此功能。';
                main.insertBefore(errorDiv, main.firstChild);
            }
            return;
        }
        
        // 移除应用初始化代码
        // const app = new UserManualNewApp();
        // await app.init();
        
        // 移除建议问题按钮设置代码
        // setupSuggestedQuestions();
        
        // 可以添加一个日志，表示基础页面加载完成
        console.log('Basic page elements initialized (Header, i18n, User check).');
        
    } catch (error) {
        console.error('Failed to initialize basic page elements:', error);
        // 显示初始化失败消息
        const errorDiv = document.createElement('div');
        errorDiv.style = 'padding: 20px; text-align: center; color: red; background-color: #ffeeee; border: 1px solid red; border-radius: 5px; margin: 10px;';
        errorDiv.textContent = `页面基础元素初始化失败: ${error.message}`;
        
        const main = document.querySelector('main');
        if (main) {
            main.insertBefore(errorDiv, main.firstChild);
        }
    }
});

// 移除建议问题按钮点击事件函数
/*
function setupSuggestedQuestions() {
    const questionButtons = document.querySelectorAll('.question-button');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    
    if (!questionButtons.length || !messageInput || !sendButton) {
        console.warn('Suggested question buttons or input elements not found');
        return;
    }
    
    questionButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 设置输入框的值为按钮的文本内容
            messageInput.value = button.textContent.trim();
            messageInput.focus();
            
            // 模拟点击发送按钮
            sendButton.click();
        });
    });
} 
*/ 