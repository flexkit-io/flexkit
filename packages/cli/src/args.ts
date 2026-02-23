import chalk from 'chalk';

export const help = (): string => `
  ${chalk.bold(`Flexkit CLI`)} [options] <command | path>

  ${chalk.dim('For command help, run `flexkit <command> --help`')}

  ${chalk.dim('Commands:')}

      deploy                           Deploy the current schema and observe progress in real time
      help                 [cmd]       Displays complete help for [cmd]
      login                [email]     Logs into your Flexkit's account
      logout                           Logs out of your account
      project                          Manage projects (ls, add, rm)
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

  ${chalk.gray('–')} Deploy the current schema (run from the folder containing your flexkit.config.ts file)

    ${chalk.cyan(`$ flexkit deploy`)}

  ${chalk.gray('–')} Show the usage information for the sub command ${chalk.dim('`deploy`')}

    ${chalk.cyan(`$ flexkit help deploy`)}
`;
