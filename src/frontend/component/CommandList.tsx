import { memo } from 'react';
import { Command } from '@/frontend/typing';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';

export const CommandItem = memo(
  ({
    command,
    onCommandSelect
  }: {
    command: Command;
    onCommandSelect: (command: Command) => void;
  }) => {
    return (
      <div
        onClick={() => onCommandSelect(command)}
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

const CommandList = ({
  commands = [],
  onCommandSelect,
  isVisible,
  onClose = () => {}
}: {
  commands: Command[];
  onCommandSelect: (command: Command) => void;
  isVisible: boolean;
  onClose?: () => void;
}) => {
  if (!isVisible || commands.length === 0) return <div />;

  return (
    <div className="absolute p-1 mx-4 bottom-full left-0 w-44 max-h-60 bg-[var(--dropdown-background)] border border-[var(--dropdown-border)] rounded-md shadow-lg z-10">
      <div className="flex justify-between text-sm text-[var(--descriptionForeground)]">
        <div className="">指令列表</div>
        <div onClick={onClose} className="cursor-pointer">
          <CloseCircleOutlined />
        </div>
      </div>
      <div className="overflow-y-auto scrollbar max-h-48 shadow-inner rounded-md">
        {commands.map((command, index) => (
          <CommandItem
            key={index}
            command={command}
            onCommandSelect={onCommandSelect}
          />
        ))}
      </div>
    </div>
  );
};
export default memo(CommandList);
