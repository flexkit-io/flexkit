import { useRef, useState, type JSX } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { CheckIcon, ChevronDownIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  toast,
} from '@flexkit/studio/ui';
import { createApiClient, fetcher } from './api';
import { matchLabel } from './attach-combobox';
import { connectPluginPopup } from './plugin-oauth';
import { PluginConnectControl } from './plugin-pages';
import type { Marketplace, MarketplacePlugin, PluginConnection, PluginScope, PluginTools } from './plugin-types';
import type { AutomationToolConfigInput } from './types';

export interface PluginAccountChoice {
  connectionMode: PluginScope;
  /** null = the primary account of `connectionMode`, resolved at run time. */
  connectionId: string | null;
}

function scopeName(scope: PluginScope): string {
  return scope === 'project' ? 'Project' : 'Personal';
}

function connectedAccounts(plugin: MarketplacePlugin, scope: PluginScope): PluginConnection[] {
  return plugin.connections.filter((connection) => connection.scope === scope && connection.status === 'connected');
}

/** The connection a choice points at: the pinned account, or the scope's primary when unpinned. */
export function resolvePluginConnection(
  plugin: MarketplacePlugin,
  choice: PluginAccountChoice | null
): PluginConnection | null {
  if (!choice) {
    return null;
  }

  const accounts = connectedAccounts(plugin, choice.connectionMode);

  if (choice.connectionId) {
    return accounts.find((connection) => connection.id === choice.connectionId) ?? null;
  }

  return accounts.find((connection) => connection.isPrimary) ?? null;
}

function choiceValue(choice: PluginAccountChoice | null): string {
  if (!choice) {
    return '';
  }

  return choice.connectionId ? `account:${choice.connectionId}` : `primary:${choice.connectionMode}`;
}

