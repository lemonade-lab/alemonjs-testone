import { Channel, MessageItem, User } from '@/frontend/typing';
import MessageWondow from '@/frontend/component/MessageWindow';
import Textarea from '@/frontend/component/Textarea';
import MessageHeader from '@/frontend/component/MessageHeader';

export default function PrivateApp({
  value,
  onInput,
  message,
  onSend,
  onDelete,
  channels,
  users,
  user,
  bot
}: {
  value: string;
  onInput: (val: string) => void;
  message: MessageItem[];
  onSend: (message: string) => void;
  onDelete: (message: MessageItem) => void;
  channels: Channel[];
  users: User[];
  user: User;
  bot: User;
}) {
  return (
    <section className="flex-1 flex flex-col  overflow-auto ">
      {
        // 消息头部
      }
      <MessageHeader
        value={{
          Avatar: bot.UserAvatar || '',
          Id: bot.UserId,
          Name: bot.UserName || ''
        }}
      />
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
        userList={[]}
      />
    </section>
  );
}
