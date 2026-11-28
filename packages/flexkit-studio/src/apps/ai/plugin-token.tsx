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
import type {
  PluginAccessLevel,
  PluginApiTokenConnect,
  PluginConnectionTarget,
  PluginCredentialsConnect,
  PluginOAuthConnect,
  PluginScope,
} from './plugin-types';

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

interface AccessRequest {
  id: number;
  plugin: ConnectablePlugin;
  levels: PluginAccessLevel[];
  /** The level selected when the dialog opens: the account's own on a Reconnect. */
  initial: string;
  /**
   * Opens the sign-in for the chosen level and settles the dialog when it ends.
   * Call it straight from the click so the popup is allowed.
   */
  submit: (_accessLevel: string) => void;
  /** Closes the dialog; a sign-in still open may finish on its own. */
  cancel: () => void;
}

interface TargetRequest {
  id: number;
  plugin: ConnectablePlugin;
  /** What a target is called, e.g. "project". */
  noun: string;
  /** The connection's target, selected when the dialog opens. */
  current: string | null;
  /** Listed before the dialog opens; null when listing failed and the dialog should try again. */
  targets: PluginConnectionTarget[] | null;
  list: () => Promise<PluginConnectionTarget[]>;
  submit: (_targetId: string) => Promise<void>;
  /** True when a target was picked. */
  settle: (_picked: boolean) => void;
}

type FormRequest =
  | ({ kind: 'token' } & TokenRequest)
  | ({ kind: 'credentials' } & CredentialsRequest)
  | ({ kind: 'access' } & AccessRequest)
  | ({ kind: 'target' } & TargetRequest);

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
  options?: { connectionId?: string; accessLevel?: string | null }
): Promise<boolean> {
  const { connect } = plugin;

  if (connect?.type !== 'api-token' && connect?.type !== 'credentials') {
    return connectOAuthPlugin(api, plugin, connect, scope, options);
  }

  const connectionId = options?.connectionId ? { connectionId: options.connectionId } : {};

  return openRequest<boolean>((id, settle) =>
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
        }
  );
}

/**
 * Opens one dialog and resolves with what it settles with; `fail` closes it
 * and rejects instead. Opening another dialog cancels this one, which then
 * settles with `cancelled`.
 */
function openRequest<T>(
  make: (_id: number, _settle: (_result: T) => void, _fail: (_error: unknown) => void) => FormRequest,
  cancelled: T = false as T
): Promise<T> {
  // Opening a second dialog closes the first, as if cancelled.
  cancelLatest?.();

  const id = ++lastRequestId;

  return new Promise<T>((resolve, reject) => {
    const close = (): void => {
      // A save still running for a replaced dialog must not close its successor.
      if (request?.id === id) {
        setRequest(null);
      }

      if (lastRequestId === id) {
        cancelLatest = null;
      }
    };
    const next = make(
      id,
      (result) => {
        close();
        resolve(result);
      },
      (error) => {
        close();
        reject(error);
      }
    );

    cancelLatest = () => {
      close();
      resolve(cancelled);
    };

    // Open after the current event: a menu item that started this closes first
    // and returns focus to its trigger, which would take it from the first field.
    setTimeout(() => {
      if (lastRequestId === id) {
        setRequest(next);
      }
    });
  });
}

/**
 * A sign-in plugin: the access-level choice first when the plugin offers
 * several, then the sign-in popup, then the target (a Supabase project) when
 * each connection works in one. Without levels the popup opens straight from
 * the caller's click. Resolves `false` when the user stops before the
 * connection can be used.
 */
