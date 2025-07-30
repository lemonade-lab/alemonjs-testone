import { useState } from 'react';
import { Connect } from '../typing';
import { Button } from '@/gui/ui/Button';
import { Input } from '@/gui/ui/Input';
import { saveConnect } from '../core/connect';

const defaultForm: Connect = {
  host: '',
  port: 0,
  name: ''
};

const ConnectItem = ({
  onClick,
  item,
  onDelete,
  children
}: {
  onClick?: () => void;
  item?: Connect;
  onDelete?: () => void;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className="w-full px-6 py-4 min-w-[35px] bg-[var(--vscode-editor-background)] rounded-lg flex flex-row justify-between items-center gap-4 transition-all hover:bg-[var(--vscode-editorGroupHeader-tabsBackground)] shadow cursor-pointer"
      onClick={e => {
        e.stopPropagation();
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
        onDelete && (
          <div className="mn:flex flex-row gap-2 items-center hidden ">
            <Button
              onClick={e => {
                e.stopPropagation();
                onDelete();
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

const ConnectList = ({
  value,
  onOk,
  onAdd,
  onDel
}: {
  value: Connect[];
  onOk?: (data: Connect) => void;
  onAdd?: (data: Connect) => void;
  onDel?: (data: Connect) => void;
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState<Connect>(defaultForm);
  // 处理新增表单提交
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name || !formData.host || !formData.port) {
      // 要弹出vscode消息。
      return;
    }
    // 名字必须唯一
    if (value.some(item => item.name === formData.name)) {
      // 要弹出vscode消息。
      return;
    }
    if (onAdd) {
      onAdd(formData);
    }
    saveConnect([...value, formData], '保存成功');
    setShowAdd(false);
    setFormData(defaultForm);
  };
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="w-full max-w-md flex flex-col items-center gap-4 p-4">
        {value.map((item, idx) => (
          <ConnectItem
            key={idx}
            onClick={() => {
              // 点击连接
              onOk?.(item);
              // 把连接的。排序。放到最前面
              const newList = value.filter(
                connect => connect.name !== item.name
              );
              saveConnect([item, ...newList], '');
            }}
            item={item}
            onDelete={() => {
              onDel?.(item);
              const newList = value.filter(
                connect => connect.name !== item.name
              );
              console.log('newList', newList);
              saveConnect(newList, '删除成功');
            }}
          />
        ))}
        {!showAdd ? (
          <ConnectItem onClick={() => setShowAdd(true)}>
            + 添加新连接
          </ConnectItem>
        ) : (
          <form
            className="w-full flex flex-col gap-2 bg-[var(--vscode-editor-background)] rounded-lg p-4 shadow"
            onSubmit={onSubmit}
            style={{ minWidth: 320 }}
          >
            <Input
              type="text"
              name="name"
              placeholder="备注"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              type="text"
              name="host"
              placeholder="地址"
              value={formData.host}
              onChange={e => setFormData({ ...formData, host: e.target.value })}
              required
            />
            <Input
              type="number"
              name="port"
              placeholder="端口"
              value={formData.port}
              onChange={e =>
                setFormData({ ...formData, port: Number(e.target.value) })
              }
              required
            />
            <div className="flex flex-row gap-4 justify-end">
              <Button
                className="flex-1"
                type="button"
                onClick={() => setShowAdd(false)}
              >
                取消
              </Button>
              <Button className="flex-1" type="submit">
                保存
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ConnectList;
