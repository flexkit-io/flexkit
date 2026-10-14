import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { defineSkill, defineTool, defineTools, isToolsDefinition, toolToManifest } from '../src/index';

const ping = defineTool({
  name: 'ping',
  description: '  Echo.  ',
  input: z.object({ message: z.string().describe('What to echo') }),
  execute: ({ message }) => message,
});

describe('defineTool', () => {
  it('computes the catalog schema eagerly without $schema and trims the description', () => {
    assert.equal(ping.description, 'Echo.');
    assert.deepEqual(toolToManifest(ping), {
      description: 'Echo.',
      inputSchema: {
        type: 'object',
        properties: { message: { type: 'string', description: 'What to echo' } },
        required: ['message'],
        additionalProperties: false,
      },
      name: 'ping',
    });
  });

  it('rejects reserved or malformed names', () => {
    assert.throws(() => defineTool({ ...ping, name: 'custom_ping' }), /Invalid custom tool name/);
    assert.throws(() => defineTool({ ...ping, name: 'Ping' }), /Invalid custom tool name/);
    assert.throws(() => defineTool({ ...ping, description: ' ' }), /must have a description/);
  });
});

describe('defineTools', () => {
  it('defaults missing lists and freezes the result', () => {
    const empty = defineTools();

    assert.deepEqual(empty, { skills: [], tools: [] });
    assert.equal(Object.isFrozen(empty), true);
    assert.equal(isToolsDefinition(empty), true);
    assert.equal(isToolsDefinition({ tools: [{ name: 'x' }], skills: [] }), false);
    assert.equal(isToolsDefinition(null), false);
  });

  it('rejects duplicate tool and skill names', () => {
    assert.throws(() => defineTools({ tools: [ping, ping] }), /Duplicate custom tool name "ping"/);

    const skill = defineSkill({ name: 'A', description: 'd', content: 'c' });
    assert.throws(() => defineTools({ skills: [skill, skill] }), /Duplicate custom skill name "A"/);
  });
});
