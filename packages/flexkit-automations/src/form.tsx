import type { FormEvent, JSX } from 'react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { CronExpressionParser } from 'cron-parser';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Textarea,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@flexkit/studio/ui';
import {
  BrainIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ClockIcon,
  CopyIcon,
  DatabaseZapIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  TriangleAlertIcon,
  WebhookIcon,
  XIcon,
} from 'lucide-react';
import { fetcher, getWebhookTriggerUrl, paths, type ApiClient } from './api';
import type {
  Automation,
  AutomationEntityTrigger,
  AutomationInput,
  AutomationScheduleTrigger,
  AutomationTools,
  AutomationToolChannel,
  AutomationToolConfigInput,
  AutomationToolProvider,
  AutomationTrigger,
  AutomationTriggerEvent,
  AutomationProviderTools,
  AutomationWebhookTrigger,
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

const TOOL_PROVIDERS: AutomationToolProvider[] = ['slack', 'teams'];

const TRIGGER_EVENTS: AutomationTriggerEvent[] = ['create', 'update', 'delete'];

const HOURLY_CRON = '0 * * * *';
const DEFAULT_DAILY_CRON = '0 9 * * *';
const DEFAULT_WEEKLY_CRON = '0 9 * * 1';
const DEFAULT_CUSTOM_CRON = '0 9 1 * *';

const DAY_OPTIONS = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  label: `${hour.toString().padStart(2, '0')}:00`,
  value: hour,
}));

type FormTrigger = AutomationTrigger & { key: string };
type ScheduleFormTrigger = AutomationScheduleTrigger & { key: string };
type WebhookFormTrigger = AutomationWebhookTrigger & { key: string };
type EntityFormTrigger = AutomationEntityTrigger & { key: string };

type ScheduleKind =
  | { kind: 'hourly' }
  | { hour: number; kind: 'daily' }
  | { day: number; hour: number; kind: 'weekly' }
  | { kind: 'custom' };

interface FormValidation {
  instructions: string;
  model: string;
  name: string;
  toolErrors: { [provider: string]: string };
  triggerErrors: { [triggerKey: string]: string };
}

function isFormValidationClean(validation: FormValidation): boolean {
  return (
    !validation.instructions &&
    !validation.model &&
    !validation.name &&
    Object.keys(validation.toolErrors).length === 0 &&
    Object.keys(validation.triggerErrors).length === 0
  );
}

function FieldError({ id, message }: { id?: string; message: string }): JSX.Element | null {
  if (!message) {
    return null;
  }

  return (
    <p className="fk:flex fk:items-start fk:text-sm fk:text-warning fk:gap-1" id={id} role="alert">
      <TriangleAlertIcon className="fk:size-4 fk:shrink-0 fk:mt-0.5" />
      {message}
    </p>
  );
}

function createTriggerKey(): string {
  return crypto.randomUUID();
}

function getInitialTriggers(automation?: Automation): FormTrigger[] {
  return (automation?.triggers ?? []).map((trigger) => ({ ...trigger, key: trigger.id ?? createTriggerKey() }));
}

function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseScheduleKind(cron: string): ScheduleKind {
  if (cron === HOURLY_CRON) {
    return { kind: 'hourly' };
  }

  const daily = /^0 (\d{1,2}) \* \* \*$/.exec(cron);

  if (daily) {
    return { hour: Number(daily[1]), kind: 'daily' };
  }

  const weekly = /^0 (\d{1,2}) \* \* ([0-6])$/.exec(cron);

  if (weekly) {
    return { day: Number(weekly[2]), hour: Number(weekly[1]), kind: 'weekly' };
  }

  return { kind: 'custom' };
}

function getNextRuns(cron: string, timezone: string, count: number): Date[] {
  try {
    const expression = CronExpressionParser.parse(cron, { tz: timezone });

    return Array.from({ length: count }, () => expression.next().toDate());
  } catch {
    return [];
  }
}

function formatRunDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    timeZone: timezone,
    weekday: 'short',
  }).format(date);
}

