import { resolve } from 'path';
import { defineConfig } from 'vite';

// Function to generate entry points from a list of files
const getEntryPoints = (files) => {
  const entries = {};
  files.forEach(file => {
    // Generate a key based on the file path, replacing '/' and '.' with '_'
    // Example: templates/pages/Homepage.html -> templates_pages_Homepage_html
    // Special case for root index.html -> main
    let key;
    if (file === 'index.html') {
      key = 'main';
    } else {
      key = file.replace(/^\.\//, '').replace(/\//g, '_').replace(/\.html$/, '');
    }
    entries[key] = resolve(__dirname, file);
  });
  return entries;
};

// List of HTML files to be included as entry points
// Exclude templates/pages/index.html as it's deemed unnecessary
const entryHtmlFiles = [
  'index.html', // Root index file
  'templates/pages/Homepage.html',
  'templates/pages/user-manual.html',
  'templates/pages/user-story.html',
  'templates/pages/ux-design.html'
  // Add other necessary HTML files here
];

export default defineConfig({
  // 添加解析选项，定义路径别名（移除 '/' 别名）
  resolve: {
    alias: {
      // 移除根路径别名'/'，保留其他别名
      '/src': resolve(__dirname, './src'),
      '/scripts': resolve(__dirname, './scripts'),
      '/modules': resolve(__dirname, './modules'),
    }
  },
  
  build: {
    rollupOptions: {
      input: getEntryPoints(entryHtmlFiles),
    },
    // Optional: Configure output directory if needed (defaults to 'dist')
    // outDir: 'dist',
  },
  // Optional: Configure server options for development (npm run dev)
  // server: {
  //   port: 5173, // Default port
  //   open: true, // Automatically open browser
  // },
  
  // 添加此配置，为 AWS Amplify V5 创建必要的全局变量
  define: {
    global: 'window', // 解决 'global is not defined' 错误
    process: {
      env: {}, // 提供空的 process.env 对象
      browser: true // 设置为浏览器环境
    },
  },
}); 