import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ProjectSummary, ProjectUiConfig } from '../src/core/config/types';
import { getProjectLabel, groupProjectIdsByTeam } from '../src/ui/components/project-label';

const summary = (id: string, name: string, team: { id: string; name: string }): ProjectSummary => ({
  avatarUrl: null,
  id,
  name,
  readOnly: false,
  role: 'editor',
  suspended: false,
  team,
});
const loaded = { projectId: 'p1', title: 'Shop (deployed)', schema: [], schemaHash: 'h' } as unknown as ProjectUiConfig;

describe('project labels', () => {
  it('prefers the listed name, then the deployed title, then the id', () => {
    const summaries = [summary('p1', 'Shop', { id: 't', name: 'Acme' })];

    assert.equal(getProjectLabel('p1', [loaded], summaries), 'Shop');
    assert.equal(getProjectLabel('p1', [loaded]), 'Shop (deployed)');
    assert.equal(getProjectLabel('p2', [loaded], summaries), 'p2');
  });

  it('groups by team only when more than one team is present', () => {
    const one = [summary('p1', 'A', { id: 't1', name: 'Acme' }), summary('p2', 'B', { id: 't1', name: 'Acme' })];
    assert.deepEqual(groupProjectIdsByTeam(['p1', 'p2'], one), [{ label: null, projectIds: ['p1', 'p2'] }]);
    assert.deepEqual(groupProjectIdsByTeam(['p1', 'p2'], []), [{ label: null, projectIds: ['p1', 'p2'] }]);

    const two = [...one, summary('p3', 'C', { id: 't2', name: 'Zeta' })];
    assert.deepEqual(groupProjectIdsByTeam(['p1', 'p3', 'p2'], two), [
      { label: 'Acme', projectIds: ['p1', 'p2'] },
      { label: 'Zeta', projectIds: ['p3'] },
    ]);
  });
});
