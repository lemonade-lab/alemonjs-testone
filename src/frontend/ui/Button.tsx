import classNames from 'classnames';
export function Button(
  props: React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >
) {
  const { className, ...rest } = props;
  return (
    <button
      type="button"
      className={classNames(
        'px-2 py-1 rounded-md flex items-center justify-center ',
        'bg-[var(--vscode-button-background)]',
        'hover:bg-[var(--vscode-button-hoverBackground)]',
        'border border-[var(--vscode-button-border)]',
        'rounded-md',
        className
      )}
      {...rest}
    />
  );
}