async function connectOAuthPlugin(
  api: ApiClient,
  plugin: ConnectablePlugin,
  connect: PluginOAuthConnect | undefined,
  scope: PluginScope,
  options?: { connectionId?: string; accessLevel?: string | null }
): Promise<boolean> {
  const levels = connect?.accessLevels ?? [];
  const reconnect = options?.connectionId ? { connectionId: options.connectionId } : {};
  let saved: string | null;

  if (levels.length < 2) {
    saved = (await connectPluginPopup(api, plugin.id, scope, reconnect)).connectionId;
  } else {
    const current = levels.some((level) => level.id === options?.accessLevel) ? options?.accessLevel : null;
    const signedIn = await openRequest<{ connectionId: string | null } | null>(
      (id, settle, fail) => ({
        kind: 'access',
        id,
        plugin,
        levels,
        initial: current ?? levels[0]!.id,
        submit: (accessLevel) =>
          connectPluginPopup(api, plugin.id, scope, { ...reconnect, accessLevel }).then(settle, fail),
        cancel: () => settle(null),
      }),
      null
    );

    if (!signedIn) {
      return false;
    }

    saved = signedIn.connectionId;
  }

  const connectionId = saved ?? options?.connectionId ?? null;

  if (!connect?.target || !connectionId) {
    return true;
  }

  return chooseConnectionTarget(api, plugin, connectionId, { onlyWhenMissing: true });
}

/**
 * Asks which target (a Supabase project) the connection works in, with its
 * current one selected. With `onlyWhenMissing` (right after a sign-in), a
 * connection that has a target is left alone and a single target is picked
 * without asking. Resolves whether the connection has a target.
 */
