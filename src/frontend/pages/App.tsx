import { useEffect, useState } from 'react';
import { initChannel, initConfig } from '../core';
import GroupApp from './GroupApp';
import PrivateApp from './PrivateApp';
import { Channel, Connect } from '../typing';
import { isArray } from 'lodash-es';
import ConnectList from './ConnectList';
import { getConnectList } from '../core/connect';
import { Message } from '../core/message';
import { DataEnums, User } from 'alemonjs';

type PageTag = 'connect' | 'group' | 'private';

const ACTIONS_MAP: {
  [key: string]: PageTag;
} = {
  'ALemonTestOne.openGroup': 'group',
  'ALemonTestOne.openPrivate': 'private',
  'ALemonTestOne.openConnect': 'connect'
};

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
  // 输入框内容
  const [value, setValue] = useState('');
  // 机器人配置
  const [bot, setBot] = useState<User>();
  // 你自己
  const [user, setUser] = useState<User>();
  // 私聊消息
  const [privateMessages, setPrivateMessages] = useState<DataEnums[]>([]);
  // 群聊消息
  const [groupMessages, setGroupMessages] = useState<DataEnums[]>([]);

  useEffect(() => {
    const readFile = (code: number, data: any) => {
      if (code === 1001) {
        // 连接列表
        if (data && isArray(data) && data?.length > 0) {
          setConnectList(data);
        }
      }
    };

    // 等待信息
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

  const connect = (data: Connect) => {
    window.websocket = new WebSocket(`ws://${data.host}:${data.port}`);
    window.websocket.onopen = () => {
      setStatus(true);
    };
    window.websocket.onmessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.type === 'connect') {
        // 连接成功
        setStatus(true);
        setConfig(data);
      } else if (message.type === 'users') {
        // 用户列表
        setUsers(message.payload.users || []);
      } else if (message.type === 'channels') {
        // 频道列表
        setChannels(message.payload.channels || []);
      }
    };
    window.websocket.onerror = (error: Event) => {
      setStatus(false);
      console.error('WebSocket error:', error);
    };
    window.websocket.onclose = () => {
      setStatus(false);
    };
  };

  const onConnect = (data: Connect) => {
    if (!data || !data?.host || !data?.port) {
      Message.info('连接信息不完整');
      return;
    }
    if (status) {
      // 断开连接
      window.websocket?.close();
    }
    setConfig(data);
    connect(data);
  };

  const renderMap = {
    connect: (
      <ConnectList
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
        bot={bot}
        onSend={() => {}}
        onDelete={() => {}}
      />
    ),
    group: (
      <GroupApp
        value={value}
        onInput={setValue}
        message={groupMessages}
        channels={channels}
        users={users}
        onSend={() => {}}
        onDelete={() => {}}
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
