import { MessageItem } from '@/frontend/typing';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatState {
  privateMessages: MessageItem[];
  groupMessages: MessageItem[];
  isGroup: boolean; // 当前 tab 是否群聊
  tab: 'connect' | 'group' | 'private';
  selectMode: boolean; // 是否处于选择删除模式
  selectedKeys: string[]; // 被选中的消息 key
}

const initialState: ChatState = {
  privateMessages: [],
  groupMessages: [],
  isGroup: true,
  tab: 'connect',
  selectMode: false,
  selectedKeys: []
};

// 与 chatlist CFG.MAX_MESSAGES 对齐
const MAX_MESSAGES = 300;

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setTab(state, action: PayloadAction<ChatState['tab']>) {
      state.tab = action.payload;
    },
    setIsGroup(state, action: PayloadAction<boolean>) {
      state.isGroup = action.payload;
    },
    setPrivateMessages(state, action: PayloadAction<MessageItem[]>) {
      state.privateMessages = action.payload;
    },
    setGroupMessages(state, action: PayloadAction<MessageItem[]>) {
      state.groupMessages = action.payload;
    },
    appendPrivateMessage(state, action: PayloadAction<MessageItem>) {
      state.privateMessages.push(action.payload);
      if (state.privateMessages.length > MAX_MESSAGES) {
        state.privateMessages.splice(
          0,
          state.privateMessages.length - MAX_MESSAGES
        );
      }
    },
    appendGroupMessage(state, action: PayloadAction<MessageItem>) {
      state.groupMessages.push(action.payload);
      if (state.groupMessages.length > MAX_MESSAGES) {
        state.groupMessages.splice(
          0,
          state.groupMessages.length - MAX_MESSAGES
        );
      }
    },
    deletePrivateMessage(
      state,
      action: PayloadAction<{ CreateAt: number; UserId: string }>
    ) {
      state.privateMessages = state.privateMessages.filter(
        m =>
          !(
            m.CreateAt === action.payload.CreateAt &&
            m.UserId === action.payload.UserId
          )
      );
    },
    deleteGroupMessage(
      state,
      action: PayloadAction<{ CreateAt: number; UserId: string }>
    ) {
      state.groupMessages = state.groupMessages.filter(
        m =>
          !(
            m.CreateAt === action.payload.CreateAt &&
            m.UserId === action.payload.UserId
          )
      );
    },
    clearPrivateMessages(state) {
      state.privateMessages = [];
    },
    clearGroupMessages(state) {
      state.groupMessages = [];
    },
    // 进入或退出选择模式
    setSelectMode(state, action: PayloadAction<boolean>) {
      state.selectMode = action.payload;
      if (!action.payload) {
        state.selectedKeys = [];
      }
    },
    // 切换单条消息选择
    toggleSelectMessage(state, action: PayloadAction<MessageItem>) {
      const key = `${action.payload.UserId}:${action.payload.CreateAt}`;
      const exists = state.selectedKeys.includes(key);
      if (exists) {
        state.selectedKeys = state.selectedKeys.filter(k => k !== key);
      } else {
        state.selectedKeys.push(key);
      }
    },
    // 批量删除已选择的消息
    deleteSelectedMessages(state) {
      if (!state.selectedKeys.length) {
        return;
      }
      const keySet = new Set(state.selectedKeys);
      state.privateMessages = state.privateMessages.filter(
        m => !keySet.has(`${m.UserId}:${m.CreateAt}`)
      );
      state.groupMessages = state.groupMessages.filter(
        m => !keySet.has(`${m.UserId}:${m.CreateAt}`)
      );
      state.selectedKeys = [];
      state.selectMode = false;
    }
  }
});

export const {
  setTab,
  setIsGroup,
  setPrivateMessages,
  setGroupMessages,
  appendPrivateMessage,
  appendGroupMessage,
  deletePrivateMessage,
  deleteGroupMessage,
  clearPrivateMessages,
  clearGroupMessages,
  setSelectMode,
  toggleSelectMessage,
  deleteSelectedMessages
} = chatSlice.actions;

export default chatSlice.reducer;
