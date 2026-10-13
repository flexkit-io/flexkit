import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { serializeValidation } from '@flexkit/schema';
import type { ZodValidation } from '@flexkit/schema';
import { jsonSchemaToZod, toFieldValidator } from '../src/form/json-schema-to-zod';

/** Round-trips an authored validation through deploy serialization and back. */
function roundTrip(validation: ZodValidation, label = 'Field') {
  const original = validation(z);
  const converted = jsonSchemaToZod(serializeValidation(validation), label);

  return { original, converted };
}

function firstMessage(schema: z.ZodType, value: unknown): string | undefined {
  const result = schema.safeParse(value);

  return result.success ? undefined : result.error.issues[0]?.message;
}

describe('jsonSchemaToZod', () => {
  it('accepts and rejects the same values as the authored Zod schema for the demo shapes', () => {
    const cases: [ZodValidation, unknown[]][] = [
      [(zod) => zod.string().min(1), ['', 'a', 'abc', 12]],
      [(zod) => zod.string().min(3).max(5), ['ab', 'abc', 'abcdef']],
      [(zod) => zod.string().length(2), ['a', 'ab', 'abc']],
      [(zod) => zod.email(), ['nope', 'a@b.co', '']],
      [(zod) => zod.number().min(0).max(5), [-1, 0, 5, 6, 'x']],
      [(zod) => zod.number().int().min(1), [0, 1, 1.5, 2]],
      [(zod) => zod.string().regex(/^[A-Z]{3}$/), ['abc', 'ABC', 'ABCD']],
      [(zod) => zod.string().optional(), ['', 'x']],
      [(zod) => zod.string().nullable(), [null, 'x', 3]],
      // Unknown keys are stripped, as authored z.object() does; the form never sends them anyway.
      [(zod) => zod.object({ _id: zod.string().min(1) }), [{ _id: '' }, { _id: 'x' }, {}, { _id: 'x', extra: 1 }]],
      [(zod) => zod.enum(['draft', 'published']), ['draft', 'archived']],
      [(zod) => zod.literal(42), [42, 41]],
      [(zod) => zod.array(zod.string().min(1)).min(1), [[], ['a'], ['']]],
    ];

    for (const [validation, values] of cases) {
      const { original, converted } = roundTrip(validation);

      for (const value of values) {
        assert.equal(
          converted.safeParse(value).success,
          original.safeParse(value).success,
          `${JSON.stringify(value)} for ${JSON.stringify(serializeValidation(validation))}`
        );
      }
    }
  });

  it('generates messages from the attribute label', () => {
    assert.equal(firstMessage(roundTrip((zod) => zod.string().min(1), 'Name').converted, ''), 'Name is required');
    assert.equal(
      firstMessage(roundTrip((zod) => zod.string().min(3), 'Code').converted, 'ab'),
      'Code must be at least 3 characters'
    );
    assert.equal(
      firstMessage(roundTrip((zod) => zod.email(), 'Email').converted, 'nope'),
      'Email must be a valid email address'
    );
    assert.equal(
      firstMessage(roundTrip((zod) => zod.number().min(1).max(5), 'Rating').converted, 9),
      'Rating must be between 1 and 5'
    );
    assert.equal(
      firstMessage(roundTrip((zod) => zod.number().int(), 'Position').converted, 1.5),
      'Position must be a whole number'
    );
    // Zod's integer schema carries safe-integer bounds; they must not leak into messages.
    assert.equal(firstMessage(roundTrip((zod) => zod.number().int(), 'Position').converted, 'x'), 'Position must be a number');
  });

  it('wraps a field so empty values report "required" and other failures report the first rule', () => {
    const validator = toFieldValidator(jsonSchemaToZod({ type: 'string', minLength: 3 }, 'Code'), 'Code');

    assert.equal(firstMessage(validator, undefined), 'Code is required');
    assert.equal(firstMessage(validator, ''), 'Code is required');
    assert.equal(firstMessage(validator, 'ab'), 'Code must be at least 3 characters');
    assert.equal(validator.safeParse('abc').success, true);
  });

  it('ignores unknown keywords instead of failing', () => {
    const schema = jsonSchemaToZod({ type: 'string', 'x-unknown': true, minLength: 1 }, 'Name');

    assert.equal(schema.safeParse('ok').success, true);
    assert.equal(schema.safeParse('').success, false);
  });
});
