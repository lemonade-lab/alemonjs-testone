import { useCallback, useEffect, useRef, useState } from 'react';
import { SendIcon } from '@/frontend/ui/Icons';
import { User } from '@/frontend/typing';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
import { getCaretCoordinates } from '@/frontend/component/caretCoordin';

import ClearOutlined from '@ant-design/icons/ClearOutlined';

interface TextareaProps extends React.HTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onContentChange?: (content: string) => void;
  onClickSend: () => void;
  userList?: User[];
  onAppClick?: (action: 'commands' | 'clear') => void;
}

export default function Textarea({
  value,
  onContentChange,
  onClickSend,
  userList,
  onAppClick,
  ...props
}: TextareaProps) {
  const [showUserList, setShowUserList] = useState<boolean>(false);
  const [textareaValue, setTextareaValue] = useState<string>(value || '');
  const [caretPos, setCaretPos] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0
  });
  const [userListHeight, setUserListHeight] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectRef = useRef<HTMLDivElement | null>(null);

  // 使用 ref 来避免在 useEffect 依赖中包含 onContentChange
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  // 处理 @ 符号逻辑和内容变化
  useEffect(() => {
    if (textareaValue.endsWith('@')) {
      setShowUserList(true);
      updateCaretPosition();
    } else {
      setShowUserList(false);
    }

    // 使用 ref 调用回调，避免依赖问题
    onContentChangeRef.current?.(textareaValue);
  }, [textareaValue]); // 只依赖 textareaValue

  // 只在外部 value 真正变化时同步
  useEffect(() => {
    // 添加条件：只有当外部 value 与当前 textareaValue 不同时才更新
    if (value !== textareaValue) {
      setTextareaValue(value);
    }
  }, [value]); // 只依赖 value，移除 textareaValue 依赖

  // 监听用户列表高度变化
  useEffect(() => {
    if (showUserList && selectRef.current) {
      setUserListHeight(selectRef.current.offsetHeight);
    }
  }, [showUserList, userList]);

  // 使用 useCallback 优化函数
  const updateCaretPosition = useCallback(() => {
    if (textareaRef.current) {
      const position = textareaRef.current.selectionEnd;
      const coords = getCaretCoordinates(textareaRef.current, position);
      setCaretPos({ left: coords.left, top: coords.top });
    }
  }, []);

  const onSend = useCallback(async () => {
    try {
      await onClickSend();
      setTextareaValue('');
    } catch (e) {
      console.error('发送失败:', e);
    }
  }, [onClickSend]);

  const handleUserSelection = useCallback(
    (userName: string, UserId: string) => {
      const newValue = textareaValue.replace(
        /@$/,
        `<@${UserId}::${userName}> `
      );
      setTextareaValue(newValue);
      setShowUserList(false);

      setTimeout(() => {
        textareaRef.current?.focus();
        if (textareaRef.current) {
          const length = newValue.length;
          textareaRef.current.setSelectionRange(length, length);
        }
      }, 0);
    },
    [textareaValue]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      console.log('输入内容:', newValue);
      setTextareaValue(newValue);

      setTimeout(() => {
        updateCaretPosition();
      }, 0);
    },
    [updateCaretPosition]
  );

  const onKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        setTextareaValue(prev => prev + '\n');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        console.log('按下回车发送');
        await onSend();
      } else if (e.key === 'Escape' && showUserList) {
        setShowUserList(false);
      }
    },
    [onSend, showUserList]
  );

  const onKeyUp = useCallback(() => {
    updateCaretPosition();
  }, [updateCaretPosition]);

  const onClick = useCallback(async () => {
    await onSend();
  }, [onSend]);

  return (
    <section className="select-none w-full flex flex-row justify-center px-4 py-1">
      {/* 用户列表弹框 */}
      {showUserList && userList && userList.length > 1 && (
        <div
          style={{
            left: caretPos.left,
            top: caretPos.top - userListHeight,
            zIndex: 1000
          }}
          className="rounded-md fixed w-[9rem] max-w-36 max-h-32 overflow-y-auto scrollbar shadow-md border border-[var(--sidebar-border)] bg-[var(--editor-background)]"
        >
          <div ref={selectRef} className="flex flex-col px-2 py-1">
            {userList.map(user => (
              <div
                key={user.UserId}
                onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleUserSelection(user.UserName, user.UserId);
                }}
                className="rounded-md cursor-pointer p-1 hover:bg-[var(--activityBar-background)] text-sm"
              >
                {user.UserName}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 主输入区域 */}
      <div className="flex gap-2 flex-col border border-[var(--editorWidget-border)] focus-within:border-[var(--button-background)] bg-[var(--editor-background)] border-opacity-70 shadow-inner rounded-md w-full p-1">
        {/* 工具栏 */}
        <div className="flex justify-between gap-2 shadow-inner rounded-md p-1">
          <div>
            <div
              className="cursor-pointer flex gap-2 border rounded-md px-2  border-[var(--editorWidget-border)]"
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                onAppClick?.('commands');
              }}
            >
              <RobotOutlined />
              指令管理
            </div>
          </div>

          <div>
            <div
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                onAppClick?.('clear');
              }}
              className="cursor-pointer flex gap-2 border rounded-md px-2  border-[var(--editorWidget-border)]"
              title="清空消息"
            >
              <ClearOutlined />
              聊天记录
            </div>
          </div>
        </div>

        {/* 输入框 */}
        <textarea
          ref={textareaRef}
          className="min-h-20 px-1 resize-none max-h-64 border-0 focus:border-0 bg-opacity-0 bg-[var(--editor-background)] rounded-md outline-none"
          placeholder="输入内容..."
          value={textareaValue}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          {...props}
        />

        {/* 底部工具栏 */}
        <div className="flex flex-row justify-between ">
          <div className="text-[var(--textPreformat-background)] text-sm">
            Ctrl+Enter 换行
          </div>
          <div
            className="cursor-pointer"
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              onClick();
            }}
          >
            <SendIcon />
          </div>
        </div>
      </div>
    </section>
  );
}
