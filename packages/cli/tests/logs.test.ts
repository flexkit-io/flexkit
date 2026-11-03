import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildLogsQuery,
  formatCost,
  formatLogTime,
  isErrorEntry,
  logEntryKey,
  logEntryRow,
  parseTimeArg,
  pruneSeen,
  takeNewEntries,
  type ApiLogEntry,
  type LlmLogEntry,
  type WebhookLogEntry,
} from '../src/commands/logs/format';

const NOW = Date.parse('2026-11-03T12:00:00.000Z');

function api(overrides: Partial<ApiLogEntry> = {}): ApiLogEntry {
  return {
    type: 'api-requests',
    timestamp: '2026-11-03T10:00:00.250Z',
    operation_name: 'GetProducts',
    status_code: 200,
    duration_ms: 42,
    country: 'CZ',
    city: 'Prague',
    browser: 'Chrome',
    os: 'macOS',
    request_size_bytes: 512,
    response_size_bytes: 1024,
    ...overrides,
  };
}

function webhook(overrides: Partial<WebhookLogEntry> = {}): WebhookLogEntry {
  return {
    type: 'webhook-executions',
    timestamp: '2026-11-03T10:00:00.000Z',
    webhook_id: 'w1',
    event_type: 'create',
    entity_name: 'order',
    url: 'https://example.com/hook',
    http_method: 'POST',
    was_successful: 0,
    status_code: 500,
    duration_ms: 120,
    request_size_bytes: 300,
    error_type: 'http_error',
    error_message: 'Internal Server Error',
    ...overrides,
  };
}

const llm: LlmLogEntry = {
  type: 'llm-requests',
  timestamp: '2026-11-03T10:00:00.000Z',
  generation_id: 'gen-1',
  gateway_model_id: 'anthropic/claude-sonnet',
  provider: 'anthropic',
  model_effort: '',
  input_tokens: 12000,
  output_tokens: 800,
  reasoning_tokens: 0,
  cached_input_tokens: 0,
  total_tokens: 12800,
  actual_cost_micros: 4500,
  duration_ms: 3100,
  automation_id: 'auto-1',
  automation_run_id: 'run-1',
};

describe('parseTimeArg', () => {
  it('reads durations back from now', () => {
    assert.equal(parseTimeArg('30s', '--since', NOW).toISOString(), '2026-11-03T11:59:30.000Z');
    assert.equal(parseTimeArg('30m', '--since', NOW).toISOString(), '2026-11-03T11:30:00.000Z');
    assert.equal(parseTimeArg('1h', '--since', NOW).toISOString(), '2026-11-03T11:00:00.000Z');
    assert.equal(parseTimeArg('1.5h', '--since', NOW).toISOString(), '2026-11-03T10:30:00.000Z');
    assert.equal(parseTimeArg('2d', '--since', NOW).toISOString(), '2026-11-01T12:00:00.000Z');
    assert.equal(parseTimeArg('1W', '--since', NOW).toISOString(), '2026-10-27T12:00:00.000Z');
    assert.equal(parseTimeArg(' now ', '--until', NOW).toISOString(), '2026-11-03T12:00:00.000Z');
  });

  it('reads ISO dates and date-times, as UTC without a zone', () => {
    assert.equal(parseTimeArg('2026-11-02', '--since', NOW).toISOString(), '2026-11-02T00:00:00.000Z');
    assert.equal(parseTimeArg('2026-11-02T08:30', '--since', NOW).toISOString(), '2026-11-02T08:30:00.000Z');
    assert.equal(parseTimeArg('2026-11-02 08:30:00', '--since', NOW).toISOString(), '2026-11-02T08:30:00.000Z');
    assert.equal(parseTimeArg('2026-11-02T08:30:00+02:00', '--since', NOW).toISOString(), '2026-11-02T06:30:00.000Z');
    assert.equal(parseTimeArg('2026-11-02T08:30:00.500Z', '--since', NOW).toISOString(), '2026-11-02T08:30:00.500Z');
  });

  it('names the flag in the error for anything else', () => {
    assert.throws(() => parseTimeArg('yesterday', '--since', NOW), /--since must be a duration/);
    assert.throws(() => parseTimeArg('5y', '--until', NOW), /--until must be/);
    assert.throws(() => parseTimeArg('-1h', '--since', NOW), /--since must be/);
    assert.throws(() => parseTimeArg('2026-13-45', '--since', NOW), /--since must be/);
  });
});

