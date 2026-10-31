import type { JSX } from 'react';
import { createContext, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import { CheckIcon, CircleAlertIcon, LoaderCircle, PlugIcon } from 'lucide-react';
import useSWR, { useSWRConfig } from 'swr';
import { useConfig } from '../../../core/config/config-context';
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../ui';
import { createApiClient, fetcher } from '../api';
import { connectPlugin } from '../plugin-token';
import type { MarketplacePlugin, PluginDetail, PluginScope } from '../plugin-types';
import { describeConnectFailure, getPluginConnectState } from './plugin-connect-state';
import { PluginLogo } from '../plugin-logo';

/** Lets a connect card hand a finished connection back to the chat, which continues in a new turn. */
export const PluginConnectContext = createContext<{ onConnected: (_pluginId: string) => Promise<void> } | null>(null);

/** On a `plugin_connected` message. */
export interface PluginConnectedData {
  accountName?: string;
  pluginId: string;
  pluginName: string;
  scope: PluginScope;
}

type ConnectAttempt = { status: 'connecting' } | { message: string; scope: PluginScope; status: 'failed' };

/**
 * Connect attempts by plugin and account, outside the card: the card of a
 * live reply is replaced by its history copy when the turn ends, and the new
 * one must still show a sign-in in progress or why the last one failed.
 */
const attempts = new Map<string, ConnectAttempt>();
const attemptListeners = new Set<() => void>();

function setAttempt(key: string, attempt: ConnectAttempt | null): void {
  if (attempt) {
    attempts.set(key, attempt);
  } else {
    attempts.delete(key);
  }

  attemptListeners.forEach((listener) => listener());
}

function subscribeAttempts(listener: () => void): () => void {
  attemptListeners.add(listener);

  return () => attemptListeners.delete(listener);
}

function useConnectAttempt(key: string): ConnectAttempt | null {
  return useSyncExternalStore(
    subscribeAttempts,
    () => attempts.get(key) ?? null,
    () => null
  );
}

const SCOPE_OPTIONS: { [scope in PluginScope]: { description: string; title: string } } = {
  personal: { description: 'Only you can use this connection in this project.', title: 'Personal' },
  project: { description: 'Shared with project members who can use this plugin.', title: 'Project' },
};

function ConsentDialog({
  busy,
  logoUrl,
  name,
  onContinue,
  onOpenChange,
  open,
  scopes,
  connect,
}: {
  busy: boolean;
  logoUrl: string;
  name: string;
  onContinue: (_scope: PluginScope) => void;
  onOpenChange: (_open: boolean) => void;
  open: boolean;
  scopes: PluginScope[];
  /** How the plugin connects; older platforms leave it out, which means a sign-in. */
  connect: MarketplacePlugin['connect'];
}): JSX.Element {
  // Like the Marketplace, no scope is preselected when both are offered.
  const [scope, setScope] = useState<PluginScope | null>(scopes.length === 1 ? (scopes[0] ?? null) : null);
  const promises = [...consentPromises(name, connect), { description: `Remove the connection to ${name} at any time.`, title: 'You stay in control' }];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="fk:sm:max-w-md">
        <div className="fk:flex fk:flex-col fk:items-center fk:gap-3 fk:pt-2 fk:text-center">
          <PluginLogo className="fk:size-16 fk:rounded-xl" src={logoUrl} />
          <DialogTitle className="fk:text-xl">Connect to {name}</DialogTitle>
          <DialogDescription>Let the Flexkit agent access and use {name} on your behalf.</DialogDescription>
        </div>
        <ul className="fk:space-y-3 fk:rounded-xl fk:bg-muted/60 fk:p-4 fk:corner-squircle">
          {promises.map((promise) => (
            <li className="fk:flex fk:gap-3" key={promise.title}>
              <CheckIcon className="fk:mt-0.5 fk:size-4 fk:shrink-0" />
              <span>
                <span className="fk:block fk:text-sm fk:font-medium">{promise.title}</span>
                <span className="fk:block fk:text-sm fk:text-muted-foreground">{promise.description}</span>
              </span>
            </li>
          ))}
        </ul>
        {scopes.length > 1 ? (
          <div className="fk:space-y-1.5" role="radiogroup" aria-label="Connection">
            {scopes.map((item) => (
              <button
                aria-checked={scope === item}
                className={`fk:flex fk:w-full fk:flex-col fk:rounded-lg fk:border fk:px-3 fk:py-2 fk:text-left fk:corner-squircle ${
                  scope === item ? 'fk:border-primary fk:bg-primary/5' : 'fk:border-border fk:hover:bg-muted/60'
                }`}
                key={item}
                onClick={() => setScope(item)}
                role="radio"
                type="button"
              >
                <span className="fk:text-sm fk:font-medium">{SCOPE_OPTIONS[item].title}</span>
                <span className="fk:text-xs fk:text-muted-foreground">{SCOPE_OPTIONS[item].description}</span>
              </button>
            ))}
          </div>
        ) : null}
        <p className="fk:text-center fk:text-xs fk:text-muted-foreground">
          You can manage connections anytime in AI → Marketplace.
        </p>
        <Button className="fk:w-full" disabled={busy || !scope} onClick={() => scope && onContinue(scope)} type="button">
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** What the consent dialog promises about the credential, per way of connecting. */
function consentPromises(
  name: string,
  connect: MarketplacePlugin['connect']
): Array<{ title: string; description: string }> {
  switch (connect?.type) {
    case 'api-token':
      return [
        {
          title: `Paste a ${connect.tokenLabel}`,
          description: `Flexkit stores it encrypted and sends it only to ${name}. The agent never sees it.`,
        },
        { title: 'You decide what the agent can do', description: 'The agent only gets the access the token has.' },
      ];
    case 'credentials':
      return [
        {
          title: `Enter the credentials of your ${name} app`,
          description: `Flexkit checks them with ${name}, stores them encrypted and never shows them to the agent.`,
        },
        {
          title: 'You decide what the agent can do',
          description: `The agent only gets the access scopes you give the app in ${name}.`,
        },
      ];
    default:
      return [
        { title: `Sign in securely to your ${name} account`, description: 'Flexkit never sees your password.' },
        {
          title: 'You decide what the agent can do',
          description: `The agent only gets the access you approve on ${name}'s sign-in page.`,
        },
      ];
  }
}

/** The one line under the plugin name that says what the card asks for. */
function cardPrompt(name: string, connect: MarketplacePlugin['connect'], reconnect: boolean): string {
  if (!reconnect) {
    return `Let the Flexkit agent use ${name}`;
  }

  switch (connect?.type) {
    case 'api-token':
      return `Add a new ${connect.tokenLabel} so the agent can keep using ${name}`;
    case 'credentials':
      return `Enter the credentials again so the agent can keep using ${name}`;
    default:
      return `Sign in again so the agent can keep using ${name}`;
  }
}

/**
 * The card a plugin setup tool shows in the chat: Authorize opens the consent
 * dialog, Continue the provider's sign-in popup. A finished connection is
 * handed to the chat, which continues in a new turn with the plugin's tools.
 */
export function PluginConnectCard({
  connectionId,
  pluginId,
}: {
  connectionId?: string;
  pluginId: string;
}): JSX.Element {
  const { currentProjectId } = useConfig();
  const api = useMemo(() => (currentProjectId ? createApiClient(currentProjectId) : null), [currentProjectId]);
  const base = currentProjectId ? `/api/flexkit/${currentProjectId}` : null;
  const detailKey = base ? `${base}/plugins/${encodeURIComponent(pluginId)}` : null;
  const { data, error, mutate } = useSWR<PluginDetail>(detailKey, fetcher);
  const { mutate: revalidateKey } = useSWRConfig();
  const chat = useContext(PluginConnectContext);
  const [consentOpen, setConsentOpen] = useState(false);
  const attemptKey = `${currentProjectId ?? ''}:${pluginId}:${connectionId ?? ''}`;
  const attempt = useConnectAttempt(attemptKey);
  const connecting = attempt?.status === 'connecting';
  const failure = attempt?.status === 'failed' ? attempt : null;

  if (!data) {
    return (
      <div className="fk:flex fk:items-center fk:gap-2 fk:rounded-2xl fk:border fk:border-border fk:p-4 fk:text-sm fk:text-muted-foreground fk:corner-squircle">
        {error ? <CircleAlertIcon className="fk:size-4" /> : <LoaderCircle className="fk:size-4 fk:animate-spin" />}
        {error ? `${pluginId} could not be loaded.` : `Loading ${pluginId}…`}
      </div>
    );
  }

  const { plugin } = data;
  const state = getPluginConnectState(plugin, data.canManage, connectionId);
  const reconnect = state.kind === 'reconnect' ? state.connection : null;

  // Called straight from a click: browsers only allow the popup there.
  function authorize(scope: PluginScope): void {
    // Read from the store, not the render: a double click must not start a second popup.
    if (!api || attempts.get(attemptKey)?.status === 'connecting') {
      return;
    }

    setConsentOpen(false);
    setAttempt(attemptKey, { status: 'connecting' });

    connectPlugin(api, plugin, scope, reconnect ? { connectionId: reconnect.id } : undefined)
      .then(
        (connected) => {
          setAttempt(attemptKey, null);

          // The token dialog was closed without connecting.
          if (!connected) {
            return;
          }

          // Refreshing the card is best-effort: the connection succeeded either
          // way, and the chat continues with it (reporting its own errors).
          mutate().catch(() => undefined);

          if (base) {
            revalidateKey(`${base}/plugins`).catch(() => undefined);
          }

          void chat?.onConnected(pluginId);
        },
        (reason: unknown) => {
          const detail = reason instanceof Error ? reason.message : '';

          setAttempt(attemptKey, { message: describeConnectFailure(plugin.name, detail), scope, status: 'failed' });
        }
      );
  }

  let status: JSX.Element | null = null;
  let action: JSX.Element | null = null;

  if (state.kind === 'connected') {
    status = (
      <span className="fk:flex fk:items-center fk:gap-1.5 fk:text-sm fk:text-muted-foreground">
        <CheckIcon className="fk:size-4 fk:text-green-700" />
        Connected · {state.connection.displayName}
      </span>
    );
  } else if (state.kind === 'disabled') {
    status = (
      <span className="fk:text-sm fk:text-muted-foreground">An owner turned {plugin.name} off for this project.</span>
    );
  } else if (state.kind === 'not_permitted') {
    status = (
      <span className="fk:text-sm fk:text-muted-foreground">
        Ask a project owner or developer to connect {plugin.name}.
      </span>
    );
  } else if (failure) {
    status = (
      <span className="fk:flex fk:items-center fk:gap-1.5 fk:text-sm fk:text-muted-foreground">
        <CircleAlertIcon className="fk:size-4 fk:shrink-0 fk:text-amber-600" />
        {failure.message}
      </span>
    );
    action = (
      <Button
        disabled={connecting}
        onClick={() => authorize(failure.scope)}
        size="sm"
        type="button"
        variant="secondary"
      >
        Retry
      </Button>
    );
  } else {
    action = (
      <Button
        disabled={connecting}
        onClick={() => (reconnect ? authorize(reconnect.scope) : setConsentOpen(true))}
        size="sm"
        type="button"
      >
        {connecting ? <LoaderCircle className="fk:size-3.5 fk:animate-spin" /> : null}
        {reconnect ? 'Reconnect' : 'Authorize'}
      </Button>
    );
  }

  return (
    <div className="fk:space-y-2">
      <div className="fk:space-y-3 fk:rounded-2xl fk:border fk:border-border fk:bg-background fk:p-4 fk:corner-squircle">
        <div className="fk:flex fk:items-center fk:gap-3">
          <PluginLogo className="fk:size-11 fk:rounded-lg" src={plugin.logoUrl} />
          <div className="fk:min-w-0 fk:flex-1">
            <div className="fk:truncate fk:font-medium">{plugin.name}</div>
            <div className="fk:truncate fk:text-sm fk:text-muted-foreground">
              {cardPrompt(plugin.name, plugin.connect, Boolean(reconnect))}
            </div>
          </div>
          {action && !failure ? action : null}
        </div>
        {status ? (
          <div className="fk:flex fk:items-center fk:justify-between fk:gap-3">
            {status}
            {failure ? action : null}
          </div>
        ) : null}
      </div>
      {state.kind === 'connect' || state.kind === 'reconnect' ? (
        <p className="fk:px-1 fk:text-xs fk:text-muted-foreground">
          Plugin actions follow your project's approval rules. Disconnect any time in AI → Marketplace.
        </p>
      ) : null}
      {state.kind === 'connect' ? (
        <ConsentDialog
          busy={connecting}
          logoUrl={plugin.logoUrl}
          name={plugin.name}
          onContinue={authorize}
          onOpenChange={setConsentOpen}
          open={consentOpen}
          scopes={state.scopes}
          connect={plugin.connect}
        />
      ) : null}
    </div>
  );
}

/** Where a `plugin_connected` message sits: a short notice, not a user bubble. */
export function PluginConnectedNotice({
  data,
  error,
  label,
}: {
  data: PluginConnectedData;
  error?: string | null;
  /** Set while the message waits for the running turn, like other follow-ups. */
  label?: string | null;
}): JSX.Element {
  return (
    <div className="fk:mr-auto fk:flex fk:max-w-[85%] fk:flex-wrap fk:items-center fk:gap-x-2 fk:gap-y-1 fk:text-sm fk:text-muted-foreground">
      <PlugIcon className="fk:size-3.5 fk:shrink-0" />
      <span>
        Connected <span className="fk:font-medium fk:text-foreground">{data.pluginName}</span>
        {data.accountName ? ` · ${data.accountName}` : ''}
      </span>
      {label ? <span className="fk:text-xs">· {label}</span> : null}
      {error ? <span className="fk:text-xs fk:text-destructive">{error}</span> : null}
    </div>
  );
}

export function getPluginConnectedData(parts: unknown): PluginConnectedData | null {
  const part = (Array.isArray(parts) ? (parts as Array<{ data?: unknown; type?: string }>) : []).find(
    (item) => item.type === 'data-plugin-connected'
  );

  return part && typeof part.data === 'object' && part.data !== null ? (part.data as PluginConnectedData) : null;
}
