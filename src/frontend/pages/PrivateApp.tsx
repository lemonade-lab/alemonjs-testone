import { Command, MessageItem, User } from '@/frontend/typing';
import MessageWondow from '@/frontend/component/MessageWindow';
import Textarea from '@/frontend/component/Textarea';
import MessageHeader from '@/frontend/component/MessageHeader';
import CommandList from '../component/CommandList';
import { useState } from 'react';
import { DataEnums } from 'alemonjs';

export default function PrivateApp({
  message,
  onSend,
  onSendFormat,
  onDelete,
  bot,
  user,
  commands
}: {
  message: MessageItem[];
  onSend: (message: string) => void;
  onDelete: (message: MessageItem) => void;
  onSendFormat: (format: DataEnums[]) => void;
  bot: User;
  user: User;
  commands: Command[];
}) {
  // 输入框内容
  const [value, onInput] = useState('');
  const [showCommands, setShowCommands] = useState<boolean>(false);
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
  };
  return (
    <section className="flex-1 flex flex-col  overflow-auto ">
      <MessageHeader
        value={{
          Avatar: bot.UserAvatar || '',
          Id: bot.UserId,
          Name: bot.UserName || ''
        }}
      />
      <div className="flex-1 flex overflow-auto">
        <MessageWondow
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
          userList={[]}
          onAppClick={action => {
            if (action === 'commands') {
              setShowCommands(!showCommands);
            }
          }}
        />
      </div>
    </section>
  );
}
