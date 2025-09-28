import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Connect } from '@/frontend/typing';
import { getConnectList, saveConnect } from '@/frontend/core/connect';
import { initConnect } from '@/frontend/config';

export interface ConnectState {
  list: Connect[];
}

const initialState: ConnectState = {
  list: [initConnect]
};

const connectSlice = createSlice({
  name: 'connect',
  initialState,
  reducers: {
    /**
     * 加载连接列表
     * @param state
     * @returns
     */
    loadConnects(state) {
      try {
        const data = getConnectList();
        // vscode 模式。不处理返回值
        if (window.vscode) {
          return;
        }
        if (Array.isArray(data)) {
          state.list = data;
        } else {
          state.list = [initConnect];
        }
      } catch {
        state.list = [initConnect];
      }
    },
    /**
     * 设置连接列表
     * @param state
     * @param action
     */
    setConnects(state, action: PayloadAction<Connect[]>) {
      if (Array.isArray(action.payload)) {
        if (action.payload.length) {
          state.list = action.payload;
        } else {
          state.list = [initConnect];
        }
      } else {
        state.list = [initConnect];
      }
    },
    /**
     * 添加连接
     * @param state
     * @param action
     */
    addConnect(state, action: PayloadAction<Connect>) {
      if (action.payload) {
        state.list.unshift(action.payload);
        saveConnect(state.list, '保存成功');
      }
    },
    /**
     * 更新连接
     * @param state
     * @param action
     */
    updateConnect(state, action: PayloadAction<Connect>) {
      state.list = state.list.map(c =>
        c.name === action.payload.name ? action.payload : c
      );
      saveConnect(state.list, '保存成功');
    },
    /**
     * 删除连接
     * @param state
     * @param action
     */
    deleteConnect(state, action: PayloadAction<string>) {
      state.list = state.list.filter(c => c.name !== action.payload);
      saveConnect(state.list, '删除成功');
    },
    /**
     * 把连接放到最前面
     * @param state
     * @param action
     */
    bumpToTop(state, action: PayloadAction<string>) {
      const idx = state.list.findIndex(c => c.name === action.payload);
      if (idx > -1) {
        const [item] = state.list.splice(idx, 1);
        state.list.unshift(item);
        saveConnect(state.list, '');
      }
    }
  }
});

export const {
  loadConnects,
  setConnects,
  addConnect,
  updateConnect,
  deleteConnect,
  bumpToTop
} = connectSlice.actions;

export default connectSlice.reducer;
