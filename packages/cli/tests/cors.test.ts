import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkOrigin,
  normalizeOrigin,
  planCorsAdd,
  resolveCorsTargets,
  type CorsOriginDto,
} from '../src/commands/cors/cors';

const existing: CorsOriginDto[] = [
  { id: 7, origin: 'https://studio.example.com', allowCredentials: false, createdAt: '2026-11-01T00:00:00Z' },
  { id: 8, origin: 'http://localhost:3000', allowCredentials: true, createdAt: '2026-11-01T00:00:00Z' },
];

describe('cors origins', () => {
  it('normalizes and checks origins', () => {
    assert.equal(normalizeOrigin(' https://app.example.com/ '), 'https://app.example.com');
    assert.equal(checkOrigin('https://*.example.com'), null);
    assert.equal(checkOrigin('http://localhost:*'), null);
    assert.match(checkOrigin('app.example.com') ?? '', /Include the scheme/);
  });

  it('plans adds: skips listed origins and duplicates, reports invalid values', () => {
    assert.deepEqual(
      planCorsAdd(existing, [
        'https://studio.example.com/',
        'https://new.example.com',
        'https://NEW.example.com',
        'nope',
      ]),
      { add: ['https://new.example.com'], skipped: [existing[0]], invalid: ['nope'] }
    );
  });

  it('resolves removals by id or origin', () => {
    assert.deepEqual(resolveCorsTargets(existing, ['8', 'https://studio.example.com/', '7']), {
      targets: [existing[1], existing[0]],
      unknown: [],
    });
    assert.deepEqual(resolveCorsTargets(existing, ['99', 'https://gone.example.com']).unknown, [
      '99',
      'https://gone.example.com',
    ]);
  });
});
