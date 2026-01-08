<script setup lang="ts">
import { getMarkdownWorker } from '@renderer/utils/markdownWorker';

defineOptions({ name: 'MessageRender' });
const props = defineProps<{
  msgId: number;
  content: string;
  isStreaming: boolean;
}>();

const { t } = useI18n();

const renderId = computed(() => `msg-render-${props.msgId}`);
const renderedHtml = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);

// 使用全局单例 Worker
const worker = getMarkdownWorker();

// 光标相关逻辑
const _findLastElement = (target: HTMLElement): Element | void => {
  const isList = (el: Element) => el.tagName === 'OL' || el.tagName === 'UL';

  if (!target) return;
  let lastElement: Element | void = target.lastElementChild ?? target;

  if (lastElement && lastElement.tagName === 'PRE')
    lastElement = lastElement.getElementsByClassName('hljs')[0] ?? lastElement;

  if (lastElement && isList(lastElement))
    lastElement = _findLastElement(lastElement as HTMLElement);

  if (lastElement && lastElement.tagName === 'LI') {
    const _uls = lastElement.getElementsByTagName('ul');
    const _ols = lastElement.getElementsByTagName('ol');
    if (_uls.length) lastElement = _findLastElement(_uls[0]);
    if (_ols.length) lastElement = _findLastElement(_ols[0]);
  }

  return lastElement;
}

function updateCursorDOM() {
  const target = document.getElementById(renderId.value);
  if (!target) return;

  // 先清理旧光标
  target.querySelectorAll('._cursor').forEach(el => el.classList.remove('_cursor'));

  // 查找并添加新光标
  if (props.isStreaming) {
    const lastEl = _findLastElement(target);
    if (lastEl) {
      lastEl.classList.add('_cursor');
    }
  }
}

// 移除多余的 watch，将逻辑收拢到 renderMarkdown
const renderMarkdown = async (content: string, isStreaming: boolean = false) => {
  if (!content?.trim()) {
    renderedHtml.value = '';
    if (!isStreaming) {
      isLoading.value = false;
    }
    return;
  }

  // 流式传输时不显示 loading，直接渲染
  if (!isStreaming) {
    isLoading.value = true;
  }
  error.value = null;

  try {
    const html = await worker.renderMarkdown(content, isStreaming ? 'high' : 'normal');
    renderedHtml.value = html;

    if (isStreaming) {
      await nextTick();
      // 使用 requestAnimationFrame 替代 setTimeout
      requestAnimationFrame(() => {
        updateCursorDOM();
      });
    }
  } catch (err) {
    console.error('Markdown rendering error:', err);
    error.value = err instanceof Error ? err.message : 'Rendering failed';
    // 降级处理：显示原始内容（转义 HTML）
    renderedHtml.value = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  } finally {
    if (!isStreaming) {
      isLoading.value = false;
    }
  }
};

// 监听内容变化
watch(() => props.content, (newContent) => {
  renderMarkdown(newContent, props.isStreaming);
}, { immediate: true });

// 监听流式状态变化
watch(() => props.isStreaming, async (newVal, oldVal) => {
  if (newVal) {
    // 开始流式传输时添加光标
    await nextTick();
    requestAnimationFrame(() => {
      updateCursorDOM();
    });
  } else if (!newVal && oldVal) {
    // 停止流式传输时移除光标
    await nextTick();
    updateCursorDOM(); // 会清理光标
  }
}, { flush: 'post' });
</script>

<template>
  <!-- 加载状态（只在非流式传输时显示） -->
  <div v-if="isLoading && !renderedHtml && !props.isStreaming" class="text-tx-secondary">
    {{ t('main.message.rendering') }}
  </div>

  <!-- 错误状态 -->
  <div v-else-if="error" class="text-red-500 text-sm">
    {{ error }}
  </div>

  <!-- 渲染内容 -->
  <div v-else-if="renderedHtml" :id="renderId"
    class="prose dark:prose-invert prose-slate prose-pre:p-0 prose-headings:pt-3 text-inherit" v-html="renderedHtml" />

  <!-- 空内容或流式传输初始状态 -->
  <span v-else class="_cursor">{{ t('main.message.rendering') }}</span>
</template>

<style scoped>
.prose {
  font-size: inherit;
}

.prose :deep(pre code.hljs) {
  display: block;
  overflow-x: auto;
  padding: 1em;
}

.prose :deep(code.hljs) {
  padding: 3px 5px;
}

.prose :deep(pre) {
  background-color: var(--input-bg);
  border-radius: 0.375rem;
  padding: 1em;
  overflow-x: auto;
}
</style>

<style>
._cursor::after {
  content: '';
  display: inline-block;
  width: 0.5em;
  height: 1.2em;
  transform: translateX(0.6em);
  background-color: currentColor;
  animation: cursor-blink 1s infinite;
  margin-left: 2px;
  vertical-align: text-bottom;
  line-height: 1;
}

@keyframes cursor-blink {

  0%,
  49% {
    opacity: 1;
  }

  50%,
  100% {
    opacity: 0;
  }
}
</style>