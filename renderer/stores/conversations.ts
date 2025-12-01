import { conversations } from './../testData';
import type { Conversation } from '@common/types';
import { conversations as testConversations } from '../testData';
import { debounce } from '@common/utils';
import { dataBase } from '@renderer/dataBase';

type SortBy = 'updatedAt' | 'createAt' | 'name' | 'model'; // 排序字段类型
type SortOrder = 'asc' | 'desc';

const SORT_BY_KEY = 'conversation:sortBy';
const SORT_ORDER_KEY = 'conversation:sortOrder';

const saveSortMode = debounce(
  ({ sortBy, sortOrder }: { sortBy: SortBy; sortOrder: SortOrder }) => {
    localStorage.setItem(SORT_BY_KEY, sortBy);
    localStorage.setItem(SORT_ORDER_KEY, sortOrder);
  },
  300
);

export const useConversationsStore = defineStore('conversations', () => {
  const conversations = ref<Conversation[]>(testConversations);

  const saveSortBy = localStorage.getItem(SORT_BY_KEY) as SortBy;
  const saveSortOrder = localStorage.getItem(SORT_ORDER_KEY) as SortOrder;

  const sortBy = ref<SortBy>(saveSortBy || 'updatedAt');
  const sortOrder = ref<SortOrder>(saveSortOrder || 'desc');

  const allConversations = computed(() => conversations.value);
  const sortMode = computed(() => ({
    sortBy: sortBy.value,
    sortOrder: sortOrder.value
  }));

  async function initialize() {
    conversations.value = await dataBase.conversations.toArray();

    const ids = conversations.value.map((item) => item.id);
    const msgs = await dataBase.messages.toArray();
    const invalidId = msgs
      .filter((msg) => !ids.includes(msg.conversationId))
      .map((msg) => msg.id);
    invalidId.length > 0 &&
      dataBase.messages.where('id').anyOf(invalidId).delete();
  }

  function setSortMode(_sortBy: SortBy, _sortOrder: SortOrder) {
    if (sortBy.value !== _sortBy) {
      sortBy.value = _sortBy;
    }
    if (sortOrder.value != _sortOrder) {
      sortOrder.value = _sortOrder;
    }
  }

  function getConversationById(id: number) {
    return conversations.value.find(
      (item) => item.id === id
    ) as Conversation | void;
  }

  async function addConversation(conversation: Omit<Conversation, 'id'>) {
    const conversationWithPin = {
      ...conversation,
      pinned: conversation.pinned ?? false
    };

    const conversationId = await dataBase.conversations.add(
      conversationWithPin
    );

    conversations.value.push({
      id: conversationId,
      ...conversationWithPin
    });

    return conversationId;
  }

  async function delConversation(id: number) {
    await dataBase.messages.where('conversationId').equals(id).delete();
    await dataBase.conversations.delete(id);
    conversations.value = conversations.value.filter((item) => item.id !== id);
  }

  async function updateConversation(
    conversation: Conversation,
    updateTime: boolean = true
  ) {
    const _newConversation = {
      ...conversation,
      updatedAt: updateTime ? Date.now() : conversation.updatedAt
    };

    await dataBase.conversations.update(conversation.id, _newConversation);
    conversations.value = conversations.value.map((item) =>
      item.id === conversation.id ? _newConversation : item
    );
  }

  async function pinConversation(id: number) {
    const conversation = conversations.value.find((item) => item.id === id);

    if (!conversation) return;
    await updateConversation(
      {
        ...conversation,
        pinned: true
      },
      false
    );
  }

  async function unpinConversation(id: number) {
    const conversation = conversations.value.find((item) => item.id === id);
    if (!conversation) return;
    await updateConversation(
      {
        ...conversation,
        pinned: false
      },
      false
    );
  }

  watch([() => sortBy.value, () => sortOrder.value], () =>
    saveSortMode({ sortBy: sortBy.value, sortOrder: sortOrder.value })
  );

  return {
    // State
    conversations,
    sortBy,
    sortOrder,

    // Getters
    allConversations,
    sortMode,

    // Actions
    initialize,
    setSortMode,
    getConversationById,
    addConversation,
    delConversation,
    updateConversation,
    pinConversation,
    unpinConversation
  };
});
