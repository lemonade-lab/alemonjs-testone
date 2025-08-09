import {
  configureStore,
  createListenerMiddleware,
  isAnyOf,
  Middleware
} from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';

// slices
import socketReducer from '@/frontend/store/slices/socketSlice';
import userReducer from '@/frontend/store/slices/userSlice';
import channelReducer from '@/frontend/store/slices/channelSlice';
import commandReducer from '@/frontend/store/slices/commandSlice';
import chatReducer, {
  appendPrivateMessage,
  appendGroupMessage,
  deleteGroupMessage,
  deletePrivateMessage,
  clearGroupMessages,
  clearPrivateMessages,
  setGroupMessages,
  setPrivateMessages,
  setTab
} from '@/frontend/store/slices/chatSlice';

import connectReducer from '@/frontend/store/slices/connectSlice';

import {
  wsConnectRequest,
  wsConnected,
  wsDisconnected,
  wsSetError,
  wsScheduleRestart
} from '@/frontend/store/slices/socketSlice';

import {
  setUsers,
  setBot,
  setCurrentUser
} from '@/frontend/store/slices/userSlice';
import { setChannels } from '@/frontend/store/slices/channelSlice';
import { setCommands } from '@/frontend/store/slices/commandSlice';

// 外部工具
import * as flattedJSON from 'flatted';
import { saveChatList, getChatList } from '@/frontend/core/chatlist';
import { Message } from '@/frontend/core/message';
import { payloadToMentions } from '@/frontend/core/alemon';

// ---------------- WebSocket 相关私有变量 ----------------
const RECONNECT_CODE_NORMAL = 1000;
let ws: WebSocket | null = null;
let reconnectTimer: any = null;

// ---------------- 工具函数 ----------------
function safeSend(obj: any) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('WS 未连接，发送失败');
    return false;
  }
  try {
    ws.send(flattedJSON.stringify(obj));
    return true;
  } catch (e) {
    console.error('发送失败', e);
    return false;
  }
}

function loadHistory(
  host: string,
  port: number,
  dispatch: any,
  channelId?: string
) {
  try {
    const priv = getChatList(host, port, 'private', 'bot') || [];
    dispatch(setPrivateMessages(priv));
    if (channelId) {
      const group = getChatList(host, port, 'public', channelId) || [];
      dispatch(setGroupMessages(group));
    }
  } catch (e) {
    console.warn('加载历史失败', e);
  }
}

// ---------------- Listener Middleware ----------------
export const listenerMiddleware = createListenerMiddleware();

// 监听连接列表变化
listenerMiddleware.startListening({
  matcher: isAnyOf(
    appendPrivateMessage,
    appendGroupMessage,
    deleteGroupMessage,
    deletePrivateMessage,
    clearGroupMessages,
    clearPrivateMessages
  ),
  effect: async (_action, api) => {
    const state: any = api.getState();
    const cfg = state.socket?.lastConfig;
    if (!cfg) {
      return;
    }

    try {
      // 私聊
      saveChatList(
        cfg.host,
        cfg.port,
        'private',
        'bot',
        state.chat.privateMessages
      );
      // 群聊
      const channelId = state.channels.current?.ChannelId;
      if (channelId) {
        saveChatList(
          cfg.host,
          cfg.port,
          'public',
          channelId,
          state.chat.groupMessages
        );
      }
    } catch {
      Message.error('持久化聊天失败');
    }
  }
});

/**
 * 新增：监听当前群 ChannelId 变化，自动加载对应群历史消息
 * 说明：
 *  - 使用 predicate 以便拿到 previousState 和 currentState 进行对比
 *  - 当 channelId 变化且存在新的 channelId 时：读取本地缓存，否则清空
 */
listenerMiddleware.startListening({
  predicate: (_action, currentState, previousState) => {
    const prevId = (previousState as any)?.channels?.current?.ChannelId;
    const curId = (currentState as any)?.channels?.current?.ChannelId;
    return prevId !== curId; // 允许 curId 为空时也触发，用于切换到“无群”状态
  },
  effect: async (_action, api) => {
    const state: any = api.getState();
    const cfg = state.socket?.lastConfig;
    if (!cfg) {
      return;
    }

    const channelId = state.channels.current?.ChannelId;
    if (channelId) {
      const list = getChatList(cfg.host, cfg.port, 'public', channelId) || [];
      api.dispatch(setGroupMessages(list));
    } else {
      // 没有当前群，则清空群消息
      api.dispatch(setGroupMessages([]));
    }
  }
});

