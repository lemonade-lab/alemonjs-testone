import { DataEnums } from 'alemonjs';

export type Channel = {
  GuildId: string;
  ChannelId: string;
  ChannelAvatar: string;
  ChannelName: string;
};

export type Connect = {
  host: string;
  port: number;
  name: string;
};

export type User = {
  UserId: string;
  UserName: string;
  UserAvatar: string;
  OpenId?: string; // 可选属性
  IsBot: boolean;
};

export type PageTag = 'connect' | 'group' | 'private';

export type MessageItem = {
  UserId: string;
  UserName: string;
  UserAvatar: string;
  CreateAt: number;
  data: DataEnums[];
};

export type Command = {
  title: string;
  description: string;
  text: string;
};
