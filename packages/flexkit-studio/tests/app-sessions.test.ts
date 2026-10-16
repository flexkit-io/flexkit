import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Location } from 'react-router-dom';
import { createAppSessions, getAppSegment, rememberAppLocation } from '../src/core/apps/app-sessions';

function location(pathname: string, key = pathname): Location {
  return { hash: '', key, pathname, search: '', state: null };
}

describe('getAppSegment', () => {
  it('returns the app that follows the project id', () => {
    assert.equal(getAppSegment('/p1/ai/agent/chats/3', 'p1'), 'ai');
    assert.equal(getAppSegment('/p1/desk', 'p1'), 'desk');
    assert.equal(getAppSegment('/p%201/desk/', 'p 1'), 'desk');
  });

  it('returns nothing for the bare project path or another project', () => {
    assert.equal(getAppSegment('/p1', 'p1'), undefined);
    assert.equal(getAppSegment('/p1/', 'p1'), undefined);
    assert.equal(getAppSegment('/p2/desk', 'p1'), undefined);
    assert.equal(getAppSegment('/', 'p1'), undefined);
  });
});

describe('rememberAppLocation', () => {
  it('keeps apps in the order they were first opened and their latest location', () => {
    const chat = location('/p1/ai/agent/chats/3');
    const desk = location('/p1/desk/list/posts');
    const newChat = location('/p1/ai/agent');
    let sessions = rememberAppLocation(createAppSessions('p1'), 'p1', 'ai', newChat);

    sessions = rememberAppLocation(sessions, 'p1', 'ai', chat);
    sessions = rememberAppLocation(sessions, 'p1', 'desk', desk);
    sessions = rememberAppLocation(sessions, 'p1', 'ai', chat);

    assert.deepEqual(sessions.order, ['ai', 'desk']);
    assert.equal(sessions.locations.ai, chat);
    assert.equal(sessions.locations.desk, desk);
  });

  it('returns the same object when the app is already at that location', () => {
    const chat = location('/p1/ai/agent/chats/3');
    const sessions = rememberAppLocation(createAppSessions('p1'), 'p1', 'ai', chat);

    assert.equal(rememberAppLocation(sessions, 'p1', 'ai', chat), sessions);
  });

  it('starts over when the project changes so no stored location points into another project', () => {
    const sessions = rememberAppLocation(createAppSessions('p1'), 'p1', 'ai', location('/p1/ai/agent'));
    const next = rememberAppLocation(sessions, 'p2', 'desk', location('/p2/desk'));

    assert.equal(next.projectId, 'p2');
    assert.deepEqual(next.order, ['desk']);
    assert.deepEqual(Object.keys(next.locations), ['desk']);
  });
});
