import { z } from 'zod';
import { stripJsonSchemaMeta } from './json-schema';
import type {
  Attribute,
  Config,
  Entity,
  JsonSchemaObject,
  ProjectConfig,
  UiAttribute,
  UiEntity,
  UiProjectSchema,
  ZodValidation,
} from './types';

/**
 * JSON Schema keywords the Studio form knows how to validate. Anything else
 * fails the deploy so a rule never silently disappears between the config and
 * the form.
 */
export const SUPPORTED_VALIDATION_KEYWORDS: ReadonlySet<string> = new Set([
  'type',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'enum',
  'const',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'minItems',
  'maxItems',
  'anyOf',
  'oneOf',
  'not',
  'description',
  'title',
]);

export const SUPPORTED_VALIDATION_FORMATS: ReadonlySet<string> = new Set([
  'email',
  'uri',
  'uuid',
  'date-time',
  'date',
  'time',
]);

type SerializationLocation = { entity?: string; attribute?: string };

/** Raised when a config cannot be turned into a deployable JSON schema. */
export class SchemaSerializationError extends Error {
  readonly entity: string | undefined;
  readonly attribute: string | undefined;

  constructor(reason: string, location: SerializationLocation = {}, options?: { cause?: unknown }) {
    const where = location.entity
      ? location.attribute
        ? `Attribute "${location.attribute}" of entity "${location.entity}": `
        : `Entity "${location.entity}": `
      : '';

    super(`${where}${reason}`, options);
    this.name = 'SchemaSerializationError';
    this.entity = location.entity;
    this.attribute = location.attribute;
  }
}

type ZodDef = {
  type?: string;
  checks?: { _zod: { def: { check?: string } } }[];
  innerType?: z.ZodType;
  in?: z.ZodType;
  out?: z.ZodType;
  element?: z.ZodType;
  options?: z.ZodType[];
  left?: z.ZodType;
  right?: z.ZodType;
  keyType?: z.ZodType;
  valueType?: z.ZodType;
  shape?: { [key: string]: z.ZodType };
  getter?: () => z.ZodType;
};

function getDef(schema: z.ZodType): ZodDef {
  return (schema as unknown as { _zod: { def: ZodDef } })._zod.def;
}

/**
 * `z.toJSONSchema` drops `.refine()` / `.superRefine()` / `.check()` without
 * complaint. Walk the schema and reject them explicitly: a rule that only ran
 * in the config author's head is worse than a deploy error.
 */
function findCustomCheck(schema: z.ZodType, seen = new Set<z.ZodType>()): boolean {
  if (seen.has(schema)) {
    return false;
  }

  seen.add(schema);
  const def = getDef(schema);

  if (def.checks?.some((check) => check._zod.def.check === 'custom')) {
    return true;
  }

  const children: (z.ZodType | undefined)[] = [
    def.innerType,
    def.in,
    def.out,
    def.element,
    def.left,
    def.right,
    def.keyType,
    def.valueType,
    ...(def.options ?? []),
    ...Object.values(def.shape ?? {}),
    ...(def.type === 'lazy' && def.getter ? [def.getter()] : []),
  ];

  return children.some((child) => child !== undefined && findCustomCheck(child, seen));
}

function assertSupportedJsonSchema(fragment: unknown, location: SerializationLocation, path: string[] = []): void {
  if (Array.isArray(fragment)) {
    fragment.forEach((entry, index) => {
      assertSupportedJsonSchema(entry, location, [...path, String(index)]);
    });

    return;
  }

  if (!fragment || typeof fragment !== 'object') {
    return;
  }

  for (const [key, value] of Object.entries(fragment as { [key: string]: unknown })) {
    const insideMap = path.length > 0 && path[path.length - 1] === 'properties';

    if (!insideMap && !SUPPORTED_VALIDATION_KEYWORDS.has(key)) {
      throw new SchemaSerializationError(
        `validation uses the JSON Schema keyword "${[...path, key].join('.')}", which the Studio form cannot enforce. Supported keywords: ${[...SUPPORTED_VALIDATION_KEYWORDS].join(', ')}.`,
        location
      );
    }

    if (!insideMap && key === 'format' && typeof value === 'string' && !SUPPORTED_VALIDATION_FORMATS.has(value)) {
      throw new SchemaSerializationError(
        `validation uses the format "${value}", which the Studio form cannot enforce. Supported formats: ${[...SUPPORTED_VALIDATION_FORMATS].join(', ')}.`,
        location
      );
    }

    if (key === 'properties' || key === 'items' || key === 'anyOf' || key === 'oneOf' || key === 'not') {
      assertSupportedJsonSchema(value, location, [...path, key]);
    } else if (insideMap) {
      assertSupportedJsonSchema(value, location, [...path, key]);
    }
  }
}

