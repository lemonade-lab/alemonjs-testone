import { NavActions } from './NavActions';

const Header = () => {
  // vscode 不需要 header
  if (window.vscode) {
    return <> </>;
  }
  return (
    <header className="flex justify-between border-b border-[--panel-border] px-4 py-2">
      <div className="flex items-center">
        <div>ALemonTestOne</div>
      </div>
      <NavActions autoTooltipPlacement="bottom" />
    </header>
  );
};

export default Header;
