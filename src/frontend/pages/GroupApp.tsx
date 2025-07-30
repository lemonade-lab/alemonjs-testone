import { useState } from 'react';
import { Channel } from '@/frontend/typing';
import MessageWondow from '@/frontend/component/MessageWindow';
import Textarea from '@/frontend/component/Textarea';
import MessageHeader from '@/frontend/component/MessageHeader';
import { User, type DataEnums } from 'alemonjs';

export default function GroupApp({
  value,
  onInput,
  onSend,
  message,
  onDelete,
  channels,
  users
}: {
  value: string;
  onInput: (val: string) => void;
  message: DataEnums[];
  onSend: (message: string) => void;
  onDelete: (item: DataEnums) => void;
  channels: Channel[];
  users: User[];
}) {
  const [channel, setChannel] = useState<Channel>(channels[0]);
  return (
    <section className="flex-1 flex flex-col  overflow-auto ">
      <MessageHeader
        value={{
          Avatar: channel.ChannelAvatar || '',
          Id: channel.ChannelId,
          Name: channel.ChannelName || '群聊'
        }}
      >
        <div className="px-4  flex flex-row items-center  ">
          <select
            onChange={e => {
              const index = e.target.selectedIndex;
              setChannel(channels[index]);
            }}
            className="px-2 py-1 rounded-md bg-[var(--vscode-input-background)] hover:bg-[var(--vscode-activityBar-background)] text-[var(--vscode-input-foreground)]"
          >
            {channels.map((item, index) => {
              return (
                <option key={index} value={item.ChannelId}>
                  {item.ChannelId}
                </option>
              );
            })}
          </select>
        </div>
      </MessageHeader>
      {
        // 消息窗口
      }
      <div className="flex-1 flex overflow-auto">
        <MessageWondow
          message={message}
          onDelete={onDelete}
          onSend={onSend}
          onInput={onInput}
        />
      </div>
      {
        // 输入窗口
      }
      <Textarea
        value={value}
        onContentChange={onInput}
        onClickSend={() => onSend(value)}
        userList={[
          {
            UserId: 'everyone',
            UserName: '全体成员',
            UserAvatar: '',
            OpenId: 'everyone',
            IsBot: false
          },
          ...users
        ]}
      />
    </section>
  );
}
