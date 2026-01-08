<script setup lang="ts">
import type { Message } from '@common/types';

import { useBatchTimeAgo } from '@renderer/hooks/useTimeAgo';
import { NScrollbar } from 'naive-ui';
import MessageRender from './MessageRender.vue';

const MESSAGE_LIST_CLASS_NAME = 'message-list';
const SCROLLBAR_CONTENT_CLASS_NAME = 'n-scrollbar-content';

defineOptions({ name: 'MessageList' });

const props = defineProps<{
  messages: Message[];
}>();

const route = useRoute();

const { formatTimeAgo } = useBatchTimeAgo();

function _getScrollDOM() {
  const msgListDOM = document.getElementsByClassName(MESSAGE_LIST_CLASS_NAME)[0];
  if (!msgListDOM) return;
  return msgListDOM.getElementsByClassName(SCROLLBAR_CONTENT_CLASS_NAME)[0];
}

// 检查是否处于底部（允许 10px 误差）
function isAtBottom() {
  const container = _getScrollDOM();
  if (!container) return false;

  const threshold = 10;
  return container.scrollHeight - container.scrollTop <= container.clientHeight + threshold;
}

// 统一的滚动函数
function scrollToBottom(behavior: ScrollIntoViewOptions['behavior'] = 'smooth') {
  const scrollDOM = _getScrollDOM();
  if (!scrollDOM) return;
  scrollDOM.scrollIntoView({
    behavior,
    block: 'end',
  });
}

onMounted(() => {
  const scrollDOM = _getScrollDOM();
  if (!scrollDOM) return;

  const ob = new ResizeObserver(() => {
    if (isAtBottom() || props.messages.some(m => m.status === 'streaming')) {
      requestAnimationFrame(() => {
        scrollToBottom('smooth');
      });
    }
  });

  ob.observe(scrollDOM);

  // 初始进入直接到底
  requestAnimationFrame(() => scrollToBottom('instant'));

  onUnmounted(() => ob.disconnect());
});

// 监听路由/对话切换：直接重置滚动位置
watch(() => route.params.id, () => {
  nextTick(() => scrollToBottom('instant'));
});
</script>

<template>
  <div class="flex flex-col h-full">
    <n-scrollbar class="message-list px-5 pt-6">
      <div class="message-list-item mt-3 pb-5 flex items-center" v-for="message in messages" :key="message.id">
        <div class="pr-5" v-show="false">
          <!-- TODO: 多选 checkbox -->
        </div>
        <div class="flex flex-auto"
          :class="{ 'justify-end': message.type === 'question', 'justify-start': message.type === 'answer' }">
          <span>
            <div class="text-sm text-gray-500 mb-2"
              :style="{ textAlign: message.type === 'question' ? 'end' : 'start' }">
              {{ formatTimeAgo(message.createdAt) }}
            </div>
            <div class="msg-shadow p-2 rounded-md bg-bubble-self text-white" v-if="message.type === 'question'">
              <message-render :msg-id="message.id" :content="message.content"
                :is-streaming="message.status === 'streaming'" />
            </div>
            <div v-else class="msg-shadow p-2 px-6 rounded-md bg-bubble-others" :class="{
              'bg-bubble-others': message.status !== 'error',
              'text-tx-primary': message.status !== 'error',
              'text-red-300': message.status === 'error',
              'font-bold': message.status === 'error'
            }">
              <template v-if="message.status === 'loading'">
                ...
              </template>
              <template v-else>
                <message-render :msg-id="message.id" :content="message.content"
                  :is-streaming="message.status === 'streaming'" />
              </template>
            </div>
          </span>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<style scoped>
.msg-shadow {
  box-shadow: 0 0 10px var(--input-bg);
}
</style>