import { Channel, MessageItem, User } from '@/frontend/typing';
import MessageWondow from '@/frontend/component/MessageWindow';
import Textarea from '@/frontend/component/Textarea';
import MessageHeader from '@/frontend/component/MessageHeader';

const ChannelSelect = ({
  channels,
  onSelect
}: {
  channels: Channel[];
  onSelect: (channel: Channel) => void;
}) => {
  return (
    <div className="px-4  flex flex-row items-center  ">
      <select
        onChange={e => {
          const selectedChannel = channels.find(
            item => item.ChannelId === e.target.value
          );
          if (selectedChannel) {
            onSelect(selectedChannel);
          }
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
  );
};

export default function GroupApp({
  value,
  onInput,
  onSend,
  message,
  onDelete,
  onSelect,
  channels,
  channel,
  user,
  users
}: {
  value: string;
  onInput: (val: string) => void;
  message: MessageItem[];
  onSend: (message: string) => void;
  onDelete: (item: MessageItem) => void;
  onSelect: (channel: Channel) => void;
  channels: Channel[];
  channel: Channel;
  user: User;
  users: User[];
}) {
  return (
    <section className="flex-1 flex flex-col  overflow-auto ">
      <MessageHeader
        value={{
          Avatar: channel.ChannelAvatar || '',
          Id: channel.ChannelId,
          Name: channel.ChannelName || '群聊'
        }}
      >
        <ChannelSelect channels={channels} onSelect={onSelect} />
      </MessageHeader>
      <div className="flex-1 flex overflow-auto">
        <MessageWondow
          message={message}
          onDelete={onDelete}
          onSend={onSend}
          onInput={onInput}
          UserId={user.UserId}
        />
      </div>
      <Textarea
        value={value}
        onContentChange={onInput}
        onClickSend={() => onSend(value)}
        userList={[
          {
            UserId: 'everyone',
            UserName: '全体成员',
            UserAvatar: '',
            IsBot: false
          },
          ...users
        ]}
      />
    </section>
  );
}
