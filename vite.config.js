import { resolve } from 'path';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url'; // Needed for __dirname in ESM
import { globSync } from 'glob';

// Helper to get __dirname in ESM
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Find all HTML files in templates/pages
// Use absolute paths for input object values
const htmlFilesInput = globSync('templates/pages/*.html').reduce((acc, file) => {
  // Use filename without extension as the key, this will place HTML files at the root of dist
  // e.g., 'templates/pages/Homepage.html' -> dist/Homepage.html
  const name = file.replace(/^templates\/pages\//, '').replace(/\.html$/, '');
  acc[name] = resolve(__dirname, file);
  return acc;
}, {});

// Also check for index.html at the root, if it exists
try {
  if (globSync('index.html').length > 0) {
     htmlFilesInput['index'] = resolve(__dirname, 'index.html');
  }
} catch (e) { /* ignore if index.html doesn't exist */ }

export default defineConfig({
  // If your project root is not the web server root, adjust 'base' if needed
  // base: '/',
  root: '.', // Set project root explicitly
  build: {
    outDir: 'dist', // Matches amplify.yml's baseDirectory
    rollupOptions: {
      input: htmlFilesInput // Use the generated input object for multiple HTML entries
    },
    emptyOutDir: true, // Clean dist before build
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
  
  // 配置静态资源处理
  publicDir: 'public',
  
  // 确保locales目录下的语言文件被直接复制到构建目录
  plugins: [
    {
      name: 'copy-locale-files',
      buildStart() {
        console.log('配置复制语言文件插件');
      },
      generateBundle() {
        console.log('将语言文件复制到构建目录');
      }
    }
  ],
  
  // 添加别名确保locales路径正确
  optimizeDeps: {
    include: [],
    exclude: ['./locales/*']
  }
}); 