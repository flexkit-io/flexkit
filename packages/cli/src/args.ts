import chalk from 'chalk';

export const help = (): string => `
  ${chalk.bold(`Flexkit CLI`)} [options] <command | path>

  ${chalk.dim('For deploy command help, run `flexkit deploy --help`')}

  ${chalk.dim('Commands:')}

    ${chalk.dim('Basic')}

      help                 [cmd]       Displays complete help for [cmd]
      init                 [example]   Initialize an example project
      login                [email]     Logs into your Flexkit's account
      logout                           Logs out of your account
      sync                             Synchronize the current schema with the backend to ensure your data structure is up-to-date

    ${chalk.dim('Advanced')}

      alias                [cmd]       Manages your domain aliases
      bisect                           Use binary search to find the deployment that introduced a bug
      certs                [cmd]       Manages your SSL certificates
      dns                  [name]      Manages your DNS records
      domains              [name]      Manages your domain names
      logs                 [url]       Displays the logs for a deployment
      projects                         Manages your Projects
      rm | remove          [id]        Removes a deployment
      secrets              [name]      Manages your global Secrets, for use in Environment Variables
      teams                            Manages your teams
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

  ${chalk.gray('–')} Deploy the current directory

    ${chalk.cyan(`$ flexkit`)}

  ${chalk.gray('–')} Deploy a custom path

    ${chalk.cyan(`$ flexkit /usr/src/project`)}

  ${chalk.gray('–')} Deploy with Environment Variables

    ${chalk.cyan(`$ flexkit -e NODE_ENV=production`)}

  ${chalk.gray('–')} Show the usage information for the sub command ${chalk.dim('`list`')}

    ${chalk.cyan(`$ flexkit help list`)}
`;
