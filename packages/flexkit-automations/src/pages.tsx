import type { JSX } from 'react';
import type { ReasoningUIPart, TextUIPart, UIMessage, UIMessageChunk } from 'ai';
import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema } from 'ai';
import { format, formatDistance } from 'date-fns';
import {
  ArrowLeft,
  BotIcon,
  BrainIcon,
  CheckCircle2Icon,
  CheckIcon,
  CircleSlashIcon,
  CloudUploadIcon,
  CoinsIcon,
  DatabaseZapIcon,
  DownloadIcon,
  Ellipsis,
  FileTextIcon,
  LoaderCircle,
  MessageSquareIcon,
  Pencil,
  Play,
  Plus,
  SearchIcon,
  SendIcon,
  TerminalIcon,
  Trash2,
  XCircleIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useConfig } from '@flexkit/studio';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ExternalLink,
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
import { ApprovalCard, ApprovalStatusBadge } from './approval-card';
import { AutomationForm } from './form';
import { RunSpecPart } from './spec-renderer';
import type {
  Automation,
  AutomationApproval,
  AutomationApprovals,
  AutomationCreditBalance,
  AutomationRun,
  RunHistory,
} from './types';

interface AutomationsResponse {
  automations: Automation[];
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

function useProjectApi() {
  const { currentProjectId } = useConfig();
  const api = useMemo(() => (currentProjectId ? createApiClient(currentProjectId) : null), [currentProjectId]);

  return { api, projectId: currentProjectId };
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

  return 'fk:bg-secondary fk:text-secondary-foreground';
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  return (
    <Badge
      className={`fk:border-none fk:h-[19px] fk:text-[0.6875rem] fk:leading-4.5 fk:tracking-wide ${getStatusBadgeClass(status)}`}
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

function AutomationsTableSkeleton(): JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Automation</TableHead>
          <TableHead>Triggers</TableHead>
          <TableHead>Last run</TableHead>
          <TableHead className="fk:text-center">Runs</TableHead>
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
            <TableCell className="fk:text-center">
              <Skeleton className="fk:mx-auto fk:h-[19px] fk:w-16" />
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

export function AutomationsPage(): JSX.Element {
  const { api, projectId } = useProjectApi();
  const navigate = useNavigate();
  const { data, isLoading, mutate } = useSWR<AutomationsResponse>(
    projectId ? paths(projectId).automations : null,
    fetcher
  );
  const [message, setMessage] = useState('');

  if (!projectId || !api) {
    return <PageMessage>Select a project to view automations.</PageMessage>;
  }

  const automations = [...(data?.automations ?? [])].sort((a, b) => {
    const aTime = a.lastRunAt ? new Date(a.lastRunAt).getTime() : 0;
    const bTime = b.lastRunAt ? new Date(b.lastRunAt).getTime() : 0;

    return bTime - aTime;
  });

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

  let content: JSX.Element;

  if (isLoading) {
    content = <AutomationsTableSkeleton />;
  } else if (automations.length === 0) {
    content = <PageMessage>No automations yet.</PageMessage>;
  } else {
    content = (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Automation</TableHead>
            <TableHead>Triggers</TableHead>
            <TableHead>Last run</TableHead>
            <TableHead className="fk:text-center">Runs</TableHead>
            <TableHead className="fk:text-center">Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {automations.map((automation) => (
            <TableRow className="fk:cursor-pointer" key={automation.id} onClick={() => navigate(automation.id)}>
              <TableCell>
                <div className="fk:font-medium">{automation.name}</div>
              </TableCell>
              <TableCell className="fk:text-muted-foreground">{getTriggerSummary(automation)}</TableCell>
              <TableCell>
                {automation.lastRunAt
                  ? formatDistance(new Date(automation.lastRunAt), new Date(), { addSuffix: true })
                  : 'Never'}
              </TableCell>
              <TableCell className="fk:text-center">{automation.totalRuns}</TableCell>
              <TableCell className="fk:text-center">
                <Badge
                  className={`fk:border-none fk:h-[19px] fk:text-[0.6875rem] fk:leading-4.5 fk:tracking-wide ${automation.enabled ? 'fk:bg-success/20 fk:text-success' : 'fk:bg-secondary fk:text-secondary-foreground'}`}
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
    <div className="fk:space-y-6 fk:h-full">
      <div className="fk:mb-4 fk:flex fk:shrink-0 fk:items-start fk:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
          </TooltipTrigger>
          <TooltipContent>Toggle Sidebar</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="fk:mt-1 fk:h-4" />
        <div className="fk:flex-1">
          <h1 className="fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">Automations</h1>
          <p className="fk:mt-1 fk:text-sm fk:text-muted-foreground">
            Agent-powered tasks that run on a schedule or when your data changes.
            <ExternalLink href="https://flexkit.io/docs/automations">Learn more</ExternalLink>
          </p>
        </div>
        <div className="fk:flex fk:flex-wrap fk:items-center fk:justify-end fk:gap-3">
          <CreditButton projectId={projectId} />
          <Button asChild size="sm">
            <Link to="new">
              <Plus className="fk:mr-2 fk:size-4" />
              New Automation
            </Link>
          </Button>
        </div>
      </div>

      {message ? <div className="fk:text-sm fk:text-destructive">{message}</div> : null}

      {content}
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
  const canRunAutomation = isAutomationRunnable(data.automation);
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
        <Button disabled={isRunning || !canRunAutomation} size="sm" onClick={handleRunNow}>
          {isRunning ? (
            <LoaderCircle className="fk:mr-2 fk:size-4 fk:animate-spin" />
          ) : (
            <Play className="fk:mr-2 fk:size-4" />
          )}
          Run now
        </Button>
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

  if (!projectId || !api || !automationId) {
    return <PageMessage>Select an automation to view runs.</PageMessage>;
  }

  const automationApi = api;
  const canRunAutomation = isAutomationRunnable(data?.automation);
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
        <Button disabled={isRunning || !canRunAutomation} size="sm" onClick={handleRunNow}>
          {isRunning ? (
            <LoaderCircle className="fk:mr-2 fk:size-4 fk:animate-spin" />
          ) : (
            <Play className="fk:mr-2 fk:size-4" />
          )}
          Run now
        </Button>
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
              <Skeleton className="fk:h-[19px] fk:w-16" />
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
      <div className="fk:grid fk:shrink-0 fk:gap-3 fk:md:grid-cols-4">
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
      <div className="fk:grid fk:shrink-0 fk:gap-3 fk:md:grid-cols-4">
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
            basePath=".."
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
  // the dialog closes — but selectedApprovalId would still be set. Clear it once the
  // current filter's data has loaded without that id, otherwise switching to All
  // would reopen the dialog without a click.
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
                        to={`../${approval.automationId}/runs/${approval.runId}`}
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
      <Dialog open={selectedApproval !== null} onOpenChange={(open) => !open && setSelectedApprovalId(null)}>
        <DialogContent className="fk:max-h-[85vh] fk:overflow-y-auto fk:sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Mutation proposal</DialogTitle>
          </DialogHeader>
          {selectedApproval ? (
            <ApprovalCard
              api={api}
              approval={selectedApproval}
              key={`${selectedApproval.id}-${selectedApproval.status}`}
              onDecided={() => void mutate()}
            />
          ) : null}
        </DialogContent>
      </Dialog>
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

interface ReplayMetadata {
  model?: string;
}

interface ReplayError {
  message: string;
}

interface ReplayDataParts {
  [key: string]: unknown;
  'bulk-graphql-action': {
    changedItems?: number;
    failedItems?: number;
    jobId?: string;
    operationName: string;
    processedItems?: number;
    status: 'loading' | 'running' | 'done' | 'error';
    totalItems?: number;
    error?: ReplayError;
  };
  'create-sandbox': {
    sandboxId?: string;
    status: 'loading' | 'done' | 'error';
    error?: ReplayError;
  };
  'execute-graphql': {
    operationType?: 'query' | 'mutation';
    status: 'loading' | 'done' | 'error';
    error?: ReplayError;
  };
  'mutation-approval': {
    approvalId: string;
    affectedCount?: number | null;
    decidedBy?: string;
    operationsSummary: string;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'executed' | 'error';
    error?: ReplayError;
  };
  'generating-files': {
    paths: string[];
    status: 'generating' | 'uploading' | 'uploaded' | 'done' | 'error';
    error?: ReplayError;
  };
  'run-artifact': {
    artifactId?: string;
    contentType?: string;
    filename: string;
    kind?: 'html' | 'pdf';
    sizeBytes?: number;
    status: 'uploading' | 'done' | 'error';
    error?: ReplayError;
  };
  'run-command': {
    args: string[];
    command: string;
    commandId?: string;
    exitCode?: number;
    sandboxId: string;
    status: 'executing' | 'running' | 'waiting' | 'done' | 'error';
    error?: ReplayError;
  };
  'run-summary': {
    status: 'success' | 'skipped' | 'failed';
    summary: string;
  };
  'search-schema': {
    query?: string;
    status: 'loading' | 'done' | 'error';
    error?: ReplayError;
  };
  'tool-delivery': {
    channelId: string;
    channelName: string;
    provider: 'slack' | 'teams';
    status: 'loading' | 'done' | 'error';
    error?: ReplayError;
  };
  'update-memory': {
    status: 'loading' | 'done' | 'error';
    error?: ReplayError;
  };
  'user-message': {
    parts: ReplayMessagePart[];
  };
  'validate-graphql': {
    errorCount?: number;
    status: 'loading' | 'valid' | 'invalid' | 'error';
    error?: ReplayError;
  };
  'web-search': {
    query: string;
    status: 'loading' | 'done' | 'error';
    error?: ReplayError;
  };
}

interface ReplayTools {
  [key: string]: {
    input: unknown;
    output: unknown | undefined;
  };
}

type ReplayMessage = UIMessage<ReplayMetadata, ReplayDataParts, ReplayTools>;
type ReplayMessagePart = ReplayMessage['parts'][number];
type RunStreamStatus = 'streaming' | 'paused' | 'finished' | 'error' | 'unavailable';
type ConsumeOnceResult = 'finished' | 'incomplete' | 'unavailable';

const MAX_STREAM_ATTEMPTS = 5;
const STREAM_RETRY_DELAY_MS = 2000;
const JSON_RENDER_SPEC_PART_TYPE = 'data-spec';

interface RunReplayActions {
  onApprovalDecided: (_approvalId?: string) => void;
}

const RunReplayActionsContext = createContext<RunReplayActions | null>(null);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === 'AbortError' || error.message.toLowerCase().includes('aborted');
}

function isReasoningPart(part: ReplayMessagePart): part is ReasoningUIPart {
  return part.type === 'reasoning';
}

function hasRenderableReasoning(part: ReplayMessagePart): boolean {
  if (!isReasoningPart(part)) {
    return false;
  }

  // Keep streaming indicators, and keep completed rationale for finished /
  // paused replays so reviewers can still see why the agent acted.
  return part.state === 'streaming' || part.text.trim().length > 0;
}

function hasRenderableParts(parts: ReplayMessagePart[]): boolean {
  return parts.some((part) => {
    if (part.type === 'step-start') {
      return false;
    }

    if (part.type === 'reasoning') {
      return hasRenderableReasoning(part);
    }

    return true;
  });
}

function getReasoningLabel(text: string): string {
  const trimmed = text.trim();

  if (!trimmed || /^reasoning\.?$/i.test(trimmed)) {
    return 'Reasoning…';
  }

  const firstLine = trimmed.split(/\r?\n/, 1)[0]?.trim() ?? trimmed;
  const maxLength = 72;

  if (firstLine.length <= maxLength) {
    return firstLine;
  }

  return `${firstLine.slice(0, maxLength).trimEnd()}…`;
}

function getMarkerIds(messages: ReplayMessage[]): Set<string> {
  const markerIds = new Set<string>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'data-user-message' && part.id) {
        markerIds.add(part.id);
      }
    }
  }

  return markerIds;
}

function splitSessionMessages(messages: ReplayMessage[]): ReplayMessage[] {
  const markerIds = getMarkerIds(messages);
  const result: ReplayMessage[] = [];

  for (const message of messages) {
    if (message.role === 'user') {
      if (!markerIds.has(message.id)) {
        result.push(message);
      }

      continue;
    }

    if (message.role !== 'assistant') {
      result.push(message);

      continue;
    }

    let parts: ReplayMessagePart[] = [];
    let chunkIndex = 0;

    const flush = (): void => {
      if (hasRenderableParts(parts)) {
        result.push({ ...message, id: `${message.id}-${chunkIndex.toString()}`, parts });
      }

      chunkIndex++;
      parts = [];
    };

    for (const part of message.parts) {
      if (part.type === 'data-user-message') {
        const data = getPartData<ReplayDataParts['user-message']>(part);

        flush();
        result.push({
          id: part.id ?? crypto.randomUUID(),
          parts: data.parts,
          role: 'user',
        });

        continue;
      }

      parts.push(part);
    }

    flush();
  }

  return result;
}

function useSessionMessages(messages: ReplayMessage[]): ReplayMessage[] {
  return useMemo(() => splitSessionMessages(messages), [messages]);
}

function getPartData<T>(part: ReplayMessagePart): T {
  return (part as { data: T }).data;
}

function messageHasPendingMutationApproval(message: ReplayMessage | undefined): boolean {
  if (!message) {
    return false;
  }

  return message.parts.some((part) => {
    if (part.type !== 'data-mutation-approval') {
      return false;
    }

    return getPartData<ReplayDataParts['mutation-approval']>(part).status === 'pending';
  });
}

function isTerminalRunStatus(status: AutomationRun['status'] | null | undefined): boolean {
  return status === 'success' || status === 'failed' || status === 'cancelled' || status === 'skipped';
}

function getPendingMutationApprovalIds(message: ReplayMessage | undefined): string[] {
  if (!message) {
    return [];
  }

  const approvalIds: string[] = [];

  for (const part of message.parts) {
    if (part.type !== 'data-mutation-approval') {
      continue;
    }

    const data = getPartData<ReplayDataParts['mutation-approval']>(part);

    if (data.status === 'pending') {
      approvalIds.push(data.approvalId);
    }
  }

  return approvalIds;
}

function shouldPauseStreamForApproval({
  latestMessage,
  recordStatus,
  suppressApprovalPause,
}: {
  latestMessage: ReplayMessage | undefined;
  recordStatus: AutomationRun['status'] | null | undefined;
  suppressApprovalPause: boolean;
}): boolean {
  if (isTerminalRunStatus(recordStatus)) {
    return false;
  }

  // After a local approval decision the run/stream can still look suspended
  // until the workflow hook resumes — keep reconnecting in that case.
  if (suppressApprovalPause) {
    return false;
  }

  // The run record is authoritative once execution has resumed. A stale
  // pending data-mutation-approval part can linger in the replay until the
  // next workflow step writes an updated status.
  if (recordStatus === 'running') {
    return false;
  }

  if (recordStatus === 'awaiting_approval') {
    return true;
  }

  // Fall back to the stream part when the run record hasn't caught up yet.
  return messageHasPendingMutationApproval(latestMessage);
}

function useRunStream(
  streamApi: string,
  options?: {
    recordStatus?: AutomationRun['status'] | null;
    resumeToken?: number;
    suppressApprovalPause?: boolean;
  }
): {
  message: ReplayMessage | undefined;
  status: RunStreamStatus;
} {
  const [message, setMessage] = useState<ReplayMessage>();
  const [status, setStatus] = useState<RunStreamStatus>('streaming');
  const recordStatus = options?.recordStatus;
  const resumeToken = options?.resumeToken ?? 0;
  // Read via ref so clearing the post-decide suppress window does not abort a
  // healthy reconnect the way resetting resumeToken would.
  const suppressApprovalPauseRef = useRef(options?.suppressApprovalPause ?? false);
  suppressApprovalPauseRef.current = options?.suppressApprovalPause ?? false;

  useEffect(() => {
    if (!streamApi) {
      setMessage(undefined);
      setStatus('unavailable');

      return;
    }

    const abortController = new AbortController();
    let latestMessage: ReplayMessage | undefined;
    setStatus('streaming');

    const consumeOnce = async (): Promise<ConsumeOnceResult> => {
      const response = await fetch(`${streamApi}?startIndex=0`, {
        credentials: 'include',
        signal: abortController.signal,
      });

      if (response.status === 404) {
        return 'unavailable';
      }

      if (!response.ok || !response.body) {
        throw new Error(`Failed to fetch the run stream (status ${response.status.toString()})`);
      }

      let sawFinish = false;
      const parsedStream = parseJsonEventStream({ schema: uiMessageChunkSchema, stream: response.body });
      type ParsedChunk = typeof parsedStream extends ReadableStream<infer T> ? T : never;

      const chunkStream = parsedStream.pipeThrough(
        new TransformStream<ParsedChunk, UIMessageChunk>({
          transform: (result, controller) => {
            if (!result.success) {
              throw result.error;
            }

            if (result.value.type === 'finish') {
              sawFinish = true;
            }

            controller.enqueue(result.value);
          },
        })
      );

      const messageStream = readUIMessageStream<ReplayMessage>({
        onError: (error) => {
          console.error('Automation run stream chunk error', error);
        },
        stream: chunkStream,
      });

      for await (const current of messageStream) {
        if (abortController.signal.aborted) {
          break;
        }

        latestMessage = { ...current };
        setMessage(latestMessage);
      }

      return sawFinish ? 'finished' : 'incomplete';
    };

    const consume = async (): Promise<void> => {
      let attempt = 0;

      while (!abortController.signal.aborted) {
        if (attempt > 0) {
          await delay(STREAM_RETRY_DELAY_MS);
        }

        try {
          const result = await consumeOnce();

          if (abortController.signal.aborted) {
            return;
          }

          if (result === 'unavailable') {
            setStatus('unavailable');

            return;
          }

          if (result === 'finished') {
            setStatus('finished');

            return;
          }

          // The run record is authoritative once it reaches a terminal status.
          // Without this, a lingering post-decide suppress flag would reconnect
          // forever when the replay never emits a finish chunk.
          if (isTerminalRunStatus(recordStatus)) {
            setStatus('finished');

            return;
          }

          // Workflow hooks close the readable without a finish chunk while the
          // run is suspended on a mutation approval. Pause instead of treating
          // that as an error or a perpetual "Running..." state.
          if (
            shouldPauseStreamForApproval({
              latestMessage,
              recordStatus,
              suppressApprovalPause: suppressApprovalPauseRef.current,
            })
          ) {
            setStatus('paused');

            return;
          }

          // Keep reconnecting while the run is active, or right after a local
          // approval decision while the workflow is still waking up.
          const shouldKeepRetrying = recordStatus === 'running' || suppressApprovalPauseRef.current;

          if (!shouldKeepRetrying && attempt >= MAX_STREAM_ATTEMPTS - 1) {
            setStatus('error');

            return;
          }
        } catch (error) {
          if (abortController.signal.aborted || isAbortError(error)) {
            return;
          }

          console.error('Automation run stream error', error);

          if (isTerminalRunStatus(recordStatus)) {
            setStatus('finished');

            return;
          }

          const shouldKeepRetrying = recordStatus === 'running' || suppressApprovalPauseRef.current;

          if (!shouldKeepRetrying && attempt >= MAX_STREAM_ATTEMPTS - 1) {
            setStatus('error');

            return;
          }
        }

        attempt += 1;
      }
    };

    const loadTimeout = window.setTimeout(() => {
      void consume();
    }, 0);

    return () => {
      window.clearTimeout(loadTimeout);
      abortController.abort('Run replay unmounted');
    };
  }, [recordStatus, resumeToken, streamApi]);

  return { message, status };
}

export function RunDetailPage(): JSX.Element {
  const { api, projectId } = useProjectApi();
  const { automationId, runId } = useParams<{ automationId: string; runId: string }>();
  const { data, mutate } = useSWR<RunResponse>(projectId && runId ? paths(projectId).run(runId) : null, fetcher);
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
  // Keep Cancel available while awaiting approval; streamFinished only hides it
  // for in-flight runs after the workflow stream reports completion.
  const showCancel = run?.status === 'awaiting_approval' || (run?.status === 'running' && !streamFinished);

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
      <ScrollArea className="fk:h-0 fk:min-h-0 fk:flex-1">
        <div className="fk:pb-6 fk:pr-4 fk:max-w-5xl fk:mx-auto">
          {run ? (
            <RunReplay api={api} run={run} onRunUpdated={handleRunUpdated} onStreamFinished={handleStreamFinished} />
          ) : (
            <PageMessage>Loading run...</PageMessage>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function toMutationApprovalPartData(approval: AutomationApproval): ReplayDataParts['mutation-approval'] {
  return {
    affectedCount: approval.affectedCount,
    approvalId: approval.id,
    decidedBy: approval.decidedBy ?? undefined,
    operationsSummary: approval.operationsSummary,
    reason: approval.reason ?? undefined,
    status: approval.status,
  };
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
  const fallbackApprovals = pendingApprovalsData?.approvals ?? [];
  const hasReplayContent = messages.length > 0 || fallbackApprovals.length > 0;

  useEffect(() => {
    setResumeToken(0);
    setSuppressApprovalPause(false);
    lastDecidedApprovalIdRef.current = null;
  }, [run.id]);

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
              <ReplayMessage key={replayMessage.id} api={api} message={replayMessage} />
            ))}
            {fallbackApprovals.map((approval) => (
              <MutationApprovalPart
                api={api}
                key={approval.id}
                message={toMutationApprovalPartData(approval)}
              />
            ))}
            {status === 'streaming' && !isAwaitingApproval ? (
              <div className="fk:flex fk:items-center fk:shimmer fk:shimmer-duration-1000 fk:gap-2 fk:py-4 fk:font-mono fk:text-sm fk:text-muted-foreground">
                <LoaderCircle className="fk:size-4 fk:animate-spin" />
                <span>Running...</span>
              </div>
            ) : null}
            {showAwaitingSpinner ? (
              <div className="fk:flex fk:items-center fk:gap-2 fk:py-4 fk:font-mono fk:text-sm fk:text-muted-foreground">
                <LoaderCircle className="fk:size-4 fk:animate-spin" />
                <span>Awaiting approval...</span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="fk:flex fk:items-center fk:justify-center fk:gap-2 fk:rounded-md fk:border fk:border-dashed fk:p-8 fk:font-mono fk:text-sm fk:text-muted-foreground">
            <LoaderCircle className="fk:size-4 fk:animate-spin" />
            <span>{emptyLabel}</span>
          </div>
        )}
      </div>
    </RunReplayActionsContext.Provider>
  );
}

function ReplayMessage({
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
      <div className="fk:space-y-3 fk:min-w-0">
        {message.parts.map((part, index) => (
          <MessagePart api={api} key={index} part={part} partIndex={index} parts={message.parts} />
        ))}
      </div>
    </div>
  );
}

function MessagePart({
  api,
  part,
  partIndex,
  parts,
}: {
  api: ReturnType<typeof createApiClient>;
  part: ReplayMessagePart;
  partIndex: number;
  parts: ReplayMessagePart[];
}): JSX.Element | null {
  if (part.type === 'step-start') {
    return null;
  }

  if (part.type === 'text') {
    return <TextPart part={part} />;
  }

  if (isReasoningPart(part)) {
    return hasRenderableReasoning(part) ? (
      <ReasoningPart streaming={part.state === 'streaming'} text={part.text} />
    ) : null;
  }

  if (part.type === 'data-generating-files') {
    return <GenerateFilesPart message={getPartData<ReplayDataParts['generating-files']>(part)} />;
  }

  if (part.type === 'data-run-artifact') {
    return <RunArtifactPart api={api} message={getPartData<ReplayDataParts['run-artifact']>(part)} />;
  }

  if (part.type === 'data-tool-delivery') {
    return <ToolDeliveryPart message={getPartData<ReplayDataParts['tool-delivery']>(part)} />;
  }

  if (part.type === 'data-run-summary') {
    return <RunSummaryPart message={getPartData<ReplayDataParts['run-summary']>(part)} />;
  }

  if (part.type === 'data-run-command') {
    const data = getPartData<ReplayDataParts['run-command']>(part);

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<TerminalIcon className="fk:size-3.5" />}
        loading={['executing', 'running', 'waiting'].includes(data.status)}
        message={
          data.status === 'error'
            ? (data.error?.message ?? `Command failed: ${data.command}`)
            : `${data.status === 'done' ? 'Ran' : 'Running'} ${data.command} ${data.args.join(' ')}`
        }
        title="Run command"
      />
    );
  }

  if (part.type === 'data-search-schema') {
    const data = getPartData<ReplayDataParts['search-schema']>(part);

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<SearchIcon className="fk:size-3.5" />}
        loading={data.status === 'loading'}
        message={
          data.status === 'error'
            ? (data.error?.message ?? 'Failed to search schema')
            : `${data.status === 'done' ? 'Searched' : 'Searching'}${data.query ? ` "${data.query}"` : ' schema'}`
        }
        title="Search schema"
      />
    );
  }

