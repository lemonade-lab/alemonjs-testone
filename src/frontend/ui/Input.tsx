import classNames from 'classnames';
export function Input(
  props: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
) {
  const { className, ...rest } = props;
  return (
    <input
      className={classNames(
        'px-2 py-1 rounded-md flex items-center justify-center',
        'bg-[var(--vscode-input-background)]',
        'hover:bg-[var(--vscode-input-hoverBackground)]',
        'rounded-md',
        // 'bg-[var(--vscode-editor-background)]',
        'border border-[var(--vscode-sidebar-border)] focus:border-[var(--vscode-button-background)]',
        className
      )}
      {...rest}
    />
  );
}
