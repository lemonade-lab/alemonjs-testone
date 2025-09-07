import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { DataEnums } from 'alemonjs';
import * as _ from 'lodash-es';
import { Channel, Command, MessageItem } from '@/frontend/typing';
import {
  makeSelectMessagesByType,
  makeSelectUserList,
  makeSelectHeader
} from '@/frontend/store/selectors';
import MessageWindow from '@/frontend/component/MessageWindow';
import MessageHeader from '@/frontend/component/MessageHeader';
import ChannelSelect from '@/frontend/pages/common/ChannelSelect';
import ChannelItem from '@/frontend/pages/common/ChannelItem';
import { Message } from '@/frontend/core/message';
const ModalCommandTimer = lazy(
  () => import('@/frontend/pages/modals/ModalCommandTomer')
);
const ModalStopAllConfirm = lazy(
  () => import('@/frontend/pages/modals/ModalStopAllConfirm')
);
const ModalTaskDeleteConfirm = lazy(
  () => import('@/frontend/pages/modals/ModalTaskDeleteConfirm')
);
import TimerManager from '@/frontend/pages/common/TimerManager';
import { useAppDispatch, useAppSelector } from '@/frontend/store';
import {
  sendGroupFormat,
  sendPrivateFormat
} from '@/frontend/store/sendMessage';
import {
  clearGroupMessages,
  clearPrivateMessages,
  deleteGroupMessage,
  deletePrivateMessage
} from '@/frontend/store/slices/chatSlice';
import { setCurrentChannel } from '@/frontend/store/slices/channelSlice';
import useCommandTimer from '@/frontend/hook/useCommandTimer';
import { parseMessageSmart } from '../../core/asyncParse';
import UserInfo from '../common/UserInfo';
import SidebarCommandList from '@/frontend/component/SidebarCommandList';
import InputBox from '../common/InputBox';
import TimerManagerTip from '../common/TimerManagerTip';
import {
  setSelectMode,
  toggleSelectMessage,
  deleteSelectedMessages
} from '@/frontend/store/slices/chatSlice';
import { setCurrentUser } from '@/frontend/store/slices/userSlice';

