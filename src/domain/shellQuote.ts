/** One POSIX shell argument; literal apostrophes close/reopen the single-quoted segment. */
export function shellQuote(value: string): string {
  if (/[\x00-\x1f\x7f]/.test(value)) throw new Error('Control characters are not supported');
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}
export const shellCommand = (argv: string[]) => argv.map(shellQuote).join(' ');
