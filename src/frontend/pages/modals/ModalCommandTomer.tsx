import { useMemo } from 'react';
import { Input } from '@/frontend/ui/Input';
import { Switch } from '@/frontend/ui/Switch';
import dayjs from 'dayjs';
import BaseModal from './BaseModal';

interface CommandLike {
  title?: string;
  text?: string;
}

const ModalCommandTimer = ({
  open,
  onCancel,
  values,
  onChange,
  commands,
  onConfirm
}: {
  open: boolean;
  onCancel: () => void;
  values: any;
  onChange: (config: any) => void;
  commands: CommandLike[];
  onConfirm: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
  const { time, startIndex, endIndex, loop = true } = values || {};

  // 频率合法性判断
  const timeInvalid = !time || Number.isNaN(time) || time < 1 || time > 12;

  // 下一个执行顺序预览（取 5 条，循环）
  const nextSequence = useMemo(() => {
    if (!Array.isArray(commands) || commands.length === 0) return [];
    const realStart = Math.max(
      0,
      Math.min(startIndex ?? 0, commands.length - 1)
    );
    const realEnd =
      typeof endIndex === 'number'
        ? Math.max(realStart, Math.min(endIndex, commands.length - 1))
        : commands.length - 1;
    const arr: { idx: number; name: string }[] = [];
    for (let i = 0; i < Math.min(5, realEnd - realStart + 1); i++) {
      const realIndex = realStart + i;
      const cmd = commands[realIndex];
      arr.push({
        idx: realIndex,
        name: cmd?.title || cmd?.text || `指令#${realIndex + 1}`
      });
    }
    return arr;
  }, [commands, startIndex, endIndex]);

  // 预计下一次执行时间（只是展示，创建后真实计时由业务控制）
  const nextExecPreview = useMemo(() => {
    if (timeInvalid) return '—';
    // 取当前时间 + time 秒
    const date = dayjs().add(time, 'second');
    return date.format('HH:mm:ss');
  }, [time, timeInvalid]);

  return (
    <BaseModal
      open={open}
      onCancel={onCancel}
      titleIcon={
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-lg shadow">
          ⏰
        </div>
      }
      title={
        <>
          新建循环任务<span className="text-base">🌀</span>{' '}
        </>
      }
      description={'自动按顺序循环发送指令'}
      okText="🚀 启动任务"
      onOk={onConfirm}
      width={340}
    >
      <form className="flex flex-col animate-fadeIn">
        {/* 配置区 */}
        <div className="space-y-3">
          {/* 执行频率 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--editor-foreground)]">
              速度频率（秒）⚡
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="12"
                step="0.1"
                value={time}
                onChange={e => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    onChange((prev: any) => ({
                      ...prev,
                      time: value
                    }));
                  } else {
                    onChange((prev: any) => ({
                      ...prev,
                      time: ''
                    }));
                  }
                }}
                placeholder="1 - 12"
                className={`w-full ${
                  timeInvalid && time
                    ? 'border-red-500'
                    : 'border-[var(--input-border)]'
                }`}
              />
            </div>
            {timeInvalid && time ? (
              <p className="text-xs text-red-500">请输入 1 - 12 之间的数值</p>
            ) : (
              <p className="text-xs text-[var(--descriptionForeground)] leading-relaxed">
                所有任务总计不低于 1 秒，低于该频率将被限流
              </p>
            )}
          </div>

          {/* 是否循环 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--editor-foreground)] flex items-center justify-between">
              <span>循环执行 🔁</span>
              <Switch
                value={loop !== false}
                onChange={checked =>
                  onChange((prev: any) => ({ ...prev, loop: checked }))
                }
              />
            </label>
            <p className="text-xs text-[var(--descriptionForeground)] leading-relaxed">
              关闭后仅执行一轮所有指令，自动停止
            </p>
          </div>

          {/* 起始指令 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--editor-foreground)]">
              起始指令 🎯
            </label>
            <select
              value={startIndex}
              onChange={e => {
                const selectedIndex = Number(e.target.value);
                onChange((prev: any) => ({
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
                    {index + 1}. {item.title || item.text || '未命名'}
                  </option>
                ))}
            </select>
          </div>

          {/* 结束指令 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--editor-foreground)]">
              结束指令 🛑 (含)
            </label>
            <select
              value={
                typeof endIndex === 'number'
                  ? Math.min(endIndex, commands.length - 1)
                  : commands.length - 1
              }
              onChange={e => {
                const idx = Number(e.target.value);
                onChange((prev: any) => ({ ...prev, endIndex: idx }));
              }}
              className="w-full px-3 py-2 rounded-md bg-[var(--input-background)] hover:bg-[var(--activityBar-background)] text-[var(--input-foreground)] border border-[var(--input-border)]"
            >
              {Array.isArray(commands) &&
                commands.map((item, index) => (
                  <option key={index} value={index}>
                    {index + 1}. {item.title || item.text || '未命名'}
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-[var(--descriptionForeground)]">
              不选默认为最后一条指令；区间：#{(startIndex ?? 0) + 1} - #
              {(typeof endIndex === 'number'
                ? Math.max(
                    startIndex ?? 0,
                    Math.min(endIndex, commands.length - 1)
                  )
                : commands.length - 1) + 1}
            </p>
          </div>

          {/* 预览区 */}
          <div className="bg-[var(--editor-inactiveSelection)]/60 backdrop-blur rounded-md p-2 border border-[var(--panel-border)] space-y-2">
            <h4 className="text-sm font-medium text-[var(--editor-foreground)] flex items-center gap-2">
              任务预览 📋
            </h4>

            <ul className="text-xs space-y-1 text-[var(--editor-foreground)]">
              <li>
                <span className="mr-1">🏷️</span>
                类型：
                <span className="font-medium">循环发送任务</span>
              </li>
              <li>
                <span className="mr-1">⚡</span>
                频率：
                <span className="font-medium">
                  {timeInvalid ? '未设置' : `${time}s / 次`}
                </span>
              </li>
              <li>
                <span className="mr-1">🧮</span>
                区间指令数：
                <span className="font-medium">
                  {(() => {
                    if (!commands.length) return 0;
                    const realStart = Math.max(
                      0,
                      Math.min(startIndex ?? 0, commands.length - 1)
                    );
                    const realEnd =
                      typeof endIndex === 'number'
                        ? Math.max(
                            realStart,
                            Math.min(endIndex, commands.length - 1)
                          )
                        : commands.length - 1;
                    return realEnd - realStart + 1;
                  })()}
                  /{commands.length}
                </span>
              </li>
              <li>
                <span className="mr-1">🔁</span>
                模式：
                <span className="font-medium">
                  {loop === false ? '单轮执行' : '循环执行'}
                </span>
              </li>
              <li>
                <span className="mr-1">⏱️</span>
                预计首轮下一次执行时间：
                <span className="font-medium">{nextExecPreview}</span>
              </li>
            </ul>

            {/* 顺序预览 */}
            <div className="mt-2">
              <div className="text-[11px] font-medium mb-1 text-[var(--descriptionForeground)] flex items-center gap-1">
                📌 即将执行的指令顺序（预览）
              </div>
              {nextSequence.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {nextSequence.map((c, i) => (
                    <div
                      key={c.idx}
                      className={`text-[11px] px-2 py-1 rounded border border-transparent ${
                        i === 0
                          ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                          : 'bg-[var(--editor-inactiveSelection)]'
                      }`}
                    >
                      {i === 0 ? '➡️ 当前起点' : `→ 第 ${i + 1} 步`} ：#
                      {c.idx + 1} {c.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] opacity-70">无可预览内容</div>
              )}
            </div>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};

export default ModalCommandTimer;
