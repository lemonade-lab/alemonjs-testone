import { MessageItem } from '@/frontend/typing';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatState {
  privateMessages: MessageItem[];
  groupMessages: MessageItem[];
  isGroup: boolean; // 当前 tab 是否群聊
  tab: 'connect' | 'group' | 'private';
}

const initialState: ChatState = {
  privateMessages: [],
  groupMessages: [],
  isGroup: true,
  tab: 'connect'
};

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
    },
    appendGroupMessage(state, action: PayloadAction<MessageItem>) {
      state.groupMessages.push(action.payload);
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
  clearGroupMessages
} = chatSlice.actions;

export default chatSlice.reducer;
