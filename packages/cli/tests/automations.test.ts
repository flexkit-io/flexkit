import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyAutomationFlags,
  buildCreateInput,
  buildUpdateInput,
  describeTriggers,
  isEmptyChange,
  toAutomationInput,
} from '../src/commands/automations/input';
import { automationsListPath } from '../src/commands/automations/index';
import type { Automation } from '../src/commands/automations/types';

const automation: Automation = {
  id: 'a1',
  name: 'Daily stock report',
  instructions: 'Summarize low stock.',
  enabled: true,
  modelId: 'auto',
  visibility: 'project',
  spaceId: null,
  mutationPolicy: 'require_approval',
  notifyCreator: true,
  notifyRule: 'when_flagged',
  customToolNames: ['forecast'],
  toolAllowRules: [],
  toolConfigs: [{ pluginId: 'slack', enabled: true }],
  skillIds: ['s1'],
  subscriberIds: [],
  triggers: [
    { id: 't1', type: 'schedule', cron: '0 8 * * *', timezone: 'Europe/Madrid' },
    {
      id: 't2',
      type: 'webhook',
      token: 'abcdefgh123',
      secret: null,
      url: 'https://p.api.flexkit.io/automations/webhook/abcdefgh123',
    },
  ],
  totalRuns: 12,
  lastRunAt: '2026-11-01T08:00:00Z',
  createdAt: '2026-10-01T08:00:00Z',
  createdBy: 'u1',
  updatedAt: '2026-10-02T08:00:00Z',
  projectId: 'p1',
};

describe('toAutomationInput', () => {
  it('drops read-only fields and trigger ids and urls', () => {
    const input = toAutomationInput(automation);

    for (const key of ['id', 'createdAt', 'createdBy', 'lastRunAt', 'projectId', 'totalRuns', 'updatedAt']) {
      assert.equal(key in input, false, key);
    }

    assert.deepEqual(input.triggers, [
      { type: 'schedule', cron: '0 8 * * *', timezone: 'Europe/Madrid' },
      { type: 'webhook', token: 'abcdefgh123', secret: null },
    ]);
    assert.deepEqual(input.toolConfigs, automation.toolConfigs);
    assert.deepEqual(input.skillIds, ['s1']);
  });
});

describe('buildUpdateInput', () => {
  it('keeps the whole current definition and applies changes on top', () => {
    const input = buildUpdateInput(automation, { notifyRule: 'always' }, { name: 'Renamed', enabled: false });

    assert.equal(input.name, 'Renamed');
    assert.equal(input.enabled, false);
    assert.equal(input.notifyRule, 'always');
    assert.equal(input.instructions, automation.instructions);
    assert.equal((input.triggers as unknown[]).length, 2);
    assert.deepEqual(input.toolConfigs, automation.toolConfigs);
  });

  it('ignores an id in the file', () => {
    assert.equal('id' in buildUpdateInput(automation, { id: 'other' }, {}), false);
  });
});

describe('buildCreateInput', () => {
  it('fills defaults and adds schedule triggers', () => {
    const input = buildCreateInput(undefined, {
      name: 'Report',
      instructions: 'Do it.',
      schedules: ['0 9 * * *', '0 17 * * *'],
      timezone: 'Europe/Prague',
    });

    assert.equal(input.enabled, false);
    assert.equal(input.modelId, 'auto');
    assert.equal(input.visibility, 'project');
    assert.deepEqual(input.toolConfigs, []);
    assert.deepEqual(input.triggers, [
      { type: 'schedule', cron: '0 9 * * *', timezone: 'Europe/Prague' },
      { type: 'schedule', cron: '0 17 * * *', timezone: 'Europe/Prague' },
    ]);
  });

  it('lets flags override the file', () => {
    const input = buildCreateInput(
      { name: 'From file', instructions: 'File text', enabled: false },
      { name: 'Flag', enabled: true }
    );

    assert.equal(input.name, 'Flag');
    assert.equal(input.instructions, 'File text');
    assert.equal(input.enabled, true);
  });

  it('requires a name and instructions', () => {
    assert.throws(() => buildCreateInput(undefined, { name: 'Only name' }), /--instructions/);
    assert.throws(() => buildCreateInput(undefined, {}), /--name and --instructions/);
  });
});

describe('applyAutomationFlags', () => {
  it('sets space visibility when a space is given', () => {
    assert.deepEqual(applyAutomationFlags({}, { spaceId: 'sp1' }), { spaceId: 'sp1', visibility: 'space' });
  });

  it('rejects unknown values', () => {
    assert.throws(() => applyAutomationFlags({}, { visibility: 'team' }), /visibility/);
    assert.throws(() => applyAutomationFlags({}, { mutationPolicy: 'yolo' }), /mutation policy/);
    assert.throws(() => applyAutomationFlags({}, { timezone: 'UTC' }), /--schedule/);
  });
});

describe('isEmptyChange', () => {
  it('detects when nothing would change', () => {
    assert.equal(isEmptyChange(undefined, { name: undefined, schedules: [] }), true);
    assert.equal(isEmptyChange({ id: 'x' }, {}), true);
    assert.equal(isEmptyChange(undefined, { enabled: false }), false);
    assert.equal(isEmptyChange({ name: 'x' }, {}), false);
  });
});

describe('describeTriggers', () => {
  it('summarizes each trigger type', () => {
    assert.equal(describeTriggers([]), 'manual');
    assert.equal(
      describeTriggers([
        { type: 'schedule', cron: '0 8 * * *', timezone: 'UTC' },
        { type: 'entity', events: ['create', 'update'], entities: ['Product'] },
        { type: 'job', job: 'schema_deploy', outcome: 'failed' },
        { type: 'poll', intervalMinutes: 15 },
        { type: 'webhook' },
      ]),
      'cron 0 8 * * *; on create,update Product; after schema_deploy failed; poll every 15m; webhook'
    );
  });
});

describe('automationsListPath', () => {
  it('maps the flags to query parameters', () => {
    assert.equal(
      automationsListPath({ '--enabled': true, '--search': ' invoice ', '--limit': 500, '--visibility': 'personal' }),
      '/automations?limit=100&offset=0&enabled=true&q=invoice&visibility=personal'
    );
    assert.equal(
      automationsListPath({ '--disabled': true, '--offset': 25 }),
      '/automations?limit=25&offset=25&enabled=false'
    );
  });

  it('refuses --enabled with --disabled', () => {
    assert.throws(() => automationsListPath({ '--enabled': true, '--disabled': true }), /either/);
  });
});