  if (part.type === 'data-web-search') {
    const data = getPartData<ReplayDataParts['web-search']>(part);

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<SearchIcon className="fk:size-3.5" />}
        loading={data.status === 'loading'}
        message={
          data.status === 'error'
            ? (data.error?.message ?? 'Failed to search the web')
            : `${data.status === 'done' ? 'Searched' : 'Searching'} "${data.query}"`
        }
        title="Web search"
      />
    );
  }

  if (part.type === 'data-validate-graphql') {
    const data = getPartData<ReplayDataParts['validate-graphql']>(part);

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<DatabaseZapIcon className="fk:size-3.5" />}
        loading={data.status === 'loading'}
        message={getValidateGraphqlMessage(data)}
        title="Validate GraphQL"
      />
    );
  }

  if (part.type === 'data-execute-graphql') {
    const data = getPartData<ReplayDataParts['execute-graphql']>(part);
    const operationLabel = data.operationType === 'mutation' ? 'mutation' : 'query';

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<DatabaseZapIcon className="fk:size-3.5" />}
        loading={data.status === 'loading'}
        message={
          data.status === 'error'
            ? (data.error?.message ?? `Failed to execute ${operationLabel}`)
            : `${data.status === 'done' ? 'Executed' : 'Executing'} ${operationLabel}`
        }
        title="Execute GraphQL"
      />
    );
  }

  if (part.type === 'data-mutation-approval') {
    return <MutationApprovalPart api={api} message={getPartData<ReplayDataParts['mutation-approval']>(part)} />;
  }

  if (part.type === 'data-bulk-graphql-action') {
    return <BulkGraphqlActionPart message={getPartData<ReplayDataParts['bulk-graphql-action']>(part)} />;
  }

  if (part.type === 'data-update-memory') {
    const data = getPartData<ReplayDataParts['update-memory']>(part);

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<CheckCircle2Icon className="fk:size-3.5" />}
        loading={data.status === 'loading'}
        message={
          data.status === 'error'
            ? (data.error?.message ?? 'Failed to update memory')
            : data.status === 'done'
              ? 'Updated automation memory'
              : 'Updating automation memory'
        }
        title="Update memory"
      />
    );
  }

  if (part.type === 'data-create-sandbox') {
    const data = getPartData<ReplayDataParts['create-sandbox']>(part);

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<TerminalIcon className="fk:size-3.5" />}
        loading={data.status === 'loading'}
        message={
          data.status === 'error'
            ? (data.error?.message ?? 'Failed to create sandbox')
            : data.status === 'done'
              ? 'Created sandbox'
              : 'Creating sandbox'
        }
        title="Create sandbox"
      />
    );
  }

  if (part.type === JSON_RENDER_SPEC_PART_TYPE) {
    const nextSpecPart = parts.slice(partIndex + 1).find((nextPart) => nextPart.type === JSON_RENDER_SPEC_PART_TYPE);

    if (nextSpecPart) {
      return null;
    }

    return <RunSpecPart parts={parts} />;
  }

  if (part.type.startsWith('data-')) {
    return <UnknownDataPart part={part} />;
  }

  return null;
}

