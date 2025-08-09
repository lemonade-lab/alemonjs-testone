import { memo } from 'react';
import { Command } from '@/frontend/typing';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import FieldTimeOutlined from '@ant-design/icons/FieldTimeOutlined';

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

const CommandList = ({
  commands = [],
  onCommandSelect,
  isVisible,
  onClose = () => {},
  // 定时任务
  onTimer = () => {}
}: {
  commands: Command[];
  onCommandSelect: (command: Command) => void;
  isVisible: boolean;
  onClose?: () => void;
  onTimer?: () => void;
}) => {
  if (!isVisible || commands.length === 0) return <div />;

  return (
    <div className="absolute p-1 mx-4 bottom-full left-0 w-44 max-h-60 bg-[var(--dropdown-background)] border border-[var(--dropdown-border)] rounded-md shadow-lg z-10">
      <div className="flex justify-between text-sm text-[var(--descriptionForeground)] border-b border-[var(--dropdown-border)] p-1">
        <div className="">指令列表</div>
        <div className="flex gap-2">
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
      <div className="shadow-inner rounded-md py-1">
        <div className="overflow-y-auto scrollbar max-h-48">
          {Array.isArray(commands) &&
            commands.map((command, index) => (
              <CommandItem
                key={index}
                command={command}
                onCommandSelect={onCommandSelect}
              />
            ))}
        </div>
      </div>
    </div>
  );
};
export default memo(CommandList);
