import chalk from 'chalk';

export function errorOutput(...input: string[]) {
  let messages = input;

  return `${chalk.red('Error:')} ${messages.join('\n')}`;
}
