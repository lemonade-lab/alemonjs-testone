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
import { deleteSelectedMessages } from '@/frontend/store/slices/chatSlice';

import connectReducer from '@/frontend/store/slices/connectSlice';
import themeReducer from '@/frontend/store/slices/themeSlice';

import {
  wsConnectRequest,
  wsConnected,
  wsDisconnected,
  wsSetError,
  wsScheduleRestart,
  wsIncReconnect,
  wsCancel
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
import {
  saveChatList,
  getChatList,
  runtimeTrimArray
} from '@/frontend/core/chatlist';
import { Message } from '@/frontend/core/message';
import { payloadToMentions } from '@/frontend/core/alemon';
import { normalizeFormatAsync } from '@/frontend/core/imageStore';

// ---------------- WebSocket 相关私有变量 ----------------
const RECONNECT_CODE_NORMAL = 1000;
let ws: WebSocket | null = null;
let reconnectTimer: any = null;
let connectTimeoutTimer: any = null; // 新增：连接超时计时器

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
    const priv =
      getChatList({
        host,
        port,
        type: 'private',
        chatId: 'bot'
      }) || [];
    dispatch(setPrivateMessages(priv));
    if (channelId) {
      const group =
        getChatList({
          host,
          port,
          type: 'public',
          chatId: channelId
        }) || [];
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
    clearPrivateMessages,
    deleteSelectedMessages
  ),
  effect: async (_action, api) => {
    // 合并多次触发：50ms 内只写一次
    schedulePersist(api.getState as any, () => Message.error('持久化聊天失败'));
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
      const list =
        getChatList({
          host: cfg.host,
          port: cfg.port,
          type: 'public',
          chatId: channelId
        }) || [];
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

    // 启动连接超时（例如 8 秒）
    if (connectTimeoutTimer) {
      clearTimeout(connectTimeoutTimer);
      connectTimeoutTimer = null;
    }
    connectTimeoutTimer = setTimeout(() => {
      // 仍处于连接中则判定超时
      if (ws && ws.readyState === WebSocket.CONNECTING) {
        try {
          ws.close();
        } catch {}
        store.dispatch(wsSetError('连接超时'));
        // 交给 onclose 逻辑决定是否重连
      }
    }, 1000 * 6);

    ws.onopen = () => {
      if (connectTimeoutTimer) {
        clearTimeout(connectTimeoutTimer);
        connectTimeoutTimer = null;
      }
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
      if (connectTimeoutTimer) {
        clearTimeout(connectTimeoutTimer);
        connectTimeoutTimer = null;
      }
      console.error('WS 错误', err);
      store.dispatch(wsSetError('WebSocket 错误'));
    };

    ws.onclose = ev => {
      if (connectTimeoutTimer) {
        clearTimeout(connectTimeoutTimer);
        connectTimeoutTimer = null;
      }
      store.dispatch(wsDisconnected());
      const state: any = store.getState();
      const socket = state.socket;
      if (!socket.allowRestart) {
        return;
      }
      // 超过 3 次失败则停止自动重连（除非是持久重连模式）
      if (!socket.persistentReconnect && socket.reconnectAttempts >= 3) {
        return; // 放弃（非持久模式达到上限）
      }
      if (ev.code !== RECONNECT_CODE_NORMAL && socket.lastConfig) {
        const backoff = socket.reconnectDelay || 1200; // 固定 1.2s
        // 立即标记正在等待重连，以便 UI 显示 loading
        store.dispatch(wsScheduleRestart());
        reconnectTimer = setTimeout(() => {
          // 再次检查次数，避免 race
          const againState: any = store.getState();
          if (
            !againState.socket.persistentReconnect &&
            againState.socket.reconnectAttempts >= 3
          ) {
            // 达到上限：确保关闭 loading
            store.dispatch(wsDisconnected());
            // 关闭后续自动重启
            // 直接修改 allowRestart 需要 action，这里复用 wsSetError 不合适，可忽略或增加一个 action；简单起见保持 allowRestart 状态
            return;
          }
          console.debug(
            '[WS] attempt reconnect',
            againState.socket.reconnectAttempts + 1,
            'persistent=',
            againState.socket.persistentReconnect
          );
          store.dispatch(wsIncReconnect());
          store.dispatch(wsConnectRequest(againState.socket.lastConfig!));
        }, backoff);
      }
    };
  }
  // 处理取消连接
  if (wsCancel.match(action)) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (connectTimeoutTimer) {
      clearTimeout(connectTimeoutTimer);
      connectTimeoutTimer = null;
    }
    try {
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      ) {
        // 使用正常关闭码，避免触发重连
        ws.close(RECONNECT_CODE_NORMAL, 'manual cancel');
      }
    } catch {}
  }

  return result;
};

