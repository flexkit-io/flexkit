import type { FormEvent, JSX } from 'react';
import { useId, useState, useSyncExternalStore } from 'react';
import { ExternalLinkIcon, LoaderCircle } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '../../ui';
import type { ApiClient } from './api';
import { connectPluginPopup } from './plugin-oauth';
import { matchesTokenPattern, type ConnectablePlugin } from './plugin-token-format';
import type { PluginApiTokenConnect, PluginScope } from './plugin-types';

interface TokenRequest {
  id: number;
  plugin: ConnectablePlugin & { connect: PluginApiTokenConnect };
  /** Saves the token; rejects with a message the dialog shows next to the field. */
  submit: (_token: string) => Promise<void>;
  settle: (_connected: boolean) => void;
}

/** The one open token dialog, outside React so any connect button can open it. */
let request: TokenRequest | null = null;
let lastRequestId = 0;
/** Cancels the latest request, whether its dialog has opened yet or not. */
let cancelLatest: (() => void) | null = null;
const listeners = new Set<() => void>();

function setRequest(next: TokenRequest | null): void {
  request = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

/**
 * Connects a plugin: a sign-in popup for OAuth plugins, the token dialog for
 * plugins that take a pasted token. Resolves `false` when the user closes the
 * token dialog without connecting.
 *
 * Call it straight from a click handler: browsers only allow the popup there.
 */
export function connectPlugin(
  api: ApiClient,
  plugin: ConnectablePlugin,
  scope: PluginScope,
  options?: { connectionId?: string }
): Promise<boolean> {
  const { connect } = plugin;

  if (connect?.type !== 'api-token') {
    return connectPluginPopup(api, plugin.id, scope, options).then(() => true);
  }

  // Opening a second dialog closes the first, as if cancelled.
  cancelLatest?.();

  const id = ++lastRequestId;

  return new Promise<boolean>((resolve) => {
    const next: TokenRequest = {
      id,
      plugin: { ...plugin, connect },
      submit: async (token) => {
        await api.connectPluginToken({
          pluginId: plugin.id,
          scope,
          token,
          ...(options?.connectionId ? { connectionId: options.connectionId } : {}),
        });
      },
      settle: (connected) => {
        // A save still running for a replaced dialog must not close its successor.
        if (request?.id === id) {
          setRequest(null);
        }

        if (lastRequestId === id) {
          cancelLatest = null;
        }

        resolve(connected);
      },
    };

    cancelLatest = () => next.settle(false);

    // Open after the current event: a menu item that started this closes first
    // and returns focus to its trigger, which would take it from the token field.
    setTimeout(() => {
      if (lastRequestId === id) {
        setRequest(next);
      }
    });
  });
}

function httpsHref(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Mounted once by the Studio layout; renders the dialog `connectPlugin` opens for token plugins. */
export function PluginTokenDialogHost(): JSX.Element | null {
  const current = useSyncExternalStore(
    subscribe,
    () => request,
    () => null
  );

  // A new key per request resets the field, so a token never outlives its dialog.
  return current ? <PluginTokenDialog key={current.id} request={current} /> : null;
}

function PluginTokenDialog({ request: current }: { request: TokenRequest }): JSX.Element {
  const { connect, name } = current.plugin;
  const inputId = useId();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const helpHref = httpsHref(connect.helpUrl);

  async function save(event: FormEvent): Promise<void> {
    event.preventDefault();
    const value = token.trim();

    if (saving || !value) {
      return;
    }

    if (!matchesTokenPattern(value, connect.pattern)) {
      setError(`That does not look like a ${connect.tokenLabel}.`);

      return;
    }

    setSaving(true);
    setError(null);

    try {
      await current.submit(value);
      setToken('');
      current.settle(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : `${name} could not be connected.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) {
          current.settle(false);
        }
      }}
    >
      <DialogContent>
        <form className="fk:flex fk:flex-col fk:gap-4" onSubmit={(event) => void save(event)}>
          <DialogHeader>
            <DialogTitle>Connect {name}</DialogTitle>
            <DialogDescription>
              Paste a {connect.tokenLabel}. Flexkit stores it encrypted and sends it only to {name}; the agent can use{' '}
              {name}&apos;s tools but never sees the token. Give it read access only, unless the agent should change
              things in {name}.
            </DialogDescription>
          </DialogHeader>
          <div className="fk:flex fk:flex-col fk:gap-2">
            <label className="fk:text-sm fk:font-medium" htmlFor={inputId}>
              {connect.tokenLabel}
            </label>
            <Input
              aria-describedby={error ? `${inputId}-error` : undefined}
              aria-invalid={error ? true : undefined}
              autoComplete="off"
              autoFocus
              disabled={saving}
              id={inputId}
              placeholder={connect.placeholder ?? undefined}
              spellCheck={false}
              type="password"
              value={token}
              onChange={(event) => {
                setToken(event.target.value);
                setError(null);
              }}
            />
            {error ? (
              <p className="fk:text-sm fk:text-destructive" id={`${inputId}-error`}>
                {error}
              </p>
            ) : null}
            {helpHref ? (
              <a
                className="fk:inline-flex fk:items-center fk:gap-1 fk:text-sm fk:text-muted-foreground fk:underline-offset-4 fk:hover:underline"
                href={helpHref}
                rel="noreferrer"
                target="_blank"
              >
                How to create a {connect.tokenLabel}
                <ExternalLinkIcon className="fk:size-3.5" />
              </a>
            ) : null}
          </div>
          <DialogFooter>
            <Button disabled={saving} size="sm" type="button" variant="outline" onClick={() => current.settle(false)}>
              Cancel
            </Button>
            <Button disabled={saving || !token.trim()} size="sm" type="submit">
              {saving ? <LoaderCircle className="fk:size-4 fk:animate-spin" /> : null}
              Connect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
