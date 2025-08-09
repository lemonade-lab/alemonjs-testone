import { memo, useEffect, useRef } from 'react';
import { MessageItem } from '@/frontend/typing';
import MessageRow from './MessageRow';

// 定义类型
type MessageWindowProps = {
  message: MessageItem[];
  onDelete: (item: MessageItem) => void;
  onSend: (value: string) => void;
  onInput: (value: string) => void;
  UserId: string;
};

// 主消息窗口组件
function MessageWindow({
  message,
  onDelete,
  onSend = () => {},
  onInput = () => {},
  UserId
}: MessageWindowProps) {
  const MessageWindowRef = useRef<HTMLElement>(null);

  // 监听消息数量变化，自动滚动到底部
  const messageLength = message.length;

  const prevLenRef = useRef(messageLength);

  useEffect(() => {
    console.log('消息数量变化:', prevLenRef.current, '->', messageLength);
    if (prevLenRef.current > messageLength) {
      // 减少消息，不进行滚动。
      prevLenRef.current = messageLength;
      return;
    }
    prevLenRef.current = messageLength;

    if (MessageWindowRef.current) {
      const element = MessageWindowRef.current;
      // 使用 setTimeout 确保 DOM 更新后再滚动
      setTimeout(() => {
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth' // 平滑滚动
        });
      }, 50);
    }
  }, [messageLength]);

  const handleDelete = (item: MessageItem) => {
    console.log('删除消息:', item.CreateAt);
    onDelete(item);
  };

  const handleSend = (value: string) => {
    console.log('发送消息:', value);
    onSend(value);
  };

  const handleInput = (value: string) => {
    onInput(value);
  };

  // 如果没有消息，显示提示
  if (message.length === 0) {
    return (
      <section className="flex-1 flex flex-col overflow-y-auto scrollbar">
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>暂无消息，开始聊天吧！</p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={MessageWindowRef}
      className="flex-1 flex flex-col overflow-y-auto scrollbar"
    >
      <section className="flex-1 px-3 py-2 flex gap-4 flex-col">
        {message.map(item => (
          <MessageRow
            key={item.CreateAt} // 确保使用唯一的 key
            item={item}
            isOwnMessage={UserId === item.UserId}
            onDelete={handleDelete}
            onSend={handleSend}
            onInput={handleInput}
          />
        ))}
      </section>
    </section>
  );
}

export default memo(MessageWindow);
