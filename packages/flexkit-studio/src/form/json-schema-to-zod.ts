import { z } from 'zod';
import type { JsonSchemaObject } from '../core/types';

/**
 * Builds a Zod schema from the JSON Schema fragment `flexkit deploy` compiled
 * out of the config's `validation`. Only the keywords the serializer allows
 * are handled (see `SUPPORTED_VALIDATION_KEYWORDS` in `@flexkit/schema`);
 * anything else is ignored with a one-time warning.
 *
 * Messages are generated from the attribute label: authored Zod messages do
 * not survive the JSON Schema round trip.
 */
export function jsonSchemaToZod(schema: JsonSchemaObject, label: string): z.ZodType {
  return convert(schema, label);
}

const warned = new Set<string>();

function warnOnce(keyword: string): void {
  if (warned.has(keyword)) {
    return;
  }

  warned.add(keyword);
  console.warn(`[flexkit] validation keyword "${keyword}" is not supported by the Studio form and was ignored.`);
}

const HANDLED_KEYWORDS = new Set([
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
  '$schema',
]);

const FORMAT_MESSAGES: { [format: string]: string } = {
  email: 'must be a valid email address',
  uri: 'must be a valid URL',
  uuid: 'must be a valid UUID',
  'date-time': 'must be a valid date and time',
  date: 'must be a valid date',
  time: 'must be a valid time',
};

function isObject(value: unknown): value is JsonSchemaObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function literal(value: unknown): z.ZodType {
  if (value === null) return z.null();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return z.literal(value);

  return z.any().refine((candidate) => JSON.stringify(candidate) === JSON.stringify(value));
}

function unionOf(options: z.ZodType[], label: string): z.ZodType {
  if (options.length === 0) return z.any();
  if (options.length === 1) return options[0]!;

  return z.union(options as [z.ZodType, z.ZodType, ...z.ZodType[]], { error: `${label} is invalid` });
}

function convertString(schema: JsonSchemaObject, label: string): z.ZodType {
  let result = z.string({ error: `${label} must be text` });
  const format = typeof schema.format === 'string' ? schema.format : undefined;
  const formatMessage = format ? (FORMAT_MESSAGES[format] ?? `must match the ${format} format`) : 'has an invalid format';

  if (typeof schema.minLength === 'number') {
    const min = schema.minLength;
    result = result.min(min, { error: min <= 1 ? `${label} is required` : `${label} must be at least ${String(min)} characters` });
  }

  if (typeof schema.maxLength === 'number') {
    result = result.max(schema.maxLength, { error: `${label} must be at most ${String(schema.maxLength)} characters` });
  }

  if (typeof schema.pattern === 'string') {
    try {
      result = result.regex(new RegExp(schema.pattern), { error: `${label} ${formatMessage}` });
    } catch {
      warnOnce(`pattern:${schema.pattern}`);
    }
  }

  return result;
}

