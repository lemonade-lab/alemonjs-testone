import { memo } from 'react';
import { Command } from '../typing';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';

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
    <div className="absolute p-1 mx-4 bottom-full left-0 w-44 max-h-60 bg-[var(--vscode-dropdown-background)] border border-[var(--vscode-dropdown-border)] rounded-md shadow-lg z-10">
      <div className="flex justify-between text-sm text-[var(--vscode-descriptionForeground)] ">
        <div className="">指令列表</div>
        <div onClick={onClose} className="cursor-pointer">
          <CloseCircleOutlined />
        </div>
      </div>
      <div className="overflow-y-auto scrollbar  max-h-48 shadow-inner rounded-md">
        {commands.map((command, index) => (
          <div
            key={index}
            onClick={() => onCommandSelect(command)}
            className="flex items-center p-2 rounded hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--vscode-foreground)] truncate">
                {command.title}
              </div>
              <div className="text-xs opacity-75 text-[var(--vscode-descriptionForeground)] truncate">
                {command.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(CommandList);
