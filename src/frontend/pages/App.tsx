import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Channel,
  Command,
  Connect,
  MessageItem,
  PageTag,
  User
} from '@/frontend/typing';
import { isArray } from 'lodash-es';
import ConnectList from '@/frontend/pages/ConnectList';
import { getConnectList } from '@/frontend/core/connect';
import { Message } from '@/frontend/core/message';
import {
  DataEnums,
  PrivateEventMessageCreate,
  PublicEventMessageCreate
} from 'alemonjs';
import * as flattedJSON from 'flatted';
import { ACTIONS_MAP, initCommand } from '@/frontend/config';
import { initBot, initChannel, initConfig, initUser } from '@/frontend/config';
import {
  payloadToMentions,
  Platform,
  useUserHashKey
} from '@/frontend/core/alemon';
import Header from '@/frontend/pages/common/Header';
import { parseMessage } from '@/frontend/core/parse';
import ChatWindow from '@/frontend/pages/ChatWindow';
import { getChatList, saveChatList } from '../core/chatlist';

// 常量定义
const RECONNECT_DELAY = 3000;
const WEBSOCKET_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
} as const;

export default function App() {
  // 页面状态
  const [tag, setTag] = useState<PageTag>('connect');

  // 连接状态
  const [status, setStatus] = useState<boolean>(false);
  const statusRef = useRef(status);

  // 连接列表
  const [connectList, setConnectList] = useState<Connect[]>([initConfig]);

  // 选择的连接配置
  const [config, setConfig] = useState<Connect>({
    name: '',
    host: '',
    port: 0
  });
  const configRef = useRef(config);

  // 用户和频道状态
  const [users, setUsers] = useState<User[]>([]);
  const usersRef = useRef(users);
  const [channels, setChannels] = useState<Channel[]>([initChannel]);
  const [channel, setChannel] = useState<Channel>(initChannel);
  const channelRef = useRef(channel);

  // 指令和机器人状态
  const [commands, setCommands] = useState<Command[]>([initCommand]);
  const [bot, setBot] = useState<User>(initBot);
  const botRef = useRef(bot);
  const [user, setUser] = useState<User>(initUser);

  // 消息状态
  const [privateMessages, setPrivateMessages] = useState<MessageItem[]>([]);
  const [groupMessages, setGroupMessages] = useState<MessageItem[]>([]);

  // 连接控制状态
  const [isConnecting, setIsConnecting] = useState(false);
  const [isGroup, setIsGroup] = useState(true);
  const [allowRestart, setAllowRestart] = useState(true);
  const [isRestart, setIsRestart] = useState(false);

  // 定时器引用
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  // 更新所有 ref
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    botRef.current = bot;
  }, [bot]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    channelRef.current = channel;
  }, [channel]);

  // 清理定时器的函数
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 安全的WebSocket发送函数
  const safeSendWebSocket = useCallback((data: any) => {
    const ws = websocketRef.current || window.websocket;
    if (ws && ws.readyState === WEBSOCKET_READY_STATE.OPEN) {
      try {
        ws.send(flattedJSON.stringify(data));
        return true;
      } catch (error) {
        console.error('WebSocket 发送失败:', error);
        return false;
      }
    }
    console.warn('WebSocket 未连接或状态异常');
    return false;
  }, []);

  // 保存聊天记录的统一函数
  const saveChatMessages = useCallback(
    (type: 'public' | 'private', chatId: string, messages: MessageItem[]) => {
      if (!configRef.current.host || !configRef.current.port) {
        console.warn('配置信息不完整，无法保存聊天记录');
        return;
      }

      try {
        saveChatList(
          configRef.current.host,
          configRef.current.port,
          type,
          chatId,
          messages
        );
      } catch (error) {
        console.error('保存聊天记录失败:', error);
        Message.error('保存聊天记录失败');
      }
    },
    []
  );

  // 加载聊天记录的函数
  const loadChatMessages = useCallback(
    (
      type: 'public' | 'private',
      chatId: string,
      setter: (messages: MessageItem[]) => void
    ) => {
      if (!configRef.current.host || !configRef.current.port) {
        return;
      }
      try {
        const res = getChatList(
          configRef.current.host,
          configRef.current.port,
          type,
          chatId
        );
        if (!window.vscode) {
          setter(res || []);
        }
      } catch (error) {
        console.error('加载聊天记录失败:', error);
        setter([]);
      }
    },
    []
  );

  // 频道切换时加载群聊记录
  useEffect(() => {
    if (
      channel.ChannelId &&
      configRef.current.host &&
      configRef.current.port &&
      status
    ) {
      loadChatMessages('public', channel.ChannelId, setGroupMessages);
    }
  }, [channel.ChannelId, loadChatMessages, status]);

  // 重连逻辑
  useEffect(() => {
    if (isRestart && configRef.current?.host && configRef.current?.port) {
      onConnect(configRef.current);
      setIsRestart(false);
    }
  }, [isRestart]);

  // 页面跳转检查
  const onGoTag = useCallback((type: PageTag) => {
    if (type !== 'connect' && !statusRef.current) {
      Message.info('请先连接服务器');
      return;
    }
    setTag(type);
  }, []);

  // VS Code 消息处理
  useEffect(() => {
    const readFile = (code: number, data: any) => {
      try {
        switch (code) {
          case 1001: // 连接列表
            if (data && isArray(data) && data.length > 0) {
              setConnectList(data);
            }
            break;
          case 1002: // 私聊消息
            setPrivateMessages(data || []);
            break;
          case 1003: // 群聊消息
            setGroupMessages(data || []);
            break;
          default:
            console.warn('未知的文件代码:', code);
        }
      } catch (error) {
        console.error('处理文件数据失败:', error);
      }
    };

    const handleResponse = (event: {
      data: { type: string; payload: any };
    }) => {
      if (!event.data.type) return;

      console.log('vscode 消息:', event.data);
      const message = event.data;

      try {
        if (ACTIONS_MAP[message.type]) {
          // 检查连接状态
          if (
            message.type !== 'ALemonTestOne.openConnect' &&
            !statusRef.current
          ) {
            Message.info('请先连接服务器');
            return;
          }

          // 设置页面类型
          if (message.type === 'ALemonTestOne.openGroup') {
            setIsGroup(true);
          } else if (message.type === 'ALemonTestOne.openPrivate') {
            setIsGroup(false);
          }

          setTag(ACTIONS_MAP[message.type]);
        } else if (message.type === 'fs.readFile') {
          readFile(message.payload.code, message.payload.data);
        }
      } catch (error) {
        console.error('处理 VS Code 消息失败:', error);
      }
    };

    // 初始化连接列表
    try {
      const data = getConnectList();
      if (data) {
        setConnectList(data);
      }
    } catch (error) {
      console.error('加载连接列表失败:', error);
    }

    window.addEventListener('message', handleResponse);
    return () => {
      window.removeEventListener('message', handleResponse);
    };
  }, []);

  // 初始化数据
  const initData = useCallback(
    (data: {
      type: string;
      payload: {
        commands: Command[];
        users: User[];
        channels: Channel[];
        bot?: User;
        user?: User;
      };
    }) => {
      try {
        const { commands, users, channels, user, bot } = data.payload;

        // 设置用户列表
        if (users.length > 0) {
          setUsers([initBot, initBot, ...users]);
        } else {
          setUsers([initUser, initBot]);
        }

        // 设置频道列表
        if (channels.length > 0) {
          setChannels(channels);
          setChannel(channels[0]);
        } else {
          setChannels([initChannel]);
          setChannel(initChannel);
        }

        // 设置用户信息
        setUser(user || initUser);
        setBot(bot || initBot);

        // 设置指令列表
        if (commands.length > 0) {
          setCommands(commands);
        }
      } catch (error) {
        console.error('初始化数据失败:', error);
      }
    },
    []
  );

  // 处理 action
  const handleAction = useCallback(
    (data: { action: string; payload: any }) => {
      try {
        if (data.action === 'message.send') {
          const event = data.payload.event;
          const message: MessageItem = {
            UserId: botRef.current.UserId,
            UserName: botRef.current.UserName,
            UserAvatar: botRef.current.UserAvatar,
            CreateAt: Date.now(),
            data: data.payload.params.format
          };

          console.log('收到消息:', message);

          if (/private/.test(event.name)) {
            // 私聊消息
            setPrivateMessages(prev => {
              const newMessages = [...prev, message];
              saveChatMessages('private', 'bot', newMessages);
              return newMessages;
            });
          } else {
            // 群聊消息
            setGroupMessages(prev => {
              const newMessages = [...prev, message];
              if (channelRef.current?.ChannelId) {
                saveChatMessages(
                  'public',
                  channelRef.current.ChannelId,
                  newMessages
                );
              }
              return newMessages;
            });
          }
        } else if (data.action === 'mention.get') {
          console.log('处理 mentions');
          const mentions = payloadToMentions(data.payload, usersRef.current);
          console.log('mentions 结果:', mentions);

          safeSendWebSocket({
            ...data,
            payload: [
              {
                code: 2000,
                message: '',
                data: mentions
              }
            ]
          });
        }
      } catch (error) {
        console.error('处理 action 失败:', error);
      }
    },
    [saveChatMessages, safeSendWebSocket]
  );

  // WebSocket 连接函数
  const connect = (data: Connect) => {
    try {
      // 关闭之前的连接
      if (websocketRef.current) {
        websocketRef.current.close();
      }

      const ws = new WebSocket(`ws://${data.host}:${data.port}/testone`);
      websocketRef.current = ws;
      window.websocket = ws;

      ws.onopen = () => {
        console.log('WebSocket 连接成功');
        setIsConnecting(false);
        setStatus(true);

        // 页面跳转逻辑
        if (tag === 'connect') {
          setTag(isGroup ? 'group' : 'private');
        }

        // 发送初始化请求
        safeSendWebSocket({ type: 'init.data' });

        // 加载本地聊天记录
        loadChatMessages('private', 'bot', setPrivateMessages);

        if (channelRef.current?.ChannelId) {
          loadChatMessages(
            'public',
            channelRef.current.ChannelId,
            setGroupMessages
          );
        }
      };

      ws.onmessage = (e: MessageEvent) => {
        try {
          const receivedData = flattedJSON.parse(e.data.toString());
          console.log('收到 WebSocket 消息:', receivedData);

          switch (receivedData.type) {
            case 'init.data':
              initData(receivedData);
              break;
            case 'users':
              if (
                Array.isArray(receivedData.payload) &&
                receivedData.payload.length > 0
              ) {
                setUsers(receivedData.payload);
              }
              break;
            case 'channels':
              if (
                Array.isArray(receivedData.payload) &&
                receivedData.payload.length > 0
              ) {
                setChannels(receivedData.payload);
              }
              break;
            case 'commands':
              setCommands(receivedData.payload || []);
              break;
            case 'bot':
              if (receivedData.payload) {
                setBot(receivedData.payload);
              }
              break;
            case 'user':
              if (receivedData.payload) {
                setUser(receivedData.payload);
              }
              break;
            default:
              if (receivedData.actionId) {
                handleAction(receivedData);
              }
              break;
          }
        } catch (error) {
          console.error('处理 WebSocket 消息失败:', error);
        }
      };

      ws.onerror = error => {
        console.error('WebSocket 错误:', error);
        setStatus(false);
        Message.error('WebSocket 连接错误');
      };

      ws.onclose = event => {
        console.log('WebSocket 连接关闭:', event.code, event.reason);
        setStatus(false);
        setTag('connect');

        // 重连逻辑
        if (allowRestart && event.code !== 1000) {
          // 1000 是正常关闭
          console.log(`${RECONNECT_DELAY / 1000} 秒后尝试重连...`);
          timerRef.current = setTimeout(() => {
            setIsRestart(true);
          }, RECONNECT_DELAY);
        }
      };
    } catch (error) {
      console.error('创建 WebSocket 连接失败:', error);
      setIsConnecting(false);
      setStatus(false);
      Message.error('连接失败');
    }
  };

  // 连接处理函数
  const onConnect = useCallback(
    (data: Connect) => {
      if (!data?.host || !data?.port) {
        Message.info('连接信息不完整');
        return;
      }

      if (status && websocketRef.current) {
        websocketRef.current.close();
      }

      setAllowRestart(true);
      setIsConnecting(true);
      setConfig(data);
      connect(data);
    },
    [status, connect]
  );

  // 发送群聊消息
  const onSendPublic = useCallback(
    (message: string) => {
      try {
        const content = parseMessage({
          Users: users,
          Channels: channels,
          input: message
        });
        onSendFormatPublic(content);
      } catch (error) {
        console.error('解析群聊消息失败:', error);
        Message.error('消息解析失败');
      }
    },
    [users, channels]
  );

  const onSendFormatPublic = useCallback(
    (content: DataEnums[]) => {
      try {
        if (!safeSendWebSocket) return;

        const UserKey = useUserHashKey({
          Platform: Platform,
          UserId: user.UserId
        });

        const MessageText =
          content.find(item => item.type === 'Text')?.value || '';

        const data: PublicEventMessageCreate = {
          name: 'message.create',
          ChannelId: channel.ChannelId,
          GuildId: channel.ChannelId,
          UserId: user.UserId,
          OpenId: user.OpenId || '',
          UserName: user.UserName,
          UserKey: UserKey,
          IsBot: false,
          IsMaster: false,
          UserAvatar: user.UserAvatar,
          Platform: Platform,
          MessageText: MessageText,
          CreateAt: Date.now(),
          MessageId: Date.now().toString(),
          tag: channel.ChannelId,
          value: content
        };

        const messageItem: MessageItem = {
          UserId: data.UserId || '',
          UserName: data.UserName || '',
          UserAvatar: data.UserAvatar || '',
          CreateAt: data.CreateAt || Date.now(),
          data: content
        };

        // 更新状态并保存
        setGroupMessages(prev => {
          const newMessages = [...prev, messageItem];
          if (channel.ChannelId) {
            saveChatMessages('public', channel.ChannelId, newMessages);
          }
          return newMessages;
        });

        // 发送到服务器
        safeSendWebSocket(data);
      } catch (error) {
        console.error('发送群聊消息失败:', error);
        Message.error('发送消息失败');
      }
    },
    [user, channel, safeSendWebSocket, saveChatMessages]
  );

  // 发送私聊消息
  const onSendPrivate = useCallback(
    (message: string) => {
      try {
        const content = parseMessage({
          Users: users,
          Channels: channels,
          input: message
        });
        onSendFormatPrivate(content);
      } catch (error) {
        console.error('解析私聊消息失败:', error);
        Message.error('消息解析失败');
      }
    },
    [users, channels]
  );

  const onSendFormatPrivate = useCallback(
    (content: DataEnums[]) => {
      try {
        const UserKey = useUserHashKey({
          Platform: Platform,
          UserId: user.UserId
        });

        const MessageText =
          content.find(item => item.type === 'Text')?.value || '';

        const data: PrivateEventMessageCreate = {
          name: 'private.message.create',
          UserId: user.UserId,
          UserKey: UserKey,
          OpenId: user.OpenId || '',
          IsBot: false,
          IsMaster: false,
          UserAvatar: user.UserAvatar,
          Platform: Platform,
          MessageText: MessageText,
          CreateAt: Date.now(),
          MessageId: Date.now().toString(),
          UserName: user.UserName,
          tag: channel.ChannelId,
          value: content
        };

        const messageItem: MessageItem = {
          UserId: data.UserId || '',
          UserName: data.UserName || '',
          UserAvatar: data.UserAvatar || '',
          CreateAt: data.CreateAt || Date.now(),
          data: content
        };

        // 更新状态并保存
        setPrivateMessages(prev => {
          const newMessages = [...prev, messageItem];
          saveChatMessages('private', 'bot', newMessages);
          return newMessages;
        });

        // 发送到服务器
        safeSendWebSocket(data);
      } catch (error) {
        console.error('发送私聊消息失败:', error);
        Message.error('发送消息失败');
      }
    },
    [user, safeSendWebSocket, saveChatMessages]
  );

  // 删除私聊消息
  const onDeletePrivate = useCallback(
    (item: MessageItem) => {
      setPrivateMessages(prev => {
        const newMessages = prev.filter(
          i => i.CreateAt !== item.CreateAt || i.UserId !== item.UserId
        );
        saveChatMessages('private', 'bot', newMessages);
        return newMessages;
      });
    },
    [saveChatMessages]
  );

  // 删除群聊消息
  const onDeleteGroup = useCallback(
    (item: MessageItem) => {
      setGroupMessages(prev => {
        const newMessages = prev.filter(
          i => i.CreateAt !== item.CreateAt || i.UserId !== item.UserId
        );
        if (channelRef.current?.ChannelId) {
          saveChatMessages('public', channelRef.current.ChannelId, newMessages);
        }
        return newMessages;
      });
    },
    [saveChatMessages]
  );

  // 清空群聊消息
  const onClearGroup = useCallback(() => {
    setGroupMessages([]);
    if (channelRef.current?.ChannelId) {
      saveChatMessages('public', channelRef.current.ChannelId, []);
    }
  }, [saveChatMessages]);

  // 清空私聊消息
  const onClearPrivate = useCallback(() => {
    setPrivateMessages([]);
    if (channelRef.current?.ChannelId) {
      saveChatMessages('private', channelRef.current.ChannelId, []);
    }
  }, [saveChatMessages]);

  // 连接取消处理
  const onConnectCancel = useCallback(() => {
    setIsConnecting(false);
    setTag('connect');
    clearTimer();
    setAllowRestart(false);

    if (websocketRef.current) {
      websocketRef.current.close();
    }
  }, [clearTimer]);

  // 连接列表更新函数
  const onAddConnect = useCallback((data: Connect) => {
    setConnectList(prev => [...prev, data]);
  }, []);

  const onUpdateConnect = useCallback((data: Connect) => {
    setConnectList(prev =>
      prev.map(item => (item.name === data.name ? data : item))
    );
  }, []);

  const onDeleteConnect = useCallback((data: Connect) => {
    setConnectList(prev => prev.filter(item => item.name !== data.name));
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearTimer();
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [clearTimer]);

  // 渲染映射
  const renderMap = useMemo(
    () => ({
      connect: (
        <ConnectList
          connecting={isConnecting}
          value={connectList}
          onOk={onConnect}
          onCancel={onConnectCancel}
          onAdd={onAddConnect}
          onUpdate={onUpdateConnect}
          onDel={onDeleteConnect}
        />
      ),
      group: (
        <ChatWindow
          pageType="public"
          status={status}
          message={groupMessages}
          channels={channels}
          channel={channel}
          onSelect={setChannel}
          users={users}
          onSend={onSendPublic}
          onSendFormat={onSendFormatPublic}
          onDelete={onDeleteGroup}
          user={user}
          bot={bot}
          commands={commands}
          onClear={onClearGroup}
        />
      ),
      private: (
        <ChatWindow
          pageType="private"
          status={status}
          channels={channels}
          channel={channel}
          onSelect={setChannel}
          users={users}
          user={user}
          bot={bot}
          commands={commands}
          message={privateMessages}
          onSend={onSendPrivate}
          onSendFormat={onSendFormatPrivate}
          onDelete={onDeletePrivate}
          onClear={onClearPrivate}
        />
      )
    }),
    [
      isConnecting,
      connectList,
      onConnect,
      onConnectCancel,
      onAddConnect,
      onUpdateConnect,
      onDeleteConnect,
      groupMessages,
      channels,
      channel,
      users,
      onSendPublic,
      onSendFormatPublic,
      onDeleteGroup,
      user,
      bot,
      commands,
      privateMessages,
      onSendPrivate,
      onSendFormatPrivate,
      onDeletePrivate
    ]
  );

  return (
    <div className="overflow-hidden flex flex-1 flex-col bg-[var(--sideBar-background)] overflow-y-auto scrollbar">
      {!window.vscode && <Header onClick={onGoTag} />}
      {renderMap[tag]}
      {tag !== 'connect' && (
        <footer className="flex flex-row justify-between items-center px-4 py-1 select-none border-t border-[--panel-border]">
          [{config.host}][{config.port}]
        </footer>
      )}
    </div>
  );
}
