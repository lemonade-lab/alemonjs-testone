import { PageTag } from './typing';

// 页面类型映射
export const ACTIONS_MAP: {
  [key: string]: PageTag;
} = {
  'ALemonTestOne.openGroup': 'group',
  'ALemonTestOne.openPrivate': 'private',
  'ALemonTestOne.openConnect': 'connect'
};

// 默认连接配置
export const initConfig = {
  name: '默认连接',
  host: '127.0.0.1',
  port: 17117
};

// 默认机器人账号
export const initBot = {
  id: 0,
  UserId: '794161769',
  UserAvatar: 'https://q.qlogo.cn/headimg_dl?dst_uin=794161769&spec=100',
  UserName: '阿柠檬',
  OpenId: '794161769',
  IsBot: true
};

// 默认用户账号
export const initUser = {
  id: 1,
  UserId: '1715713638',
  UserAvatar: 'https://q.qlogo.cn/headimg_dl?dst_uin=1715713638&spec=100',
  UserName: '我自己',
  OpenId: '1715713638',
  IsBot: false
};

export const initChannel = {
  id: 1,
  GuildId: '1012967625',
  ChannelId: '1012967625',
  ChannelName: '机器人交流群',
  ChannelAvatar: 'https://alemonjs.com/img/alemon.png'
};

export const initCommand = {
  title: '指令示例',
  description: '这是一个指令示例',
  text: '/example'
};
