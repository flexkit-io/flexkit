import chalk from 'chalk';

export default function cmd(text: string): string {
  return `${chalk.gray('`')}${chalk.cyan(text)}${chalk.gray('`')}`;
}
