import type { FormEvent, JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@flexkit/studio/ui';
import { BrainIcon, CheckIcon, ChevronsUpDownIcon, LoaderCircleIcon, Trash2Icon, XIcon } from 'lucide-react';
import { fetcher, paths, type ApiClient } from './api';
import type {
  Automation,
  AutomationInput,
  AutomationTools,
  AutomationToolChannel,
  AutomationToolConfigInput,
  AutomationToolProvider,
  AutomationProviderTools,
} from './types';

interface AutomationFormProps {
  api: ApiClient;
  automation?: Automation;
  mode: 'create' | 'edit';
  onSaved: (_automation?: Automation) => void;
  projectId: string;
}

interface ToolsResponse {
  tools: AutomationTools;
}

interface AutomationProviderToolFormData extends AutomationProviderTools {
  availableChannels: AutomationToolChannel[];
  channelsLoadError?: string;
  channelsLoaded: boolean;
  loadingChannels: boolean;
}

type AutomationToolsFormData = {
  slack: AutomationProviderToolFormData;
  teams: AutomationProviderToolFormData;
};

interface ChannelPickerProps {
  channels: AutomationToolChannel[];
  disabled?: boolean;
  loading: boolean;
  onChange: (_channels: AutomationToolChannel[]) => void;
  onRefresh: () => void;
  provider: AutomationToolProvider;
  value: AutomationToolChannel[];
}

const SCHEDULE_PRESETS = [
  { label: 'No schedule', value: 'none' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 9:00', value: '0 9 * * *' },
  { label: 'Every Monday at 9:00', value: '0 9 * * 1' },
  { label: 'First day of the month at 9:00', value: '0 9 1 * *' },
  { label: 'Custom cron expression', value: 'custom' },
];

const TOOL_PROVIDERS: AutomationToolProvider[] = ['slack', 'teams'];

function getInitialSchedule(automation?: Automation): { customCron: string; preset: string } {
  if (!automation?.triggerSchedule) {
    return { customCron: '', preset: 'none' };
  }

  const preset = SCHEDULE_PRESETS.find((item) => item.value === automation.triggerSchedule);

  if (preset) {
    return { customCron: '', preset: preset.value };
  }

  return { customCron: automation.triggerSchedule, preset: 'custom' };
}

function getModelOptions(
  models: AutomationTools['models'],
  mode: AutomationFormProps['mode'],
  selectedModelId: string
): AutomationTools['models'] {
  const activeModels = models.filter((model) => !model.deprecated);

  if (mode !== 'edit' || !selectedModelId) {
    return activeModels;
  }

  const selectedModel = models.find((model) => model.id === selectedModelId);

  if (selectedModel?.deprecated) {
    return [selectedModel, ...activeModels.filter((model) => model.id !== selectedModelId)];
  }

  if (!selectedModel && !activeModels.some((model) => model.id === selectedModelId)) {
    return [
      {
        deprecated: true,
        effort: null,
        id: selectedModelId,
        name: selectedModelId,
      },
      ...activeModels,
    ];
  }

  return activeModels;
}

function getChannelKey(channel: AutomationToolChannel): string {
  return `${channel.teamId ?? ''}:${channel.id}`;
}

function mergeChannels(
  selectedChannels: AutomationToolChannel[],
  availableChannels: AutomationToolChannel[]
): AutomationToolChannel[] {
  const channelsByKey: { [key: string]: AutomationToolChannel } = {};

  for (const channel of [...selectedChannels, ...availableChannels]) {
    channelsByKey[getChannelKey(channel)] = channel;
  }

  return Object.values(channelsByKey);
}

function getInitialProviderToolFormData(
  providerTools: AutomationProviderTools,
  mode: AutomationFormProps['mode']
): AutomationProviderToolFormData {
  return {
    ...providerTools,
    availableChannels: providerTools.channels,
    channelsLoaded: !providerTools.connected,
    enabled: providerTools.connected && (mode === 'create' || providerTools.enabled),
    loadingChannels: false,
  };
}

function getInitialToolsFormData(tools: AutomationTools, mode: AutomationFormProps['mode']): AutomationToolsFormData {
  return {
    slack: getInitialProviderToolFormData(tools.providers.slack, mode),
    teams: getInitialProviderToolFormData(tools.providers.teams, mode),
  };
}

function ChannelPicker({
  channels,
  disabled,
  loading,
  onChange,
  onRefresh,
  provider,
  value,
}: ChannelPickerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedIds = new Set(value.map((channel) => channel.id));
  const providerLabel = provider === 'slack' ? 'Slack' : 'Teams';
  const filteredChannels = channels.filter((channel) => channel.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      const { target } = event;

      if (!(target instanceof Node) || containerRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') {
        return;
      }

      setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleSelect(channel: AutomationToolChannel): void {
    if (selectedIds.has(channel.id)) {
      onChange(value.filter((selectedChannel) => selectedChannel.id !== channel.id));

      return;
    }

    onChange([...value, channel]);
  }

  function handleRemove(channelId: string): void {
    onChange(value.filter((channel) => channel.id !== channelId));
  }

  return (
    <div className="fk:relative" ref={containerRef}>
      <Button
        aria-expanded={open}
        className="fk:h-auto fk:min-h-8 fk:w-full fk:max-w-100 fk:justify-between fk:bg-muted/60 fk:px-3 fk:py-1 hover:fk:border-secondary fk:dark:bg-muted/30"
        disabled={disabled}
        role="combobox"
        type="button"
        variant="outline"
        onClick={() => setOpen((current) => !current)}
      >
        <div className="fk:flex fk:flex-1 fk:flex-wrap fk:gap-1">
          {value.length === 0 ? (
            <span className="fk:text-muted-foreground">
              {loading ? `Loading ${providerLabel} channels...` : `Select ${providerLabel} channels`}
            </span>
          ) : (
            value.map((channel) => (
              <Badge
                className="fk:rounded-sm fk:bg-accent fk:text-xs"
                key={getChannelKey(channel)}
                variant="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemove(channel.id);
                }}
              >
                {channel.name}
                <XIcon className="fk:ml-1 fk:size-3 fk:cursor-pointer" />
              </Badge>
            ))
          )}
        </div>
        <ChevronsUpDownIcon className="fk:size-4 fk:shrink-0 fk:opacity-50" />
      </Button>
      {open ? (
        <div className="fk:absolute fk:z-50 fk:mt-1 fk:w-full fk:min-w-[320px] fk:rounded-md fk:border fk:bg-popover fk:p-0 fk:text-popover-foreground fk:shadow-md">
          <div className="fk:border-b fk:p-2">
            <Input
              className="fk:h-8"
              placeholder={`Search ${providerLabel} channels...`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="fk:max-h-56 fk:overflow-auto fk:p-1">
            {filteredChannels.length > 0 ? (
              filteredChannels.map((channel) => (
                <button
                  className="fk:flex fk:w-full fk:items-center fk:rounded-sm fk:px-2 fk:py-1.5 fk:text-left fk:text-sm hover:fk:bg-accent"
                  key={getChannelKey(channel)}
                  type="button"
                  onClick={() => handleSelect(channel)}
                >
                  <CheckIcon className={`fk:mr-2 fk:size-4 ${selectedIds.has(channel.id) ? 'fk:opacity-100' : 'fk:opacity-0'}`} />
                  {channel.name}
                </button>
              ))
            ) : (
              <div className="fk:px-2 fk:py-6 fk:text-center fk:text-sm fk:text-muted-foreground">
                {loading ? 'Loading channels...' : 'No channels found.'}
              </div>
            )}
          </div>
          <div className="fk:border-t fk:border-border fk:p-2">
            <Button
              className="fk:h-8 fk:w-full fk:justify-center fk:text-xs"
              disabled={loading}
              type="button"
              variant="ghost"
              onClick={onRefresh}
            >
              {loading ? (
                <>
                  <LoaderCircleIcon className="fk:mr-2 fk:size-3 fk:animate-spin" />
                  Refreshing channels...
                </>
              ) : (
                'Refresh channels'
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SlackIcon(): JSX.Element {
  return (
    <svg
      aria-label="Slack"
      className="fk:mt-1 fk:size-3.5 fk:text-muted-foreground"
      fill="currentColor"
      role="img"
      viewBox="0 0 127 127"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" />
      <path d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z" />
      <path d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.9 6.5 72.8.6 80.1.6c7.3 0 13.2 5.9 13.2 13.2v33.1z" />
      <path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z" />
    </svg>
  );
}

function TeamsIcon(): JSX.Element {
  return (
    <svg
      aria-label="Microsoft Teams"
      className="fk:mt-1 fk:size-3.5 fk:text-muted-foreground"
      fill="currentColor"
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clipRule="evenodd"
        d="M15.5 5A3 3 0 0 1 14 7.599V7.5a2 2 0 0 0-2-2H9.541A3 3 0 1 1 15.5 5Zm6.25 1a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-3.294 11.732A3.25 3.25 0 0 0 23 14.75v-4.361a.889.889 0 0 0-.889-.889h-3.879c.17.294.268.636.268 1V17c0 .248-.015.492-.044.732ZM8.169 19.5A5 5 0 0 0 17.5 17v-6.5a1 1 0 0 0-1-1H14v8a2 2 0 0 1-2 2H8.169Z"
        fillRule="evenodd"
      />
      <path
        clipRule="evenodd"
        d="M1 17.5v-10a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1Zm6.75-6.75H9.5v-1.5h-5v1.5h1.75v4.75h1.5v-4.75Z"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function AutomationForm({ api, automation, mode, onSaved, projectId }: AutomationFormProps): JSX.Element {
  const initialSchedule = getInitialSchedule(automation);
  const [name, setName] = useState(automation?.name ?? '');
  const [instructions, setInstructions] = useState(automation?.instructions ?? '');
  const [enabled, setEnabled] = useState(automation?.enabled ?? false);
  const [modelId, setModelId] = useState(automation?.modelId ?? '');
  const [schedulePreset, setSchedulePreset] = useState(initialSchedule.preset);
  const [customCron, setCustomCron] = useState(initialSchedule.customCron);
  const [scheduleTimezone, setScheduleTimezone] = useState(automation?.scheduleTimezone ?? 'UTC');
  const [triggerCreate, setTriggerCreate] = useState(automation?.triggerCreate ?? false);
  const [triggerUpdate, setTriggerUpdate] = useState(automation?.triggerUpdate ?? false);
  const [triggerDelete, setTriggerDelete] = useState(automation?.triggerDelete ?? false);
  const [entitiesText, setEntitiesText] = useState((automation?.entities ?? []).join(', '));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [toolsFormData, setToolsFormData] = useState<AutomationToolsFormData | null>(null);
  const toolsUrl = paths(projectId).tools(automation?.id);
  const { data: toolsData } = useSWR<ToolsResponse>(toolsUrl, fetcher);
  const modelOptions = useMemo(
    () => getModelOptions(toolsData?.tools.models ?? [], mode, modelId || automation?.modelId || ''),
    [automation?.modelId, mode, modelId, toolsData?.tools.models]
  );
  const effectiveModelId = modelId || modelOptions[0]?.id || '';
  const triggerSchedule = useMemo(() => {
    if (schedulePreset === 'none') {
      return null;
    }

    if (schedulePreset === 'custom') {
      return customCron.trim() || null;
    }

    return schedulePreset;
  }, [customCron, schedulePreset]);

  useEffect(() => {
    if (!toolsData?.tools) {
      return;
    }

    setToolsFormData(getInitialToolsFormData(toolsData.tools, mode));
  }, [automation?.id, mode, toolsData?.tools]);

  const loadProviderChannels = useCallback(
    async (provider: AutomationToolProvider): Promise<void> => {
      setToolsFormData((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          [provider]: {
            ...current[provider],
            channelsLoadError: undefined,
            loadingChannels: true,
          },
        };
      });

      try {
        const result = await api.listChannels(provider);
        const loadErrorMessage = result.success
          ? undefined
          : result.errorMessage ?? `Failed to load ${provider === 'slack' ? 'Slack' : 'Teams'} channels.`;

        setToolsFormData((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            [provider]: {
              ...current[provider],
              availableChannels: mergeChannels(current[provider].channels, result.channels),
              channelsLoadError: loadErrorMessage,
              channelsLoaded: true,
              loadingChannels: false,
            },
          };
        });

      } catch (error) {
        const loadErrorMessage = error instanceof Error ? error.message : 'Failed to load integration channels.';

        setToolsFormData((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            [provider]: {
              ...current[provider],
              channelsLoadError: loadErrorMessage,
              channelsLoaded: true,
              loadingChannels: false,
            },
          };
        });
      }
    },
    [api]
  );

  useEffect(() => {
    if (!toolsFormData) {
      return;
    }

    for (const provider of TOOL_PROVIDERS) {
      const tool = toolsFormData[provider];

      if (tool.connected && !tool.channelsLoaded && !tool.loadingChannels) {
        void loadProviderChannels(provider);
      }
    }
  }, [loadProviderChannels, toolsFormData]);

  function updateTool(provider: AutomationToolProvider, value: Partial<AutomationProviderToolFormData>): void {
    setToolsFormData((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [provider]: {
          ...current[provider],
          ...value,
        },
      };
    });
  }

  function handleRemoveTool(provider: AutomationToolProvider): void {
    updateTool(provider, {
      channels: [],
      enabled: false,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');

    const toolConfigs: AutomationToolConfigInput[] = TOOL_PROVIDERS.map((provider) => {
      const providerTools = toolsFormData?.[provider] ?? toolsData?.tools.providers[provider];

      return {
        channels: providerTools?.channels ?? [],
        enabled: providerTools?.enabled ?? false,
        provider,
      };
    });
    const input: AutomationInput = {
      enabled,
      entities: entitiesText
        .split(',')
        .map((entity) => entity.trim())
        .filter(Boolean),
      instructions,
      modelId: effectiveModelId,
      name,
      scheduleTimezone,
      toolConfigs,
      triggerCreate,
      triggerDelete,
      triggerSchedule,
      triggerUpdate,
    };

    try {
      const result =
        mode === 'create' || !automation
          ? await api.createAutomation(input)
          : await api.updateAutomation(automation.id, input);

      if (!result.success) {
        setMessage(Array.isArray(result.errorMessage) ? result.errorMessage.join(', ') : result.errorMessage);

        return;
      }

      onSaved(result.automation);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save automation.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="fk:max-w-3xl fk:space-y-8 fk:px-1 fk:mx-auto" onSubmit={(event) => void handleSubmit(event)}>
      {message ? (
        <div className="fk:rounded-md fk:border fk:border-destructive/30 fk:bg-destructive/5 fk:p-3 fk:text-sm fk:text-destructive">
          {message}
        </div>
      ) : null}

      <div className="fk:space-y-3">
        <Label className="fk:mb-1">Status</Label>
        <p className="fk:text-xs fk:text-muted-foreground fk:mb-1">
          Disabling an automation stops its schedule and ignores entity events
        </p>
        <div className="fk:flex fk:h-10 fk:items-center fk:gap-2">
          <Switch checked={enabled} id="automation-enabled" onCheckedChange={setEnabled} />
          <Label className="fk:font-normal" htmlFor="automation-enabled">
            {enabled ? 'Active' : 'Inactive'}
          </Label>
        </div>
      </div>

      <div className="fk:space-y-3">
        <Label className="fk:mb-1" htmlFor="automation-name">
          Name
        </Label>
        <p className="fk:text-xs fk:text-muted-foreground fk:mb-2">Identifying label for this automation</p>
        <Input id="automation-name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>

      <div className="fk:space-y-3">
        <Label className="fk:mb-1" htmlFor="automation-instructions">
          Agent instructions
        </Label>
        <p className="fk:text-xs fk:text-muted-foreground fk:mb-2">
          Natural-language instructions the agent follows on every run. Be specific about entities, conditions, and the
          expected outcome.
        </p>
        <div>
          <div className="fk:rounded-t-md fk:border-x fk:border-t fk:border-input fk:bg-muted/60 fk:ring-offset-background focus-within:fk:ring-2 focus-within:fk:ring-ring focus-within:fk:ring-offset-2 fk:dark:bg-muted/30">
            <Textarea
              className="fk:flex fk:min-h-[160px] fk:max-h-[320px] fk:w-full fk:rounded-none fk:border-0 fk:bg-transparent fk:pb-11 fk:shadow-none focus-visible:fk:ring-0 focus-visible:fk:ring-offset-0 fk:mask-[linear-gradient(to_bottom,black_calc(100%-2.75rem),#0009_calc(100%-1.25rem),#0003_calc(100%-0.5rem),transparent)] fk:[-webkit-mask-image:linear-gradient(to_bottom,black_calc(100%-2.75rem),#0009_calc(100%-1.25rem),#0003_calc(100%-0.5rem),transparent)]"
              id="automation-instructions"
              placeholder="Describe what the agent should do on each run, e.g. 'When a new Review is created, translate the text to English, run a sentiment analysis and store the result in the sentiment attribute...'"
              rows={8}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
            />
          </div>
          <div className="fk:rounded-b-md fk:border-x fk:border-b fk:border-input fk:bg-muted/60 fk:px-2 fk:py-2 fk:dark:bg-muted/30">
            <Select value={effectiveModelId} onValueChange={setModelId}>
              <SelectTrigger
                aria-label="Model"
                className="fk:w-fit fk:border-transparent fk:bg-background/90 fk:px-2.5 fk:py-0 fk:text-xs fk:shadow-sm hover:fk:border-border"
                size="sm"
              >
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent align="start">
                {modelOptions.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                    {model.deprecated ? ' (Legacy)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="fk:space-y-4">
        <div>
          <Label className="fk:text-sm fk:font-medium">Tools</Label>
          <p className="fk:mb-3 fk:text-xs fk:text-muted-foreground">
            Configure additional destinations and built-in capabilities for this automation.
          </p>
        </div>
        <div className="fk:rounded-lg fk:border fk:bg-muted/60 fk:dark:bg-muted/30">
          <div className="fk:rounded-t-lg">
            <div className="fk:m-1.5 fk:flex fk:items-start fk:justify-between fk:gap-3 fk:rounded-md fk:p-1.5 fk:hover:bg-muted">
              <div className="fk:flex fk:gap-3 fk:pb-0.5">
                <BrainIcon className="fk:mt-1 fk:size-3.5 fk:text-muted-foreground" />
                <div>
                  <div className="fk:text-sm fk:font-medium">Memories</div>
                  <p className="fk:text-xs fk:text-muted-foreground">
                    Builds memory across runs to make automations smarter over time
                  </p>
                </div>
              </div>
              <Badge className="fk:mt-1.5 fk:py-0 fk:text-[10px] fk:font-light fk:tracking-wide" variant="secondary">
                Always on
              </Badge>
            </div>
          </div>

          {toolsFormData ? (
            TOOL_PROVIDERS.map((provider) => {
              const tool = toolsFormData[provider];
              const providerLabel = provider === 'slack' ? 'Send to Slack' : 'Send to Microsoft Teams';
              const Icon = provider === 'slack' ? SlackIcon : TeamsIcon;

              return (
                <div className="fk:m-1.5 fk:space-y-2 fk:rounded-md fk:p-1.5 fk:hover:bg-muted" key={provider}>
                  <div className="fk:flex fk:items-center fk:justify-between fk:gap-3">
                    <div className="fk:flex fk:gap-3">
                      <Icon />
                      <div>
                        <div className="fk:text-sm fk:font-medium">{providerLabel}</div>
                        {tool.workspaceName ? (
                          <p className="fk:text-xs fk:text-muted-foreground">Connected to {tool.workspaceName}</p>
                        ) : null}
                      </div>
                    </div>
                    {tool.connected ? (
                      tool.enabled ? (
                        <Button
                          aria-label={`Remove ${provider === 'slack' ? 'Slack' : 'Microsoft Teams'} from automation`}
                          size="icon"
                          type="button"
                          variant="ghost"
                          onClick={() => handleRemoveTool(provider)}
                        >
                          <Trash2Icon className="fk:size-4 fk:text-muted-foreground" />
                        </Button>
                      ) : (
                        <Button size="sm" type="button" variant="outline" onClick={() => updateTool(provider, { enabled: true })}>
                          Add
                        </Button>
                      )
                    ) : (
                      <Button
                        disabled={!toolsData?.tools.teamId}
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const teamId = toolsData?.tools.teamId;

                          if (!teamId) {
                            return;
                          }

                          window.open(api.getIntegrationManageUrl(teamId), '_blank', 'noopener,noreferrer');
                        }}
                      >
                        Manage
                      </Button>
                    )}
                  </div>
                  {!tool.connected ? (
                    <p className="fk:pl-7 fk:text-xs fk:text-muted-foreground">
                      Connect {provider === 'slack' ? 'Slack' : 'Microsoft Teams'} in Project Integrations before using it in an
                      automation.
                    </p>
                  ) : null}
                  {tool.connected && tool.enabled ? (
                    <div className="fk:space-y-2 fk:pl-7">
                      <Label className="fk:mr-3 fk:text-xs fk:font-medium">Channels</Label>
                      <ChannelPicker
                        channels={tool.availableChannels}
                        disabled={tool.loadingChannels}
                        loading={tool.loadingChannels}
                        provider={provider}
                        value={tool.channels}
                        onChange={(channels) => updateTool(provider, { channels })}
                        onRefresh={() => {
                          void loadProviderChannels(provider);
                        }}
                      />
                      {tool.channelsLoadError ? (
                        <p className="fk:text-xs fk:text-destructive">{tool.channelsLoadError}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="fk:flex fk:items-center fk:justify-center fk:gap-2 fk:p-4 fk:text-sm fk:text-muted-foreground">
              <LoaderCircleIcon className="fk:size-4 fk:animate-spin" />
              Loading tools...
            </div>
          )}
        </div>
      </div>

      <div className="fk:grid fk:gap-4 md:fk:grid-cols-2">
        <div className="fk:space-y-3">
          <Label className="fk:mb-0.5">Schedule</Label>
          <Select value={schedulePreset} onValueChange={setSchedulePreset}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULE_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="fk:space-y-3">
          <Label className="fk:mb-0.5" htmlFor="automation-timezone">
            Timezone
          </Label>
          <Input
            id="automation-timezone"
            value={scheduleTimezone}
            onChange={(event) => setScheduleTimezone(event.target.value)}
          />
        </div>
      </div>

      {schedulePreset === 'custom' ? (
        <div className="fk:space-y-3">
          <Label className="fk:mb-0.5" htmlFor="automation-cron">
            Cron expression
          </Label>
          <Input id="automation-cron" value={customCron} onChange={(event) => setCustomCron(event.target.value)} />
        </div>
      ) : null}

      <div className="fk:space-y-3">
        <Label className="fk:mb-0.5">Entity events</Label>
        <div className="fk:flex fk:flex-wrap fk:gap-3 fk:text-sm">
          <label className="fk:flex fk:items-center fk:gap-2">
            <input
              checked={triggerCreate}
              type="checkbox"
              onChange={(event) => setTriggerCreate(event.target.checked)}
            />
            Create
          </label>
          <label className="fk:flex fk:items-center fk:gap-2">
            <input
              checked={triggerUpdate}
              type="checkbox"
              onChange={(event) => setTriggerUpdate(event.target.checked)}
            />
            Update
          </label>
          <label className="fk:flex fk:items-center fk:gap-2">
            <input
              checked={triggerDelete}
              type="checkbox"
              onChange={(event) => setTriggerDelete(event.target.checked)}
            />
            Delete
          </label>
        </div>
      </div>

      <div className="fk:space-y-3">
        <Label className="fk:mb-0.5" htmlFor="automation-entities">
          Entities
        </Label>
        <Input
          id="automation-entities"
          placeholder="Product, Review"
          value={entitiesText}
          onChange={(event) => setEntitiesText(event.target.value)}
        />
        <p className="fk:text-xs fk:text-muted-foreground">
          Comma-separated entity names. Leave empty for all entities.
        </p>
      </div>

      <div className="fk:flex fk:justify-end">
        <Button disabled={isSaving} type="submit">
          {isSaving ? 'Saving...' : mode === 'create' ? 'Create automation' : 'Update automation'}
        </Button>
      </div>
    </form>
  );
}
