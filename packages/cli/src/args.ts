import chalk from 'chalk';

export const help = (): string => `
  ${chalk.bold(`Flexkit CLI`)} [options] <command | path>

  ${chalk.dim('For command help, run `flexkit <command> --help`')}

  ${chalk.dim('Project setup:')}

      link                 [nameOrId]  Link the current folder to a project
      unlink                           Remove the link of the current folder
      project                          Manage projects (ls, add, rm)
      deploy                           Deploy the current schema and observe progress in real time
      deployments                      List and inspect schema deployments
      schema                           Pull, show and diff the deployed schema
      dev                              Run the custom tools and code skills from flexkit.tools.ts locally
      tools                            Manage the production custom-tools catalog

  ${chalk.dim('Data:')}

      records              <entity>    List, read, create, update and delete records
      search               <text>      Search the project's records
      query                <operation> Run a GraphQL query or mutation
      assets                           Manage project assets (upload, export)
      import               <input>     Import entities and assets from NDJSON, a directory or a tarball
      export               [dest]      Export the full dataset (entities + assets) to a tarball

  ${chalk.dim('AI:')}

      chat                 [prompt]    Talk to the project's Chat Agent
      automations                      Manage automations and start runs
      runs                             Follow, inspect and cancel automation runs
      approvals                        Approve or deny pending tool calls
      skills                           Manage project skills, or sync them with a folder
      knowledge                        Upload, search and link knowledge documents
      plugins                          Install and connect plugins
      mcp                              Connect AI clients to the project's MCP server

  ${chalk.dim('Account:')}

      activity                         Read the project's activity inbox
      usage                            Show usage and limits
      login                [email]     Logs into your Flexkit account
      logout                           Logs out of your account
      whoami                           Shows the username of the currently logged in user
      api                  <path>      Send an authenticated request to any API endpoint
      help                 [cmd]       Displays complete help for [cmd]

  ${chalk.dim('Global Options:')}

    -h, --help                     Output usage information
    -v, --version                  Output the version number
    --cwd                          Current working directory
    -A ${chalk.bold.underline('FILE')}, --local-config=${chalk.bold.underline('FILE')}   Path to the flexkit.config.[js|ts] file
    -Q ${chalk.bold.underline('DIR')}, --global-config=${chalk.bold.underline('DIR')}    Path to the global Flexkit directory
    -d, --debug                    Debug mode [off]
    --no-color                     No color mode [off]
    -S, --scope                    Set a custom scope
    -t ${chalk.underline('TOKEN')}, --token=${chalk.underline('TOKEN')}        Login token (or set FLEXKIT_TOKEN)
    -p ${chalk.underline('ID')}, --project=${chalk.underline('ID')}         Project to act on (default: linked project)
    --json                         Print JSON on stdout (project commands)
    -y, --yes                      Skip confirmation prompts

  ${chalk.dim('Examples:')}

  ${chalk.gray('–')} Deploy the current schema (run from the folder containing your flexkit.config.ts file)

    ${chalk.cyan(`$ flexkit deploy`)}

  ${chalk.gray('–')} Link this folder to a project, then list its automations

    ${chalk.cyan(`$ flexkit link my-shop`)}
    ${chalk.cyan(`$ flexkit automations ls`)}

  ${chalk.gray('–')} Show the usage information for the sub command ${chalk.dim('`deploy`')}

    ${chalk.cyan(`$ flexkit help deploy`)}
`;
