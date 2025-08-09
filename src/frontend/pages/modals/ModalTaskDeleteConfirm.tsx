import { useEffect } from 'react';
import { Modal } from 'antd';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import { Button } from '@/frontend/ui/Button';
import dayjs from 'dayjs';

interface ModalTaskDeleteConfirmProps {
  task: any | null;
  onCancel: () => void;
  onConfirm: (taskId: string) => void;
}

export default function ModalTaskDeleteConfirm({
  task,
  onCancel,
  onConfirm
}: ModalTaskDeleteConfirmProps) {
  // 如果外部删除任务（或任务消失），自动关闭
  useEffect(() => {
    if (!task) {
      onCancel();
    }
  }, [task, onCancel]);

  if (!task) return null;

  const meta = task.metadata || {};
  const frequency = meta.frequency ?? '—';
  const startIndex =
    typeof meta.startIndex === 'number' ? meta.startIndex + 1 : '—';
  const createdAt = meta.createdAt
    ? dayjs(meta.createdAt).format('YYYY-MM-DD HH:mm:ss')
    : '—';
  const lastExec = task.lastExecutionTime
    ? dayjs(task.lastExecutionTime).format('YYYY-MM-DD HH:mm:ss')
    : '—';
  const nextExec = task.nextExecutionTime
    ? dayjs(task.nextExecutionTime).format('YYYY-MM-DD HH:mm:ss')
    : '—';

  return (
    <Modal
      className="testone-modal"
      open={!!task}
      footer={null}
      title={null}
      onCancel={onCancel}
      closeIcon={
        <div className="bg-transparent text-[var(--editor-foreground)] hover:bg-[var(--button-secondaryHover-background)] rounded p-1 transition-colors">
          <CloseOutlined />
        </div>
      }
      centered
      width={380}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white text-xl shadow">
            🗑️
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[var(--editor-foreground)] flex items-center gap-2">
              删除任务确认
              <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-[11px] text-red-400 border border-red-500/30">
                危险操作
              </span>
            </h2>
            <p className="text-[11px] mt-1 leading-relaxed text-[var(--descriptionForeground)]">
              删除后需重新创建；此任务当前状态会实时刷新。
            </p>
          </div>
        </div>

        {/* Task Info */}
        <div className="rounded-md border border-[var(--panel-border)] bg-[var(--editor-inactiveSelection)]/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-medium text-[var(--descriptionForeground)]">
                任务名称
              </div>
              <div className="text-sm font-semibold truncate text-[var(--editor-foreground)]">
                {task.name || '（未命名任务）'}
              </div>
            </div>
            <div>
              {task.isRunning ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-[10px] text-green-400 border border-green-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  运行中
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-500/15 text-[10px] text-zinc-400 border border-zinc-600/30">
                  已停止
                </span>
              )}
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11px] text-[var(--editor-foreground)]">
            {[
              { name: '频率', value: `${frequency} 秒` },
              { name: '起始指令', value: `#${startIndex}` },
              {
                name: '已执行次数',
                value: `${task.executionCount ?? 0} 次`
              },
              { name: '创建时间', value: createdAt },
              { name: '最近执行', value: lastExec },
              { name: '下次预计', value: nextExec }
            ].map((item, index) => (
              <li key={index} className="flex flex-col gap-0.5">
                <span className="opacity-60">{item.name}</span>
                <span className="font-medium">{item.value}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Danger Note */}
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-[11px] leading-relaxed text-red-300">
          ⚠️ 删除将立即停止该任务并移除记录，无法撤销。
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            onClick={onCancel}
            className="bg-[var(--button-background)] hover:bg-[var(--button-hoverBackground)] text-[var(--button-foreground)] border border-[var(--button-border)]"
          >
            取消
          </Button>
          <Button
            onClick={() => onConfirm(task.id)}
            className="bg-red-500 hover:bg-red-600 text-white border border-red-500 flex items-center gap-1"
          >
            🗑️ 删除任务
          </Button>
        </div>
      </div>
    </Modal>
  );
}
