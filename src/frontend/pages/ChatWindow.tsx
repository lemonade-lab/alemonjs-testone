import { Channel, Command, MessageItem, User } from '@/frontend/typing';
import MessageWindow from '@/frontend/component/MessageWindow';
import Textarea from '@/frontend/component/Textarea';
import MessageHeader from '@/frontend/component/MessageHeader';
import { useState } from 'react';
import CommandList, { CommandItem } from '@/frontend/component/CommandList';
import { DataEnums } from 'alemonjs';
import ChannelSelect from '@/frontend/pages/common/ChannelSelect';
import ChannelItem from './common/ChannelItem';

export default function ChatWindow({
  onSend,
  onSendFormat,
  message,
  onDelete,
  onSelect,
  channels,
  channel,
  user,
  users,
  commands,
  bot,
  pageType = 'public'
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
  bot: User;
  pageType: 'public' | 'private';
}) {
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

  const headerMessage =
    pageType === 'public'
      ? {
          Avatar: channel.ChannelAvatar || '',
          Id: channel.ChannelId,
          Name: channel.ChannelName
        }
      : {
          Avatar: bot.UserAvatar || '',
          Id: bot.UserId,
          Name: bot.UserName
        };

  const userList =
    pageType === 'public'
      ? [
          {
            UserId: 'everyone',
            UserName: '全体成员',
            UserAvatar: '',
            IsMaster: false,
            IsBot: false
          },
          ...users
        ]
      : [];

  return (
    <div className="flex-1 flex flex-row overflow-y-auto scrollbar">
      {pageType === 'public' && (
        <section className="w-48 hidden lg:flex flex-col overflow-y-auto scrollbar bg-[var(--editorWidget-background)] border-r border-[--panel-border]">
          {channels.map((channel, index) => (
            <ChannelItem key={index} channel={channel} onSelect={onSelect} />
          ))}
        </section>
      )}
      <section className="flex-1 flex flex-col overflow-y-auto scrollbar">
        <MessageHeader value={headerMessage}>
          {pageType === 'public' && (
            <ChannelSelect channels={channels} onSelect={onSelect} />
          )}
        </MessageHeader>
        <MessageWindow
          message={message}
          onDelete={onDelete}
          onSend={onSend}
          onInput={onInput}
          UserId={user.UserId}
        />
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
            userList={userList}
          />
        </div>
      </section>
      <section className="w-48 hidden md:flex flex-col overflow-y-auto scrollbar bg-[var(--editorWidget-background)] border-l border-[--panel-border]">
        {commands.map((command, index) => (
          <CommandItem
            key={index}
            command={command}
            onCommandSelect={handleCommandSelect}
          />
        ))}
      </section>
    </div>
  );
}
