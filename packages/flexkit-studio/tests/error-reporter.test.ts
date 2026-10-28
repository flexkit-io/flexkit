import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveProxyTarget } from '../src/auth/proxy-target';
import { userApiPaths } from '../src/core/api-paths';
import {
  buildClientError,
  buildReportBody,
  createErrorReporter,
  describeError,
  FLUSH_INTERVAL_MS,
  isErrorReportingEnabled,
  isNoiseError,
  MAX_ERRORS_PER_SESSION,
  toReportPath,
  type ClientError,
  type ClientErrorReport,
  type ErrorReportingEnvironment,
} from '../src/core/error/error-reporter';

const NOW = new Date('2026-10-28T10:00:00.000Z');
const APP = { platform: 'web', version: '0.2.21', userAgent: 'Mozilla/5.0' } as const;

function errorWithStack(message: string, stack: string): Error {
  const error = new Error(message);

  error.stack = stack;

  return error;
}

/** A reporter with a manual clock and a recording transport. */
function testReporter(status: number | null = 202) {
  const sent: { report: ClientErrorReport; unloading: boolean }[] = [];
  const timers: (() => void)[] = [];
  const delays: number[] = [];
  const reporter = createErrorReporter({
    app: APP,
    send: async (body, { unloading }) => {
      sent.push({ report: JSON.parse(body) as ClientErrorReport, unloading });

      return status;
    },
    getPath: () => '/abcdefghij/desk/products?filter=secret#x',
    now: () => NOW,
    setTimer: (callback, ms) => {
      timers.push(callback);
      delays.push(ms);

      return timers.length;
    },
    clearTimer: () => undefined,
  });

  return {
    reporter,
    sent,
    delays,
    /** Fires the pending timer, as if the flush interval had passed. */
    tick: () => timers.shift()?.(),
    pendingTimers: () => timers.length,
  };
}

describe('toReportPath', () => {
  it('keeps the pathname only', () => {
    assert.equal(toReportPath('/abcdefghij/desk?filter=name%3Dx#top'), '/abcdefghij/desk');
    assert.equal(toReportPath('/abcdefghij/desk#top'), '/abcdefghij/desk');
    assert.equal(toReportPath('https://studio.flexkit.io/abcdefghij/desk?token=t'), '/abcdefghij/desk');
    assert.equal(toReportPath('flexkit://app/abcdefghij/desk?x=1'), '/abcdefghij/desk');
    assert.equal(toReportPath(`/${'a'.repeat(600)}`).length, 500);
  });
});

describe('describeError', () => {
  it('reads errors and strings, and only the type of other values', () => {
    const error = errorWithStack('boom', 'TypeError: boom\n    at x (app.js:1:1)');

    error.name = 'TypeError';
    assert.deepEqual(describeError(error), { name: 'TypeError', message: 'boom', stack: error.stack });
    assert.deepEqual(describeError('plain'), { name: 'Error', message: 'plain' });
    assert.deepEqual(describeError({ email: 'a@b.io', price: 10 }), {
      name: 'Error',
      message: 'Non-Error thrown: Object',
    });
    assert.deepEqual(describeError(undefined), { name: 'Error', message: 'Non-Error thrown: undefined' });
    assert.deepEqual(describeError(42), { name: 'Error', message: 'Non-Error thrown: number' });
  });
});

describe('isNoiseError', () => {
  it('ignores ResizeObserver loops, aborts, cross-origin script errors and extensions', () => {
    assert.ok(isNoiseError({ name: 'Error', message: 'ResizeObserver loop limit exceeded' }));
    assert.ok(
      isNoiseError({ name: 'Error', message: 'ResizeObserver loop completed with undelivered notifications.' })
    );
    assert.ok(isNoiseError({ name: 'AbortError', message: 'The user aborted a request.' }));
    assert.ok(isNoiseError({ name: 'Error', message: 'signal is aborted without reason' }));
    assert.ok(isNoiseError({ name: 'Error', message: 'Script error.' }));
    assert.ok(
      isNoiseError({
        name: 'TypeError',
        message: 'x is undefined',
        stack: 'at y (chrome-extension://abc/content.js:1:1)',
      })
    );
    assert.ok(isNoiseError({ name: 'TypeError', message: 'x' }, 'moz-extension://abc/inject.js'));
  });

  it('keeps Studio errors', () => {
    assert.equal(
      isNoiseError({ name: 'TypeError', message: 'x is undefined', stack: 'at y (https://studio/app.js:1:1)' }),
      false
    );
  });
});

