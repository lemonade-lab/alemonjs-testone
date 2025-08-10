import { useCallback, useState, useEffect, useRef } from 'react';
import { Connect } from '@/frontend/typing';
import { Button } from '@/frontend/ui/Button';
import { saveConnect } from '@/frontend/core/connect';
import LoadingOutlined from '@ant-design/icons/LoadingOutlined';
import { Message } from '@/frontend/core/message';
import * as _ from 'lodash-es';
import ConnectItem from './ConnectItem';
import ConnectForm, { FormMode } from './ConnectForm';
import { useAppDispatch, useAppSelector } from '@/frontend/store';
import {
  wsCancel,
  wsConnectRequest,
  wsSetAllowRestart,
  wsSetPersistent
} from '@/frontend/store/slices/socketSlice';
import {
  addConnect,
  bumpToTop,
  deleteConnect,
  updateConnect
} from '@/frontend/store/slices/connectSlice';

const defaultForm: Connect = {
  host: '',
  port: 0,
  name: ''
};

const ip4Pattern =
  /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

const ip6Pattern = /^(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;

const domainPattern = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.[A-Za-z]{2,}$/;

const ConnectList = () => {
  const dispatch = useAppDispatch();
  const { isConnecting, isRestarting, connected, autoConnectEnabled } =
    useAppSelector(s => s.socket);
  const connecting = isConnecting || isRestarting; // 统一 loading 判定
  const connectList = useAppSelector(s => s.connect.list);
  const value = connectList;
  const onCancel = () => dispatch(wsCancel());
  const onAdd = (c: Connect) => dispatch(addConnect(c));
  const onUpdate = (c: Connect) => dispatch(updateConnect(c));
  const onDel = (c: Connect) => dispatch(deleteConnect(c.name));

  const onOk = useCallback(
    (
      c: { host: string; port: number; name: string },
      options?: { persistent?: boolean }
    ) => {
      dispatch(wsSetAllowRestart(true));
      // 用户手动点击才开启持久重连
      dispatch(wsSetPersistent(!!options?.persistent));
      dispatch(wsConnectRequest(c));
      dispatch(bumpToTop(c.name));
    },
    [dispatch]
  );

  const [formType, setFormType] = useState<FormMode>('');
  const [formData, setFormData] = useState<Connect>(defaultForm);
  // 用户是否有交互（点击、打开表单等）
  const [userInteracted, setUserInteracted] = useState(false);
  const autoTriedRef = useRef(false);

  // 处理新增表单提交
  const onSubmit = _.debounce(() => {
    if (!formData.name || !formData.host || !formData.port) {
      Message.info('请填写完整的连接信息');
      return;
    }

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
                  setUserInteracted(true);
                  // 点击连接
                  onOk?.(item, { persistent: true });
                  // 把连接的。排序。放到最前面
                  const newList = value.filter(
                    connect => connect.name !== item.name
                  );
                  saveConnect([item, ...newList], '');
                }}
                item={item}
                onDelete={() => {
                  setUserInteracted(true);
                  onDel?.(item);
                  const newList = value.filter(
                    connect => connect.name !== item.name
                  );
                  console.log('newList', newList);
                  saveConnect(newList, '删除成功');
                }}
                onEdit={() => {
                  setUserInteracted(true);
                  setFormData(item);
                  setFormType('edit');
                }}
              />
            ))}
          {formType == '' ? (
            <ConnectItem
              onClick={() => {
                setUserInteracted(true);
                setFormType('add');
              }}
            >
              + 添加新连接
            </ConnectItem>
          ) : (
            <ConnectForm
              formType={formType}
              formData={formData}
              setFormData={setFormData}
              onClose={() => {
                setUserInteracted(true);
                setFormType('');
              }}
              onSubmit={e => {
                setUserInteracted(true);
                e.preventDefault();
                onSubmit();
              }}
            />
          )}
        </div>
      )}
      {/* 自动连接逻辑：组件挂载后 1s 内没有任何交互且存在连接项则自动连接第一个 */}
      <AutoConnectHelper
        shouldAttempt={
          autoConnectEnabled &&
          !userInteracted &&
          !autoTriedRef.current &&
          !connecting &&
          !connected
        }
        hasItem={value.length > 0}
        onTrigger={() => {
          if (!value.length) return;
          autoTriedRef.current = true;
          // 自动触发不启用持久重连
          onOk?.(value[0], { persistent: false });
          // 保持排序一致
          const newList = value.slice(1);
          saveConnect([value[0], ...newList], '');
        }}
      />
    </div>
  );
};

// 分离出一个组件以便使用 hooks，不干扰上面逻辑
const AutoConnectHelper = ({
  shouldAttempt,
  hasItem,
  onTrigger
}: {
  shouldAttempt: boolean;
  hasItem: boolean;
  onTrigger: () => void;
}) => {
  useEffect(() => {
    if (!shouldAttempt || !hasItem) return;
    const timer = setTimeout(() => {
      onTrigger();
    }, 1000); // 1s 无操作自动连接
    return () => clearTimeout(timer);
  }, [shouldAttempt, hasItem, onTrigger]);
  return null;
};

export default ConnectList;
