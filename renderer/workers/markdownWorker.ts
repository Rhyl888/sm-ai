import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';

// 初始化 markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

// 配置代码高亮
md.set({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {
        // 高亮失败时使用默认转义
      }
    }
    // 没有指定语言或语言不支持时，尝试自动检测
    try {
      return hljs.highlightAuto(str).value;
    } catch (__) {
      return md.utils.escapeHtml(str);
    }
  }
});

// 消息处理接口
interface WorkerMessage {
  type: 'render' | 'highlight';
  id: number;
  content?: string;
  code?: string;
  language?: string;
}

interface WorkerResponse {
  type: 'rendered' | 'highlighted' | 'error';
  id: number;
  html?: string;
  error?: string;
}

// 监听主线程消息
self.onmessage = function (e: MessageEvent<WorkerMessage>) {
  const { type, id, content, code, language } = e.data;

  try {
    switch (type) {
      case 'render':
        if (!content) {
          throw new Error('Content is required for render');
        }
        // 渲染 Markdown 为 HTML
        const html = md.render(content);
        self.postMessage({
          type: 'rendered',
          id,
          html,
        } as WorkerResponse);
        break;

      case 'highlight':
        if (!code) {
          throw new Error('Code is required for highlight');
        }
        // 仅高亮代码块
        const highlighted = hljs.highlight(code, {
          language: language || 'plaintext'
        }).value;
        self.postMessage({
          type: 'highlighted',
          id,
          html: highlighted,
        } as WorkerResponse);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse);
  }
};

