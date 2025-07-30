import { PropsWithChildren } from 'react';
export default function MessageHeader({
  value,
  children,
  onClick
}: {
  value: {
    Avatar: string;
    Id: string;
    Name: string;
  };
  onClick?: () => void;
} & PropsWithChildren) {
  return (
    <section className="select-none flex flex-row justify-between items-center w-full shadow-md">
      <div className="flex flex-row gap-3 px-2 py-1">
        <div className="flex items-center cursor-pointer" onClick={onClick}>
          {value.Avatar && value.Avatar != '' ? (
            <img
              className="w-10 h-10 rounded-full"
              src={value.Avatar}
              alt="Avatar"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white"></div>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <div className="font-semibold ">{value.Name}</div>
          <div className="text-sm text-[var(--vscode-textPreformat-background)]">
            {value.Id}
          </div>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}