export function PluginAccountSelect({
  ariaLabel,
  disabled,
  plugin,
  scopes,
  value,
  onChange,
}: {
  ariaLabel: string;
  disabled?: boolean;
  plugin: MarketplacePlugin;
  scopes: PluginScope[];
  value: PluginAccountChoice | null;
  onChange: (_choice: PluginAccountChoice) => void;
}): JSX.Element {
  const options: Array<{ choice: PluginAccountChoice; label: string }> = [];

  for (const scope of scopes) {
    const accounts = connectedAccounts(plugin, scope);
    const primary = accounts.find((connection) => connection.isPrimary);
    const [only] = accounts;

    // "Primary" and pinning the same single account read as duplicates; offer one entry.
    if (accounts.length === 1 && only) {
      const pinned = value?.connectionMode === scope && value.connectionId === only.id;
      options.push({
        // Follow the primary unless it is pinned, or the primary is not this (connected) account.
        choice: { connectionMode: scope, connectionId: pinned || !only.isPrimary ? only.id : null },
        label: `${scopeName(scope)} · ${only.displayName}`,
      });
      continue;
    }

    if (primary) {
      options.push({
        choice: { connectionMode: scope, connectionId: null },
        label: `Primary ${scope} account (${primary.displayName})`,
      });
    }

    for (const account of accounts) {
      options.push({
        choice: { connectionMode: scope, connectionId: account.id },
        label: `${scopeName(scope)} · ${account.displayName}`,
      });
    }
  }

  const selected = choiceValue(value);

  return (
    <Select
      disabled={disabled}
      value={options.some((option) => choiceValue(option.choice) === selected) ? selected : ''}
      onValueChange={(next) => {
        const option = options.find((entry) => choiceValue(entry.choice) === next);

        if (option) {
          onChange(option.choice);
        }
      }}
    >
      <SelectTrigger aria-label={ariaLabel} className="fk:w-fit fk:max-w-full" size="sm">
        <SelectValue placeholder="Select account" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={choiceValue(option.choice)} value={choiceValue(option.choice)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const MAX_VISIBLE_TOOL_NAMES = 2;

/** Scopes an automation may use for this plugin: what it supports, minus personal when policy forbids it. */
function usableScopes(plugin: MarketplacePlugin): PluginScope[] {
  return plugin.scopes.filter((scope) => scope === 'project' || plugin.allowPersonal);
}

function emptyUsage(plugin: MarketplacePlugin): AutomationToolConfigInput {
  // Start on the project account when one exists, otherwise on the user's own.
  const scopes = usableScopes(plugin);
  const personal =
    scopes.includes('personal') &&
    (!scopes.includes('project') ||
      (connectedAccounts(plugin, 'project').length === 0 && connectedAccounts(plugin, 'personal').length > 0));

  return {
    pluginId: plugin.id,
    enabled: true,
    connectionMode: personal ? 'personal' : 'project',
    connectionId: null,
    allTools: true,
    selectedTools: [],
    deliveryEnabled: false,
    channels: [],
  };
}

function toolKey(server: string, tool: string): string {
  return `${encodeURIComponent(server)}:${encodeURIComponent(tool)}`;
}

function toolName(key: string): string {
  return decodeURIComponent(key.slice(key.indexOf(':') + 1));
}

function selectedToolsSummary(selectedTools: string[]): string {
  const names = selectedTools.map(toolName);
  const visible = names.slice(0, MAX_VISIBLE_TOOL_NAMES).join(', ');

  return names.length > MAX_VISIBLE_TOOL_NAMES ? `${visible} +${names.length - MAX_VISIBLE_TOOL_NAMES} more` : visible;
}

function PluginToolRow({
  canManage,
  disabled,
  plugin,
  projectId,
  usage,
  onChange,
  onRemove,
}: {
  canManage: boolean;
  disabled: boolean;
  plugin: MarketplacePlugin;
  projectId: string;
  usage: AutomationToolConfigInput;
  onChange: (_usage: AutomationToolConfigInput) => void;
  onRemove: () => void;
}): JSX.Element {
  const scopes = usableScopes(plugin);
  const hasAccounts = scopes.some((scope) => connectedAccounts(plugin, scope).length > 0);
  const choice: PluginAccountChoice | null = scopes.includes(usage.connectionMode)
    ? { connectionMode: usage.connectionMode, connectionId: usage.connectionId }
    : null;
  const connection = resolvePluginConnection(plugin, choice);
  const { data, error } = useSWR<PluginTools>(
    connection ? `/api/flexkit/${projectId}/plugin-connections/${connection.id}/tools` : null,
    fetcher
  );
  const available = (data?.servers ?? []).flatMap((server) =>
    server.tools.map((entry) => ({ key: toolKey(server.name, entry.name), entry }))
  );
  const serverErrors = (data?.servers ?? []).flatMap((server) => (server.error ? [server.error] : []));
  // Rows saved before tool customization existed carry no flag and offer every tool.
  const allTools = usage.allTools !== false;
  const locked = disabled || !plugin.enabled;
  const setTools = (selectedTools: string[]) =>
    onChange({ ...usage, allTools: false, selectedTools, enabled: selectedTools.length > 0 });
  const selectAllTools = () => onChange({ ...usage, allTools: true, selectedTools: [], enabled: true });
  // A new account may expose other tools; only a custom selection has to be picked again.
  const withAccount = (next: PluginAccountChoice): AutomationToolConfigInput => ({
    ...usage,
    connectionMode: next.connectionMode,
    connectionId: next.connectionId,
    selectedTools: [],
    enabled: allTools,
  });
  const { mutate } = useSWRConfig();
  const [connecting, setConnecting] = useState(false);
  // Connects in a popup so the unsaved automation stays on screen, then uses the new account's primary.
  const connect = async (scope: PluginScope) => {
    setConnecting(true);

    try {
      await connectPluginPopup(createApiClient(projectId), plugin.id, scope);
      await mutate(`/api/flexkit/${projectId}/plugins`);
      onChange(withAccount({ connectionMode: scope, connectionId: null }));
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : `Unable to connect ${plugin.name}.`);
    } finally {
      setConnecting(false);
    }
  };
  let status: { text: string; tone: 'muted' | 'warning' } | null = null;

  if (!plugin.enabled) {
    status = { text: 'Disabled by project policy.', tone: 'warning' };
  } else if (!hasAccounts) {
    status = { text: `Connect ${plugin.name} to use its tools.`, tone: 'warning' };
  } else if (!choice) {
    status = { text: 'Select an account.', tone: 'warning' };
  } else if (!connection) {
    status = {
      text: choice.connectionId
        ? 'The selected account is no longer connected.'
        : `The primary ${choice.connectionMode} account needs reconnecting.`,
      tone: 'warning',
    };
  } else if (error || serverErrors.length) {
    status = { text: serverErrors[0] ?? 'Unable to load tools. Reconnect or try again.', tone: 'warning' };
  } else if (allTools) {
    status = { text: 'All tools', tone: 'muted' };
  } else if (usage.selectedTools.length === 0) {
    status = { text: 'No tools selected, so the agent cannot use this plugin yet.', tone: 'warning' };
  } else {
    status = { text: selectedToolsSummary(usage.selectedTools), tone: 'muted' };
  }

  return (
    <>
      <div className="fk:m-1.5 fk:flex fk:flex-wrap fk:items-center fk:justify-between fk:gap-x-3 fk:gap-y-2 fk:rounded-md fk:px-1.25 fk:py-1.5 fk:hover:bg-muted fk:corner-squircle">
        <div className="fk:flex fk:min-w-0 fk:flex-1 fk:items-center fk:gap-2.5">
          <img src={plugin.logoUrl} alt="" className="fk:size-5 fk:shrink-0 fk:rounded fk:corner-squircle fk:self-start" />
          <div className="fk:min-w-0">
            <div className="fk:text-sm fk:font-medium">{plugin.name}</div>
            <p
              className={
                status.tone === 'warning'
                  ? 'fk:truncate fk:text-xs fk:text-warning'
                  : 'fk:truncate fk:text-xs fk:text-muted-foreground'
              }
            >
              {status.text}
            </p>
            {usage.connectionMode === 'personal' && usage.enabled ? (
              <p className="fk:text-xs fk:text-muted-foreground">Using your account makes this automation personal.</p>
            ) : null}
          </div>
        </div>
        <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-1.5">
          {hasAccounts ? (
            <>
              <PluginAccountSelect
                ariaLabel={`${plugin.name} account`}
                disabled={locked}
                plugin={plugin}
                scopes={scopes}
                value={choice}
                onChange={(next) => {
                  if (next.connectionMode === usage.connectionMode && next.connectionId === usage.connectionId) {
                    return;
                  }

                  onChange(withAccount(next));
                }}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={locked || !connection || !data} size="sm" type="button" variant="outline">
                    {allTools ? 'All tools' : usage.selectedTools.length ? `Tools (${usage.selectedTools.length})` : 'Select tools'}
                    <ChevronDownIcon className="fk:ml-1 fk:size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="fk:max-h-80 fk:w-80 fk:overflow-y-auto">
                  <DropdownMenuItem
                    className="fk:items-start"
                    onSelect={(event) => {
                      event.preventDefault();

                      // Leaving "All tools" keeps every current tool checked, so nothing disappears.
                      if (allTools) {
                        setTools(available.map((tool) => tool.key));
                      } else {
                        selectAllTools();
                      }
                    }}
                  >
                    <CheckIcon className={allTools ? 'fk:mt-0.5 fk:size-4' : 'fk:mt-0.5 fk:size-4 fk:opacity-0'} />
                    <span className="fk:min-w-0">
                      <span className="fk:block">All tools (recommended)</span>
                      <span className="fk:text-xs fk:text-muted-foreground">
                        Includes tools added later. Uncheck to pick specific ones.
                      </span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {available.map(({ key, entry }) => {
                    const checked = allTools || usage.selectedTools.includes(key);

                    return (
                      <DropdownMenuItem
                        className="fk:items-start"
                        key={key}
                        onSelect={(event) => {
                          event.preventDefault();
                          const current = allTools ? available.map((tool) => tool.key) : usage.selectedTools;
                          setTools(checked ? current.filter((item) => item !== key) : [...current, key]);
                        }}
                      >
                        <CheckIcon className={checked ? 'fk:mt-0.5 fk:size-4' : 'fk:mt-0.5 fk:size-4 fk:opacity-0'} />
                        <span className="fk:min-w-0">
                          <span className="fk:block">{entry.name}</span>
                          {entry.description ? (
                            <span className="fk:line-clamp-2 fk:text-xs fk:text-muted-foreground">{entry.description}</span>
                          ) : null}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                  {data && available.length === 0 ? (
                    <DropdownMenuItem disabled>This account exposes no tools.</DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <PluginConnectControl
              busy={connecting || disabled}
              canManage={canManage}
              plugin={plugin}
              onConnect={(scope) => void connect(scope)}
            />
          )}
          <Button
            aria-label={`Remove ${plugin.name} from automation`}
            disabled={disabled}
            size="icon"
            type="button"
            variant="ghost"
            onClick={onRemove}
          >
            <Trash2Icon className="fk:size-4" />
          </Button>
        </div>
      </div>
      <Separator/>
    </>
  );
}

function AddPluginTools({
  disabled,
  plugins,
  onAdd,
}: {
  disabled: boolean;
  plugins: MarketplacePlugin[];
  onAdd: (_plugin: MarketplacePlugin) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="fk:m-1.5 fk:flex fk:w-[calc(100%-0.75rem)] fk:cursor-pointer fk:items-center fk:gap-2.5 fk:rounded-md fk:px-1.25 fk:py-1.5 fk:text-left fk:text-sm fk:text-muted-foreground fk:hover:bg-muted fk:hover:text-foreground disabled:fk:cursor-not-allowed disabled:fk:opacity-50 fk:corner-squircle"
          disabled={disabled || plugins.length === 0}
          type="button"
        >
          <PlusIcon className="fk:size-5" />
          Plugin tools
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="fk:w-72 fk:p-0"
        // Default autofocus runs before the popover is positioned and scrolls the form to the top.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus({ preventScroll: true });
        }}
      >
        <Command filter={matchLabel}>
          <CommandInput placeholder="Search plugins…" ref={searchRef} />
          <CommandList>
            <CommandEmpty>No plugins found.</CommandEmpty>
            <CommandGroup>
              {plugins.map((plugin) => (
                <CommandItem
                  key={plugin.id}
                  value={plugin.id}
                  keywords={[plugin.name]}
                  onSelect={() => {
                    onAdd(plugin);
                    setOpen(false);
                  }}
                >
                  <img src={plugin.logoUrl} alt="" className="fk:size-5 fk:shrink-0 fk:rounded fk:corner-squircle" />
                  <span className="fk:truncate">{plugin.name}</span>
                  {plugin.connections.some((connection) => connection.status === 'connected') ? null : (
                    <span className="fk:ml-auto fk:text-xs fk:text-muted-foreground">Not connected</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * One row per plugin added to the automation, then a "+ Plugin tools" row to
 * add another. Plugins that are not added stay unavailable to the run.
 */
export function PluginUsagePicker({
  projectId,
  value,
  disabled,
  onChange,
}: {
  projectId: string;
  value: AutomationToolConfigInput[];
  disabled: boolean;
  onChange: (value: AutomationToolConfigInput[]) => void;
}): JSX.Element {
  const { data, error } = useSWR<Marketplace>(`/api/flexkit/${projectId}/plugins`, fetcher);
  const toolPlugins = (data?.plugins ?? []).filter((plugin) => plugin.capabilities.agentTools);
  const pluginsById = new Map(toolPlugins.map((plugin) => [plugin.id, plugin]));
  const addable = toolPlugins.filter(
    (plugin) => plugin.enabled && !value.some((usage) => usage.pluginId === plugin.id)
  );

  return (
    <>
      {value.map((usage) => {
        const plugin = pluginsById.get(usage.pluginId);

        return plugin ? (
          <PluginToolRow
            disabled={disabled}
            canManage={data?.canManage ?? false}
            key={usage.pluginId}
            plugin={plugin}
            projectId={projectId}
            usage={usage}
            onChange={(next) => onChange(value.map((entry) => (entry.pluginId === plugin.id ? next : entry)))}
            onRemove={() => onChange(value.filter((entry) => entry.pluginId !== plugin.id))}
          />
        ) : null;
      })}
      {error ? (
        <p className="fk:mx-3 fk:text-xs fk:text-warning" role="alert">
          Unable to load plugins. Your existing selections are preserved.
        </p>
      ) : null}
      <AddPluginTools
        disabled={disabled || !data}
        plugins={addable}
        onAdd={(plugin) => onChange([...value, emptyUsage(plugin)])}
      />
    </>
  );
}
