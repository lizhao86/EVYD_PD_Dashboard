// scripts/pages/homepage.js

// 首先导入并配置 Amplify
import { configureAmplify } from '/scripts/amplify-config.js';

// 确保 Amplify 在所有其他代码之前完成配置
configureAmplify();

// 然后导入依赖 Amplify 的模块
// Import the default export from i18n.js
import I18n from '../i18n.js'; 
// Import the default export Header from header.js
import Header from '/modules/common/header.js'; 

// Domain for checking referrer (No longer needed for post-reg message)
// const COGNITO_DOMAIN = "login.auth.ap-southeast-1.amazoncognito.com";

// Wait for the DOM to be fully loaded before initializing the header for this page
document.addEventListener('DOMContentLoaded', async () => {
    // console.log("Homepage DOM fully loaded and parsed");

    try {
        // Initialize header using the imported Header object and its init method
        await Header.init(); 
        // console.log("Header initialization complete.");

        // Initialize I18n (loads translations based on saved/user pref & applies them)
        await I18n.init(); 
        // console.log("I18n initialization and translation complete.");

        // No longer need explicit applyTranslations() call here
        // await applyTranslations(); 
        // console.log("Translations applied.");

        // Add specific logic for the homepage if needed
        // e.g., dynamically loading tool cards based on user role or API keys

    } catch (error) {
        // console.error("Error during homepage initialization:", error);
        // Display a user-friendly error message on the page? 
    }
});

// Removed the displayPostRegistrationMessage function
// function displayPostRegistrationMessage() { ... } 