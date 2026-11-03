import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { findProjectLink, removeProjectLink, writeProjectLink } from '../src/util/project-link';
import { parseKeyValues } from '../src/util/read-input';
import { readEventStream, parseEventJson } from '../src/util/sse';
import { formatRelativeTime, truncate } from '../src/util/output/format';
import { buildApiPath, isAccountApiPath } from '../src/commands/api';
import { getAccountApiUrl } from '../src/util/client';

describe('project link', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flexkit-link-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('writes the link, finds it from a subfolder and removes it', () => {
    fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules');
    const { file, gitignoreUpdated } = writeProjectLink(dir, { projectId: 'abcdefghij', projectName: 'Shop' });
    const nested = path.join(dir, 'src', 'deep');
    fs.mkdirSync(nested, { recursive: true });

    assert.equal(gitignoreUpdated, true);
    assert.equal(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), 'node_modules\n.flexkit\n');

    const found = findProjectLink(nested);
    assert.deepEqual(found?.link, { projectId: 'abcdefghij', projectName: 'Shop' });
    assert.equal(found?.file, file);

    removeProjectLink(found!);
    assert.equal(fs.existsSync(path.join(dir, '.flexkit')), false);
  });

  it('does not add .flexkit to .gitignore twice', () => {
    fs.writeFileSync(path.join(dir, '.gitignore'), '.flexkit\n');
    const { gitignoreUpdated } = writeProjectLink(dir, { projectId: 'abcdefghij' });

    assert.equal(gitignoreUpdated, false);
  });

  it('ignores a malformed link file', () => {
    fs.mkdirSync(path.join(dir, '.flexkit'));
    fs.writeFileSync(path.join(dir, '.flexkit', 'project.json'), '{"name":"x"}');

    assert.equal(findProjectLink(dir), null);
  });
});

describe('parseKeyValues', () => {
  it('parses JSON values, keeps strings and nests dotted keys', () => {
    assert.deepEqual(parseKeyValues(['count=3', 'active=true', 'name=Blue shirt', 'price.amount=10', 'tags=["a"]']), {
      count: 3,
      active: true,
      name: 'Blue shirt',
      price: { amount: 10 },
      tags: ['a'],
    });
  });

  it('keeps "=" inside values and rejects pairs without a key', () => {
    assert.deepEqual(parseKeyValues(['filter=a=b']), { filter: 'a=b' });
    assert.throws(() => parseKeyValues(['=x']), /Expected key=value/);
  });
});

describe('readEventStream', () => {
  it('reads SSE events split across chunks', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: status\ndata: {"a":'));
        controller.enqueue(encoder.encode('1}\n\n: keep-alive\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    });
    const response = new Response(body, { headers: { 'content-type': 'text/event-stream' } });
    const events = [];

    for await (const event of readEventStream(response)) {
      events.push(event);
    }

    assert.equal(events.length, 2);
    assert.equal(events[0]?.event, 'status');
    assert.deepEqual(parseEventJson(events[0]!), { a: 1 });
    assert.equal(parseEventJson(events[1]!), null);
  });

  it('reads NDJSON lines', async () => {
    const response = new Response('{"n":1}\n{"n":2}', { headers: { 'content-type': 'application/x-ndjson' } });
    const values = [];

    for await (const event of readEventStream(response)) {
      values.push(parseEventJson(event));
    }

    assert.deepEqual(values, [{ n: 1 }, { n: 2 }]);
  });
});

describe('format helpers', () => {
  it('formats relative times', () => {
    const now = Date.parse('2026-11-03T12:00:00Z');

    assert.equal(formatRelativeTime('2026-11-03T11:59:30Z', now), 'just now');
    assert.equal(formatRelativeTime('2026-11-03T09:00:00Z', now), '3h ago');
    assert.equal(formatRelativeTime('2026-11-01T12:00:00Z', now), '2d ago');
    assert.equal(formatRelativeTime('2026-08-01T12:00:00Z', now), '2026-08-01');
    assert.equal(formatRelativeTime(null, now), '');
  });

  it('truncates to one line', () => {
    assert.equal(truncate('a\n b   c', 10), 'a b c');
    assert.equal(truncate('abcdefghij', 5), 'abcd…');
  });
});

describe('flexkit api paths', () => {
  it('adds a leading slash and appends query pairs', () => {
    assert.equal(
      buildApiPath('automations?enabled=true', ['limit=5', 'q=a b']),
      '/automations?enabled=true&limit=5&q=a+b'
    );
  });

  it('routes /api/ paths to the account API', () => {
    assert.equal(isAccountApiPath('/api/projects'), true);
    assert.equal(isAccountApiPath('/automations'), false);
    assert.equal(isAccountApiPath('/apis'), false);
  });
});

describe('getAccountApiUrl', () => {
  it('drops the api. label of the API host', () => {
    assert.equal(getAccountApiUrl('https://api.flexkit.io'), 'https://flexkit.io');
    assert.equal(getAccountApiUrl('https://api.flexkit.test/'), 'https://flexkit.test');
    assert.equal(getAccountApiUrl('http://localhost:3005'), 'http://localhost:3005');
  });
});
