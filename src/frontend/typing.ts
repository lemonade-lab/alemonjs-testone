export type Config = {
  // bot
  BotId: string;
  BotName: string;
  BotAvatar: string;
  // guild
  GuildId: string;
  ChannelId: string;
  ChannelName: string;
  ChannelAvatar: string;
};

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
