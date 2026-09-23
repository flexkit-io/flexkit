import type { JSX } from 'react';
import useSWR from 'swr';
import { fetcher } from './api';
import type { Marketplace, MarketplacePlugin, PluginTools } from './plugin-types';
import type { AutomationToolConfigInput } from './types';

function PluginToolSelection({
  projectId,
  plugin,
  usage,
  disabled,
  onChange,
}: {
  projectId: string;
  plugin: MarketplacePlugin;
  usage: AutomationToolConfigInput | undefined;
  disabled: boolean;
  onChange: (usage: AutomationToolConfigInput) => void;
}): JSX.Element {
  const connections = plugin.connections.filter(
    (connection) => connection.status === 'connected' && (connection.scope === 'project' || plugin.allowPersonal)
  );
  const connection = connections.find((entry) =>
    usage?.connectionMode === 'personal' ? entry.id === usage.connectionId : entry.scope === 'project'
  );

  const { data, error } = useSWR<PluginTools>(
    connection ? `/api/flexkit/${projectId}/plugin-connections/${connection.id}/tools` : null,
    fetcher
  );
  const base: AutomationToolConfigInput = usage ?? {
    pluginId: plugin.id,
    enabled: false,
    connectionMode: 'project',
    connectionId: null,
    selectedTools: [],
    deliveryEnabled: false,
    channels: [],
  };

  return (
    <fieldset disabled={disabled || !plugin.enabled} className="fk:space-y-2 fk:rounded-md fk:border fk:p-3">
      <legend className="fk:px-1 fk:font-medium">{plugin.name}</legend>
      <label className="fk:flex fk:items-center fk:gap-2">
        Connection
        <select
          className="fk:rounded-md fk:border fk:bg-background fk:p-2"
          value={connection?.id ?? ''}
          onChange={(event) => {
            const next = connections.find((entry) => entry.id === event.target.value);

            if (!next) {
              return;
            }

            onChange({
              ...base,
              connectionMode: next.scope,
              connectionId: next.scope === 'personal' ? next.id : null,
              selectedTools: [],
              enabled: false,
            });
          }}
        >
          <option value="" disabled>
            Select connection
          </option>
          {connections
            .filter((entry) => entry.scope === 'project' || plugin.allowPersonal)
            .map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.scope === 'project' ? 'Project connection' : 'Your connection'} · {entry.accountName}
              </option>
            ))}
        </select>
      </label>
      {base.connectionMode === 'personal' && (
        <p className="fk:text-sm fk:text-muted-foreground">Using your connection makes this automation personal.</p>
      )}
      {!connections.length && (
        <p className="fk:text-sm fk:text-muted-foreground">Connect this plugin in Marketplace first.</p>
      )}
      {error && <p role="alert">Unable to load tools. Reconnect or try again.</p>}
      {data?.servers.map((server) => (
        <div key={server.name} className="fk:space-y-2">
          {server.error && <p role="alert">{server.error}</p>}
          {server.tools.map((entry) => {
            const key = `${encodeURIComponent(server.name)}:${encodeURIComponent(entry.name)}`;
            const checked = base.selectedTools.includes(key);

            return (
              <label key={key} className="fk:flex fk:items-start fk:gap-2 fk:text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    const selectedTools = event.target.checked
                      ? [...base.selectedTools, key]
                      : base.selectedTools.filter((item) => item !== key);
                    onChange({ ...base, selectedTools, enabled: selectedTools.length > 0 });
                  }}
                />
                <span>
                  {entry.name}
                  <span className="fk:block fk:text-muted-foreground">{entry.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      ))}
    </fieldset>
  );
}

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

  return (
    <section className="fk:space-y-3">
      <h3 className="fk:font-medium">Plugin tools</h3>
      <p className="fk:text-sm fk:text-muted-foreground">Select the tools available to this agent.</p>
      {error && <p role="alert">Unable to load plugins. Your existing selections are preserved.</p>}
      {data?.plugins
        .filter((plugin) => plugin.capabilities.agentTools)
        .map((plugin) => (
          <PluginToolSelection
            key={plugin.id}
            projectId={projectId}
            plugin={plugin}
            usage={value.find((usage) => usage.pluginId === plugin.id)}
            disabled={disabled}
            onChange={(usage) => onChange([...value.filter((entry) => entry.pluginId !== plugin.id), usage])}
          />
        ))}
    </section>
  );
}
