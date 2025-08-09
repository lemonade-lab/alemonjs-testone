import { memo } from 'react';
import { Command } from '@/frontend/typing';

const CommandItem = memo(
  ({
    command,
    onCommandSelect
  }: {
    command: Command;
    onCommandSelect: (command: Command) => void;
  }) => {
    return (
      <div
        onClick={e => {
          e.stopPropagation();
          e.preventDefault();
          onCommandSelect(command);
        }}
        className="flex items-center p-2 rounded hover:bg-[var(--list-hoverBackground)] cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--foreground)] truncate">
            {command.title}
          </div>
          <div className="text-xs opacity-75 text-[var(--descriptionForeground)] truncate">
            {command.description}
          </div>
        </div>
      </div>
    );
  }
);

export default CommandItem;
