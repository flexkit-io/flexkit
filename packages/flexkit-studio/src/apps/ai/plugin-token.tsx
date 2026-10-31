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
import {
  credentialFormComplete,
  credentialFormError,
  credentialFormFields,
  matchesTokenPattern,
  type ConnectablePlugin,
} from './plugin-token-format';
import type { PluginApiTokenConnect, PluginCredentialsConnect, PluginScope } from './plugin-types';

interface TokenRequest {
  id: number;
  plugin: ConnectablePlugin & { connect: PluginApiTokenConnect };
  /** Saves the token; rejects with a message the dialog shows next to the field. */
  submit: (_token: string) => Promise<void>;
  settle: (_connected: boolean) => void;
}

interface CredentialsRequest {
  id: number;
  plugin: ConnectablePlugin & { connect: PluginCredentialsConnect };
  /** Saves the form; rejects with a message the dialog shows under the fields. */
  submit: (_method: string | undefined, _values: { [key: string]: string }) => Promise<void>;
  settle: (_connected: boolean) => void;
}

type FormRequest = ({ kind: 'token' } & TokenRequest) | ({ kind: 'credentials' } & CredentialsRequest);

/** The one open connect form, outside React so any connect button can open it. */
let request: FormRequest | null = null;
let lastRequestId = 0;
/** Cancels the latest request, whether its dialog has opened yet or not. */
let cancelLatest: (() => void) | null = null;
const listeners = new Set<() => void>();

