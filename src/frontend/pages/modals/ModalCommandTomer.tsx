import { useMemo } from 'react';
import { Modal } from 'antd';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import { Button } from '@/frontend/ui/Button';
import { Input } from '@/frontend/ui/Input';
import dayjs from 'dayjs';

interface CommandLike {
  title?: string;
  text?: string;
}

const ModalCommandTimer = ({
  open,
  setOpen,
  timerConfig,
  setTimerConfig,
  commands,
  onSubmitTimer
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  timerConfig: any;
  setTimerConfig: (config: any) => void;
  commands: CommandLike[];
  onSubmitTimer: (e: React.FormEvent) => void;
}) => {
  const { time, startIndex } = timerConfig;

  // 频率合法性判断
  const timeInvalid = !time || Number.isNaN(time) || time < 1 || time > 12;

  const currentCommand = commands?.[startIndex] || null;

  const currentCommandName =
    currentCommand?.title || currentCommand?.text || '（无名称）';

  // 下一个执行顺序预览（取 5 条，循环）
  const nextSequence = useMemo(() => {
    if (!Array.isArray(commands) || commands.length === 0) return [];
    const arr: { idx: number; name: string }[] = [];
    for (let i = 0; i < Math.min(5, commands.length); i++) {
      const realIndex = (startIndex + i) % commands.length;
      const cmd = commands[realIndex];
      arr.push({
        idx: realIndex,
        name: cmd?.title || cmd?.text || `指令#${realIndex + 1}`
      });
    }
    return arr;
  }, [commands, startIndex]);

  // 预计下一次执行时间（只是展示，创建后真实计时由业务控制）
  const nextExecPreview = useMemo(() => {
    if (timeInvalid) return '—';
    // 取当前时间 + time 秒
    const date = dayjs().add(time, 'second');
    return date.format('HH:mm:ss');
  }, [time, timeInvalid]);

  return (
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
      width={340}
    >
      <form className="flex flex-col animate-fadeIn" onSubmit={onSubmitTimer}>
        <div className="p-6 flex flex-col gap-2">
          {/* 标题区 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-lg shadow">
              ⏰
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--editor-foreground)] flex items-center gap-2">
                新建循环任务
                <span className="text-base">🌀</span>
              </h2>
              <p className="text-[11px] mt-0.5 text-[var(--descriptionForeground)]">
                自动按顺序循环发送指令
              </p>
            </div>
          </div>

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
                      setTimerConfig((prev: any) => ({
                        ...prev,
                        time: value
                      }));
                    } else {
                      setTimerConfig((prev: any) => ({
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

            {/* 起始指令 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--editor-foreground)]">
                起始指令 🎯
              </label>
              <select
                value={startIndex}
                onChange={e => {
                  const selectedIndex = Number(e.target.value);
                  setTimerConfig((prev: any) => ({
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
                  <span className="mr-1">🎯</span>
                  起始：
                  <span className="font-medium">
                    #{startIndex + 1} {currentCommandName}
                  </span>
                </li>
                <li>
                  <span className="mr-1">🧮</span>
                  指令总数：
                  <span className="font-medium">{commands.length}</span>
                </li>
                <li>
                  <span className="mr-1">🔁</span>
                  模式：
                  <span className="font-medium">无限循环</span>
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
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            onClick={() => setOpen(false)}
            className="bg-[var(--button-background)] hover:bg-[var(--button-hoverBackground)] text-[var(--button-foreground)] border border-[var(--button-border)]"
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={timeInvalid || commands.length === 0}
            className="bg-[var(--button-background)] hover:bg-[var(--button-hoverBackground)] text-[var(--button-foreground)] border border-[var(--button-border)] flex items-center gap-1"
          >
            <span>🚀 启动任务</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalCommandTimer;