// ---------------- WebSocket Middleware ----------------
export const wsMiddleware: Middleware<{}, any> = store => next => action => {
  const result = next(action);

  if (wsConnectRequest.match(action)) {
    const { host, port } = action.payload;
    if (!host || !port) {
      return result;
    }

    // 关闭旧连接
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    try {
      ws = new WebSocket(`ws://${host}:${port}/testone`);
    } catch (err: any) {
      store.dispatch(wsSetError(err.message));
      return result;
    }

    ws.onopen = () => {
      store.dispatch(wsConnected());
      const state: any = store.getState();
      const { chat } = state;
      // 初始跳转
      if (chat.tab === 'connect') {
        store.dispatch(setTab(chat.isGroup ? 'group' : 'private'));
      }
      // 请求 init
      safeSend({ type: 'init.data' });
      // 加载历史
      const channelId = state.channels.current?.ChannelId;
      loadHistory(host, port, store.dispatch, channelId);
    };

    ws.onmessage = (e: MessageEvent) => {
      try {
        const data = flattedJSON.parse(e.data.toString());
        handleServerPayload(store, data);
      } catch (err) {
        console.error('WS 消息解析失败', err);
      }
    };

    ws.onerror = err => {
      console.error('WS 错误', err);
      store.dispatch(wsSetError('WebSocket 错误'));
    };

    ws.onclose = ev => {
      store.dispatch(wsDisconnected());
      const state: any = store.getState();
      const socket = state.socket;
      if (
        socket.allowRestart &&
        ev.code !== RECONNECT_CODE_NORMAL &&
        socket.lastConfig
      ) {
        reconnectTimer = setTimeout(() => {
          store.dispatch(wsScheduleRestart());
          // 这里使用 socket.lastConfig 重新连接
          store.dispatch(wsConnectRequest(socket.lastConfig!));
        }, socket.reconnectDelay);
      }
    };
  }

  return result;
};

// ---------------- 服务器数据处理 ----------------
function handleServerPayload(store: any, receivedData: any) {
  switch (receivedData.type) {
    case 'init.data': {
      const { commands, users, channels, user, bot } =
        receivedData.payload || {};
      if (users) {
        store.dispatch(setUsers(users));
      }
      if (channels) {
        store.dispatch(setChannels(channels));
      }
      if (commands) {
        store.dispatch(setCommands(commands));
      }
      if (user) {
        store.dispatch(setCurrentUser(user));
      }
      if (bot) {
        store.dispatch(setBot(bot));
      }
      return;
    }
    case 'users':
      if (Array.isArray(receivedData.payload)) {
        store.dispatch(setUsers(receivedData.payload));
      }
      return;
    case 'channels':
      if (Array.isArray(receivedData.payload)) {
        store.dispatch(setChannels(receivedData.payload));
      }
      return;
    case 'commands':
      store.dispatch(setCommands(receivedData.payload || []));
      return;
    case 'bot':
      store.dispatch(setBot(receivedData.payload));
      return;
    case 'user':
      store.dispatch(setCurrentUser(receivedData.payload));
      return;
    default:
      if (receivedData.actionId) {
        handleAction(store, receivedData);
      }
  }
}

function handleAction(store: any, data: any) {
  const state: any = store.getState();
  const bot = state.users.bot;
  // 当前选择的频道
  const channel = state.channels.current;

  if (data.action === 'message.send') {
    const message: any = {
      UserId: bot?.UserId,
      UserName: bot?.UserName,
      UserAvatar: bot?.UserAvatar,
      CreateAt: Date.now(),
      data: data.payload?.params?.format
    };

    if (/private/.test(data.payload?.event?.name || '')) {
      store.dispatch(appendPrivateMessage(message));
      persistPrivate(store);
    } else {
      if (channel.ChannelId === data.payload?.event?.ChannelId) {
        store.dispatch(appendGroupMessage(message));
      }
      persistGroup(store);
    }
  } else if (data.action === 'mention.get') {
    try {
      const mentions = payloadToMentions(data.payload, state.users.users);
      safeSend({
        ...data,
        payload: [{ code: 2000, message: '', data: mentions }]
      });
    } catch (e) {
      console.error('处理 mentions 失败', e);
    }
  }
}

function persistPrivate(store: any) {
  const state: any = store.getState();
  const cfg = state.socket.lastConfig;
  if (!cfg) {
    return;
  }
  try {
    saveChatList(
      cfg.host,
      cfg.port,
      'private',
      'bot',
      state.chat.privateMessages
    );
  } catch (e) {
    Message.error('保存私聊失败');
  }
}

function persistGroup(store: any) {
  const state: any = store.getState();
  const cfg = state.socket.lastConfig;
  const channelId = state.channels.current?.ChannelId;
  if (!cfg || !channelId) {
    return;
  }
  try {
    saveChatList(
      cfg.host,
      cfg.port,
      'public',
      channelId,
      state.chat.groupMessages
    );
  } catch (e) {
    Message.error('保存群聊失败');
  }
}

// ---------------- Store ----------------
export const store = configureStore({
  reducer: {
    socket: socketReducer,
    users: userReducer,
    channels: channelReducer,
    commands: commandReducer,
    chat: chatReducer,
    connect: connectReducer
  },
  middleware: getDefault =>
    getDefault({
      serializableCheck: false
    }).concat(listenerMiddleware.middleware, wsMiddleware),
  devTools: process.env.NODE_ENV === 'development'
});

// ---------------- 类型导出（供组件使用） ----------------
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ---------------- 自定义 hooks ----------------
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ---------------- 可选导出：safeSend (若外部还需要) ----------------
export { safeSend };
