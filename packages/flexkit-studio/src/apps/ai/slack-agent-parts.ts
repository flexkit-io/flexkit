import type { SlackAgentChannel, SlackAgentChannelBinding } from './plugin-types';

/** A channel shown in a workspace's channel spaces: bound, or just picked and not saved yet. */
export interface SlackChannelRow {
  channelId: string;
  /** `#name`, or the channel id when the app cannot list the channel (it was removed from it). */
  name: string;
  spaceIds: string[];
}

/**
 * The channels to show for the workspace `teamId`: those bound to spaces, then the ones picked
 * but not bound yet, by name. A picked channel that has since been bound shows once.
 */
export function getSlackChannelRows({
  bindings,
  channels,
  pickedChannelIds,
  teamId,
}: {
  bindings: SlackAgentChannelBinding[];
  channels: SlackAgentChannel[];
  pickedChannelIds: string[];
  teamId: string;
}): SlackChannelRow[] {
  const names = new Map(channels.map((channel) => [channel.id, channel.name]));
  const rows = new Map<string, SlackChannelRow>();

  for (const binding of bindings) {
    if (binding.teamId === teamId) {
      rows.set(binding.channelId, {
        channelId: binding.channelId,
        name: names.get(binding.channelId) ?? binding.channelId,
        spaceIds: binding.spaceIds,
      });
    }
  }

  for (const channelId of pickedChannelIds) {
    if (!rows.has(channelId)) {
      rows.set(channelId, { channelId, name: names.get(channelId) ?? channelId, spaceIds: [] });
    }
  }

  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** The workspace's channels not shown yet, to pick one to bind. */
export function getPickableSlackChannels(channels: SlackAgentChannel[], rows: SlackChannelRow[]): SlackAgentChannel[] {
  const shown = new Set(rows.map((row) => row.channelId));

  return channels.filter((channel) => !shown.has(channel.id)).sort((a, b) => a.name.localeCompare(b.name));
}

/** The space ids with `spaceId` added, or removed when it was there. */
export function toggleSlackSpaceId(spaceIds: string[], spaceId: string): string[] {
  return spaceIds.includes(spaceId) ? spaceIds.filter((id) => id !== spaceId) : [...spaceIds, spaceId];
}
