import { memo, useState, useMemo, useCallback, useEffect } from 'react';
import { Command } from '@/frontend/typing';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import FieldTimeOutlined from '@ant-design/icons/FieldTimeOutlined';
import CommandItem from './CommandItem';
import PopoverBox from '../ui/PopoverBox';

interface Props {
  commands: Command[];
  onCommandSelect: (command: Command) => void;
  onTimer?: () => void;
  onClose?: () => void;
  open: boolean;
}

const PAGE_SIZE = 50;

const CommandList = ({
  commands = [],
  onCommandSelect,
  onTimer,
  onClose,
  open
}: Props) => {
  const [page, setPage] = useState(0);

  // 当 commands 变化时重置页码，避免越界
  const totalPages = useMemo(
    () => Math.ceil(commands.length / PAGE_SIZE) || 1,
    [commands.length]
  );
  // 修正页码（放入 effect 避免 render 期间 setState）
  useEffect(() => {
    if (page > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);

  const pageCommands = useMemo(() => {
    if (commands.length <= PAGE_SIZE) return commands;
    const start = page * PAGE_SIZE;
    return commands.slice(start, start + PAGE_SIZE);
  }, [commands, page]);

  const handlePrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPage(p => Math.max(0, p - 1));
  }, []);

  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setPage(p => Math.min(totalPages - 1, p + 1));
    },
    [totalPages]
  );

  if (!open || commands.length === 0) return null;

  const hasPagination = commands.length > PAGE_SIZE;
  const listMaxHeightClass = hasPagination ? 'max-h-40' : 'max-h-48'; // 40=>10rem, 48=>12rem

  return (
    <PopoverBox open={open} onClose={onClose} className="w-56">
      <div className="flex justify-between text-xs text-[var(--descriptionForeground)] border-b border-[var(--dropdown-border)] p-1">
        <div className="flex items-center gap-1">
          <span>指令列表</span>
          {commands.length > PAGE_SIZE && (
            <span className="opacity-70">{commands.length}</span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div
            className="cursor-pointer"
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              onTimer?.();
            }}
          >
            <FieldTimeOutlined />
          </div>
          <div
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              onClose?.();
            }}
            className="cursor-pointer"
          >
            <CloseCircleOutlined />
          </div>
        </div>
      </div>
      <div className="shadow-inner rounded-md py-1 flex flex-col">
        <div
          className={`overflow-y-auto scrollbar ${listMaxHeightClass} flex-1`}
        >
          {pageCommands.map((command, index) => (
            <CommandItem
              key={(command as any).id ?? `${page}-${index}`}
              command={command}
              onCommandSelect={c => {
                onCommandSelect(c);
                onClose?.();
              }}
            />
          ))}
        </div>
        {hasPagination && (
          <div className="flex items-center justify-center gap-2 pt-1 border-t border-[var(--dropdown-border)] mt-1 text-xs select-none">
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
    </PopoverBox>
  );
};

export default memo(CommandList);
