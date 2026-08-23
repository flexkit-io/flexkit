import type { JSX, UIEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { format, formatDistance } from 'date-fns';
import {
  ArrowLeft,
  BotIcon,
  CoinsIcon,
  Ellipsis,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  Trash2,
  TriangleAlertIcon,
  ZapIcon,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCoreRowModel, useCanMutate, useReactTable, type ColumnDef, type ColumnFiltersState } from '@flexkit/studio';
import {
  Badge,
  Button,
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ExternalLink,
  PermissionTooltip,
  ScrollArea,
  Separator,
  SidebarTrigger,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@flexkit/studio/ui';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { createApiClient, fetcher, paths } from './api';
import { ApprovalDrawer, ApprovalStatusBadge } from './approval-card';
import { AutomationsDataTableToolbar } from './data-table-toolbar';
import { AutomationForm } from './form';
import {
  MessagePart,
  MutationApprovalPart,
  RollingStatusText,
  RunReplayActionsContext,
  STREAM_RETRY_DELAY_MS,
  getActiveRollingStatusLabel,
  getMutationApprovalIds,
  getPendingMutationApprovalIds,
  isTerminalRunStatus,
  messageHasPendingMutationApproval,
  toMutationApprovalPartData,
  useProjectApi,
  useRunStream,
  useSessionMessages,
  type ReplayMessage,
  type RunReplayActions,
  type RunStreamStatus,
} from './replay';
import type {
  Automation,
  AutomationApproval,
  AutomationApprovals,
  AutomationCreditBalance,
  AutomationRun,
  AutomationVisibility,
  ProjectSpace,
  RunHistory,
} from './types';

interface AutomationsResponse {
  automations: Automation[];
  count: number;
  hasMore: boolean;
}

const AUTOMATIONS_PAGE_SIZE = 25;

function getLoadMoreThreshold(clientHeight: number): number {
  return Math.max(600, clientHeight);
}

interface AutomationResponse {
  automation: Automation;
}

interface RunsResponse {
  hasMore?: boolean;
  runs: AutomationRun[];
}

interface RunResponse {
  run: AutomationRun;
}

interface HistoryResponse {
  history: RunHistory;
}

interface CreditResponse {
  creditBalance: AutomationCreditBalance;
}

function PageMessage({ children }: { children: string }): JSX.Element {
  return (
    <div className="fk:rounded-md fk:border fk:border-dashed fk:p-8 fk:text-center fk:text-sm fk:text-muted-foreground">
      {children}
    </div>
  );
}

function getStatusBadgeClass(status: string): string {
  if (status === 'success') {
    return 'fk:bg-success/20 fk:text-success';
  }

  if (status === 'awaiting_approval') {
    return 'fk:bg-amber-500/20 fk:text-amber-600';
  }

  if (status === 'skipped') {
    return 'fk:bg-orange-500/20 fk:text-orange-700';
  }

  return 'fk:bg-secondary fk:text-secondary-foreground';
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  return (
    <Badge
      className={`fk:border-none fk:h-4.75 fk:text-[0.6875rem] fk:leading-4.5 fk:tracking-wide ${getStatusBadgeClass(status)}`}
      variant={status === 'success' ? 'default' : 'secondary'}
    >
      {status === 'awaiting_approval' ? 'awaiting approval' : status}
    </Badge>
  );
}

function getScheduleSummary(cron: string): string {
  if (cron === '0 * * * *') {
    return 'Every hour';
  }

  const daily = /^0 (\d{1,2}) \* \* \*$/.exec(cron);

  if (daily) {
    return `Every day at ${daily[1].padStart(2, '0')}:00`;
  }

  const weekly = /^0 (\d{1,2}) \* \* ([0-6])$/.exec(cron);

  if (weekly) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return `Every ${days[Number(weekly[2])] ?? 'week'} at ${weekly[1].padStart(2, '0')}:00`;
  }

  return cron;
}

function getTriggerSummary(automation: Automation): string {
  const summaries = automation.triggers.map((trigger) => {
    if (trigger.type === 'schedule') {
      return getScheduleSummary(trigger.cron);
    }

    if (trigger.type === 'webhook') {
      return 'Webhook';
    }

    const entities = trigger.entities.length > 0 ? trigger.entities.join(', ') : 'all entities';

    return `On ${trigger.events.join('/')} of ${entities}`;
  });

  if (summaries.length === 0) {
    return 'Manual only';
  }

  return summaries.join(' · ');
}

function isAutomationRunnable(automation?: Automation): boolean {
  if (!automation) {
    return false;
  }

  return Boolean(automation.name.trim() && automation.instructions.trim() && automation.modelId.trim());
}

function CreditButton({ projectId }: { projectId: string }): JSX.Element | null {
  const { data } = useSWR<CreditResponse>(paths(projectId).creditBalance, fetcher);
  const creditBalance = data?.creditBalance;

  if (!creditBalance) {
    return null;
  }

  return (
    <Button asChild size="sm" variant="secondary">
      <a href={creditBalance.billingUrl} rel="noopener noreferrer" target="_blank">
        <CoinsIcon className="fk:mr-2 fk:size-4" />
        {creditBalance.display} Credit
      </a>
    </Button>
  );
}

function getVisibilityLabel(automation: Automation, spaceLabelById: Map<string, string>): string {
  const visibility = automation.visibility ?? 'project';

  if (visibility === 'space') {
    return (automation.spaceId ? spaceLabelById.get(automation.spaceId) : undefined) ?? 'Space';
  }

  if (visibility === 'personal') {
    return 'Personal';
  }

  return 'Project';
}

function AutomationsTableSkeleton(): JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Automation</TableHead>
          <TableHead>Triggers</TableHead>
          <TableHead>Last run</TableHead>
          <TableHead className="fk:text-center">Runs</TableHead>
          <TableHead>Visibility</TableHead>
          <TableHead className="fk:text-center">Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }, (_, index) => (
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="fk:h-4 fk:w-36" />
            </TableCell>
            <TableCell>
              <Skeleton className="fk:h-4 fk:w-48" />
            </TableCell>
            <TableCell>
              <Skeleton className="fk:h-4 fk:w-24" />
            </TableCell>
            <TableCell className="fk:text-center">
              <Skeleton className="fk:mx-auto fk:h-4 fk:w-8" />
            </TableCell>
            <TableCell>
              <Skeleton className="fk:h-4.75 fk:w-16" />
            </TableCell>
            <TableCell className="fk:text-center">
              <Skeleton className="fk:mx-auto fk:h-4.75 fk:w-16" />
            </TableCell>
            <TableCell className="fk:text-right">
              <Skeleton className="fk:ml-auto fk:size-8" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function columnFilterValues(filters: ColumnFiltersState, columnId: string): string[] {
  const filter = filters.find((entry) => entry.id === columnId);
  const value = filter?.value;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function mapStatusFilterToEnabled(values: string[]): boolean[] | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const enabled = values
    .map((value) => {
      if (value === 'enabled') {
        return true;
      }

      if (value === 'disabled') {
        return false;
      }

      return null;
    })
    .filter((value): value is boolean => value !== null);

  if (enabled.length === 0) {
    return undefined;
  }

  return enabled;
}

function mapVisibilityFilter(values: string[]): AutomationVisibility[] | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const visibility = values.filter(
    (value): value is AutomationVisibility => value === 'project' || value === 'space' || value === 'personal'
  );

  if (visibility.length === 0) {
    return undefined;
  }

  return visibility;
}

