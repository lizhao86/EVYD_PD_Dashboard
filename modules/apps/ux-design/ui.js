/**
 * UX 界面设计UI相关功能
 */

// 全局UI变量
let textareaElement = null;
let charCountElement = null;
let expandTextareaButton = null;
let markdownPreviewActive = false;

/**
 * 初始化UI元素和事件
 */
function initUI() {
    // 获取UI元素
    textareaElement = document.getElementById('requirement-description');
    charCountElement = document.getElementById('char-count');
    expandTextareaButton = document.getElementById('expand-textarea');
    const clearFormButton = document.getElementById('clear-form');
    const generateButton = document.getElementById('generate-manual');
    const stopGenerationButton = document.getElementById('stop-generation');
    const copyResultButton = document.getElementById('copy-result');
    const toggleSystemInfoButton = document.getElementById('toggle-system-info');
    
    // 字符计数事件监听
    if (textareaElement) {
        textareaElement.addEventListener('input', updateCharCount);
        updateCharCount(); // 初始化字符计数
    }
    
    // 清空表单事件监听
    if (clearFormButton) {
        clearFormButton.addEventListener('click', clearForm);
    }
    
    // 生成按钮事件监听
    if (generateButton) {
        generateButton.addEventListener('click', handleGenerate);
    }
    
    // 停止生成按钮事件监听
    if (stopGenerationButton) {
        stopGenerationButton.addEventListener('click', stopGeneration);
    }
    
    // 复制结果按钮事件监听
    if (copyResultButton) {
        copyResultButton.addEventListener('click', copyGeneratedResult);
    }
    
    // 展开/收起系统信息按钮事件监听
    if (toggleSystemInfoButton) {
        toggleSystemInfoButton.addEventListener('click', toggleSystemInfo);
    }
    
    // 展开文本域按钮事件监听
    if (expandTextareaButton) {
        expandTextareaButton.addEventListener('click', expandTextarea);
    }
}

/**
 * 更新字符计数
 */
function updateCharCount() {
    if (textareaElement && charCountElement) {
        const count = textareaElement.value.length;
        charCountElement.textContent = count;
        
        // 超出最大字符限制时添加警告
        if (count > 5000) {
            charCountElement.classList.add('char-limit-exceeded');
        } else {
            charCountElement.classList.remove('char-limit-exceeded');
        }
    }
}

/**
 * 清空表单
 */
function clearForm() {
    if (textareaElement) {
        textareaElement.value = '';
        updateCharCount();
    }
}

/**
 * 处理生成按钮点击事件
 * @param {Event} event - 点击事件
 */
function handleGenerate(event) {
    const button = event.currentTarget || event.target;
    const action = button.getAttribute('data-action');
    
    if (action === 'generate') {
        // 获取需求描述
        const requirementDescription = textareaElement ? textareaElement.value.trim() : '';
        
        if (!requirementDescription) {
            // 使用国际化翻译错误消息
            let errorText = '请输入需求描述'; // 默认文本
            if (typeof I18n !== 'undefined' && typeof I18n.t === 'function') {
                errorText = I18n.t('uxDesign.error.emptyRequirement');
            }
            showError(errorText);
            return;
        }
        
        // 显示结果容器
        const resultContainer = document.getElementById('result-container');
        resultContainer.style.display = 'block';
        
        // 清空之前的结果
        document.getElementById('result-content').innerHTML = '';
        document.getElementById('result-content-markdown').innerHTML = '';
        
        // 隐藏统计和系统信息
        document.getElementById('result-stats').style.display = 'none';
        const systemInfoContainer = document.getElementById('system-info-container');
        if (systemInfoContainer) {
            systemInfoContainer.style.display = 'none';
        }
        
        // 获取国际化文本
        let generatingText = '生成中...点击停止'; // 默认文本
        if (typeof I18n !== 'undefined' && typeof I18n.t === 'function') {
            generatingText = I18n.t('common.generating');
        }
        
        // 更新生成按钮状态为停止按钮
        button.innerHTML = '<div class="loading-circle-container"><div class="loading-circle" style="border-color: #ff3333; border-top-color: transparent;"></div></div> ' + generatingText;
        button.setAttribute('data-action', 'stop');
        // 保持使用primary样式，确保文字可见
        
        try {
            // 调用API生成
            window.UXDesignAPI.generateDesignPrompt(requirementDescription);
        } catch (error) {
            console.error('生成失败:', error);
            showError(error.message || '生成失败，请重试');
            resetGenerateButton(button);
        }
    } else if (action === 'stop') {
        // 停止生成
        window.UXDesignAPI.stopStream();
        resetGenerateButton(button);
    }
}

