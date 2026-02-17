import chalk from 'chalk';

export const help = (): string => `
  ${chalk.bold(`Flexkit CLI`)} [options] <command | path>

  ${chalk.dim('For deploy command help, run `flexkit deploy --help`')}

  ${chalk.dim('Commands:')}

      help                 [cmd]       Displays complete help for [cmd]
      login                [email]     Logs into your Flexkit's account
      logout                           Logs out of your account
      project                          Manage projects (ls, add, rm)
      sync                             Synchronize the current schema with the backend to ensure your data structure is up-to-date
      whoami                           Shows the username of the currently logged in user

  ${chalk.dim('Global Options:')}

    -h, --help                     Output usage information
    -v, --version                  Output the version number
    --cwd                          Current working directory
    -A ${chalk.bold.underline('FILE')}, --local-config=${chalk.bold.underline('FILE')}   Path to the flexkit.config.[js|ts|jsx|tsx] file
    -Q ${chalk.bold.underline('DIR')}, --global-config=${chalk.bold.underline('DIR')}    Path to the global Flexkit directory
    -d, --debug                    Debug mode [off]
    --no-color                     No color mode [off]
    -S, --scope                    Set a custom scope
    -t ${chalk.underline('TOKEN')}, --token=${chalk.underline('TOKEN')}        Login token

  ${chalk.dim('Examples:')}

  ${chalk.gray('–')} Synchronize the current schema with the dataset (cd into your project directory where your flexkit.config.ts file is located)

    ${chalk.cyan(`$ flexkit sync`)}

  ${chalk.gray('–')} Show the usage information for the sub command ${chalk.dim('`sync`')}

    ${chalk.cyan(`$ flexkit help sync`)}
`;
