import chalk from 'chalk';

// info('foo') === '> foo'
// info('foo', 'bar') === '> foo\nbar'
export function info(...msgs: string[]): string {
  return `${chalk.gray('>')} ${msgs.join('\n')}`;
}