describe('buildClientError', () => {
  it('builds the payload entry with the limits of the backend', () => {
    const entry = buildClientError(errorWithStack('m'.repeat(3000), 's'.repeat(9000)), {
      source: 'react',
      componentStack: 'c'.repeat(5000),
      path: '/abcdefghij/desk?q=secret',
      projectId: 'abcdefghij',
      now: NOW,
    });

    assert.ok(entry);
    assert.equal(entry.source, 'react');
    assert.equal(entry.name, 'Error');
    assert.equal(entry.message.length, 2000);
    assert.equal(entry.stack?.length, 8000);
    assert.equal(entry.componentStack?.length, 4000);
    assert.equal(entry.path, '/abcdefghij/desk');
    assert.equal(entry.projectId, 'abcdefghij');
    assert.equal(entry.occurredAt, '2026-10-28T10:00:00.000Z');
  });

  it('leaves out a project id the backend would refuse, and noise entirely', () => {
    assert.equal(buildClientError(new Error('x'), { source: 'manual', projectId: 'Not/Valid' })?.projectId, undefined);
    assert.equal(buildClientError(new Error('ResizeObserver loop limit exceeded'), { source: 'window' }), null);
  });
});

describe('buildReportBody', () => {
  const entry = (index: number, size = 10): ClientError => ({
    source: 'window',
    name: 'Error',
    message: `${index}:${'x'.repeat(size)}`,
    occurredAt: NOW.toISOString(),
  });

  it('holds at most ten errors', () => {
    const result = buildReportBody(
      APP,
      Array.from({ length: 12 }, (_, index) => entry(index))
    );

    assert.ok(result);
    assert.equal(result.count, 10);
    assert.deepEqual((JSON.parse(result.body) as ClientErrorReport).app, APP);
  });

  it('stays under the byte budget', () => {
    const result = buildReportBody(
      APP,
      Array.from({ length: 10 }, (_, index) => entry(index, 1500)),
      5000
    );

    assert.ok(result);
    assert.equal(result.count, 3);
    assert.ok(result.body.length <= 5000);
  });

  it('returns null when nothing fits', () => {
    assert.equal(buildReportBody(APP, []), null);
    assert.equal(buildReportBody(APP, [entry(0, 6000)], 5000), null);
  });
});

