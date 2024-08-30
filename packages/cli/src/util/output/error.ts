import chalk from 'chalk';

export function errorOutput(...input: string[]): string {
  const messages = input;

  return `${chalk.red('Error:')} ${messages.join('\n')}`;
}
