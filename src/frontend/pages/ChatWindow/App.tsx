import { useState } from 'react';
import { DataEnums } from 'alemonjs';
import * as _ from 'lodash-es';
import { Channel, Command, MessageItem } from '@/frontend/typing';
import MessageWindow from '@/frontend/component/MessageWindow';
import Textarea from '@/frontend/component/Textarea';
import MessageHeader from '@/frontend/component/MessageHeader';
import CommandList, { CommandItem } from '@/frontend/component/CommandList';
import ChannelSelect from '@/frontend/pages/common/ChannelSelect';
import ChannelItem from '@/frontend/pages/common/ChannelItem';
import { Message } from '@/frontend/core/message';
import ModalCommandTimer from '@/frontend/pages/modals/ModalCommandTomer';
import ModalStopAllConfirm from '@/frontend/pages/modals/ModalStopAllConfirm';
import ModalTaskDeleteConfirm from '@/frontend/pages/modals/ModalTaskDeleteConfirm';
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
import { parseMessage } from '@/frontend/core/parse';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';

export default function ChatWindow({
  pageType = 'public'
}: {
  pageType: 'public' | 'private';
}) {
  const dispatch = useAppDispatch();
  const { groupMessages, privateMessages } = useAppSelector(s => s.chat);
  const { connected: status } = useAppSelector(s => s.socket);
  const { channels, current: channel } = useAppSelector(s => s.channels);
  const { users, bot, current: user } = useAppSelector(s => s.users);
  const { commands } = useAppSelector(s => s.commands);

  const message = pageType === 'public' ? groupMessages : privateMessages;

  const onSendFormat = (
    format: DataEnums[],
    { curchannel = channel, curuser = bot } = {}
  ) => {
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
  };

  const onSend = (
    text: string,
    { curchannel = channel, curuser = bot } = {}
  ) => {
    const content: DataEnums[] = parseMessage({
      Users: users,
      Channels: channels,
      input: text
    });
    onSendFormat(content, { curchannel, curuser });
  };

  const onDelete = (item: MessageItem) => {
    if (pageType === 'public') dispatch(deleteGroupMessage(item));
    else dispatch(deletePrivateMessage(item));
  };

  const onClear = () => {
    if (pageType === 'public') dispatch(clearGroupMessages());
    else dispatch(clearPrivateMessages());
  };

  const onSelect = (channel: Channel) => {
    dispatch(setCurrentChannel(channel));
  };

  const [value, onInput] = useState('');
  const [showCommands, setShowCommands] = useState(false);

  const handleCommand = _.throttle((command: Command) => {
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
  }, 400);

  const onCommand = (
    command: Command,
    { curchannel = channel, curuser = bot } = {}
  ) => {
    if (!status) {
      Message.warning('连接已断开，无法执行指令');
      return;
    }
    if (!command.data) {
      onSend(command.text, { curchannel, curuser });
      return;
    }
    onSendFormat(command.data, { curchannel, curuser });
  };

  const handleChannelSelect = _.throttle((c: Channel) => {
    onSelect(c);
  }, 400);

  const {
    open,
    setOpen,
    showStopAllConfirm,
    setShowStopAllConfirm,
    taskToDelete,
    setTaskToDelete,
    timerConfig,
    setTimerConfig,
    onSubmitTimer,
    onTimer,
    stopAllCommandTasks,
    deleteSingleTask,
    timerManager,
    commandTasksInfo
  } = useCommandTimer({
    commands,
    status,
    pageType,
    handleCommand: onCommand
  });

  const headerMessage =
    pageType === 'public'
      ? {
          Avatar: channel.ChannelAvatar || '',
          Id: channel.ChannelId,
          Name: channel.ChannelName
        }
      : {
          Avatar: bot.UserAvatar || '',
          Id: bot.UserId,
          Name: bot.UserName
        };

  const userList =
    pageType === 'public'
      ? [
          {
            UserId: 'everyone',
            UserName: '全体成员',
            UserAvatar: '',
            IsMaster: false,
            IsBot: false
          },
          ...users
        ]
      : [];

  return (
    <div className="flex-1 flex flex-row overflow-y-auto scrollbar">
      {pageType === 'public' && (
        <section className="w-48 hidden md:flex bg-[var(--editorWidget-background)] border-r border-[--panel-border] p-1">
          <div className="flex-col overflow-y-auto scrollbar w-full gap-1">
            {Array.isArray(channels) &&
              channels.map((c, index) => (
                <ChannelItem
                  key={index}
                  channel={c}
                  onSelect={handleChannelSelect}
                />
              ))}
          </div>
        </section>
      )}

      <section className="flex-1 flex flex-col overflow-y-auto scrollbar">
        <MessageHeader value={headerMessage}>
          <div className="flex items-center px-4 gap-2">
            {pageType === 'public' && (
              <ChannelSelect
                channels={channels}
                onSelect={handleChannelSelect}
              />
            )}
          </div>
          <div className="absolute z-10 left-1/2 transform -translate-x-1/2 top-[3.2rem]">
            {timerManager.hasRunningTasks && (
              <div className="flex sm:hidden items-center gap-2 text-xs text-green-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <div>任务运行中 ({timerManager.getTaskCount().running})</div>
                <div
                  className=" text-red-300 cursor-pointer"
                  onClick={e => {
                    e.stopPropagation();
                    if (timerManager.hasRunningTasks) {
                      setShowStopAllConfirm(true);
                    } else {
                      Message.warning('没有正在运行的任务');
                    }
                  }}
                >
                  <CloseCircleOutlined />
                </div>
              </div>
            )}
          </div>
        </MessageHeader>

        <MessageWindow
          message={message}
          onDelete={onDelete}
          onSend={onSend}
          onInput={onInput}
          UserId={user.UserId}
        />

        <div className="relative">
          <CommandList
            commands={commands}
            onCommandSelect={handleCommand}
            isVisible={showCommands}
            onClose={() => setShowCommands(false)}
            onTimer={onTimer}
          />
          <Textarea
            value={value}
            onContentChange={onInput}
            onClickSend={() => {
              if (value.trim()) {
                onSend(value);
                onInput('');
              }
            }}
            onAppClick={action => {
              if (action === 'commands') {
                setShowCommands(!showCommands);
              } else if (action === 'clear') {
                onClear();
              }
            }}
            userList={userList}
          />
        </div>
      </section>

      {/* 桌面端任务管理（移动端隐藏） */}
      <section className="w-56 hidden sm:flex flex-col bg-[var(--editorWidget-background)] border-l border-[--panel-border] p-2">
        <TimerManager
          commandTasksInfo={commandTasksInfo}
          onDel={t => setTaskToDelete(t)}
          running={timerManager.getTaskCount().running}
          stopAllCommandTasks={() => {
            if (timerManager.hasRunningTasks) {
              setShowStopAllConfirm(true);
            } else {
              Message.warning('没有正在运行的任务');
            }
          }}
          addTask={() => {
            // show
            setOpen(true);
          }}
        />
        <div className="flex-col overflow-y-auto scrollbar ">
          {Array.isArray(commands) &&
            commands.map((command, index) => (
              <CommandItem
                key={index}
                command={command}
                onCommandSelect={handleCommand}
              />
            ))}
        </div>
      </section>

      {/* 全部任务停止确认 */}
      <ModalStopAllConfirm
        open={showStopAllConfirm}
        onCancel={() => setShowStopAllConfirm(false)}
        tasks={commandTasksInfo.filter(t => t.isRunning)}
        onStopAll={stopAllCommandTasks}
      />

      {/* 单任务删除确认 */}
      <ModalTaskDeleteConfirm
        task={taskToDelete}
        onCancel={() => setTaskToDelete(null)}
        onConfirm={deleteSingleTask}
      />

      <ModalCommandTimer
        open={open}
        setOpen={setOpen}
        timerConfig={timerConfig}
        setTimerConfig={setTimerConfig}
        commands={commands}
        onSubmitTimer={e => onSubmitTimer(e, { channel: channel, user: user })}
      />
    </div>
  );
}
