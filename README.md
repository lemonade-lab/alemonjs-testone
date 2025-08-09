# ALemonTestOne

阿柠檬框架沙盒测试平台

版本要求： alemonjs >= 2.1

预览: https://lemonade-lab.github.io/alemonjs-testone/

## 自定义配置

新建 testone目录，并新建以下文件

- commands.json

```ts
export type Command = {
  title: string;
  description: string;
  text: string;
  autoEnter?: boolean;
  data?: DataEnums[];
};
export type Commands = Command[];
```

- user.json / bot.json

```ts
export type User = {
  UserId: string;
  UserName: string;
  UserAvatar: string;
  OpenId?: string;
  IsMaster: boolean;
  IsBot: boolean;
};
```

- users.json

```ts
export const Users: User[] = [];
```

- channels.json

```ts
export type Channel = {
  GuildId: string;
  ChannelId: string;
  ChannelAvatar: string;
  ChannelName: string;
};
export type Channels = Channel[];
```
