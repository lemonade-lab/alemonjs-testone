import { useCallback, useEffect, useRef, useState } from 'react';
import { Channel, Command, User } from '@/frontend/typing';
import { Message } from '@/frontend/core/message';
import useTimerManager from '@/frontend/hook/TimerManager';

export interface TimerConfig {
  time: number;
  startIndex: number;
  user?: User;
  channel?: Channel;
}

interface UseCommandTimerParams {
  commands: Command[];
  status: boolean;
  pageType: 'public' | 'private';
  handleCommand: (
    command: Command,
    ctx?: {
      curchannel?: Channel;
      curuser?: User;
    }
  ) => void;
  requireTarget?: boolean;
  requireBothUserAndChannel?: boolean;
}

interface UseCommandTimerResult {
  open: boolean;
  setOpen: (v: boolean) => void;

  showStopAllConfirm: boolean;
  setShowStopAllConfirm: (v: boolean) => void;

  taskToDelete: any | null;
  setTaskToDelete: (t: any | null) => void;

  timerConfig: TimerConfig;
  setTimerConfig: React.Dispatch<React.SetStateAction<TimerConfig>>;

  onSubmitTimer: (
    e: React.FormEvent,
    payload: { user?: User; channel?: Channel }
  ) => void;
  onTimer: () => void;

  stopAllCommandTasks: () => void;
  deleteSingleTask: (taskId: string) => void;

  timerManager: ReturnType<typeof useTimerManager>;
  commandTasksInfo: any[];
  hasCommandTaskRunning: () => boolean;
  getCurrentCommandIndex: () => number;
}

