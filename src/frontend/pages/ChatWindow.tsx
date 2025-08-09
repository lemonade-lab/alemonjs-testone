// ChatWindow.tsx
import { Channel, Command, MessageItem, User } from '@/frontend/typing';
import MessageWindow from '@/frontend/component/MessageWindow';
import Textarea from '@/frontend/component/Textarea';
import MessageHeader from '@/frontend/component/MessageHeader';
import { useRef, useState, useCallback, useEffect } from 'react';
import CommandList, { CommandItem } from '@/frontend/component/CommandList';
import { DataEnums } from 'alemonjs';
import ChannelSelect from '@/frontend/pages/common/ChannelSelect';
import ChannelItem from './common/ChannelItem';
import ClearOutlined from '@ant-design/icons/ClearOutlined';
import * as _ from 'lodash-es';
import { Modal } from 'antd';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Message } from '../core/message';
import useTimerManager from '../hook/TimerManager';
import StopOutlined from '@ant-design/icons/StopOutlined';

// 定时任务配置类型
interface TimerConfig {
  time: number;
  startIndex: number;
  commandName?: string;
}

export default function ChatWindow({
  status,
  onSend,
  onSendFormat,
  message,
  onDelete,
  onClear,
  onSelect,
  channels,
  channel,
  user,
  users,
  commands,
  bot,
  pageType = 'public'
}: {
  status: boolean;
  message: MessageItem[];
  onSend: (message: string) => void;
  onSendFormat: (format: DataEnums[]) => void;
  onDelete: (item: MessageItem) => void;
  onClear: () => void;
  onSelect: (channel: Channel) => void;
  channels: Channel[];
  channel: Channel;
  user: User;
  users: User[];
  commands: Command[];
  bot: User;
  pageType: 'public' | 'private';
}) {
  // 定时器管理
  const timerManager = useTimerManager();

  // 输入框内容
  const [value, onInput] = useState('');
  const [showCommands, setShowCommands] = useState(false);

  // 弹窗状态
  const [open, setOpen] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  // 定时任务配置
  const [timerConfig, setTimerConfig] = useState<TimerConfig>({
    time: 1.2,
    startIndex: 0,
    commandName: ''
  });

  // 当前运行的指令任务ID
  const currentTaskIdRef = useRef<string | null>(null);

  // 指令执行索引
  const commandIndexRef = useRef(0);

  // 节流处理指令执行
  const handleCommand = _.throttle((command: Command) => {
    if (!status) {
      Message.warning('连接已断开，无法执行指令');
      return;
    }

    if (typeof command.autoEnter === 'boolean' && !command.autoEnter) {
      // 不自动发送
      if (!command.data) {
        onInput(command.text);
        return;
      }
      onSendFormat(command.data);
      return;
    }

    // 自动发送
    if (!command.data) {
      onSend(command.text);
      return;
    }
    onSendFormat(command.data);
  }, 400);

  // 节流处理频道选择
  const handleChannelSelect = _.throttle((channel: Channel) => {
    onSelect(channel);
  }, 400);

  // 检查连接状态，断开时停止所有任务
  useEffect(() => {
    if (!status && timerManager.hasRunningTasks) {
      console.log('连接断开，停止所有定时任务');
      timerManager.stopAllTasks();
      Message.info('连接断开，已停止所有定时任务');
    }
  }, [status, timerManager]);

  // 获取指令发送任务
  const getCommandTasks = useCallback(() => {
    return timerManager.getTasksByName('指令循环发送');
  }, [timerManager]);

  // 检查是否有指令任务正在运行
  const hasCommandTaskRunning = useCallback(() => {
    return getCommandTasks().some(task => task.isRunning);
  }, [getCommandTasks]);

  // 创建指令发送回调
  const createCommandCallback = useCallback(
    (startIndex: number) => {
      commandIndexRef.current = startIndex;

      return () => {
        if (!status) {
          Message.info('连接已断开，停止指令任务');
          timerManager.stopAllTasks();
          return;
        }

        if (commands.length === 0) {
          Message.warning('没有可用的指令');
          return;
        }

        // 获取当前要执行的指令
        const currentIndex = commandIndexRef.current % commands.length;
        const command = commands[currentIndex];

        if (command) {
          console.log(
            `🤖 执行指令 [${currentIndex + 1}/${commands.length}]: ${command.title || command.text}`
          );
          handleCommand(command);
          commandIndexRef.current += 1;
        }
      };
    },
    [status, commands, handleCommand, timerManager]
  );

  // 启动定时任务
  const startTimerTask = useCallback(() => {
    if (!timerConfig.time || timerConfig.time < 1 || timerConfig.time > 12) {
      Message.error('请输入1-12秒的定时任务频率');
      return;
    }

    if (commands.length === 0) {
      Message.error('没有可用的指令，无法启动定时任务');
      return;
    }

    if (!status) {
      Message.error('连接已断开，无法启动定时任务');
      return;
    }

    try {
      // 创建新的定时任务
      const taskId = timerManager.createTask({
        name: '指令循环发送',
        interval: timerConfig.time * 1000,
        callback: createCommandCallback(timerConfig.startIndex),
        metadata: {
          pageType,
          channelId: pageType === 'public' ? channel.ChannelId : 'private',
          startIndex: timerConfig.startIndex,
          frequency: timerConfig.time,
          totalCommands: commands.length,
          createdAt: new Date().toISOString()
        },
        onError: error => {
          console.error('定时任务执行失败:', error);
          Message.error(`定时任务执行失败: ${error.message}`);
        },
        onComplete: () => {
          Message.success('定时任务已完成');
          currentTaskIdRef.current = null;
        }
      });

      // 启动任务
      if (timerManager.startTask(taskId)) {
        currentTaskIdRef.current = taskId;
        setOpen(false);

        const startCommand = commands[timerConfig.startIndex];
        Message.success(
          `定时任务已启动！\n` +
            `频率: ${timerConfig.time}秒\n` +
            `起始指令: ${startCommand?.title || startCommand?.text || '未知'}\n` +
            `总指令数: ${commands.length}`
        );

        console.log(`🚀 定时任务已启动:`, {
          taskId,
          frequency: timerConfig.time,
          startIndex: timerConfig.startIndex,
          commandCount: commands.length
        });

        setShowCommands(false);
      } else {
        Message.error('定时任务启动失败');
      }
    } catch (error) {
      console.error('创建定时任务失败:', error);
      Message.error('创建定时任务失败');
    }
  }, [
    timerConfig,
    commands,
    status,
    timerManager,
    createCommandCallback,
    pageType,
    channel.ChannelId
  ]);

  // 停止所有指令任务
  const stopAllCommandTasks = useCallback(() => {
    const commandTasks = getCommandTasks();

    commandTasks.forEach(task => {
      timerManager.stopTask(task.id);
    });

    currentTaskIdRef.current = null;
    setShowStopConfirm(false);

    if (commandTasks.length > 0) {
      Message.success(`已停止 ${commandTasks.length} 个指令任务`);
    }
  }, [getCommandTasks, timerManager]);

  // 处理定时器按钮点击
  const onTimer = useCallback(() => {
    if (hasCommandTaskRunning()) {
      setShowStopConfirm(true);
      return;
    }
    setOpen(true);
  }, [hasCommandTaskRunning]);

  // 处理定时任务表单提交
  const onSubmitTimer = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      startTimerTask();
    },
    [startTimerTask]
  );

  // 处理停止并重新设置
  const handleStopAndRestart = useCallback(() => {
    stopAllCommandTasks();
    setOpen(true);
  }, [stopAllCommandTasks]);

  // 头部信息
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

  // 用户列表
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

  // 获取运行状态信息
  // const runningTasksInfo = timerManager.getRunningTasks();
  const commandTasksInfo = getCommandTasks();

  return (
    <div className="flex-1 flex flex-row overflow-y-auto scrollbar">
      {/* 左侧频道列表 */}
      {pageType === 'public' && (
        <section className="w-48 hidden md:flex bg-[var(--editorWidget-background)] border-r border-[--panel-border] p-1">
          <div className="flex-col overflow-y-auto scrollbar w-full gap-1">
            {Array.isArray(channels) &&
              channels.map((channel, index) => (
                <ChannelItem
                  key={index}
                  channel={channel}
                  onSelect={handleChannelSelect}
                />
              ))}
          </div>
        </section>
      )}

      {/* 主聊天区域 */}
      <section className="flex-1 flex flex-col overflow-y-auto scrollbar">
        <MessageHeader value={headerMessage}>
          <div className="flex items-center px-4 gap-2">
            {/* 清空按钮 */}
            <div
              onClick={onClear}
              className="bg-[var(--input-background)] hover:bg-[var(--activityBar-background)] px-1 rounded-md cursor-pointer"
              title="清空消息"
            >
              <ClearOutlined />
            </div>

            {/* 定时任务状态指示器 */}
            {timerManager.hasRunningTasks && (
              <div className="flex items-center gap-1 text-xs text-green-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>
                  定时任务运行中 ({timerManager.getTaskCount().running})
                </span>
              </div>
            )}

            {/* 频道选择器 */}
            {pageType === 'public' && (
              <ChannelSelect
                channels={channels}
                onSelect={handleChannelSelect}
              />
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
                onInput(''); // 发送后清空输入框
              }
            }}
            onAppClick={action => {
              if (action === 'commands') {
                setShowCommands(!showCommands);
              }
            }}
            userList={userList}
          />
        </div>
      </section>

      {/* 右侧指令列表 */}
      <section className="w-48 hidden md:flex bg-[var(--editorWidget-background)] border-l border-[--panel-border] p-1">
        <div className="flex-col overflow-y-auto scrollbar">
          {/* 任务状态显示 */}
          {timerManager.hasRunningTasks && (
            <div className="mb-2 p-2 bg-green-100 dark:bg-green-900 rounded text-xs">
              <div className="flex justify-between">
                <div className="font-semibold text-green-800 dark:text-green-200">
                  运行中的任务 ({timerManager.getTaskCount().running})
                </div>
                <div className="flex gap-2">
                  <StopOutlined onClick={stopAllCommandTasks} />
                </div>
              </div>
              {commandTasksInfo
                .filter(task => task.isRunning)
                .map(task => (
                  <div
                    key={task.id}
                    className="mt-1 text-green-700 dark:text-green-300"
                  >
                    <div>📋 {task.name}</div>
                    <div>🔄 已执行: {task.executionCount} 次</div>
                    {task.metadata && (
                      <div>⏱️ 频率: {task.metadata.frequency}秒</div>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* 指令列表 */}
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

      {/* 停止确认弹窗 */}
      <Modal
        className="testone-modal"
        open={showStopConfirm}
        footer={null}
        title={null}
        onCancel={() => setShowStopConfirm(false)}
        closeIcon={
          <div className="bg-transparent text-[var(--editor-foreground)] hover:bg-[var(--button-secondaryHover-background)] rounded p-1 transition-colors">
            <CloseOutlined />
          </div>
        }
        centered
        maskClosable={false}
        width={300}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white text-lg">
              ⚠️
            </div>
            <h2 className="text-lg font-semibold text-[var(--editor-foreground)]">
              确认操作
            </h2>
          </div>

          <div className="">
            <p className="text-[var(--editor-foreground)] mb-3">
              发现有{commandTasksInfo.filter(task => task.isRunning).length}{' '}
              个指令任务正在运行：
            </p>

            {/* 显示运行中的任务详情 */}
            <div className="bg-[var(--editor-inactiveSelection)] p-3 rounded mb-4">
              {commandTasksInfo
                .filter(task => task.isRunning)
                .map(task => (
                  <div
                    key={task.id}
                    className="text-sm text-[var(--editor-foreground)] mb-2"
                  >
                    <div>📋 任务: {task.name}</div>
                    <div>🔄 已执行: {task.executionCount} 次</div>
                    {task.metadata && (
                      <>
                        <div>⏱️ 执行频率: {task.metadata.frequency} 秒</div>
                        <div>
                          📍 起始指令: 第 {task.metadata.startIndex + 1} 个
                        </div>
                      </>
                    )}
                    {task.lastExecutionTime && (
                      <div>
                        🕐 上次执行:{' '}
                        {new Date(task.lastExecutionTime).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              onClick={() => setShowStopConfirm(false)}
              className="bg-[var(--button-background)] hover:bg-[var(--button-hoverBackground)] text-[var(--button-foreground)] border border-[var(--button-border)]"
            >
              继续
            </Button>
            <Button
              onClick={stopAllCommandTasks}
              className="bg-[var(--button-background)] hover:bg-[var(--button-hoverBackground)] text-[var(--button-foreground)] border border-[var(--button-border)]"
            >
              停止
            </Button>
            <Button
              onClick={handleStopAndRestart}
              className=" bg-[var(--button-background)] hover:bg-[var(--button-hoverBackground)] text-[var(--button-foreground)] border border-[var(--button-border)]"
            >
              重新开始
            </Button>
          </div>
        </div>
      </Modal>

      {/* 定时任务设置弹窗 */}
      <Modal
        className="testone-modal"
        open={open}
        footer={null}
        title={null}
        onCancel={() => setOpen(false)}
        closeIcon={
          <div className="bg-transparent text-[var(--editor-foreground)] hover:bg-[var(--button-secondaryHover-background)] rounded p-1 transition-colors">
            <CloseOutlined />
          </div>
        }
        centered
        width={300}
      >
        <form className="flex flex-col" onSubmit={onSubmitTimer}>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                ⏰
              </div>
              <h2 className="text-lg font-semibold text-[var(--editor-foreground)]">
                定时任务设置
              </h2>
            </div>

            <div className="space-y-4">
              {/* 执行频率设置 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--editor-foreground)]">
                  执行频率（秒）
                </label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  step="0.1"
                  value={timerConfig.time}
                  onChange={e => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      setTimerConfig(prev => ({ ...prev, time: value }));
                    }
                  }}
                  placeholder="请输入1-12之间的数字"
                  className="w-full"
                />
                <p className="text-xs text-[var(--descriptionForeground)]">
                  建议设置为1.2秒以上， <br />
                  避免发送过于频繁
                </p>
              </div>

              {/* 起始指令选择 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--editor-foreground)]">
                  起始指令选择
                </label>
                <select
                  value={timerConfig.startIndex}
                  onChange={e => {
                    const selectedIndex = Number(e.target.value);
                    setTimerConfig(prev => ({
                      ...prev,
                      startIndex: selectedIndex,
                      commandName:
                        commands[selectedIndex]?.title ||
                        commands[selectedIndex]?.text
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-md bg-[var(--input-background)] hover:bg-[var(--activityBar-background)] text-[var(--input-foreground)] border border-[var(--input-border)]"
                >
                  {Array.isArray(commands) &&
                    commands.map((item, index) => (
                      <option key={index} value={index}>
                        第 {index + 1} 个:{' '}
                        {item.title || item.text || '未命名指令'}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-[var(--descriptionForeground)]">
                  任务将从选择的指令开始，
                  <br />
                  然后循环执行所有指令
                </p>
              </div>

              {/* 任务预览 */}
              <div className="bg-[var(--editor-inactiveSelection)] p-3 rounded">
                <h4 className="text-sm font-medium text-[var(--editor-foreground)] mb-2">
                  任务预览
                </h4>
                <div className="text-sm text-[var(--editor-foreground)]">
                  <div>📋 任务类型: 指令循环发送</div>
                  <div>⏱️ 执行频率: 每 {timerConfig.time} 秒</div>
                  <div>📍 起始指令: 第 {timerConfig.startIndex + 1} 个</div>
                  <div>📊 总指令数: {commands.length} 个</div>
                  <div>🔄 执行模式: 循环执行</div>
                  <div>
                    📱 执行环境:{' '}
                    {pageType === 'public'
                      ? `群聊 (${channel.ChannelName})`
                      : '私聊'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 ">
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className=" bg-[var(--button-background)] hover:bg-[var(--button-hoverBackground)] text-[var(--button-foreground)] border border-[var(--button-border)]"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={
                !timerConfig.time ||
                timerConfig.time < 1 ||
                timerConfig.time > 12 ||
                commands.length === 0
              }
              className=" bg-[var(--button-background)] hover:bg-[var(--button-hoverBackground)] text-[var(--button-foreground)] border border-[var(--button-border)]"
            >
              开始任务
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
