import { PageTag } from '@/frontend/typing';

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
  UserId: '794161769',
  UserAvatar: 'https://q.qlogo.cn/headimg_dl?dst_uin=794161769&spec=100',
  UserName: '阿柠檬',
  OpenId: '794161769',
  IsMaster: false,
  IsBot: true
};

// 默认用户账号
export const initUser = {
  UserId: '1715713638',
  UserAvatar: 'https://q.qlogo.cn/headimg_dl?dst_uin=1715713638&spec=100',
  UserName: '柠檬冲水',
  OpenId: '1715713638',
  IsMaster: true,
  IsBot: false
};

export const initChannel = {
  GuildId: '806943302',
  ChannelId: '806943302',
  ChannelName: '文游社',
  ChannelAvatar: 'https://p.qlogo.cn/gh/806943302/806943302/'
};

export const initCommand = {
  title: '帮助',
  description: '获取帮助信息',
  text: '/帮助'
};