export async function chooseConnectionTarget(
  api: ApiClient,
  plugin: ConnectablePlugin,
  connectionId: string,
  options?: { onlyWhenMissing?: boolean }
): Promise<boolean> {
  const noun = plugin.connect?.type === 'oauth' ? plugin.connect.target?.noun : undefined;

  if (!noun) {
    return true;
  }

  const { plugin: detail } = await api.getPlugin(plugin.id);
  const connection = detail.connections.find((entry) => entry.id === connectionId);
  const current = connection?.target?.id ?? null;

  if (options?.onlyWhenMissing && (!connection || current)) {
    return true;
  }

  const list = async () => (await api.listPluginConnectionTargets(connectionId)).targets;
  const targets = await list().catch(() => null);
  const only = targets?.length === 1 ? targets[0] : undefined;

  if (only && options?.onlyWhenMissing) {
    await api.setPluginConnectionTarget(connectionId, only.id);

    return true;
  }

  return openRequest<boolean>((id, settle) => ({
    kind: 'target',
    id,
    plugin,
    noun,
    current,
    targets,
    list,
    submit: async (targetId) => {
      await api.setPluginConnectionTarget(connectionId, targetId);
    },
    // Closing keeps the current target, if there is one.
    settle: (picked) => settle(picked || current !== null),
  }));
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
  switch (current.kind) {
    case 'token':
      return <PluginTokenDialog key={current.id} request={current} />;
    case 'credentials':
      return <PluginCredentialsDialog key={current.id} request={current} />;
    case 'access':
      return <PluginAccessDialog key={current.id} request={current} />;
    case 'target':
      return <PluginTargetDialog key={current.id} request={current} />;
  }
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

function ChoiceList<T extends { id: string }>({
  choices,
  disabled,
  label,
  onSelect,
  render,
  selected,
}: {
  choices: T[];
  disabled: boolean;
  label: string;
  onSelect: (_id: string) => void;
  render: (_choice: T) => { title: string; detail: string | null };
  selected: string | null;
}): JSX.Element {
  return (
    <div aria-label={label} className="fk:max-h-72 fk:space-y-1.5 fk:overflow-y-auto" role="radiogroup">
      {choices.map((choice) => {
        const { title, detail } = render(choice);

        return (
          <button
            aria-checked={selected === choice.id}
            className={`fk:flex fk:w-full fk:flex-col fk:rounded-lg fk:border fk:px-3 fk:py-2 fk:text-left fk:corner-squircle ${
              selected === choice.id ? 'fk:border-primary fk:bg-primary/5' : 'fk:border-border fk:hover:bg-muted/60'
            }`}
            disabled={disabled}
            key={choice.id}
            role="radio"
            type="button"
            onClick={() => onSelect(choice.id)}
          >
            <span className="fk:text-sm fk:font-medium">{title}</span>
            {detail ? <span className="fk:text-xs fk:text-muted-foreground">{detail}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function PluginAccessDialog({ request: current }: { request: AccessRequest }): JSX.Element {
  const { name } = current.plugin;
  const [level, setLevel] = useState(current.initial);
  const [waiting, setWaiting] = useState(false);

  // Runs in the click itself: the sign-in popup is only allowed there.
  function signIn(): void {
    if (waiting || !level) {
      return;
    }

    setWaiting(true);
    current.submit(level);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          current.cancel();
        }
      }}
    >
      <DialogContent>
        <div className="fk:flex fk:flex-col fk:gap-4">
          <DialogHeader>
            <DialogTitle>Connect {name}</DialogTitle>
            <DialogDescription>
              Choose what the agent may do in {name}. You sign in to {name} next; to change this later, reconnect.
            </DialogDescription>
          </DialogHeader>
          <ChoiceList
            choices={current.levels}
            disabled={waiting}
            label="Access"
            render={(choice) => ({ title: choice.label, detail: choice.description })}
            selected={level}
            onSelect={setLevel}
          />
          {waiting ? (
            <p className="fk:text-sm fk:text-muted-foreground">
              Finish signing in to {name} in the window that opened. Closed it? Cancel and connect again.
            </p>
          ) : null}
          <DialogFooter>
            <Button size="sm" type="button" variant="outline" onClick={() => current.cancel()}>
              Cancel
            </Button>
            <Button disabled={waiting || !level} size="sm" type="button" onClick={signIn}>
              {waiting ? <LoaderCircle className="fk:size-4 fk:animate-spin" /> : null}
              {waiting ? `Waiting for ${name}…` : `Sign in to ${name}`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PluginTargetDialog({ request: current }: { request: TargetRequest }): JSX.Element {
  const { name } = current.plugin;
  const { noun } = current;
  const errorId = useId();
  const [targets, setTargets] = useState<PluginConnectionTarget[] | null>(current.targets);
  const [selected, setSelected] = useState<string | null>(current.current);
  const [error, setError] = useState<string | null>(
    current.targets ? null : `${name} did not list the ${noun}s. Try again.`
  );
  const [busy, setBusy] = useState(false);

  async function reload(): Promise<void> {
    setBusy(true);
    setError(null);

    try {
      setTargets(await current.list());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : `${name} did not list the ${noun}s. Try again.`);
    } finally {
      setBusy(false);
    }
  }

  async function save(): Promise<void> {
    if (busy || !selected) {
      return;
    }

    if (selected === current.current) {
      current.settle(true);

      return;
    }

    setBusy(true);
    setError(null);

    try {
      await current.submit(selected);
      current.settle(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : `The ${noun} could not be saved.`);
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) {
          current.settle(false);
        }
      }}
    >
      <DialogContent>
        <div className="fk:flex fk:flex-col fk:gap-4">
          <DialogHeader>
            <DialogTitle>Choose a {noun}</DialogTitle>
            <DialogDescription>
              The agent works only in the {noun} you choose. You can change it later from the account&apos;s menu.
            </DialogDescription>
          </DialogHeader>
          {targets && targets.length > 0 ? (
            <ChoiceList
              choices={targets}
              disabled={busy}
              label={`${name} ${noun}s`}
              render={(choice) => ({ title: choice.name, detail: choice.detail })}
              selected={selected}
              onSelect={(id) => {
                setSelected(id);
                setError(null);
              }}
            />
          ) : targets ? (
            <p className="fk:text-sm fk:text-muted-foreground">
              This {name} account has no {noun}s. Create one in {name}, then try again.
            </p>
          ) : null}
          <FieldError id={errorId} message={error} />
          <DialogFooter>
            {!targets || targets.length === 0 ? (
              <Button disabled={busy} size="sm" type="button" variant="outline" onClick={() => void reload()}>
                Try again
              </Button>
            ) : (
              <Button disabled={busy} size="sm" type="button" variant="outline" onClick={() => current.settle(false)}>
                Cancel
              </Button>
            )}
            <Button disabled={busy || !selected} size="sm" type="button" onClick={() => void save()}>
              {busy ? <LoaderCircle className="fk:size-4 fk:animate-spin" /> : null}
              Use this {noun}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
