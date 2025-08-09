import { Modal, Tooltip } from 'antd';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import { Button } from '@/frontend/ui/Button';
import { useEffect, useMemo } from 'react';
import dayjs from 'dayjs';

interface ModalStopAllConfirmProps {
  open: boolean;
  onCancel: () => void;
  tasks: any[]; // 传入的应是“正在运行”的循环任务列表 (调用处已经 filter)
  onStopAll: () => void; // 停止所有循环任务（运行与否都处理）
}

export default function ModalStopAllConfirm({
  open,
  onCancel,
  tasks,
  onStopAll
}: ModalStopAllConfirmProps) {
  // 统计信息（如果调用方传的是运行中列表，则 running = tasks.length）
  const stats = useMemo(() => {
    const running = tasks.filter(t => t.isRunning).length;
    const lastExec = tasks
      .map(t => t.lastExecutionTime)
      .filter(Boolean)
      .sort((a: number, b: number) => b - a)[0];
    const latestTime = lastExec ? dayjs(lastExec).format('HH:mm:ss') : '—';
    return {
      running,
      total: tasks.length,
      latestTime
    };
  }, [tasks]);

  useEffect(() => {
    if (!tasks.length) {
      onCancel();
    }
  }, [tasks, onCancel]);

  return (
    <Modal
      className="testone-modal"
      open={open}
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
      <div className="p-6 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-xl shadow">
            🛑
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[var(--editor-foreground)] flex items-center gap-2">
              停止所有循环任务
              {stats.running > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-[11px] text-red-400 border border-red-500/30">
                  运行中 {stats.running}
                </span>
              )}
            </h2>
            <p className="text-[11px] mt-1 text-[var(--descriptionForeground)] leading-relaxed">
              此操作会对全部循环任务生效
            </p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-[var(--editor-inactiveSelection)]/60 p-2 flex flex-col">
            <span className="text-[10px] opacity-70">总数</span>
            <span className="text-sm font-semibold">{stats.total}</span>
          </div>
          <div className="rounded-md bg-[var(--editor-inactiveSelection)]/60 p-2 flex flex-col">
            <span className="text-[10px] opacity-70">运行中</span>
            <span className="text-sm font-semibold text-red-400">
              {stats.running}
            </span>
          </div>
          <div className="rounded-md bg-[var(--editor-inactiveSelection)]/60 p-2 flex flex-col">
            <span className="text-[10px] opacity-70">最近执行</span>
            <span className="text-[11px] font-medium truncate">
              {stats.latestTime}
            </span>
          </div>
        </div>

        {/* Task List / Empty State */}
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 rounded-md border border-dashed border-[var(--panel-border)] bg-[var(--editor-inactiveSelection)]/40">
            <div className="text-2xl mb-2">🎉</div>
            <div className="text-sm text-[var(--editor-foreground)]">
              当前没有运行中的循环任务
            </div>
            <div className="text-[11px] mt-1 text-[var(--descriptionForeground)]">
              可随时创建新的任务
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar">
            {tasks.map(t => {
              const freq = t.metadata?.frequency;
              const createdAt = t.metadata?.createdAt
                ? new Date(t.metadata.createdAt).toLocaleTimeString()
                : '—';
              return (
                <div
                  key={t.id}
                  className="group rounded-md border border-[var(--panel-border)] bg-[var(--editor-inactiveSelection)]/50 hover:bg-[var(--editor-inactiveSelection)] transition-colors p-3 text-xs flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Tooltip title={t.name} mouseEnterDelay={0.3}>
                      <div className="font-medium truncate max-w-[200px] flex items-center gap-1">
                        <span>🔁</span>
                        <span>{t.name}</span>
                      </div>
                    </Tooltip>
                    <div className="flex items-center gap-1">
                      {t.isRunning ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-[10px] text-green-400 border border-green-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          运行
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-500/15 text-[10px] text-zinc-400 border border-zinc-600/30">
                          暂停
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] opacity-80 leading-4">
                    <span>频率: {freq ?? '—'}s</span>
                    <span>执行: {t.executionCount}</span>
                    <span>起始: #{(t.metadata?.startIndex ?? 0) + 1}</span>
                    <span>创建: {createdAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 ">
          <Button
            onClick={onCancel}
            className="bg-[var(--button-background)] hover:bg-[var(--button-hoverBackground)] text-[var(--button-foreground)] border border-[var(--button-border)]"
          >
            取消
          </Button>
          <Button
            onClick={onStopAll}
            disabled={tasks.length === 0}
            className={`border text-white ${
              tasks.length === 0
                ? 'bg-zinc-600 border-zinc-600 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 border-red-500'
            } flex items-center gap-1`}
          >
            🛑 停止全部
          </Button>
        </div>
      </div>
    </Modal>
  );
}
