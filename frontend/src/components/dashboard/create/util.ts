export function replaceNewLines(text?: string): string {
  return (text ?? '').replaceAll(/<br\s*\/?>/g, '\n')
}
