import { useEffect, useState } from 'react';
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

/**
 *
 * @returns
 */
export default function App() {
  // 页面
  const [tag, setTag] = useState<PageTag>('connect');
  // 连接状态
  const [status, setStatus] = useState<boolean>(false);
  // 连接列表
  const [connectList, setConnectList] = useState<Connect[]>([initConfig]);
  // 选择的连接配置
  const [config, setConfig] = useState({
    host: '',
    port: 0
  });
  // 用户列表
  const [users, setUsers] = useState<User[]>([]);
  // 频道列表
  const [channels, setChannels] = useState<Channel[]>([initChannel]);
  // 指令列表
  const [commands, setCommands] = useState<DataEnums[]>([]);
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
      const message = event.data;
      if (ACTIONS_MAP[message.type]) {
        // 如果不是连接页。需要判断是否是连接状态
        if (message.type !== 'ALemonTestOne.openConnect' && !status) {
          Message.info('请先连接服务器');
          return;
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
      window.websocket?.send(
        flattedJSON.stringify({
          type: 'init.data'
        })
      );
    };
    /**
     * 监听消息
     * @param event
     */
    window.websocket.onmessage = (e: MessageEvent) => {
      const data = flattedJSON.parse(e.data.toString());
      if (data.type === 'init.data') {
        const { users, channels, bot, user } = data.payload;
        const { privateMessages, groupMessages } = data.payload;
        setUsers(users);
        setChannels(channels);
        setPrivateMessages(privateMessages);
        setGroupMessages(groupMessages);
        if (bot) {
          setBot(bot);
        }
        if (user) {
          setUser(user);
        }
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
      } else if (data.type === 'private.message') {
        setPrivateMessages(prev => [...prev, data.payload]);
      } else if (data.type === 'group.message') {
        setGroupMessages(prev => [...prev, data.payload]);
      } else if (data.apiId) {
        // api 调用
      } else if (data.action) {
        if (data.action === 'message.send') {
          const event = data.payload.event;
          const message: MessageItem = {
            // 如果判断是群聊还是私聊？
            IsBot: true,
            UserId: bot.UserId,
            UserName: bot.UserName,
            UserAvatar: bot.UserAvatar,
            createAt: Date.now(),
            data: data.payload
          };
          if (/private/.test(event.name)) {
            // 私聊事件
            setPrivateMessages(prev => [...prev, message]);
          } else {
            // 群聊事件
            setGroupMessages(prev => [...prev, message]);
          }
        } else if (data.action === 'mention.get') {
          // 获取消息里的提及
          const event = data.payload.event;
          //
        } else if (data.action === 'message.delete') {
          // 删除指定的消息
        }
      }
    };
    window.websocket.onerror = () => {
      setStatus(false);
      setIsConnecting(false);
    };
    window.websocket.onclose = () => {
      setStatus(false);
      setIsConnecting(false);
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
    setIsConnecting(true);
    setConfig(data);
    connect(data);
  };

  const onSendPublic = (message: string) => {
    if (window.websocket && window.websocket.readyState === WebSocket.OPEN) {
      window.websocket.send(
        flattedJSON.stringify({
          name: 'message.create',
          MessageText: message
        } as PublicEventMessageCreate)
      );
    }
  };

  const onSendPrivate = (message: string) => {
    if (window.websocket && window.websocket.readyState === WebSocket.OPEN) {
      window.websocket.send(
        flattedJSON.stringify({
          name: 'private.message.create',
          MessageText: message
        } as PrivateEventMessageCreate)
      );
    }
  };

  const onDelete = () => {
    if (window.websocket && window?.websocket?.readyState === WebSocket.OPEN) {
      //
    }
  };

  const renderMap = {
    connect: (
      <ConnectList
        connecting={isConnecting}
        value={connectList}
        onOk={onConnect}
        onAdd={data => setConnectList([...connectList, data])}
        onDel={data => {
          const newList = connectList.filter(item => item.name !== data.name);
          setConnectList(newList);
        }}
      />
    ),
    private: (
      <PrivateApp
        value={value}
        onInput={setValue}
        message={privateMessages}
        channels={channels}
        users={users}
        user={user}
        bot={bot}
        onSend={onSendPrivate}
        onDelete={onDelete}
      />
    ),
    group: (
      <GroupApp
        value={value}
        onInput={setValue}
        message={groupMessages}
        channels={channels}
        users={users}
        user={user}
        bot={bot}
        onSend={onSendPublic}
        onDelete={onDelete}
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