function TextPart({ part }: { part: TextUIPart }): JSX.Element {
  return (
    <div className="fk:min-w-0 fk:max-w-full fk:overflow-x-auto fk:whitespace-pre-wrap fk:rounded-xl fk:bg-muted fk:px-4 fk:py-3 fk:text-sm fk:font-light fk:leading-relaxed fk:text-secondary-foreground">
      {part.text}
    </div>
  );
}

function ReasoningPart({ streaming, text }: { streaming: boolean; text: string }): JSX.Element {
  if (streaming) {
    return (
      <p
        className="fk:shimmer fk:inline-flex fk:items-center fk:gap-1.5 fk:text-sm fk:text-muted-foreground fk:shimmer-duration-1000"
        role="status"
      >
        <BrainIcon aria-hidden className="fk:size-3.5 fk:shrink-0" />
        {getReasoningLabel(text)}
      </p>
    );
  }

  return (
    <details className="fk:rounded-xl fk:border fk:border-border fk:bg-muted/30 fk:px-3.5 fk:py-3">
      <summary className="fk:flex fk:cursor-pointer fk:items-center fk:gap-1.5 fk:text-sm fk:font-medium fk:text-muted-foreground">
        <BrainIcon aria-hidden className="fk:size-3.5 fk:shrink-0" />
        Reasoning
      </summary>
      <p className="fk:mt-2 fk:whitespace-pre-wrap fk:text-xs fk:text-muted-foreground">{text}</p>
    </details>
  );
}