export function AutomationsPage(): JSX.Element {
  const { api, projectId } = useProjectApi();
  const navigate = useNavigate();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const canMutate = useCanMutate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const statusFilterValues = columnFilterValues(columnFilters, 'status');
  const visibilityFilterValues = columnFilterValues(columnFilters, 'visibility');
  const enabledFilter = mapStatusFilterToEnabled(statusFilterValues);
  const visibilityFilter = mapVisibilityFilter(visibilityFilterValues);
  const hasActiveFilters = columnFilters.length > 0 || search.trim().length > 0;
  const filterKey = JSON.stringify({ enabledFilter, search, visibilityFilter });

  const getAutomationsKey = (pageIndex: number, previousPage: AutomationsResponse | null): string | null => {
    if (!projectId) {
      return null;
    }

    if (previousPage && previousPage.hasMore === false) {
      return null;
    }

    return paths(projectId).automations({
      enabled: enabledFilter,
      limit: AUTOMATIONS_PAGE_SIZE,
      offset: pageIndex * AUTOMATIONS_PAGE_SIZE,
      search: search.trim() || undefined,
      visibility: visibilityFilter,
    });
  };
  const {
    data: automationPages,
    isLoading,
    mutate,
    setSize,
    size,
  } = useSWRInfinite<AutomationsResponse>(getAutomationsKey, fetcher);
  const { data: spacesData } = useSWR<{ spaces: ProjectSpace[] }>(projectId ? paths(projectId).spaces : null, fetcher);
  const spaceLabelById = useMemo(
    () => new Map((spacesData?.spaces ?? []).map((space) => [space.id, space.label])),
    [spacesData?.spaces]
  );
  const automations = automationPages?.flatMap((page) => page.automations) ?? [];
  const lastPage = automationPages?.[automationPages.length - 1];
  const hasMore = lastPage?.hasMore ?? false;
  const isLoadingMore = automationPages !== undefined && size > automationPages.length;
  const automationsCount = automationPages?.[0]?.count;
  const isInitialLoading = isLoading && automations.length === 0;

  const filterColumns = useMemo<ColumnDef<Automation>[]>(
    () => [
      { id: 'status', accessorKey: 'enabled' },
      { id: 'visibility', accessorKey: 'visibility' },
    ],
    []
  );
  const table = useReactTable({
    columns: filterColumns,
    data: automations,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    onColumnFiltersChange: (updater) => {
      void setSize(1);
      setColumnFilters(updater);
    },
    state: { columnFilters },
  });

  const onLoadMoreRef = useRef(() => {
    void setSize((currentSize) => currentSize + 1);
  });
  const hasMoreRef = useRef(hasMore);
  const isLoadingMoreRef = useRef(isLoadingMore);
  onLoadMoreRef.current = () => {
    void setSize((currentSize) => currentSize + 1);
  };
  hasMoreRef.current = hasMore;
  isLoadingMoreRef.current = isLoadingMore;

  const checkLoadMore = useCallback((container?: HTMLDivElement | null) => {
    if (!onLoadMoreRef.current || !hasMoreRef.current || isLoadingMoreRef.current) {
      return;
    }

    const scrollElement = container ?? scrollRef.current;

    if (!scrollElement) {
      return;
    }

    const { scrollHeight, scrollTop, clientHeight } = scrollElement;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom >= getLoadMoreThreshold(clientHeight)) {
      return;
    }

    isLoadingMoreRef.current = true;
    onLoadMoreRef.current();
  }, []);

  useEffect(() => {
    checkLoadMore();
  }, [checkLoadMore, automations.length, hasMore, isLoadingMore, filterKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [filterKey]);

  const searchRef = useRef(search);
  searchRef.current = search;

  const handleSearchChange = useCallback(
    (nextSearch: string) => {
      if (nextSearch === searchRef.current) {
        return;
      }

      void setSize(1);
      setSearch(nextSearch);
    },
    [setSize]
  );

  if (!projectId || !api) {
    return <PageMessage>Select a project to view automations.</PageMessage>;
  }

  async function handleDelete(automation: Automation): Promise<void> {
    setMessage('');

    if (!api) {
      return;
    }

    const result = await api.deleteAutomation(automation.id);

    if (!result.success) {
      setMessage(Array.isArray(result.errorMessage) ? result.errorMessage.join(', ') : result.errorMessage);

      return;
    }

    await mutate();
  }

  function handleScroll(event: UIEvent<HTMLDivElement>): void {
    checkLoadMore(event.currentTarget);
  }

  let content: JSX.Element;

  if (isLoading && automations.length === 0) {
    content = <AutomationsTableSkeleton />;
  } else if (automations.length === 0) {
    content = <PageMessage>{hasActiveFilters ? 'No results.' : 'No automations yet.'}</PageMessage>;
  } else {
    content = (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Automation</TableHead>
            <TableHead>Triggers</TableHead>
            <TableHead>Last run</TableHead>
            <TableHead className="fk:text-center">Runs</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead className="fk:text-center">Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {automations.map((automation) => (
            <TableRow className="fk:cursor-pointer" key={automation.id} onClick={() => navigate(automation.id)}>
              <TableCell>
                <span className="fk:font-medium">{automation.name}</span>
              </TableCell>
              <TableCell className="fk:text-muted-foreground">{getTriggerSummary(automation)}</TableCell>
              <TableCell>
                {automation.lastRunAt
                  ? formatDistance(new Date(automation.lastRunAt), new Date(), { addSuffix: true })
                  : 'Never'}
              </TableCell>
              <TableCell className="fk:text-center">{automation.totalRuns}</TableCell>
              <TableCell>
                <Badge
                  className="fk:h-4.75 fk:text-[0.6875rem] fk:leading-4.5 fk:tracking-wide"
                  variant={automation.visibility === 'personal' ? 'secondary' : 'outline'}
                >
                  {getVisibilityLabel(automation, spaceLabelById)}
                </Badge>
              </TableCell>
              <TableCell className="fk:text-center">
                <Badge
                  className={`fk:border-none fk:h-4.75 fk:text-[0.6875rem] fk:leading-4.5 fk:tracking-wide ${automation.enabled ? 'fk:bg-success/20 fk:text-success' : 'fk:bg-secondary fk:text-secondary-foreground'}`}
                  variant={automation.enabled ? 'default' : 'secondary'}
                >
                  {automation.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </TableCell>
              <TableCell className="fk:text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label={`Actions for ${automation.name}`}
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <Ellipsis className="fk:size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="fk:w-40">
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(automation.id);
                      }}
                    >
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={!canMutate}
                      variant="destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(automation);
                      }}
                    >
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:min-w-0 fk:flex-col fk:gap-4">
      <div className="fk:flex fk:shrink-0 fk:items-start fk:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
          </TooltipTrigger>
          <TooltipContent>Toggle Sidebar</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="fk:mt-1 fk:h-4" />
        <div className="fk:min-w-0 fk:flex-1">
          <div className="fk:flex fk:items-center fk:gap-2">
            <h1 className="fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">Automations</h1>
            {!isInitialLoading && automationsCount !== undefined ? (
              <span className="fk:ml-auto fk:text-sm fk:font-normal fk:text-muted-foreground">
                {automationsCount.toLocaleString()} {automationsCount === 1 ? 'automation' : 'automations'}
              </span>
            ) : null}
          </div>
          <p className="fk:mt-1 fk:text-sm fk:text-muted-foreground">
            Agent-powered tasks that run on a schedule or when your data changes.
            <ExternalLink href="https://flexkit.io/docs/automations">Learn more</ExternalLink>
          </p>
        </div>
      </div>

      {message ? <div className="fk:text-sm fk:text-destructive">{message}</div> : null}

      <AutomationsDataTableToolbar
        actions={
          <>
            <CreditButton projectId={projectId} />
            {canMutate ? (
              <Button asChild className="fk:h-8" size="sm">
                <Link to="new">
                  <Plus className="fk:mr-2 fk:size-4" />
                  New Automation
                </Link>
              </Button>
            ) : (
              <PermissionTooltip disabled>
                <Button className="fk:h-8" disabled size="sm">
                  <Plus className="fk:mr-2 fk:size-4" />
                  New Automation
                </Button>
              </PermissionTooltip>
            )}
          </>
        }
        isSearchLoading={isLoading && search.trim().length > 0}
        search={search}
        table={table}
        onSearchChange={handleSearchChange}
      />

      <div className="fk:relative fk:min-h-0 fk:min-w-0 fk:flex-1">
        {isLoadingMore ? (
          <div
            aria-hidden
            className="fk:pointer-events-none fk:absolute fk:top-0 fk:right-px fk:left-px fk:z-20 fk:h-0.5 fk:overflow-hidden fk:opacity-40"
          >
            <div className="fk:animate-progress fk:h-full fk:w-full fk:bg-foreground" />
          </div>
        ) : null}
        <div className="fk:h-full fk:overflow-auto fk:pb-20" onScroll={handleScroll} ref={scrollRef}>
          {content}
        </div>
      </div>
    </div>
  );
}

export function CreateAutomationPage(): JSX.Element {
  const { api, projectId } = useProjectApi();
  const navigate = useNavigate();

  if (!projectId || !api) {
    return <PageMessage>Select a project to create automations.</PageMessage>;
  }

  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:flex-col fk:gap-2">
      <div className="fk:mb-4 fk:flex fk:shrink-0 fk:items-start fk:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
          </TooltipTrigger>
          <TooltipContent>Toggle Sidebar</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="fk:mt-1 fk:h-4" />
        <div className="fk:flex-1">
          <h1 className="fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">New Automation</h1>
        </div>
      </div>
      <Button asChild className="fk:shrink-0 fk:w-fit" size="sm" variant="ghost">
        <Link to="..">
          <ArrowLeft className="fk:mr-2 fk:size-4" />
          Automations
        </Link>
      </Button>
      <ScrollArea className="fk:h-0 fk:min-h-0 fk:flex-1">
        <div className="fk:pb-6 fk:pr-4">
          <AutomationForm api={api} mode="create" projectId={projectId} onSaved={() => navigate('..')} />
        </div>
      </ScrollArea>
    </div>
  );
}