function setRequest(next: FormRequest | null): void {
  request = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

/**
 * Connects a plugin: a sign-in popup for OAuth plugins, the token dialog for
 * plugins that take a pasted token, the credentials dialog for plugins that
 * take the credentials of an app the user created at the provider. Resolves
 * `false` when the user closes a dialog without connecting.
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

  if (connect?.type !== 'api-token' && connect?.type !== 'credentials') {
    return connectPluginPopup(api, plugin.id, scope, options).then(() => true);
  }

  // Opening a second dialog closes the first, as if cancelled.
  cancelLatest?.();

  const id = ++lastRequestId;
  const connectionId = options?.connectionId ? { connectionId: options.connectionId } : {};

  return new Promise<boolean>((resolve) => {
    const settle = (connected: boolean): void => {
      // A save still running for a replaced dialog must not close its successor.
      if (request?.id === id) {
        setRequest(null);
      }

      if (lastRequestId === id) {
        cancelLatest = null;
      }

      resolve(connected);
    };
    const next: FormRequest =
      connect.type === 'api-token'
        ? {
            kind: 'token',
            id,
            plugin: { ...plugin, connect },
            submit: async (token) => {
              await api.connectPluginToken({ pluginId: plugin.id, scope, token, ...connectionId });
            },
            settle,
          }
        : {
            kind: 'credentials',
            id,
            plugin: { ...plugin, connect },
            submit: async (method, values) => {
              await api.connectPluginCredentials({ pluginId: plugin.id, scope, method, values, ...connectionId });
            },
            settle,
          };

    cancelLatest = () => settle(false);

    // Open after the current event: a menu item that started this closes first
    // and returns focus to its trigger, which would take it from the first field.
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

/** Mounted once by the Studio layout; renders the dialog `connectPlugin` opens for token and credentials plugins. */
export function PluginTokenDialogHost(): JSX.Element | null {
  const current = useSyncExternalStore(
    subscribe,
    () => request,
    () => null
  );

  if (!current) {
    return null;
  }

  // A new key per request resets the fields, so a secret never outlives its dialog.
  return current.kind === 'token' ? (
    <PluginTokenDialog key={current.id} request={current} />
  ) : (
    <PluginCredentialsDialog key={current.id} request={current} />
  );
}

function FieldError({ id, message }: { id: string; message: string | null }): JSX.Element | null {
  return message ? (
    <p className="fk:text-sm fk:text-destructive" id={id}>
      {message}
    </p>
  ) : null;
}

function HelpLink({ href, label }: { href: string | null; label: string }): JSX.Element | null {
  const safeHref = httpsHref(href);

  return safeHref ? (
    <a
      className="fk:inline-flex fk:items-center fk:gap-1 fk:text-sm fk:text-muted-foreground fk:underline-offset-4 fk:hover:underline"
      href={safeHref}
      rel="noreferrer"
      target="_blank"
    >
      {label}
      <ExternalLinkIcon className="fk:size-3.5" />
    </a>
  ) : null;
}

function PluginCredentialsDialog({ request: current }: { request: CredentialsRequest }): JSX.Element {
  const { connect, name } = current.plugin;
  const formId = useId();
  const [method, setMethod] = useState<string | null>(connect.methods[0]?.key ?? null);
  const [values, setValues] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<{ field: string | null; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const fields = credentialFormFields(connect, method);
  const selectedMethod = connect.methods.find((item) => item.key === method) ?? null;
  // Submitting surfaces which field is malformed; the button only waits for the required values.
  const ready = credentialFormComplete(fields, values);

  async function save(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (saving) {
      return;
    }

    const problem = credentialFormError(fields, values);

    if (problem) {
      setError(problem);

      return;
    }

    setSaving(true);
    setError(null);

    try {
      await current.submit(
        method ?? undefined,
        Object.fromEntries(fields.map((field) => [field.key, values[field.key]?.trim() ?? '']).filter(([, value]) => value))
      );
      setValues({});
      current.settle(true);
    } catch (failure) {
      setError({ field: null, message: failure instanceof Error ? failure.message : `${name} could not be connected.` });
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
              {connect.description} Flexkit checks the credentials with {name}, stores them encrypted and sends them
              only to Flexkit&apos;s own {name} server; the agent can use the tools but never sees them.
            </DialogDescription>
          </DialogHeader>
          {connect.methods.length > 1 ? (
            <div className="fk:space-y-1.5" role="group" aria-label="How to connect">
              {connect.methods.map((item) => (
                <button
                  aria-pressed={method === item.key}
                  className={`fk:flex fk:w-full fk:flex-col fk:rounded-lg fk:border fk:px-3 fk:py-2 fk:text-left fk:corner-squircle ${
                    method === item.key ? 'fk:border-primary fk:bg-primary/5' : 'fk:border-border fk:hover:bg-muted/60'
                  }`}
                  disabled={saving}
                  key={item.key}
                  onClick={() => {
                    setMethod(item.key);
                    setError(null);
                  }}
                  type="button"
                >
                  <span className="fk:text-sm fk:font-medium">{item.label}</span>
                  {item.description ? (
                    <span className="fk:text-xs fk:text-muted-foreground">{item.description}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : selectedMethod?.description ? (
            <p className="fk:text-sm fk:text-muted-foreground">{selectedMethod.description}</p>
          ) : null}
          {fields.map((field, index) => {
            const inputId = `${formId}-${field.key}`;
            const fieldError = error?.field === field.key ? error.message : null;

            return (
              <div className="fk:flex fk:flex-col fk:gap-2" key={field.key}>
                <label className="fk:text-sm fk:font-medium" htmlFor={inputId}>
                  {field.label}
                </label>
                <Input
                  aria-describedby={fieldError ? `${inputId}-error` : field.help ? `${inputId}-help` : undefined}
                  aria-invalid={fieldError ? true : undefined}
                  autoComplete="off"
                  autoFocus={index === 0}
                  disabled={saving}
                  id={inputId}
                  placeholder={field.placeholder ?? undefined}
                  spellCheck={false}
                  type={field.kind === 'secret' ? 'password' : 'text'}
                  value={values[field.key] ?? ''}
                  onChange={(event) => {
                    setValues((previous) => ({ ...previous, [field.key]: event.target.value }));
                    setError(null);
                  }}
                />
                {field.help && !fieldError ? (
                  <p className="fk:text-sm fk:text-muted-foreground" id={`${inputId}-help`}>
                    {field.help}
                  </p>
                ) : null}
                <FieldError id={`${inputId}-error`} message={fieldError} />
              </div>
            );
          })}
          <FieldError id={`${formId}-error`} message={error?.field === null ? error.message : null} />
          <HelpLink href={connect.helpUrl} label={`How to set up ${name}`} />
          <DialogFooter>
            <Button disabled={saving} size="sm" type="button" variant="outline" onClick={() => current.settle(false)}>
              Cancel
            </Button>
            <Button disabled={saving || !ready} size="sm" type="submit">
              {saving ? <LoaderCircle className="fk:size-4 fk:animate-spin" /> : null}
              Connect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PluginTokenDialog({ request: current }: { request: TokenRequest }): JSX.Element {
  const { connect, name } = current.plugin;
  const inputId = useId();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
            <FieldError id={`${inputId}-error`} message={error} />
            <HelpLink href={connect.helpUrl} label={`How to create a ${connect.tokenLabel}`} />
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
