import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatDevEvent } from '../src/commands/dev/events';

describe('formatDevEvent', () => {
  it('prints connection, job and failure lines', () => {
    assert.deepEqual(formatDevEvent({ type: 'connected', toolCount: 1, skillCount: 2 }, 'abc'), {
      level: 'info',
      text: 'Connected to abc: 1 tool, 2 skills. Waiting for tool calls…',
    });
    assert.deepEqual(formatDevEvent({ type: 'job-done', id: 'j', name: 'ping', ms: 12 }, 'abc'), {
      level: 'info',
      text: 'ping ✓ 12ms',
    });
    assert.deepEqual(formatDevEvent({ type: 'job-error', id: 'j', name: 'ping', ms: 3, error: 'boom' }, 'abc'), {
      level: 'error',
      text: 'ping ✗ 3ms: boom',
    });
    assert.equal(formatDevEvent({ type: 'denied', status: 403, message: 'Nope' }, 'abc')?.level, 'error');
    assert.equal(formatDevEvent({ type: 'unreachable', message: 'Down.' }, 'abc')?.text, 'Down. Retrying…');
  });

  it('stays silent for noise and surfaces catalog warnings', () => {
    assert.equal(formatDevEvent({ type: 'job-start', id: 'j', name: 'ping' }, 'abc'), null);
    assert.equal(formatDevEvent({ type: 'stopped' }, 'abc'), null);
    assert.equal(formatDevEvent({ type: 'manifest-sent', warnings: [] }, 'abc'), null);
    assert.equal(formatDevEvent({ type: 'manifest-sent', warnings: ['a', 'b'] }, 'abc')?.level, 'warn');
  });
});
