import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import {
  SchemaSerializationError,
  defineEntity,
  serializeConfig,
  serializeProjectConfig,
  serializeValidation,
} from '../src/index';
import type { Attribute, Entity, ProjectConfig, ZodValidation } from '../src/index';

const text = (name: string, validation?: ZodValidation): Attribute => ({
  name,
  label: name,
  dataType: 'string',
  inputType: 'text',
  scope: 'global',
  ...(validation ? { validation } : {}),
});

const product: Entity = {
  name: 'product',
  plural: 'products',
  menu: { group: 'catalog', icon: 'Tag', label: 'Products' },
  groups: [{ name: 'main', title: 'Main', icon: 'Box' }],
  attributes: [text('name', (zod) => zod.string().min(1, { error: 'Name is required' }))],
};

const project: ProjectConfig = {
  title: 'Shop',
  projectId: 'abcdefghij',
  menuGroups: [{ name: 'catalog', title: 'Catalog' }],
  scopes: [{ name: 'default', label: 'Default', isDefault: true }],
  spaces: [{ code: 'sales', label: 'Sales' }],
  schema: [product],
};

describe('serializeValidation', () => {
  it('compiles the demo validation shapes to draft-07 fragments without $schema', () => {
    assert.deepEqual(serializeValidation((zod) => zod.string().min(1, { error: 'Required' })), {
      type: 'string',
      minLength: 1,
    });
    // Zod 4: `.int()` returns a fresh integer schema, so bounds must follow it.
    assert.deepEqual(serializeValidation((zod) => zod.number().int().min(0).max(5)), {
      type: 'integer',
      minimum: 0,
      maximum: 5,
    });
    assert.deepEqual(serializeValidation((zod) => zod.number().min(0).max(5)), {
      type: 'number',
      minimum: 0,
      maximum: 5,
    });
    assert.deepEqual(serializeValidation((zod) => zod.string().length(2)), {
      type: 'string',
      minLength: 2,
      maxLength: 2,
    });

    const email = serializeValidation((zod) => zod.email({ error: 'Invalid email' }));
    assert.equal(email.type, 'string');
    assert.equal(email.format, 'email');
    assert.equal(typeof email.pattern, 'string');

    const reference = serializeValidation((zod) => zod.object({ _id: zod.string().min(1) }));
    assert.equal(reference.type, 'object');
    assert.deepEqual(reference.required, ['_id']);
    assert.deepEqual((reference.properties as { _id: unknown })._id, { type: 'string', minLength: 1 });
  });

  it('pins the shape of optional and nullable roots the Studio converter relies on', () => {
    assert.deepEqual(serializeValidation((zod) => zod.string()), { type: 'string' });
    // Root-level optionality has no JSON Schema counterpart: Zod emits the inner schema.
    assert.deepEqual(serializeValidation((zod) => zod.string().optional()), { type: 'string' });
    assert.deepEqual(serializeValidation((zod) => zod.string().nullable()), {
      anyOf: [{ type: 'string' }, { type: 'null' }],
    });
  });

  it('rejects refinements, transforms and unsupported keywords, naming the location', () => {
    const location = { entity: 'product', attribute: 'name' };

    assert.throws(
      () => serializeValidation((zod) => zod.string().refine((value) => value !== 'x'), location),
      (error: unknown) =>
        error instanceof SchemaSerializationError &&
        error.entity === 'product' &&
        error.attribute === 'name' &&
        error.message.startsWith('Attribute "name" of entity "product": validation uses refine()')
    );
    assert.throws(
      () => serializeValidation((zod) => zod.object({ _id: zod.string().superRefine(() => undefined) }), location),
      /refine\(\)/
    );
    assert.throws(
      () => serializeValidation((zod) => zod.string().transform((value) => value.trim()), location),
      /cannot be expressed as JSON Schema/
    );
    assert.throws(() => serializeValidation((zod) => zod.date(), location), /cannot be expressed as JSON Schema/);
    assert.throws(() => serializeValidation((zod) => zod.ipv4(), location), /format "ipv4"/);
  });
});

describe('serializeProjectConfig', () => {
  it('keeps only data and compiles validation, leaving the input untouched', () => {
    const serialized = serializeProjectConfig({ ...project, extra: 'dropped' } as ProjectConfig);

    assert.deepEqual(serialized, {
      title: 'Shop',
      projectId: 'abcdefghij',
      menuGroups: [{ name: 'catalog', title: 'Catalog' }],
      scopes: [{ name: 'default', label: 'Default', isDefault: true }],
      spaces: [{ code: 'sales', label: 'Sales' }],
      schema: [
        {
          name: 'product',
          plural: 'products',
          menu: { group: 'catalog', icon: 'Tag', label: 'Products' },
          groups: [{ name: 'main', title: 'Main', icon: 'Box' }],
          attributes: [
            {
              name: 'name',
              label: 'name',
              dataType: 'string',
              inputType: 'text',
              scope: 'global',
              validation: { type: 'string', minLength: 1 },
            },
          ],
        },
      ],
    });
    assert.equal(typeof project.schema[0]?.attributes[0]?.validation, 'function');
    assert.equal(JSON.stringify(serialized).includes('function'), false);
  });

  it('serializes a single project and a list the same way', () => {
    assert.deepEqual(serializeConfig(project), [serializeProjectConfig(project)]);
    assert.deepEqual(serializeConfig([project, project]).length, 2);
  });

  it('rejects leftovers from the JSX era with a clear message', () => {
    const jsxIcon = { $$typeof: Symbol.for('react.element'), type: 'svg', props: {} };

    assert.throws(
      () =>
        serializeProjectConfig({
          ...project,
          schema: [{ ...product, menu: { icon: jsxIcon as unknown as string } }],
        }),
      /menu\.icon must be a lucide icon name/
    );
    assert.throws(
      () =>
        serializeProjectConfig({
          ...project,
          schema: [{ ...product, attributes: [{ ...text('name'), hidden: (() => true) as unknown as boolean }] }],
        }),
      /"hidden" must be a boolean/
    );
  });

  it('normalizes entities through defineEntity before serializing', () => {
    const entity = defineEntity({
      name: 'gallery',
      plural: 'galleries',
      attributes: [{ name: 'cover', label: 'Cover', dataType: 'asset', inputType: 'asset' }],
    });

    assert.equal(entity.attributes[0]?.scope, 'global');
    assert.throws(
      () => defineEntity({ name: 'x', plural: 'xs', display: 'missing', attributes: [text('name')] }),
      /no attribute has that name/
    );
  });
});

// Keep zod referenced so the import is not tree-shaken away by the test bundle.
void z;
