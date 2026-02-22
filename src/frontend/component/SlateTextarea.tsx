import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createEditor,
  Descendant,
  Editor,
  Element as SlateElement,
  Range,
  Transforms
} from 'slate';
import { Slate, Editable, ReactEditor, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import { SendIcon } from '@/frontend/ui/Icons';
import { User, Channel } from '@/frontend/typing';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
import ProfileOutlined from '@ant-design/icons/ProfileOutlined';
import {
  withMentions,
  renderElement,
  serializeToText,
  deserializeFromText,
  EMPTY_VALUE
} from './slate/index';
import type { MentionElement } from './slate/types';

// 确保 slate 自定义类型声明被加载
import './slate/types';

export type Actions = 'commands' | 'clear' | 'chatlogs';

/** 当前触发类型 */
type TriggerType = 'user' | 'channel' | null;

interface SlateTextareaProps {
  value: string;
  onContentChange?: (content: string) => void;
  onSlateChange?: (nodes: Descendant[]) => void;
  onClickSend: () => void;
  getSlateValue?: React.MutableRefObject<() => Descendant[]>;
  userList?: User[];
  channelList?: Channel[];
  onAppClick?: (action: Actions) => void;
}

export default function SlateTextarea({
  value,
  onContentChange,
  onSlateChange,
  onClickSend,
  getSlateValue,
  userList,
  channelList,
  onAppClick
}: SlateTextareaProps) {
  const editor = useMemo(
    () => withMentions(withHistory(withReact(createEditor()))),
    []
  );

  // ---- mention / channel 弹窗状态 ----
  const [triggerType, setTriggerType] = useState<TriggerType>(null);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionAnchor, setMentionAnchor] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectRef = useRef<HTMLDivElement | null>(null);
  /** IME 输入法组合状态 */
  const composingRef = useRef(false);

  const showPopup = triggerType !== null;

  // 外部同步 ref
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;
  const onSlateChangeRef = useRef(onSlateChange);
  onSlateChangeRef.current = onSlateChange;

  // 暴露获取当前 Slate 文档的方法
  useEffect(() => {
    if (getSlateValue) {
      getSlateValue.current = () => editor.children;
    }
  }, [editor, getSlateValue]);

  // 外部 value → Slate 同步
  const lastExternalValue = useRef(value);
  useEffect(() => {
    if (value !== lastExternalValue.current) {
      lastExternalValue.current = value;
      const nodes = deserializeFromText(value);
      editor.children = nodes;
      Editor.normalize(editor, { force: true });
      Transforms.select(editor, Editor.end(editor, []));
    }
  }, [value, editor]);

  // ---- 过滤列表 ----
  const filteredUsers = useMemo(() => {
    if (!userList || triggerType !== 'user') return [];
    if (!mentionSearch) return userList;
    const lower = mentionSearch.toLowerCase();
    return userList.filter(u => u.UserName.toLowerCase().includes(lower));
  }, [userList, mentionSearch, triggerType]);

  const filteredChannels = useMemo(() => {
    if (!channelList || triggerType !== 'channel') return [];
    if (!mentionSearch) return channelList;
    const lower = mentionSearch.toLowerCase();
    return channelList.filter(c => c.ChannelName.toLowerCase().includes(lower));
  }, [channelList, mentionSearch, triggerType]);

  /** 当前弹窗内的可选项 */
  const popupItems = triggerType === 'user' ? filteredUsers : filteredChannels;

  // ---- 获取当前段落起始到光标的文本 ----
  const getTextBeforeCursor = useCallback((): string | null => {
    const { selection } = editor;
    if (!selection || !Range.isCollapsed(selection)) return null;

    const [start] = Range.edges(selection);

    // 找到包含光标的最近块级元素 (paragraph)
    const blockEntry = Editor.above(editor, {
      at: start,
      match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n)
    });
    if (!blockEntry) return null;

    const blockStart = Editor.start(editor, blockEntry[1]);
    const range = Editor.range(editor, blockStart, start);
    return Editor.string(editor, range);
  }, [editor]);

  // ---- 检测 @ 或 # 触发 ----
  const detectMention = useCallback(() => {
    const text = getTextBeforeCursor();
    if (text === null) {
      setTriggerType(null);
      return;
    }

    // 匹配 @xxx 或 #xxx (未闭合, 光标在末尾)
    const match = text.match(/([@#])(\S*)$/);
    if (match) {
      const trigger = match[1];
      const search = match[2];
      const type: TriggerType = trigger === '#' ? 'channel' : 'user';
      setTriggerType(type);
      setMentionSearch(search);
      setSelectedIndex(0);
    } else {
      setTriggerType(null);
    }
  }, [getTextBeforeCursor]);

  // ---- 弹窗位置：延迟到 DOM 渲染后再计算 ----
  useEffect(() => {
    if (triggerType === null) {
      setMentionAnchor(null);
      return;
    }
    // requestAnimationFrame 确保 DOM 已更新
    const id = requestAnimationFrame(() => {
      try {
        const { selection } = editor;
        if (selection) {
          const domRange = ReactEditor.toDOMRange(editor, selection);
          const rect = domRange.getBoundingClientRect();
          setMentionAnchor({ left: rect.left, top: rect.top });
        }
      } catch {
        // 定位失败时不取消弹窗，保留上次位置
      }
    });
    return () => cancelAnimationFrame(id);
  }, [triggerType, mentionSearch, editor]);

  // ---- 插入 user mention ----
  const insertUserMention = useCallback(
    (user: User) => {
      const text = getTextBeforeCursor();
      if (text === null) return;

      const atMatch = text.match(/@(\S*)$/);
      if (atMatch) {
        for (let i = 0; i < atMatch[0].length; i++) {
          Editor.deleteBackward(editor, { unit: 'character' });
        }
      }

      const mention: MentionElement = {
        type: 'mention',
        belong: user.UserId === 'everyone' ? 'everyone' : 'user',
        mentionId: user.UserId,
        mentionName: user.UserName,
        children: [{ text: '' }]
      };
      Transforms.insertNodes(editor, mention);
      Transforms.insertText(editor, ' ');
      Transforms.move(editor);

      setTriggerType(null);
      ReactEditor.focus(editor);
    },
    [editor, getTextBeforeCursor]
  );

  // ---- 插入 channel mention ----
  const insertChannelMention = useCallback(
    (channel: Channel) => {
      const text = getTextBeforeCursor();
      if (text === null) return;

      const hashMatch = text.match(/#(\S*)$/);
      if (hashMatch) {
        for (let i = 0; i < hashMatch[0].length; i++) {
          Editor.deleteBackward(editor, { unit: 'character' });
        }
      }

      const mention: MentionElement = {
        type: 'mention',
        belong: 'channel',
        mentionId: channel.ChannelId,
        mentionName: channel.ChannelName,
        children: [{ text: '' }]
      };
      Transforms.insertNodes(editor, mention);
      Transforms.insertText(editor, ' ');
      Transforms.move(editor);

      setTriggerType(null);
      ReactEditor.focus(editor);
    },
    [editor, getTextBeforeCursor]
  );

  /** 选择弹窗中当前高亮项 */
  const selectCurrentItem = useCallback(
    (index: number) => {
      if (triggerType === 'user' && filteredUsers[index]) {
        insertUserMention(filteredUsers[index]);
      } else if (triggerType === 'channel' && filteredChannels[index]) {
        insertChannelMention(filteredChannels[index]);
      }
    },
    [
      triggerType,
      filteredUsers,
      filteredChannels,
      insertUserMention,
      insertChannelMention
    ]
  );

  // ---- onChange ----
  const onChange = useCallback(
    (newValue: Descendant[]) => {
      onSlateChangeRef.current?.(newValue);
      const text = serializeToText(newValue);
      lastExternalValue.current = text;
      onContentChangeRef.current?.(text);
      // IME 组合期间不做 mention 检测
      if (!composingRef.current) {
        detectMention();
      }
    },
    [detectMention]
  );

  // ---- 发送 ----
  const onSend = useCallback(async () => {
    try {
      await onClickSend();
      Transforms.delete(editor, {
        at: {
          anchor: Editor.start(editor, []),
          focus: Editor.end(editor, [])
        }
      });
      if (editor.children.length === 0) {
        Transforms.insertNodes(editor, {
          type: 'paragraph',
          children: [{ text: '' }]
        });
      }
      Editor.normalize(editor, { force: true });
    } catch (e) {
      console.error('发送失败:', e);
    }
  }, [onClickSend, editor]);

  // ---- 键盘事件 ----
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // IME 组合期间 (如中文输入法) 不拦截任何按键
      if (e.nativeEvent.isComposing || e.key === 'Process') return;

      if (showPopup && popupItems.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(i => (i + 1) % popupItems.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(i => (i <= 0 ? popupItems.length - 1 : i - 1));
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          selectCurrentItem(selectedIndex);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setTriggerType(null);
          return;
        }
      }

      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        Editor.insertBreak(editor);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSend();
      }
    },
    [showPopup, popupItems, selectedIndex, selectCurrentItem, editor, onSend]
  );

  // ---- render ----
  return (
    <section className="select-none w-full flex flex-row justify-center px-4 py-1">
      {/* mention / channel 弹窗 */}
      {showPopup && popupItems.length > 0 && mentionAnchor && (
        <div
          ref={selectRef}
          style={{
            left: mentionAnchor.left,
            top: mentionAnchor.top - (selectRef.current?.offsetHeight || 120),
            zIndex: 1000
          }}
          className="rounded-md fixed w-[9rem] max-w-36 max-h-32 overflow-y-auto scrollbar shadow-md border border-[var(--sidebar-border)] bg-[var(--editor-background)]"
        >
          <div className="flex flex-col px-2 py-1">
            {triggerType === 'user' &&
              filteredUsers.map((user, i) => (
                <div
                  key={user.UserId}
                  onMouseDown={e => {
                    e.preventDefault();
                    insertUserMention(user);
                  }}
                  className={`rounded-md cursor-pointer p-1 text-sm ${
                    i === selectedIndex
                      ? 'bg-[var(--activityBar-background)]'
                      : 'hover:bg-[var(--activityBar-background)]'
                  }`}
                >
                  @{user.UserName}
                </div>
              ))}
            {triggerType === 'channel' &&
              filteredChannels.map((ch, i) => (
                <div
                  key={ch.ChannelId}
                  onMouseDown={e => {
                    e.preventDefault();
                    insertChannelMention(ch);
                  }}
                  className={`rounded-md cursor-pointer p-1 text-sm ${
                    i === selectedIndex
                      ? 'bg-[var(--activityBar-background)]'
                      : 'hover:bg-[var(--activityBar-background)]'
                  }`}
                >
                  #{ch.ChannelName}
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
              className="cursor-pointer flex gap-2 border rounded-md px-2 border-[var(--editorWidget-border)]"
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
              className="cursor-pointer flex gap-2 border rounded-md px-2 border-[var(--editorWidget-border)]"
              title="清空消息"
            >
              <ProfileOutlined />
              聊天记录
            </div>
          </div>
        </div>

        {/* Slate 编辑器 */}
        <Slate editor={editor} initialValue={EMPTY_VALUE} onChange={onChange}>
          <Editable
            className="px-1 resize-none overflow-y-auto border-0 focus:border-0 bg-opacity-0 bg-[var(--editor-background)] rounded-md outline-none"
            placeholder="输入内容..."
            renderElement={renderElement}
            onKeyDown={onKeyDown}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
              // 组合结束后再触发一次 mention 检测
              detectMention();
            }}
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              minHeight: '5rem',
              maxHeight: '16rem'
            }}
          />
        </Slate>

        {/* 底部工具栏 */}
        <div className="flex flex-row justify-between">
          <div className="text-[var(--textPreformat-background)] text-sm">
            Ctrl+Enter 换行
          </div>
          <div
            className="cursor-pointer"
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              onSend();
            }}
          >
            <SendIcon />
          </div>
        </div>
      </div>
    </section>
  );
}
