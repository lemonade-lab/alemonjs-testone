import { memo, useCallback, useEffect, useRef } from 'react';
import MessageBubble from '@/frontend/component/MessageBubble';
import { MessageItem } from '../typing';

// 定义类型
type MessageWindowProps = {
  message: MessageItem[];
  onDelete: (item: MessageItem) => void;
  onSend: (value: string) => void;
  onInput: (value: string) => void;
  UserId: string;
};

type MessageRowProps = {
  item: MessageItem;
  isOwnMessage: boolean;
  onDelete: (item: MessageItem) => void;
  onSend: (value: string) => void;
  onInput: (value: string) => void;
};

// 单个消息行组件
const MessageRow = memo<MessageRowProps>(
  ({ item, isOwnMessage, onDelete, onSend, onInput }) => {
    console.log('MessageRow 渲染，消息创建时间:', item.CreateAt);
    return (
      <div
        className={`flex gap-2 ${
          isOwnMessage ? 'ml-auto flex-row-reverse' : 'mr-auto'
        }`}
      >
        {/* 用户头像 */}
        {item.UserAvatar ? (
          <img
            className="size-12 rounded-full"
            src={item.UserAvatar}
            alt="用户头像"
          />
        ) : (
          <div className="size-12 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 text-sm">用户</span>
          </div>
        )}

        {/* 消息气泡 */}
        <MessageBubble
          data={item.data}
          onSend={onSend}
          onInput={onInput}
          createAt={item.CreateAt}
        />

        {/* 删除按钮 */}
        <div>
          <div
            onClick={() => onDelete(item)}
            className="select-none cursor-pointer flex justify-end items-end hover:bg-red-100 rounded px-2 py-1 transition-colors"
            title="删除消息"
          >
            <span className="text-red-500 text-sm">删除</span>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // 仅当消息创建时间不同才重新渲染
    const isSame = prevProps.item.CreateAt === nextProps.item.CreateAt;
    return isSame;
  }
);

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
  useEffect(() => {
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

  // 缓存回调函数，避免子组件不必要的重新渲染
  const handleDelete = useCallback(
    (item: MessageItem) => {
      console.log('删除消息:', item.CreateAt);
      onDelete(item);
    },
    [onDelete]
  );

  const handleSend = useCallback(
    (value: string) => {
      console.log('发送消息:', value);
      onSend(value);
    },
    [onSend]
  );

  const handleInput = useCallback(
    (value: string) => {
      onInput(value);
    },
    [onInput]
  );

  // 如果没有消息，显示提示
  if (message.length === 0) {
    return (
      <section className="flex-1 flex flex-col overflow-auto">
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>暂无消息，开始聊天吧！</p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={MessageWindowRef}
      className="flex-1 flex flex-col overflow-auto"
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
