import { useState, useMemo, useCallback } from 'react';
import { Command } from '@/frontend/typing';
import CommandItem from './CommandItem';

/**
 * 侧栏指令列表（带分页, 每页50）
 */
const PAGE_SIZE = 50;

export default function SidebarCommandList({
  commands = [],
  onCommandSelect
}: {
  commands: Command[];
  onCommandSelect: (c: Command) => void;
}) {
  const [page, setPage] = useState(0);
  const totalPages = useMemo(
    () => Math.ceil(commands.length / PAGE_SIZE) || 1,
    [commands.length]
  );

  if (page > 0 && page >= totalPages) {
    // 直接修正即可
    setPage(totalPages - 1);
  }

  const pageCommands = useMemo(() => {
    if (commands.length <= PAGE_SIZE) return commands;
    const start = page * PAGE_SIZE;
    return commands.slice(start, start + PAGE_SIZE);
  }, [commands, page]);

  const handlePrev = useCallback(() => {
    setPage(p => Math.max(0, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setPage(p => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  if (!commands || commands.length === 0) {
    return (
      <div className="flex-col overflow-y-auto scrollbar mt-2 rounded-md gradient-border p-2 text-xs opacity-70">
        暂无指令
      </div>
    );
  }

  const hasPagination = commands.length > PAGE_SIZE;

  return (
    <div className="flex flex-col mt-2 rounded-md gradient-border p-1 text-xs overflow-hidden">
      <div className="overflow-y-auto scrollbar flex-1">
        {pageCommands.map((command, index) => (
          <CommandItem
            key={(command as any).id ?? `${page}-${index}`}
            command={command}
            onCommandSelect={onCommandSelect}
          />
        ))}
      </div>
      {hasPagination && (
        <div className="flex items-center justify-center gap-2 pt-1 border-t border-[var(--dropdown-border)] mt-1 select-none">
          <button
            className="px-1 rounded hover:bg-[var(--dropdown-border)] disabled:opacity-30"
            disabled={page === 0}
            onClick={handlePrev}
          >
            上一页
          </button>
          <span>
            {page + 1}/{totalPages}
          </span>
          <button
            className="px-1 rounded hover:bg-[var(--dropdown-border)] disabled:opacity-30"
            disabled={page + 1 >= totalPages}
            onClick={handleNext}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
