import { User } from '@/frontend/typing';

const UserInfo = ({
  user
  // onUpdate
}: {
  user: User;
  onUpdate?: (user: User) => void;
}) => {
  return (
    <div className="flex items-center gap-2">
      <img
        src={user.UserAvatar}
        alt={user.UserName}
        className="w-8 h-8 rounded-full"
      />
      <div className="flex flex-col">
        <span className="font-semibold">{user.UserName}</span>
        <span className="text-xs text-gray-500">{user.UserId}</span>
      </div>
    </div>
  );
};

export default UserInfo;
