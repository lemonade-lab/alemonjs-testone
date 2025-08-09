import { Connect } from '@/frontend/typing';
import { Button } from '@/frontend/ui/Button';
import { Input } from '@/frontend/ui/Input';
import { Message } from '@/frontend/core/message';
import * as _ from 'lodash-es';

export type FormMode = 'edit' | 'add' | '';

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

export default ConnectForm;
