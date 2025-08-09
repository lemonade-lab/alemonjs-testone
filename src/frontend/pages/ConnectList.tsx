import { useState } from 'react';
import { Connect } from '@/frontend/typing';
import { Button } from '@/frontend/ui/Button';
import { Input } from '@/frontend/ui/Input';
import { saveConnect } from '@/frontend/core/connect';
import LoadingOutlined from '@ant-design/icons/LoadingOutlined';
import { Message } from '../core/message';
import * as _ from 'lodash-es';

const defaultForm: Connect = {
  host: '',
  port: 0,
  name: ''
};

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

type FormMode = 'edit' | 'add' | '';

const ConnectForm = ({
  formData,
  formType,
  setFormData,
  onClose,
  onSubmit
}: {
  formData: Connect;
  formType: FormMode;
  setFormData: (data: Connect) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) => {
  return (
    <form
      className="w-full flex flex-col gap-2 bg-[var(--editor-background)] rounded-lg p-4 shadow"
      onSubmit={onSubmit}
      style={{ minWidth: 320 }}
    >
      <Input
        type="text"
        name="name"
        disabled={formType === 'edit'}
        placeholder="备注"
        value={formData.name}
        onChange={e => {
          if (/^[\u4e00-\u9fa5_a-zA-Z0-9-]+$/.test(e.target.value)) {
            setFormData({ ...formData, name: e.target.value });
          } else {
            Message.info('备注只允许汉字、字母、数字');
          }
        }}
        required
      />
      <Input
        type="text"
        name="host"
        placeholder="地址"
        value={formData.host}
        onChange={e => {
          setFormData({ ...formData, host: e.target.value });
        }}
        required
      />
      <Input
        name="port"
        placeholder="端口"
        value={formData.port}
        onChange={e => {
          if (/^\d*$/.test(e.target.value)) {
            const value = Number(e.target.value);
            if (Number(e.target.value) > 65535 || value < 1) {
              setFormData({ ...formData, port: 1 });
              Message.info('端口号必须在1-65535之间');
              return;
            }
            setFormData({ ...formData, port: value });
          } else {
            setFormData({ ...formData, port: 1 });
          }
        }}
        required
      />
      <div className="flex flex-row gap-4 justify-end">
        <Button
          className="flex-1"
          type="button"
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            onClose();
          }}
        >
          取消
        </Button>
        <Button className="flex-1" type="submit">
          保存
        </Button>
      </div>
    </form>
  );
};

const ConnectList = ({
  value,
  onOk,
  onAdd,
  onUpdate,
  onDel,
  onCancel,
  connecting
}: {
  value: Connect[];
  onOk?: (data: Connect) => void;
  onAdd?: (data: Connect) => void;
  onUpdate?: (data: Connect) => void;
  onDel?: (data: Connect) => void;
  onCancel?: () => void;
  connecting?: boolean;
}) => {
  const [formType, setFormType] = useState<FormMode>('');
  const [formData, setFormData] = useState<Connect>(defaultForm);

  // 处理新增表单提交
  const onSubmit = _.debounce(() => {
    if (!formData.name || !formData.host || !formData.port) {
      Message.info('请填写完整的连接信息');
      return;
    }

    // 验证 host。域名、ip4、ip6
    const ip4Pattern =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ip6Pattern = /^(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;
    const domainPattern = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.[A-Za-z]{2,}$/;

    if (
      !ip4Pattern.test(formData.host) &&
      !ip6Pattern.test(formData.host) &&
      !domainPattern.test(formData.host)
    ) {
      Message.info('请输入有效的地址');
      return;
    }

    if (formType === 'add') {
      // 名字必须唯一
      if (value.some(item => item.name === formData.name)) {
        Message.info('连接名称已存在，请修改后重试');
        return;
      }
      if (onAdd) {
        onAdd(formData);
        saveConnect([...value, formData], '保存成功');
      }
    } else if (formType === 'edit') {
      if (onUpdate) {
        onUpdate(formData);
        saveConnect(
          value.map(item => (item.name === formData.name ? formData : item)),
          '保存成功'
        );
      }
    }
    setFormType('');
    setFormData(defaultForm);
  }, 400);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {connecting ? (
        <div className="w-full max-w-md flex flex-col items-center gap-4 p-4">
          <div className="flex gap-2 items-center">
            <LoadingOutlined />
            正在连接...
          </div>
          <Button
            onClick={() => {
              onCancel?.();
            }}
          >
            取消连接
          </Button>
        </div>
      ) : (
        <div className="w-full max-w-md flex flex-col items-center gap-4 p-4">
          {!formType &&
            Array.isArray(value) &&
            value.map((item, idx) => (
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
                onEdit={() => {
                  setFormData(item);
                  setFormType('edit');
                }}
              />
            ))}
          {formType == '' ? (
            <ConnectItem onClick={() => setFormType('add')}>
              + 添加新连接
            </ConnectItem>
          ) : (
            <ConnectForm
              formType={formType}
              formData={formData}
              setFormData={setFormData}
              onClose={() => {
                setFormType('');
              }}
              onSubmit={e => {
                e.preventDefault();
                onSubmit();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectList;