const SAFE_BOUNDS = new Set([Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);

function convertNumber(schema: JsonSchemaObject, label: string, integer: boolean): z.ZodType {
  let result = z.number({ error: `${label} must be a number` });

  if (integer) {
    result = result.int({ error: `${label} must be a whole number` });
  }

  const minimum = typeof schema.minimum === 'number' && !SAFE_BOUNDS.has(schema.minimum) ? schema.minimum : undefined;
  const maximum = typeof schema.maximum === 'number' && !SAFE_BOUNDS.has(schema.maximum) ? schema.maximum : undefined;
  const between =
    minimum !== undefined && maximum !== undefined ? `${label} must be between ${String(minimum)} and ${String(maximum)}` : undefined;

  if (minimum !== undefined) {
    result = result.min(minimum, { error: between ?? `${label} must be at least ${String(minimum)}` });
  }

  if (maximum !== undefined) {
    result = result.max(maximum, { error: between ?? `${label} must be at most ${String(maximum)}` });
  }

  if (typeof schema.exclusiveMinimum === 'number') {
    result = result.gt(schema.exclusiveMinimum, { error: `${label} must be greater than ${String(schema.exclusiveMinimum)}` });
  }

  if (typeof schema.exclusiveMaximum === 'number') {
    result = result.lt(schema.exclusiveMaximum, { error: `${label} must be less than ${String(schema.exclusiveMaximum)}` });
  }

  if (typeof schema.multipleOf === 'number') {
    result = result.multipleOf(schema.multipleOf, { error: `${label} must be a multiple of ${String(schema.multipleOf)}` });
  }

  return result;
}

function convertArray(schema: JsonSchemaObject, label: string): z.ZodType {
  let result = z.array(isObject(schema.items) ? convert(schema.items, label) : z.any(), {
    error: `${label} must be a list`,
  });

  if (typeof schema.minItems === 'number') {
    result = result.min(schema.minItems, {
      error: schema.minItems <= 1 ? `${label} is required` : `${label} needs at least ${String(schema.minItems)} items`,
    });
  }

  if (typeof schema.maxItems === 'number') {
    result = result.max(schema.maxItems, { error: `${label} allows at most ${String(schema.maxItems)} items` });
  }

  return result;
}

function convertObject(schema: JsonSchemaObject, label: string): z.ZodType {
  const properties = isObject(schema.properties) ? schema.properties : {};
  const required = new Set(Array.isArray(schema.required) ? schema.required.filter((key) => typeof key === 'string') : []);
  const shape: { [key: string]: z.ZodType } = {};

  for (const [key, property] of Object.entries(properties)) {
    const converted = isObject(property) ? convert(property, `${label} ${key}`) : z.any();
    shape[key] = required.has(key) ? converted : converted.optional();
  }

  // `additionalProperties: false` is what Zod emits for every z.object(), whose
  // authored behaviour is to strip unknown keys, not reject them. Mirror that.
  return z.object(shape, { error: `${label} is required` });
}

function convertByType(type: unknown, schema: JsonSchemaObject, label: string): z.ZodType {
  switch (type) {
    case 'string':
      return convertString(schema, label);
    case 'integer':
      return convertNumber(schema, label, true);
    case 'number':
      return convertNumber(schema, label, false);
    case 'boolean':
      return z.boolean({ error: `${label} must be yes or no` });
    case 'null':
      return z.null();
    case 'array':
      return convertArray(schema, label);
    case 'object':
      return convertObject(schema, label);
    default:
      if (typeof type === 'string') warnOnce(`type:${type}`);

      return z.any();
  }
}

function convert(schema: JsonSchemaObject, label: string): z.ZodType {
  for (const keyword of Object.keys(schema)) {
    if (!HANDLED_KEYWORDS.has(keyword)) {
      warnOnce(keyword);
    }
  }

  if (schema.const !== undefined) {
    return literal(schema.const);
  }

  if (Array.isArray(schema.enum)) {
    return unionOf(
      schema.enum.map((value) => literal(value)),
      label
    );
  }

  const alternatives = Array.isArray(schema.anyOf) ? schema.anyOf : Array.isArray(schema.oneOf) ? schema.oneOf : undefined;

  if (alternatives) {
    const options = alternatives.filter(isObject);
    const nullIndex = options.findIndex((option) => option.type === 'null');

    if (nullIndex !== -1 && options.length === 2) {
      const other = options[nullIndex === 0 ? 1 : 0]!;

      return convert(other, label).nullable();
    }

    return unionOf(
      options.map((option) => convert(option, label)),
      label
    );
  }

  if (isObject(schema.not)) {
    const forbidden = convert(schema.not, label);

    return z.any().refine((value) => !forbidden.safeParse(value).success, { error: `${label} is invalid` });
  }

  if (Array.isArray(schema.type)) {
    return unionOf(
      schema.type.map((type) => convertByType(type, schema, label)),
      label
    );
  }

  return convertByType(schema.type, schema, label);
}

/**
 * Wraps a converted schema so the form shows one message per field: the
 * required message for empty values, otherwise the first failing rule.
 */
export function toFieldValidator(schema: z.ZodType, label: string): z.ZodType {
  return z.any().superRefine((value, ctx) => {
    const result = schema.safeParse(value);

    if (result.success) {
      return;
    }

    const isEmpty = value === undefined || value === null || value === '';

    ctx.addIssue({
      code: 'custom',
      message: isEmpty ? `${label} is required` : (result.error.issues[0]?.message ?? `${label} is invalid`),
    });
  });
}
