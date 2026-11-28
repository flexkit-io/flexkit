import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  connectionAwaitingTarget,
  findPastedPluginToken,
  matchesTokenPattern,
} from '../../src/apps/ai/plugin-token-format';
import type { PluginConnection } from '../../src/apps/ai/plugin-types';

const tinybird = {
  connect: {
    helpUrl: null,
    pattern: '^p\\.[A-Za-z0-9_.-]{20,}$',
    placeholder: null,
    tokenLabel: 'Tinybird token',
    type: 'api-token' as const,
  },
  id: 'tinybird',
  name: 'Tinybird',
};
const notion = { connect: { type: 'oauth' as const }, id: 'notion', name: 'Notion' };
const token = 'p.eyJ1IjoiYWJjZGVmZ2hpamtsbW5vcCJ9';

describe('pasted plugin tokens', () => {
  it('finds a token anywhere in a message, quoted or followed by punctuation', () => {
    assert.equal(findPastedPluginToken(token, [notion, tinybird])?.plugin.id, 'tinybird');
    assert.deepEqual(findPastedPluginToken(`here is my token: "${token}".`, [tinybird])?.tokens, [token]);
  });

  it('finds every token, also glued to a label or inside brackets', () => {
    const other = 'p.eyJ1Ijoienl4d3Z1dHNycXBvbm1sayJ9';

    assert.deepEqual(findPastedPluginToken(`token=${token} and (${other})!`, [tinybird])?.tokens, [token, other]);
    assert.deepEqual(findPastedPluginToken(`https://api.tinybird.co/v0/pipes?token=${token}`, [tinybird])?.tokens, [
      token,
    ]);
  });

  it('ignores a plugin whose token pattern is empty or does not compile', () => {
    assert.equal(
      findPastedPluginToken('how many signups?', [{ ...tinybird, connect: { ...tinybird.connect, pattern: '' } }]),
      null
    );
    assert.equal(
      findPastedPluginToken('how many signups?', [{ ...tinybird, connect: { ...tinybird.connect, pattern: '([' } }]),
      null
    );
  });

  it('leaves ordinary messages alone', () => {
    assert.equal(findPastedPluginToken('p.s. how many signups this week?', [tinybird]), null);
    assert.equal(findPastedPluginToken(token, [notion]), null);
    assert.equal(
      findPastedPluginToken(token, [{ ...tinybird, connect: { ...tinybird.connect, pattern: null } }]),
      null
    );
  });

  it('never blocks on a pattern that is not a valid regular expression', () => {
    assert.equal(matchesTokenPattern('anything', '(['), true);
    assert.equal(matchesTokenPattern('anything', null), true);
  });
});

describe('connection awaiting a target', () => {
  const connection = (id: string, updatedAt: string, needsTarget?: boolean) =>
    ({ id, updatedAt, needsTarget }) as unknown as PluginConnection;

  it('picks the newest connection still without a target', () => {
    assert.equal(
      connectionAwaitingTarget([
        connection('old', '2026-11-28T10:00:00Z', true),
        connection('picked', '2026-11-28T12:00:00Z', false),
        connection('new', '2026-11-28T11:00:00Z', true),
      ])?.id,
      'new'
    );
  });

  it('finds nothing on older platforms or when every connection has a target', () => {
    assert.equal(connectionAwaitingTarget([connection('a', '2026-11-28T10:00:00Z')]), null);
    assert.equal(connectionAwaitingTarget([]), null);
  });
});