/**
 * 显示错误消息
 * @param {string} message - 错误信息
 */
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    // 获取表单元素并添加错误消息
    const formGroup = document.getElementById('requirement-group');
    
    // 移除之前的错误消息
    const previousError = formGroup.querySelector('.error-message');
    if (previousError) {
        formGroup.removeChild(previousError);
    }
    
    formGroup.appendChild(errorElement);
    
    // 自动消失
    setTimeout(() => {
        if (errorElement.parentNode === formGroup) {
            formGroup.removeChild(errorElement);
        }
    }, 5000);
}

/**
 * 重置生成按钮状态
 * @param {HTMLElement} button - 按钮元素
 */
function resetGenerateButton(button) {
    // 获取国际化文本
    let buttonText = '生成设计提示词'; // 默认文本
    if (typeof I18n !== 'undefined' && typeof I18n.t === 'function') {
        buttonText = I18n.t('uxDesign.generateButton');
    }
    button.innerHTML = buttonText;
    button.removeAttribute('disabled');
    button.classList.remove('btn-disabled');
    button.setAttribute('data-action', 'generate');
}

/**
 * 停止生成
 */
function stopGeneration() {
    window.UXDesignAPI.stopStream();
    
    const generateButton = document.getElementById('generate-manual');
    if (generateButton) {
        resetGenerateButton(generateButton);
    }
}

/**
 * 复制生成的结果
 */
function copyGeneratedResult() {
    const content = markdownPreviewActive 
        ? document.getElementById('result-content-markdown').innerText 
        : document.getElementById('result-content').innerText;
    
    if (content) {
        navigator.clipboard.writeText(content)
            .then(() => {
                // 显示复制成功提示
                const copyButton = document.getElementById('copy-result');
                const originalTitle = copyButton.getAttribute('title');
                copyButton.setAttribute('title', '已复制!');
                
                setTimeout(() => {
                    copyButton.setAttribute('title', originalTitle);
                }, 2000);
            })
            .catch(err => {
                console.error('复制失败:', err);
            });
    }
}

/**
 * 切换系统信息显示
 */
function toggleSystemInfo() {
    const systemInfoContent = document.getElementById('system-info-content');
    const toggleButton = document.getElementById('toggle-system-info');
    
    if (systemInfoContent.style.display === 'none' || !systemInfoContent.style.display) {
        systemInfoContent.style.display = 'block';
        toggleButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
        `;
    } else {
        systemInfoContent.style.display = 'none';
        toggleButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        `;
    }
}

/**
 * 展开文本域
 */
