import { DataEnums } from 'alemonjs';

export type Channel = {
  GuildId: string;
  ChannelId: string;
  ChannelAvatar: string;
  ChannelName: string;
};

export type Channels = Channel[];

export type Connect = {
  host: string;
  port: number;
  name: string;
};

export type User = {
  UserId: string;
  UserName: string;
  UserAvatar: string;
  OpenId?: string;
  IsMaster: boolean;
  IsBot: boolean;
};

export const Users: User[] = [];

export type PageTab = 'connect' | 'group' | 'private';

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
  autoEnter?: boolean;
  data?: DataEnums[];
};
export type Commands = Command[];
