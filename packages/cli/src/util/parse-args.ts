import arg from 'arg';
import commonArgs from './arg-common';

type ParserOptions = {
  permissive?: boolean;
};

type CommonArgs = typeof commonArgs;

/**
 * Parses command line arguments.
 * Automatically includes a number of common flags such as `--help`.
 *
 * It takes three arguments: `args`, `flagsSpecification`, and `parserOptions`.
 * It returns an object with two keys: `{args, flags}`
 */
export default function parseArguments(
  args: string[],
  flagsSpecification: CommonArgs | object = {},
  parserOptions: ParserOptions = {}
): {
  args: string[];
  flags: Omit<arg.Result<CommonArgs>, '_'>;
} {
  const { _: positional, ...rest } = arg(
    { ...commonArgs, ...flagsSpecification },
    {
      ...parserOptions,
      argv: args,
    }
  );

  return { args: positional, flags: rest };
}