describe('buildLogsQuery', () => {
  const since = new Date('2026-11-03T11:00:00.000Z');

  it('builds the query with the range, limit and filters', () => {
    assert.equal(
      buildLogsQuery({ type: 'api', since, limit: 50, operation: 'GetProducts', status: '500' }),
      'type=api&since=2026-11-03T11%3A00%3A00.000Z&limit=50&operation=GetProducts&status=500'
    );
    assert.equal(
      buildLogsQuery({ type: 'webhooks', event: 'Update', status: 'failed' }),
      'type=webhooks&event=update&status=failed'
    );
    assert.equal(buildLogsQuery({ type: 'webhooks', status: 'success' }), 'type=webhooks&status=succeeded');
    assert.equal(
      buildLogsQuery({ type: 'llm', until: since, before: since }),
      'type=llm&until=2026-11-03T11%3A00%3A00.000Z&before=2026-11-03T11%3A00%3A00.000Z'
    );
  });

  it('refuses filters that do not apply and bad values', () => {
    assert.throws(() => buildLogsQuery({ type: 'api', limit: 0 }), /--limit must be/);
    assert.throws(() => buildLogsQuery({ type: 'api', limit: 501 }), /--limit must be/);
    assert.throws(() => buildLogsQuery({ type: 'api', status: 'failed' }), /HTTP status code/);
    assert.throws(() => buildLogsQuery({ type: 'webhooks', status: '500' }), /succeeded or failed/);
    assert.throws(() => buildLogsQuery({ type: 'webhooks', operation: 'X' }), /--operation only applies/);
    assert.throws(() => buildLogsQuery({ type: 'api', event: 'create' }), /--event only applies/);
    assert.throws(() => buildLogsQuery({ type: 'webhooks', event: 'archive' }), /create, update or delete/);
    assert.throws(() => buildLogsQuery({ type: 'llm', status: '200' }), /does not apply to LLM/);
  });
});

describe('follow dedupe', () => {
  it('returns only unseen entries, oldest first', () => {
    const seen = new Map<string, number>();
    const first = api({ timestamp: '2026-11-03T10:00:01.000Z' });
    const second = api({ timestamp: '2026-11-03T10:00:02.000Z' });

    assert.deepEqual(takeNewEntries([second, first], seen), [first, second]);
    assert.deepEqual(takeNewEntries([second, first], seen), []);

    // Same timestamp, different fields: a different entry.
    const twin = api({ timestamp: '2026-11-03T10:00:02.000Z', operation_name: 'GetOrders' });
    assert.deepEqual(takeNewEntries([twin, second], seen), [twin]);
  });

  it('keys entries independently of field order', () => {
    const entry = api();
    const reordered = Object.fromEntries(Object.entries(entry).reverse()) as unknown as ApiLogEntry;

    assert.equal(logEntryKey(entry), logEntryKey(reordered));
  });

  it('prunes entries older than the window', () => {
    const seen = new Map<string, number>([
      ['old', Date.parse('2026-11-03T09:00:00Z')],
      ['new', Date.parse('2026-11-03T11:00:00Z')],
    ]);

    pruneSeen(seen, Date.parse('2026-11-03T10:00:00Z'));
    assert.deepEqual([...seen.keys()], ['new']);
  });
});

describe('rows', () => {
  it('formats times in UTC or local time', () => {
    assert.equal(formatLogTime('2026-11-03T09:05:07.900Z', true), '2026-11-03 09:05:07');
    assert.match(formatLogTime('2026-11-03T09:05:07.900Z'), /^2026-11-0\d \d\d:\d\d:07$/);
    assert.equal(formatLogTime('garbage', true), 'garbage');
  });

  it('formats each log type', () => {
    assert.deepEqual(logEntryRow(api({ city: 'S%C3%A3o+Paulo', country: 'BR' }), true), [
      '2026-11-03 10:00:00',
      'GetProducts',
      '200',
      '42ms',
      '1.5 KB',
      'São Paulo, BR',
    ]);
    assert.equal(logEntryRow(api({ city: 'Unknown', country: 'Unknown' }), true)[5], '');
    assert.deepEqual(logEntryRow(webhook(), true), [
      '2026-11-03 10:00:00',
      'create order',
      '500',
      'POST',
      '120ms',
      'https://example.com/hook',
      'http_error: Internal Server Error',
    ]);
    assert.equal(logEntryRow(webhook({ was_successful: 1 }), true)[6], '');
    assert.deepEqual(logEntryRow(llm, true), [
      '2026-11-03 10:00:00',
      'anthropic/claude-sonnet',
      '12,000 / 800',
      '$0.0045',
      '3100ms',
      'auto-1',
    ]);
  });

  it('formats costs and flags errors', () => {
    assert.equal(formatCost(0), '$0');
    assert.equal(formatCost(1_234_567), '$1.23');
    assert.equal(isErrorEntry(api({ status_code: 404 })), true);
    assert.equal(isErrorEntry(api()), false);
    assert.equal(isErrorEntry(webhook()), true);
    assert.equal(isErrorEntry(webhook({ was_successful: 1 })), false);
    assert.equal(isErrorEntry(llm), false);
  });
});