/**
 * Compiles an attribute's Zod validation to a JSON Schema (draft-07) fragment.
 * Throws `SchemaSerializationError` for anything the Studio cannot enforce.
 */
export function serializeValidation(validation: ZodValidation, location: SerializationLocation = {}): JsonSchemaObject {
  let schema: z.ZodType;

  try {
    schema = validation(z);
  } catch (error) {
    throw new SchemaSerializationError('validation() threw while building the Zod schema.', location, { cause: error });
  }

  if (findCustomCheck(schema)) {
    throw new SchemaSerializationError(
      'validation uses refine(), superRefine() or check(), which cannot be expressed as JSON Schema. Use built-in Zod checks such as min(), max(), length(), regex() or email().',
      location
    );
  }

  let fragment: unknown;

  try {
    fragment = z.toJSONSchema(schema, { target: 'draft-07', unrepresentable: 'throw' });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    throw new SchemaSerializationError(`validation cannot be expressed as JSON Schema: ${reason}`, location, {
      cause: error,
    });
  }

  const stripped = stripJsonSchemaMeta(fragment) as JsonSchemaObject;
  assertSupportedJsonSchema(stripped, location);

  return stripped;
}

function assertBooleanFlag(value: unknown, name: string, location: SerializationLocation): void {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new SchemaSerializationError(
      `"${name}" must be a boolean. Conditional callbacks are no longer supported; move the rule into the schema or drop it.`,
      location
    );
  }
}

function assertIconName(value: unknown, where: string, location: SerializationLocation): void {
  if (value !== undefined && typeof value !== 'string') {
    throw new SchemaSerializationError(
      `${where} must be a lucide icon name such as 'Tag'. React elements are no longer supported in flexkit.config.ts.`,
      location
    );
  }
}

export function serializeAttribute(attribute: Attribute, entityName: string): UiAttribute {
  const location = { entity: entityName, attribute: attribute.name };

  assertBooleanFlag(attribute.hidden, 'hidden', location);
  assertBooleanFlag(attribute.readOnly, 'readOnly', location);

  const { validation, ...rest } = attribute;

  if (validation === undefined) {
    return rest as UiAttribute;
  }

  if (typeof validation !== 'function') {
    throw new SchemaSerializationError('validation must be a function receiving the Zod namespace.', location);
  }

  return { ...rest, validation: serializeValidation(validation, location) } as UiAttribute;
}

export function serializeEntity(entity: Entity): UiEntity {
  const location = { entity: entity.name };

  assertIconName(entity.menu?.icon, 'menu.icon', location);
  entity.groups?.forEach((group) => {
    assertIconName(group.icon, `groups["${group.name}"].icon`, location);
    assertBooleanFlag(group.hidden, `groups["${group.name}"].hidden`, location);
  });

  const serialized: UiEntity = {
    name: entity.name,
    plural: entity.plural,
    attributes: entity.attributes.map((attribute) => serializeAttribute(attribute, entity.name)),
  };

  if (entity.display !== undefined) serialized.display = entity.display;
  if (entity.menu !== undefined) serialized.menu = entity.menu;
  if (entity.spaces !== undefined) serialized.spaces = entity.spaces;
  if (entity.groups !== undefined) serialized.groups = entity.groups;

  return serialized;
}

/**
 * Turns one project of a `flexkit.config.ts` into the payload `flexkit deploy`
 * sends. Only data survives: title, projectId, menuGroups, scopes, spaces and
 * the schema with validation compiled to JSON Schema.
 */
export function serializeProjectConfig(project: ProjectConfig): UiProjectSchema {
  if (!project || typeof project !== 'object' || typeof project.projectId !== 'string') {
    throw new SchemaSerializationError('each project needs a string "projectId".');
  }

  if (!Array.isArray(project.schema)) {
    throw new SchemaSerializationError('"schema" must be an array of entities.', {});
  }

  const serialized: UiProjectSchema = {
    projectId: project.projectId,
    schema: project.schema.map(serializeEntity),
  };

  if (project.title !== undefined) serialized.title = project.title;
  if (project.menuGroups !== undefined) serialized.menuGroups = project.menuGroups;
  if (project.scopes !== undefined) serialized.scopes = project.scopes;
  if (project.spaces !== undefined) serialized.spaces = project.spaces;

  return serialized;
}

/** Serializes a whole `flexkit.config.ts` export (one project or a list). */
export function serializeConfig(config: Config): UiProjectSchema[] {
  return (Array.isArray(config) ? config : [config]).map(serializeProjectConfig);
}
