/**
 * input
 * @param input
 * @returns
 */
export const parseHtmlContent = (input: string): string => {
  return input
    .replace(/\n/g, '<br>')
    .replace(/@([^\s#]+)/g, '<strong>@$1</strong>')
    .replace(/#([^\s@]+)/g, '<strong>#$1</strong>');
};