// ---------------- 即时裁剪中间件（追加消息后立刻同步 UI） ----------------
const trimMiddleware: Middleware = storeAPI => next => action => {
  const result = next(action);
  try {
    if (
      appendGroupMessage.match(action) ||
      appendPrivateMessage.match(action)
    ) {
      const state: any = storeAPI.getState();
      const cfg = state.socket?.lastConfig;
      if (!cfg) {
        return result;
      }
      if (appendPrivateMessage.match(action)) {
        const current = state.chat.privateMessages;
        const trimmed = runtimeTrimArray(current);
        if (trimmed !== current) {
          storeAPI.dispatch(setPrivateMessages(trimmed));
        }
      }
      if (appendGroupMessage.match(action)) {
        const current = state.chat.groupMessages;
        const trimmed = runtimeTrimArray(current);
        if (trimmed !== current) {
          storeAPI.dispatch(setGroupMessages(trimmed));
        }
      }
    }
  } catch (e) {
    console.warn('即时裁剪中间件错误', e);
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

async function handleAction(store: any, data: any) {
  const state: any = store.getState();
  const bot = state.users.bot;
  // 当前选择的频道
  const channel = state.channels.current;

  if (data.action === 'message.send') {
    let format = data.payload?.params?.format;
    if (Array.isArray(format)) {
      try {
        format = await normalizeFormatAsync(format);
      } catch (e) {
        console.warn('服务器消息格式图片转换失败', e);
      }
    }
    const message: any = {
      UserId: bot?.UserId,
      UserName: bot?.UserName,
      UserAvatar: bot?.UserAvatar,
      CreateAt: Date.now(),
      data: format
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
  schedulePersist(store.getState, () => Message.error('保存私聊失败'));
}

function persistGroup(store: any) {
  const state: any = store.getState();
  const cfg = state.socket.lastConfig;
  const channelId = state.channels.current?.ChannelId;
  if (!cfg || !channelId) {
    return;
  }
  schedulePersist(store.getState, () => Message.error('保存群聊失败'));
}

// ---------------- 批量持久化调度 ----------------
let _persistTimer: any = null;
let _pendingPersist = false;
function schedulePersist(getState: () => any, onError: () => void) {
  if (_persistTimer) {
    _pendingPersist = true;
    return;
  }
  _pendingPersist = true;
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    if (!_pendingPersist) {
      return;
    }
    _pendingPersist = false;
    const state = getState();
    const cfg = state.socket?.lastConfig;
    if (!cfg) {
      return;
    }
    const persistFn = () => {
      try {
        const { data: trimmedPriv, changed: privChanged } = saveChatList(
          { host: cfg.host, port: cfg.port, type: 'private', chatId: 'bot' },
          state.chat.privateMessages
        );
        if (privChanged) {
          // 同步 Redux，避免 UI 保留被裁剪的旧消息
          try {
            store.dispatch(setPrivateMessages(trimmedPriv));
          } catch (e) {
            console.warn('同步裁剪私聊消息失败', e);
          }
        }
        const channelId = state.channels.current?.ChannelId;
        if (channelId) {
          const { data: trimmedGroup, changed: groupChanged } = saveChatList(
            {
              host: cfg.host,
              port: cfg.port,
              type: 'public',
              chatId: channelId
            },
            state.chat.groupMessages
          );
          if (groupChanged) {
            try {
              store.dispatch(setGroupMessages(trimmedGroup));
            } catch (e) {
              console.warn('同步裁剪群聊消息失败', e);
            }
          }
        }
      } catch {
        onError();
      }
    };
    if (typeof (window as any)?.requestIdleCallback === 'function') {
      (window as any).requestIdleCallback(persistFn, { timeout: 1000 });
    } else {
      persistFn();
    }
  }, 50); // 50ms 节流窗口
}

// ---------------- Store ----------------
export const store = configureStore({
  reducer: {
    socket: socketReducer,
    users: userReducer,
    channels: channelReducer,
    commands: commandReducer,
    chat: chatReducer,
    connect: connectReducer,
    theme: themeReducer
  },
  middleware: getDefault =>
    getDefault({
      serializableCheck: false
    }).concat(listenerMiddleware.middleware, trimMiddleware, wsMiddleware),
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
