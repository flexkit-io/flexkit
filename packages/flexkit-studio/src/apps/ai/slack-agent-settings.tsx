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
  // One write at a time across the section: each answer carries the whole settings, so a slower
  // earlier one would otherwise overwrite a later one.
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<{ connection: SlackAgentConnection; turn: 'off' | 'takeover' } | null>(
    null
  );

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

  const run: RunSettingsWrite = async (action, failureMessage, onFailure) => {
    setBusy(true);

    try {
      await mutate(await action(), { revalidate: false });
    } catch (failure) {
      toast.error(errorMessage(failure, failureMessage));
      // The refusal may come from a change made elsewhere (the workspace moved to another project).
      void mutate();
      onFailure?.();
    } finally {
      setBusy(false);
    }
  };
  const enable = (connection: SlackAgentConnection) =>
    void run(() => api.enableSlackAgent(connection.connectionId), 'Unable to turn on the Slack agent.');

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
              disabled={busy}
              onCheckedChange={(checked) => {
                if (!checked) {
                  setConfirming({ connection, turn: 'off' });
                } else if (connection.answersElsewhere) {
                  setConfirming({ connection, turn: 'takeover' });
                } else {
                  enable(connection);
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
                  : connection.answersElsewhere
                    ? 'Answers for another project.'
                    : 'Off: the app stays silent when members mention it.'}
              </span>
            </span>
          </label>
          {connection.enabled ? (
            <SlackChannelSpaces
              api={api}
              base={base}
              busy={busy}
              run={run}
              settings={data}
              teamId={connection.teamId}
            />
          ) : null}
        </div>
      ))}
      <AlertDialog open={confirming !== null} onOpenChange={(open) => (open ? null : setConfirming(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming?.turn === 'takeover' ? 'Move the agent to this project in ' : 'Turn off the agent in '}
              {confirming?.connection.teamName ?? 'this workspace'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirming?.turn === 'takeover'
                ? 'This workspace answers for another project now. Turning it on here moves the agent to this project, and the other project’s channel spaces are removed.'
                : 'The agent stops answering there. Members’ account links and the channels’ spaces are removed, so turning it on again starts from scratch.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const current = confirming;

                setConfirming(null);

                if (current?.turn === 'takeover') {
                  enable(current.connection);
                } else if (current) {
                  void run(
                    () => api.disableSlackAgent(current.connection.teamId),
                    'Unable to turn off the Slack agent.'
                  );
                }
              }}
            >
              {confirming?.turn === 'takeover' ? 'Move here' : 'Turn off'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** Runs one settings write for the section, showing `failureMessage` and reading the settings again if it fails. */
type RunSettingsWrite = (
  _action: () => Promise<SlackAgentSettings>,
  _failureMessage: string,
  _onFailure?: () => void
) => Promise<void>;

function SlackChannelSpaces({
  api,
  base,
  busy,
  run,
  settings,
  teamId,
}: {
  api: ApiClient;
  base: string;
  /** A settings write is in flight somewhere in the section. */
  busy: boolean;
  run: RunSettingsWrite;
  settings: SlackAgentSettings;
  teamId: string;
}): JSX.Element {
  const {
    data: channelsData,
    error: channelsError,
    mutate: mutateChannels,
  } = useSWR(['slack-agent-channels', base, teamId], () => api.listSlackAgentChannels(teamId));
  const { data: spacesData, error: spacesError } = useSWR<{ spaces: ProjectSpace[] }>(`${base}/spaces`, fetcher);
  const [pickedChannelIds, setPickedChannelIds] = useState<string[]>([]);
  const channels = channelsData?.channels ?? [];
  const spaces = spacesData?.spaces ?? [];
  const rows = getSlackChannelRows({ bindings: settings.channels, channels, pickedChannelIds, teamId });
  const pickable = getPickableSlackChannels(channels, rows);

  const setSpaces = (channelId: string, spaceIds: string[]) =>
    run(
      () => api.setSlackChannelSpaces({ channelId, spaceIds, teamId }),
      'Unable to change the channel’s spaces.',
      () => void mutateChannels()
    );

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
            const nameId = `slack-channel-${teamId}-${row.channelId}`;

            return (
              <div className="fk:flex fk:flex-col fk:gap-2 fk:border-t fk:pt-3" key={row.channelId}>
                <div className="fk:flex fk:items-center fk:gap-2">
                  <span className="fk:text-sm fk:font-medium" id={nameId}>
                    {row.name}
                  </span>
                  {row.spaceIds.length === 0 ? (
                    <span className="fk:text-xs fk:text-muted-foreground">No spaces: records in no space only</span>
                  ) : null}
                  <Button
                    aria-label={`Remove ${row.name}`}
                    className="fk:ml-auto"
                    disabled={busy}
                    size="icon"
                    variant="ghost"
                    onClick={() => void remove(row.channelId, bound)}
                  >
                    <XIcon />
                  </Button>
                </div>
                <div aria-labelledby={nameId} className="fk:flex fk:flex-wrap fk:gap-x-6 fk:gap-y-2" role="group">
                  {spaces.map((space) => (
                    <label className="fk:flex fk:cursor-pointer fk:items-center fk:gap-2 fk:text-sm" key={space.id}>
                      <Checkbox
                        checked={row.spaceIds.includes(space.id)}
                        disabled={busy}
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
            disabled={busy}
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
