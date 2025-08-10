import { useAppSelector } from '@/frontend/store';
import { NavActions } from './NavActions';

const Footer = ({ children }: { children: React.ReactNode }) => {
  const { current: user } = useAppSelector(s => s.users);
  return (
    <footer className="flex justify-between border-b border-[--panel-border] px-2 py-1">
      <div className="flex gap-2">
        {children}
        <div className=" flex md:hidden gap-2">
          [{user?.UserName || '未登录'}] [{user?.UserId || '未登录'}]
        </div>
      </div>
      <NavActions />
    </footer>
  );
};

export default Footer;