export default function useCommandTimer(
  params: UseCommandTimerParams
): UseCommandTimerResult {
  const {
    commands,
    status,
    pageType,
    handleCommand,
    requireTarget = true,
    requireBothUserAndChannel = false
  } = params;

  const timerManager = useTimerManager();

  const [open, setOpen] = useState(false);
  const [showStopAllConfirm, setShowStopAllConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);

  const [timerConfig, setTimerConfig] = useState<TimerConfig>({
    time: 1.2,
    startIndex: 0
  });

  // 每个任务独立的当前指令索引
  const commandIndexRef = useRef<Record<string, number>>({});

  // 断线时停止所有任务
  useEffect(() => {
    if (!status && timerManager.hasRunningTasks) {
      timerManager.stopAllTasks();
      Message.info('连接断开，已停止所有定时任务');
    }
  }, [status, timerManager]);

  // 获取当前定义的循环任务（通过 metadata.loopTask 标记）
  const getCommandTasks = useCallback(
    () =>
      timerManager
        .getAllTasksStatus()
        .filter(t => t.metadata && t.metadata.loopTask === true),
    [timerManager]
  );

  const hasCommandTaskRunning = useCallback(
    () => getCommandTasks().some(t => t.isRunning),
    [getCommandTasks]
  );

  const getCurrentCommandIndex = useCallback(() => {
    const first = getCommandTasks()[0];
    if (!first) {
      return 0;
    }
    return commandIndexRef.current[first.id] || 0;
  }, [getCommandTasks]);

  // 为任务生成执行回调
  const createCommandCallback = useCallback(
    (
      taskId: string,
      startIndex: number,
      snapshotUser?: User,
      snapshotChannel?: Channel
    ) => {
      commandIndexRef.current[taskId] = startIndex;
      return () => {
        if (!status) {
          Message.info('连接已断开，停止任务');
          timerManager.stopTask(taskId);
          return;
        }
        if (commands.length === 0) {
          Message.warning('没有可用的指令，任务终止');
          timerManager.stopTask(taskId);
          return;
        }
        const currentIndex = commandIndexRef.current[taskId] % commands.length;
        const command = commands[currentIndex];
        if (command) {
          try {
            handleCommand(command, {
              curchannel: snapshotChannel,
              curuser: snapshotUser
            });
          } catch (err) {
            console.error('执行指令出错:', err);
            Message.error('执行指令时发生错误');
          }
          commandIndexRef.current[taskId] = commandIndexRef.current[taskId] + 1;
        }
      };
    },
    [status, commands, handleCommand, timerManager]
  );

  // 创建 & 启动一个新的循环任务
  const startTimerTask = useCallback(
    (override?: { user?: User; channel?: Channel }) => {
      const mergedUser = override?.user ?? timerConfig.user;
      const mergedChannel = override?.channel ?? timerConfig.channel;

      if (
        timerConfig.time === undefined ||
        timerConfig.time === null ||
        Number.isNaN(timerConfig.time)
      ) {
        Message.error('请输入定时频率（秒）');
        return;
      }
      if (timerConfig.time < 1 || timerConfig.time > 12) {
        Message.error('请输入 1 - 12 秒 之间的定时频率');
        return;
      }
      if (commands.length === 0) {
        Message.error('没有可用的指令，无法启动任务');
        return;
      }
      if (!status) {
        Message.error('连接已断开，无法启动任务');
        return;
      }

      if (requireBothUserAndChannel) {
        if (!mergedUser || !mergedChannel) {
          Message.error('请同时选择用户与频道');
          return;
        }
      } else if (requireTarget) {
        if (!mergedUser && !mergedChannel) {
          Message.error('请至少选择 用户 或 频道');
          return;
        }
      }

      let startIndex = Math.floor(timerConfig.startIndex ?? 0);
      if (startIndex < 0) {
        startIndex = 0;
      }
      if (startIndex >= commands.length) {
        Message.warning('起始索引超出范围，已重置为 0');
        startIndex = 0;
      }

      try {
        const snapshotUser = mergedUser;
        const snapshotChannel = mergedChannel;

        // 先创建占位任务（空 callback）
        const uniqueName = `指令循环发送#${Date.now()}`;
        const taskId = timerManager.createTask({
          name: uniqueName,
          interval: timerConfig.time * 1000,
          callback: () => {}, // 占位，稍后 update
          metadata: {
            loopTask: true,
            pageType,
            channelId: snapshotChannel?.id,
            channelName: snapshotChannel?.name,
            userId: snapshotUser?.id,
            userName: snapshotUser?.name,
            startIndex,
            frequency: timerConfig.time,
            totalCommands: commands.length,
            createdAt: new Date().toISOString()
          }
        });

        // 更新真正的 callback
        timerManager.updateTask(taskId, {
          callback: createCommandCallback(
            taskId,
            startIndex,
            snapshotUser,
            snapshotChannel
          )
        });

        const started = timerManager.startTask(taskId);
        if (started) {
          setTimerConfig(prev => ({
            ...prev,
            user: snapshotUser,
            channel: snapshotChannel,
            startIndex
          }));
          setOpen(false);
          const startCommand = commands[startIndex];
          Message.success(
            [
              '新的循环任务已启动 ✅',
              `任务: ${uniqueName}`,
              `频率: ${timerConfig.time}s`,
              `起始索引: ${startIndex}`,
              `起始指令: ${
                startCommand?.title || startCommand?.text || '未知'
              }`,
              `指令总数: ${commands.length}`
            ].join('\n')
          );
        } else {
          Message.error('定时任务启动失败');
        }
      } catch (err) {
        console.error('创建循环任务失败:', err);
        Message.error('创建循环任务失败');
      }
    },
    [
      timerConfig,
      commands,
      status,
      timerManager,
      createCommandCallback,
      pageType,
      requireTarget,
      requireBothUserAndChannel
    ]
  );

  // 停止所有循环任务
  const stopAllCommandTasks = useCallback(() => {
    console.log('Stopping all command tasks');
    const tasks = getCommandTasks();
    tasks.forEach(task => timerManager.stopTask(task.id));
    setShowStopAllConfirm(false);
    if (tasks.length > 0) {
      Message.success(`已停止 ${tasks.length} 个循环任务`);
    } else {
      Message.info('当前没有运行的循环任务');
    }
  }, [getCommandTasks, timerManager]);

  // 删除单个循环任务
  const deleteSingleTask = useCallback(
    (taskId: string) => {
      timerManager.removeTask(taskId);
      setTaskToDelete(null);
      Message.success('任务已删除');
    },
    [timerManager]
  );

  // 打开任务创建弹窗（不再判断是否已有任务）
  const onTimer = useCallback(() => {
    setOpen(true);
  }, []);

  // 表单提交创建任务
  const onSubmitTimer = useCallback(
    (e: React.FormEvent, payload: { user?: User; channel?: Channel }) => {
      e.preventDefault();
      startTimerTask(payload);
    },
    [startTimerTask]
  );

  const commandTasksInfo = getCommandTasks();

  return {
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
    commandTasksInfo,
    hasCommandTaskRunning,
    getCurrentCommandIndex
  };
}
