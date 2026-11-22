import { useEffect, useRef, useState, type JSX } from 'react';
import useSWR from 'swr';
import { XIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  ExternalLink,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  toast,
} from '../../ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/primitives/alert-dialog';
import { FetcherError, fetcher, type ApiClient } from './api';
import type { SlackAgentConnection, SlackAgentSettings } from './plugin-types';
import { getPickableSlackChannels, getSlackChannelRows, toggleSlackSpaceId } from './slack-agent-parts';
import type { ProjectSpace } from './types';

const DOCS_URL = 'https://flexkit.io/docs/integrations/slack#ask-the-agent-in-slack';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message && error.message !== 'Request failed' ? error.message : fallback;
}

/**
 * The Slack agent's settings on the Slack plugin page, for owners and developers: whether the
 * agent answers in each connected workspace, and which spaces each channel sees.
 */
export function SlackAgentSection({
  api,
  base,
  connectionsKey,
}: {
  api: ApiClient;
  base: string;
  /** Changes when the plugin's connections change, so the workspaces are read again. */
  connectionsKey: string;
}): JSX.Element | null {
  const { data, error, mutate } = useSWR<SlackAgentSettings>(`${base}/slack-agent`, fetcher);
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<SlackAgentConnection | null>(null);

  const seenConnectionsKey = useRef(connectionsKey);

  // A workspace connected, reconnected or disconnected on this page: read the workspaces again.
  useEffect(() => {
    if (seenConnectionsKey.current !== connectionsKey) {
      seenConnectionsKey.current = connectionsKey;
      void mutate();
    }
  }, [connectionsKey, mutate]);

  // An older platform has no Slack agent: the section stays out of the way.
  if (error instanceof FetcherError && error.status === 404) {
    return null;
  }

  const save = async (teamId: string, action: () => Promise<SlackAgentSettings>) => {
    setBusyTeamId(teamId);

    try {
      await mutate(await action(), { revalidate: false });
    } catch (failure) {
      toast.error(errorMessage(failure, 'Unable to change the Slack agent.'));
    } finally {
      setBusyTeamId(null);
    }
  };

  return (
    <section className="fk:flex fk:flex-col fk:gap-3">
      <h2 className="fk:text-xl fk:font-semibold">Flexkit Agent in Slack</h2>
      <p className="fk:text-sm fk:text-muted-foreground">
        Members mention the agent in a channel or message it directly, and it answers in the thread as the member who
        asked. In a direct message it has the member&rsquo;s own access; in a channel, only the spaces the channel is
        bound to. A workspace answers for one project at a time.
        <ExternalLink href={DOCS_URL}>Learn more</ExternalLink>
      </p>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Unable to load the Slack agent settings.</AlertDescription>
        </Alert>
      ) : null}
      {!data && !error ? <Skeleton className="fk:h-12 fk:w-full" /> : null}
      {data && data.connections.length === 0 ? (
        <p className="fk:text-sm fk:text-muted-foreground">Connect a Slack workspace to the project first.</p>
      ) : null}
      {data?.connections.map((connection) => (
        <div className="fk:flex fk:flex-col fk:gap-4 fk:rounded-lg fk:border fk:p-4" key={connection.connectionId}>
          <label className="fk:flex fk:w-fit fk:cursor-pointer fk:items-center fk:gap-3">
            <Switch
              checked={connection.enabled}
              disabled={busyTeamId !== null}
              onCheckedChange={(checked) => {
                if (checked) {
                  void save(connection.teamId, () => api.enableSlackAgent(connection.connectionId));
                } else {
                  setConfirming(connection);
                }
              }}
            />
            <span className="fk:flex fk:flex-col">
              <span className="fk:text-sm fk:font-medium">
                Answer questions in {connection.teamName ?? 'this workspace'}
              </span>
              <span className="fk:text-xs fk:text-muted-foreground">
                {connection.enabled
                  ? 'Invite the app to each channel it should answer in.'
                  : 'Off: the app stays silent when members mention it.'}
              </span>
            </span>
          </label>
          {connection.enabled ? (
            <SlackChannelSpaces
              api={api}
              base={base}
              disabled={busyTeamId !== null}
              settings={data}
              teamId={connection.teamId}
              onSaved={(settings) => void mutate(settings, { revalidate: false })}
            />
          ) : null}
        </div>
      ))}
      <AlertDialog open={confirming !== null} onOpenChange={(open) => (open ? null : setConfirming(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off the agent in {confirming?.teamName ?? 'this workspace'}?</AlertDialogTitle>
            <AlertDialogDescription>
              The agent stops answering there. Members&rsquo; account links and the channels&rsquo; spaces are removed,
              so turning it on again starts from scratch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const connection = confirming;

                setConfirming(null);

                if (connection) {
                  void save(connection.teamId, () => api.disableSlackAgent(connection.teamId));
                }
              }}
            >
              Turn off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function SlackChannelSpaces({
  api,
  base,
  disabled,
  onSaved,
  settings,
  teamId,
}: {
  api: ApiClient;
  base: string;
  disabled: boolean;
  onSaved: (_settings: SlackAgentSettings) => void;
  settings: SlackAgentSettings;
  teamId: string;
}): JSX.Element {
  const { data: channelsData, error: channelsError } = useSWR(['slack-agent-channels', base, teamId], () =>
    api.listSlackAgentChannels(teamId)
  );
  const { data: spacesData, error: spacesError } = useSWR<{ spaces: ProjectSpace[] }>(`${base}/spaces`, fetcher);
  const [pickedChannelIds, setPickedChannelIds] = useState<string[]>([]);
  const [savingChannelId, setSavingChannelId] = useState<string | null>(null);
  const channels = channelsData?.channels ?? [];
  const spaces = spacesData?.spaces ?? [];
  const rows = getSlackChannelRows({ bindings: settings.channels, channels, pickedChannelIds, teamId });
  const pickable = getPickableSlackChannels(channels, rows);

  const setSpaces = async (channelId: string, spaceIds: string[]) => {
    setSavingChannelId(channelId);

    try {
      onSaved(await api.setSlackChannelSpaces({ channelId, spaceIds, teamId }));
    } catch (failure) {
      toast.error(errorMessage(failure, 'Unable to change the channel’s spaces.'));
    } finally {
      setSavingChannelId(null);
    }
  };

  const remove = async (channelId: string, bound: boolean) => {
    if (bound) {
      await setSpaces(channelId, []);
    }

    setPickedChannelIds((current) => current.filter((id) => id !== channelId));
  };

  return (
    <div className="fk:flex fk:flex-col fk:gap-3">
      <div className="fk:flex fk:flex-col fk:gap-1">
        <span className="fk:text-sm fk:font-medium">Channel spaces</span>
        <p className="fk:text-xs fk:text-muted-foreground">
          Everyone in a channel reads the answers, so the agent sees only the spaces the channel is bound to, even when
          the member who asked holds more. A channel without spaces sees only records that belong to no space.
        </p>
      </div>
      {channelsError ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(channelsError, 'Unable to list the workspace’s channels.')}</AlertDescription>
        </Alert>
      ) : null}
      {spacesError ? (
        <Alert variant="destructive">
          <AlertDescription>Unable to load the project&rsquo;s spaces.</AlertDescription>
        </Alert>
      ) : null}
      {spacesData && spaces.length === 0 ? (
        <p className="fk:text-sm fk:text-muted-foreground">
          This project has no spaces, so every channel sees only records that belong to no space.
        </p>
      ) : null}
      {spaces.length > 0
        ? rows.map((row) => {
            const bound = settings.channels.some(
              (binding) => binding.teamId === teamId && binding.channelId === row.channelId
            );
            const rowDisabled = disabled || savingChannelId !== null;

            return (
              <div className="fk:flex fk:flex-col fk:gap-2 fk:border-t fk:pt-3" key={row.channelId}>
                <div className="fk:flex fk:items-center fk:gap-2">
                  <span className="fk:text-sm fk:font-medium">{row.name}</span>
                  {row.spaceIds.length === 0 ? (
                    <span className="fk:text-xs fk:text-muted-foreground">No spaces: records in no space only</span>
                  ) : null}
                  <Button
                    aria-label={`Remove ${row.name}`}
                    className="fk:ml-auto"
                    disabled={rowDisabled}
                    size="icon"
                    variant="ghost"
                    onClick={() => void remove(row.channelId, bound)}
                  >
                    <XIcon />
                  </Button>
                </div>
                <div className="fk:flex fk:flex-wrap fk:gap-x-6 fk:gap-y-2">
                  {spaces.map((space) => (
                    <label className="fk:flex fk:cursor-pointer fk:items-center fk:gap-2 fk:text-sm" key={space.id}>
                      <Checkbox
                        checked={row.spaceIds.includes(space.id)}
                        disabled={rowDisabled}
                        onCheckedChange={() => {
                          // The row stays while its spaces change, even when the last one is cleared.
                          setPickedChannelIds((current) =>
                            current.includes(row.channelId) ? current : [...current, row.channelId]
                          );
                          void setSpaces(row.channelId, toggleSlackSpaceId(row.spaceIds, space.id));
                        }}
                      />
                      {space.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })
        : null}
      {spaces.length > 0 && channelsData ? (
        pickable.length > 0 ? (
          <Select
            disabled={disabled}
            value=""
            onValueChange={(channelId) => setPickedChannelIds((current) => [...current, channelId])}
          >
            <SelectTrigger aria-label="Bind a channel" className="fk:w-64" size="sm">
              <SelectValue placeholder="Bind a channel to spaces…" />
            </SelectTrigger>
            <SelectContent>
              {pickable.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : rows.length === 0 ? (
          <p className="fk:text-sm fk:text-muted-foreground">The app cannot list any channels in this workspace yet.</p>
        ) : null
      ) : null}
      {spaces.length > 0 && !channelsData && !channelsError ? <Skeleton className="fk:h-8 fk:w-64" /> : null}
    </div>
  );
}
