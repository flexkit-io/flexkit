import chalk from 'chalk';

export function paramOutput(text: string) {
  return `${chalk.gray('"')}${chalk.bold(text)}${chalk.gray('"')}`;
}
