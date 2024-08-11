import chalk from 'chalk';

export function highlightOutput(text: string): string {
  return chalk.bold.underline(text);
}
