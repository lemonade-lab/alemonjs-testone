import { useEffect, useRef } from 'react';
import MessageBubble from '@/frontend/component/MessageBubble';
import { MessageItem } from '../typing';

export default function MessageWondow({
  message,
  onDelete,
  onSend = () => {},
  onInput = () => {},
  UserId
}: {
  message: MessageItem[];
  onDelete: (item: MessageItem) => void;
  onSend: (value: string) => void;
  onInput: (value: string) => void;
  UserId: string;
}) {
  const MessageWindowRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (MessageWindowRef.current) {
      MessageWindowRef.current.scrollTo(
        0,
        MessageWindowRef.current.scrollHeight
      );
    }
  }, [message]);

  return (
    <section
      ref={MessageWindowRef}
      className="flex-1 flex flex-col overflow-auto"
    >
      <section className="flex-1 px-3 py-2 flex gap-4 flex-col ">
        {message.map((item, index) => (
          <div
            key={index}
            className={`flex gap-2 ${
              UserId === item.UserId ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            <img
              className="size-12 rounded-full"
              src={item.UserAvatar}
              alt="Avatar"
            />
            <MessageBubble
              data={item.data}
              onSend={onSend}
              onInput={onInput}
              createAt={item.CreateAt}
            />
            <div
              onClick={() => onDelete(item)}
              className="select-none cursor-pointer flex justify-end items-end"
            >
              del
            </div>
          </div>
        ))}
      </section>
    </section>
  );
}
