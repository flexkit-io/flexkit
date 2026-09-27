import { useMemo, useState, type JSX } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import useSWR, { useSWRConfig } from 'swr';
import { useConfig } from '@flexkit/studio';
import {
  Alert,
  AlertDescription,
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  ScrollArea,
  SidebarTrigger,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@flexkit/studio/ui';
import { ArrowLeft, CheckIcon, ChevronLeft, ChevronRight, ExternalLink, Plug, Plus, RefreshCw } from 'lucide-react';
import { createApiClient, fetcher } from './api';
import { connectPluginPopup } from './plugin-oauth';
import type { Marketplace, MarketplacePlugin, PluginDetail, PluginScope, PluginTools } from './plugin-types';

function httpsCatalogUrl(value: string): string | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') {
    return null;
  }

  return url.href;
}

function useMarketplaceApi() {
  const { currentProjectId } = useConfig();
  const api = useMemo(() => (currentProjectId ? createApiClient(currentProjectId) : null), [currentProjectId]);

  return { api, base: currentProjectId ? `/api/flexkit/${currentProjectId}` : null };
}

function scopeLabel(scopes: PluginScope[]): string {
  if (scopes.length === 2) {
    return 'Project & Personal';
  }

  return scopes[0] === 'project' ? 'Project' : 'Personal';
}

function scopeColorClassname(scopes: PluginScope[]): string {
  if (scopes.length === 2) {
    return 'fk:bg-indigo-100 fk:text-indigo-800 fk:dark:bg-indigo-950 fk:dark:text-indigo-300';
  }

  return scopes[0] === 'project'
    ? 'fk:bg-sky-100 fk:text-sky-800 fk:dark:bg-sky-950 fk:dark:text-sky-300'
    : 'fk:bg-teal-100 fk:text-teal-800 fk:dark:bg-teal-950 fk:dark:text-teal-300';
}

function isConnected(plugin: MarketplacePlugin): boolean {
  return plugin.connections.some((connection) => connection.status !== 'revoked');
}

function scopeTitle(scope: PluginScope): string {
  if (scope === 'project') {
    return 'Project';
  }

  return 'Personal';
}

function scopePermitted(plugin: MarketplacePlugin, canManage: boolean, scope: PluginScope): boolean {
  if (scope === 'personal') {
    return plugin.allowPersonal;
  }

  return canManage;
}

function activeConnection(plugin: MarketplacePlugin, scope: PluginScope) {
  return plugin.connections.find((item) => item.scope === scope && item.status !== 'revoked') ?? null;
}