export default function ChatWindow({
  pageType = 'public'
}: {
  pageType: 'public' | 'private';
}) {
  const dispatch = useAppDispatch();
  const selectMessages = useMemo(
    () => makeSelectMessagesByType(pageType),
    [pageType]
  );
  const { connected: status } = useAppSelector(s => s.socket);
  const { channels, current: channel } = useAppSelector(s => s.channels);
  const { users, bot, current: user } = useAppSelector(s => s.users);
  const { commands } = useAppSelector(s => s.commands);
  const { selectMode, selectedKeys } = useAppSelector(s => s.chat);

  const [open, setOpen] = useState(false);
  const [openStopAllConfirm, setOpenStopAllConfirm] = useState(false);

  const selectUserList = useMemo(
    () => makeSelectUserList(pageType),
    [pageType]
  );
  const selectHeader = useMemo(() => makeSelectHeader(pageType), [pageType]);
  const message = useAppSelector(selectMessages);
  const userList = useAppSelector(selectUserList);
  const headerMessage = useAppSelector(selectHeader);

  const onSendFormat = useCallback(
    (format: DataEnums[], { curchannel = channel, curuser = bot } = {}) => {
      if (pageType === 'public') {
        if (!curchannel) return;
        dispatch(
          sendGroupFormat({
            currentChannel: curchannel,
            content: format
          })
        );
      } else {
        if (!curuser) return;
        dispatch(
          sendPrivateFormat({
            currentUser: curuser,
            content: format
          })
        );
      }
    },
    [pageType, channel, bot, dispatch]
  );

  const onSend = useCallback(
    (text: string, { curchannel = channel, curuser = bot } = {}) => {
      parseMessageSmart({ input: text, users, channels }).then(
        (content: any) => {
          onSendFormat(content, { curchannel, curuser });
        }
      );
    },
    [users, channels, onSendFormat, channel, bot]
  );

  const onDelete = useCallback(
    (item: MessageItem) => {
      if (selectMode) {
        // 选择模式下改为选择/取消
        dispatch(toggleSelectMessage(item));
        return;
      }
      if (pageType === 'public') dispatch(deleteGroupMessage(item));
      else dispatch(deletePrivateMessage(item));
    },
    [pageType, dispatch, selectMode]
  );

  const onClear = useCallback(() => {
    if (pageType === 'public') dispatch(clearGroupMessages());
    else dispatch(clearPrivateMessages());
  }, [pageType, dispatch]);

  const onSelect = useCallback(
    (channel: Channel) => {
      dispatch(setCurrentChannel(channel));
    },
    [dispatch]
  );

  const [value, onInput] = useState('');

  const handleCommand = useMemo(
    () =>
      _.throttle((command: Command) => {
        if (!status) {
          Message.warning('连接已断开，无法执行指令');
          return;
        }
        if (typeof command.autoEnter === 'boolean' && !command.autoEnter) {
          if (!command.data) {
            onInput(command.text);
            return;
          }
          onSendFormat(command.data);
          return;
        }
        if (!command.data) {
          onSend(command.text);
          return;
        }
        onSendFormat(command.data);
      }, 400),
    [status, onSendFormat, onSend]
  );

  const onCommand = useCallback(
    (command: Command, { curchannel = channel, curuser = bot } = {}) => {
      if (!status) {
        Message.warning('连接已断开，无法执行指令');
        return;
      }
      if (!command.data) {
        onSend(command.text, { curchannel, curuser });
        return;
      }
      onSendFormat(command.data, { curchannel, curuser });
    },
    [status, onSend, onSendFormat, channel, bot]
  );

  const handleChannelSelect = useMemo(
    () =>
      _.throttle((c: Channel) => {
        onSelect(c);
      }, 400),
    [onSelect]
  );

  const {
    // 选择删除的任务
    taskToDelete,
    // 删除单个任务
    setTaskToDelete,
    // 定时器配置
    timerConfig,
    // 更新定时器
    setTimerConfig,
    // 提交定时器
    onSubmitTimer,
    // 停止所有任务
    stopAllCommandTasks,
    // 删除单个任务
    deleteSingleTask,
    // 定时器管理
    timerManager,
    // 所有任务
    commandTasksInfo
  } = useCommandTimer({
    commands,
    status,
    pageType,
    onCommand: onCommand,
    // 启动任务
    onStart: () => {
      setOpen(false);
    },
    // 关闭任务
    onClose: () => setOpenStopAllConfirm(false)
  });

  return (
    <div className="flex-1 flex flex-row overflow-y-auto scrollbar bg-[var(--sideBar-background)]">
      {
        // 消息管理
      }
      {pageType === 'public' && (
        <section className="w-56 hidden md:flex flex-col bg-[var(--editorWidget-background)] border-r border-[--panel-border] p-2 gradient-border">
          <div className="flex-1 flex-col overflow-y-auto scrollbar gap-2">
            {Array.isArray(channels) &&
              channels.map((c, index) => (
                <ChannelItem
                  key={index}
                  channel={c}
                  onSelect={handleChannelSelect}
                />
              ))}
          </div>
          {
            // 个人信息
          }
          <div className="border-t border-[--panel-border] pt-2">
            <UserInfo
              users={users}
              onSelect={user => {
                dispatch(setCurrentUser(user));
              }}
              user={
                user || {
                  UserId: '',
                  UserName: '',
                  UserAvatar: '',
                  IsMaster: false,
                  IsBot: false
                }
              }
            />
          </div>
        </section>
      )}
      <section className="flex-1 flex flex-col overflow-y-auto scrollbar">
        <MessageHeader value={headerMessage}>
          <div className="flex items-center px-4 gap-2">
            {pageType === 'public' && (
              <ChannelSelect
                value={channel?.ChannelId || ''}
                channels={channels}
                onSelect={handleChannelSelect}
              />
            )}
          </div>
          <TimerManagerTip
            open={timerManager.hasRunningTasks}
            count={timerManager.getTaskCount().running}
            addTask={() => {
              setOpen(true);
            }}
            onClose={() => {
              if (timerManager.hasRunningTasks) {
                setOpenStopAllConfirm(true);
              } else {
                Message.warning('没有正在运行的任务');
              }
            }}
          />
        </MessageHeader>
        {
          // 消息窗口
        }
        <MessageWindow
          message={message}
          onDelete={onDelete}
          onSend={onSend}
          onInput={onInput}
          UserId={user?.UserId || ''}
          selectMode={selectMode}
          selectedKeys={selectedKeys}
          onConfirmDelete={item => {
            // 右键确认删除，不进入选择模式
            if (pageType === 'public') dispatch(deleteGroupMessage(item));
            else dispatch(deletePrivateMessage(item));
          }}
          onBulkDeleteSelected={() => dispatch(deleteSelectedMessages())}
          onEnterSelectMode={item => {
            dispatch(setSelectMode(true));
            dispatch(toggleSelectMessage(item));
          }}
          onExitSelectMode={() => dispatch(setSelectMode(false))}
        />
        {
          // 输入框
        }
        <InputBox
          value={value}
          commands={commands}
          userList={userList}
          onInput={onInput}
          onSend={() => {
            if (value.trim()) {
              onSend(value);
              onInput('');
            }
          }}
          onClear={onClear}
          onSelect={() => {
            if (!selectMode) {
              dispatch(setSelectMode(true));
            } else {
              dispatch(deleteSelectedMessages());
            }
          }}
          onCommand={handleCommand}
          onTimer={() => setOpen(true)}
          onCancelSelect={() => dispatch(setSelectMode(false))}
          selectMode={selectMode}
          selectedCount={selectedKeys.length}
        />
      </section>
      {/* 桌面端任务管理（移动端隐藏） */}
      <section className="w-56 hidden sm:flex flex-col bg-[var(--editorWidget-background)] border-l border-[--panel-border] p-2 gradient-border">
        <TimerManager
          commandTasksInfo={commandTasksInfo}
          onDel={t => setTaskToDelete(t)}
          running={timerManager.getTaskCount().running}
          stopAllCommandTasks={() => {
            if (timerManager.hasRunningTasks) {
              setOpenStopAllConfirm(true);
            } else {
              Message.warning('没有正在运行的任务');
            }
          }}
          addTask={() => {
            setOpen(true);
          }}
        />
        <SidebarCommandList
          commands={commands}
          onCommandSelect={handleCommand}
        />
      </section>
      {/* 全部任务停止确认 */}
      <Suspense fallback={null}>
        <ModalStopAllConfirm
          tasks={commandTasksInfo.filter(t => t.isRunning)}
          open={openStopAllConfirm}
          onCancel={() => setOpenStopAllConfirm(false)}
          onConfirm={stopAllCommandTasks}
        />
        <ModalTaskDeleteConfirm
          task={commandTasksInfo.find(t => t.id === taskToDelete?.id)}
          onCancel={() => setTaskToDelete(null)}
          onConfirm={deleteSingleTask}
        />
        <ModalCommandTimer
          commands={commands}
          values={timerConfig}
          onChange={setTimerConfig}
          open={open}
          onCancel={() => setOpen(false)}
          onConfirm={e => onSubmitTimer(e, { channel: channel, user: user })}
        />
      </Suspense>
    </div>
  );
}
