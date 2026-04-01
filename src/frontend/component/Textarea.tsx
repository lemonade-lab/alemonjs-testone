import { useCallback, useEffect, useRef, useState } from 'react';
import { SendIcon } from '@/frontend/ui/Icons';
import { User } from '@/frontend/typing';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
import { getCaretCoordinates } from '@/frontend/component/caretCoordin';

// import ClearOutlined from '@ant-design/icons/ClearOutlined';
import ProfileOutlined from '@ant-design/icons/ProfileOutlined';

export type Actions = 'commands' | 'clear' | 'chatlogs';

/** 最大输入字符数 */
const MAX_LENGTH = 2000;
/** 发送最小间隔 (ms) */
const SEND_COOLDOWN = 500;

interface TextareaProps extends React.HTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onContentChange?: (content: string) => void;
  onClickSend: () => void;
  userList?: User[];
  onAppClick?: (action: Actions) => void;
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
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [caretPos, setCaretPos] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0
  });
  const [userListHeight, setUserListHeight] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const lastSendTimeRef = useRef(0);

  // 使用 ref 来避免在 useEffect 依赖中包含 onContentChange
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  // ---- 过滤用户列表 ----
  const filteredUsers = (userList || []).filter(u => {
    if (!mentionSearch) return true;
    return u.UserName.toLowerCase().includes(mentionSearch.toLowerCase());
  });

  // ---- 基于光标位置检测 @ ----
  const detectAtSymbol = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursorPos = textarea.selectionEnd;
    const textBefore = textarea.value.substring(0, cursorPos);
    const match = textBefore.match(/@(\S*)$/);
    if (match) {
      setShowUserList(true);
      setMentionSearch(match[1]);
      setSelectedIndex(0);
      updateCaretPosition();
    } else {
      setShowUserList(false);
      setMentionSearch('');
    }
  }, []);

  // 内容变化时通知外部
  useEffect(() => {
    onContentChangeRef.current?.(textareaValue);
  }, [textareaValue]);

  // 只在外部 value 真正变化时同步，并保护光标位置
  const lastExternalValue = useRef(value);
  useEffect(() => {
    if (value !== lastExternalValue.current) {
      lastExternalValue.current = value;
      setTextareaValue(value);
    }
  }, [value]);

  // 监听用户列表高度变化
  useEffect(() => {
    if (showUserList && selectRef.current) {
      setUserListHeight(selectRef.current.offsetHeight);
    }
  }, [showUserList, filteredUsers]);

  // ---- selectedIndex 钳位 ----
  useEffect(() => {
    if (filteredUsers.length > 0 && selectedIndex >= filteredUsers.length) {
      setSelectedIndex(filteredUsers.length - 1);
    }
  }, [filteredUsers.length, selectedIndex]);

  // ---- 点击外部关闭弹窗 ----
  useEffect(() => {
    if (!showUserList) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowUserList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserList]);

  // 使用 useCallback 优化函数
  const updateCaretPosition = useCallback(() => {
    if (textareaRef.current) {
      const position = textareaRef.current.selectionEnd;
      const coords = getCaretCoordinates(textareaRef.current, position);
      setCaretPos({ left: coords.left, top: coords.top });
    }
  }, []);

  const onSend = useCallback(async () => {
    // 空内容守卫
    if (!textareaValue.trim()) return;
    // 发送频率限制
    const now = Date.now();
    if (now - lastSendTimeRef.current < SEND_COOLDOWN) return;
    lastSendTimeRef.current = now;

    try {
      await onClickSend();
      setTextareaValue('');
      lastExternalValue.current = '';
    } catch (e) {
      console.error('发送失败:', e);
    }
  }, [onClickSend, textareaValue]);

  const handleUserSelection = useCallback(
    (userName: string, UserId: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const cursorPos = textarea.selectionEnd;
      const textBefore = textarea.value.substring(0, cursorPos);
      const textAfter = textarea.value.substring(cursorPos);
      const newBefore = textBefore.replace(
        /@\S*$/,
        `<@${UserId}::${userName}> `
      );
      const newValue = newBefore + textAfter;
      setTextareaValue(newValue);
      lastExternalValue.current = newValue;
      setShowUserList(false);

      setTimeout(() => {
        textarea.focus();
        const pos = newBefore.length;
        textarea.setSelectionRange(pos, pos);
      }, 0);
    },
    []
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let newValue = e.target.value;
      // 字符数限制
      if (newValue.length > MAX_LENGTH) {
        newValue = newValue.slice(0, MAX_LENGTH);
      }
      setTextareaValue(newValue);
      lastExternalValue.current = newValue;

      setTimeout(() => {
        updateCaretPosition();
        detectAtSymbol();
      }, 0);
    },
    [updateCaretPosition, detectAtSymbol]
  );

  const onKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // IME 组合期间不拦截
      if (e.nativeEvent.isComposing || e.key === 'Process') return;

      // 弹窗开启时的键盘导航
      if (showUserList && filteredUsers.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(i => (i + 1) % filteredUsers.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(i => (i <= 0 ? filteredUsers.length - 1 : i - 1));
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const user = filteredUsers[selectedIndex];
          if (user) {
            handleUserSelection(user.UserName, user.UserId);
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowUserList(false);
          return;
        }
      }

      if (e.key === 'Enter' && e.ctrlKey) {
        setTextareaValue(prev => prev + '\n');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        await onSend();
      }
    },
    [onSend, showUserList, filteredUsers, selectedIndex, handleUserSelection]
  );

  const onKeyUp = useCallback(() => {
    updateCaretPosition();
    detectAtSymbol();
  }, [updateCaretPosition, detectAtSymbol]);

  const onClick = useCallback(async () => {
    await onSend();
  }, [onSend]);

  return (
    <section
      ref={containerRef}
      className="select-none w-full flex flex-row justify-center px-4 py-1"
    >
      {/* 用户列表弹框 */}
      {showUserList && filteredUsers.length > 0 && (
        <div
          style={{
            left: caretPos.left,
            top: caretPos.top - userListHeight,
            zIndex: 1000
          }}
          className="rounded-md fixed w-[9rem] max-w-36 max-h-32 overflow-y-auto scrollbar shadow-md border border-[var(--sidebar-border)] bg-[var(--editor-background)]"
        >
          <div ref={selectRef} className="flex flex-col px-2 py-1">
            {filteredUsers.map((user, i) => (
              <div
                key={user.UserId}
                onMouseDown={e => {
                  e.preventDefault();
                  handleUserSelection(user.UserName, user.UserId);
                }}
                className={`rounded-md cursor-pointer p-1 text-sm ${
                  i === selectedIndex
                    ? 'bg-[var(--activityBar-background)]'
                    : 'hover:bg-[var(--activityBar-background)]'
                }`}
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
                onAppClick?.('chatlogs');
              }}
              className="cursor-pointer flex gap-2 border rounded-md px-2  border-[var(--editorWidget-border)]"
              title="清空消息"
            >
              <ProfileOutlined />
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
          maxLength={MAX_LENGTH}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onClick={() => {
            setTimeout(detectAtSymbol, 0);
          }}
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
