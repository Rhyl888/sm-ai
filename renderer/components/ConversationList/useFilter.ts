import { useConversationsStore } from '@renderer/stores/conversations';
const searchKey = ref('');

export function useFilter() {
  const conversationsStore = useConversationsStore();

  const filteredConversations = computed(() => {
    return conversationsStore.allConversations;
  });

  return {
    searchKey,
    conversations: filteredConversations
  };
}
