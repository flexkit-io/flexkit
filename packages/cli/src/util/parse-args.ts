import arg from 'arg';
import commonArgs from './arg-common';

type ParserOptions = {
  permissive?: boolean;
};

type CommonArgs = typeof commonArgs;
type ArgSpec = Parameters<typeof arg>[0];

/**
 * Parses command line arguments.
 * Automatically includes a number of common flags such as `--help`.
 *
 * It takes three arguments: `args`, `flagsSpecification`, and `parserOptions`.
 * It returns an object with two keys: `{args, flags}`
 */
export default function parseArguments<T extends ArgSpec>(
  args: string[],
  flagsSpecification: T = {} as T,
  parserOptions: ParserOptions = {}
): {
  args: string[];
  flags: Omit<arg.Result<CommonArgs & T>, '_'>;
} {
  const { _: positional, ...rest } = arg({ ...commonArgs, ...flagsSpecification } as CommonArgs & T, {
    ...parserOptions,
    argv: args,
  });

  return { args: positional, flags: rest };
}
