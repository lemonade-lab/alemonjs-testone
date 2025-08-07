import { useEffect, useRef, useState } from 'react';
import GroupApp from '@/frontend/pages/GroupApp';
import PrivateApp from '@/frontend/pages/PrivateApp';
import {
  Channel,
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
import { ACTIONS_MAP } from '../config';
import { initBot, initChannel, initConfig, initUser } from '../config';
import { Platform, useUserHashKey } from '../core/alemon';

/**
 *
 * @returns
 */
export default function App() {
  // 页面
  const [tag, setTag] = useState<PageTag>('connect');
  // 连接状态
  const [status, setStatus] = useState<boolean>(false);
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  // 连接列表
  const [connectList, setConnectList] = useState<Connect[]>([initConfig]);
  // 选择的连接配置
  const [config, setConfig] = useState<Connect>({
    name: '',
    host: '',
    port: 0
  });
  // 用户列表
  const [users, setUsers] = useState<User[]>([]);
  // 频道列表
  const [channels, setChannels] = useState<Channel[]>([initChannel]);
  const [channel, setChannel] = useState<Channel>(channels[0]);
  // 指令列表
  const [commands, setCommands] = useState<any[]>([]);
  // 输入框内容
  const [value, setValue] = useState('');
  // 机器人配置
  const [bot, setBot] = useState<User>(initBot);
  // 你自己
  const [user, setUser] = useState<User>(initUser);
  // 私聊消息
  const [privateMessages, setPrivateMessages] = useState<MessageItem[]>([]);
  // 群聊消息
  const [groupMessages, setGroupMessages] = useState<MessageItem[]>([]);
  // 连接loading
  const [isConnecting, setIsConnecting] = useState(false);
  // 要记录。是切换到了私聊还是群聊。在进行重连到时候
  const [isGroup, setIsGroup] = useState(true);
  // 新增：是否允许重连
  const [allowRestart, setAllowRestart] = useState(true);

  const [isRestart, setIsRestart] = useState(false);
  // 定时任务
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isRestart) {
      // 触发一次重连。
      if (config && config?.host && config?.port) {
        onConnect(config);
        setIsRestart(false);
      }
    }
  }, [isRestart]);

  useEffect(() => {
    /**
     * @param code
     * @param data
     */
    const readFile = (code: number, data: any) => {
      if (code === 1001) {
        // 连接列表
        if (data && isArray(data) && data?.length > 0) {
          setConnectList(data);
        }
      }
    };

    /**
     * 等待信息
     * @param event
     * @returns
     */
    const handleResponse = (event: {
      data: {
        type: string;
        payload: any;
      };
    }) => {
      console.log('Received message:', event.data);
      const message = event.data;
      if (ACTIONS_MAP[message.type]) {
        console.log('status', status);
        // 如果不是连接页。需要判断是否是连接状态
        if (
          message.type !== 'ALemonTestOne.openConnect' &&
          !statusRef.current
        ) {
          Message.info('请先连接服务器');
          return;
        }
        if (message.type === 'ALemonTestOne.openGroup') {
          setIsGroup(true);
        } else if (message.type === 'ALemonTestOne.openPrivate') {
          setIsGroup(false);
        }
        setTag(ACTIONS_MAP[message.type]);
      } else if (message.type === 'fs.readFile') {
        readFile(message.payload.code, message.payload.data);
      }
    };

    // 读取连接配置列表
    const data = getConnectList();
    if (data) {
      setConnectList(data);
    }

    window.addEventListener('message', handleResponse);
    return () => {
      window.removeEventListener('message', handleResponse);
    };
  }, []);

  /**
   *
   * @param data
   */
  const connect = (data: Connect) => {
    window.websocket = new WebSocket(`ws://${data.host}:${data.port}/testone`);
    window.websocket.onopen = () => {
      setIsConnecting(false);
      setStatus(true);
      // 还在 连接页，默认去到群聊页
      if (tag === 'connect') {
        // 默认群聊
        if (isGroup) {
          setTag('group');
        } else {
          setTag('private');
        }
      }
      window.websocket?.send(
        flattedJSON.stringify({
          type: 'init.data'
        })
      );
    };

    const initData = (data: {
      type: string;
      payload: {
        commands?: any[];
        users: User[];
        channels: Channel[];
        bot?: User;
        user?: User;
        privateMessage: MessageItem[];
        publicMessage: MessageItem[];
      };
    }) => {
      const {
        commands,
        users,
        channels,
        user,
        bot,
        privateMessage,
        publicMessage
      } = data.payload;
      setUsers(users);
      setChannels(channels);
      setPrivateMessages(privateMessage);
      setGroupMessages(publicMessage);
      if (commands && isArray(commands)) {
        setCommands(commands);
      }
      if (bot) {
        setBot(bot);
      }
      if (user) {
        setUser(user);
      }
    };

    const action = (data: { action: string; payload: any }) => {
      if (data.action === 'message.send') {
        const event = data.payload.event;
        const message: MessageItem = {
          // 如果判断是群聊还是私聊？
          UserId: bot.UserId,
          UserName: bot.UserName,
          UserAvatar: bot.UserAvatar,
          CreateAt: Date.now(),
          data: data.payload.params.format
        };
        if (/private/.test(event.name)) {
          // 私聊事件
          setPrivateMessages(prev => [...prev, message]);
          // 还要发送到服务端
          window.websocket?.send(
            flattedJSON.stringify({
              type: 'private.message.save',
              payload: message
            })
          );
        } else {
          // 群聊事件
          setGroupMessages(prev => [...prev, message]);
          // 还要发送到服务端
          window.websocket?.send(
            flattedJSON.stringify({
              type: 'public.message.save',
              payload: message
            })
          );
        }
      } else if (data.action === 'mention.get') {
        // 获取消息里的提及
        const event = data.payload.event;
        //
      } else if (data.action === 'message.delete') {
        // 删除指定的消息
      }
    };

    /**
     * 监听消息
     * @param event
     */
    window.websocket.onmessage = (e: MessageEvent) => {
      const data = flattedJSON.parse(e.data.toString());
      console.log('data', data);
      if (data.type === 'init.data') {
        initData(data);
      } else if (data.type === 'users') {
        if (Array.isArray(data.payload)) {
          if (data.payload.length > 0) {
            setUsers(data.payload);
          }
        }
      } else if (data.type === 'channels') {
        if (Array.isArray(data.payload)) {
          if (data.payload.length > 0) {
            setChannels(data.payload);
          }
        }
      } else if (data.type === 'commands') {
        setCommands(data.payload);
      } else if (data.apiId) {
        // api 调用
      } else if (data.action) {
        action(data);
      }
    };
    window.websocket.onerror = () => {
      setStatus(false);
    };
    window.websocket.onclose = () => {
      setStatus(false);
      setTag('connect');
      if (!allowRestart) {
        // 如果不允许重连。就不进行重连
        return;
      }
      timerRef.current = setTimeout(() => {
        setIsRestart(true);
      }, 3000);
    };
  };

  /**
   *
   * @param data
   * @returns
   */
  const onConnect = (data: Connect) => {
    if (!data || !data?.host || !data?.port) {
      Message.info('连接信息不完整');
      return;
    }
    if (status) {
      // 断开连接
      window.websocket?.close();
    }
    setAllowRestart(true);
    setIsConnecting(true);
    setConfig(data);
    connect(data);
  };

  const onSendPublic = (message: string) => {
    if (window.websocket && window.websocket.readyState === WebSocket.OPEN) {
      const UserKey = useUserHashKey({
        Platform: Platform,
        UserId: user.UserId
      });
      const data = {
        name: 'message.create',
        ChannelId: channel.ChannelId,
        GuildId: channel.ChannelId,
        UserId: user.UserId,
        OpenId: user.OpenId,
        UserName: user.UserName,
        UserKey: UserKey,
        IsMaster: false,
        UserAvatar: user.UserAvatar,
        Platform: Platform,
        MessageText: message,
        CreateAt: Date.now()
      } as PublicEventMessageCreate;
      const messageItem: MessageItem = {
        UserId: data?.UserId || '',
        UserName: data?.UserName || '',
        UserAvatar: data?.UserAvatar || '',
        CreateAt: data?.CreateAt || Date.now(),
        data: [
          {
            type: 'Text',
            value: message
          }
        ]
      };
      setGroupMessages(prev => [...prev, messageItem]);
      window.websocket.send(flattedJSON.stringify(data));
      // 还要发送到服务端
      window.websocket.send(
        flattedJSON.stringify({
          type: 'public.message.save',
          payload: messageItem
        })
      );
    }
  };

  const onSendPrivate = (message: string) => {
    if (window.websocket && window.websocket.readyState === WebSocket.OPEN) {
      const UserKey = useUserHashKey({
        Platform: Platform,
        UserId: user.UserId
      });
      const data = {
        name: 'private.message.create',
        UserId: user.UserId,
        UserKey: UserKey,
        OpenId: user.OpenId,
        UserName: user.UserName,
        UserAvatar: user.UserAvatar,
        IsMaster: false,
        Platform: Platform,
        CreateAt: Date.now(),
        MessageText: message
      } as PrivateEventMessageCreate;
      // 增加消息
      const messageItem: MessageItem = {
        UserId: data?.UserId || '',
        UserName: data?.UserName || '',
        UserAvatar: data?.UserAvatar || '',
        CreateAt: data?.CreateAt || Date.now(),
        data: [
          {
            type: 'Text',
            value: message
          }
        ]
      };
      setPrivateMessages(prev => [...prev, messageItem]);
      // 发送消息
      window.websocket.send(flattedJSON.stringify(data));
      // 还要发送到服务端
      window.websocket.send(
        flattedJSON.stringify({
          type: 'private.message.save',
          payload: messageItem
        })
      );
    }
  };

  const onDeletePrivate = (item: MessageItem) => {
    // 删除私聊消息
    setPrivateMessages(prev =>
      prev.filter(
        i => !(i.CreateAt === item.CreateAt && i.UserId === item.UserId)
      )
    );
    // 还要告诉服务端删除
    if (window.websocket && window.websocket.readyState === WebSocket.OPEN) {
      const data = {
        type: 'private.message.delete',
        payload: {
          CreateAt: item.CreateAt
        }
      };
      window.websocket.send(flattedJSON.stringify(data));
    }
  };

  const onDeleteGroup = (item: MessageItem) => {
    // 删除群聊消息
    setGroupMessages(prev =>
      prev.filter(
        i => !(i.CreateAt === item.CreateAt && i.UserId === item.UserId)
      )
    );
    // 还要告诉服务端删除
    if (window.websocket && window.websocket.readyState === WebSocket.OPEN) {
      const data = {
        type: 'public.message.delete',
        payload: {
          CreateAt: item.CreateAt
        }
      };
      window.websocket.send(flattedJSON.stringify(data));
    }
  };

  const renderMap = {
    connect: (
      <ConnectList
        connecting={isConnecting}
        value={connectList}
        onOk={onConnect}
        onCancel={() => {
          setIsConnecting(false);
          setTag('connect');
          clearTimeout(timerRef.current!);
          setAllowRestart(false);
        }}
        onAdd={data => setConnectList([...connectList, data])}
        onDel={data => {
          const newList = connectList.filter(item => item.name !== data.name);
          setConnectList(newList);
        }}
      />
    ),
    group: (
      <GroupApp
        value={value}
        onInput={setValue}
        message={groupMessages}
        channels={channels}
        channel={channel}
        onSelect={setChannel}
        users={users}
        onSend={onSendPublic}
        onDelete={onDeleteGroup}
        user={user}
      />
    ),
    private: (
      <PrivateApp
        value={value}
        onInput={setValue}
        message={privateMessages}
        bot={bot}
        onSend={onSendPrivate}
        onDelete={onDeletePrivate}
        user={user}
      />
    )
  };
  return (
    <div className="overflow-hidden flex flex-1 flex-col bg-[var(--vscode-sideBar-background)] ">
      {renderMap[tag]}
      {tag !== 'connect' && (
        <footer className="flex flex-row justify-between items-center px-4 select-none ">
          [{config.host}][{config.port}][{status ? 'connet' : 'close'}]
        </footer>
      )}
    </div>
  );
}
