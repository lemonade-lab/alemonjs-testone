import { memo } from 'react';
import MessageBubble from '@/frontend/component/MessageBubble';
import { MessageItem } from '@/frontend/typing';
import classNames from 'classnames';

type MessageRowProps = {
  item: MessageItem;
  isOwnMessage: boolean;
  onDelete: (item: MessageItem) => void;
  onSend: (value: string) => void;
  onInput: (value: string) => void;
};

// 单个消息行组件
const MessageRow = memo(
  ({ item, isOwnMessage, onDelete, onSend, onInput }: MessageRowProps) => {
    console.log('MessageRow 渲染，消息创建时间:', item.CreateAt);
    return (
      <div
        className={classNames('flex gap-1', {
          'ml-auto flex-row-reverse': isOwnMessage,
          'mr-auto': !isOwnMessage
        })}
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
        <div className="flex justify-end items-end">
          <div
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              onDelete(item);
            }}
            className="select-none cursor-pointer hover:bg-red-100 rounded px-1 transition-colors"
          >
            <span className="text-red-800 text-sm">del</span>
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

export default MessageRow;
