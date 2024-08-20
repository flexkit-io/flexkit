import arg from 'arg';
import getCommonArgs from './arg-common';

type Handler = (value: string) => unknown;

interface Spec {
  [key: string]: string | Handler | [Handler];
}

type ParserOptions = {
  permissive?: boolean;
};

/**
 * Parses command line arguments.
 * Automatically includes a number of common flags such as `--help`.
 *
 * It takes three arguments: `args`, `flagsSpecification`, and `parserOptions`.
 * It returns an object with two keys: `{args, flags}`
 */
export default function parseArguments<T extends Spec>(
  args: string[],
  flagsSpecification: T = {} as T,
  parserOptions: ParserOptions = {}
): {
  args: string[];
  flags: Omit<arg.Result<T>, '_'>;
} {
  const { _: positional, ...rest } = arg(
    { ...getCommonArgs(), ...flagsSpecification },
    {
      ...parserOptions,
      argv: args,
    }
  );

  return { args: positional, flags: rest };
}
