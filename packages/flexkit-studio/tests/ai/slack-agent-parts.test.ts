import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPickableSlackChannels, getSlackChannelRows, toggleSlackSpaceId } from '../../src/apps/ai/slack-agent-parts';

const channels = [
  { id: 'C2', name: '#sales' },
  { id: 'C1', name: '#ops' },
  { id: 'C3', name: '#general' },
];

describe('getSlackChannelRows', () => {
  it('shows the workspace’s bound channels, then picked ones, by name', () => {
    const rows = getSlackChannelRows({
      bindings: [
        { channelId: 'C2', spaceIds: ['s1'], teamId: 'T1' },
        { channelId: 'C9', spaceIds: ['s2'], teamId: 'T2' },
      ],
      channels,
      pickedChannelIds: ['C1', 'C2'],
      teamId: 'T1',
    });

    assert.deepEqual(rows, [
      { channelId: 'C1', name: '#ops', spaceIds: [] },
      { channelId: 'C2', name: '#sales', spaceIds: ['s1'] },
    ]);
  });

  it('names a bound channel the app cannot list by its id', () => {
    const rows = getSlackChannelRows({
      bindings: [{ channelId: 'G7', spaceIds: ['s1'], teamId: 'T1' }],
      channels,
      pickedChannelIds: [],
      teamId: 'T1',
    });

    assert.equal(rows[0]?.name, 'G7');
  });
});

describe('getPickableSlackChannels', () => {
  it('offers the channels not shown yet, by name', () => {
    assert.deepEqual(
      getPickableSlackChannels(channels, [{ channelId: 'C2', name: '#sales', spaceIds: [] }]).map(
        (channel) => channel.id
      ),
      ['C3', 'C1']
    );
  });
});

describe('toggleSlackSpaceId', () => {
  it('adds a space, or removes it when it was there', () => {
    assert.deepEqual(toggleSlackSpaceId(['a'], 'b'), ['a', 'b']);
    assert.deepEqual(toggleSlackSpaceId(['a', 'b'], 'a'), ['b']);
  });
});
