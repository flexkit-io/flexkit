import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCustomerToolActor } from '../src/actor';

const shared = { automationId: 'auto-1', kind: 'automation', spaceCodes: ['eu', 'us'], spaceId: null };

test('a project or space automation has no visibility and no creator', () => {
  assert.deepEqual(parseCustomerToolActor(shared), shared);
  assert.deepEqual(parseCustomerToolActor({ ...shared, spaceId: 'space-1' }), { ...shared, spaceId: 'space-1' });
});

test('a personal automation carries its visibility and the member it belongs to', () => {
  assert.deepEqual(parseCustomerToolActor({ ...shared, creatorId: 'user-1', visibility: 'personal' }), {
    ...shared,
    creatorId: 'user-1',
    visibility: 'personal',
  });
});

test('visibility and creator come together or not at all', () => {
  for (const extra of [
    { visibility: 'personal' },
    { creatorId: 'user-1' },
    { creatorId: '', visibility: 'personal' },
    { creatorId: 7, visibility: 'personal' },
    { creatorId: 'user-1', visibility: 'project' },
  ]) {
    assert.deepEqual(parseCustomerToolActor({ ...shared, ...extra }), shared);
  }
});

test('fields the SDK does not know are still left out', () => {
  assert.deepEqual(parseCustomerToolActor({ ...shared, somethingNew: true }), shared);
});

test('a chat actor is unchanged', () => {
  const chat = { kind: 'chat', role: 'editor', spaceCodes: [], userId: 'user-1' };

  assert.deepEqual(parseCustomerToolActor({ ...chat, creatorId: 'user-2', visibility: 'personal' }), chat);
});
