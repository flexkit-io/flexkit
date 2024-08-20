import type Client from '../client';
import { errorOutput } from '../output/error';
import { getCommandName } from '../pkg';

export async function readInput(client: Client, message: string): Promise<string> {
  let input;

  while (!input) {
    try {
      input = await client.input.text({ message });
    } catch (err) {
      client.output.print('\n'); // \n

      // @ts-expect-error -- error type from inquirer not defined
      if (err.isTtyError) {
        throw new Error(
          errorOutput(`Interactive mode not supported – please run ${getCommandName(`login you@domain.com`)}`)
        );
      }
    }
  }

  return input;
}
