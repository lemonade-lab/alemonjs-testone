import { Channel, Command, MessageItem, User } from '@/frontend/typing';
import MessageWindow from '@/frontend/component/MessageWindow';
import Textarea from '@/frontend/component/Textarea';
import MessageHeader from '@/frontend/component/MessageHeader';
import { useState } from 'react';
import CommandList from '../component/CommandList';
import { DataEnums } from 'alemonjs';

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
  onSend,
  onSendFormat,
  message,
  onDelete,
  onSelect,
  channels,
  channel,
  user,
  users,
  commands
}: {
  message: MessageItem[];
  onSend: (message: string) => void;
  onSendFormat: (format: DataEnums[]) => void;
  onDelete: (item: MessageItem) => void;
  onSelect: (channel: Channel) => void;
  channels: Channel[];
  channel: Channel;
  user: User;
  users: User[];
  commands: Command[];
}) {
  console.log('GroupApp render');

  // 输入框内容
  const [value, onInput] = useState('');

  const [showCommands, setShowCommands] = useState(false);

  const handleCommandSelect = (command: Command) => {
    if (typeof command.autoEnter === 'boolean' && !command.autoEnter) {
      // 不自动发送。
      if (!command.data) {
        onInput(command.text);
        return;
      }
      onSendFormat(command.data);
      return;
    }
    // 自动发送
    if (!command.data) {
      onSend(command.text);
      return;
    }
    onSendFormat(command.data);
    return;
  };

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
        <MessageWindow
          message={message}
          onDelete={onDelete}
          onSend={onSend}
          onInput={onInput}
          UserId={user.UserId}
        />
      </div>
      <div className="relative">
        <CommandList
          commands={commands}
          onCommandSelect={handleCommandSelect}
          isVisible={showCommands}
          onClose={() => setShowCommands(false)}
        />
        <Textarea
          value={value}
          onContentChange={onInput}
          onClickSend={() => onSend(value)}
          onAppClick={action => {
            if (action === 'commands') {
              setShowCommands(!showCommands);
            }
          }}
          userList={[
            {
              UserId: 'everyone',
              UserName: '全体成员',
              UserAvatar: '',
              IsMaster: false,
              IsBot: false
            },
            ...users
          ]}
        />
      </div>
    </section>
  );
}
