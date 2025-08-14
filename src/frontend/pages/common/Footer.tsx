import { useAppDispatch, useAppSelector } from '@/frontend/store';
import { NavActions } from './NavActions';
import Select from '@/frontend/ui/Select';
import { setCurrentUser } from '@/frontend/store/slices/userSlice';

const Footer = ({ children }: { children: React.ReactNode }) => {
  const { current: user, users } = useAppSelector(s => s.users);
  const dispatch = useAppDispatch();
  return (
    <footer className="flex justify-between border-b border-[--panel-border] px-2 py-1">
      <div className="flex gap-2 items-center justify-center">
        {children}
        <div className="flex md:hidden gap-2">
          <Select
            className="py-0 px-0"
            value={user?.UserId || ''}
            options={users.map(u => ({
              ...u,
              value: u.UserId,
              label: u.UserName
            }))}
            onSelect={value => {
              const user = users.find(u => u.UserId === value);
              if (!user) {
                return;
              }
              dispatch(setCurrentUser(user));
            }}
          />
          {user?.UserId}
        </div>
      </div>
      <NavActions />
    </footer>
  );
};

export default Footer;
