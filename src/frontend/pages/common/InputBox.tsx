import * as _ from 'lodash-es';
import Textarea from '@/frontend/component/Textarea';
import CommandList from '@/frontend/component/CommandList';
import PopoverBox from '@/frontend/ui/PopoverBox';

import ClearOutlined from '@ant-design/icons/ClearOutlined';
import OrderedListOutlined from '@ant-design/icons/OrderedListOutlined';
import { useState } from 'react';
import { Command, User } from '@/frontend/typing';

const InputBox = ({
  value,
  commands,
  userList,
  onInput,
  onSend,
  onClear,
  onSelect,
  onCommand,
  onTimer,
  onCancelSelect,
  selectMode = false,
  selectedCount = 0
}: {
  value: string;
  commands: Command[];
  userList: User[];
  onInput: (value: string) => void;
  onSend: () => void;
  onClear: () => void;
  onSelect: () => void; // 在选择模式下触发删除已选
  onCommand: (command: Command) => void;
  onTimer: () => void;
  onCancelSelect?: () => void;
  selectMode?: boolean;
  selectedCount?: number;
}) => {
  const [showCommands, setShowCommands] = useState(false);
  const [showClearPopover, setShowClearPopover] = useState(false);
  return (
    <div className="relative">
      <CommandList
        commands={commands}
        onCommandSelect={onCommand}
        open={showCommands}
        onClose={() => setShowCommands(false)}
        onTimer={onTimer}
      />
      <PopoverBox
        open={showClearPopover}
        onClose={() => setShowClearPopover(false)}
        direction="right"
        className="min-w-24"
      >
        <div className="px-2">
          {!selectMode && (
            <div
              className="flex cursor-pointer gap-1"
              onClick={() => onSelect()}
            >
              <OrderedListOutlined />
              选择删除
            </div>
          )}
          {selectMode && (
            <div className="flex flex-col gap-1">
              <div
                className="flex cursor-pointer gap-1"
                onClick={() => onSelect()}
              >
                <OrderedListOutlined /> 删除所选({selectedCount})
              </div>
              <div
                className="flex justify-end cursor-pointer gap-1 text-xs text-gray-500"
                onClick={() => onCancelSelect?.()}
              >
                取消选择
              </div>
            </div>
          )}
          <div className="flex cursor-pointer gap-1" onClick={() => onClear()}>
            <ClearOutlined />
            删除所有
          </div>
        </div>
      </PopoverBox>
      <Textarea
        value={value}
        onContentChange={onInput}
        onClickSend={onSend}
        onAppClick={action => {
          if (action === 'commands') {
            setShowCommands(!showCommands);
          }
          if (action === 'chatlogs') {
            setShowClearPopover(true);
          }
        }}
        userList={userList}
      />
    </div>
  );
};

export default InputBox;
