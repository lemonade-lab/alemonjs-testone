import { Connect } from '@/frontend/typing';
import { Button } from '@/frontend/ui/Button';
import * as _ from 'lodash-es';

const ConnectItem = ({
  onClick,
  item,
  onDelete,
  onEdit,
  children
}: {
  onClick?: () => void;
  item?: Connect;
  onDelete?: () => void;
  onEdit?: (item: Connect) => void;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className="w-full px-6 py-4 min-w-[35px] bg-[var(--editor-background)] rounded-lg flex flex-row justify-between items-center gap-4 transition-all hover:bg-[var(--editorGroupHeader-tabsBackground)] shadow cursor-pointer"
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
        onClick && onClick();
      }}
    >
      {children}
      {item && (
        <div className="flex flex-col">
          <span className="font-semibold">{item.name}</span>
          <span className="text-xs text-gray-400">
            {item.host}:{item.port}
          </span>
        </div>
      )}
      {
        // 按钮在窗口宽度小于35px时不显示
        (onDelete || onEdit) && (
          <div className="flex flex-row gap-2 items-center  ">
            <Button
              className="hidden xs:block"
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                onEdit && item && onEdit(item);
              }}
            >
              编辑
            </Button>
            <Button
              className="hidden mn:block"
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                onDelete && onDelete();
              }}
            >
              删除
            </Button>
          </div>
        )
      }
    </div>
  );
};

export default ConnectItem;