function expandTextarea() {
    if (!textareaElement) return;
    
    const textareaContainer = textareaElement.closest('.textarea-container');
    const charCounter = document.querySelector('.char-counter');
    
    if (textareaContainer.classList.contains('textarea-expanded')) {
        // 缩小文本域
        shrinkTextarea(textareaContainer, textareaElement, charCounter);
    } else {
        // 放大文本域
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'textarea-overlay';
        overlay.addEventListener('click', () => shrinkTextarea(textareaContainer, textareaElement, charCounter));
        document.body.appendChild(overlay);
        
        // 保存原始位置
        const formGroup = textareaContainer.closest('.form-group');
        textareaContainer.dataset.originalParent = formGroup.id || '';
        
        // 记住原始父元素的引用
        const originalParentElement = formGroup;
        const originalNextSibling = textareaContainer.nextSibling;
        textareaContainer._originalParent = originalParentElement;
        textareaContainer._originalNextSibling = originalNextSibling;
        
        // 保存其他原始状态
        textareaElement.dataset.originalRows = textareaElement.rows;
        
        // 添加放大样式
        textareaContainer.classList.add('textarea-expanded');
        document.body.appendChild(textareaContainer);
        
        // 调整文本区大小
        textareaElement.rows = 20;
        textareaElement.focus();
        
        // 更新放大按钮图标
        expandTextareaButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
        `;
        
        // 移动字数统计到放大框内
        textareaContainer.appendChild(charCounter);
    }
}

/**
 * 缩小文本域
 * @param {HTMLElement} container - 文本域容器
 * @param {HTMLElement} textarea - 文本域元素
 * @param {HTMLElement} charCounter - 字数统计元素
 */
function shrinkTextarea(container, textarea, charCounter) {
    // 移除遮罩层
    const overlay = document.querySelector('.textarea-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // 恢复原始样式
    container.classList.remove('textarea-expanded');
    textarea.rows = textarea.dataset.originalRows || 6;
    
    // 将文本框放回原位置
    if (container._originalParent) {
        // 先从当前位置移除
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
        
        // 放回正确位置
        if (container._originalNextSibling) {
            container._originalParent.insertBefore(container, container._originalNextSibling);
        } else {
            container._originalParent.appendChild(container);
        }
        
        // 确保字数统计在正确位置
        if (charCounter.parentNode) {
            charCounter.parentNode.removeChild(charCounter);
        }
        container._originalParent.appendChild(charCounter);
    }
    
    // 更新放大按钮图标
    expandTextareaButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7"/>
        </svg>
    `;
}

/**
 * 更新统计信息
 * @param {Object} stats - 统计信息对象
 */
function updateStats(stats) {
    document.getElementById('result-stats').style.display = 'flex';
    
    if (stats.elapsedTime !== undefined) {
        document.getElementById('elapsed-time').textContent = `${stats.elapsedTime}秒`;
    }
    
    if (stats.totalSteps !== undefined) {
        document.getElementById('total-steps').textContent = stats.totalSteps;
    }
    
    if (stats.totalTokens !== undefined) {
        document.getElementById('total-tokens').textContent = stats.totalTokens;
    }
}

/**
 * 更新系统信息
 * @param {Object} info - 系统信息对象
 */
function updateSystemInfo(info) {
    const container = document.getElementById('system-info-container');
    const content = document.getElementById('system-info-content');
    
    if (info && info.systemPrompt) {
        container.style.display = 'block';
        content.textContent = info.systemPrompt;
    }
}

/**
 * 切换Markdown预览
 * @param {boolean} active - 是否激活Markdown预览
 */
function toggleMarkdownPreview(active) {
    const plainContent = document.getElementById('result-content');
    const markdownContent = document.getElementById('result-content-markdown');
    
    markdownPreviewActive = active;
    
    if (active) {
        plainContent.style.display = 'none';
        markdownContent.style.display = 'block';
    } else {
        plainContent.style.display = 'block';
        markdownContent.style.display = 'none';
    }
}

/**
 * 更新结果内容
 * @param {string} content - 结果内容
 * @param {boolean} isMarkdown - 是否为Markdown格式
 */
function updateResultContent(content, isMarkdown = false) {
    const resultElement = document.getElementById('result-content');
    
    if (resultElement) {
        resultElement.textContent = content;
        
        if (isMarkdown) {
            // 转换Markdown到HTML并显示在预览区域
            renderMarkdown(content);
            toggleMarkdownPreview(true);
        }
    }
}

/**
 * 渲染Markdown内容
 * @param {string} markdown - Markdown文本
 */
function renderMarkdown(markdown) {
    const markdownElement = document.getElementById('result-content-markdown');
    
    if (markdownElement) {
        // 简单的Markdown渲染，仅支持一些基本格式
        let html = markdown
            // 标题
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            // 粗体和斜体
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // 列表
            .replace(/^\- (.*$)/gm, '<li>$1</li>')
            .replace(/<\/li>\n<li>/g, '</li><li>')
            .replace(/<\/li>\n/g, '</li></ul>\n')
            .replace(/^\<li\>/gm, '<ul><li>')
            // 代码块
            .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
            // 行内代码
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // 链接
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            // 换行
            .replace(/\n/g, '<br>');
        
        markdownElement.innerHTML = html;
    }
}

/**
 * 添加流式内容到结果
 * @param {string} chunk - 内容片段
 */
function appendStreamContent(chunk) {
    const resultElement = document.getElementById('result-content');
    
    if (resultElement) {
        resultElement.textContent += chunk;
    }
}

// 导出UI函数
window.UXDesignUI = {
    initUI,
    updateCharCount,
    clearForm,
    handleGenerate,
    showError,
    resetGenerateButton,
    stopGeneration,
    copyGeneratedResult,
    toggleSystemInfo,
    expandTextarea,
    shrinkTextarea,
    updateStats,
    updateSystemInfo,
    toggleMarkdownPreview,
    updateResultContent,
    renderMarkdown,
    appendStreamContent
}; 