import type { Config } from './types';

export function defineConfig<T extends Config>(config: T): T {
  return config;
}

// export function defineType<
//   TType extends string | IntrinsicTypeName, // IntrinsicTypeName here improves autocompletion in _some_ IDEs (not VS Code atm)
//   TName extends string,
//   TSelect extends Record<string, string> | undefined,
//   TPrepareValue extends Record<keyof TSelect, any> | undefined,
//   TAlias extends IntrinsicTypeName | undefined,
//   TStrict extends StrictDefinition,
// >(
//   schemaDefinition: {
//     type: TType;
//     name: TName;
//   } & DefineSchemaBase<TType, TAlias> &
//     NarrowPreview<TType, TAlias, TSelect, TPrepareValue> &
//     MaybeAllowUnknownProps<TStrict>,

//   // eslint-disable-next-line @typescript-eslint/no-unused-vars -- x
//   defineOptions?: DefineSchemaOptions<TStrict, TAlias>
// ): typeof schemaDefinition {
//   return schemaDefinition;
// }