describe('createErrorReporter', () => {
  it('batches errors and sends them after the flush interval', async () => {
    const { reporter, sent, delays, tick } = testReporter();

    reporter.setProjectId('abcdefghij');
    reporter.report(new Error('a'), { source: 'window' });
    reporter.report(new Error('b'), { source: 'unhandledrejection' });
    assert.equal(sent.length, 0);
    assert.deepEqual(delays, [FLUSH_INTERVAL_MS]);

    tick();
    await Promise.resolve();

    assert.equal(sent.length, 1);
    assert.deepEqual(
      sent[0]?.report.errors.map((error) => [error.message, error.source, error.path, error.projectId]),
      [
        ['a', 'window', '/abcdefghij/desk/products', 'abcdefghij'],
        ['b', 'unhandledrejection', '/abcdefghij/desk/products', 'abcdefghij'],
      ]
    );
    assert.deepEqual(sent[0]?.report.app, APP);
    assert.equal(reporter.pending().length, 0);
  });

  it('sends one report per interval', async () => {
    const { reporter, sent, tick, pendingTimers } = testReporter();

    for (let index = 0; index < 15; index += 1) {
      reporter.report(new Error(`e${index}`), { source: 'manual' });
    }

    tick();
    await Promise.resolve();
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.report.errors.length, 10);
    assert.equal(pendingTimers(), 1);

    tick();
    await Promise.resolve();
    assert.equal(sent.length, 2);
    assert.equal(sent[1]?.report.errors.length, 5);
  });

  it('reports the same message and stack once per session', () => {
    const { reporter } = testReporter();
    const stack = 'Error: same\n    at a (app.js:1:1)';

    reporter.report(errorWithStack('same', stack), { source: 'window' });
    reporter.report(errorWithStack('same', stack), { source: 'react' });
    reporter.report(errorWithStack('same', 'Error: same\n    at b (app.js:2:2)'), { source: 'window' });

    assert.equal(reporter.pending().length, 2);
  });

  it('stops after the session cap', () => {
    const { reporter } = testReporter();

    for (let index = 0; index < MAX_ERRORS_PER_SESSION + 20; index += 1) {
      reporter.report(new Error(`e${index}`), { source: 'manual' });
    }

    assert.equal(reporter.pending().length, MAX_ERRORS_PER_SESSION);
  });

  it('drops noise', () => {
    const { reporter } = testReporter();

    reporter.report(new Error('ResizeObserver loop limit exceeded'), { source: 'window' });
    reporter.report(Object.assign(new Error('aborted'), { name: 'AbortError' }), { source: 'unhandledrejection' });
    reporter.report(new Error('x'), { source: 'window', sourceUrl: 'chrome-extension://abc/x.js' });

    assert.equal(reporter.pending().length, 0);
  });

  it('sends everything queued when the page goes away', () => {
    const { reporter, sent } = testReporter();

    for (let index = 0; index < 25; index += 1) {
      reporter.report(new Error(`e${index}`), { source: 'manual' });
    }

    reporter.flush({ unloading: true });

    assert.deepEqual(
      sent.map(({ report, unloading }) => [report.errors.length, unloading]),
      [
        [10, true],
        [10, true],
        [5, true],
      ]
    );
  });

  it('stops for the session when rate limited', async () => {
    const { reporter, sent, tick } = testReporter(429);

    reporter.report(new Error('a'), { source: 'manual' });
    tick();
    await Promise.resolve();
    await Promise.resolve();
    reporter.report(new Error('b'), { source: 'manual' });
    reporter.flush({ unloading: true });

    assert.equal(sent.length, 1);
  });

  it('never throws, even when the transport does', async () => {
    const reporter = createErrorReporter({
      app: APP,
      send: () => Promise.reject(new Error('offline')),
      setTimer: () => 1,
      clearTimer: () => undefined,
    });

    reporter.report(new Error('a'), { source: 'manual' });
    assert.doesNotThrow(() => reporter.flush({ unloading: true }));
    await new Promise((resolve) => setImmediate(resolve));
  });
});

describe('isErrorReportingEnabled', () => {
  const production: ErrorReportingEnvironment = {
    hosted: true,
    isDesktop: false,
    domain: 'flexkit.io',
    hostname: 'studio.flexkit.io',
    version: '0.2.21',
    override: null,
  };

  it('is on for the hosted Studio and the desktop app in production', () => {
    assert.equal(isErrorReportingEnabled(production), true);
    assert.equal(isErrorReportingEnabled({ ...production, isDesktop: true, hostname: 'app' }), true);
  });

  it('is off in development and for self-hosted project lists', () => {
    assert.equal(isErrorReportingEnabled({ ...production, hostname: 'localhost' }), false);
    assert.equal(isErrorReportingEnabled({ ...production, hostname: 'studio.flexkit.test' }), false);
    assert.equal(isErrorReportingEnabled({ ...production, domain: 'flexkit.test' }), false);
    assert.equal(isErrorReportingEnabled({ ...production, isDesktop: true, domain: 'flexkit.test' }), false);
    assert.equal(isErrorReportingEnabled({ ...production, version: '0.0.0' }), false);
    assert.equal(isErrorReportingEnabled({ ...production, hosted: false }), false);
  });

  it('follows the local storage setting', () => {
    assert.equal(isErrorReportingEnabled({ ...production, hostname: 'localhost', override: 'on' }), true);
    assert.equal(isErrorReportingEnabled({ ...production, override: 'off' }), false);
  });
});

describe('client errors proxy path', () => {
  it('goes through the user-level BFF segment to the backend endpoint', () => {
    assert.equal(userApiPaths.clientErrors, '/api/flexkit/-/client-errors');
    assert.deepEqual(resolveProxyTarget(userApiPaths.clientErrors), {
      auth: 'bearer',
      url: 'https://flexkit.io/api/client-errors',
    });
  });
});