function ToolMessage({ children, className = '' }: { children: React.ReactNode; className?: string }): JSX.Element {
  return (
    <div
      className={`fk:min-w-0 fk:max-w-full fk:overflow-x-auto fk:rounded-xl fk:border fk:border-border fk:bg-background fk:px-3.5 fk:py-3 fk:text-sm ${className}`}
    >
      {children}
    </div>
  );
}

function ToolHeader({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="fk:flex fk:items-center fk:gap-2 fk:font-medium fk:text-muted-foreground">{children}</div>;
}

function StatusIcon({ isError, loading }: { isError?: boolean; loading?: boolean }): JSX.Element {
  if (loading) {
    return <LoaderCircle className="fk:size-4 fk:animate-spin" />;
  }

  if (isError) {
    return <XIcon className="fk:size-4 fk:text-red-700" />;
  }

  return <CheckIcon className="fk:size-4" />;
}

function StatusToolPart({
  error,
  icon,
  loading,
  message,
  title,
}: {
  error?: string;
  icon: React.ReactNode;
  loading: boolean;
  message: string;
  title: string;
}): JSX.Element {
  return (
    <ToolMessage>
      <ToolHeader>
        {icon}
        {title}
      </ToolHeader>
      <div className="fk:relative fk:min-h-5 fk:pl-6">
        <span className="fk:absolute fk:left-0 fk:top-0">
          <StatusIcon isError={Boolean(error)} loading={loading} />
        </span>
        <span className="fk:text-xs">{message}</span>
      </div>
    </ToolMessage>
  );
}

function GenerateFilesPart({ message }: { message: ReplayDataParts['generating-files'] }): JSX.Element {
  const lastInProgress = ['error', 'uploading', 'generating'].includes(message.status);
  const generated = lastInProgress ? message.paths.slice(0, message.paths.length - 1) : message.paths;
  const generating = lastInProgress ? (message.paths[message.paths.length - 1] ?? '') : null;

  return (
    <ToolMessage>
      <ToolHeader>
        <CloudUploadIcon className="fk:size-3.5" />
        <span>{message.status === 'done' ? 'Uploaded files' : 'Generating files'}</span>
      </ToolHeader>
      <div className="fk:space-y-1 fk:text-sm">
        {generated.map((path, index) => (
          <div className="fk:flex fk:items-center fk:gap-2" key={`${path}-${index.toString()}`}>
            <CheckIcon className="fk:size-4" />
            <span className="fk:whitespace-pre-wrap">{path}</span>
          </div>
        ))}
        {typeof generating === 'string' ? (
          <div className="fk:flex fk:items-center fk:gap-2">
            <StatusIcon isError={message.status === 'error'} loading={message.status !== 'error'} />
            <span>{message.status === 'error' ? (message.error?.message ?? generating) : generating}</span>
          </div>
        ) : null}
      </div>
    </ToolMessage>
  );
}

function RunArtifactPart({
  api,
  message,
}: {
  api: ReturnType<typeof createApiClient>;
  message: ReplayDataParts['run-artifact'];
}): JSX.Element {
  const isDone = message.status === 'done' && message.artifactId;
  const previewUrl = isDone ? api.getArtifactUrl(message.artifactId ?? '') : '';
  const downloadUrl = isDone ? api.getArtifactUrl(message.artifactId ?? '', { download: true }) : '';
  const bytes = formatBytes(message.sizeBytes);

  return (
    <ToolMessage>
      <ToolHeader>
        <FileTextIcon className="fk:size-3.5" />
        {message.status === 'done' ? 'Published artifact' : 'Publishing artifact'}
      </ToolHeader>
      <div className="fk:relative fk:min-h-5 fk:pl-6">
        <span className="fk:absolute fk:left-0 fk:top-0">
          <StatusIcon isError={message.status === 'error'} loading={message.status === 'uploading'} />
        </span>
        <div className="fk:min-w-0 fk:space-y-2">
          <div className="fk:min-w-0">
            <div className="fk:truncate fk:font-medium">{message.filename}</div>
            <div className="fk:text-xs fk:text-muted-foreground">
              {message.status === 'uploading' && 'Uploading to artifacts'}
              {message.status === 'done' && [getArtifactLabel(message), bytes].filter(Boolean).join(' · ')}
              {message.status === 'error' && (message.error?.message ?? 'Failed to publish artifact')}
            </div>
          </div>
          {isDone ? (
            <div className="fk:flex fk:flex-wrap fk:gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={previewUrl} rel="noreferrer" target="_blank">
                  Preview
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={downloadUrl}>
                  <DownloadIcon className="fk:size-3" />
                  Download
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </ToolMessage>
  );
}

function ToolDeliveryPart({ message }: { message: ReplayDataParts['tool-delivery'] }): JSX.Element {
  const providerLabel = message.provider === 'slack' ? 'Slack' : 'Microsoft Teams';
  const icon =
    message.provider === 'slack' ? <MessageSquareIcon className="fk:size-3.5" /> : <SendIcon className="fk:size-3.5" />;

  return (
    <StatusToolPart
      error={message.error?.message}
      icon={icon}
      loading={message.status === 'loading'}
      message={
        message.status === 'error'
          ? (message.error?.message ?? `Failed to send result to ${message.channelName}`)
          : `${message.status === 'done' ? 'Sent' : 'Sending'} result to ${message.channelName}`
      }
      title={`${providerLabel} Delivery`}
    />
  );
}

function RunSummaryPart({ message }: { message: ReplayDataParts['run-summary'] }): JSX.Element {
  const icon =
    message.status === 'success' ? (
      <CheckCircle2Icon className="fk:size-3.5 fk:text-green-700" />
    ) : message.status === 'skipped' ? (
      <CircleSlashIcon className="fk:size-3.5" />
    ) : (
      <XCircleIcon className="fk:size-3.5 fk:text-red-700" />
    );
  const title =
    message.status === 'success' ? 'Run completed' : message.status === 'skipped' ? 'Run skipped' : 'Run failed';

  return (
    <ToolMessage className={message.status === 'failed' ? 'fk:border-red-700/40' : 'fk:border-green-700/40'}>
      <ToolHeader>
        {icon}
        <span>{title}</span>
      </ToolHeader>
      {message.status === 'failed' ? <p className="fk:whitespace-pre-wrap fk:text-xs">{message.summary}</p> : null}
    </ToolMessage>
  );
}

interface ApprovalResponse {
  approval: AutomationApproval;
}

function MutationApprovalPart({
  api,
  message,
}: {
  api: ReturnType<typeof createApiClient>;
  message: ReplayDataParts['mutation-approval'];
}): JSX.Element {
  const { projectId } = useProjectApi();
  const replayActions = useContext(RunReplayActionsContext);
  const previousApprovalStatusRef = useRef<AutomationApproval['status'] | undefined>(undefined);
  // Poll while the stream still says pending so a decision from the Approvals
  // inbox / another tab updates this card. RunReplay refreshes the run record
  // on the same interval but does not touch this approval fetch.
  const { data, error, isValidating, mutate } = useSWR<ApprovalResponse>(
    projectId ? paths(projectId).approval(message.approvalId) : null,
    fetcher,
    {
      refreshInterval: (latestData) => {
        if (message.status !== 'pending') {
          return 0;
        }

        if (latestData?.approval?.status && latestData.approval.status !== 'pending') {
          return 0;
        }

        return STREAM_RETRY_DELAY_MS;
      },
    }
  );
  const approvalStatus = data?.approval?.status;
  const isPending = (approvalStatus ?? message.status) === 'pending';

  // The stream part changes when the proposal is decided or executed; refresh
  // the full approval (preview, result, error) from the API when that happens.
  useEffect(() => {
    void mutate();
  }, [message.status, mutate]);

  // When polling discovers an external decide while the replay part is still
  // pending, reconnect the stream the same way a local decide does.
  useEffect(() => {
    const previousStatus = previousApprovalStatusRef.current;
    previousApprovalStatusRef.current = approvalStatus;

    if (message.status !== 'pending' || !approvalStatus || approvalStatus === 'pending') {
      return;
    }

    if (previousStatus !== undefined && previousStatus !== 'pending') {
      return;
    }

    replayActions?.onApprovalDecided(data?.approval?.id ?? message.approvalId);
  }, [approvalStatus, data?.approval?.id, message.approvalId, message.status, replayActions]);

  function handleDecided(nextApproval: AutomationApproval): void {
    // Keep the external-decide effect from bumping resumeToken again after a
    // local decide already reconnected the stream.
    if (nextApproval.status !== 'pending') {
      previousApprovalStatusRef.current = nextApproval.status;
    }

    void mutate();
    // Revalidate the run record and reconnect the workflow stream so the page
    // reflects resumed execution instead of a stale awaiting_approval/error state.
    replayActions?.onApprovalDecided(nextApproval.id);
  }

  let body: JSX.Element;

  if (data?.approval) {
    body = <ApprovalCard api={api} approval={data.approval} key={data.approval.status} onDecided={handleDecided} />;
  } else if (error && !isValidating) {
    const detail = error instanceof Error && error.message ? error.message : 'Request failed';

    body = (
      <div className="fk:space-y-2">
        <p className="fk:text-xs fk:text-destructive">
          Failed to load proposal {message.operationsSummary}: {detail}
        </p>
        <Button size="sm" variant="outline" onClick={() => void mutate()}>
          Retry
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="fk:flex fk:items-center fk:gap-2 fk:text-xs fk:text-muted-foreground">
        <LoaderCircle className="fk:size-3.5 fk:animate-spin" />
        <span>Loading proposal {message.operationsSummary}...</span>
      </div>
    );
  }

  return (
    <ToolMessage>
      <ToolHeader>
        <DatabaseZapIcon className="fk:size-3.5" />
        Mutation approval
        {isPending ? <LoaderCircle className="fk:ml-1 fk:size-3.5 fk:animate-spin" /> : null}
      </ToolHeader>
      <div className="fk:mt-2">{body}</div>
      {message.status === 'error' && message.error ? (
        <p className="fk:mt-2 fk:text-xs fk:text-destructive">{message.error.message}</p>
      ) : null}
    </ToolMessage>
  );
}

function BulkGraphqlActionPart({ message }: { message: ReplayDataParts['bulk-graphql-action'] }): JSX.Element {
  const progress = [
    typeof message.processedItems === 'number' ? `${message.processedItems.toString()} processed` : '',
    typeof message.changedItems === 'number' ? `${message.changedItems.toString()} changed` : '',
    typeof message.failedItems === 'number' ? `${message.failedItems.toString()} failed` : '',
    typeof message.totalItems === 'number' ? `${message.totalItems.toString()} total` : '',
  ].filter(Boolean);

  return (
    <StatusToolPart
      error={message.error?.message}
      icon={<DatabaseZapIcon className="fk:size-3.5" />}
      loading={message.status === 'loading' || message.status === 'running'}
      message={
        message.status === 'error'
          ? (message.error?.message ?? `Failed bulk ${message.operationName}`)
          : `${message.status === 'done' ? 'Completed' : 'Running'} ${message.operationName}${
              progress.length > 0 ? ` (${progress.join(', ')})` : ''
            }`
      }
      title="Bulk GraphQL action"
    />
  );
}

function UnknownDataPart({ part }: { part: ReplayMessagePart }): JSX.Element {
  return (
    <ToolMessage className="fk:bg-muted/30">
      <ToolHeader>
        <CheckCircle2Icon className="fk:size-3.5" />
        {part.type.replace(/^data-/, '').replaceAll('-', ' ')}
      </ToolHeader>
      <p className="fk:text-xs fk:text-muted-foreground">
        This run emitted a structured event that is not yet rendered by Studio.
      </p>
    </ToolMessage>
  );
}

function getValidateGraphqlMessage(message: ReplayDataParts['validate-graphql']): string {
  if (message.status === 'error') {
    return message.error?.message ?? 'Failed to validate GraphQL';
  }

  if (message.status === 'invalid') {
    const count = message.errorCount ?? 0;

    return `Validation failed with ${count.toString()} ${count === 1 ? 'error' : 'errors'}`;
  }

  if (message.status === 'valid') {
    return 'GraphQL operation is valid';
  }

  return 'Validating GraphQL';
}

function formatBytes(sizeBytes?: number): string {
  if (typeof sizeBytes !== 'number') {
    return '';
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes.toString()} B`;
  }

  const kilobytes = sizeBytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function getArtifactLabel(message: ReplayDataParts['run-artifact']): string {
  if (message.kind === 'pdf') {
    return 'PDF artifact';
  }

  if (message.kind === 'html') {
    return 'HTML artifact';
  }

  return 'Artifact';
}
