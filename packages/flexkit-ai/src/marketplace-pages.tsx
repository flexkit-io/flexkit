import { useMemo, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useSWR, { useSWRConfig } from 'swr';
import Markdown from 'react-markdown';
import { useConfig } from '@flexkit/studio';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SidebarTrigger,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  toast,
} from '@flexkit/studio/ui';
import { ArrowLeft, ExternalLink, Plug, RefreshCw } from 'lucide-react';
import { createApiClient, fetcher } from './api';
import { connectPluginPopup } from './plugin-oauth';
import type { Marketplace, MarketplacePlugin, PluginDetail, PluginScope, PluginTools } from './plugin-types';

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

function pluginStatus(plugin: MarketplacePlugin, canManage: boolean): string {
  if (!plugin.enabled) {
    return 'Disabled by project policy';
  }

  if (plugin.connections.some((connection) => connection.status === 'connected')) {
    return `Connected · used by ${plugin.usedBy.length} automations`;
  }

  if (plugin.connections.some((connection) => connection.status === 'needs_auth')) {
    return 'Reconnect';
  }

  if (!canManage && !plugin.scopes.includes('personal')) {
    return 'Ask an admin to connect';
  }

  return 'Connect';
}

export function MarketplacePage(): JSX.Element {
  const { base } = useMarketplaceApi();
  const { data, error, isLoading } = useSWR<Marketplace>(base ? `${base}/plugins` : null, fetcher);
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const categories = [...new Set(data?.plugins.map((plugin) => plugin.category) ?? [])];
  const plugins =
    data?.plugins.filter((plugin) => {
      const connected = plugin.connections.some((connection) => connection.status === 'connected');

      return (
        (filter === 'all' || (filter === 'connected' && connected) || (filter === 'setup' && !connected)) &&
        (category === 'all' || category === plugin.category) &&
        `${plugin.name} ${plugin.description}`.toLowerCase().includes(search.toLowerCase())
      );
    }) ?? [];

  return (
    <main className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col fk:overflow-auto">
      <header className="fk:flex fk:items-center fk:gap-3 fk:border-b fk:p-4">
        <SidebarTrigger />
        <h1 className="fk:text-lg fk:font-semibold">Marketplace</h1>
      </header>
      <div className="fk:mx-auto fk:flex fk:w-full fk:max-w-6xl fk:flex-col fk:gap-6 fk:p-6">
        <div>
          <h2 className="fk:text-2xl fk:font-semibold">Plugins for your agents</h2>
          <p className="fk:mt-2 fk:text-muted-foreground">
            Connect the tools you use and add skills to your workflows.
          </p>
        </div>
        <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-3">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="connected">Connected</TabsTrigger>
              <TabsTrigger value="setup">Needs setup</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            aria-label="Search plugins"
            className="fk:max-w-xs"
            placeholder="Search plugins…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="fk:w-48" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>Unable to load the marketplace. Please try again.</AlertDescription>
          </Alert>
        ) : null}
        {isLoading ? <Skeleton className="fk:h-48 fk:w-full" /> : null}
        {!isLoading && !error && plugins.length === 0 ? (
          <Alert>
            <AlertDescription>
              {data?.catalogSha
                ? 'No plugins match these filters.'
                : 'The marketplace is being prepared. Check back soon.'}
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="fk:grid fk:gap-4 fk:md:grid-cols-2 fk:xl:grid-cols-3">
          {plugins.map((plugin) => (
            <button
              key={plugin.id}
              type="button"
              onClick={() => navigate(plugin.id)}
              className="fk:flex fk:flex-col fk:gap-4 fk:rounded-lg fk:border fk:bg-card fk:p-5 fk:text-left fk:hover:bg-accent fk:focus-visible:outline-2 fk:focus-visible:outline-ring"
            >
              <div className="fk:flex fk:items-center fk:gap-3">
                <img src={plugin.logoUrl} alt="" className="fk:size-10 fk:rounded-lg" />
                <span className="fk:text-lg fk:font-semibold">{plugin.name}</span>
                {plugin.preview ? <Badge variant="secondary">Preview</Badge> : null}
              </div>
              <p className="fk:flex-1 fk:text-sm fk:text-muted-foreground">{plugin.description}</p>
              <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-2">
                <Badge variant="outline">{scopeLabel(plugin.scopes)}</Badge>
                <span className="fk:text-xs">{pluginStatus(plugin, data?.canManage ?? false)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
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
        <section key={server.name}>
          <h4 className="fk:font-medium">{server.name}</h4>
          {server.error ? <p>{server.error}</p> : null}
          <ul className="fk:mt-2 fk:flex fk:flex-col fk:gap-2">
            {server.tools.map((tool) => (
              <li key={tool.name}>
                <span className="fk:text-sm fk:font-medium">{tool.name}</span>
                <p className="fk:text-sm fk:text-muted-foreground">{tool.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
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
  const [googleSelection, setGoogleSelection] = useState<string[]>([]);
  const plugin = data?.plugin;
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
      <div className="fk:p-6">
        <Skeleton className="fk:h-64 fk:w-full" />
      </div>
    );
  }

  return (
    <main className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col fk:overflow-auto">
      <header className="fk:flex fk:items-center fk:gap-3 fk:border-b fk:p-4">
        <SidebarTrigger />
        <Button variant="ghost" size="sm" onClick={() => navigate('..', { relative: 'path' })}>
          <ArrowLeft />
          Marketplace
        </Button>
      </header>
      <div className="fk:mx-auto fk:flex fk:w-full fk:max-w-3xl fk:flex-col fk:gap-8 fk:p-6">
        <section className="fk:flex fk:flex-col fk:gap-3">
          <div className="fk:flex fk:items-center fk:gap-4">
            <img src={plugin.logoUrl} alt="" className="fk:size-14 fk:rounded-lg" />
            <h1 className="fk:text-3xl fk:font-semibold">{plugin.name}</h1>
          </div>
          <p className="fk:text-muted-foreground">{plugin.description}</p>
          <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-3">
            <Badge variant="outline">{scopeLabel(plugin.scopes)}</Badge>
            <span className="fk:text-sm">
              Version {plugin.version ?? 'unversioned'} · {new Date(plugin.updatedAt).toLocaleDateString()}
            </span>
            <a
              href={plugin.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="fk:inline-flex fk:items-center fk:gap-1 fk:text-sm fk:underline"
            >
              View source
              <ExternalLink className="fk:size-3" />
            </a>
          </div>
        </section>
        {plugin.preview ? (
          <Alert>
            <AlertDescription>
              This provider is in preview. Google plugins require an eligible Google Workspace Developer Preview
              account.
            </AlertDescription>
          </Alert>
        ) : null}
        {!plugin.enabled ? (
          <Alert>
            <AlertDescription>This plugin is disabled by project policy.</AlertDescription>
          </Alert>
        ) : null}
        <section className="fk:flex fk:flex-col fk:gap-3">
          <h2 className="fk:text-xl fk:font-semibold">Connections</h2>
          {plugin.scopes.map((scope) => {
            const connection = plugin.connections.find((item) => item.scope === scope && item.status !== 'revoked');
            const permitted = scope === 'personal' ? plugin.allowPersonal : data.canManage;

            return (
              <div
                key={scope}
                className="fk:flex fk:flex-wrap fk:items-center fk:justify-between fk:gap-3 fk:rounded-lg fk:border fk:p-4"
              >
                <div>
                  <h3 className="fk:font-medium">{scope === 'project' ? 'Project connection' : 'Your connection'}</h3>
                  <p className="fk:text-sm fk:text-muted-foreground">
                    {connection?.accountName ?? 'Not connected'}
                    {connection ? ` · ${connection.status.replace('_', ' ')}` : ''}
                  </p>
                </div>
                <div className="fk:flex fk:gap-2">
                  {connection && permitted ? (
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
                  >
                    <Plug />
                    {connection ? 'Reconnect' : 'Connect'}
                  </Button>
                </div>
                {!permitted ? (
                  <p className="fk:w-full fk:text-sm fk:text-muted-foreground">
                    {scope === 'project'
                      ? 'Ask an owner or developer to connect.'
                      : 'Personal connections are disabled by project policy.'}
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>
        {['gmail', 'google-drive', 'google-calendar'].includes(plugin.id) && (
          <section className="fk:space-y-3">
            <h2 className="fk:text-xl fk:font-semibold">Connect Google apps together</h2>
            <p className="fk:text-sm fk:text-muted-foreground">
              Choose the apps you need. They share your Google account and request permissions in one consent flow.
            </p>
            {['gmail', 'google-drive', 'google-calendar'].map((id) => (
              <label key={id} className="fk:flex fk:items-center fk:gap-2">
                <input
                  type="checkbox"
                  checked={googleSelection.includes(id)}
                  onChange={(event) =>
                    setGoogleSelection(
                      event.target.checked ? [...googleSelection, id] : googleSelection.filter((entry) => entry !== id)
                    )
                  }
                />
                {id === 'gmail' ? 'Gmail' : id === 'google-drive' ? 'Google Drive' : 'Google Calendar'}
              </label>
            ))}
            <Button
              disabled={busy || !plugin.enabled || !plugin.allowPersonal || !googleSelection.length}
              onClick={() => void perform(() => connectPluginPopup(api, googleSelection, 'personal'))}
            >
              Connect Google
            </Button>
          </section>
        )}
        <section className="fk:flex fk:flex-col fk:gap-3">
          <h2 className="fk:text-xl fk:font-semibold">Included tools</h2>
          {plugin.capabilities.automationDelivery ? (
            <p className="fk:text-sm fk:text-muted-foreground">
              Automation delivery to selected channels. This plugin does not expose MCP messaging tools.
            </p>
          ) : null}
          {plugin.capabilities.agentTools &&
          !plugin.connections.some((connection) => connection.status === 'connected') ? (
            <p className="fk:text-sm fk:text-muted-foreground">Connect to discover available tools.</p>
          ) : null}
          {plugin.capabilities.agentTools
            ? plugin.connections
                .filter((connection) => connection.status === 'connected')
                .map((connection) => (
                  <div key={connection.id} className="fk:flex fk:flex-col fk:gap-3">
                    <div className="fk:flex fk:items-center fk:justify-between">
                      <Label>{scopeLabel([connection.scope])}</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          void perform(async () => {
                            await api.refreshPluginTools(connection.id);
                            await revalidateKey(`${base}/plugin-connections/${connection.id}/tools`);
                          })
                        }
                      >
                        <RefreshCw />
                        Refresh
                      </Button>
                    </div>
                    <ConnectionTools base={base} connectionId={connection.id} />
                  </div>
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
        {data.canManage ? (
          <section className="fk:flex fk:flex-col fk:gap-3">
            <h2 className="fk:text-xl fk:font-semibold">Project settings</h2>
            <div className="fk:flex fk:flex-wrap fk:gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void perform(() => api.installPlugin(plugin.id, { updateMode: 'auto' }))}
              >
                Use latest version
              </Button>
              <Button
                variant="outline"
                disabled={busy || !plugin.installed}
                onClick={() =>
                  void perform(() =>
                    api.installPlugin(plugin.id, { versionId: plugin.versionId, updateMode: 'pinned' })
                  )
                }
              >
                Pin this version
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void perform(() =>
                    api.setPluginPolicy(plugin.id, { enabled: !plugin.enabled, allowPersonal: plugin.allowPersonal })
                  )
                }
              >
                {plugin.enabled ? 'Disable plugin' : 'Enable plugin'}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void perform(() =>
                    api.setPluginPolicy(plugin.id, { enabled: plugin.enabled, allowPersonal: !plugin.allowPersonal })
                  )
                }
              >
                {plugin.allowPersonal ? 'Disallow personal connections' : 'Allow personal connections'}
              </Button>
            </div>
          </section>
        ) : null}
        <section className="fk:prose fk:prose-sm">
          <Markdown>{data.changelog || 'No changelog available.'}</Markdown>
        </section>
      </div>
    </main>
  );
}