function getCronError(cron: string, timezone: string): string | null {
  const trimmed = cron.trim();

  if (!trimmed) {
    return 'Cron expression is required';
  }

  const fieldCount = trimmed.split(/\s+/).length;

  if (fieldCount < 5 || fieldCount > 6) {
    return `Expected 5 fields (min hour day month weekday), got ${fieldCount.toString()}`;
  }

  try {
    CronExpressionParser.parse(trimmed, { tz: timezone });

    return null;
  } catch {
    return 'Invalid cron expression';
  }
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
    enabled: providerTools.connected && mode === 'edit' && providerTools.enabled,
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
        <div className="fk:absolute fk:z-50 fk:mt-1 fk:w-full fk:max-w-100 fk:rounded-md fk:border fk:bg-popover fk:p-0 fk:text-popover-foreground fk:shadow-md">
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
                  <CheckIcon
                    className={`fk:mr-2 fk:size-4 ${selectedIds.has(channel.id) ? 'fk:opacity-100' : 'fk:opacity-0'}`}
                  />
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
              className="fk:h-8 fk:w-full fk:justify-start fk:text-xs"
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
                <>
                  <RefreshCwIcon className="fk:mr-2 fk:size-3" />
                  Refresh channels
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NextRunLabel({ cron, timezone }: { cron: string; timezone: string }): JSX.Element | null {
  const [nextRun] = getNextRuns(cron, timezone, 1);

  if (!nextRun) {
    return null;
  }

  return <span className="fk:text-sm fk:text-muted-foreground">Next run {formatRunDate(nextRun, timezone)}</span>;
}

function HourSelect({ onChange, value }: { onChange: (_hour: number) => void; value: number }): JSX.Element {
  return (
    <Select value={value.toString()} onValueChange={(hour) => onChange(Number(hour))}>
      <SelectTrigger
        aria-label="Hour"
        className="fk:h-7 fk:w-fit fk:gap-1 fk:border-transparent fk:bg-background/90 fk:px-2 fk:py-0 fk:text-sm fk:shadow-sm hover:fk:border-border"
        size="sm"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {HOUR_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value.toString()}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DaySelect({ onChange, value }: { onChange: (_day: number) => void; value: number }): JSX.Element {
  return (
    <Select value={value.toString()} onValueChange={(day) => onChange(Number(day))}>
      <SelectTrigger
        aria-label="Day of week"
        className="fk:h-7 fk:w-fit fk:gap-1 fk:border-transparent fk:bg-background/90 fk:px-2 fk:py-0 fk:text-sm fk:shadow-sm hover:fk:border-border"
        size="sm"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DAY_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value.toString()}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CronEditor({
  onChange,
  timezone,
  value,
}: {
  onChange: (_cron: string) => void;
  timezone: string;
  value: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const error = getCronError(value, timezone);
  const nextRuns = error ? [] : getNextRuns(value, timezone, 3);

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

  return (
    <div className="fk:relative" ref={containerRef}>
      <button
        className="fk:flex fk:items-center fk:gap-1.5 fk:rounded-md fk:bg-background/90 fk:px-2 fk:py-1 fk:font-mono fk:text-sm fk:shadow-sm hover:fk:bg-accent"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        {value || 'Set cron'}
        <ChevronDownIcon className="fk:size-3.5 fk:opacity-50" />
      </button>
      {open ? (
        <div className="fk:absolute fk:z-50 fk:mt-1 fk:w-72 fk:rounded-md fk:border fk:bg-popover fk:p-3 fk:text-popover-foreground fk:shadow-md">
          <div className="fk:mb-2 fk:text-xs fk:text-muted-foreground">Cron expression ({timezone})</div>
          <Input
            className={`fk:h-8 fk:font-mono ${error ? 'fk:border-destructive focus-visible:fk:ring-destructive' : ''}`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          {error ? (
            <p className="fk:mt-2 fk:text-xs fk:text-destructive">{error}</p>
          ) : (
            <div className="fk:mt-2 fk:space-y-0.5 fk:text-xs fk:text-muted-foreground">
              <p className="fk:mb-1">5 fields: min hour day month weekday</p>
              {nextRuns.map((run) => (
                <p key={run.toISOString()}>{formatRunDate(run, timezone)}</p>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ScheduleTriggerRow({
  onChange,
  trigger,
}: {
  onChange: (_trigger: ScheduleFormTrigger) => void;
  trigger: ScheduleFormTrigger;
}): JSX.Element {
  const kind = parseScheduleKind(trigger.cron);

  if (kind.kind === 'hourly') {
    return (
      <div className="fk:flex fk:flex-1 fk:flex-wrap fk:items-center fk:gap-2 fk:text-sm">
        <span>Every hour</span>
        <NextRunLabel cron={trigger.cron} timezone={trigger.timezone} />
      </div>
    );
  }

  if (kind.kind === 'daily') {
    return (
      <div className="fk:flex fk:flex-1 fk:flex-wrap fk:items-center fk:gap-2 fk:text-sm">
        <span>Every day at</span>
        <HourSelect
          value={kind.hour}
          onChange={(hour) => onChange({ ...trigger, cron: `0 ${hour.toString()} * * *` })}
        />
        <span className="fk:text-muted-foreground">{trigger.timezone}</span>
        <NextRunLabel cron={trigger.cron} timezone={trigger.timezone} />
      </div>
    );
  }

  if (kind.kind === 'weekly') {
    return (
      <div className="fk:flex fk:flex-1 fk:flex-wrap fk:items-center fk:gap-2 fk:text-sm">
        <span>Every week on</span>
        <DaySelect
          value={kind.day}
          onChange={(day) => onChange({ ...trigger, cron: `0 ${kind.hour.toString()} * * ${day.toString()}` })}
        />
        <span>at</span>
        <HourSelect
          value={kind.hour}
          onChange={(hour) => onChange({ ...trigger, cron: `0 ${hour.toString()} * * ${kind.day.toString()}` })}
        />
        <span className="fk:text-muted-foreground">{trigger.timezone}</span>
        <NextRunLabel cron={trigger.cron} timezone={trigger.timezone} />
      </div>
    );
  }

  return (
    <div className="fk:flex fk:flex-1 fk:flex-wrap fk:items-center fk:gap-2 fk:text-sm">
      <span>Custom schedule</span>
      <CronEditor
        timezone={trigger.timezone}
        value={trigger.cron}
        onChange={(cron) => onChange({ ...trigger, cron })}
      />
      <span className="fk:text-muted-foreground">{trigger.timezone}</span>
      <NextRunLabel cron={trigger.cron} timezone={trigger.timezone} />
    </div>
  );
}

function WebhookTriggerRow({
  onChange,
  projectId,
  trigger,
}: {
  onChange: (_trigger: WebhookFormTrigger) => void;
  projectId: string;
  trigger: WebhookFormTrigger;
}): JSX.Element {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const url = trigger.url ?? getWebhookTriggerUrl(projectId, trigger.token);

  function copyToClipboard(text: string, markCopied: (_copied: boolean) => void): void {
    void navigator.clipboard.writeText(text).then(() => {
      markCopied(true);
      window.setTimeout(() => markCopied(false), 1500);
    });
  }

  return (
    <div className="fk:flex fk:flex-1 fk:flex-wrap fk:items-center fk:gap-2 fk:text-sm">
      <span>Webhook triggered</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="fk:flex fk:min-w-0 fk:max-w-60 fk:items-center fk:gap-1.5 fk:rounded-md fk:bg-background/90 fk:px-2 fk:py-1 fk:text-xs fk:shadow-sm hover:fk:bg-accent"
            type="button"
            onClick={() => copyToClipboard(url, setCopiedUrl)}
          >
            <span className="fk:truncate">{url}</span>
            {copiedUrl ? (
              <CheckIcon className="fk:size-3.5 fk:shrink-0" />
            ) : (
              <CopyIcon className="fk:size-3.5 fk:shrink-0 fk:opacity-60" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent className="fk:max-w-96 fk:break-all">{url}</TooltipContent>
      </Tooltip>
      {trigger.secret ? (
        <Button
          className="fk:h-7 fk:px-2.5 fk:text-xs"
          size="sm"
          type="button"
          variant="outline"
          onClick={() => copyToClipboard(`Bearer ${trigger.secret ?? ''}`, setCopiedSecret)}
        >
          {copiedSecret ? <CheckIcon className="fk:size-3.5" /> : <KeyRoundIcon className="fk:size-3.5" />}
          Copy auth header
        </Button>
      ) : (
        <Button
          className="fk:h-7 fk:px-2.5 fk:text-xs"
          size="sm"
          type="button"
          variant="outline"
          onClick={() => onChange({ ...trigger, secret: generateWebhookSecret() })}
        >
          <KeyRoundIcon className="fk:size-3.5" />
          Generate auth header
        </Button>
      )}
    </div>
  );
}

function EntityTriggerRow({
  entities,
  onChange,
  trigger,
}: {
  entities: string[];
  onChange: (_trigger: EntityFormTrigger) => void;
  trigger: EntityFormTrigger;
}): JSX.Element {
  function toggleEvent(event: AutomationTriggerEvent): void {
    const events = trigger.events.includes(event)
      ? trigger.events.filter((current) => current !== event)
      : [...trigger.events, event];

    onChange({ ...trigger, events: TRIGGER_EVENTS.filter((current) => events.includes(current)) });
  }

  function toggleEntity(entity: string): void {
    const selected = trigger.entities.includes(entity)
      ? trigger.entities.filter((current) => current !== entity)
      : [...trigger.entities, entity];

    onChange({ ...trigger, entities: selected });
  }

  const entityLabel = trigger.entities.length > 0 ? trigger.entities.join(', ') : 'All entities';

  return (
    <div className="fk:flex fk:flex-1 fk:flex-wrap fk:items-center fk:gap-2 fk:text-sm">
      <span>On</span>
      <div className="fk:flex fk:items-center fk:gap-1">
        {TRIGGER_EVENTS.map((event) => (
          <Button
            className="fk:h-7 fk:px-2.5 fk:text-xs fk:capitalize"
            key={event}
            size="sm"
            type="button"
            variant={trigger.events.includes(event) ? 'secondary' : 'ghost'}
            onClick={() => toggleEvent(event)}
          >
            {trigger.events.includes(event) ? <CheckIcon className="fk:size-3" /> : null}
            {event}
          </Button>
        ))}
      </div>
      <span>of</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="fk:h-7 fk:max-w-60 fk:px-2.5 fk:text-xs" size="sm" type="button" variant="outline">
            <span className="fk:truncate">{entityLabel}</span>
            <ChevronDownIcon className="fk:size-3.5 fk:opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="fk:max-h-64 fk:w-56 fk:overflow-auto">
          {entities.length === 0 ? (
            <DropdownMenuItem disabled>No entities found in the project schema</DropdownMenuItem>
          ) : (
            entities.map((entity) => (
              <DropdownMenuCheckboxItem
                checked={trigger.entities.includes(entity)}
                key={entity}
                onCheckedChange={() => toggleEntity(entity)}
                onSelect={(event) => event.preventDefault()}
              >
                {entity}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function TriggersField({
  entities,
  errors,
  onChange,
  projectId,
  triggers,
}: {
  entities: string[];
  errors: { [triggerKey: string]: string };
  onChange: (_triggers: FormTrigger[]) => void;
  projectId: string;
  triggers: FormTrigger[];
}): JSX.Element {
  const hasWebhookTrigger = triggers.some((trigger) => trigger.type === 'webhook');

  function addTrigger(trigger: FormTrigger): void {
    onChange([...triggers, trigger]);
  }

  function addScheduleTrigger(cron: string): void {
    addTrigger({ cron, key: createTriggerKey(), timezone: getLocalTimezone(), type: 'schedule' });
  }

  function updateTrigger(updated: FormTrigger): void {
    onChange(triggers.map((trigger) => (trigger.key === updated.key ? updated : trigger)));
  }

  function removeTrigger(key: string): void {
    onChange(triggers.filter((trigger) => trigger.key !== key));
  }

  return (
    <div className="fk:rounded-lg fk:border fk:bg-muted/60 fk:dark:bg-muted/30">
      {triggers.map((trigger) => (
        <Fragment key={trigger.key}>
          <div className="fk:group fk:rounded-md fk:m-1.5 fk:p-1.5 fk:hover:bg-muted" key={trigger.key}>
            <div className="fk:flex fk:items-center fk:gap-3">
              {trigger.type === 'schedule' ? (
                <ClockIcon className="fk:size-4 fk:shrink-0 fk:text-muted-foreground" />
              ) : null}
              {trigger.type === 'webhook' ? (
                <WebhookIcon className="fk:size-4 fk:shrink-0 fk:text-muted-foreground" />
              ) : null}
              {trigger.type === 'entity' ? (
                <DatabaseZapIcon className="fk:size-4 fk:shrink-0 fk:text-muted-foreground" />
              ) : null}
              {trigger.type === 'schedule' ? <ScheduleTriggerRow trigger={trigger} onChange={updateTrigger} /> : null}
              {trigger.type === 'webhook' ? (
                <WebhookTriggerRow projectId={projectId} trigger={trigger} onChange={updateTrigger} />
              ) : null}
              {trigger.type === 'entity' ? (
                <EntityTriggerRow entities={entities} trigger={trigger} onChange={updateTrigger} />
              ) : null}
              <Button
                aria-label="Remove trigger"
                className="fk:opacity-0 fk:group-hover:opacity-100"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => removeTrigger(trigger.key)}
              >
                <Trash2Icon className="fk:size-4 fk:text-muted-foreground" />
              </Button>
            </div>
            {errors[trigger.key] ? (
              <div className="fk:mt-1 fk:pl-7">
                <FieldError message={errors[trigger.key]} />
              </div>
            ) : null}
          </div>
          <Separator className="fk:h-4" />
        </Fragment>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="fk:flex fk:w-full fk:items-center fk:gap-3 fk:rounded-b-lg fk:px-3 fk:py-3 fk:text-sm fk:text-muted-foreground hover:fk:bg-muted hover:fk:text-foreground"
            type="button"
          >
            <PlusIcon className="fk:size-4" />
            Add Trigger
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="fk:w-56">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ClockIcon className="fk:mr-2 fk:size-4 fk:text-muted-foreground" />
              Scheduled
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => addScheduleTrigger(HOURLY_CRON)}>Hourly</DropdownMenuItem>
              <DropdownMenuItem onClick={() => addScheduleTrigger(DEFAULT_DAILY_CRON)}>Daily</DropdownMenuItem>
              <DropdownMenuItem onClick={() => addScheduleTrigger(DEFAULT_WEEKLY_CRON)}>Weekly</DropdownMenuItem>
              <DropdownMenuItem onClick={() => addScheduleTrigger(DEFAULT_CUSTOM_CRON)}>Custom (cron)</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            disabled={hasWebhookTrigger}
            onClick={() =>
              addTrigger({ key: createTriggerKey(), secret: null, token: crypto.randomUUID(), type: 'webhook' })
            }
          >
            <WebhookIcon className="fk:mr-2 fk:size-4 fk:text-muted-foreground" />
            Webhook Triggered
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => addTrigger({ entities: [], events: ['create'], key: createTriggerKey(), type: 'entity' })}
          >
            <DatabaseZapIcon className="fk:mr-2 fk:size-4 fk:text-muted-foreground" />
            Entity Events
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
  const [name, setName] = useState(automation?.name ?? '');
  const [instructions, setInstructions] = useState(automation?.instructions ?? '');
  const [enabled, setEnabled] = useState(automation?.enabled ?? false);
  const [modelId, setModelId] = useState(automation?.modelId ?? '');
  const [triggers, setTriggers] = useState<FormTrigger[]>(() => getInitialTriggers(automation));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState({ instructions: false, name: false });
  const [toolsFormData, setToolsFormData] = useState<AutomationToolsFormData | null>(null);
  const toolsUrl = paths(projectId).tools(automation?.id);
  const { data: toolsData } = useSWR<ToolsResponse>(toolsUrl, fetcher);
  const { data: entitiesData } = useSWR<{ entities: string[] }>(paths(projectId).entities, fetcher);
  const modelOptions = useMemo(
    () => getModelOptions(toolsData?.tools.models ?? [], mode, modelId || automation?.modelId || ''),
    [automation?.modelId, mode, modelId, toolsData?.tools.models]
  );
  const effectiveModelId = modelId || modelOptions[0]?.id || '';
  const validation = useMemo<FormValidation>(() => {
    const triggerErrors: { [triggerKey: string]: string } = {};

    for (const trigger of triggers) {
      if (trigger.type === 'schedule') {
        const cronError = getCronError(trigger.cron, trigger.timezone);

        if (cronError) {
          triggerErrors[trigger.key] = cronError;
        }
      }

      if (trigger.type === 'entity' && trigger.events.length === 0) {
        triggerErrors[trigger.key] = 'Select at least one event (create, update or delete)';
      }
    }

    const toolErrors: { [provider: string]: string } = {};

    for (const provider of TOOL_PROVIDERS) {
      const tool = toolsFormData?.[provider];

      if (tool?.enabled && tool.channels.length === 0) {
        toolErrors[provider] =
          `Select at least one ${provider === 'slack' ? 'Slack' : 'Teams'} channel or remove the tool`;
      }
    }

    return {
      instructions: instructions.trim() ? '' : 'Instructions are required',
      model: effectiveModelId ? '' : 'Select a model',
      name: name.trim() ? '' : 'Name is required',
      toolErrors,
      triggerErrors,
    };
  }, [effectiveModelId, instructions, name, toolsFormData, triggers]);
  const isValid = isFormValidationClean(validation);
  const showNameError = touched.name && Boolean(validation.name);
  const showInstructionsError = touched.instructions && Boolean(validation.instructions);

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
          : (result.errorMessage ?? `Failed to load ${provider === 'slack' ? 'Slack' : 'Teams'} channels.`);

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

    if (!isValid) {
      setTouched({ instructions: true, name: true });

      return;
    }

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
      instructions,
      modelId: effectiveModelId,
      name,
      toolConfigs,
      triggers: triggers.map(({ key: _key, ...trigger }) => trigger),
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

      toast.success(mode === 'create' || !automation ? 'Automation created.' : 'Automation saved.');
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
          Disabling an automation stops its schedules and ignores webhook calls and entity events
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
        <Input
          aria-describedby={showNameError ? 'automation-name-error' : undefined}
          aria-invalid={showNameError}
          className={showNameError ? 'fk:border-destructive focus-visible:fk:ring-destructive' : ''}
          id="automation-name"
          value={name}
          onBlur={() => setTouched((current) => ({ ...current, name: true }))}
          onChange={(event) => setName(event.target.value)}
        />
        {showNameError ? <FieldError id="automation-name-error" message={validation.name} /> : null}
      </div>

      <div className="fk:space-y-3">
        <Label className="fk:mb-1">Triggers</Label>
        <p className="fk:text-xs fk:text-muted-foreground fk:mb-2">
          When this automation should run. Schedules run in your timezone; webhooks run when their URL is called.
        </p>
        <TriggersField
          entities={entitiesData?.entities ?? []}
          errors={validation.triggerErrors}
          projectId={projectId}
          triggers={triggers}
          onChange={setTriggers}
        />
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
          <div
            className={`fk:rounded-t-md fk:border-x fk:border-t fk:bg-muted/60 fk:ring-offset-background focus-within:fk:ring-2 focus-within:fk:ring-ring focus-within:fk:ring-offset-2 fk:dark:bg-muted/30 ${showInstructionsError ? 'fk:border-destructive' : 'fk:border-input'}`}
          >
            <Textarea
              aria-describedby={showInstructionsError ? 'automation-instructions-error' : undefined}
              aria-invalid={showInstructionsError}
              className="fk:flex fk:min-h-[160px] fk:max-h-[320px] fk:w-full fk:rounded-none fk:border-0 fk:bg-transparent fk:dark:bg-transparent fk:pb-11 fk:shadow-none focus-visible:fk:ring-0 focus-visible:fk:ring-offset-0 fk:mask-[linear-gradient(to_bottom,black_calc(100%-2.75rem),#0009_calc(100%-1.25rem),#0003_calc(100%-0.5rem),transparent)]"
              id="automation-instructions"
              placeholder="Describe what the agent should do on each run, e.g. 'When a new Review is created, translate the text to English, run a sentiment analysis and store the result in the sentiment attribute...'"
              rows={8}
              value={instructions}
              onBlur={() => setTouched((current) => ({ ...current, instructions: true }))}
              onChange={(event) => setInstructions(event.target.value)}
            />
          </div>
          <div
            className={`fk:rounded-b-md fk:border-x fk:border-b fk:bg-muted/60 fk:dark:bg-muted/30 fk:px-2 fk:py-2 ${showInstructionsError ? 'fk:border-destructive' : 'fk:border-input'}`}
          >
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
        {showInstructionsError ? (
          <FieldError id="automation-instructions-error" message={validation.instructions} />
        ) : null}
        {toolsData && validation.model ? <FieldError message={validation.model} /> : null}
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
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => updateTool(provider, { enabled: true })}
                        >
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
                      Connect {provider === 'slack' ? 'Slack' : 'Microsoft Teams'} in Project Integrations before using
                      it in an automation.
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
                        <p className="fk:flex fk:items-start fk:text-sm fk:text-warning fk:gap-1">
                          <TriangleAlertIcon className="fk:size-4 fk:shrink-0 fk:mt-0.5" />
                          {tool.channelsLoadError}
                        </p>
                      ) : null}
                      {!tool.channelsLoadError && validation.toolErrors[provider] ? (
                        <FieldError message={validation.toolErrors[provider]} />
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

      <div className="fk:flex fk:items-center fk:justify-end fk:gap-3">
        {!isValid ? (
          <span className="fk:text-xs fk:text-muted-foreground">Complete the required fields to save</span>
        ) : null}
        <Button disabled={isSaving || !isValid} type="submit">
          {isSaving ? 'Saving...' : mode === 'create' ? 'Create automation' : 'Update automation'}
        </Button>
      </div>
    </form>
  );
}
