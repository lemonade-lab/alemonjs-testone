import { PageTag } from '../typing';
import SyncOutlined from '@ant-design/icons/SyncOutlined';
import TagOutlined from '@ant-design/icons/TagOutlined';
import TagsOutlined from '@ant-design/icons/TagsOutlined';

const Header = ({ onClick }: { onClick?: (type: PageTag) => void }) => {
  return (
    <header className="flex gap-2 justify-end border-b p-4">
      <div className="cursor-pointer" onClick={() => onClick?.('group')}>
        <TagsOutlined />
      </div>
      <div className="cursor-pointer" onClick={() => onClick?.('private')}>
        <TagOutlined />
      </div>
      <div className="cursor-pointer" onClick={() => onClick?.('connect')}>
        <SyncOutlined />
      </div>
    </header>
  );
};

export default Header;
