import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  describePauseResult,
  describePauseState,
  isConfirmedName,
  type PauseState,
} from '../src/commands/project/pause';

const online: PauseState = { pausedBy: null, projectName: 'Shop', readOnlySince: null, suspendedSince: null };

describe('project pause helpers', () => {
  it('describes the current state', () => {
    assert.equal(describePauseState(online), '"Shop" is online.');
    assert.equal(
      describePauseState({ ...online, pausedBy: 'manual', suspendedSince: '2026-11-01' }),
      '"Shop" is paused.'
    );
    assert.match(describePauseState({ ...online, pausedBy: 'spend', suspendedSince: '2026-11-01' }), /on-demand usage/);
    assert.equal(describePauseState({ ...online, readOnlySince: '2026-11-01' }), '"Shop" is read-only.');
  });

  it('needs the exact project name, ignoring surrounding spaces', () => {
    assert.equal(isConfirmedName(' Shop ', 'Shop'), true);
    assert.equal(isConfirmedName('shop', 'Shop'), false);
    assert.equal(isConfirmedName('', 'Shop'), false);
  });

  it('describes each outcome', () => {
    assert.match(describePauseResult({ status: 'paused', success: true }, 'Shop'), /flexkit project unpause/);
    assert.match(describePauseResult({ status: 'already_paused', success: true }, 'Shop'), /already paused/);
    assert.match(describePauseResult({ status: 'unpaused', success: true }, 'Shop'), /back online/);
    assert.match(describePauseResult({ status: 'not_paused', success: true }, 'Shop'), /nothing changed/);
  });
});