function PluginConnectControl({
  busy,
  canManage,
  plugin,
  onConnect
}: {
  busy: boolean;
  canManage: boolean;
  plugin: MarketplacePlugin;
  onConnect: (scope: PluginScope) => void;
}): JSX.Element | null {
  const pendingScopes = plugin.scopes.filter((scope) => activeConnection(plugin, scope) === null);
  const [scope] = pendingScopes;

  if (!scope) {
    return null;
  }

  if (plugin.scopes.length === 1) {
    return (
      <Button
        disabled={busy || !plugin.enabled || !scopePermitted(plugin, canManage, scope)}
        size="sm"
        onClick={() => onConnect(scope)}
      >
        <Plug />
        Connect
      </Button>
    );
  }

  const anyPermitted = pendingScopes.some((item) => scopePermitted(plugin, canManage, item));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={busy || !plugin.enabled || !anyPermitted} size="sm">
          <Plug />
          Connect
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="fk:w-72">
        <DropdownMenuGroup>
          {pendingScopes.map((item) => (
            <DropdownMenuItem
              disabled={!scopePermitted(plugin, canManage, item)}
              key={item}
              onSelect={() => onConnect(item)}
            >
              <span className="fk:flex fk:flex-col fk:gap-0.5">
                <span>{scopeTitle(item)}</span>
                <span className="fk:text-xs fk:text-muted-foreground">
                  {item === 'personal'
                    ? 'Only you can use this connection in this project.'
                    : 'Shared with project members who can use this plugin.'}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function aiSectionPath(pathname: string, section: string): string {
  const match = /^(.*\/ai)(?:\/|$)/.exec(pathname);

  if (!match) {
    return section;
  }

  return `${match[1]}/${section}`;
}

function categoryLabel(category: string): string {
  return category
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function groupPlugins(plugins: MarketplacePlugin[]): Array<{ category: string; plugins: MarketplacePlugin[] }> {
  const groups: { [category: string]: MarketplacePlugin[] } = {};

  for (const plugin of plugins) {
    const existing = groups[plugin.category];

    if (existing) {
      existing.push(plugin);

      continue;
    }

    groups[plugin.category] = [plugin];
  }

  return Object.entries(groups)
    .sort(([left], [right]) => categoryLabel(left).localeCompare(categoryLabel(right)))
    .map(([category, items]) => ({ category, plugins: items }));
}

interface CatalogSkeletonRow {
  descriptionWidth: string;
  id: string;
  nameWidth: string;
}

const PLUGIN_SKELETON_SECTIONS: { id: string; rows: CatalogSkeletonRow[] }[] = [
  {
    id: 'first',
    rows: [
      { descriptionWidth: 'fk:w-44', id: 'first-a', nameWidth: 'fk:w-24' },
      { descriptionWidth: 'fk:w-52', id: 'first-b', nameWidth: 'fk:w-16' },
      { descriptionWidth: 'fk:w-40', id: 'first-c', nameWidth: 'fk:w-28' },
      { descriptionWidth: 'fk:w-48', id: 'first-d', nameWidth: 'fk:w-20' },
    ],
  },
  {
    id: 'second',
    rows: [
      { descriptionWidth: 'fk:w-36', id: 'second-a', nameWidth: 'fk:w-32' },
      { descriptionWidth: 'fk:w-56', id: 'second-b', nameWidth: 'fk:w-24' },
    ],
  },
];

function CatalogRowSkeleton({ action, row }: { action?: boolean; row: CatalogSkeletonRow }): JSX.Element {
  return (
    <div className="fk:-mx-3 fk:flex fk:min-w-0 fk:items-center fk:gap-3 fk:px-3 fk:py-2">
      <Skeleton className="fk:size-10 fk:shrink-0 fk:rounded-lg" />
      <span className="fk:flex fk:min-w-0 fk:flex-1 fk:flex-col fk:gap-1.5">
        <Skeleton className={`fk:h-4 ${row.nameWidth}`} />
        <Skeleton className={`fk:h-4 ${row.descriptionWidth}`} />
      </span>
      {action ? <Skeleton className="fk:size-4 fk:shrink-0" /> : null}
    </div>
  );
}

const pluginGridClassName = 'fk:grid fk:grid-cols-1 fk:gap-x-16 fk:gap-y-1 fk:lg:grid-cols-2';

function PluginListSkeleton({ grouped = true }: { grouped?: boolean }): JSX.Element {
  const rows = PLUGIN_SKELETON_SECTIONS.flatMap((section) => section.rows);

  if (!grouped) {
    return (
      <div aria-busy="true" className={pluginGridClassName}>
        <span className="fk:sr-only">Loading plugins</span>
        {rows.map((row) => (
          <CatalogRowSkeleton action key={row.id} row={row} />
        ))}
      </div>
    );
  }

  return (
    <div aria-busy="true" className="fk:flex fk:flex-col fk:gap-8">
      <span className="fk:sr-only">Loading plugins</span>
      {PLUGIN_SKELETON_SECTIONS.map((section) => (
        <section key={section.id}>
          <Skeleton className="fk:mb-1 fk:h-4 fk:w-28" />
          <div className={pluginGridClassName}>
            {section.rows.map((row) => (
              <CatalogRowSkeleton action key={row.id} row={row} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function CatalogHeader(): JSX.Element {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onPlugins = /\/ai\/plugins\/?$/.test(pathname);
  const onSkills = pathname.includes('/ai/skills');
  const value = onSkills ? 'skills' : 'plugins';

  return (
    <div className="fk:mb-2 fk:flex fk:shrink-0 fk:items-center fk:gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
        </TooltipTrigger>
        <TooltipContent>Toggle Sidebar</TooltipContent>
      </Tooltip>
      <Tabs
        value={value}
        onValueChange={(next) => {
          const destination = next === 'skills' ? 'skills' : 'plugins';
          const alreadyThere = next === 'skills' ? onSkills : onPlugins;

          if (alreadyThere) {
            return;
          }

          navigate(aiSectionPath(pathname, destination));
        }}
      >
        <TabsList>
          <TabsTrigger
            value="plugins"
            onClick={() => {
              if (onPlugins) {
                return;
              }

              navigate(aiSectionPath(pathname, 'plugins'));
            }}
          >
            Plugins
          </TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

function PluginRow({ onOpen, plugin }: { onOpen: () => void; plugin: MarketplacePlugin }): JSX.Element {
  const connected = isConnected(plugin);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="fk:-mx-3 fk:flex fk:min-w-0 fk:items-center fk:gap-3 fk:rounded-lg fk:px-3 fk:py-2 fk:text-left fk:transition-colors fk:hover:bg-accent fk:focus-visible:bg-accent fk:focus-visible:outline-none fk:corner-squircle"
    >
      <img src={plugin.logoUrl} alt="" className="fk:size-10 fk:shrink-0 fk:rounded-lg fk:corner-squircle" />
      <span className="fk:min-w-0 fk:flex-1">
        <span className="fk:block fk:truncate fk:text-sm fk:font-medium">{plugin.name}</span>
        <span className="fk:block fk:truncate fk:text-sm fk:text-muted-foreground">{plugin.description}</span>
      </span>
      {connected ? (
        <CheckIcon className="fk:size-4 fk:shrink-0 fk:text-success" />
      ) : (
        <Plus className="fk:size-4 fk:shrink-0 fk:text-muted-foreground" />
      )}
    </button>
  );
}

function PluginRows({
  onOpen,
  plugins,
}: {
  onOpen: (_pluginId: string) => void;
  plugins: MarketplacePlugin[];
}): JSX.Element {
  return (
    <div className={pluginGridClassName}>
      {plugins.map((plugin) => (
        <PluginRow key={plugin.id} plugin={plugin} onOpen={() => onOpen(plugin.id)} />
      ))}
    </div>
  );
}

function PluginCatalog({ installedOnly = false }: { installedOnly?: boolean }): JSX.Element {
  const { base } = useMarketplaceApi();
  const { data, error, isLoading } = useSWR<Marketplace>(base ? `${base}/plugins` : null, fetcher);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const query = search.trim().toLowerCase();
  const plugins = (data?.plugins ?? []).filter((plugin) => {
    const matchesInstall = !installedOnly || isConnected(plugin);

    return matchesInstall && `${plugin.name} ${plugin.description}`.toLowerCase().includes(query);
  });
  const connectedPlugins = (data?.plugins ?? []).filter(isConnected);
  const groups = installedOnly ? [] : groupPlugins(plugins);
  let emptyMessage = 'Plugins are being prepared. Check back soon.';

  if (installedOnly && !query) {
    emptyMessage = 'No plugins installed yet.';
  } else if (data?.catalogSha || installedOnly) {
    emptyMessage = 'No plugins match your search.';
  }

  function openPlugin(pluginId: string): void {
    navigate(aiSectionPath(pathname, `plugins/${pluginId}`));
  }

  let list: JSX.Element | null = (
    <div className="fk:flex fk:flex-col fk:gap-8">
      {groups.map((group) => (
        <section key={group.category}>
          <h3 className="fk:mb-1 fk:text-sm fk:font-medium">{categoryLabel(group.category)}</h3>
          <PluginRows plugins={group.plugins} onOpen={openPlugin} />
        </section>
      ))}
    </div>
  );

  if (installedOnly) {
    list = <PluginRows plugins={plugins} onOpen={openPlugin} />;
  }

  if (isLoading || error || plugins.length === 0) {
    list = null;
  }

  return (
    <main className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col">
      <CatalogHeader />
      <ScrollArea className="fk:h-0 fk:min-h-0 fk:flex-1">
      <div className="fk:mx-auto fk:flex fk:w-full fk:max-w-4xl fk:flex-col fk:gap-8 fk:py-6 fk:pl-4 fk:pr-6">
        <div>
          <h2 className="fk:text-2xl fk:font-semibold">Plugins</h2>
          <p className="fk:mt-2 fk:text-muted-foreground">
            Connect the tools you use and add skills to your workflows.
          </p>
        </div>
        <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-3">
          <Input
            aria-label="Search plugins"
            className="fk:mr-auto fk:w-full fk:max-w-xs"
            placeholder="Search plugins…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {!installedOnly && isLoading ? (
            <div className="fk:flex fk:items-center fk:gap-3">
              <div className="fk:flex fk:-space-x-2">
                {['installed-a', 'installed-b', 'installed-c'].map((id) => (
                  <Skeleton className="fk:size-8 fk:rounded-md fk:ring-2 fk:ring-background" key={id} />
                ))}
              </div>
              <Skeleton className="fk:h-4 fk:w-20" />
            </div>
          ) : null}
          {!installedOnly && !isLoading && connectedPlugins.length > 0 ? (
            <AvatarGroup>
              {connectedPlugins.slice(0, 9).map((plugin) => (
                <Avatar className="fk:rounded-md" key={plugin.id}>
                  <AvatarImage src={plugin.logoUrl} alt="" />
                  <AvatarFallback>{plugin.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
          ) : null}
          {installedOnly ? (
            <Link
              to={aiSectionPath(pathname, 'plugins')}
              className="fk:inline-flex fk:items-center fk:gap-1 fk:text-sm fk:text-muted-foreground fk:hover:text-foreground"
            >
              <ChevronLeft className="fk:size-4" />
              Show all
            </Link>
          ) : null}
          {!installedOnly && !isLoading ? (
            <Link
              to={aiSectionPath(pathname, 'plugins/installed')}
              className="fk:inline-flex fk:items-center fk:gap-1 fk:text-sm fk:text-muted-foreground fk:hover:text-foreground"
            >
              {connectedPlugins.length} installed
              <ChevronRight className="fk:size-4" />
            </Link>
          ) : null}
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>Unable to load plugins. Please try again.</AlertDescription>
          </Alert>
        ) : null}
        {isLoading ? <PluginListSkeleton grouped={!installedOnly} /> : null}
        {!isLoading && !error && plugins.length === 0 ? (
          <Alert>
            <AlertDescription>{emptyMessage}</AlertDescription>
          </Alert>
        ) : null}
        {list}
      </div>
      </ScrollArea>
    </main>
  );
}

export function PluginsPage(): JSX.Element {
  return <PluginCatalog />;
}

export function InstalledPluginsPage(): JSX.Element {
  return <PluginCatalog installedOnly />;
}

function ConnectionTools({ base, connectionId }: { base: string; connectionId: string }): JSX.Element {
  const { data, error } = useSWR<PluginTools>(`${base}/plugin-connections/${connectionId}/tools`, fetcher);

  if (error) {
    return <p className="fk:text-sm fk:text-muted-foreground">Unable to discover tools. Reconnect or try again.</p>;
  }

  if (!data) {
    return <Skeleton className="fk:h-12 fk:w-full" />;
  }

  return (
    <div className="fk:flex fk:flex-col fk:gap-3">
      {data.servers.map((server) => (
        <section className="fk:flex fk:flex-col fk:gap-2" key={server.name}>
          <h4 className="fk:font-medium">{server.name}</h4>
          {server.error ? <p>{server.error}</p> : null}
          {server.tools.length > 0 ? (
            <Collapsible className="fk:group">
              <CollapsibleTrigger className="fk:flex fk:w-fit fk:items-center fk:gap-1 fk:text-sm fk:text-muted-foreground">
                <ChevronRight className="fk:size-4 fk:transition-transform fk:group-data-[state=open]:rotate-90" />
                {toolCountLabel(server.tools.length)}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="fk:mt-2 fk:flex fk:flex-col fk:gap-2">
                  {server.tools.map((tool) => (
                    <li key={tool.name}>
                      <span className="fk:text-sm fk:font-medium">{tool.name}</span>
                      <p className="fk:text-sm fk:text-muted-foreground">{tool.description}</p>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function toolCountLabel(count: number): string {
  if (count === 1) {
    return '1 tool';
  }

  return `${count.toString()} tools`;
}

export function PluginDetailPage(): JSX.Element {
  const { pluginId } = useParams<{ pluginId: string }>();
  const { api, base } = useMarketplaceApi();
  const { data, error, mutate } = useSWR<PluginDetail>(
    base && pluginId ? `${base}/plugins/${pluginId}` : null,
    fetcher
  );
  const { mutate: revalidateKey } = useSWRConfig();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const plugin = data?.plugin;
  const sourceUrl = plugin ? httpsCatalogUrl(plugin.sourceUrl) : null;
  const perform = async (action: () => Promise<unknown>) => {
    setBusy(true);

    try {
      await action();
      await mutate();
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : 'Unable to complete this action.');
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="fk:p-6">
        <Alert variant="destructive">
          <AlertDescription>Unable to load this plugin.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!plugin || !data || !api || !base) {
    return (
      <main className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col">
        <div className="fk:mb-2 fk:flex fk:shrink-0 fk:items-center fk:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
            </TooltipTrigger>
            <TooltipContent>Toggle Sidebar</TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="sm" onClick={() => navigate('..', { relative: 'path' })}>
            <ArrowLeft />
            Plugins
          </Button>
        </div>
        <ScrollArea className="fk:h-0 fk:min-h-0 fk:flex-1">
        <div aria-busy="true" className="fk:mx-auto fk:flex fk:w-full fk:max-w-4xl fk:flex-col fk:gap-8 fk:py-6 fk:pl-4 fk:pr-6">
          <span className="fk:sr-only">Loading plugin</span>
          <section className="fk:flex fk:flex-col fk:gap-3">
            <div className="fk:flex fk:items-center fk:gap-4">
              <Skeleton className="fk:size-14 fk:shrink-0 fk:rounded-lg" />
              <Skeleton className="fk:h-7 fk:w-40" />
              <Skeleton className="fk:ml-auto fk:h-9 fk:w-28" />
            </div>
            <Skeleton className="fk:h-4 fk:w-full" />
            <Skeleton className="fk:h-4 fk:w-2/3" />
            <Skeleton className="fk:h-6 fk:w-24 fk:rounded-full" />
          </section>
        </div>
        </ScrollArea>
      </main>
    );
  }

  const connectedConnections = plugin.connections.filter((connection) => connection.status === 'connected');

  return (
    <main className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col">
      <div className="fk:mb-2 fk:flex fk:shrink-0 fk:items-center fk:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
          </TooltipTrigger>
          <TooltipContent>Toggle Sidebar</TooltipContent>
        </Tooltip>
        <Button variant="ghost" size="sm" onClick={() => navigate('..', { relative: 'path' })}>
          <ArrowLeft />
          Plugins
        </Button>
      </div>
      <ScrollArea className="fk:h-0 fk:min-h-0 fk:flex-1">
      <div className="fk:mx-auto fk:flex fk:w-full fk:max-w-4xl fk:flex-col fk:gap-8 fk:py-6 fk:pl-4 fk:pr-6">
        <section className="fk:flex fk:flex-col fk:gap-3">
          <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-4">
            <img src={plugin.logoUrl} alt="" className="fk:size-14 fk:shrink-0 fk:rounded-lg fk:corner-squircle" />
            <div className="fk:flex fk:min-w-0 fk:flex-col fk:gap-0.5">
              <h1 className="fk:text-xl fk:font-semibold">{plugin.name}</h1>
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fk:inline-flex fk:w-fit fk:items-center fk:gap-1 fk:text-sm fk:hover:underline fk:text-muted-foreground"
                >
                  View source
                  <ExternalLink className="fk:size-3" />
                </a>
              ) : null}
            </div>
            <div className="fk:ml-auto fk:flex fk:shrink-0 fk:flex-wrap fk:items-center fk:justify-end fk:gap-2">
              {plugin.scopes.map((scope) => {
                const connection = activeConnection(plugin, scope);
                const permitted = scopePermitted(plugin, data.canManage, scope);

                if (!connection) {
                  return null;
                }

                return (
                  <div className="fk:flex fk:items-center fk:gap-2" key={scope}>
                    {plugin.scopes.length > 1 ? (
                      <span className="fk:text-sm fk:text-muted-foreground">{scopeTitle(scope)}</span>
                    ) : null}
                    {permitted ? (
                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={() => void perform(() => api.disconnectPlugin(connection.id))}
                      >
                        Disconnect
                      </Button>
                    ) : null}
                    <Button
                      disabled={busy || !plugin.enabled || !permitted}
                      onClick={() => void perform(() => connectPluginPopup(api, [plugin.id], scope))}
                      size="sm"
                    >
                      <Plug />
                      Reconnect
                    </Button>
                  </div>
                );
              })}
              <PluginConnectControl
                busy={busy}
                canManage={data.canManage}
                plugin={plugin}
                onConnect={(scope) => void perform(() => connectPluginPopup(api, [plugin.id], scope))}
              />
            </div>
          </div>
          <p className="fk:text-muted-foreground">{plugin.description}</p>
          <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-3">
            <Badge
              className={`fk:border-0 fk:text-[0.625rem] fk:leading-4.5 fk:font-normal fk:py-0 fk:px-2 ${scopeColorClassname(plugin.scopes)}`}
              variant="default"
            >
              {scopeLabel(plugin.scopes)}
            </Badge>
          </div>
          {plugin.scopes.map((scope) => {
            const permitted = scope === 'personal' ? plugin.allowPersonal : data.canManage;

            if (permitted) {
              return null;
            }

            const message =
              scope === 'project'
                ? 'Ask an owner or developer to connect.'
                : 'Personal connections are disabled by project policy.';

            return (
              <p className="fk:text-sm fk:text-muted-foreground" key={scope}>
                {message}
              </p>
            );
          })}
        </section>
        {!plugin.enabled ? (
          <Alert>
            <AlertDescription>This plugin is disabled by project policy.</AlertDescription>
          </Alert>
        ) : null}
        <section className="fk:flex fk:flex-col fk:gap-3">
          <div className="fk:flex fk:items-center fk:gap-3">
            <h2 className="fk:text-xl fk:font-semibold">Included tools</h2>
            {plugin.capabilities.agentTools && connectedConnections.length > 0 ? (
              <Button
                className="fk:ml-auto"
                disabled={busy}
                size="sm"
                variant="ghost"
                onClick={() =>
                  void perform(async () => {
                    for (const connection of connectedConnections) {
                      await api.refreshPluginTools(connection.id);
                      await revalidateKey(`${base}/plugin-connections/${connection.id}/tools`);
                    }
                  })
                }
              >
                <RefreshCw />
                Refresh
              </Button>
            ) : null}
          </div>
          {plugin.capabilities.automationDelivery ? (
            <p className="fk:text-sm fk:text-muted-foreground">
              Automation delivery to selected channels. This plugin does not expose MCP messaging tools.
            </p>
          ) : null}
          {plugin.capabilities.agentTools && connectedConnections.length === 0 ? (
            <p className="fk:text-sm fk:text-muted-foreground">Connect to discover available tools.</p>
          ) : null}
          {plugin.capabilities.agentTools
            ? connectedConnections.map((connection) => (
                <ConnectionTools base={base} connectionId={connection.id} key={connection.id} />
              ))
            : null}
        </section>
        <section className="fk:flex fk:flex-col fk:gap-3">
          <h2 className="fk:text-xl fk:font-semibold">Included skills</h2>
          {data.skills.length === 0 ? (
            <p className="fk:text-sm fk:text-muted-foreground">This plugin includes no skills.</p>
          ) : (
            data.skills.map((skill) => (
              <div key={skill.key}>
                <h3 className="fk:font-medium">{skill.name}</h3>
                <p className="fk:text-sm fk:text-muted-foreground">{skill.description}</p>
              </div>
            ))
          )}
        </section>
        <section className="fk:space-y-3">
          <h2 className="fk:text-xl fk:font-semibold">Used by</h2>
          {plugin.usedBy.length === 0 ? (
            <p className="fk:text-sm fk:text-muted-foreground">No automations visible to you use this plugin yet.</p>
          ) : (
            <ul>
              {plugin.usedBy.map((automation) => (
                <li key={automation.id}>
                  <Button
                    className="fk:pl-0!"
                    variant="link"
                    onClick={() => navigate(`../../automations/${automation.id}`, { relative: 'path' })}
                  >
                    {automation.name}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      </ScrollArea>
    </main>
  );
}
