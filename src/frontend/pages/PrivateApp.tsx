import { Command, MessageItem, User } from '@/frontend/typing';
import MessageWondow from '@/frontend/component/MessageWindow';
import Textarea from '@/frontend/component/Textarea';
import MessageHeader from '@/frontend/component/MessageHeader';
import CommandList from '../component/CommandList';
import { useState } from 'react';

export default function PrivateApp({
  value,
  onInput,
  message,
  onSend,
  onDelete,
  bot,
  user,
  commands
}: {
  value: string;
  onInput: (val: string) => void;
  message: MessageItem[];
  onSend: (message: string) => void;
  onDelete: (message: MessageItem) => void;
  bot: User;
  user: User;
  commands: Command[];
}) {
  const [showCommands, setShowCommands] = useState<boolean>(false);
  const handleCommandSelect = (command: Command) => {
    onInput(command.text);
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
