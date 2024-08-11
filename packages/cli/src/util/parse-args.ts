import arg from 'arg';
import getCommonArgs from './arg-common';

type Handler = (value: string) => any;

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
) {
  // currently parseArgument (and arg as a whole) will hang
  // if there are cycles in the flagsSpecification
  const { _: positional, ...rest } = arg(Object.assign({}, getCommonArgs(), flagsSpecification), {
    ...parserOptions,
    argv: args,
  });

  return { args: positional, flags: rest };
}