export function AutomationDetailPage(): JSX.Element {
  const { api, projectId } = useProjectApi();
  const { automationId } = useParams<{ automationId: string }>();
  const navigate = useNavigate();
  const [isRunning, startTransition] = useTransition();
  const canMutate = useCanMutate();
  const { data, mutate } = useSWR<AutomationResponse>(
    projectId && automationId ? paths(projectId).automation(automationId) : null,
    fetcher
  );

  if (!projectId || !api || !automationId) {
    return <PageMessage>Select an automation.</PageMessage>;
  }

  if (!data?.automation) {
    return <PageMessage>Loading automation...</PageMessage>;
  }

  const automationApi = api;
  const canRunAutomation = isAutomationRunnable(data.automation) && canMutate;
  const selectedAutomationId = automationId;

  function handleRunNow(): void {
    if (!canRunAutomation) {
      return;
    }

    startTransition(async () => {
      const result = await automationApi.runAutomation(selectedAutomationId);

      if (result.success && result.runId) {
        navigate(`runs/${result.runId}`);

        return;
      }

      await mutate();
    });
  }

  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:flex-col fk:gap-2">
      <div className="fk:mb-4 fk:flex fk:shrink-0 fk:items-start fk:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
          </TooltipTrigger>
          <TooltipContent>Toggle Sidebar</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="fk:mt-1 fk:h-4" />
        <div className="fk:flex-1">
          <h1 className="fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">{data.automation.name}</h1>
        </div>
      </div>
      <div className="fk:flex fk:shrink-0 fk:flex-wrap fk:items-center fk:justify-between fk:gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link to="..">
            <ArrowLeft className="fk:mr-2 fk:size-4" />
            Automations
          </Link>
        </Button>
        <Tabs value="settings">
          <TabsList>
            <TabsTrigger className="text-xs" value="settings">
              Settings
            </TabsTrigger>
            <TabsTrigger className="text-xs" value="runs">
              <Link to="runs">Runs</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <PermissionTooltip disabled={!canMutate}>
          <Button disabled={isRunning || !canRunAutomation} size="sm" onClick={handleRunNow}>
            {isRunning ? (
              <LoaderCircle className="fk:mr-2 fk:size-4 fk:animate-spin" />
            ) : (
              <Play className="fk:mr-2 fk:size-4" />
            )}
            Run now
          </Button>
        </PermissionTooltip>
      </div>
      <ScrollArea className="fk:h-0 fk:min-h-0 fk:flex-1">
        <div className="fk:pb-6 fk:pr-4">
          <AutomationForm
            api={api}
            automation={data.automation}
            mode="edit"
            projectId={projectId}
            onSaved={(automation) => {
              if (automation) {
                void mutate({ automation }, { revalidate: false });
              } else {
                void mutate();
              }
            }}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

const RUNS_PAGE_SIZE = 25;

export function RunsPage(): JSX.Element {
  const { api, projectId } = useProjectApi();
  const { automationId } = useParams<{ automationId: string }>();
  const navigate = useNavigate();
  const [isRunning, startTransition] = useTransition();
  const { data } = useSWR<AutomationResponse>(
    projectId && automationId ? paths(projectId).automation(automationId) : null,
    fetcher
  );
  const getRunsKey = (pageIndex: number, previousPage: RunsResponse | null): string | null => {
    if (!projectId || !automationId) {
      return null;
    }

    if (previousPage && previousPage.hasMore === false) {
      return null;
    }

    return paths(projectId).automationRuns(automationId, pageIndex * RUNS_PAGE_SIZE, RUNS_PAGE_SIZE);
  };
  const { data: runPages, isLoading, mutate, setSize, size } = useSWRInfinite<RunsResponse>(getRunsKey, fetcher);
  const canMutate = useCanMutate();

  if (!projectId || !api || !automationId) {
    return <PageMessage>Select an automation to view runs.</PageMessage>;
  }

  const automationApi = api;
  const canRunAutomation = isAutomationRunnable(data?.automation) && canMutate;
  const selectedAutomationId = automationId;

  function handleRunNow(): void {
    if (!canRunAutomation) {
      return;
    }

    startTransition(async () => {
      const result = await automationApi.runAutomation(selectedAutomationId);

      if (result.success && result.runId) {
        navigate(result.runId);

        return;
      }

      await mutate();
    });
  }

  const runs = runPages?.flatMap((page) => page.runs) ?? [];
  const lastPage = runPages?.[runPages.length - 1];
  const hasMore = lastPage?.hasMore ?? false;
  const isLoadingMore = runPages !== undefined && size > runPages.length;

  function handleLoadMore(): void {
    void setSize((currentSize) => currentSize + 1);
  }

  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:flex-col fk:gap-2">
      <div className="fk:mb-4 fk:flex fk:shrink-0 fk:items-start fk:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
          </TooltipTrigger>
          <TooltipContent>Toggle Sidebar</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="fk:mt-1 fk:h-4" />
        <div className="fk:flex-1">
          <h1 className="fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">
            {data?.automation.name ?? 'Automation'}
          </h1>
        </div>
      </div>
      <div className="fk:flex fk:shrink-0 fk:flex-wrap fk:items-center fk:justify-between fk:gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link to="..">
            <ArrowLeft className="fk:mr-2 fk:size-4" />
            Automations
          </Link>
        </Button>
        <Tabs value="runs">
          <TabsList>
            <TabsTrigger className="text-xs" value="settings">
              <Link relative="path" to="..">
                Settings
              </Link>
            </TabsTrigger>
            <TabsTrigger className="text-xs" value="runs">
              Runs
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <PermissionTooltip disabled={!canMutate}>
          <Button disabled={isRunning || !canRunAutomation} size="sm" onClick={handleRunNow}>
            {isRunning ? (
              <LoaderCircle className="fk:mr-2 fk:size-4 fk:animate-spin" />
            ) : (
              <Play className="fk:mr-2 fk:size-4" />
            )}
            Run now
          </Button>
        </PermissionTooltip>
      </div>
      <ScrollArea className="fk:h-0 fk:min-h-0 fk:flex-1">
        <div className="fk:pb-6 fk:pr-4">
          <RunsTable basePath="." isLoading={isLoading} runs={runs} />
          {hasMore && !isLoadingMore ? <InfiniteScrollSentinel onVisible={handleLoadMore} /> : null}
          {isLoadingMore ? (
            <div className="fk:flex fk:items-center fk:justify-center fk:gap-2 fk:py-4 fk:text-sm fk:text-muted-foreground">
              <LoaderCircle className="fk:size-4 fk:animate-spin" />
              <span>Loading more runs...</span>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

function InfiniteScrollSentinel({ onVisible }: { onVisible: () => void }): JSX.Element {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);

  onVisibleRef.current = onVisible;

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onVisibleRef.current();
      }
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return <div className="fk:h-px" ref={sentinelRef} />;
}

function RunsTableSkeleton(): JSX.Element {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: 5 }, (_, index) => (
          <TableRow key={index}>
            <TableCell className="fk:py-2">
              <Skeleton className="fk:h-4 fk:w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="fk:h-4 fk:w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="fk:h-4.75 fk:w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="fk:h-4 fk:w-full fk:max-w-md" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RunsTable({
  basePath,
  isLoading = false,
  runs,
}: {
  basePath: string;
  isLoading?: boolean;
  runs: AutomationRun[];
}): JSX.Element {
  if (isLoading) {
    return <RunsTableSkeleton />;
  }

  if (runs.length === 0) {
    return <PageMessage>No runs found.</PageMessage>;
  }

  return (
    <Table>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell className="fk:py-2">
              <Link className="fk:font-medium hover:fk:underline" to={`${basePath}/${run.id}`}>
                {formatDistance(new Date(run.startedAt), new Date(), { addSuffix: true })}
              </Link>
            </TableCell>
            <TableCell className="fk:text-muted-foreground">{run.triggerType}</TableCell>
            <TableCell>
              <StatusBadge status={run.status} />
            </TableCell>
            <TableCell className="fk:max-w-md fk:truncate fk:text-muted-foreground">{run.summary ?? ''}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function RunHistoryPage(): JSX.Element {
  const { projectId } = useProjectApi();
  const [scope, setScope] = useState<'mine' | 'team'>('team');
  const getHistoryKey = (pageIndex: number, previousPage: HistoryResponse | null): string | null => {
    if (!projectId) {
      return null;
    }

    if (previousPage && !previousPage.history.hasMore) {
      return null;
    }

    return paths(projectId).runHistory(scope, pageIndex * RUNS_PAGE_SIZE, RUNS_PAGE_SIZE);
  };
  const { data: historyPages, isLoading, setSize, size } = useSWRInfinite<HistoryResponse>(getHistoryKey, fetcher);
  const metrics = historyPages?.[0]?.history.metrics;
  const runs = historyPages?.flatMap((page) => page.history.runs) ?? [];
  const lastPage = historyPages?.[historyPages.length - 1];
  const hasMore = lastPage?.history.hasMore ?? false;
  const isLoadingMore = historyPages !== undefined && size > historyPages.length;

  if (!projectId) {
    return <PageMessage>Select a project to view run history.</PageMessage>;
  }

  function handleLoadMore(): void {
    void setSize((currentSize) => currentSize + 1);
  }

  let metricsContent: JSX.Element | null = null;

  if (isLoading) {
    metricsContent = (
      <div className="fk:grid fk:shrink-0 fk:gap-3 fk:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="fk:rounded-md fk:bg-muted/60 fk:p-4" key={index}>
            <Skeleton className="fk:h-4 fk:w-24" />
            <Skeleton className="fk:mt-2 fk:h-8 fk:w-12" />
          </div>
        ))}
      </div>
    );
  } else if (metrics) {
    metricsContent = (
      <div className="fk:grid fk:shrink-0 fk:gap-3 fk:grid-cols-4">
        <MetricCard title="Successful 24h" value={metrics.successful24h} />
        <MetricCard title="Failed 24h" value={metrics.failed24h} />
        <MetricCard title="Successful 7d" value={metrics.successful7d} />
        <MetricCard title="Failed 7d" value={metrics.failed7d} />
      </div>
    );
  }

  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:flex-col fk:gap-6">
      <div className="fk:flex fk:shrink-0 fk:gap-2">
        <Button size="sm" variant={scope === 'team' ? 'default' : 'outline'} onClick={() => setScope('team')}>
          Team
        </Button>
        <Button size="sm" variant={scope === 'mine' ? 'default' : 'outline'} onClick={() => setScope('mine')}>
          Mine
        </Button>
      </div>
      {metricsContent}
      <ScrollArea className="fk:h-0 fk:min-h-0 fk:flex-1">
        <div className="fk:pb-6 fk:pr-4">
          <RunsTable
            basePath="../automations"
            isLoading={isLoading}
            runs={runs.map((run) => ({
              ...run,
              id: `${run.automationId}/runs/${run.id}`,
            }))}
          />
          {hasMore && !isLoadingMore ? <InfiniteScrollSentinel onVisible={handleLoadMore} /> : null}
          {isLoadingMore ? (
            <div className="fk:flex fk:items-center fk:justify-center fk:gap-2 fk:py-4 fk:text-sm fk:text-muted-foreground">
              <LoaderCircle className="fk:size-4 fk:animate-spin" />
              <span>Loading more runs...</span>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

const APPROVALS_PAGE_SIZE = 25;

export function ApprovalsPage(): JSX.Element {
  const { api, projectId } = useProjectApi();
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const getApprovalsKey = (pageIndex: number, previousPage: AutomationApprovals | null): string | null => {
    if (!projectId) {
      return null;
    }

    if (previousPage && !previousPage.hasMore) {
      return null;
    }

    return paths(projectId).approvals({
      limit: APPROVALS_PAGE_SIZE,
      offset: pageIndex * APPROVALS_PAGE_SIZE,
      status: statusFilter === 'pending' ? 'pending' : undefined,
    });
  };
  const {
    data: approvalPages,
    isLoading,
    mutate,
    setSize,
    size,
  } = useSWRInfinite<AutomationApprovals>(getApprovalsKey, fetcher, { refreshInterval: 30_000 });
  const approvals = approvalPages?.flatMap((page) => page.approvals) ?? [];
  const pendingCount = approvalPages?.[0]?.pendingCount ?? 0;
  const lastPage = approvalPages?.[approvalPages.length - 1];
  const hasMore = lastPage?.hasMore ?? false;
  const isLoadingMore = approvalPages !== undefined && size > approvalPages.length;
  const selectedApproval = approvals.find((approval) => approval.id === selectedApprovalId) ?? null;

  // Deciding while on Pending removes the row, so selectedApproval becomes null and
  // the drawer closes — but selectedApprovalId would still be set. Clear it once the
  // current filter's data has loaded without that id, otherwise switching to All
  // would reopen the drawer without a click.
  useEffect(() => {
    if (selectedApprovalId === null || selectedApproval !== null || isLoading || approvalPages === undefined) {
      return;
    }

    setSelectedApprovalId(null);
  }, [approvalPages, isLoading, selectedApproval, selectedApprovalId]);

  if (!projectId || !api) {
    return <PageMessage>Select a project to view approvals.</PageMessage>;
  }

  function handleLoadMore(): void {
    void setSize((currentSize) => currentSize + 1);
  }

  function handleStatusFilterChange(nextFilter: 'pending' | 'all'): void {
    if (nextFilter === statusFilter) {
      return;
    }

    // useSWRInfinite keeps `size` across key changes. Reset so the new filter
    // only fetches page 0 instead of replaying every previously loaded page.
    void setSize(1);
    setStatusFilter(nextFilter);
  }

  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:flex-col fk:gap-6">
      <div className="fk:flex fk:shrink-0 fk:items-center fk:gap-2">
        <Button
          size="sm"
          variant={statusFilter === 'pending' ? 'default' : 'outline'}
          onClick={() => handleStatusFilterChange('pending')}
        >
          Pending{pendingCount > 0 ? ` (${pendingCount.toString()})` : ''}
        </Button>
        <Button
          size="sm"
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          onClick={() => handleStatusFilterChange('all')}
        >
          All
        </Button>
      </div>
      <ScrollArea className="fk:h-0 fk:min-h-0 fk:flex-1">
        <div className="fk:pb-6 fk:pr-4">
          {isLoading ? (
            <RunsTableSkeleton />
          ) : approvals.length === 0 ? (
            <PageMessage>
              {statusFilter === 'pending' ? 'No proposals are waiting for approval.' : 'No approvals found.'}
            </PageMessage>
          ) : (
            <Table>
              <TableBody>
                {approvals.map((approval) => (
                  <TableRow
                    className="fk:cursor-pointer"
                    key={approval.id}
                    onClick={() => setSelectedApprovalId(approval.id)}
                  >
                    <TableCell>
                      <ApprovalStatusBadge status={approval.status} />
                    </TableCell>
                    <TableCell className="fk:font-medium">{approval.operationsSummary}</TableCell>
                    <TableCell className="fk:text-muted-foreground">{approval.automationName}</TableCell>
                    <TableCell className="fk:text-muted-foreground">
                      {formatDistance(new Date(approval.requestedAt), new Date(), { addSuffix: true })}
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Link
                        className="fk:text-xs fk:text-muted-foreground hover:fk:underline"
                        to={`../automations/${approval.automationId}/runs/${approval.runId}`}
                      >
                        View run
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {hasMore && !isLoadingMore ? <InfiniteScrollSentinel onVisible={handleLoadMore} /> : null}
          {isLoadingMore ? (
            <div className="fk:flex fk:items-center fk:justify-center fk:gap-2 fk:py-4 fk:text-sm fk:text-muted-foreground">
              <LoaderCircle className="fk:size-4 fk:animate-spin" />
              <span>Loading more approvals...</span>
            </div>
          ) : null}
        </div>
      </ScrollArea>
      {selectedApproval ? (
        <ApprovalDrawer
          api={api}
          approval={selectedApproval}
          key={`${selectedApproval.id}-${selectedApproval.status}`}
          onClose={() => setSelectedApprovalId(null)}
          onDecided={() => void mutate()}
        />
      ) : null}
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }): JSX.Element {
  return (
    <div className="fk:rounded-md fk:bg-muted/60 fk:p-4">
      <div className="fk:text-sm fk:text-muted-foreground">{title}</div>
      <div className="fk:mt-1 fk:text-2xl fk:font-medium">{value.toLocaleString()}</div>
    </div>
  );
}

export function RunDetailPage(): JSX.Element {
  const { api, projectId } = useProjectApi();
  const { automationId, runId } = useParams<{ automationId: string; runId: string }>();
  const { data, mutate } = useSWR<RunResponse>(projectId && runId ? paths(projectId).run(runId) : null, fetcher, {
    refreshInterval: (latestData) => {
      if (!latestData?.run || isTerminalRunStatus(latestData.run.status)) {
        return 0;
      }

      return STREAM_RETRY_DELAY_MS;
    },
  });
  const { data: automationData } = useSWR<AutomationResponse>(
    projectId && automationId ? paths(projectId).automation(automationId) : null,
    fetcher
  );
  const [isCancelling, startCancelTransition] = useTransition();
  const [streamFinished, setStreamFinished] = useState(false);

  useEffect(() => {
    setStreamFinished(false);
  }, [runId]);

  if (!projectId || !api || !automationId || !runId) {
    return <PageMessage>Select a run.</PageMessage>;
  }

  const runApi = api;
  const selectedRunId = runId;
  const run = data?.run;
  // Once a run is awaiting approval, rejecting the proposal is the way to stop
  // it, so Cancel only shows for in-flight running runs.
  const showCancel = run?.status === 'running' && !streamFinished;

  function handleCancel(): void {
    startCancelTransition(async () => {
      await runApi.cancelRun(selectedRunId);
      await mutate();
    });
  }

  function handleStreamFinished(): void {
    setStreamFinished(true);
    void mutate();
  }

  function handleRunUpdated(): void {
    void mutate();
  }

  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:flex-col fk:gap-2">
      <div className="fk:mb-4 fk:flex fk:shrink-0 fk:items-start fk:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
          </TooltipTrigger>
          <TooltipContent>Toggle Sidebar</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="fk:mt-1 fk:h-4" />
        <div className="fk:flex-1">
          <h1 className="fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">
            {automationData?.automation.name ?? 'Automation'}
          </h1>
        </div>
      </div>
      <div className="fk:flex fk:shrink-0 fk:flex-wrap fk:items-start fk:justify-between fk:gap-3">
        <div>
          <Button asChild size="sm" variant="ghost">
            <Link relative="path" to="..">
              <ArrowLeft className="fk:mr-2 fk:size-4" />
              Runs
            </Link>
          </Button>
          <div className="fk:mt-4 fk:flex fk:flex-wrap fk:items-center fk:gap-2">
            <h2 className="fk:text-sm fk:font-medium">
              {run ? `Run from ${format(new Date(run.startedAt), 'PPpp')}` : 'Loading run...'}
            </h2>
            {run ? <StatusBadge status={run.status} /> : null}
          </div>
        </div>
        {showCancel ? (
          <Button disabled={isCancelling} size="sm" variant="destructive" onClick={handleCancel}>
            {isCancelling ? 'Cancelling...' : 'Cancel run'}
          </Button>
        ) : null}
      </div>
      <Conversation className="fk:h-0 fk:min-h-0 fk:flex-1">
        <ConversationContent className="fk:gap-0 fk:p-0">
          <div className="fk:mx-auto fk:w-full fk:max-w-5xl fk:pb-6 fk:pr-4">
            {run ? (
              <RunReplay api={api} run={run} onRunUpdated={handleRunUpdated} onStreamFinished={handleStreamFinished} />
            ) : (
              <PageMessage>Loading run...</PageMessage>
            )}
          </div>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}

function getRunReplayEmptyLabel({
  isAwaitingApproval,
  status,
}: {
  isAwaitingApproval: boolean;
  status: RunStreamStatus;
}): string {
  if (status === 'unavailable') {
    return 'No replay events were recorded.';
  }

  if (status === 'error') {
    return 'Unable to load run replay.';
  }

  if (isAwaitingApproval || status === 'paused') {
    return 'Awaiting approval...';
  }

  return 'Loading run replay...';
}

function RunReplay({
  api,
  onRunUpdated,
  onStreamFinished,
  run,
}: {
  api: ReturnType<typeof createApiClient>;
  onRunUpdated?: () => void;
  onStreamFinished?: () => void;
  run: AutomationRun;
}): JSX.Element {
  const { projectId } = useProjectApi();
  const { workflowRunId } = run;
  const streamApi = workflowRunId ? api.getStreamUrl(workflowRunId) : '';
  // Increments to force a stream reconnect after a decide; not used as the
  // pause-suppress flag (that would stick for the rest of the run).
  const [resumeToken, setResumeToken] = useState(0);
  const [suppressApprovalPause, setSuppressApprovalPause] = useState(false);
  // Retain fallback cards across the post-decide suppress window. Local
  // approve/reject sets suppressApprovalPause, which clears isAwaitingApproval
  // and the pending SWR key — without a sticky list the card unmounts and an
  // empty stream falls back to the loading state until reconnect writes a
  // data-mutation-approval part.
  const [stickyFallbackApprovals, setStickyFallbackApprovals] = useState<AutomationApproval[]>([]);
  const lastDecidedApprovalIdRef = useRef<string | null>(null);
  const { message, status } = useRunStream(streamApi, {
    recordStatus: run.status,
    resumeToken,
    suppressApprovalPause,
  });
  const rawMessages = useMemo(() => (message ? [message] : []), [message]);
  const messages = useSessionMessages(rawMessages);
  const onRunUpdatedRef = useRef(onRunUpdated);
  onRunUpdatedRef.current = onRunUpdated;
  const onStreamFinishedRef = useRef(onStreamFinished);
  onStreamFinishedRef.current = onStreamFinished;
  const replayActions = useMemo<RunReplayActions>(
    () => ({
      onApprovalDecided: (approvalId) => {
        // The reconnect below remounts the approval card, which may re-report
        // the same decision; reconnecting again would loop forever.
        if (approvalId && lastDecidedApprovalIdRef.current === approvalId) {
          return;
        }

        if (approvalId) {
          lastDecidedApprovalIdRef.current = approvalId;
        }

        setSuppressApprovalPause(true);
        setResumeToken((current) => current + 1);
        onRunUpdatedRef.current?.();
      },
    }),
    []
  );
  // Prefer the run record over a stale pending stream part once the workflow
  // has resumed (`running`) or finished.
  const isAwaitingApproval =
    !suppressApprovalPause &&
    run.status !== 'running' &&
    !isTerminalRunStatus(run.status) &&
    (status === 'paused' || run.status === 'awaiting_approval' || messageHasPendingMutationApproval(message));
  // When the durable stream has no pending data-mutation-approval part
  // (empty replay, or earlier tool/text parts only), MutationApprovalPart
  // never mounts — load pending proposals for this run as a fallback.
  // Query by runId so the proposal is found even when it is not among the
  // first page of project-wide pending approvals.
  const streamHasPendingApproval = messageHasPendingMutationApproval(message);
  const shouldLoadApprovalFallback = isAwaitingApproval && !streamHasPendingApproval && projectId != null;
  const { data: pendingApprovalsData } = useSWR<AutomationApprovals>(
    shouldLoadApprovalFallback && projectId
      ? paths(projectId).approvals({ limit: 25, offset: 0, runId: run.id, status: 'pending' })
      : null,
    fetcher,
    { refreshInterval: STREAM_RETRY_DELAY_MS }
  );
  // Skip rows the stream already renders — including decided parts — so a
  // refreshed/approved stream event and a still-pending list response do not
  // produce two cards for the same proposal.
  const streamApprovalIds = useMemo(() => new Set(getMutationApprovalIds(message)), [message]);
  const fallbackApprovals = stickyFallbackApprovals.filter((approval) => !streamApprovalIds.has(approval.id));
  const hasReplayContent = messages.length > 0 || fallbackApprovals.length > 0;

  useEffect(() => {
    setResumeToken(0);
    setSuppressApprovalPause(false);
    lastDecidedApprovalIdRef.current = null;
    setStickyFallbackApprovals([]);
  }, [run.id]);

  useEffect(() => {
    const approvals = pendingApprovalsData?.approvals;

    if (!approvals?.length) {
      return;
    }

    setStickyFallbackApprovals((current) => {
      const byId = new Map(current.map((approval) => [approval.id, approval]));

      for (const approval of approvals) {
        byId.set(approval.id, approval);
      }

      return [...byId.values()];
    });
  }, [pendingApprovalsData]);

  useEffect(() => {
    setStickyFallbackApprovals((current) => {
      if (current.length === 0) {
        return current;
      }

      const next = current.filter((approval) => !streamApprovalIds.has(approval.id));

      return next.length === current.length ? current : next;
    });
  }, [streamApprovalIds]);

  // Clear the post-decide suppress window once the workflow has resumed, or
  // when a later pending approval appears in the same run (we may have missed
  // an intermediate `running` status between polls).
  useEffect(() => {
    if (!suppressApprovalPause) {
      return;
    }

    if (run.status === 'running') {
      setSuppressApprovalPause(false);

      return;
    }

    if (run.status !== 'awaiting_approval') {
      return;
    }

    const pendingIds = getPendingMutationApprovalIds(message);
    const decidedId = lastDecidedApprovalIdRef.current;

    if (pendingIds.length === 0 || decidedId === null) {
      return;
    }

    if (pendingIds.every((approvalId) => approvalId !== decidedId)) {
      setSuppressApprovalPause(false);
    }
  }, [message, run.status, suppressApprovalPause]);

  useEffect(() => {
    if (status !== 'finished') {
      return;
    }

    onStreamFinishedRef.current?.();
  }, [status]);

  useEffect(() => {
    if (status !== 'paused') {
      return;
    }

    onRunUpdatedRef.current?.();
  }, [status]);

  // Poll while suspended on approval so a decision made elsewhere (Approvals
  // inbox, another tab) updates this view. Local approve/reject also bumps
  // resumeToken to reconnect the stream immediately; the run status only flips
  // back to `running` once the suspended workflow step resumes.
  useEffect(() => {
    if (run.status !== 'awaiting_approval') {
      return;
    }

    const intervalId = window.setInterval(() => {
      onRunUpdatedRef.current?.();
    }, STREAM_RETRY_DELAY_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [run.status]);

  if (!workflowRunId) {
    return <PageMessage>The run has not started streaming yet.</PageMessage>;
  }

  const showAwaitingSpinner = isAwaitingApproval && status !== 'finished' && status !== 'error';
  const emptyLabel = getRunReplayEmptyLabel({ isAwaitingApproval, status });

  return (
    <RunReplayActionsContext.Provider value={replayActions}>
      <div className="fk:space-y-4">
        {run.status === 'failed' && run.error ? (
          <div className="fk:rounded-md fk:border fk:border-destructive/30 fk:bg-destructive/5 fk:p-4 fk:text-sm">
            {run.summary ?? run.error}
          </div>
        ) : null}
        {status === 'unavailable' ? (
          <div className="fk:rounded-md fk:border fk:border-amber-500/30 fk:bg-amber-500/5 fk:p-4 fk:text-sm">
            The workflow replay is no longer available. Generated artifacts may still be available below.
          </div>
        ) : null}
        {status === 'error' && !hasReplayContent ? (
          <div className="fk:rounded-md fk:border fk:border-destructive/30 fk:bg-destructive/5 fk:p-4 fk:text-sm">
            Failed to load the run stream. Try reloading the page.
          </div>
        ) : null}
        {hasReplayContent ? (
          <div className="fk:space-y-5 fk:rounded-md fk:bg-background">
            {messages.map((replayMessage) => (
              <ReplayMessageView key={replayMessage.id} api={api} message={replayMessage} />
            ))}
            {fallbackApprovals.map((approval) => (
              <MutationApprovalPart api={api} key={approval.id} message={toMutationApprovalPartData(approval)} />
            ))}
            {/* A run that died without closing its stream keeps the reader in
                `streaming` forever; the run record is authoritative once it
                reaches a terminal status. */}
            {status === 'streaming' && !isAwaitingApproval && !isTerminalRunStatus(run.status) ? (
              <div className="fk:flex fk:items-center fk:gap-2 fk:py-4 fk:text-sm fk:text-muted-foreground">
                <LoaderCircle className="fk:size-4 fk:animate-spin" />
                <RollingStatusText text={getActiveRollingStatusLabel(message) ?? 'Running...'} />
              </div>
            ) : null}
            {showAwaitingSpinner ? (
              <div className="fk:flex fk:items-center fk:gap-2 fk:py-4 fk:text-sm fk:text-muted-foreground">
                <LoaderCircle className="fk:size-4 fk:animate-spin" />
                <span>Awaiting approval...</span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="fk:flex fk:items-center fk:justify-center fk:gap-2 fk:rounded-md fk:border fk:border-dashed fk:p-8 fk:font-mono fk:text-sm fk:text-muted-foreground">
            {status === 'unavailable' || status === 'error' ? (
              <TriangleAlertIcon className="fk:size-4" />
            ) : (
              <LoaderCircle className="fk:size-4 fk:animate-spin" />
            )}
            <span>{emptyLabel}</span>
          </div>
        )}
      </div>
    </RunReplayActionsContext.Provider>
  );
}

function ReplayMessageView({
  api,
  message,
}: {
  api: ReturnType<typeof createApiClient>;
  message: ReplayMessage;
}): JSX.Element {
  const isUser = message.role === 'user';

  return (
    <div className={isUser ? 'fk:ml-auto fk:w-full fk:max-w-[70%]' : 'fk:w-full fk:min-w-0'}>
      <div className="fk:mb-2 fk:flex fk:items-center fk:gap-2 fk:font-mono fk:text-sm fk:font-medium fk:text-primary">
        {isUser ? (
          <>
            <ZapIcon className="fk:ml-auto fk:size-4" />
            <span>Trigger</span>
          </>
        ) : (
          <>
            <BotIcon className="fk:size-4" />
            <span>Agent{message.metadata?.model ? ` (${message.metadata.model})` : ''}</span>
          </>
        )}
      </div>
      <div className="fk:space-y-8 fk:min-w-0">
        {message.parts.map((part, index) => (
          <MessagePart api={api} key={index} part={part} partIndex={index} parts={message.parts} />
        ))}
      </div>
    </div>
  );
}
