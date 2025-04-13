// scripts/pages/homepage.js

// 首先导入并配置 Amplify
import { configureAmplify } from '/scripts/amplify-config.js';

// 确保 Amplify 在所有其他代码之前完成配置
configureAmplify();

// 然后导入依赖 Amplify 的模块
import Header from '/modules/common/header.js';

// Domain for checking referrer (No longer needed for post-reg message)
// const COGNITO_DOMAIN = "login.auth.ap-southeast-1.amazoncognito.com";

// Wait for the DOM to be fully loaded before initializing the header for this page
document.addEventListener('DOMContentLoaded', async () => { 
    // console.log("Homepage: Initializing Header...");
    await Header.init(); 
    // console.log("Homepage: Header init complete.");

    // Removed the check for post-registration message as auto-login seems to work
    // if (!Header.currentUser && document.referrer.includes(COGNITO_DOMAIN)) {
    //     console.log("User not logged in, but referrer is Cognito. Displaying post-registration message.");
    //     displayPostRegistrationMessage();
    // }
});

// Removed the displayPostRegistrationMessage function
// function displayPostRegistrationMessage() { ... } 